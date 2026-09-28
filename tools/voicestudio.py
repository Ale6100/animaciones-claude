"""Autonomous VoiceStudio controller for Claude Animation Studio.

Manages the lifecycle of VoiceStudio locally:
- Starts VoiceStudio backend on-demand if not already running.
- Synthesizes speech with character voices via the local REST API (http://localhost:3900).
- Automatically terminates the backend upon completion to free 100% of GPU VRAM for video rendering.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from typing import Optional

BASE_URL = "http://localhost:3900"
API_SPEECH_URL = f"{BASE_URL}/v1/audio/speech"
API_HEALTH_URL = f"{BASE_URL}/health"
API_VOICES_URL = f"{BASE_URL}/v1/audio/voices"


def get_voicestudio_backend_path() -> tuple[Optional[str], Optional[str]]:
    """Locate the installed VoiceStudio backend Python interpreter and main.py."""
    local_app = os.environ.get("LOCALAPPDATA", "")
    if not local_app:
        return None, None
    base_res = os.path.join(local_app, "Programs", "VoiceStudio", "resources")
    python_exe = os.path.join(base_res, ".venv", "Scripts", "python.exe")
    main_py = os.path.join(base_res, "backend", "main.py")
    if os.path.exists(python_exe) and os.path.exists(main_py):
        return python_exe, main_py
    return None, None


def is_running(timeout_sec: float = 1.0) -> bool:
    """Check if VoiceStudio backend is currently responding to /health with status: ok."""
    try:
        req = urllib.request.Request(API_HEALTH_URL, headers={"User-Agent": "claude-animation"})
        with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("status") == "ok"
    except Exception:
        pass
    return False


def wait_until_ready(timeout_sec: float = 60.0, step_sec: float = 1.5) -> bool:
    """Wait until backend transitions to ready state."""
    deadline = time.time() + timeout_sec
    while time.time() < deadline:
        if is_running(timeout_sec=step_sec):
            return True
        time.sleep(step_sec)
    return False


class VoiceStudioSession:
    """Context manager for Just-In-Time VoiceStudio lifecycle."""

    def __init__(self, autostart: bool = True, autoclose: bool = True):
        self.autostart = autostart
        self.autoclose = autoclose
        self.proc: Optional[subprocess.Popen] = None
        self._we_started_it = False

    def __enter__(self) -> "VoiceStudioSession":
        if is_running():
            return self

        if not self.autostart:
            raise RuntimeError("VoiceStudio is not running and autostart is disabled.")

        py_exe, main_py = get_voicestudio_backend_path()
        if not py_exe or not main_py:
            raise FileNotFoundError(
                "VoiceStudio installation or .venv not found in %LOCALAPPDATA%\\Programs\\VoiceStudio."
            )

        # Launch detached backend process
        creationflags = 0
        if sys.platform == "win32":
            creationflags = subprocess.CREATE_NO_WINDOW | subprocess.DETACHED_PROCESS

        self.proc = subprocess.Popen(
            [py_exe, main_py],
            cwd=os.path.dirname(main_py),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=creationflags,
        )
        self._we_started_it = True

        if not wait_until_ready(timeout_sec=60.0):
            self.close()
            raise TimeoutError("VoiceStudio backend failed to become ready within 60 seconds.")

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._we_started_it and self.autoclose:
            self.close()

    def close(self):
        """Terminate backend process if launched by this session."""
        if self.proc and self.proc.poll() is None:
            try:
                self.proc.terminate()
                self.proc.wait(timeout=5)
            except Exception:
                try:
                    self.proc.kill()
                except Exception:
                    pass
        self.proc = None
        self._we_started_it = False

    def speak(
        self,
        text: str,
        voice: str = "alloy",
        response_format: str = "wav",
        out_path: Optional[str] = None,
    ) -> bytes:
        """Synthesize speech using VoiceStudio local REST API."""
        payload = {
            "model": "tts-1",
            "voice": voice,
            "input": text,
            "response_format": response_format,
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            API_SPEECH_URL,
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer local",
                "User-Agent": "claude-animation",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                audio_bytes = resp.read()
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"VoiceStudio speech API returned HTTP {e.code}: {err_body}") from e

        if out_path:
            os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
            with open(out_path, "wb") as f:
                f.write(audio_bytes)

        return audio_bytes

    def list_voices(self) -> list[dict]:
        """Fetch available voice profiles."""
        req = urllib.request.Request(
            API_VOICES_URL,
            headers={"Authorization": "Bearer local", "User-Agent": "claude-animation"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("voices", data if isinstance(data, list) else [])
        except Exception:
            return []


if __name__ == "__main__":
    print("Testing VoiceStudio JIT lifecycle...")
    with VoiceStudioSession(autostart=True, autoclose=True) as vs:
        print("Backend ready! Checking /health...")
        req = urllib.request.Request(API_HEALTH_URL)
        with urllib.request.urlopen(req) as resp:
            print("Health response:", resp.read().decode())
    print("Backend closed and GPU VRAM freed.")
