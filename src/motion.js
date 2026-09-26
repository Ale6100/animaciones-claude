// motion.js: the motion-graphics kit. Animated graphic design (shapes, lines, type, icons) with refined easing,
// staggered entrances, lines that draw themselves, shapes that morph into each other and masked reveals. It mixes
// with everything else: use it in the `motion` look (crisp vector, no boil) or inside any other look, around or under
// hand-drawn characters. All pure functions of t, like the rest of the engine.

// ---------- easing: the signature of the style (nothing moves at a constant speed) ----------
const expoOut = x => { x = clamp(x); return x === 1 ? 1 : 1 - Math.pow(2, -10 * x); };
const expoInOut = x => { x = clamp(x); return x === 0 || x === 1 ? x : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; };
const cubicInOut = x => { x = clamp(x); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
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
