import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal
import os

SR = 44100
DUR = 36.0
BPM = 124.0
BEAT = 60.0 / BPM  # ~0.48387s
BAR = BEAT * 4     # ~1.93548s
TOTAL_SAMPLES = int(SR * DUR)

def generate_pop_kick():
    d = 0.25
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    freq = 48 + 140 * np.exp(-t * 32)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    amp = np.exp(-t * 14)
    k = np.sin(phase) * amp
    click = np.random.normal(0, 0.25, n) * np.exp(-t * 90)
    sig = k + click
    return np.tanh(sig * 1.5)

def generate_pop_clap():
    d = 0.28
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, [1100, 8500], btype='bandpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise)
    env = (0.5 * np.exp(-np.maximum(0, t - 0.0) * 110) +
           0.7 * np.exp(-np.maximum(0, t - 0.018) * 110) +
           1.0 * np.exp(-np.maximum(0, t - 0.035) * 22))
    return np.tanh(noise * env * 1.4)

def generate_pop_snare():
    d = 0.26
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    tone = np.sin(2 * np.pi * (210 * np.exp(-t * 24)) * t) * np.exp(-t * 25)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, [900, 7000], btype='bandpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise) * np.exp(-t * 18)
    return np.tanh((0.4 * tone + 0.6 * noise) * 1.6)

def generate_hihat(open_h=False):
    d = 0.32 if open_h else 0.05
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, 7800, btype='highpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise)
    decay = 14 if open_h else 75
    return noise * np.exp(-t * decay) * 0.35

def synth_pop_note(freq, dur, kind='saw', cutoff=1500):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    if kind == 'saw':
        # Detuned unison saws
        sig = (signal.sawtooth(2 * np.pi * freq * t) +
               0.5 * signal.sawtooth(2 * np.pi * (freq * 1.004) * t) +
               0.5 * signal.sawtooth(2 * np.pi * (freq * 0.996) * t)) / 2.0
    elif kind == 'square':
        sig = signal.square(2 * np.pi * freq * t, duty=0.48)
    else:
        sig = np.sin(2 * np.pi * freq * t)
    
    sos = signal.butter(2, min(cutoff, SR * 0.45), btype='lowpass', fs=SR, output='sos')
    sig = signal.sosfilt(sos, sig)
    env = np.exp(-t * (3.0 / dur)) * (1 - np.exp(-t * 180))
    return sig * env

def build_pop_song():
    print("Synthesizing Claude Pop (Latent Pop) soundtrack...")
    L = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    R = np.zeros(TOTAL_SAMPLES, dtype=np.float32)

    kick = generate_pop_kick()
    clap = generate_pop_clap()
    snare = generate_pop_snare()
    hh_c = generate_hihat(False)
    hh_o = generate_hihat(True)

    # 1. DRUMS (18 bars, 72 beats)
    for beat in range(int(DUR / BEAT)):
        t_sec = beat * BEAT
        idx = int(t_sec * SR)

        # Pre-chorus snare roll at 18.0s - 20.0s (beats 36 to 40)
        is_snare_roll = (36 <= beat < 40)

        if not is_snare_roll and beat not in [35, 70, 71]:
            # 4-on-the-floor kick
            end = min(TOTAL_SAMPLES, idx + len(kick))
            L[idx:end] += kick[:end-idx] * 0.85
            R[idx:end] += kick[:end-idx] * 0.85

        # Claps on beats 2 and 4
        if beat % 2 == 1 and not is_snare_roll and beat < 70:
            end = min(TOTAL_SAMPLES, idx + len(clap))
            L[idx:end] += clap[:end-idx] * 0.65
            R[idx:end] += clap[:end-idx] * 0.65

        # Hi-hats
        if not is_snare_roll:
            for s in range(4):
                h_idx = idx + int(s * (BEAT / 4) * SR)
                if h_idx < TOTAL_SAMPLES:
                    if s == 2:  # Off-beat open hat
                        end = min(TOTAL_SAMPLES, h_idx + len(hh_o))
                        L[h_idx:end] += hh_o[:end-h_idx] * 0.32
                        R[h_idx:end] += hh_o[:end-h_idx] * 0.42
                    else:
                        vel = 0.28 if s == 0 else 0.16
                        end = min(TOTAL_SAMPLES, h_idx + len(hh_c))
                        L[h_idx:end] += hh_c[:end-h_idx] * vel
                        R[h_idx:end] += hh_c[:end-h_idx] * (vel * 0.8)

        # Snare roll build-up
        if is_snare_roll:
            step = BEAT / 4 if beat >= 38 else BEAT / 2
            sub_count = int(BEAT / step)
            for sub in range(sub_count):
                sr_idx = idx + int(sub * step * SR)
                if sr_idx < TOTAL_SAMPLES:
                    end = min(TOTAL_SAMPLES, sr_idx + len(snare))
                    vol = 0.3 + 0.6 * ((beat - 36 + sub * (step / BEAT)) / 4.0)
                    L[sr_idx:end] += snare[:end-sr_idx] * vol
                    R[sr_idx:end] += snare[:end-sr_idx] * vol

    # 2. BASSLINE & CHORDS (K-pop royal road progression: F -> G -> Em -> Am)
    F2 = 87.31; G2 = 98.00; E2 = 82.41; A2 = 110.00; C2 = 65.41; D2 = 73.42
    prog_roots = [F2, G2, E2, A2]

    for bar in range(18):
        t_bar = bar * BAR
        root = prog_roots[bar % len(prog_roots)]
        # Slap pop bassline rhythm (root, octave, fifth)
        bass_pattern = [
            (0.0, 1.0, BEAT * 0.45),
            (BEAT * 0.75, 1.0, BEAT * 0.25),
            (BEAT * 1.0, 2.0, BEAT * 0.45),
            (BEAT * 1.75, 1.0, BEAT * 0.25),
            (BEAT * 2.0, 1.5, BEAT * 0.45),
            (BEAT * 2.75, 1.0, BEAT * 0.25),
            (BEAT * 3.0, 2.0, BEAT * 0.45),
            (BEAT * 3.5, 1.25, BEAT * 0.35)
        ]
        # In chorus drop (bars 10 to 14, 20s - 28s), bass gets more resonance
        is_drop = (10 <= bar < 15)
        cutoff = 1100 if is_drop else 700

        for t_off, mult, dur in bass_pattern:
            t_note = t_bar + t_off
            if t_note < DUR - 1.0:
                idx = int(t_note * SR)
                note_sig = synth_pop_note(root * mult, dur, kind='saw', cutoff=cutoff) * 0.75
                end = min(TOTAL_SAMPLES, idx + len(note_sig))
                L[idx:end] += note_sig[:end-idx]
                R[idx:end] += note_sig[:end-idx]

    # 3. K-POP SYNTH CHORD STABS & ARPEGGIATOR
    chord_stabs = [
        # Fmaj7: F4, A4, C5, E5
        [349.23, 440.00, 523.25, 659.25],
        # G7: G4, B4, D5, F5
        [392.00, 493.88, 587.33, 698.46],
        # Em7: E4, G4, B4, D5
        [329.63, 392.00, 493.88, 587.33],
        # Am7: A4, C5, E5, G5
        [440.00, 523.25, 659.25, 783.99]
    ]

    for bar in range(18):
        t_bar = bar * BAR
        stabs = chord_stabs[bar % len(chord_stabs)]
        is_drop = (10 <= bar < 15)

        # Off-beat synth pads / brass stabs
        for b_off in [BEAT * 0.5, BEAT * 1.5, BEAT * 2.5, BEAT * 3.5]:
            t_stab = t_bar + b_off
            if t_stab < DUR - 1.0:
                idx = int(t_stab * SR)
                vol = 0.24 if is_drop else 0.16
                for f in stabs:
                    ch_note = synth_pop_note(f, BEAT * 0.6, kind='saw', cutoff=2800) * vol
                    end = min(TOTAL_SAMPLES, idx + len(ch_note))
                    L[idx:end] += ch_note[:end-idx] * 0.8
                    R[idx:end] += ch_note[:end-idx] * 1.0

    # 4. CHORUS DROP BRASS BLASTS (At 20.0s)
    # Huge brass fanfare chords during chorus
    drop_idx = int(19.35 * SR)
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.50]):
        blast = synth_pop_note(f, 1.2, kind='saw', cutoff=3500) * 0.28
        end = min(TOTAL_SAMPLES, drop_idx + len(blast))
        L[drop_idx:end] += blast[:end-drop_idx]
        R[drop_idx:end] += blast[:end-drop_idx]

    # 5. MIX NEURAL VOCALS (Clean, Warm, Studio Presence - ZERO ROBOTIC HARSHNESS!)
    vocal_cues = [
        (1.0, "audio/pop_v1.wav"),
        (6.0, "audio/pop_v2.wav"),
        (12.0, "audio/pop_v3.wav"),
        (16.0, "audio/pop_v4.wav"),
        (20.0, "audio/pop_v5.wav"),  # CHORUS DROP!
        (24.0, "audio/pop_v6.wav"),
        (28.0, "audio/pop_v7.wav"),
        (32.0, "audio/pop_v8.wav")
    ]

    for start_t, vfile in vocal_cues:
        if os.path.exists(vfile):
            rate, data = wavfile.read(vfile)
            if data.dtype == np.int16:
                v = data.astype(np.float32) / 32768.0
            else:
                v = data.astype(np.float32)
            if len(v.shape) > 1:
                v = v[:, 0]
            if rate != SR:
                num_out = int(len(v) * SR / rate)
                v = signal.resample(v, num_out)

            # STUDIO POP VOCAL CHAIN:
            # 1. High-pass filter at 110Hz to eliminate mic mud
            sos_hp = signal.butter(2, 110, btype='highpass', fs=SR, output='sos')
            v_clean = signal.sosfilt(sos_hp, v)

            # 2. Warm presence boost around 3.5kHz (air and clarity)
            sos_air = signal.butter(2, [2800, 7500], btype='bandpass', fs=SR, output='sos')
            air = signal.sosfilt(sos_air, v_clean) * 0.35
            v_master = v_clean + air

            # 3. Gentle vocal compression (smooth leveling, NO distortion)
            v_master = np.tanh(v_master * 1.35) * 0.95

            idx = int(start_t * SR)
            end = min(TOTAL_SAMPLES, idx + len(v_master))
            v_part = v_master[:end-idx]

            # Direct vocal (center)
            L[idx:end] += v_part * 0.95
            R[idx:end] += v_part * 0.95

            # Studio stereo plate reverb / delay (120ms left, 180ms right)
            del_l = idx + int(0.12 * SR)
            del_r = idx + int(0.18 * SR)
            if del_l < TOTAL_SAMPLES:
                end_l = min(TOTAL_SAMPLES, del_l + len(v_part))
                L[del_l:end_l] += v_part[:end_l-del_l] * 0.22
            if del_r < TOTAL_SAMPLES:
                end_r = min(TOTAL_SAMPLES, del_r + len(v_part))
                R[del_r:end_r] += v_part[:end_r-del_r] * 0.25

    # Master limiter & compression
    master_L = np.tanh(L * 1.1)
    master_R = np.tanh(R * 1.1)

    # Smooth fade out at the very end (last 1.0s)
    fade_len = int(1.0 * SR)
    fade = np.linspace(1, 0, fade_len)
    master_L[-fade_len:] *= fade
    master_R[-fade_len:] *= fade

    stereo = np.column_stack([master_L, master_R])
    stereo_int16 = (stereo * 32767).clip(-32768, 32767).astype(np.int16)

    out_wav = "audio/claude_pop.wav"
    wavfile.write(out_wav, SR, stereo_int16)
    print(f"Wrote {out_wav} ({len(stereo_int16)/SR:.2f} seconds)")

if __name__ == '__main__':
    build_pop_song()
