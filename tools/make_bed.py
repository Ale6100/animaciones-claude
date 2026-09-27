"""An instrumental bed built around a moment: a sparse intro, a build-up that lands on --drop, a full groove after it
and a fade-out. With --voice, the voice is mixed on top and the bed ducks under it while it talks.

Usage:
    python tools/make_bed.py --dur=27 --bpm=128 --drop=17.6 [--offset=auto] [--voice=my_voice.ogg] --out=projects/mix.wav
    python tools/make_bed.py --style=calm --dur=480 --bpm=84 [--voice=narration.wav] --out=projects/mix.wav
    python tools/make_bed.py --style=cumbia --dur=58 --bpm=96 [--stop=50.1:54] [--voice=sketch.ogg] --out=projects/mix.wav

--offset (first downbeat) defaults to the value that puts --drop exactly on a downbeat.
--style=calm is a soft, even loop with no build or drop (soft chords, a light kick and hats), to sit under a long
narration; it takes no --drop and starts on a downbeat at --offset (default 0).
--style=cumbia is a light, major-key cumbia loop (güiro, offbeat keys, root-fifth bass), for comedy and everyday
scenes; like calm, it takes no --drop.
--stop=a[:b] cuts the bed with a record scratch at second a (the comedy "music stops" beat) and brings it back at b.
Uses the drum and synth voices of tools/synth.py. Needs numpy, scipy and ffmpeg on PATH.
"""
import os
import subprocess
import sys

import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal

import synth

SR = synth.SR

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
    kick, snare, clap, hh, ohh = synth.generate_kick(), synth.generate_snare(), synth.generate_clap(), synth.generate_hihat(False), synth.generate_hihat(True)
    build_from = max(0.0, drop - 2 * 4 * beat)
    b = offset
    while b < dur:
        k = int(round((b - offset) / beat))
        chord = CHORDS[(k // 8) % 4]
        if b < build_from:                      # intro: pulse and hats
            add(mix, synth.synth_note(chord[0] / 2, beat * .9, 'sine'), b, .5)
            add(mix, hh, b + beat / 2, .35)
            if k % 2 == 0: add(mix, kick, b, .45)
        elif b < drop - 1e-6:                   # build: kicks every beat, then silence the last beat before the drop
            if b < drop - beat - 1e-6:
                add(mix, kick, b, .6)
                add(mix, synth.synth_note(chord[0] / 2, beat * .9, 'saw', 400 + 1600 * (b - build_from) / (drop - build_from)), b, .35)
        else:                                   # full groove
            add(mix, kick, b, .85)
            if k % 2 == 1: add(mix, snare, b, .55); add(mix, clap, b, .35)
            for s in range(4): add(mix, hh, b + s * beat / 4, .28 if s % 2 else .2)
            add(mix, synth.synth_note(chord[0], beat * .45, 'saw', 900), b, .4)
            add(mix, synth.synth_note(chord[0], beat * .45, 'saw', 900), b + beat / 2, .3)
            for s, f in enumerate(chord[1] + chord[1][1:2]):
                add(mix, synth.synth_note(f, beat * .22, 'square', 2600), b + s * beat / 4, .12)
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


def build_calm(dur, bpm, offset):
    beat, n = 60.0 / bpm, int(SR * dur)
    mix = np.zeros(n, dtype=np.float32)
    kick, hh = synth.generate_kick(), synth.generate_hihat(False)
    b = offset
    while b < dur:
        k = int(round((b - offset) / beat))
        chord = CHORDS[(k // 8) % 4]
        if k % 8 == 0:
            for f in chord[1]: add(mix, synth.synth_note(f / 2, beat * 7.5, 'sine'), b, .09)
        add(mix, synth.synth_note(chord[0] / 2, beat * .8, 'sine'), b, .3 if k % 2 == 0 else .18)
        add(mix, synth.synth_note(chord[1][k % 3], beat * .45, 'square', 1400), b + beat / 2, .07)
        if k % 4 == 0: add(mix, kick, b, .32)
        add(mix, hh, b + beat / 2, .12)
        b += beat
    fade = int(3 * SR)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    return mix


# C major, one chord per bar: C G C G F C G C, as (bass root, triad) in Hz
CUMBIA_CHORDS = [(130.8, [261.6, 329.6, 392.0]), (98.0, [392.0, 493.9, 587.3])] * 2 + [
    (87.3, [349.2, 440.0, 523.3]), (130.8, [261.6, 329.6, 392.0]), (98.0, [392.0, 493.9, 587.3]), (130.8, [261.6, 329.6, 392.0])]


def guiro(dur):
    n = int(SR * dur)
    t = np.arange(n) / SR
    noise = signal.sosfilt(signal.butter(2, [2500, 7000], btype="bandpass", fs=SR, output="sos"), np.random.normal(0, 1, n))
    ridges = .55 + .45 * np.sign(np.sin(2 * np.pi * 45 * t))
    return (noise * ridges * np.sin(np.pi * t / dur) ** .7).astype(np.float32)


def build_cumbia(dur, bpm, offset):
    beat, n = 60.0 / bpm, int(SR * dur)
    mix = np.zeros(n, dtype=np.float32)
    kick, long_scrape, short_scrape = synth.generate_kick(), guiro(beat * .5), guiro(beat * .2)
    t_conga = np.arange(int(.25 * SR)) / SR
    conga = (np.sin(2 * np.pi * 190 * t_conga * (1 - .15 * t_conga)) * np.exp(-t_conga * 18)).astype(np.float32)
    b = offset
    while b < dur:
        k = int(round((b - offset) / beat))
        root, triad = CUMBIA_CHORDS[(k // 4) % len(CUMBIA_CHORDS)]
        pos = k % 4
        add(mix, long_scrape, b, .1)
        add(mix, short_scrape, b + beat * .5, .07)
        add(mix, short_scrape, b + beat * .75, .07)
        if pos in (0, 2):
            add(mix, kick, b, .3)
            add(mix, synth.synth_note(root / 2 * (1.5 if pos == 2 else 1), beat * .7, 'sine'), b, .38)
        if pos == 3:
            add(mix, conga, b, .25)
            add(mix, conga, b + beat * .5, .18)
            add(mix, synth.synth_note(root / 2 * 1.5, beat * .3, 'sine'), b + beat * .5, .22)
        for f in triad:
            add(mix, synth.synth_note(f, beat * .3, 'square', 1800), b + beat * .5, .035)
        b += beat
    fade = int(1.5 * SR)
    mix[:int(.3 * SR)] *= np.linspace(0, 1, int(.3 * SR))
    mix[-fade:] *= np.linspace(1, 0, fade)
    return mix


def record_stop(bed, a, b=None):
    """Silence the bed from second a (to b, if given) behind a record scratch, easing back in at b."""
    i, d = int(a * SR), int(.35 * SR)
    if i >= len(bed):
        return bed
    t = np.arange(d) / SR
    scratch = signal.sawtooth(2 * np.pi * np.cumsum(np.linspace(900, 120, d)) / SR) * np.exp(-t * 5) * .5
    scratch += np.random.normal(0, .12, d) * np.exp(-t * 9)
    j = len(bed) if b is None else int(b * SR)
    tail = bed[i:i + d].copy() * np.linspace(1, 0, min(d, len(bed) - i))[:len(bed[i:i + d])]
    bed[i:j] = 0
    bed[i:i + len(tail)] += tail * .3
    bed[i:i + d] += scratch[:len(bed[i:i + d])].astype(np.float32)
    if b is not None and j < len(bed):
        ramp = min(int(.6 * SR), len(bed) - j)
        bed[j:j + ramp] *= np.linspace(0, 1, ramp)
    return bed


def main():
    opts = dict(a[2:].split("=", 1) for a in sys.argv[1:] if a.startswith("--") and "=" in a)
    style = opts.get("style")
    if style not in (None, "calm", "cumbia"):
        sys.exit(f"unknown --style={style} (calm or cumbia; leave it out for a bed with a drop)")
    if not ({"dur", "bpm", "out"} | (set() if style in ("calm", "cumbia") else {"drop"})) <= opts.keys():
        print(__doc__)
        sys.exit(1)
    dur, bpm = float(opts["dur"]), float(opts["bpm"])
    np.random.seed(7)
    if style in ("calm", "cumbia"):
        drop, offset = None, float(opts.get("offset", 0))
        bed = (build_calm if style == "calm" else build_cumbia)(dur, bpm, offset)
    else:
        drop = float(opts["drop"])
        if not 0 < drop < dur:
            sys.exit(f"--drop={drop} must fall inside the bed (0 < drop < --dur={dur})")
        offset = float(opts["offset"]) if opts.get("offset", "auto") != "auto" else drop % (4 * 60.0 / bpm)
        bed = build(dur, bpm, drop, offset)
    if "stop" in opts:
        a, _, b = opts["stop"].partition(":")
        bed = record_stop(bed, float(a), float(b) if b else None)
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
    print(f"{out}: {dur:.1f} s at {bpm} BPM, first downbeat {offset:.3f} s" + (f", drop at {drop:.2f} s" if drop is not None else ""))


if __name__ == "__main__":
    main()
