// post.js: the compositor. After a frame is drawn it works on the finished 2D image, so it applies to every look,
// letters and lyrics included: transitions between shots, impacts on the hits of the music (a camera kick, colour
// split and flash), glitches, flashes, a persistent overlay (a HUD that stays on across cuts), vignette, animated
// grain and fades. A scene declares all of it in registerScene; every pass is a pure function of t.
//
//   shots:    [[t0, fn, { tr: 'slices', lead: ['#FF5B35'], dur: .55, name: 'TYPE' }], ...]   a transition INTO the shot
//   impacts:  [t, [t, strength], ...]                     camera kick + colour split (+ an 'impact' sound)
//   flashes:  [[t, strength, colour], ...]                full-frame light that decays
//   glitches: [[t0, t1, strength], ...]                   displaced bands and colour split (+ a 'glitch' sound)
//   post:     'reel' | { preset, grain, vignette, beat, letterbox, fadeIn, fadeOut, fadeCol, shake, zoom, rgb }
//   overlay:  (c, t) => { ... }                           drawn on the 2D canvas over every shot (see chromeHUD)

// ---------- settings ----------
const POST_PRESETS = {
  none: {},
  // the finish of a motion-graphics reel: fine moving grain, a soft vignette, a tiny zoom kick on every beat
  reel: { grain: .05, vignette: .5, beat: .005 },
  film: { grain: .075, vignette: .65 },
  clean: { vignette: .3 },
};
// How a strength-1 impact moves the frame: px of shake, zoom kick, px of colour split, and how fast it decays (1/s).
const IMPACT = { shake: 18, zoom: .035, rgb: 9, decay: 7 };

function postCfg() {
  const s = window.ACTIVE_SCENE || {};
  if (s._post && s._post.src === s.post) return s._post;
  const o = typeof s.post === 'string' ? { preset: s.post } : (s.post || {});
  const base = POST_PRESETS[o.preset || 'none'];
  if (!base) throw new Error(`post: unknown preset "${o.preset}" (one of: ${Object.keys(POST_PRESETS).join(', ')})`);
  const impacts = (s.impacts || []).map(e => Array.isArray(e) ? [e[0], e[1] ?? 1] : [e, 1]);
  s._post = { src: s.post, ...IMPACT, ...base, ...o, impacts, flashes: s.flashes || [], glitches: s.glitches || [], overlay: s.overlay || null };
  return s._post;
}
// Strength of the impacts at t (0 = none; stacked impacts add up to 1.3).
function impactAt(t, cfg = postCfg()) {
  let k = 0;
  for (const [h, a] of cfg.impacts) if (t >= h && t < h + 2) k += a * Math.exp(-(t - h) * cfg.decay);
  return Math.min(k, 1.3);
}
function glitchAt(t, cfg = postCfg()) {
  for (const [a, b, k = 1] of cfg.glitches) {
    if (t < a || t >= b) continue;
    const e = Math.min(1, (t - a) / .05, (b - t) / .05) * k, f = step(t, RENDER_FPS);
    return e * (hash(f * 13.1 + 5) > .35 ? 1 : .25);
  }
  return 0;
}

// ---------- buffers ----------
const POST_BUF = {};
function postBuf(name) {
  if (!POST_BUF[name]) { const c = document.createElement('canvas'); c.width = W; c.height = H; POST_BUF[name] = { c, x: c.getContext('2d') }; }
  return POST_BUF[name];
}
let GRAIN_PAT = null;
const VIGN = {};
function vignetteCanvas(k) {
  const key = k.toFixed(2);
  if (!VIGN[key]) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const g = x.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${k})`);
    x.fillStyle = g; x.fillRect(0, 0, W, H); VIGN[key] = c;
  }
  return VIGN[key];
}
function grainPatterns(c) {
  if (GRAIN_PAT) return GRAIN_PAT;
  const rnd = lcg(99); GRAIN_PAT = [];
  for (let k = 0; k < 4; k++) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const x = cv.getContext('2d'), im = x.createImageData(256, 256);
    for (let i = 0; i < im.data.length; i += 4) { const v = rnd() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); GRAIN_PAT.push(c.createPattern(cv, 'repeat'));
  }
  return GRAIN_PAT;
}

// ---------- transitions ----------
// Each shape builds the path that covers the frame at p (0 = nothing, 1 = all of it) on context c; o is the shot's
// options. Add your own: TRANSITIONS.name = (c, p, o) => { c.moveTo(...); ... }.
const farthest = (x, y) => Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([a, b]) => Math.hypot(a - x, b - y)));
const TRANSITIONS = {
  circle: (c, p, o) => { const [x, y] = o.at || [W / 2, H / 2]; c.arc(x, y, Math.max(.1, p * farthest(x, y)), 0, TAU); },
  diamond: (c, p, o) => { const [x, y] = o.at || [W / 2, H / 2], r = p * (farthest(x, y) * 1.42); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); },
  // slanted bands that shoot across one after another
  slices: (c, p, o) => {
    const n = o.n || 7, bh = (H + 400) / n, sk = 260;
    for (let i = 0; i < n; i++) {
      const q = clamp(p * 1.6 - (i / n) * .6), y = -200 + i * bh, x1 = -sk + q * (W + 2 * sk);
      if (q > 0) { c.moveTo(-sk * 2, y); c.lineTo(x1 + sk, y); c.lineTo(x1, y + bh + 1); c.lineTo(-sk * 2, y + bh + 1); c.closePath(); }
    }
  },
  // horizontal slats that open from their centre lines
  blinds: (c, p, o) => { const n = o.n || 9, bh = H / n; for (let i = 0; i < n; i++) { const q = clamp(p * 1.4 - (i / n) * .4); if (q > 0) c.rect(0, i * bh + bh / 2 * (1 - q), W, bh * q + 1); } },
  // a straight edge sweeping across; o.angle in degrees (0 = left to right, 90 = top to bottom)
  wipe: (c, p, o) => {
    const a = (o.angle || 0) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), ext = Math.abs(W * dx) / 2 + Math.abs(H * dy) / 2;
    const d = -ext + p * 2 * ext, far = 4000, mx = W / 2 + dx * d, my = H / 2 + dy * d;
    c.moveTo(mx - dy * far, my + dx * far); c.lineTo(mx + dy * far, my - dx * far);
    c.lineTo(mx + dy * far - dx * far, my - dx * far - dy * far); c.lineTo(mx - dy * far - dx * far, my + dx * far - dy * far); c.closePath();
  },
  // the frame splits open from the centre (o.vertical for top/bottom)
  split: (c, p, o) => o.vertical ? c.rect(0, H / 2 * (1 - p), W, H * p) : c.rect(W / 2 * (1 - p), 0, W * p, H),
  // squares that grow in a diagonal sweep
  tiles: (c, p, o) => {
    const cols = o.cols || 16, rows = Math.round(cols * 9 / 16), cw = W / cols, ch = H / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const q = clamp(p * 1.8 - ((i + j) / (cols + rows - 2)) * .8);
      if (q > 0) c.rect(i * cw + cw / 2 * (1 - q), j * ch + ch / 2 * (1 - q), cw * q + 1, ch * q + 1);
    }
  },
  // any closed shape (o.pts, around o.at) growing from nothing until it covers the frame: a logo, a star, a letter
  shape: (c, p, o) => {
    const P = o.pts, n = P.length; let cx = 0, cy = 0; for (const q of P) { cx += q[0]; cy += q[1]; } cx /= n; cy /= n;
    const [x, y] = o.at || [W / 2, H / 2], r = Math.max(...P.map(q => Math.hypot(q[0] - cx, q[1] - cy))) || 1, s = p * (o.cover || 1.3) * farthest(x, y) / r;
    P.forEach((q, i) => c[i ? 'lineTo' : 'moveTo'](x + (q[0] - cx) * s, y + (q[1] - cy) * s)); c.closePath();
  },
};
// The transition into shot i at t, or null: { i, p (0..1 through it), o (the shot's options) }.
function transitionAt(t) {
  if (window.LOOP || !SHOTS.length) return null;
  const i = shotIndex(t), o = SHOTS[i][2];
  if (!o || !o.tr || (i === 0 && !o.from)) return null;
  const p = (t - SHOTS[i][0]) / (o.dur ?? .55);
  return p >= 0 && p < 1 ? { i, p, o } : null;
}
// Mix the outgoing frame A and the incoming frame B into c. Mask transitions sweep the lead colours across first
// (each a little behind the previous) and reveal B inside the last one; 'push' slides B in and A out.
function mixTransition(c, A, B, { p, o }) {
  const e = o.ease || cubicInOut;
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  if (o.tr === 'push') {
    const k = e(p), a = (o.angle || 0) * Math.PI / 180, dx = Math.cos(a) * W, dy = Math.sin(a) * H;
    c.drawImage(A, -dx * k, -dy * k); c.drawImage(B, dx * (1 - k), dy * (1 - k)); return;
  }
  const shape = TRANSITIONS[o.tr];
  if (!shape) throw new Error(`transition: unknown tr "${o.tr}" (one of: push, ${Object.keys(TRANSITIONS).join(', ')})`);
  const lead = o.lead === null ? [] : [].concat(o.lead ?? PAL.clay), lag = o.lag ?? .3, n = lead.length;
  c.drawImage(A, 0, 0);
  for (let k = 0; k <= n; k++) {
    const q = e(clamp(p * (1 + lag * n) - lag * k));
    if (q <= 0) break;
    c.save(); c.beginPath(); shape(c, q, o); c.clip();
    if (k < n) { c.fillStyle = lead[k]; c.fillRect(0, 0, W, H); } else c.drawImage(B, 0, 0);
    c.restore();
  }
}

// ---------- the finished frame ----------
async function composeFrame(t) {
  const tr = transitionAt(t);
  if (!tr) await drawFrame(t);
  else {
    const A = postBuf('A'), B = postBuf('B');
    if (tr.i > 0) { await drawFrame(t, tr.i - 1); A.x.drawImage(outC, 0, 0); }
    else { A.x.fillStyle = tr.o.from; A.x.fillRect(0, 0, W, H); }
    await drawFrame(t, tr.i); B.x.drawImage(outC, 0, 0);
    mixTransition(outX, A.c, B.c, tr);
  }
  postPass(outX, t);
}

function postPass(c, t) {
  const cfg = postCfg(), f = step(t, RENDER_FPS), R = k => hash(f * 7.13 + k * 1.37);
  c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  const h = impactAt(t, cfg), gw = glitchAt(t, cfg);
  const zoomK = h * cfg.zoom + (cfg.beat ? cfg.beat * pulse(t, 10) : 0), sh = h * cfg.shake;
  const ab = h * cfg.rgb + gw * 28;
  if (zoomK > .0005 || sh > .3 || ab > .7) {
    const src = postBuf('P'); src.x.drawImage(outC, 0, 0);
    const dx = (R(1) - .5) * sh, dy = (R(2) - .5) * sh;
    // always zoomed in enough that the shake never shows the frame's edge
    const sc = Math.max(1 + zoomK, 1 + (Math.abs(dx) * 2 + ab * 2 + 2) / W, 1 + (Math.abs(dy) * 2 + 2) / H);
    const put = (img, ox) => { c.setTransform(sc, 0, 0, sc, W / 2 * (1 - sc) + dx + ox, H / 2 * (1 - sc) + dy); c.drawImage(img, 0, 0); };
    if (ab > .7) {
      // colour split: the frame times red and times cyan, added back side by side
      const r = postBuf('R'), q = postBuf('C');
      for (const [b, col] of [[r, '#FF0000'], [q, '#00FFFF']]) {
        b.x.globalCompositeOperation = 'copy'; b.x.drawImage(src.c, 0, 0);
        b.x.globalCompositeOperation = 'multiply'; b.x.fillStyle = col; b.x.fillRect(0, 0, W, H);
      }
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      put(r.c, -ab); c.globalCompositeOperation = 'lighter'; put(q.c, ab); c.globalCompositeOperation = 'source-over';
    } else put(src.c, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
  }
  if (gw > 0) {
    const src = postBuf('P'); src.x.drawImage(outC, 0, 0);
    const cols = cfg.glitchCols || [PAL.clay, '#3A5BFF', '#D6FF3D'];
    for (let k = 0; k < 12; k++) {
      const y = Math.floor(R(10 + k) * H), hh = 8 + R(30 + k) * 90, off = (R(50 + k) - .5) * 300 * gw;
      c.drawImage(src.c, 0, y, W, hh, off, y, W, hh);
      if (R(70 + k) > .6) { c.globalAlpha = .8; c.fillStyle = cols[k % cols.length]; c.fillRect(R(90 + k) * W, y, 40 + R(110 + k) * 300, hh * .3); c.globalAlpha = 1; }
    }
  }
  let fl = 0, flCol = '#FFFFFF';
  for (const [ht, a, col] of cfg.flashes) if (t >= ht && t < ht + 1.5) { const v = a * Math.exp(-(t - ht) * 7); if (v > fl) flCol = col || flCol; fl += v; }
  if (fl > .003) { c.globalAlpha = Math.min(1, fl); c.fillStyle = flCol; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
  if (cfg.overlay) { c.save(); cfg.overlay(c, t); c.restore(); }
  if (cfg.letterbox) { const b = H * cfg.letterbox; c.fillStyle = '#000'; c.fillRect(0, 0, W, b); c.fillRect(0, H - b, W, b); }
  if (cfg.vignette) c.drawImage(vignetteCanvas(cfg.vignette), 0, 0);
  if (cfg.grain) {
    c.globalAlpha = cfg.grain; c.fillStyle = grainPatterns(c)[f % 4];
    c.setTransform(1, 0, 0, 1, Math.floor(R(3) * 256), Math.floor(R(4) * 256)); c.fillRect(-256, -256, W + 512, H + 512);
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
  }
  const edge = Math.max(cfg.fadeIn ? 1 - seg(t, 0, cfg.fadeIn) : 0, cfg.fadeOut ? seg(t, DUR - cfg.fadeOut, DUR) : 0);
  if (edge > 0) { c.globalAlpha = edge; c.fillStyle = cfg.fadeCol || '#000'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
}

// ---------- overlay: a HUD that frames every shot ----------
// Draw it from a scene's overlay: overlay: (c, t) => chromeHUD(c, t, { title: 'CLAUDE — REEL' }). Shows the title,
// a timecode, the current shot's name (its `name` option), a beat counter and a progress bar, in 'difference' so it
// reads on any background. o: { title, fade: [t0, t1] (visible span), col, size, margin }
function chromeHUD(c, t, o = {}) {
  const [a0, a1] = o.fade || [0, DUR], a = seg(t, a0, a0 + .5) * (1 - seg(t, a1 - .5, a1));
  if (a <= 0) return;
  const m = o.margin ?? 60, size = o.size || 17, pad = n => String(n).padStart(2, '0'), fps = RENDER_FPS, fr = Math.floor(t * fps + 1e-6);
  c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'difference'; c.fillStyle = o.col || '#FFFFFF';
  c.font = `600 ${size}px ${typeFace('label')}`; c.letterSpacing = '4px'; c.textBaseline = 'middle';
  c.textAlign = 'left'; if (o.title) c.fillText(o.title, m, m - 4);
  c.textAlign = 'right'; c.fillText(`TC 00:00:${pad(Math.floor(fr / fps))}:${pad(fr % fps)}`, W - m, m - 4);
  const i = SHOTS.length ? shotIndex(t) : 0, name = shotOpts(t).name;
  c.textAlign = 'left'; if (name) c.fillText(`${pad(i + 1)} — ${name}`, m, H - m + 4);
  c.fillRect(W - m - 300, H - m + 3, 300 * clamp(t / DUR), 2);
  c.globalAlpha = a * .35; c.fillRect(W - m - 300, H - m + 3, 300, 2);
  const b = ((beatN(t) % 4) + 4) % 4;
  for (let k = 0; k < 4; k++) { c.globalAlpha = a * (k === b ? 1 : .3); c.fillRect(W - m - 300 + k * 16, H - m - 22, 10, 10); }
  c.globalAlpha = a; c.textAlign = 'right'; c.fillText(`${Math.round(BPM)} BPM`, W - m, H - m - 18);
  c.restore();
}

// ---------- sound events ----------
// What the soundtrack needs on top of the music, for tools/sfx.py (render.mjs mixes it in): every transition gets a
// whoosh peaking as it covers the frame, every impact an impact, every glitch a glitch burst (scene.sfxAuto = false
// turns these off; a shot's sfx option renames or, with false, silences its whoosh), plus the scene's own list,
// sfx: [[t, name, { gain, pan, dur, note }], ...], where t is the moment the sound lands.
window.sfxEvents = () => {
  const s = window.ACTIVE_SCENE || {}, cfg = postCfg(), ev = [];
  if (s.sfxAuto !== false) {
    for (const [t0, , o] of SHOTS) if (o && o.tr && o.sfx !== false && (t0 > 0 || o.from)) ev.push({ t: t0 + (o.dur ?? .55) * .45, name: o.sfx || 'whoosh', gain: .55, dur: Math.max(.4, (o.dur ?? .55) * 1.2) });
    for (const [t0, k] of cfg.impacts) ev.push({ t: t0, name: 'impact', gain: .8 * Math.min(1, k) });
    for (const [a, b, k = 1] of cfg.glitches) ev.push({ t: a, name: 'glitch', dur: b - a, gain: .5 * k });
  }
  for (const e of s.sfx || []) ev.push(Array.isArray(e) ? { t: e[0], name: e[1], ...(e[2] || {}) } : e);
  return ev.filter(e => e.t >= 0 && e.t < DUR + 1).sort((a, b) => a.t - b.t);
};
