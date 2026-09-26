// fx.js: the shared library of painted building blocks (backgrounds, effects, props) that videos invented and
// promoted here so the next video can reuse them. All are pure functions of their arguments (and t).
// Before painting something new, look here; after inventing something reusable in a video, generalize it and add it
// here with a one-line entry in the Library catalog of ANIMATION_GUIDE.md.

// ---------- backgrounds ----------
// Flat colour bands from y0 to y1 (a painted gradient), extended far beyond the frame so zoomed-out cameras stay covered.
function skyBands(cols, y0, y1, key = 'sky') {
  const n = cols.length, h = (y1 - y0) / n;
  boilSeed(key);
  paint(rectPts(-3000, -3000, W + 6000, y0 + 3002), { wash: cols[0], ink: null });
  for (let i = 0; i < n; i++) paint(rectPts(-3000, y0 + i * h - 2, W + 6000, h + 4), { wash: cols[i], ink: null });
  paint(rectPts(-3000, y1, W + 6000, 3000), { wash: cols[n - 1], ink: null });
}
// A striped retro sun; the stripes (painted in the colour behind it) slide down and thicken toward the bottom.
function synthSun(x, y, r, t, { top = '#FFD98A', bottom = '#F2785C', stripe = '#7A3F8E', key = 'sun', light = 1 } = {}) {
  glow(x, y, r * 2, top, .5 * light);
  boilSeed(key);
  paint(ellPts(x, y, r, r, 44), { wash: top, fill: bottom, fillOp: 170, bleed: .06, tex: .5, border: .7, ink: null });
  for (let i = 0; i < 6; i++) {
    const dy = r * (.08 + (i + frac(t * .45)) * .16), hh = r * (.015 + .1 * dy / r);
    if (dy + hh >= r) continue;
    const ch = Math.sqrt(r * r - dy * dy);
    paint(rectPts(x - ch - 3, y + dy, 2 * ch + 6, hh), { wash: stripe, ink: null });
  }
}
// Twinkling four-point stars at stable positions.
function starField(t, n, { key = 'stars', y1 = 700, x0 = -300, x1 = W + 300, cols = [PAL.cream, '#FFD98A'] } = {}) {
  boilSeed(key);
  for (let i = 0; i < n; i++) {
    const x = lerp(x0, x1, hash(i * 3.1 + 1)), y = -300 + hash(i * 7.7 + 2) * (y1 + 300), s = 3 + hash(i * 1.3) * 7;
    paint(starPts(x, y, s * (.55 + .45 * Math.sin(t * (2 + hash(i) * 3) + i)), .34, 4), { wash: cols[i % 5 ? 0 : 1], ink: null });
  }
}
// A row of buildings that scrolls with `scroll` (parallax: pass camera x times a factor). o: { col, win, ink, S, hMin, hMax, seed, antenna, depth }
function skyline(scroll, baseY, o = {}) {
  const S = o.S || 190, key = o.key || 'city', seed = o.seed || 0;
  for (let k = Math.floor((scroll - 500) / S); k <= Math.ceil((scroll + W + 300) / S); k++) {
    boilSeed(key + k);
    const w = S * (.72 + .26 * hash(k * 5.1 + seed + 3)), h = lerp(o.hMin || 120, o.hMax || 380, hash(k * 13.7 + seed)), x = k * S - scroll;
    paint(rectPts(x, baseY - h, w, h + (o.depth ?? 900), 2), { wash: o.col || PAL.indigo, ink: o.ink || null, sw: .8 });
    if (o.win) for (let j = 0; j < 5; j++) {
      const wx = x + w * (.15 + .6 * hash(k * 3 + j)), wy = baseY - h + 26 + j * (h - 40) / 5;
      if (hash(k * 31 + j * 7 + seed) <= .5 && wy < baseY - 20) paint(rectPts(wx, wy, 13, 17), { wash: o.win, ink: null });
    }
    if (o.antenna && hash(k * 9.3 + seed) > .62) inkLine([[x + w * .5, baseY - h], [x + w * .5, baseY - h - 56]], .8, o.ink || PAL.ink, 'inkfine', 0);
  }
}
// A retro floor grid rushing toward the viewer from the horizon hy (painted lines, no 3D projection).
function gridFloor(hy, t, speed, { line = '#D9508C', floor = '#140F2E', key = 'grid', vx = W / 2 } = {}) {
  boilSeed(key);
  paint(rectPts(-3000, hy, W + 6000, 3000), { wash: floor, ink: null });
  for (let i = -12; i <= 12; i++) inkLine([[vx + i * 34, hy], [vx + i * 330, H + 200]], .9, line, 'inkfine', 0);
  for (let j = 0; j < 10; j++) { const f = frac(j / 10 + t * speed), y = hy + (H + 200 - hy) * f * f; inkLine([[-600, y], [W + 600, y]], .4 + 1.6 * f, line, 'inkfine', 0); }
}
// A soft mountain ridge (sum of sines), scrolled by `scroll`.
function ridge(baseY, amp, col, { rim = null, seed = 1, scroll = 0, key = 'ridge', x0 = -900, x1 = W + 900 } = {}) {
  boilSeed(key);
  const pts = [[x0, baseY + 2500]];
  for (let x = x0; x <= x1; x += 80) { const X = x + scroll; pts.push([x, baseY - amp * (.5 + .3 * Math.sin(X * .004 + seed) + .2 * Math.sin(X * .011 + seed * 2.3))]); }
  pts.push([x1, baseY + 2500]);
  paint(pts, { wash: col, ink: rim, sw: 1 });
}
// A three-puff cloud. watercolour = false keeps it to flat washes (much cheaper to render).
function cloud(x, y, s, col, { key = 'cloud', op = 190, watercolour = true } = {}) {
  boilSeed(key);
  const o = { wash: col, washOp: op, ink: null };
  paint(ellPts(x - s * .55, y - s * .3, s * .7, s * .5, 16), o);
  paint(ellPts(x + s * .4, y - s * .35, s * .85, s * .62, 16), o);
  paint(ellPts(x, y, s * 1.6, s * .5, 20), watercolour ? { fill: col, fillOp: op, bleed: .14, tex: .4, border: .3, ink: null } : o);
}
// Concentric rings rushing outward from (cx, cy): a light tunnel. Rm is the mouth radius (grow it to enter the tunnel).
function tunnelRings(t, cx, cy, phase, Rm, { cols = ['#D9508C', '#1E1848', '#4CC6DE', '#1E1848', '#5B3F9A', '#1E1848'], beat = 0, rim = '#4CC6DE' } = {}) {
  boilSeed('mouth');
  paint(ellPts(cx, cy, Rm, Rm * .92, 44), { wash: cols[1], ink: rim, sw: 2 });
  const N = 12, rings = [];
  for (let i = 0; i < N; i++) rings.push([frac(i / N + phase), i]);
  rings.sort((a, b) => b[0] - a[0]);
  for (const [f, i] of rings) {
    const r = Rm * f * f * f;
    if (r < 3) continue;
    boilSeed('ring' + i);
    paint(ellPts(cx, cy, r, r * .92, 40), { wash: mixCol(cols[i % cols.length], PAL.cream, i % 2 ? 0 : .25 * beat), ink: PAL.ink, sw: .4 + 1.2 * f });
  }
  glow(cx, cy, Rm * .14 + 50, PAL.cream, .9);
}

// A speech-bubble outline (an ellipse with a tail at angle `tail`), as points. It is star-shaped, so
// irisShape(speechBubblePts(...), bg) paints everything outside it: a bubble that reveals another world inside.
function speechBubblePts(cx, cy, r, tail = 2.2, n = 48) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU, d = Math.atan2(Math.sin(a - tail), Math.cos(a - tail)), k = 1 + .45 * Math.exp(-d * d / .02);
    pts.push([cx + Math.cos(a) * r * 1.38 * k, cy + Math.sin(a) * r * k]);
  }
  return pts;
}

// ---------- effects ----------
// A glowing four-point spark. lite = one glow instead of two (use it when there are dozens on screen).
function spark(x, y, r, t, { key = 'spark', col = '#FFD98A', a = 1, lite = false } = {}) {
  if (a <= .01) return;
  glow(x, y, r * 6, col, .8 * a);
  if (!lite) glow(x, y, r * 2.2, PAL.cream, .8 * a);
  boilSeed(key);
  paint(starPts(x, y, r * (1 + .2 * pulse2(t)), .3, 4, t * 1.5), { wash: PAL.cream, fill: col, fillOp: 120, bleed: .05, ink: null });
}
// A comet trail behind anything whose position is a function of time: posAt(t) → [x, y].
function trail(posAt, t, n, dt, r, col, key = 'trail') {
  boilSeed(key);
  for (let i = 1; i <= n; i++) { const [x, y] = posAt(t - i * dt), k = 1 - i / (n + 1); paint(starPts(x, y, r * k, .35, 4, i), { wash: col, ink: null }); }
}
// A firework / impact burst, `age` seconds after it fires (lasts 1.2 s).
function burst(x, y, age, r, col, key = 'burst', n = 10) {
  if (age < 0 || age > 1.2) return;
  const k = easeOut(age / .6), fade = 1 - seg(age, .45, 1.2), fall = age * age * 70;
  glow(x, y, r * 1.3 * k, col, .8 * fade);
  boilSeed(key);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + hash(i + n) * .3, r0 = r * k * .4, r1 = r * k;
    inkLine([[x + Math.cos(a) * r0, y + Math.sin(a) * r0 + fall * .6], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 + fall]], 1.8 * fade + .3, col, 'ink', 0);
    paint(starPts(x + Math.cos(a) * r1, y + Math.sin(a) * r1 + fall, 4 + 9 * fade, .4, 4), { wash: col, ink: null });
  }
}
// Falling, tumbling confetti over the whole frame.
function confetti(t, n, cols, { key = 'confetti', y0 = -100, span = H + 200 } = {}) {
  boilSeed(key);
  for (let i = 0; i < n; i++) {
    const x = hash(i * 3.3) * (W + 200) - 100 + Math.sin(t * 1.3 + i) * 50, y = y0 + frac(hash(i * 7.1) + t * (.12 + hash(i) * .14)) * span;
    const a = t * (2 + hash(i * 5) * 4) + i, c = Math.cos(a), s = Math.sin(a), w = 11, h = 6 * Math.abs(Math.cos(t * 4 + i));
    paint([[x - c * w + s * h, y - s * w - c * h], [x + c * w + s * h, y + s * w - c * h], [x + c * w - s * h, y + s * w + c * h], [x - c * w - s * h, y - s * w + c * h]], { wash: cols[i % cols.length], ink: null });
  }
}
// Sweeping stage light beams from above, with a glow where they hit the floor.
function beams(t, cols, { n = 4, oy = -80, ty = 820, a = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const ox = (i + .5) * W / n, tx = ox + Math.sin(t * 1.7 + i * 1.9) * 420, col = cols[i % cols.length];
    boilSeed('beam' + i);
    paint([[ox - 26, oy], [ox + 26, oy], [tx + 190, ty], [tx - 190, ty]], { wash: col, washOp: 40 * a, ink: null });
    glow(tx, ty, 220, col, .45 * a);
  }
}

// ---------- props ----------
// A coin facing the viewer, turned by `rot` (it rolls: rot = distance / r). spin 0..1 squashes it edge-on.
function coin(x, y, r, { rot = 0, spin = 0, key = 'coin', col = '#E8AA38' } = {}) {
  const sx = Math.max(.08, Math.abs(Math.cos(spin * Math.PI))), sw = clamp(r / 25, .6, 2.4);
  boilSeed(key);
  push(); translate(x, y); scale(sx, 1); rotate(rot);
  paint(ellPts(0, 0, r, r, 36), { wash: col, ink: PAL.ink, sw });
  paint(ellPts(0, 0, r * .8, r * .8, 32), { wash: mixCol(col, '#FFD98A', .45), ink: mixCol(col, PAL.ink, .5), sw: sw * .6 });
  paint(starPts(0, 0, r * .45, .45, 5, -Math.PI / 2), { wash: mixCol(col, PAL.clayDk, .35), ink: null });
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; inkLine([[Math.cos(a) * r * .86, Math.sin(a) * r * .86], [Math.cos(a) * r * .97, Math.sin(a) * r * .97]], sw * .4, mixCol(col, PAL.ink, .5), 'inkfine', 0); }
  paint(ellPts(-r * .35, -r * .4, r * .18, r * .1, 10, 0, -.6), { wash: '#FFF5E2', ink: null });
  pop();
}
// A tyre with a rim, turned by `rot`. spikes > 0 adds studs (for absurdly big wheels).
function wheel(x, y, r, { rot = 0, spikes = 0, key = 'wheel' } = {}) {
  const sw = clamp(r / 30, .6, 2.4);
  boilSeed(key);
  push(); translate(x, y); rotate(rot);
  if (spikes) paint(starPts(0, 0, r * 1.12, .88, spikes, 0), { wash: '#2B2233', ink: PAL.ink, sw });
  paint(ellPts(0, 0, r, r, 36), { wash: '#2E2A38', ink: PAL.ink, sw });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; inkLine([[Math.cos(a) * r * .75, Math.sin(a) * r * .75], [Math.cos(a) * r * .97, Math.sin(a) * r * .97]], sw * .7, '#4A4458', 'ink', 0); }
  paint(ellPts(0, 0, r * .55, r * .55, 28), { wash: '#B8B2C4', ink: PAL.ink, sw: sw * .8 });
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; paint(ellPts(Math.cos(a) * r * .3, Math.sin(a) * r * .3, r * .06, r * .06, 8), { wash: '#6A6478', ink: null }); }
  pop();
}
// A side-view car standing on the ground at (x, y), w long, facing right; wheels roll with `rot`.
function car(x, y, w, { col = '#4CC6DE', rot = 0, key = 'car' } = {}) {
  const r = w * .13, sw = clamp(w / 200, .7, 2.2);
  boilSeed(key);
  paint(rrPts(x - w / 2, y - r - w * .2, w, w * .22, w * .06), { wash: col, ink: PAL.ink, sw });
  paint([[x - w * .28, y - r - w * .19], [x - w * .18, y - r - w * .38], [x + w * .14, y - r - w * .38], [x + w * .26, y - r - w * .19]], { wash: col, ink: PAL.ink, sw });
  paint([[x - w * .2, y - r - w * .2], [x - w * .13, y - r - w * .33], [x + w * .12, y - r - w * .33], [x + w * .2, y - r - w * .2]], { wash: '#CFE8F2', ink: PAL.ink, sw: sw * .6 });
  wheel(x - w * .3, y - r, r, { rot, key: key + 'w1' });
  wheel(x + w * .3, y - r, r, { rot, key: key + 'w2' });
}
// A round wall clock; `turn` spins the hands (negative runs backwards).
function clock(x, y, r, turn = 0, { key = 'clock' } = {}) {
  boilSeed(key);
  paint(ellPts(x, y, r, r, 28), { wash: PAL.cream, ink: PAL.ink, sw: clamp(r / 30, .7, 2) });
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; inkLine([[x + Math.cos(a) * r * .78, y + Math.sin(a) * r * .78], [x + Math.cos(a) * r * .9, y + Math.sin(a) * r * .9]], 1, PAL.ink, 'inkfine', 0); }
  inkLine([[x, y], [x + Math.sin(turn / 12) * r * .45, y - Math.cos(turn / 12) * r * .45]], 2, PAL.ink, 'ink', 0);
  inkLine([[x, y], [x + Math.sin(turn) * r * .7, y - Math.cos(turn) * r * .7]], 1.4, PAL.ink, 'ink', 0);
}
// A street lamp standing on the ground at (x, y), h tall; lit adds a warm glow.
function lamppost(x, y, h, { lit = 0, key = 'lamp' } = {}) {
  boilSeed(key);
  inkLine([[x, y], [x, y - h], [x + h * .18, y - h * 1.02]], clamp(h / 90, 1, 3), '#3A3348', 'ink', .4);
  paint(rrPts(x + h * .12, y - h * 1.06, h * .14, h * .06, 4), { wash: '#3A3348', ink: PAL.ink, sw: 1 });
  if (lit > 0) glow(x + h * .19, y - h * .98, h * .5, '#FFC766', lit);
}
// A painted ball with a curved seam and a highlight.
function ball(x, y, r, col = '#E8AA38', { key = 'ball', rot = 0 } = {}) {
  boilSeed(key);
  paint(ellPts(x, y, r, r, 28), { wash: col, ink: PAL.ink, sw: clamp(r / 30, .6, 2) });
  inkLine([[x - r * .9 * Math.cos(rot), y - r * .9 * Math.sin(rot) - r * .2], [x, y + r * .15], [x + r * .9 * Math.cos(rot), y + r * .9 * Math.sin(rot) - r * .2]], clamp(r / 40, .5, 1.6), PAL.ink, 'inkfine', .6);
  paint(ellPts(x - r * .35, y - r * .4, r * .22, r * .14, 12, 0, -.5), { wash: mixCol(col, PAL.cream, .7), ink: null });
}

// A little synth keyboard, bottom-centre at (x, y), w wide. lit(i) 0..1 lights key i. Returns keyPos(i) for notes and props.
function synthKeys(x, y, w, { lit = () => 0, key = 'synth', body = '#3A3358', screen = '#3F8FA8', litCols = ['#4CC6DE', '#D9508C'] } = {}) {
  const h = w * .26, x0 = x - w / 2, y0 = y - h, sw = clamp(w / 380, .5, 1.6), n = 14;
  const kx0 = x0 + w * .03, kw = w * .94 / n, ky0 = y0 + h * .44, kh = h * .5;
  boilSeed(key);
  paint(rrPts(x0, y0, w, h, h * .12, 1), { wash: body, ink: PAL.ink, sw });
  paint(rectPts(x0 + w * .03, y0 + h * .08, w * .94, h * .28), { wash: mixCol(body, PAL.ink, .4), ink: null });
  paint(rectPts(x0 + w * .62, y0 + h * .13, w * .3, h * .17), { wash: screen, ink: null });
  paint(rectPts(kx0, ky0, kw * n, kh), { wash: PAL.cream, ink: PAL.ink, sw: sw * .7 });
  for (let i = 0; i < n; i++) { const L = clamp(lit(i)); if (L > .04) paint(rectPts(kx0 + i * kw, ky0, kw, kh), { wash: mixCol(PAL.cream, litCols[i % 2], L), ink: null }); }
  for (let i = 1; i < n; i++) inkLine([[kx0 + i * kw, ky0], [kx0 + i * kw, ky0 + kh]], sw * .45, PAL.ink, 'inkfine', 0);
  for (let i = 0; i < n - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) paint(rectPts(kx0 + (i + .68) * kw, ky0, kw * .64, kh * .58), { wash: PAL.ink, ink: null });
  for (let i = 0; i < n; i++) { const L = clamp(lit(i)); if (L > .25) glow(kx0 + (i + .5) * kw, ky0 + kh * .4, kw * 2.2, litCols[i % 2], L * .7); }
  return { keyPos: i => [kx0 + (i + .5) * kw, ky0 + kh * .3], top: y0, h };
}
// A hoverboard deck centred at (x, y), tilted by rot, with a thruster glow that pulses on the beat.
function hoverboard(x, y, w, rot, t, { key = 'board', deck = '#3A3358', glowCol = '#4CC6DE' } = {}) {
  glow(x, y + w * .08, w * .55, glowCol, .5 + .3 * pulse(t));
  boilSeed(key);
  push(); translate(x, y); rotate(rot);
  paint(rrPts(-w / 2, -w * .08, w, w * .12, w * .04), { wash: deck, ink: PAL.ink, sw: 1.2 });
  paint(rectPts(-w * .42, -w * .065, w * .84, w * .045), { wash: PAL.cream, ink: null });
  pop();
}
