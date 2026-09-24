import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal
import os

SR = 44100
DUR = 60.0
BPM = 120.0
BEAT = 60.0 / BPM  # 0.5s
TOTAL_SAMPLES = int(SR * DUR)

def generate_kick():
    d = 0.28
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    freq = 42 + 120 * np.exp(-t * 26)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    amp = np.exp(-t * 11)
    k = np.sin(phase) * amp
    click = np.random.normal(0, 0.35, n) * np.exp(-t * 70)
    sig = k + click
    return np.tanh(sig * 1.7)

def generate_snare():
    d = 0.3
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    tone = np.sin(2 * np.pi * (185 * np.exp(-t * 18)) * t) * np.exp(-t * 20)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, [750, 6500], btype='bandpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise) * np.exp(-t * 13)
    sig = 0.45 * tone + 0.55 * noise
    return np.tanh(sig * 1.8)

def generate_clap():
    d = 0.3
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, [900, 7500], btype='bandpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise)
    env = (0.4 * np.exp(-np.maximum(0, t - 0.0) * 80) +
           0.6 * np.exp(-np.maximum(0, t - 0.02) * 80) +
           1.0 * np.exp(-np.maximum(0, t - 0.04) * 16))
    return np.tanh(noise * env * 1.5)

def generate_hihat(open_hat=False):
    d = 0.35 if open_hat else 0.06
    n = int(SR * d)
    t = np.linspace(0, d, n, endpoint=False)
    noise = np.random.normal(0, 1, n)
    sos = signal.butter(4, 7200, btype='highpass', fs=SR, output='sos')
    noise = signal.sosfilt(sos, noise)
    decay = 11 if open_hat else 65
    return noise * np.exp(-t * decay) * 0.4

def synth_note(freq, dur, kind='saw', cutoff=1200):
    n = int(SR * dur)
    t = np.linspace(0, dur, n, endpoint=False)
    if kind == 'saw':
        sig = signal.sawtooth(2 * np.pi * freq * t)
    elif kind == 'square':
        sig = signal.square(2 * np.pi * freq * t, duty=0.45)
    else:
        sig = np.sin(2 * np.pi * freq * t)
    
    sos = signal.butter(2, min(cutoff, SR * 0.45), btype='lowpass', fs=SR, output='sos')
    sig = signal.sosfilt(sos, sig)
    env = np.exp(-t * (3.8 / dur)) * (1 - np.exp(-t * 220))
    return sig * env

def build_song():
    print("Synthesizing 60-second soundtrack...")
    L = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    R = np.zeros(TOTAL_SAMPLES, dtype=np.float32)

    # 1. DRUMS (120 beats across 60 seconds)
    kick = generate_kick()
    snare = generate_snare()
    clap = generate_clap()
    hh_closed = generate_hihat(False)
    hh_open = generate_hihat(True)

    for beat in range(int(DUR / BEAT)):
        t_sec = beat * BEAT
        idx = int(t_sec * SR)

        # Dropouts on beats 19, 39, 59, 79, 99 for comic pauses
        is_break = (beat % 20 in [18, 19])
        if not is_break:
            end = min(TOTAL_SAMPLES, idx + len(kick))
            L[idx:end] += kick[:end-idx] * 0.85
            R[idx:end] += kick[:end-idx] * 0.85

        # Snare / Clap on beats 2 and 4
        if beat % 2 == 1 and not is_break:
            end = min(TOTAL_SAMPLES, idx + len(snare))
            L[idx:end] += snare[:end-idx] * 0.65
            R[idx:end] += snare[:end-idx] * 0.65
            end_c = min(TOTAL_SAMPLES, idx + len(clap))
            L[idx:end_c] += clap[:end_c-idx] * 0.35
            R[idx:end_c] += clap[:end_c-idx] * 0.35

        # 16th-note Hi-hats
        for s in range(4):
            h_idx = idx + int(s * 0.125 * SR)
            if h_idx < TOTAL_SAMPLES and not is_break:
                if s == 2:  # Off-beat open hat
                    end = min(TOTAL_SAMPLES, h_idx + len(hh_open))
                    L[h_idx:end] += hh_open[:end-h_idx] * 0.35
                    R[h_idx:end] += hh_open[:end-h_idx] * 0.45
                else:
                    vel = 0.32 if s == 0 else 0.18
                    end = min(TOTAL_SAMPLES, h_idx + len(hh_closed))
                    L[h_idx:end] += hh_closed[:end-h_idx] * vel
                    R[h_idx:end] += hh_closed[:end-h_idx] * (vel * 0.8)

    # 2. BASSLINE & CHORDS (30 bars = 60s)
    # Chord root frequencies
    D2 = 73.42; F2 = 87.31; G2 = 98.00; A2 = 110.00; Bb1 = 58.27; C2 = 65.41; D3 = 146.83
    # 4-bar chord progression repeating every 8 seconds
    chords = [D2, Bb1, C2, F2]

    for bar in range(30):
        t_bar = bar * 2.0
        root = chords[bar % len(chords)]
        # 16th note funky bass groove
        for note_idx, (t_sub, mult, dur) in enumerate([
            (0.0, 1.0, 0.22), (0.25, 1.0, 0.15), (0.5, 2.0, 0.2), (0.75, 1.0, 0.15),
            (1.0, 1.25, 0.22), (1.5, 1.5, 0.2), (1.75, 1.0, 0.18)
        ]):
            t_note = t_bar + t_sub
            if t_note < DUR - 1.0:
                idx = int(t_note * SR)
                freq = root * mult
                # Section 2 (10-20s): Wobbly glitch bass
                cutoff = 950 + 400 * np.sin(bar * 3) if 10 <= t_note < 20 else 650
                b_note = synth_note(freq, dur, kind='saw', cutoff=cutoff) * 0.75
                end = min(TOTAL_SAMPLES, idx + len(b_note))
                L[idx:end] += b_note[:end-idx]
                R[idx:end] += b_note[:end-idx]

    # 3. SYNTH ARPEGGIOS (High registers dancing in 16th notes)
    arp_scales = [
        [293.66, 349.23, 440.00, 587.33, 523.25, 440.00, 349.23, 392.00], # Dm
        [233.08, 293.66, 349.23, 466.16, 440.00, 349.23, 293.66, 349.23], # Bb
        [261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 329.63, 392.00], # C
        [349.23, 440.00, 523.25, 698.46, 659.25, 523.25, 440.00, 523.25]  # F
    ]

    for sixteenth in range(int((DUR - 1.0) / 0.125)):
        t_sec = sixteenth * 0.125
        idx = int(t_sec * SR)
        bar = int(t_sec / 2.0)
        scale_idx = bar % len(arp_scales)
        notes = arp_scales[scale_idx]
        freq = notes[sixteenth % len(notes)]
        
        # In section 5 & 6 (40-60s), arpeggios get brighter and higher
        cutoff = 3200 if t_sec >= 40 else 2200
        vol = 0.28 if t_sec >= 40 else 0.18
        arp = synth_note(freq, 0.11, kind='square', cutoff=cutoff) * vol
        pan = 0.5 + 0.35 * np.sin(sixteenth * 0.6)
        end = min(TOTAL_SAMPLES, idx + len(arp))
        L[idx:end] += arp[:end-idx] * (1 - pan)
        R[idx:end] += arp[:end-idx] * pan

    # 4. SOUND EFFECTS
    # Laser sweep at 10.0s (Temperature rising)
    t_las = np.linspace(0, 0.6, int(SR * 0.6), endpoint=False)
    las = np.sin(2 * np.pi * np.cumsum(3500 * np.exp(-t_las * 6) + 150) / SR) * np.exp(-t_las * 4) * 0.4
    l_idx = int(10.0 * SR)
    L[l_idx:l_idx+len(las)] += las * 0.4; R[l_idx:l_idx+len(las)] += las * 0.7

    # Oven timer bell ding at 39.0s (Cookies ready!)
    t_bell = np.linspace(0, 1.2, int(SR * 1.2), endpoint=False)
    bell = (np.sin(2 * np.pi * 2093 * t_bell) + 0.5 * np.sin(2 * np.pi * 3135 * t_bell)) * np.exp(-t_bell * 3.5) * 0.5
    b_idx = int(39.0 * SR)
    L[b_idx:b_idx+len(bell)] += bell; R[b_idx:b_idx+len(bell)] += bell

    # Big sub drop at 40.0s (Context window explosion)
    t_sub = np.linspace(0, 1.5, int(SR * 1.5), endpoint=False)
    sub = np.sin(2 * np.pi * np.cumsum(120 * np.exp(-t_sub * 2.5) + 35) / SR) * np.exp(-t_sub * 1.8) * 0.7
    s_idx = int(40.0 * SR)
    L[s_idx:s_idx+len(sub)] += sub; R[s_idx:s_idx+len(sub)] += sub

    # 5. VOCALS (12 timed lines)
    vocal_cues = [
        (1.0, "audio/ai_v1.wav"),
        (5.2, "audio/ai_v2.wav"),
        (11.0, "audio/ai_v3.wav"),
        (15.2, "audio/ai_v4.wav"),
        (21.0, "audio/ai_v5.wav"),
        (25.2, "audio/ai_v6.wav"),
        (31.0, "audio/ai_v7.wav"),
        (35.2, "audio/ai_v8.wav"),
        (41.0, "audio/ai_v9.wav"),
        (45.2, "audio/ai_v10.wav"),
        (51.0, "audio/ai_v11.wav"),
        (55.2, "audio/ai_v12.wav")
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

            # Robot vocoder modulation
            t_v = np.arange(len(v)) / SR
            carrier = np.sin(2 * np.pi * 145 * t_v)
            v_robot = v * 0.75 + (v * carrier) * 0.45
            sos_v = signal.butter(4, [260, 4900], btype='bandpass', fs=SR, output='sos')
            v_clean = signal.sosfilt(sos_v, v_robot)
            v_clean = np.tanh(v_clean * 2.2) * 0.95

            idx = int(start_t * SR)
            end = min(TOTAL_SAMPLES, idx + len(v_clean))
            L[idx:end] += v_clean[:end-idx] * 0.95
            R[idx:end] += v_clean[:end-idx] * 0.95

            # Ping-pong stereo delay (125ms = 16th note)
            echo_idx = idx + int(0.125 * SR)
            echo_end = min(TOTAL_SAMPLES, echo_idx + len(v_clean))
            if echo_idx < TOTAL_SAMPLES:
                L[echo_idx:echo_end] += v_clean[:echo_end-echo_idx] * 0.28
                R[echo_idx:echo_end] += v_clean[:echo_end-echo_idx] * 0.38

    # Master compression and fade out
    master_L = np.tanh(L * 1.12)
    master_R = np.tanh(R * 1.12)
    fade_len = int(1.2 * SR)
    fade = np.linspace(1, 0, fade_len)
    master_L[-fade_len:] *= fade
    master_R[-fade_len:] *= fade

    stereo = np.column_stack([master_L, master_R])
    stereo_int16 = (stereo * 32767).clip(-32768, 32767).astype(np.int16)

    out_wav = "audio/ai_day_song.wav"
    wavfile.write(out_wav, SR, stereo_int16)
    print(f"Wrote {out_wav} ({len(stereo_int16)/SR:.2f} seconds)")

if __name__ == '__main__':
    build_song()
