"""An instrumental bed built around a moment: a sparse intro, a build-up that lands on --drop, a full groove after it
and a fade-out. With --voice, the voice is mixed on top and the bed ducks under it while it talks.

Usage:
    python tools/make_bed.py --dur=27 --bpm=128 --drop=17.6 [--offset=auto] [--voice=my_voice.ogg] --out=projects/mix.wav

--offset (first downbeat) defaults to the value that puts --drop exactly on a downbeat.
Reuses the drum and synth voices of audio/generate_music.py. Needs numpy, scipy and ffmpeg on PATH.
"""
import importlib.util
import os
import subprocess
import sys

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("generate_music", os.path.join(ROOT, "audio", "generate_music.py"))
gm = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(gm)
SR = gm.SR

# A minor: Am F C G, as (bass root, arpeggio notes) in Hz
CHORDS = [(110.0, [440.0, 523.3, 659.3]), (87.3, [349.2, 440.0, 523.3]), (130.8, [523.3, 659.3, 784.0]), (98.0, [392.0, 493.9, 587.3])]


def decode_mono(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32)


def add(buf, sound, at, gain):
    i = int(at * SR)
    if i >= len(buf) or i + len(sound) <= 0:
        return
    j = min(len(buf), i + len(sound))
    buf[max(0, i):j] += sound[max(0, -i):j - i] * gain


def build(dur, bpm, drop, offset):
    beat, n = 60.0 / bpm, int(SR * dur)
    mix = np.zeros(n, dtype=np.float32)
    kick, snare, clap, hh, ohh = gm.generate_kick(), gm.generate_snare(), gm.generate_clap(), gm.generate_hihat(False), gm.generate_hihat(True)
    build_from = drop - 2 * 4 * beat
    b = offset
    while b < dur:
        k = int(round((b - offset) / beat))
        chord = CHORDS[(k // 8) % 4]
        if b < build_from:                      # intro: pulse and hats
            add(mix, gm.synth_note(chord[0] / 2, beat * .9, 'sine'), b, .5)
            add(mix, hh, b + beat / 2, .35)
            if k % 2 == 0: add(mix, kick, b, .45)
        elif b < drop - 1e-6:                   # build: kicks every beat, then silence the last beat before the drop
            if b < drop - beat - 1e-6:
                add(mix, kick, b, .6)
                add(mix, gm.synth_note(chord[0] / 2, beat * .9, 'saw', 400 + 1600 * (b - build_from) / (drop - build_from)), b, .35)
        else:                                   # full groove
            add(mix, kick, b, .85)
            if k % 2 == 1: add(mix, snare, b, .55); add(mix, clap, b, .35)
            for s in range(4): add(mix, hh, b + s * beat / 4, .28 if s % 2 else .2)
            add(mix, gm.synth_note(chord[0], beat * .45, 'saw', 900), b, .4)
            add(mix, gm.synth_note(chord[0], beat * .45, 'saw', 900), b + beat / 2, .3)
            for s, f in enumerate(chord[1] + chord[1][1:2]):
                add(mix, gm.synth_note(f, beat * .22, 'square', 2600), b + s * beat / 4, .12)
        b += beat
    # snare roll that speeds up into the drop, and a noise riser under it
    t = build_from
    while t < drop - 1e-6:
        p = (t - build_from) / (drop - build_from)
        add(mix, snare, t, .25 + .4 * p)
        t += beat / (1 if p < .5 else 2 if p < .75 else 4)
    i0, i1 = int(build_from * SR), int(drop * SR)
    noise = signal.sosfilt(signal.butter(2, 3000, btype='highpass', fs=SR, output='sos'), np.random.normal(0, 1, i1 - i0))
    mix[i0:i1] += (noise * np.linspace(0, .25, i1 - i0) ** 2).astype(np.float32)
    add(mix, ohh, drop, 1.0)
    add(mix, kick, drop, .5)
    fade = int(1.5 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return mix


def main():
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    if not {"dur", "bpm", "drop", "out"} <= opts.keys():
        print(__doc__)
        sys.exit(1)
    dur, bpm, drop = float(opts["dur"]), float(opts["bpm"]), float(opts["drop"])
    bar = 4 * 60.0 / bpm
    offset = float(opts["offset"]) if opts.get("offset", "auto") != "auto" else drop % bar
    np.random.seed(7)
    bed = build(dur, bpm, drop, offset)
    if "voice" in opts:
        voice = decode_mono(opts["voice"])[: len(bed)]
        voice = np.pad(voice, (0, len(bed) - len(voice))) / (np.abs(voice).max() or 1)
        talk = np.convolve(np.abs(voice), np.ones(int(.15 * SR)) / int(.15 * SR), mode="same")
        talk = np.clip(talk / (talk.max() or 1) * 3, 0, 1)
        mix = bed * (1 - .55 * talk) * .7 + voice * .9
    else:
        mix = bed * .8
    mix = np.tanh(mix * 1.1)
    out = opts["out"] if os.path.isabs(opts["out"]) else os.path.join(os.getcwd(), opts["out"])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    wavfile.write(out, SR, (np.column_stack([mix, mix]) * 32767).clip(-32768, 32767).astype(np.int16))
    print(f"{out}: {dur:.1f} s at {bpm} BPM, first downbeat {offset:.3f} s, drop at {drop:.2f} s")


if __name__ == "__main__":
    main()
