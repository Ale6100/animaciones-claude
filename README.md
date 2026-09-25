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
* Select any registered scene from the top toolbar dropdown (e.g. *The Fallen Star (Demo)* or *Claude Pop (K-Pop)*).
* Press **Spacebar** or click **▶ Play** to watch in real-time at 60 FPS (with synchronized audio when a song is configured).
* Drag the timeline slider to scrub through any frame.

### 4. Render to 1080p MP4 Video
```bash
# Render contact sheet to inspect timestamps:
node render.mjs --sheet=0.5,2.0,5.0,10.0 --scene=demo --cols=4 --out=out/check.jpg

# Render all frames in parallel using 4 headless Chrome workers:
node render.mjs --frames --scene=claude_pop --workers=4

# Encode the frames (+ audio track) into the final high-definition MP4:
node render.mjs --encode --audio=audio/claude_pop.mp3 --out=out/my_video.mp4
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

### 3. The Kinetic Typography & Continuous Camera Style
* **Philosophy**: High-velocity lyric video where typography, character interactions, and musical rhythm are unified into a single continuous visual flow.
* **Continuous Camera Flow**: Zero abrupt cuts. Seamless transitions via continuous traveling dollies (`camDolly`), orbital sweeps (`camOrbit`), multi-point waypoints (`camPath`), or infinite letter zoom-throughs (`zoomThrough`).
* **Dynamic Lyrical Typography**: Lyrics animate dynamically across the entire screen in diverse sizes, rotations, and paths (`kineticWord`, `kineticPhrase`), tightly synchronized with vocal phrasing.
* **Physical Character-Text Interaction & Reactions**: Clawd physically interacts with lyrics as platforms (`wordPlatform`, `clawdOnWord`), dodges flying text (`wordDodge`), and reacts emotionally with expressive takes and squashes.

---

## 🎵 Audio & Singing: Production Guidelines

### The Truth About Voice & Music Generation
1. **Singing vs. Speech (TTS)**:
   - Python-based TTS engines (such as `edge-tts`) produce **spoken narration**, not singing. They lack musical pitch control, melodic phrasing, vibrato, and emotional rhythm ("speaking with low energy" over a beat).
   - **Recommended Workflow**: Generate the song using dedicated AI singing/music platforms (**Suno**, **Udio**, **ElevenLabs Music**) or import an existing studio song.
2. **Strict Timestamp Synchronization**:
   - The animation engine is deterministic: `bpm` and `duration` govern all shots.
   - Karaoke subtitles and visual cues in your scene script must **strictly match** the exact timestamps of the vocal track. Always verify that lyrics start and end at the exact seconds the vocalist sings.

### 📁 Ubicación y Gestión de Archivos de Audio
1. **Ubicación canónica**: Las canciones y pistas de audio deben colocarse en la carpeta `audio/` (por ejemplo, `audio/mi_cancion.mp3`) o en la raíz del proyecto, y referenciarse en la definición de la escena (`audio: 'audio/mi_cancion.mp3'`).
2. **Aviso proactivo cuando no está presente**: Si el usuario solicita un video musical y la pista de audio especificada no existe en el disco, la IA debe indicárselo de inmediato, señalando la carpeta exacta donde debe depositar el archivo `.mp3` o `.wav` antes de continuar.
3. **Exclusión de Git y sugerencia de limpieza puntual**: Los formatos de audio (`*.mp3`, `*.wav`, `*.ogg`, `*.flac`) están excluidos en `.gitignore` para prevenir infracciones de derechos de autor (DMCA) y peso innecesario en el repositorio. En casos donde la canción sea específica o puntual para un video o prueba concreta (a diferencia de recursos o temas base del proyecto), una vez generado y exportado el video final la IA debe recordarle o sugerirle al usuario eliminar o archivar localmente dicho archivo para mantener el espacio de trabajo limpio.

---

## 🎨 How to Make Your Own Music Video

Creating a music video on **any topic** without cluttering the repository takes 3 clean steps:

1. **Provide the Audio Track**:
   - Place your real vocal/instrumental track in `audio/my_song.mp3` (recommended: Suno/Udio).

2. **Create a Self-Contained Scene File**:
   - Create your scene script in `projects/my_video.js` (or `src/scenes/my_video.js`). Because `projects/` is in `.gitignore`, your custom production files will never pollute the repository!
   - Register the scene with all its metadata, lyrics, and shots using `registerScene`:
     ```javascript
     registerScene('my_video', {
       title: "My Custom Music Video",
       duration: 36, // seconds
       bpm: 124,     // tempo
       offset: 0,    // first downbeat in seconds
       audio: "audio/my_song.mp3",
       lyrics: [
         [1.5, 4.6, "Booting in the spotlight, five million tokens deep!"],
         [5.0, 8.2, "Self-attention glowing while the world is fast asleep!"]
       ],
       shots: [
         [0, (t, lt, dur) => {
           // Shot 1 choreography
         }],
         [12.0, (t, lt, dur) => {
           // Shot 2 choreography
         }]
       ]
     });
     ```
   - Core files ([`src/config.js`](src/config.js), [`src/lyrics.js`](src/lyrics.js)) and [`studio.html`](studio.html) remain untouched, keeping the base template pristine.

3. **Preview & Export**:
   - **Interactive Studio**: Open `studio.html?script=projects/my_video.js` in Chrome to review choreography and live audio with real-time scrubbing.
   - **Render Video**:
     ```bash
     # Render frames:
     node render.mjs --frames --script=projects/my_video.js --scene=my_video --workers=4

     # Encode final MP4 with audio:
     node render.mjs --encode --audio=audio/my_song.mp3 --out=out/my_video.mp4
     ```

### 🎬 Storyboard y Dirección Creativa Adaptativa
* **Storyboard dinámico a medida ([`STORYBOARD.md`](STORYBOARD.md))**: Cada producción tiene su propio guión técnico y visual. Una canción melancólica, un himno pop enérgico o una explicación conceptual seria exigen metáforas, ritmos, movimientos de cámara y paletas totalmente distintas; nunca se reutiliza una fórmula fija.
* **Libertad e iniciativa artística**: La IA asume rol de director creativo, proponiendo giros visuales audaces, nuevos personajes, props y mecánicas originales. Ante pedidos breves o abiertos, profundiza y eleva la propuesta con criterio cinematográfico de calidad.
* **Autonomía sobre el audio**: Si el usuario no provee una pista, se genera el audio necesario (vía síntesis procedural en [`audio/generate_music.py`](audio/generate_music.py) o síntesis de voz) sincronizado con el guión.

---

## 📁 Project Structure

| Path | Description |
| :--- | :--- |
| [`studio.html`](studio.html) | Interactive browser studio with multi-scene dropdown, live audio player, and WebGL canvas |
| [`render.mjs`](render.mjs) | Puppeteer renderer: contact sheets, frame sequences, `--scene=<id>` selection, and FFmpeg muxing |
| [`src/timeline.js`](src/timeline.js) | Multi-scene registry (`registerScene`, `loadScene`), shot dispatcher, and dynamic karaoke painter |
| [`src/config.js`](src/config.js) | Default starter configuration (title, duration, BPM) |
| [`src/lyrics.js`](src/lyrics.js) | Default starter karaoke subtitles array |
| [`src/kinetic.js`](src/kinetic.js) | Kinetic typography engine, continuous camera director, and character-text interactions |
| [`src/core.js`](src/core.js) | Watercolor engine, p5.brush setup, camera, dynamic rhythm state, and paper shaders |
| [`src/clawd.js`](src/clawd.js) | Clawd character rig: views, limbs, emotes, eyes, and procedural kinematics |
| [`src/scenes/`](src/scenes/) | Built-in base starter scenes (`demo.js`, `claude_pop.js`) |
| [`projects/`](projects/) | Git-ignored directory for custom user videos and song scenes |
| [`audio/`](audio/) | Audio folder (git-ignored audio tracks) and procedural synthesis ([`generate_music.py`](audio/generate_music.py)) |
| [`ANIMATION_GUIDE.md`](ANIMATION_GUIDE.md) | Style guide and complete API reference |

---

## 📜 Credits
* Based on [John Heibel's ClaudeAnimationBase](https://github.com/JohnHeibel/ClaudeAnimationBase) and [PDoomVideo](https://github.com/JohnHeibel/PDoomVideo).
* Character design: Clawd.
* Watercolor stroke rendering powered by [p5.js](https://p5js.org) & [p5.brush](https://github.com/acamposuribe/p5.brush).
