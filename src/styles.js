// styles.js: tone presets (moods) and the helpers that turn them into camera and text motion.
//
// The presets are starting points, not rules. A scene picks one per section of the song, overrides any field, mixes
// ideas from several, or adds a new mood to MOODS when the song asks for something none of these capture.
//   pace:   bars between reframes (beatCam snaps to a new framing every `pace` bars) · reframe: how far each reframe moves
//   punch:  zoom kick on each beat · shake: px on downbeats
//   drift:  slow camera wander (px) · onTwos: moodTime() holds drawings for two frames, for a snappier, hand-drawn feel
//   text:   defaults for physicalLyrics() (entry motion, exit, size, idle wave, tilt)
//   ideas:  transition ideas that tend to suit the mood (improvise freely)
const MOODS = window.MOODS = {
  energetic: { pace: 1, reframe: .08, punch: .05, shake: 6, drift: 20, onTwos: true,
    text: { motion: 'pop', exit: 'shatter', size: 120, wave: 0, tilt: .4 },
    ideas: ['camera flies through to the next place', 'zoom through a letter', 'whip pan', 'flash on the drop'] },
  narrative: { pace: 4, reframe: .03, punch: .012, shake: 0, drift: 30, onTwos: false,
    text: { motion: 'drop', exit: 'fade', size: 90, wave: 3, tilt: .2 },
    ideas: ['iris on the character', 'brush wipe', 'match cut', 'cut on action'] },
  calm: { pace: 8, reframe: 0, punch: 0, shake: 0, drift: 45, onTwos: false,
    text: { motion: 'rise', exit: 'fade', size: 95, wave: 10, tilt: .12 },
    ideas: ['slow pan that carries into the next place', 'fade through paper', 'soft brush wipe'] },
  comedy: { pace: 1, reframe: .1, punch: .015, shake: 0, drift: 0, onTwos: true,
    text: { motion: 'pop', exit: 'fade', size: 100, wave: 0, tilt: .2 },
    ideas: ['hard cut to a close-up on the punchline', 'snap zoom', 'deadpan hold after the gag', 'things pop in on the word'] },
  epic: { pace: 2, reframe: .05, punch: .03, shake: 3, drift: 25, onTwos: false,
    text: { motion: 'pop', exit: 'fall', size: 150, wave: 0, tilt: .15 },
    ideas: ['camera pulls back to reveal the world', 'flash on the peak', 'slow push into a face'] },
};

// The mood at time t from a section list [[t0, 'calm'], [t1, 'energetic', { punch: .08 }], ...]. Numeric fields
// cross-fade over `blend` seconds after each change, so a calm verse eases into an energetic chorus instead of snapping.
function moodAt(t, sections, blend = .6) {
  let i = 0; while (i + 1 < sections.length && t >= sections[i + 1][0]) i++;
  const pick = j => {
    const name = sections[j][1];
    if (!MOODS[name]) throw new Error(`moodAt: unknown mood "${name}" (add it to MOODS or use one of: ${Object.keys(MOODS).join(', ')})`);
    return { ...MOODS[name], ...(sections[j][2] || {}), name };
  };
  const cur = pick(i), k = i > 0 ? ease((t - sections[i][0]) / blend) : 1;
  if (k >= 1) return cur;
  const prev = pick(i - 1), out = { ...cur, prevPace: prev.pace, prevReframe: prev.reframe || 0, blendK: k };
  for (const f of ['punch', 'shake', 'drift', 'reframe']) out[f] = lerp(prev[f] || 0, cur[f] || 0, k);
  return out;
}

// Camera offsets for a mood, locked to the beat: a zoom kick on every beat, a shake on downbeats, a slow drift, and a
// new framing (zoom and offset) every `pace` bars that snaps in over .12 s, like a cut without leaving the shot.
// Add them to your own camera: const c = beatCam(t, mood); camBegin(cx + c.dx, cy + c.dy, zoom * c.zoom, c.rot);
function beatCam(t, mood) {
  const kick = pulse(t, 7), down = Math.exp(-frac(bpOf(t) / 4) * BEAT * 4 * 8);
  const [sx, sy] = shakeXY(t, mood.shake * down);
  const framing = (pace, r) => {
    const block = bpOf(t) / (4 * (pace || 1)), step = Math.floor(block), snap = ease(frac(block) * BEAT * 4 * (pace || 1) / .12);
    const frame = n => [(hash(n * 3.7) - .5) * 2, (hash(n * 5.3) - .5) * 2, hash(n * 7.1)], a = frame(step - 1), b = frame(step);
    return [lerp(a[0], b[0], snap) * r * 1200, lerp(a[1], b[1], snap) * r * 500, 1 + lerp(a[2], b[2], snap) * r * 2];
  };
  // right after a section change, cross-fade from the previous mood's framing so the camera doesn't jump
  let [fx, fy, fz] = framing(mood.pace, mood.reframe || 0);
  if (mood.blendK != null) { const p = framing(mood.prevPace, mood.prevReframe); fx = lerp(p[0], fx, mood.blendK); fy = lerp(p[1], fy, mood.blendK); fz = lerp(p[2], fz, mood.blendK); }
  return { zoom: fz * (1 + mood.punch * kick), dx: sx + fx + mood.drift * Math.sin(t * .4), dy: sy + fy + mood.drift * .5 * Math.sin(t * .31 + 1), rot: mood.punch * .4 * kick * (beatN(t) % 2 ? 1 : -1) };
}

// The time to draw with in this mood: held on twos (12 drawings a second) when mood.onTwos, otherwise t unchanged.
// Use it for characters and props; keep lyrics and beat-synced events on the real t.
function moodTime(t, mood) { return mood.onTwos ? onTwos(t) : t; }
