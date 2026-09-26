// timeline.js: the shot list, standalone loops, and a brush-wipe transition.
//
// shots([[t0, fn], [t1, fn], ...]) registers shots in time order. Each fn(t, lt, dur) is called with t = video time,
// lt = time since the shot started, dur = the shot's length. It paints the WHOLE frame, background included, and must be
// a pure function of t: frames render in parallel and out of order, so nothing may carry over from one frame to the next.

const SHOTS = [];
function shots(list) { SHOTS.push(...list); SHOTS.sort((a, b) => a[0] - b[0]); }

// ---------- Multi-Scene Registry ----------
// Allows scenes to be self-contained modules without mutating global files.
const SCENES = window.SCENES = {};
let ACTIVE_SCENE = window.ACTIVE_SCENE = null;

window.registerScene = function(id, def) {
  SCENES[id] = { id, ...def };
  if (!ACTIVE_SCENE) {
    window.loadScene(id);
  }
};
function registerScene(id, def) { return window.registerScene(id, def); }

window.loadScene = function(id) {
  const s = SCENES[id];
  if (!s) return false;
  ACTIVE_SCENE = window.ACTIVE_SCENE = s;
  DUR = s.duration != null ? s.duration : ((typeof PROJECT !== 'undefined' && PROJECT.duration) || 11.0);
  BPM = s.bpm != null ? s.bpm : ((typeof PROJECT !== 'undefined' && PROJECT.bpm) || 120);
  BEAT = 60 / BPM;
  OFF = s.offset != null ? s.offset : ((typeof PROJECT !== 'undefined' && PROJECT.offset) || 0);
  window.LY = s.lyrics || [];
  SHOTS.length = 0;
  if (s.shots) {
    SHOTS.push(...s.shots);
    SHOTS.sort((a, b) => a[0] - b[0]);
  }
  if (typeof window.onSceneChange === 'function') {
    window.onSceneChange(s);
  }
  return true;
};
function loadScene(id) { return window.loadScene(id); }

// Word-timed lyrics (tools/sync_lyrics.py writes a script that calls this): LYRICS[id] = [{ t0, t1, words: [[t0, t1, word]] }]
const LYRICS = window.LYRICS = {};
window.registerLyrics = function(id, lines) { LYRICS[id] = lines; };

// Loudness envelopes (tools/audio_envelope.py writes a script that calls this), for audio-reactive visuals.
const ENVELOPES = window.ENVELOPES = {};
window.registerEnvelope = function(id, fps, values) { ENVELOPES[id] = { fps, values }; };
// Loudness 0..1 of envelope `id` at time t (linear between samples, 0 outside the recording).
function envelopeAt(id, t) {
  const e = ENVELOPES[id];
  if (!e) throw new Error(`envelopeAt: no envelope "${id}" (load its .env.js script before the scene)`);
  const f = t * e.fps, i = Math.floor(f);
  if (i < 0 || i >= e.values.length - 1) return 0;
  return lerp(e.values[i], e.values[i + 1], f - i);
}

// Standalone loops (model sheets, GIFs, tests), outside the main timeline: window.LOOP = LOOPS[name] swaps the whole
// frame for that function, called with loop time. Give each a length: LOOPS.x = t => { ... }; LOOPS.x.len = 4;
const LOOPS = {};

function drawWorld(t) {
  if (window.LOOP) window.LOOP(t);
  else if (!SHOTS.length) placeholder(t);
  else {
    let i = 0; while (i + 1 < SHOTS.length && t >= SHOTS[i + 1][0]) i++;
    const t0 = SHOTS[i][0], end = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : DUR;
    SHOTS[i][1](t, t - t0, end - t0);
    CAM = null;
  }
  flushLetters();
  karaoke(t);
}

// ---------- karaoke subtitle pill ----------
function karaoke(t) {
  const lyrics = window.LY || [];
  const L = lyrics.find(l => t >= l[0] && t < l[1]);
  if (!L) { KARAOKE = null; return; }
  const [a, b, txt] = L;
  outX.font = '800 44px "Shantell Sans", "Permanent Marker", cursive, sans-serif';
  const tw = outX.measureText(txt).width, grow = easeOut((t - a) / .18) * (1 - ease((t - (b - .12)) / .12));
  if (grow < .02) { KARAOKE = null; return; }
  const w = (tw + 90) * grow, x0 = 960 - w / 2, y0 = 974;
  const pts = [
    [x0 + jit(6), y0 + jit(4)],
    [x0 + w / 2, y0 - 3 + jit(3)],
    [x0 + w + jit(6), y0 + jit(4)],
    [x0 + w + 12 + jit(6), y0 + 44],
    [x0 + w + jit(6), y0 + 88 + jit(4)],
    [x0 + w / 2, y0 + 91 + jit(3)],
    [x0 + jit(6), y0 + 88 + jit(4)],
    [x0 - 12 + jit(6), y0 + 44]
  ];
  paint(pts, { wash: PAL.night || '#1b1820', washOp: 235, fill: PAL.violet || '#8964b5', fillOp: 75, tex: .7, border: .4, ink: null });
  KARAOKE = { a, b, txt, grow };
}

function placeholder(t) {
  paint(ellPts(960, 520, 520, 300, 30, 20), { fill: PAL.sky, fillOp: 90, bleed: .3, ink: null });
  clawd(960, 820, 20, feel('happy', t));
}

// ---------- whip pan ----------
// Horizontal speed streaks, for fast pans between places: p 0 → .5 covers the frame, .5 → 1 uncovers it; cut at p = .5.
// Pair it with a fast camera slide in the same direction at the end of shot A and the start of shot B.
function whip(p, dir = 1, cols = ['#4CC6DE', '#D9508C', '#5B3F9A', PAL.cream]) {
  if (p <= 0 || p >= 1) return;
  const n = 12, bh = H / n;
  push(); if (dir < 0) { translate(W, 0); scale(-1, 1); }
  for (let i = 0; i < n; i++) {
    const d = hash(i * 4.7) * .35, y = i * bh - 10;
    const q = p < .5 ? easeOut(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - .5) * 2 - d) / (1 - d)));
    const x0 = p < .5 ? -300 : lerp(-300, W + 300, q), x1 = p < .5 ? lerp(-300, W + 300, q) : W + 300;
    if (x1 - x0 < 20) continue;
    boilSeed('whip' + i);
    paint([[x0, y], [x1, y + 6], [x1 + 80, y + bh / 2 + 10], [x1, y + bh + 14], [x0, y + bh + 20]], { wash: cols[i % cols.length], ink: null });
  }
  pop();
}

// ---------- brush wipe ----------
// A transition: fat paint strokes sweep across to cover the frame (p 0 → .5), then drag off (p .5 → 1).
// Cut to the next shot at p = .5, under full cover. Call it last in both shots, in screen space (outside a camera):
//   end of shot A:   if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6);
//   start of shot B: if (lt < .3) brushWipe(.5 + lt / .6);
function brushWipe(p, cols = [PAL.clayDk, PAL.clay]) {
  if (p <= 0 || p >= 1) return;
  const [c1, c2] = cols, n = 5, bh = (H + 420) / n + 40;
  push(); translate(W / 2, H / 2); rotate(-.1); translate(-W / 2, -H / 2);
  for (let i = 0; i < n; i++) {
    const y0 = -230 + i * (H + 420) / n, d = [0, .14, .06, .18, .1][i];
    const q = p < .5 ? easeOut(clamp((p * 2 - d) / (1 - d))) : ease(clamp(((p - .5) * 2 - d) / (1 - d)));
    const x0 = p < .5 ? -300 : lerp(-300, W + 400, q), x1 = p < .5 ? lerp(-300, W + 400, q) : W + 400;
    if (x1 - x0 < 30) continue;
    const pts = [], rag = k => 40 + 50 * hash(i * 31 + k) + jit(12);
    for (let k = 0; k <= 8; k++) pts.push([lerp(x0, x1, k / 8), y0 + Math.sin(k * .9 + i) * 14 + jit(5)]);
    for (let k = 1; k < 9; k++) pts.push([x1 + rag(k) - 40, y0 + bh * k / 9]);
    for (let k = 8; k >= 0; k--) pts.push([lerp(x0, x1, k / 8), y0 + bh + Math.sin(k * .8 + i * 2) * 14 + jit(5)]);
    if (p >= .5) for (let k = 8; k > 0; k--) pts.push([x0 - rag(k + 20) + 40, y0 + bh * k / 9]);
    paint(pts, { wash: i % 2 ? c1 : c2, washOp: 255, fill: i % 2 ? c2 : c1, fillOp: 70, bleed: .05, tex: .8, border: .6, ink: null,
      hatch: { d: 44, a: 0, o: { rand: .6, gradient: .5 }, b: 'charcoal', c: i % 2 ? c2 : PAL.cream, w: .8 } });
  }
  pop();
}
