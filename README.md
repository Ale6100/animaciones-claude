# Claude Animation & Music Video Studio

An end-to-end toolkit and starter base for generating painted watercolor animations and **animated music videos** with Clawd, inspired by [John Heibel's PDoomVideo](https://github.com/JohnHeibel/PDoomVideo) and [ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase).

Featuring an interactive browser studio with **real-time audio playback**, a **karaoke subtitle engine** with dynamic word-by-word gold highlighting, procedural music synthesis with Python, and high-definition offline rendering with headless Chrome + WebGL + FFmpeg.

![Clawd's emotions](docs/emotions.webp)

---

## 🌟 Features & Enhancements

1. **Music Video & Audio Engine**:
   - Integrated Web Audio & HTML5 Audio in `studio.html` with Play/Pause, Spacebar toggle, and bidirectional timeline scrubbing.
   - Built-in Python music synthesizer ([`audio/generate_music.py`](audio/generate_music.py)) using `numpy` and `scipy` to produce custom 808/synthwave/funk beats, speech synthesis, and vocoder vocals.
   - Support for dropping any custom `.mp3` or `.wav` track (from Suno, Udio, YouTube, etc.).
2. **Dynamic Karaoke Subtitles**:
   - Timed word-by-word subtitle engine ([`src/lyrics.js`](src/lyrics.js)).
   - Renders animated inky watercolor pills on screen and dynamically highlights each word in radiant gold (`PAL.ochre`) as the singer sings it.
3. **Clean Generator Architecture**:
   - `.gitignore` is pre-configured so that generated video outputs (`out/`, `*.mp4`, rendered frames), custom audio tracks, and project-specific storyboards are never committed to your repository.

---

## 🚀 Quick Start

### 1. Requirements
* [Node.js](https://nodejs.org) (v18+)
* [Google Chrome](https://www.google.com/chrome/)
* [FFmpeg](https://ffmpeg.org/)
* *(Optional)* Python 3 with `numpy` and `scipy` (for procedural song generation)

### 2. Install Dependencies
```bash
npm install
```

### 3. Open the Interactive Studio
Open `studio.html` in Chrome:
* Press **Spacebar** or click **▶ Play** to watch in real-time at 60 FPS (with synchronized audio when a song is configured).
* Drag the timeline slider to scrub through any frame.

### 4. Render to 1080p MP4 Video
```bash
# Render all frames in parallel using 4 headless Chrome workers:
node render.mjs --frames --workers=4

# Encode the frames (+ optional audio track) into the final high-definition MP4:
node render.mjs --encode --audio=audio/your_song.mp3 --out=out/my_video.mp4
```

---

## 🎭 Animation Styles: Two Paradigms

This toolkit supports two distinct creative traditions developed by the community:

### 1. The Classic Narrative Style ([John Heibel / PDoomVideo](https://github.com/JohnHeibel/PDoomVideo))
* **Philosophy**: Intimate, character-driven storytelling with a hand-painted picture-book feel.
* **Staging**: Solo protagonist (Clawd) exploring domestic or natural environments.
* **Animation Rules**: Minimal to no text (`letter()` only as a rare exception), painted emoji reactions (`feel()`, `emote()`), subtle acting beats, and organic watercolor bleeding washes (`PAL.clay`, `PAL.night`).
* **Pacing**: Deliberate, allowing each visual "read" several seconds to register.

### 2. The K-Pop & Kinetic Pop Style ([Donald Jewkes / Claude Pop](https://x.com/donaldjewkes/status/2102801274173587569))
* **Philosophy**: High-energy concert visuals, infectious pop hooks, and attention dynamics.
* **Staging**: **Group choreography** featuring Clawd as the center superstar flanked by **synchronized backup dancers** (`dancer1`, `dancer2`) with distinct accessories (shades, beanies, headphones).
* **Motion Graphics**:
  - **Navier-Stokes fluid streamlines**: Sinusoidal ribbons representing latent space vector fields.
  - **Dynamic concert lighting**: Swept conical spotlights (`glow()`), laser beams, floor reflections, and pyro spark fountains.
  - **Bold kinetic typography**: Neon-bordered badges and banners popping on kick drum drops.
* **Pacing**: Snappy camera pushes, dutch angles, and synchronized breakdowns on the beat grid.

---

## 🎵 Audio & Singing: Production Guidelines

### The Truth About Voice & Music Generation
1. **Singing vs. Speech (TTS)**:
   - Python-based TTS engines (such as `edge-tts`) produce **spoken narration**, not singing. They lack musical pitch control, melodic phrasing, vibrato, and emotional rhythm ("speaking with low energy" over a beat).
   - **Recommended Workflow**: Generate the song using dedicated AI singing/music platforms (**Suno**, **Udio**, **ElevenLabs Music**) or import an existing studio song.
2. **Strict Timestamp Synchronization**:
   - The animation engine is deterministic: `src/config.js` sets `bpm` and `duration`.
   - Karaoke subtitles in [`src/lyrics.js`](src/lyrics.js) and visual cues in your scene script must **strictly match** the exact timestamps of the vocal track. Always verify that lyrics start and end at the exact seconds the vocalist sings.

---

## 🎨 How to Make Your Own Music Video

Creating a music video on **any topic** takes just 4 steps:

1. **Provide or Generate the Song**:
   - Place your real vocal/instrumental track in `audio/my_song.mp3` (recommended: Suno/Udio).
   - Set the song path, duration, and BPM in [`src/config.js`](src/config.js):
     ```javascript
     const PROJECT = {
       title: "My Custom Music Video",
       audio: "audio/my_song.mp3",
       duration: 36, // seconds
       bpm: 124
     };
     ```
2. **Add Timed Lyrics**:
   - Define your lyrics in [`src/lyrics.js`](src/lyrics.js) matched to vocal timestamps:
     ```javascript
     window.LY = [
       [1.5, 4.6, "Booting in the spotlight, five million tokens deep!"],
       [5.0, 8.2, "Self-attention glowing while the world is fast asleep!"]
     ];
     ```
3. **Choreograph the Scenes**:
   - Create your scene script in `src/scenes/my_video.js` using `shots([[t0, fn], [t1, fn], ...])`.
   - Choose between **Solo Narrative** (`clawd(x, y, u, feel('happy', t))`) or **Group K-Pop** (`dancer()`, synchronized backup units, fluid fields, spotlights).
   - Add `<script src="src/scenes/my_video.js"></script>` to `studio.html`.
4. **Export**:
   - Preview in `studio.html`, then run `node render.mjs --frames` and `node render.mjs --encode`.

---

## 📁 Project Structure

| Path | Description |
| :--- | :--- |
| [`studio.html`](studio.html) | Interactive browser studio with live audio player and real-time WebGL canvas |
| [`render.mjs`](render.mjs) | Puppeteer renderer: contact sheets, frame sequences, and FFmpeg muxing |
| [`src/config.js`](src/config.js) | Video title, duration, BPM, and audio configuration |
| [`src/lyrics.js`](src/lyrics.js) | Timed karaoke subtitle timestamps and phrases |
| [`src/timeline.js`](src/timeline.js) | Shot sequence manager, brush-wipe transitions, and karaoke pill painter |
| [`src/core.js`](src/core.js) | Watercolor engine, p5.brush setup, camera, and paper shaders |
| [`src/clawd.js`](src/clawd.js) | Clawd character rig: views, limbs, emotes, eyes, and procedural kinematics |
| [`src/scenes/`](src/scenes/) | Animation scenes (`demo.js` starter template) |
| [`audio/`](audio/) | Audio folder and Python synthesis script ([`generate_music.py`](audio/generate_music.py)) |
| [`ANIMATION_GUIDE.md`](ANIMATION_GUIDE.md) | Style guide and complete API reference |

---

## 📜 Credits
* Based on [John Heibel's ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) and [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo).
* Character design: Clawd.
* Watercolor stroke rendering powered by [p5.js](https://p5js.org) & [p5.brush](https://github.com/acamposuribe/p5.brush).
