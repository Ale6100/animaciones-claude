"""Drum and synth voices shared by the audio tools (tools/make_bed.py): each function returns a mono float array at SR.

Not a script: import it from a sibling tool. Needs numpy and scipy.
"""
import numpy as np
import scipy.signal as signal

SR = 44100

def generate_kick():
    d = 0.28
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    # Pitch drop from 160Hz to 42Hz
    freq = 42 + 118 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    amp = np.exp(-t * 12)
    k = np.sin(phase) * amp
    # Click transient
    click = np.random.normal(0, 0.4, n) * np.exp(-t * 80)
    sig = k + click
    return np.tanh(sig * 1.6)

def generate_snare():
    d = 0.3
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    # Tonal body
    tone = np.sin(2 * np.pi * (180 * np.exp(-t * 20)) * t) * np.exp(-t * 22)
    # Noise body (bandpassed)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, [800, 6000], btype='bandpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise) * np.exp(-t * 14)
    sig = 0.45 * tone + 0.55 * noise
    return np.tanh(sig * 1.8)

def generate_clap():
    d = 0.32
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, [1000, 7000], btype='bandpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise)
    # Multi-tap envelope for claps
    env = (0.4 * np.exp(-np.maximum(0, t - 0.0) * 80) +
           0.6 * np.exp(-np.maximum(0, t - 0.02) * 80) +
           1.0 * np.exp(-np.maximum(0, t - 0.04) * 16))
    return np.tanh(noise * env * 1.5)

def generate_hihat(open_hat=False):
    d = 0.35 if open_hat else 0.06
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, 7500, btype='highpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise)
    decay = 12 if open_hat else 65
    return noise * np.exp(-t * decay) * 0.4

def synth_note(freq, dur, kind='saw', cutoff=1200):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    if kind == 'saw':
        sig = signal.sawtooth(2 * np.pi * freq * t)
    elif kind == 'square':
        sig = signal.square(2 * np.pi * freq * t, duty=0.4)
    else:
        sig = np.sin(2 * np.pi * freq * t)
    
    # Filter
    sos = signal.butter(2, min(cutoff, SR * 0.45), btype='lowpass', fs=SR, output='sos')
    sig = signal.sosfilt(sos, sig)
    # Envelope
    env = np.exp(-t * (4.0 / dur)) * (1 - np.exp(-t * 200))
    return sig * env
