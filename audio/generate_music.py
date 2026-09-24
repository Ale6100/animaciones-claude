import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal
import os

SR = 44100
DUR = 20.0
BPM = 120.0
BEAT = 60.0 / BPM  # 0.5s
TOTAL_SAMPLES = int(SR * DUR)

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

def build_song():
    print("Synthesizing music tracks...")
    L = np.zeros(TOTAL_SAMPLES, dtype=np.float32)
    R = np.zeros(TOTAL_SAMPLES, dtype=np.float32)

    # 1. DRUMS
    kick = generate_kick()
    snare = generate_snare()
    clap = generate_clap()
    hh_closed = generate_hihat(False)
    hh_open = generate_hihat(True)

    for beat in range(int(DUR / BEAT)):
        t_sec = beat * BEAT
        idx = int(t_sec * SR)

        # Kick on 1, 2, 3, 4 (except beat 7 & 15 for fun pauses)
        if beat not in [7, 15, 23, 31]:
            end = min(TOTAL_SAMPLES, idx + len(kick))
            L[idx:end] += kick[:end-idx] * 0.85
            R[idx:end] += kick[:end-idx] * 0.85

        # Snare / Clap on beats 2 and 4
        if beat % 2 == 1:
            end = min(TOTAL_SAMPLES, idx + len(snare))
            L[idx:end] += snare[:end-idx] * 0.65
            R[idx:end] += snare[:end-idx] * 0.65
            end_c = min(TOTAL_SAMPLES, idx + len(clap))
            L[idx:end_c] += clap[:end_c-idx] * 0.4
            R[idx:end_c] += clap[:end_c-idx] * 0.4

        # Hi-hats: 16th notes
        for sixteenth in range(4):
            h_idx = idx + int(sixteenth * 0.125 * SR)
            if h_idx < TOTAL_SAMPLES:
                if sixteenth == 2:  # Off-beat open hat
                    end = min(TOTAL_SAMPLES, h_idx + len(hh_open))
                    L[h_idx:end] += hh_open[:end-h_idx] * 0.35
                    R[h_idx:end] += hh_open[:end-h_idx] * 0.45
                else:
                    vel = 0.3 if sixteenth == 0 else 0.18
                    end = min(TOTAL_SAMPLES, h_idx + len(hh_closed))
                    L[h_idx:end] += hh_closed[:end-h_idx] * vel
                    R[h_idx:end] += hh_closed[:end-h_idx] * (vel * 0.8)

    # 2. BASSLINE
    # Notes in Hz
    D2 = 73.42; F2 = 87.31; G2 = 98.00; A2 = 110.00; Bb1 = 58.27; C2 = 65.41; D3 = 146.83
    # Chord progression every 2 bars (4 seconds)
    # Bar 0-2 (0-4s): Dm
    # Bar 2-4 (4-8s): Bb
    # Bar 4-6 (8-12s): C -> G
    # Bar 6-8 (12-16s): F -> A
    # Bar 8-10 (16-20s): Dm drop!
    bass_prog = [
        # (time, freq, dur)
        # 0-4s Dm
        (0.0, D2, 0.22), (0.25, D2, 0.15), (0.5, D3, 0.2), (0.75, D2, 0.15),
        (1.0, F2, 0.22), (1.5, A2, 0.2), (2.0, D2, 0.22), (2.5, D3, 0.2),
        (3.0, F2, 0.2), (3.5, A2, 0.2),
        # 4-8s Bb
        (4.0, Bb1, 0.22), (4.25, Bb1, 0.15), (4.5, F2, 0.2), (4.75, Bb1, 0.15),
        (5.0, D2, 0.22), (5.5, F2, 0.2), (6.0, Bb1, 0.22), (6.5, F2, 0.2),
        (7.0, D2, 0.2), (7.5, C2, 0.2),
        # 8-12s C
        (8.0, C2, 0.22), (8.25, C2, 0.15), (8.5, G2, 0.2), (8.75, C2, 0.15),
        (9.0, E2:=82.41, 0.22), (9.5, G2, 0.2), (10.0, C2, 0.22), (10.5, G2, 0.2),
        (11.0, A2, 0.2), (11.5, Bb1, 0.2),
        # 12-16s F -> A
        (12.0, F2, 0.22), (12.5, C2, 0.2), (13.0, F2, 0.2), (13.5, A2, 0.2),
        (14.0, A2, 0.22), (14.5, C3:=130.81, 0.2), (15.0, A2, 0.2), (15.5, A2, 0.2),
        # 16-20s Dm Dance Finale!
        (16.0, D2, 0.2), (16.25, D3, 0.15), (16.5, D2, 0.15), (16.75, D3, 0.15),
        (17.0, F2, 0.2), (17.5, A2, 0.2), (18.0, D2, 0.2), (18.5, D3, 0.2),
        (19.0, D2, 0.2), (19.25, D3, 0.2), (19.5, D2, 0.35)
    ]

    for t_start, freq, dur in bass_prog:
        idx = int(t_start * SR)
        b_note = synth_note(freq, dur, kind='saw', cutoff=650) * 0.75
        end = min(TOTAL_SAMPLES, idx + len(b_note))
        L[idx:end] += b_note[:end-idx]
        R[idx:end] += b_note[:end-idx]

    # 3. SYNTH ARPEGGIO & CHORD STABS
    # 16th notes arpeggiator dancing in high registers
    arp_notes_dm = [293.66, 349.23, 440.00, 587.33, 523.25, 440.00, 349.23, 392.00] # D4, F4, A4, D5, C5, A4, F4, G4
    arp_notes_bb = [233.08, 293.66, 349.23, 466.16, 440.00, 349.23, 293.66, 349.23]
    arp_notes_c  = [261.63, 329.63, 392.00, 523.25, 493.88, 392.00, 329.63, 392.00]
    arp_notes_f  = [349.23, 440.00, 523.25, 698.46, 659.25, 523.25, 440.00, 523.25]

    for sixteenth in range(int(DUR / 0.125)):
        t_sec = sixteenth * 0.125
        idx = int(t_sec * SR)
        if t_sec < 4.0:
            notes = arp_notes_dm
        elif t_sec < 8.0:
            notes = arp_notes_bb
        elif t_sec < 12.0:
            notes = arp_notes_c
        elif t_sec < 16.0:
            notes = arp_notes_f
        else:
            notes = arp_notes_dm
        
        freq = notes[sixteenth % len(notes)]
        arp = synth_note(freq, 0.11, kind='square', cutoff=2400) * 0.22
        # Panning movement
        pan = 0.5 + 0.35 * np.sin(sixteenth * 0.8)
        end = min(TOTAL_SAMPLES, idx + len(arp))
        L[idx:end] += arp[:end-idx] * (1 - pan)
        R[idx:end] += arp[:end-idx] * pan

    # 4. SOUND EFFECTS
    # Laser sweep at 8.0s
    t_laser = np.linspace(0, 0.6, int(SR * 0.6), endpoint=False)
    freq_laser = 3200 * np.exp(-t_laser * 7) + 200
    laser = np.sin(2 * np.pi * np.cumsum(freq_laser) / SR) * np.exp(-t_laser * 4) * 0.5
    l_idx = int(8.0 * SR)
    l_end = min(TOTAL_SAMPLES, l_idx + len(laser))
    L[l_idx:l_end] += laser[:l_end-l_idx] * 0.3
    R[l_idx:l_end] += laser[:l_end-l_idx] * 0.8

    # Sparkle chime at 12.0s
    for i, f in enumerate([880, 1174, 1396, 1760, 2093, 2637]):
        sp_idx = int((12.0 + i * 0.08) * SR)
        sp_dur = 0.5
        t_sp = np.linspace(0, sp_dur, int(SR * sp_dur), endpoint=False)
        sp = np.sin(2 * np.pi * f * t_sp) * np.exp(-t_sp * 8) * 0.25
        end = min(TOTAL_SAMPLES, sp_idx + len(sp))
        L[sp_idx:end] += sp[:end-sp_idx]
        R[sp_idx:end] += sp[:end-sp_idx]

    # 5. MIX IN VOCALS
    voice_cues = [
        (0.3, "audio/v1.wav"),
        (4.1, "audio/v2.wav"),
        (8.1, "audio/v3.wav"),
        (12.1, "audio/v4.wav"),
        (16.1, "audio/v5.wav"),
    ]

    for start_t, vfile in voice_cues:
        if os.path.exists(vfile):
            rate, data = wavfile.read(vfile)
            if data.dtype == np.int16:
                v = data.astype(np.float32) / 32768.0
            else:
                v = data.astype(np.float32)
            if len(v.shape) > 1:
                v = v[:, 0]
            
            # Resample to 44100 if needed
            if rate != SR:
                num_out = int(len(v) * SR / rate)
                v = signal.resample(v, num_out)
            
            # Funky robot / vocoder touch: ring modulation with a carrier tone
            t_v = np.arange(len(v)) / SR
            carrier = np.sin(2 * np.pi * 140 * t_v) # 140 Hz robot tone
            v_robot = v * 0.75 + (v * carrier) * 0.45
            # Bandpass to sound crisp and punchy
            sos_v = signal.butter(4, [250, 4800], btype='bandpass', fs=SR, output='sos')
            v_clean = signal.sosfilt(sos_v, v_robot)
            v_clean = np.tanh(v_clean * 2.2) * 0.95

            idx = int(start_t * SR)
            end = min(TOTAL_SAMPLES, idx + len(v_clean))
            v_part = v_clean[:end-idx]
            L[idx:end] += v_part * 0.9
            R[idx:end] += v_part * 0.9

            # Vocal stereo echo (delay 125ms = 16th note)
            echo_idx = idx + int(0.125 * SR)
            echo_end = min(TOTAL_SAMPLES, echo_idx + len(v_clean))
            if echo_idx < TOTAL_SAMPLES:
                L[echo_idx:echo_end] += v_clean[:echo_end-echo_idx] * 0.28
                R[echo_idx:echo_end] += v_clean[:echo_end-echo_idx] * 0.38

    # Master limiter / compression
    master_L = np.tanh(L * 1.15)
    master_R = np.tanh(R * 1.15)

    # Fade out last 0.5s
    fade_len = int(0.5 * SR)
    fade = np.linspace(1, 0, fade_len)
    master_L[-fade_len:] *= fade
    master_R[-fade_len:] *= fade

    stereo = np.column_stack([master_L, master_R])
    stereo_int16 = (stereo * 32767).clip(-32768, 32767).astype(np.int16)

    out_wav = "audio/react_anthem.wav"
    wavfile.write(out_wav, SR, stereo_int16)
    print(f"Wrote {out_wav} ({len(stereo_int16) / SR:.2f} seconds)")

if __name__ == '__main__':
    build_song()
