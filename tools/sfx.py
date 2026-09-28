"""Sound effects synthesized and mixed over a track: whooshes on transitions, impacts on hits, risers into drops,
ticks, pops, zaps, glitches. render.mjs calls it with the events of a scene (window.sfxEvents() in src/post.js).

Usage:
    python tools/sfx.py --events=events.json --dur=24 [--audio=song.mp3] [--gain=1] --out=out/sfx/x.wav
    python tools/sfx.py --audition --out=out/sfx/audition.wav      every sound once, one per second, to pick from
    python tools/sfx.py --list

events.json: [{"t": 4.0, "name": "impact", "gain": 0.8, "pan": 0, "dur": 1, "note": 84}, ...]. t is the moment the
sound LANDS: a whoosh peaks there, a riser or reverse cymbal ends there, a hit starts there.
Needs numpy and scipy, and ffmpeg on PATH to read --audio.
"""
import json
import os
import subprocess
import sys

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal

SR = 44100
RNG = np.random.default_rng(7)


def tt(d):
    return np.arange(int(SR * d)) / SR


def noise(n):
    return RNG.standard_normal(n)


def band(x, lo, hi):
    return signal.sosfilt(signal.butter(2, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lowpass(x, f):
    return signal.sosfilt(signal.butter(2, f, fs=SR, output="sos"), x)


def highpass(x, f):
    return signal.sosfilt(signal.butter(2, f, btype="high", fs=SR, output="sos"), x)


def sweep_band(x, f0, f1, q=0.35, blocks=64):
    """Noise through a band-pass whose centre glides from f0 to f1 (geometric), block by block."""
    out, n = np.zeros_like(x), len(x)
    blocks = max(1, min(blocks, n // 256))
    edges = np.linspace(0, n, blocks + 1).astype(int)
    for k in range(blocks):
        f = f0 * (f1 / f0) ** (k / max(1, blocks - 1))
        lo, hi = max(30, f * (1 - q)), min(SR / 2.2, f * (1 + q))
        out[edges[k]:edges[k + 1]] = band(x[max(0, edges[k] - 2048):edges[k + 1]], lo, hi)[-(edges[k + 1] - edges[k]):]
    return out


def chirp(f0, f1, d, curve=3.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * curve / d * 3) if f0 > f1 else f0 + (f1 - f0) * (t / d) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


def env_ad(n, attack, decay_rate):
    t = np.arange(n) / SR
    return np.minimum(t / max(attack, 1e-4), 1) * np.exp(-t * decay_rate)


# Each sound returns (mono signal, lead): lead = seconds before t where it starts (so it lands at t).
def whoosh(dur=0.6, **_):
    n = int(SR * dur); rise = int(n * 0.7)
    e = np.concatenate([np.linspace(0, 1, rise) ** 2.2, np.linspace(1, 0, n - rise) ** 1.5])
    s = np.concatenate([sweep_band(noise(rise), 350, 2600, 0.45), sweep_band(noise(n - rise), 2600, 600, 0.45)])
    return s * e * 1.6, dur * 0.7


def swish(dur=0.25, **_):
    s, lead = whoosh(dur)
    return highpass(s, 900), lead


def impact(dur=1.4, **_):
    t = tt(dur)
    boom = np.sin(2 * np.pi * np.cumsum(38 + 120 * np.exp(-t * 18)) / SR) * np.exp(-t * 2.6)
    crack = lowpass(noise(len(t)), 5000) * np.exp(-t * 28) * 0.7
    body = band(noise(len(t)), 80, 400) * np.exp(-t * 6) * 0.6
    return np.tanh((boom * 1.2 + crack + body) * 1.5) * 0.9, 0.0


def hit(**_):
    t = tt(0.35)
    k = np.sin(2 * np.pi * np.cumsum(50 + 140 * np.exp(-t * 35)) / SR) * np.exp(-t * 9)
    snap = band(noise(len(t)), 1500, 7000) * np.exp(-t * 40) * 0.6
    return np.tanh((k + snap) * 1.6) * 0.8, 0.0


def riser(dur=2.0, **_):
    t = tt(dur)
    s = sweep_band(noise(len(t)), 200, 6000, 0.3) * 0.8 + chirp(120, 1400, dur, 2.2) * 0.25
    return s * (t / dur) ** 2.5, dur


def revcrash(dur=1.2, **_):
    t = tt(dur)
    c = highpass(noise(len(t)), 3000) * np.exp(-t * 3.5)
    return c[::-1] * 0.8, dur


def downer(dur=1.0, **_):
    t = tt(dur)
    s = chirp(900, 50, dur, 1.2) * np.exp(-t * 2.5) + lowpass(noise(len(t)), 1200) * np.exp(-t * 5) * 0.3
    return s * 0.7, 0.0


def sub(dur=1.6, **_):
    t = tt(dur)
    return np.sin(2 * np.pi * np.cumsum(30 + 60 * np.exp(-t * 4)) / SR) * env_ad(len(t), 0.005, 2.2), 0.0


def tick(**_):
    t = tt(0.05)
    return highpass(noise(len(t)), 4000) * np.exp(-t * 180) * 0.6 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 150) * 0.3, 0.0


def click(**_):
    t = tt(0.03)
    return np.sin(2 * np.pi * 1800 * t) * np.exp(-t * 250) * 0.6, 0.0


def pop(note=76, **_):
    t = tt(0.16); f = 440 * 2 ** ((note - 69) / 12)
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t * 60))) / SR) * env_ad(len(t), 0.002, 28) * 0.7, 0.0


def blip(note=84, dur=0.12, **_):
    t = tt(dur); f = 440 * 2 ** ((note - 69) / 12)
    return np.sign(np.sin(2 * np.pi * f * t)) * 0.25 * env_ad(len(t), 0.002, 30) + np.sin(2 * np.pi * f * t) * 0.3 * env_ad(len(t), 0.002, 20), 0.0


def zap(**_):
    t = tt(0.22)
    return chirp(2400, 180, 0.22, 2.0) * np.exp(-t * 14) * 0.5, 0.0


def ding(note=88, dur=2.0, **_):
    t = tt(dur); f = 440 * 2 ** ((note - 69) / 12); s = np.zeros(len(t))
    for ratio, amp, dec in ((1, 1, 2.2), (2.76, 0.45, 3.5), (5.4, 0.25, 5.5), (8.93, 0.12, 8)):
        s += np.sin(2 * np.pi * f * ratio * t) * amp * np.exp(-t * dec)
    return s * env_ad(len(t), 0.001, 0) * 0.35, 0.0


def shimmer(dur=1.2, **_):
    t = tt(dur); s = np.zeros(len(t))
    for k in range(18):
        at = RNG.uniform(0, dur * 0.8); i = int(at * SR); f = RNG.uniform(2500, 7000)
        g = tt(0.25)
        part = np.sin(2 * np.pi * f * g) * np.exp(-g * 18) * 0.12
        s[i:i + len(part)] += part[:len(s) - i]
    return s, 0.0


def glitch(dur=0.3, **_):
    n = int(SR * dur); s = np.zeros(n); i = 0
    while i < n:
        L = int(SR * RNG.uniform(0.012, 0.05)); f = RNG.choice([180, 330, 660, 1250, 2500])
        g = np.arange(min(L, n - i)) / SR
        chunk = np.sign(np.sin(2 * np.pi * f * g)) if RNG.random() < 0.5 else noise(len(g))
        s[i:i + len(g)] = np.round(chunk * RNG.uniform(0.2, 0.6) * 6) / 6
        i += L + int(SR * RNG.uniform(0, 0.02))
    return s * 0.5, 0.0


def typing(dur=1.0, **_):
    n = int(SR * dur); s = np.zeros(n); at = 0.0
    while at < dur:
        c, _ = tick(); i = int(at * SR); s[i:i + len(c)] += c[:n - i] * RNG.uniform(0.5, 1)
        at += RNG.uniform(0.05, 0.13)
    return s, 0.0


SOUNDS = {f.__name__: f for f in (whoosh, swish, impact, hit, riser, revcrash, downer, sub, tick, click, pop, blip, zap, ding, shimmer, glitch, typing)}
# peak level of each sound at gain 1 (every sound is normalized first), so gains mean the same for all of them
LEVEL = {"impact": 0.9, "hit": 0.75, "sub": 0.8, "whoosh": 0.45, "swish": 0.35, "riser": 0.5, "revcrash": 0.45, "downer": 0.55,
         "tick": 0.35, "click": 0.35, "pop": 0.5, "blip": 0.4, "zap": 0.45, "ding": 0.5, "shimmer": 0.35, "glitch": 0.45, "typing": 0.3}
# how much of each sound goes to the reverb
REVERB = {"impact": 0.35, "hit": 0.2, "ding": 0.4, "pop": 0.15, "blip": 0.2, "zap": 0.25, "shimmer": 0.5, "whoosh": 0.15, "riser": 0.2}


def reverb_ir(d=1.6):
    t = tt(d)
    ir = noise(len(t)) * np.exp(-t * 3.2)
    return np.stack([lowpass(ir, 6000), lowpass(noise(len(t)) * np.exp(-t * 3.2), 6000)]) * 0.08


def place(buf, t0, sig):
    i = int(round(t0 * SR))
    if i < 0:
        sig, i = sig[:, -i:], 0
    j = min(buf.shape[1], i + sig.shape[1])
    if j > i:
        buf[:, i:j] += sig[:, :j - i]


def render_events(events, dur):
    n = int(SR * (dur + 2))
    dry, wet = np.zeros((2, n)), np.zeros((2, n))
    for e in events:
        name = e["name"]
        if name not in SOUNDS:
            print(f"sfx: unknown sound '{name}' at {e['t']:.2f}s (one of: {', '.join(SOUNDS)})", file=sys.stderr)
            continue
        opts = {k: e[k] for k in ("dur", "note") if e.get(k) is not None}
        sig, lead = SOUNDS[name](**opts)
        sig = sig / max(np.abs(sig).max(), 1e-9) * LEVEL.get(name, 0.6)
        a = (e.get("pan", 0) + 1) * np.pi / 4
        st = np.stack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2) * e.get("gain", 1.0)
        place(dry, e["t"] - lead, st)
        if REVERB.get(name):
            place(wet, e["t"] - lead, st * REVERB[name])
    ir = reverb_ir()
    wet = np.stack([signal.fftconvolve(wet[c], ir[c])[:n] for c in range(2)])
    return (dry + wet)[:, :int(SR * dur)]


def decode_stereo(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)


def limit(x, ceiling=0.97):
    """A simple peak limiter: a gain that drops instantly on peaks and recovers over ~80 ms, so hits never clip."""
    blk = 256
    n = x.shape[1]; nb = -(-n // blk)
    pad = np.pad(np.abs(x).max(axis=0), (0, nb * blk - n))
    peaks = pad.reshape(nb, blk).max(axis=1)
    peaks = np.maximum(peaks, np.concatenate([peaks[1:], [0]]))  # look one block ahead
    g = np.minimum(1, ceiling / np.maximum(peaks, 1e-9))
    rel = np.exp(-blk / (SR * 0.08))
    for i in range(1, nb):
        g[i] = min(g[i], g[i - 1] * rel + (1 - rel))
    gain = np.minimum(np.interp(np.arange(n), np.arange(nb) * blk + blk / 2, g), np.repeat(g, blk)[:n])
    return x * gain


def main():
    opts = dict(a[2:].split("=", 1) if "=" in a else (a[2:], "1") for a in sys.argv[1:] if a.startswith("--"))
    if "list" in opts:
        print(", ".join(SOUNDS)); return
    if "audition" in opts:
        events = [{"t": 1.0 + i * 1.2, "name": name} for i, name in enumerate(SOUNDS)]
        dur = events[-1]["t"] + 2.5
        for e in events:
            print(f"{e['t']:5.1f}s  {e['name']}")
    elif "events" in opts and "dur" in opts:
        with open(opts["events"], encoding="utf-8") as f:
            events = json.load(f)
        dur = float(opts["dur"])
    else:
        print(__doc__); sys.exit(1)
    fx = render_events(events, dur) * float(opts.get("gain", 1))
    mix = fx
    if opts.get("audio"):
        song = decode_stereo(opts["audio"])
        n = max(song.shape[1], fx.shape[1])
        mix = np.zeros((2, n)); mix[:, :song.shape[1]] += song; mix[:, :fx.shape[1]] += fx
    out = opts.get("out", "out/sfx/mix.wav")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    wavfile.write(out, SR, (limit(mix).T * 32767).astype(np.int16))
    print(f"sfx: {len(events)} sounds -> {out}")


if __name__ == "__main__":
    main()
