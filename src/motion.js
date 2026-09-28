// motion.js: the motion-graphics kit. Animated graphic design (shapes, lines, type, icons) with refined easing,
// staggered entrances, lines that draw themselves, shapes that morph into each other and masked reveals. It mixes
// with everything else: use it in the `motion` look (crisp vector, no boil) or inside any other look, around or under
// hand-drawn characters. All pure functions of t, like the rest of the engine.

// ---------- easing: the signature of the style (nothing moves at a constant speed) ----------
const expoOut = x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const expoInOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
const cubicInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const expoIn = x => { x = clamp(x); return x === 0 ? 0 : Math.pow(2, 10 * x - 10); };
const quartOut = x => 1 - Math.pow(1 - clamp(x), 4);
const backInOut = x => { x = clamp(x); const c = 1.70158 * 1.525; return x < .5 ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2 : (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2; };
// An After Effects / CSS style cubic-bezier easing curve: bezierEase(.2, .8, .2, 1)(x).
function bezierEase(x1, y1, x2, y2) {
  const B = (a, b, u) => 3 * a * u * (1 - u) * (1 - u) + 3 * b * u * u * (1 - u) + u * u * u;
  return x => { x = clamp(x); let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (B(x1, x2, m) < x) lo = m; else hi = m; } return B(y1, y2, (lo + hi) / 2); };
}

// ---------- timing ----------
// Progress 0..1 of item i in a cascade: item i starts gap seconds after item i - 1 and takes dur seconds.
const stagger = (t, t0, i, gap = .06, dur = .5, e = expoOut) => e(seg(t, t0 + i * gap, t0 + i * gap + dur));
// In, hold, out: 0 → 1 over [a, a + din], back to 0 over [b - dout, b].
const inOut = (t, a, b, din = .4, dout = .3, eIn = expoOut, eOut = cubicInOut) => eIn(seg(t, a, a + din)) * (1 - eOut(seg(t, b - dout, b)));

// ---------- paths ----------
function pathLength(P) { let L = 0; for (let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); return L; }
// The stretch of a polyline between fractions a and b of its length ("trim paths").
function trimPts(P, a, b) {
  const L = pathLength(P), s0 = clamp(Math.min(a, b)) * L, s1 = clamp(Math.max(a, b)) * L, out = [];
  let d = 0;
  for (let i = 1; i < P.length; i++) {
    const p = P[i - 1], q = P[i], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1e-9, at = u => [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
    if (d + l >= s0 && d <= s1) {
      if (!out.length) out.push(at(clamp((s0 - d) / l)));
      out.push(at(clamp((s1 - d) / l)));
      if (d + l > s1) break;
    }
    d += l;
  }
  return out;
}
// A line that draws itself on between t0 and t1 (and, with o.off, draws itself off from its start).
function drawOn(P, t, t0, t1, { sw = 1.2, col = PAL.cream, br = 'ink', e = expoInOut, off = null } = {}) {
  const b = e(seg(t, t0, t1)), a = off ? e(seg(t, off[0], off[1])) : 0;
  if (b - a < .002) return;
  inkLine(trimPts(P, a, b), sw, col, br, 0);
}
// n points evenly spaced along a closed shape, starting at the point closest to its top.
function resample(P, n = 64) {
  const C = [...P, P[0]], L = pathLength(C), out = [];
  for (let k = 0; k < n; k++) { const q = trimPts(C, 0, k / n); out.push(q.length ? q[q.length - 1] : C[0]); }
  let best = 0; out.forEach((p, i) => { if (p[1] < out[best][1] - 1e-6) best = i; });
  return out.slice(best).concat(out.slice(0, best));
}
// A shape halfway between two closed shapes (k 0 = A, 1 = B): circle → square → star, a button that becomes a screen.
function morphPts(A, B, k, n = 64) { const a = resample(A, n), b = resample(B, n); return a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k)]); }
// An arc of a circle from angle a0 to a1 (radians, 0 = right, clockwise), as points.
const arcPts = (cx, cy, r, a0, a1, n = 48) => [...Array(n + 1)].map((_, i) => { const a = lerp(a0, a1, i / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

// ---------- masks ----------
// Draws fn() only inside the shape pts (a masked reveal: grow the shape, slide what's inside). Works for everything
// drawn natively (the flat and motion looks, glow); watercolor paint is composited later and ignores the mask.
// Masks don't nest (an inner mask replaces the outer one): to reveal inside a shape, move what's inside instead.
// Letters (letter(), motionText, lyrics) are composited on their own layer and are never masked.
function masked(pts, fn) {
  push();
  beginClip(); beginShape(); for (const p of pts) vertex(p[0], p[1]); endShape(CLOSE); endClip();
  fn();
  pop();
}

// ---------- primitives ----------
// A progress ring: a track and an arc filled to k (0..1), starting at the top.
function arcRing(cx, cy, r, k, { sw = 2.4, col = '#4CE0F0', track = '#FFFFFF22', key = 'ring' } = {}) {
  boilSeed(key);
  inkLine(arcPts(cx, cy, r, 0, TAU), sw, track, 'ink', 0);
  if (k > .002) inkLine(arcPts(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(k)), sw, col, 'ink', 0);
}
// Lines shooting out from a centre and vanishing (a hit, a spark of attention): age in seconds since it fired.
function burstLines(cx, cy, age, { r0 = 30, r1 = 160, n = 10, sw = 1.6, col = PAL.cream, life = .5, rot = 0 } = {}) {
  if (age < 0 || age > life) return;
  const k = expoOut(age / life);
  for (let i = 0; i < n; i++) { const a = rot + i / n * TAU, p = r0 + (r1 - r0) * k, q = r0 + (r1 - r0) * expoOut(seg(age, life * .35, life)); if (p - q > 1) inkLine([[cx + Math.cos(a) * q, cy + Math.sin(a) * q], [cx + Math.cos(a) * p, cy + Math.sin(a) * p]], sw, col, 'ink', 0); }
}
// A grid of dots that pop in from the centre out (k 0..1); a classic motion-graphics texture.
function dotGrid(cx, cy, cols, rows, gap, k, { r = 4, col = '#FFFFFF55', key = 'dots' } = {}) {
  boilSeed(key);
  const maxD = Math.hypot(cols, rows) / 2;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const d = Math.hypot(i - (cols - 1) / 2, j - (rows - 1) / 2) / maxD, s = backOut(clamp(k * 1.6 - d * .6));
    if (s > .02) paint(ellPts(cx + (i - (cols - 1) / 2) * gap, cy + (j - (rows - 1) / 2) * gap, r * s, r * s, 10), { wash: col, ink: null });
  }
}
// A pill (rounded bar) that grows from its left end to width w * k.
function pillBar(x, y, w, h, k, col, key = 'pill') { if (k <= .005) return; boilSeed(key); paint(rrPts(x, y - h / 2, Math.max(h, w * clamp(k)), h, h / 2), { wash: col, ink: null }); }

// ---------- kinetic type ----------
// A word or line whose letters enter one after another: 'rise' (up from behind a mask line), 'slide', 'scale' or
// 'type' (typewriter, with a cursor). Returns the width of the text. o: { size, col, gap, dur, style, font, out: [t0, t1] }
function motionText(txt, x, y, t, t0, o = {}) {
  const size = o.size || 80, col = o.col || PAL.cream, gap = o.gap ?? .035, dur = o.dur ?? .45, style = o.style || 'rise';
  const font = o.font || `800 ${size}px "Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
  outX.save(); outX.font = font; const widths = [...txt].map(ch => outX.measureText(ch).width); outX.restore();
  const total = widths.reduce((a, b) => a + b, 0), align = o.align || 'center';
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const out = o.out ? cubicInOut(seg(t, o.out[0], o.out[1])) : 0;
  [...txt].forEach((ch, i) => {
    const k = stagger(t, t0, i, gap, dur, style === 'scale' ? backOut : expoOut), w = widths[i], lx = cx + w / 2; cx += w;
    if (style === 'type') { if (t >= t0 + i * gap && out < .5) letter(ch, lx, y, size, col, { font, ink: false }); return; }
    if (k <= .01 || out >= 1) return;
    const dy = style === 'rise' ? (1 - k) * size * .9 + out * size : 0, dx = style === 'slide' ? (1 - k) * size * 1.2 : 0;
    letter(ch, lx + dx, y + dy, size * (style === 'scale' ? k : 1), col, { font, ink: false, alpha: style === 'rise' ? clamp(k * 3) * (1 - out) : k * (1 - out) });
  });
  if (style === 'type' && frac(t * 1.6) < .55 && out < .5) { const n = clamp(Math.floor((t - t0) / gap) + 1, 0, txt.length), tx = (align === 'center' ? x - total / 2 : x) + widths.slice(0, n).reduce((a, b) => a + b, 0); paint(rectPts(tx + 6, y - size * .45, size * .08, size * .9), { wash: col, ink: null }); }
  return total;
}

// ---------- colour ----------
// col with opacity a (0..1) as an 8-digit hex, which paint() and inkLine() honour: fading copies, echoes, far layers.
const withAlpha = (col, a) => col.slice(0, 7) + Math.round(clamp(a) * 255).toString(16).padStart(2, '0');

// ---------- echoes, grids, flips ----------
// Draws fn n times, each copy dt seconds behind the previous and fainter: a motion trail of a whole drawing (a morph,
// a spin, a title). fn(tt, a, i) gets the copy's time, its opacity (1 for the newest, drawn last) and its index.
function echo(t, n, dt, fn) { for (let i = n - 1; i >= 0; i--) fn(t - i * dt, Math.pow(1 - i / n, 1.6), i); }
// The cells of a cols × rows grid over the box (x, y, w, h): { i, j, x, y, w, h, cx, cy, d }, where d (0..1) is the
// cell's place in a sweep ('diag', 'center', 'left', 'top' or 'random'): start each cell's animation at t0 + d * spread.
function cells(cols, rows, x, y, w, h, from = 'diag', seed = 0) {
  const out = [], cw = w / cols, ch = h / rows, maxR = Math.hypot((cols - 1) / 2, (rows - 1) / 2) || 1;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const d = from === 'center' ? Math.hypot(i - (cols - 1) / 2, j - (rows - 1) / 2) / maxR
      : from === 'left' ? i / Math.max(1, cols - 1) : from === 'top' ? j / Math.max(1, rows - 1)
      : from === 'random' ? hash(i * 31.7 + j * 7.3 + seed) : (i + j) / Math.max(1, cols + rows - 2);
    out.push({ i, j, x: x + i * cw, y: y + j * ch, w: cw, h: ch, cx: x + (i + .5) * cw, cy: y + (j + .5) * ch, d });
  }
  return out;
}
// A card flip starting at t0: sx is the horizontal scale to draw the card with (1 → 0 → 1), back is true once it
// has turned past edge-on (draw the other face), k the eased progress.
function flip(t, t0, dur = .5, e = expoInOut) { const k = e(seg(t, t0, t0 + dur)); return { sx: Math.max(.001, Math.abs(Math.cos(k * Math.PI))), back: k >= .5, k }; }
// Rings that burst out from (cx, cy) on every beat (or every `every` beats) and fade: a pulse that shows the tempo.
function beatRings(cx, cy, t, { every = 1, life = 2.4, r0 = 20, r1 = 700, cols = [PAL.cream, PAL.clay], sw = 1, t0 = -Infinity, t1 = Infinity } = {}) {
  const b = Math.floor(bpOf(t) / every);
  for (let k = 0; k < 16; k++) {
    const n = b - k, bt = OFF + n * every * BEAT, age = t - bt;
    if (age > life) break;
    if (age < 0 || bt < t0 || bt > t1) continue;
    const p = age / life;
    inkLine(arcPts(cx, cy, r0 + expoOut(p) * r1, 0, TAU, 72), sw * (1 - p) + .15, withAlpha(cols[((n % cols.length) + cols.length) % cols.length], (1 - p) ** 2), 'ink', 0);
  }
}

// ---------- native marks: particles and point clouds ----------
// Thousands of points or short streaks in one call, drawn natively: crisp in every look, like glow(), because
// paint() would be far too slow for them. add: true adds light instead of covering it (sparks on dark grounds).
// They follow the camera. P: [[x, y], ...]; S: [[x0, y0, x1, y1], ...].
function dots(P, { col = PAL.cream, size = 3, alpha = 1, add = false } = {}) {
  if (!P.length || alpha <= 0) return;
  flushBrush(); push();
  const c = color(col); c.setAlpha(255 * clamp(alpha)); stroke(c); strokeWeight(size); noFill(); if (add) blendMode(ADD);
  beginShape(POINTS); for (const p of P) vertex(p[0], p[1]); endShape();
  if (add) blendMode(BLEND); pop();
}
function streaks(S, { col = PAL.cream, size = 2, alpha = 1, add = false } = {}) {
  if (!S.length || alpha <= 0) return;
  flushBrush(); push();
  const c = color(col); c.setAlpha(255 * clamp(alpha)); stroke(c); strokeWeight(size); strokeCap(ROUND); noFill(); if (add) blendMode(ADD);
  beginShape(LINES); for (const s of S) { vertex(s[0], s[1]); vertex(s[2], s[3]); } endShape();
  if (add) blendMode(BLEND); pop();
}
const TEXT_PTS = {};
// Points filling a word's letters, centred on (0, 0), one every `step` px: targets for particleWord().
function textPoints(txt, { size = 300, weight = 800, face = 'display', step = 5 } = {}) {
  const font = `${weight} ${size}px ${typeFace(face)}`, key = [txt, font, step].join('|');
  if (TEXT_PTS[key]) return TEXT_PTS[key];
  const c = document.createElement('canvas'), x = c.getContext('2d'); x.font = font;
  const w = Math.ceil(x.measureText(txt).width) + 40, h = Math.ceil(size * 1.4); c.width = w; c.height = h;
  x.font = font; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(txt, 20, h / 2);
  const d = x.getImageData(0, 0, w, h).data, P = [];
  for (let yy = 0; yy < h; yy += step) for (let xx = 0; xx < w; xx += step) if (d[(yy * w + xx) * 4 + 3] > 128) P.push([xx - w / 2, yy - h / 2]);
  return (TEXT_PTS[key] = P);
}
// Particles that fly in on curved paths from a scattered cloud to form P (textPoints() or any points) around (cx, cy),
// shimmer while held, and explode outwards at `burst`, swirling into a flattened galaxy. Each draws a streak from
// where it was `trail` s before (motion blur). o: { t0, form (s to assemble), burst, blast (px), cols, size, spread,
// swirl, seed, add, trail }
function particleWord(P, t, cx, cy, o = {}) {
  const { t0 = 0, form = 1.2, burst = null, blast = 900, cols = [PAL.clay, '#3A5BFF', '#D6FF3D', PAL.cream], size = 2.6, spread = 1100, swirl = 1, seed = 1, add = true, trail = .03 } = o;
  const alpha = seg(t, t0 - .05, t0 + .3);
  if (alpha <= 0) return;
  const pos = (i, tt) => {
    const r1 = hash(i * 1.31 + seed), r2 = hash(i * 2.17 + seed * 3), r3 = hash(i * 3.71 + seed * 7), [px, py] = P[i];
    const k = expoOut(seg(tt, t0 + r3 * form * .5, t0 + form * (.5 + r3 * .5)));
    let x = lerp(cx + (r1 - .5) * spread * 2, cx + px, k) + Math.sin(k * Math.PI) * (r3 - .5) * 300 + Math.sin(tt * 2 + r1 * TAU) * 1.5 * k;
    let y = lerp(cy + (r2 - .5) * spread, cy + py, k) + Math.cos(tt * 1.7 + r2 * TAU) * 1.5 * k;
    if (burst != null && tt > burst) {
      const e = tt - burst, dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy) + expoOut(e / 1.6) * blast * (.3 + r1), a = Math.atan2(dy, dx) + e * swirl * (.2 + r2);
      x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r * .7;
    }
    return [x, y];
  };
  const byCol = cols.map(() => []);
  for (let i = 0; i < P.length; i++) {
    const a = pos(i, t - trail), b = pos(i, t);
    byCol[i % cols.length].push([a[0], a[1], b[0] + (Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]) < .5 ? .5 : 0), b[1]]);
  }
  byCol.forEach((S, k) => streaks(S, { col: cols[k], size, add, alpha }));
}

// ---------- 3D point clouds ----------
// Unit-size shapes as n points, in an order that morphs point to point: sphere, torus, knot (trefoil), helix, cube,
// wave (a flat grid: give cloud3D a wave function to make it a surface).
const SHAPE3 = {};
function shape3(name, n = 1500) {
  const key = name + n; if (SHAPE3[key]) return SHAPE3[key];
  const P = [], ga = Math.PI * (3 - Math.sqrt(5)), side = Math.ceil(Math.sqrt(n));
  for (let i = 0; i < n; i++) {
    const u = i / n, a = u * TAU;
    if (name === 'sphere') { const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y); P.push([Math.cos(i * ga) * r, y, Math.sin(i * ga) * r]); }
    else if (name === 'torus') { const b = a * 32, r = .7 + .3 * Math.cos(b); P.push([r * Math.cos(a), .3 * Math.sin(b), r * Math.sin(a)]); }
    else if (name === 'knot') { const w = a * 90; P.push([(Math.sin(a) + 2 * Math.sin(2 * a)) / 3 + .12 * Math.cos(w), (Math.cos(a) - 2 * Math.cos(2 * a)) / 3 + .12 * Math.sin(w), -Math.sin(3 * a) / 3 + .06 * Math.cos(w)]); }
    else if (name === 'helix') { const b = a * 6 + (i % 2) * Math.PI; P.push([Math.cos(b) * .6, u * 2 - 1, Math.sin(b) * .6]); }
    else if (name === 'cube') { const f = i % 6, s = f % 2 ? .7 : -.7, p = (hash(i * 1.37) * 2 - 1) * .7, q = (hash(i * 2.11 + 4) * 2 - 1) * .7; P.push(f < 2 ? [s, p, q] : f < 4 ? [p, s, q] : [p, q, s]); }
    else if (name === 'wave') P.push([(i % side) / (side - 1) * 2 - 1, 0, Math.floor(i / side) / (side - 1) * 2 - 1]);
    else throw new Error(`shape3: unknown shape "${name}" (sphere, torus, knot, helix, cube, wave)`);
  }
  return (SHAPE3[key] = P);
}
// A rotating 3D point cloud in perspective around (cx, cy). keys: [[t, shape], ...] morphs to each shape in `morph` s
// from its key time (or pts: [[x, y, z], ...] of your own, unit size). Nearer points are bigger and brighter (col),
// farther ones fade toward `far`. Returns the points it drew, unprojected.
// o: { keys, pts, n, morph, rx, ry, rz, scale (px), f (perspective, larger = flatter), col, far, size, lines, add, wave }
function cloud3D(t, cx, cy, o = {}) {
  const n = o.n || 1500, keys = o.keys || [[0, 'sphere']], scale = o.scale || 300, f = o.f || 3.2;
  let A = o.pts;
  if (!A) {
    let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
    const cur = shape3(keys[i][1], n), prev = i ? shape3(keys[i - 1][1], n) : cur, k = i ? expoInOut(seg(t, keys[i][0], keys[i][0] + (o.morph ?? .8))) : 1;
    A = cur.map((p, j) => [lerp(prev[j][0], p[0], k), lerp(prev[j][1], p[1], k), lerp(prev[j][2], p[2], k)]);
  }
  const rx = o.rx ?? .35 + .15 * Math.sin(t * .5), ry = o.ry ?? t * .6, rz = o.rz ?? 0;
  const sx = Math.sin(rx), cxr = Math.cos(rx), sy = Math.sin(ry), cyr = Math.cos(ry), sz = Math.sin(rz), czr = Math.cos(rz);
  const buckets = [[], [], [], []], lines = [];
  let last = null;
  for (const p of A) {
    const x = p[0], y = p[1] + (o.wave ? o.wave(p[0], p[2], t) : 0), z = p[2];
    const x1 = x * cyr + z * sy, z1 = -x * sy + z * cyr, y1 = y * cxr - z1 * sx, z2 = y * sx + z1 * cxr;
    const x2 = x1 * czr - y1 * sz, y2 = x1 * sz + y1 * czr, persp = f / (f + z2), X = cx + x2 * scale * persp, Y = cy + y2 * scale * persp;
    buckets[Math.min(3, Math.max(0, Math.floor((z2 + 1) * 2)))].push([X, Y]);
    if (o.lines && last) lines.push([last[0], last[1], X, Y]);
    last = [X, Y];
  }
  const col = o.col || PAL.cream, far = o.far || '#3A5BFF', size = o.size || 3, add = o.add ?? true;
  if (o.lines) streaks(lines, { col: o.lineCol || far, size: 1, alpha: .35, add });
  for (let k = 3; k >= 0; k--) dots(buckets[k], { col: mixCol(col, far, k / 3), size: size * lerp(1.3, .6, k / 3), alpha: lerp(1, .45, k / 3), add });
  return A;
}

// ---------- display type ----------
// A title the way motion designers set it: letters rise one after another from behind the baseline (masked), the
// tracking tightens as they land, an underline wipes in under them, and they leave upwards. Returns the width.
// o: { size (120), weight (700), face ('display'), col, accent: [index, colour] (-1 = the last letter), gap (.035),
//      dur (.75), track: [from, to] px of letter spacing, trackDur, underline: colour, out: [t0, t1], align, mask, rot }
function titleText(txt, x, y, t, t0, o = {}) {
  const size = o.size || 120, font = `${o.weight || 700} ${size}px ${typeFace(o.face || 'display')}`, gap = o.gap ?? .035, dur = o.dur ?? .75;
  const [tr0, tr1] = o.track || [size * .08, size * .03], sp = lerp(tr0, tr1, expoOut(seg(t, t0, t0 + (o.trackDur ?? 1.1))));
  outX.save(); outX.font = font; outX.letterSpacing = '0px'; const ws = [...txt].map(ch => outX.measureText(ch).width); outX.restore();
  const total = ws.reduce((a, b) => a + b, 0) + sp * (ws.length - 1), align = o.align || 'center';
  const x0 = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const clip = o.mask === false ? null : [x0 - size, y - size * .62, total + size * 2, size * 1.17];
  const [ai, acol] = o.accent || [null, null], acc = ai != null && ai < 0 ? ws.length + ai : ai;
  let lx = x0;
  [...txt].forEach((ch, i) => {
    const w = ws[i], cx = lx + w / 2; lx += w + sp;
    const k = expoOut(seg(t, t0 + i * gap, t0 + i * gap + dur)), q = o.out ? expoIn(seg(t, o.out[0] + i * gap * .8, o.out[1] + i * gap * .8)) : 0;
    if (k <= 0 || q >= 1 || ch === ' ') return;
    letter(ch, cx, y + (1 - k) * size * 1.15 - q * size * 1.2, size, i === acc ? acol : (o.col || PAL.cream),
      { font, ink: false, clip, rot: (1 - k) * (o.rot ?? .25), alpha: o.mask === false ? k * (1 - q) : 1 });
  });
  if (o.underline) {
    const a = expoInOut(seg(t, t0 + .25, t0 + .95)), b = o.out ? expoInOut(seg(t, o.out[0] - .1, o.out[1] - .2)) : 0;
    if (a > b) paint(rectPts(x0 + b * total, y + size * .45, (a - b) * total, Math.max(4, size * .04)), { wash: o.underline, ink: null });
  }
  return total;
}
// Small spaced caps for captions, readouts and HUDs. k (0..1) reveals it left to right; decode: true shows the next
// letters as flickering random glyphs first, like a readout decoding. o: { size (18), weight (600), spacing (4), col,
// align ('left'), k (1), decode, alpha }
function label(txt, x, y, t, o = {}) {
  const size = o.size || 18, k = o.k ?? 1, n = txt.length, shown = Math.floor(clamp(k) * n + 1e-6);
  if (k <= 0) return;
  let s = txt.slice(0, shown);
  if (o.decode && shown < n) {
    const G = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/+', f = step(t, 20);
    s += [...txt.slice(shown, Math.min(n, shown + 6))].map((c, i) => c === ' ' ? ' ' : G[Math.floor(hash(f * 3.1 + i * 7.7) * G.length)]).join('');
  }
  letter(s, x, y, size, o.col || PAL.cream, { font: `${o.weight || 600} ${size}px ${typeFace('label')}`, ink: false, spacing: o.spacing ?? 4, align: o.align || 'left', alpha: o.alpha ?? 1 });
}
// A number counting from `from` to `to` between t0 and t1: loaders, stats, scores. Returns the value shown.
// o: { from (0), to (100), pad (digits), decimals, prefix, suffix, size, weight, face ('label'), col, align, spacing, e }
function counter(x, y, t, t0, t1, o = {}) {
  const v = lerp(o.from ?? 0, o.to ?? 100, (o.e || expoInOut)(seg(t, t0, t1))), size = o.size || 20;
  const txt = (o.prefix || '') + (o.decimals ? v.toFixed(o.decimals) : String(Math.round(v)).padStart(o.pad ?? 0, '0')) + (o.suffix || '');
  letter(txt, x, y, size, o.col || PAL.cream, { font: `${o.weight || 600} ${size}px ${typeFace(o.face || 'label')}`, ink: false, spacing: o.spacing ?? 2, align: o.align || 'left', alpha: o.alpha ?? 1 });
  return v;
}
// A row of big type scrolling forever across the frame, the kinetic-poster classic; stack rows with alternating
// directions and styles to fill a frame. o: { size (200), weight (800), face, col, outline (px: hollow letters),
// speed (px/s; the sign sets the direction), angle (the row's tilt, radians, around cx, cy), offset (px), alpha }
function marquee(txt, rowY, t, o = {}) {
  const size = o.size || 200, font = `${o.weight || 800} ${size}px ${typeFace(o.face || 'display')}`, a = o.angle || 0;
  outX.save(); outX.font = font; outX.letterSpacing = '0px'; const pw = outX.measureText(txt).width + (o.gapPx ?? size * .3); outX.restore();
  const cx = o.cx ?? W / 2, cy = o.cy ?? H / 2, off = ((((o.speed ?? 300) * t + (o.offset || 0)) % pw) + pw) % pw, reach = Math.hypot(W, H) / 2 + pw, v = rowY - cy;
  for (let s = -reach - pw + off; s < reach; s += pw) {
    const u = s + pw / 2;
    letter(txt, cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a), size, o.col || PAL.cream, { font, ink: false, rot: a, outline: o.outline || 0, alpha: o.alpha ?? 1 });
  }
}

// ---------- light and depth ----------
// A background lit from a point: `inner` at (cx, cy) fading to `outer` r screen-heights away. Screen space: call it
// before camBegin(). Cached per set of arguments, so keep them fixed (move the light with glow() instead).
const SPOT_BG = {};
function spotBg(inner, outer, { cx = W / 2, cy = H / 2, r = 1.1 } = {}) {
  const key = [inner, outer, cx, cy, r].join('|');
  if (!SPOT_BG[key]) {
    const g = createGraphics(480, 270); g.pixelDensity(1);
    const c = g.drawingContext, gr = c.createRadialGradient(cx / 4, cy / 4, 0, cx / 4, cy / 4, 270 * r);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer); c.fillStyle = gr; c.fillRect(0, 0, 480, 270); SPOT_BG[key] = g;
  }
  flushBrush(); image(SPOT_BG[key], 0, 0, W, H);
}
// A veil of colour over everything drawn so far (k 0..1): pushes the background back so the focal element reads, like
// atmosphere. Draw the far layers, haze(), then the near ones; the details stay, they just stop competing.
function haze(k, col = '#0E1024') { if (k > .005) paint(rectPts(-4000, -4000, W + 8000, H + 8000), { wash: col, washOp: 255 * clamp(k), ink: null }); }

// ---------- acting ----------
// Key poses from a pose table, the way limited animation acts: each pose is reached in `snap` seconds with overshoot,
// held, and left with a small anticipation the other way just before the next one. keys: [[t, name, override], ...].
// Numbers are blended, anything else switches halfway; spread the result into the character's options.
function act(t, keys, table, { snap = .16, lead = .07, drift = .05 } = {}) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const pose = k => ({ ...(table.rest || {}), ...(table[k[1]] || {}), ...(k[2] || {}) });
  const cur = pose(keys[i]), out = { ...cur }, k = i > 0 ? backOut(clamp((t - keys[i][0]) / snap)) : 1;
  const prev = i > 0 ? pose(keys[i - 1]) : cur, next = i + 1 < keys.length ? pose(keys[i + 1]) : null;
  const pre = next ? ease(clamp(1 - (keys[i + 1][0] - t) / lead)) : 0;
  for (const f of Object.keys(cur)) {
    if (typeof cur[f] !== 'number') { if (k < .5 && prev[f] !== undefined) out[f] = prev[f]; continue; }
    const a = typeof prev[f] === 'number' ? prev[f] : cur[f];
    out[f] = lerp(a, cur[f], k) + (next && typeof next[f] === 'number' ? (cur[f] - next[f]) * .18 * pre : 0);
  }
  if (typeof out.aL === 'number') out.aL += drift * Math.sin(t * 3.1);
  if (typeof out.aR === 'number') out.aR += drift * Math.sin(t * 2.7 + 1);
  return out;
}
// Keys that change pose every `every` seconds from t0 to t1, walking through `names` in a shuffled but stable order:
// a background actor that never freezes. Mix with hand-placed keys for the moments that matter.
function beatKeys(t0, t1, names, every, seed = 0) {
  const keys = [];
  for (let i = 0, t = t0; t < t1; i++, t += every) keys.push([t, names[Math.floor(hash(i * 7.3 + seed) * names.length)]]);
  return keys;
}
