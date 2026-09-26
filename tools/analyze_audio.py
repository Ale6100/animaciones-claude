"""Beat grid and energy map of a song, to sync a scene's bpm/offset/shots with the music.

Usage:
    python tools/analyze_audio.py <audio file> [--bpm-min=80] [--bpm-max=180 | --bpm=<known tempo>] [--json=out/audio_map.json]

Prints the tempo, the first-downbeat offset, the energy of every bar and the likely section boundaries.
Needs ffmpeg on PATH and numpy.
"""
import json
import os
import subprocess
import sys

import numpy as np

SR = 22050
HOP = 256
N_FFT = 2048


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def spectrogram(y):
    win = np.hanning(N_FFT).astype(np.float32)
    n = 1 + (len(y) - N_FFT) // HOP
    frames = np.lib.stride_tricks.as_strided(y, shape=(n, N_FFT), strides=(y.strides[0] * HOP, y.strides[0]))
    return np.abs(np.fft.rfft(frames * win, axis=1)).astype(np.float32)


def onset_envelope(S):
    logS = np.log1p(100 * S)
    flux = np.maximum(0, np.diff(logS, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux -= np.convolve(flux, np.ones(16) / 16, mode="same")
    return np.maximum(0, flux)


def estimate_tempo(env, fps, bpm_min, bpm_max):
    env = env - env.mean()
    ac = np.correlate(env, env, mode="full")[len(env) - 1:]
    lags = np.arange(len(ac))
    best, best_score = None, -np.inf
    for bpm in np.arange(bpm_min, bpm_max, 0.05):
        lag = 60 * fps / bpm
        # a beat period scores its own lag plus its multiples, so half/double tempos don't win by accident
        score = sum(np.interp(lag * k, lags, ac) / k for k in (1, 2, 4))
        if score > best_score:
            best, best_score = bpm, score
    return best


def beat_phase(env, fps, bpm):
    period = 60 * fps / bpm
    phases = np.linspace(0, period, 200, endpoint=False)
    scores = [env[np.round(np.arange(p, len(env) - 1, period)).astype(int)].sum() for p in phases]
    return phases[int(np.argmax(scores))] / fps


def downbeat(env, fps, bpm, phase, beats_per_bar=4):
    beat = 60 / bpm
    idx = lambda s: np.clip(np.round(s * fps).astype(int), 0, len(env) - 1)
    times = np.arange(phase, len(env) / fps, beat)
    strength = env[idx(times)]
    scores = [strength[k::beats_per_bar].mean() for k in range(beats_per_bar)]
    return phase + int(np.argmax(scores)) * beat


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    if not args:
        print(__doc__)
        sys.exit(1)
    path = args[0]
    y = decode(path)
    duration = len(y) / SR
    S = spectrogram(y)
    fps = SR / HOP
    env = onset_envelope(S)
    bpm = float(opts["bpm"]) if "bpm" in opts else estimate_tempo(env, fps, float(opts.get("bpm-min", 80)), float(opts.get("bpm-max", 180)))
    phase = beat_phase(env, fps, bpm)
    offset = downbeat(env, fps, bpm, phase)
    bar = 4 * 60 / bpm

    rms = np.sqrt(np.convolve(y ** 2, np.ones(HOP) / HOP, mode="valid")[::HOP])
    freqs = np.fft.rfftfreq(N_FFT, 1 / SR)
    bass = S[:, freqs < 150].mean(axis=1)
    high = S[:, freqs > 4000].mean(axis=1)

    def mean_over(sig, a, b):
        i0, i1 = int(a * fps), max(int(a * fps) + 1, int(b * fps))
        return float(sig[i0:i1].mean()) if i0 < len(sig) else 0.0

    bars = []
    t = offset
    while t < duration:
        bars.append({"t": round(t, 3), "rms": mean_over(rms, t, t + bar), "bass": mean_over(bass, t, t + bar),
                     "high": mean_over(high, t, t + bar), "onsets": mean_over(env, t, t + bar)})
        t += bar
    for key in ("rms", "bass", "high", "onsets"):
        top = max(b[key] for b in bars) or 1
        for b in bars:
            b[key] = round(b[key] / top, 3)

    # section boundaries: bars where the 4-bar texture (energy + bass + highs) changes the most
    feat = np.array([[b["rms"], b["bass"], b["high"], b["onsets"]] for b in bars])
    novelty = np.zeros(len(bars))
    for i in range(4, len(bars) - 4):
        novelty[i] = np.linalg.norm(feat[i:i + 4].mean(axis=0) - feat[i - 4:i].mean(axis=0))
    peaks = [i for i in range(1, len(bars) - 1)
             if novelty[i] > 0.12 and novelty[i] >= novelty[i - 1] and novelty[i] >= novelty[i + 1]]

    print(f"file      {path}")
    print(f"duration  {duration:.2f} s")
    print(f"bpm       {bpm:.2f}   beat {60 / bpm:.4f} s   bar {bar:.4f} s")
    print(f"offset    {offset:.3f} s (first downbeat)   beat phase {phase:.3f} s")
    # beat phase measured window by window: a stable column means the tempo is right; a steady drift means it is off
    period = 60 * fps / bpm
    drift = []
    for a in range(0, int(duration) - 20, 20):
        i0, i1 = int(a * fps), int((a + 20) * fps)
        seg = env[i0:i1]
        cands = np.linspace(0, period, 120, endpoint=False)
        scores = [seg[np.round(np.arange((p - i0) % period, len(seg) - 1, period)).astype(int)].sum() for p in cands]
        drift.append(round(float(cands[int(np.argmax(scores))] / fps), 3))
    print(f"phase per 20 s window (should stay within ~0.03 s): {drift}")

    print("\nbar  time     rms   bass  high  onsets")
    for i, b in enumerate(bars):
        mark = "  <-- section?" if i in peaks else ""
        meter = "#" * int(b["rms"] * 30)
        print(f"{i:3d}  {b['t']:7.2f}  {b['rms']:.2f}  {b['bass']:.2f}  {b['high']:.2f}  {b['onsets']:.2f}  {meter}{mark}")

    if "json" in opts:
        os.makedirs(os.path.dirname(opts["json"]) or ".", exist_ok=True)
        with open(opts["json"], "w", encoding="utf-8") as f:
            json.dump({"duration": duration, "bpm": bpm, "offset": offset, "bars": bars,
                       "sections": [bars[i]["t"] for i in peaks]}, f, indent=1)


if __name__ == "__main__":
    main()
