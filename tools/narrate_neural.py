"""Neural spoken narration from a script using local VoiceStudio models and Whisper alignment.

Usage:
    python tools/narrate_neural.py projects/my_video.narration.txt --id=my_video [--model=claude-high]
                                   [--speed=1.0] [--pause=0.8] [--whisper=medium]

Supported local neural models (stored in %LOCALAPPDATA%\\Programs\\VoiceStudio\\resources\\models):
    - claude-high (vits-piper-es_MX-claude-high, Spanish Neutral, High Quality)
    - daniela-high (vits-piper-es_AR-daniela-high, Argentine Spanish, High Quality)
    - dave (vits-piper-es_ES-davefx-medium, Spanish Spain, Academic Tone)

Writes:
    - projects/<id>.voice.wav (concatenated neural narration)
    - projects/<id>.lyrics.js (word-level alignment per block)
    - projects/<id>.env.js (loudness envelope for animation)
"""
import io
import json
import os
import sys

import numpy as np
import scipy.io.wavfile as wavfile
import sherpa_onnx
import soundfile as sf
from faster_whisper import WhisperModel

SR = 22050


def get_models_dir() -> str:
    local_app = os.environ.get("LOCALAPPDATA", "")
    return os.path.join(local_app, "Programs", "VoiceStudio", "resources", "models")


MODELS = {
    "claude-high": ("vits-piper-es_MX-claude-high", "es_MX-claude-high.onnx"),
    "daniela-high": ("vits-piper-es_AR-daniela-high", "es_AR-daniela-high.onnx"),
    "dave": ("vits-piper-es_ES-davefx-medium", "es_ES-davefx-medium.onnx"),
}


def parse_script(path: str, default_pause: float = 0.8):
    blocks, cur = [], None
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("["):
            head, _, rest = line[1:].partition("]")
            opts = dict(kv.split("=", 1) for kv in rest.split() if "=" in kv)
            cur = {"id": head.strip(), "text": "", "pause": float(opts.get("pause", default_pause))}
            blocks.append(cur)
        elif cur is not None:
            cur["text"] += (" " if cur["text"] else "") + line
    return [b for b in blocks if b["text"]]


def load_tts(model_key: str = "claude-high"):
    if model_key not in MODELS:
        raise ValueError(f"Unknown model '{model_key}'. Choose from: {list(MODELS.keys())}")
    folder, onnx_name = MODELS[model_key]
    model_dir = os.path.join(get_models_dir(), folder)
    if not os.path.isdir(model_dir):
        raise FileNotFoundError(f"Model directory not found: {model_dir}")

    model_path = os.path.join(model_dir, onnx_name)
    tokens_path = os.path.join(model_dir, "tokens.txt")
    data_dir = os.path.join(model_dir, "espeak-ng-data")

    config = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=model_path,
                tokens=tokens_path,
                data_dir=data_dir if os.path.isdir(data_dir) else "",
            )
        )
    )
    return sherpa_onnx.OfflineTts(config)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    if not args or "id" not in opts:
        print(__doc__)
        sys.exit(1)

    script_path = args[0]
    vid = opts["id"]
    model_key = opts.get("model", "claude-high")
    speed = float(opts.get("speed", 1.0))
    default_pause = float(opts.get("pause", 0.8))
    whisper_size = opts.get("whisper", "medium")

    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_wav = opts.get("out", os.path.join(root, "projects", f"{vid}.voice.wav"))
    out_lyr = os.path.join(root, "projects", f"{vid}.lyrics.js")
    out_env = os.path.join(root, "projects", f"{vid}.env.js")

    blocks = parse_script(script_path, default_pause)
    print(f"Loaded {len(blocks)} blocks from {script_path}")
    print(f"Initializing neural TTS ({model_key}) and Whisper ({whisper_size})...")

    tts = load_tts(model_key)
    whisper = WhisperModel(whisper_size, device="cpu", compute_type="int8")

    parts, lines, t = [np.zeros(int(0.5 * SR), np.float32)], [], 0.5
    for idx, b in enumerate(blocks):
        audio = tts.generate(b["text"], sid=0, speed=speed)
        samples = np.array(audio.samples, dtype=np.float32)
        dur = len(samples) / SR

        # Align words with faster-whisper on block audio
        buf = io.BytesIO()
        sf.write(buf, samples, SR, format="WAV")
        buf.seek(0)

        segments, _ = whisper.transcribe(
            buf, language="es", word_timestamps=True, vad_filter=False, condition_on_previous_text=False
        )

        words = []
        for seg in segments:
            for w in (seg.words or []):
                cleaned = w.word.strip()
                if cleaned:
                    words.append([round(w.start + t, 3), round(w.end + t, 3), cleaned])

        if not words:
            # Fallback interpolation if Whisper detected no word segments
            tokens = b["text"].split()
            step = dur / max(1, len(tokens))
            words = [[round(t + i * step, 3), round(t + (i + 1) * step, 3), tok] for i, tok in enumerate(tokens)]

        block_t0 = words[0][0] if words else round(t, 3)
        block_t1 = words[-1][1] if words else round(t + dur, 3)
        lines.append({"id": b["id"], "t0": block_t0, "t1": block_t1, "words": words})

        parts.append(samples)
        pause_samples = np.zeros(int(b["pause"] * SR), np.float32)
        parts.append(pause_samples)

        print(f"  [{idx+1}/{len(blocks)}] {b['id']:<20} {t:6.2f}s -> {t+dur:6.2f}s (+{dur:4.1f}s)")
        t += dur + b["pause"]

    mix = np.concatenate(parts)
    # Peak normalize to -0.5 dB
    peak = np.abs(mix).max() or 1.0
    norm_mix = (mix / peak * 0.95 * 32767).astype(np.int16)

    os.makedirs(os.path.dirname(out_wav), exist_ok=True)
    wavfile.write(out_wav, SR, norm_mix)
    print(f"\nWrote vocal audio: {out_wav} ({len(mix)/SR:.2f} seconds)")

    with open(out_lyr, "w", encoding="utf-8") as f:
        f.write(f"// Generated by tools/narrate_neural.py from {os.path.basename(script_path)} (model {model_key}).\n")
        f.write(f"registerLyrics({json.dumps(vid)}, {json.dumps(lines, ensure_ascii=False, indent=1)});\n")
    print(f"Wrote word timings: {out_lyr}")

    # Compute loudness envelope for animation
    fps = 30.0
    hop = int(SR / fps)
    float_mix = mix / peak
    rms = np.array([np.sqrt(np.mean(float_mix[i : i + hop] ** 2)) for i in range(0, len(float_mix) - hop, hop)])
    norm_rms = np.round(rms / (np.percentile(rms, 98) or 1.0), 3).clip(0, 1)

    with open(out_env, "w", encoding="utf-8") as f:
        f.write(f"// Generated by tools/narrate_neural.py from {os.path.basename(out_wav)}.\n")
        f.write(f"registerEnvelope({json.dumps(vid)}, {fps:g}, {json.dumps(norm_rms.tolist())});\n")
    print(f"Wrote envelope: {out_env} ({len(norm_rms)} values at {fps} FPS)")


if __name__ == "__main__":
    main()
