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
// A wire paperclip centred at (x, y), s long, turned by rot.
function paperclip(x, y, s, rot = 0, col = '#C9CED8', key = 'clip') {
  const P = [[.12, -.3], [.12, .55], [0, .68], [-.12, .55], [-.12, -.62], [0, -.78], [.2, -.62], [.2, .72], [0, .9], [-.2, .72], [-.2, -.15]];
  const c = Math.cos(rot), sn = Math.sin(rot), pts = P.map(([px, py]) => [x + (px * c - py * sn) * s, y + (px * sn + py * c) * s]);
  boilSeed(key);
  inkLine(pts, clamp(s / 26, .6, 5), PAL.ink, 'ink', .7);
  inkLine(pts, clamp(s / 44, .4, 3), col, 'ink', .7);
}

// A half-dial gauge (green → ochre → red) whose needle sits at k (0..1; above 1 it pins and shakes); glows red near the top.
function gauge(x, y, r, k, t, key = 'gauge') {
  const arc = (r0, a0, a1, n = 14) => [...Array(n + 1)].map((_, i) => { const a = lerp(a0, a1, i / n); return [x + Math.cos(a) * r0, y + Math.sin(a) * r0]; });
  if (k > .75) glow(x, y - r * .4, r * 1.6, '#FF5A4A', (k - .75) * 2.4);
  boilSeed(key);
  paint([...arc(r * 1.1, Math.PI, TAU, 20), [x + r * 1.1, y + r * .22], [x - r * 1.1, y + r * .22]], { wash: '#3A3358', ink: PAL.ink, sw: 1.4 });
  for (const [c, a0, a1] of [[PAL.sap, Math.PI, Math.PI * 1.4], [PAL.ochre, Math.PI * 1.4, Math.PI * 1.7], ['#D9483B', Math.PI * 1.7, TAU]])
    paint([...arc(r * .96, a0, a1), ...arc(r * .6, a1, a0)], { wash: c, ink: null });
  const a = lerp(Math.PI * 1.06, Math.PI * 1.97, k) + .05 * Math.sin(t * 45) * clamp(k * 1.5 - .5);
  inkLine([[x, y], [x + Math.cos(a) * r * .92, y + Math.sin(a) * r * .92]], clamp(r / 40, 1, 4), PAL.cream, 'ink', 0);
  paint(ellPts(x, y, r * .11, r * .11, 12), { wash: PAL.cream, ink: PAL.ink, sw: 1 });
}

// A small painted chart whose line runs flat and then plunges; k 0..1 draws the plunge.
function dropChart(x, y, w, h, k, key = 'loss') {
  boilSeed(key);
  paint(rrPts(x, y, w, h, 12, 1), { wash: PAL.cream, ink: PAL.ink, sw: 1.2 });
  inkLine([[x + 34, y + 22], [x + 34, y + h - 30], [x + w - 22, y + h - 30]], 1.3, PAL.ink, 'ink', 0);
  const pts = [], n = 26;
  for (let i = 0; i <= n; i++) {
    const f = i / n, v = f < .55 ? .12 + .07 * Math.abs(Math.sin(i * 2.3)) : lerp(.14, .9, easeOut(clamp((f - .55) / .1))) + .03 * Math.sin(i * 3.1);
    if (f < .55 || f <= .55 + .45 * k) pts.push([x + 44 + f * (w - 80), y + 24 + v * (h - 64)]);
  }
  inkLine(pts, 2.4, '#D9483B', 'ink', .2);
}

// A big red push button standing on (x, y); press 0..1 sinks the dome.
function bigButton(x, y, r, press = 0, key = 'button') {
  boilSeed(key);
  paint(rrPts(x - r * 1.3, y - r * .35, r * 2.6, r * .5, 6), { wash: '#3A3358', ink: PAL.ink, sw: 1.2 });
  const h = r * (.75 - .4 * press);
  paint([...[...Array(13)].map((_, i) => { const a = Math.PI + i / 12 * Math.PI; return [x + Math.cos(a) * r, y - r * .35 + Math.sin(a) * h]; })], { wash: '#E0483B', ink: PAL.ink, sw: 1.2 });
  paint(ellPts(x - r * .35, y - r * .35 - h * .6, r * .22, r * .12, 10), { wash: '#FFB4A6', ink: null });
}

// A glowing chip-like cube that pulses on the beat. lite = no glow (use it when dozens are on screen).
function glowCube(x, y, s, rot, t, key = 'cube', a = 1, lite = false, col = '#76E0A0') {
  if (!lite) glow(x, y, s * 2.4, col, .55 * a);
  boilSeed(key);
  push(); translate(x, y); rotate(rot);
  paint(rrPts(-s / 2, -s / 2, s, s, s * .15), { wash: mixCol(mixCol(col, PAL.ink, .45), col, .5 + .5 * pulse(t)), ink: PAL.ink, sw: clamp(s / 40, .5, 1.4) });
  for (let i = -1; i <= 1; i++) inkLine([[-s * .3, i * s * .22], [s * .3, i * s * .22]], .6, '#D8FFE8', 'inkfine', 0);
  pop();
}

// A square chip used as a rocket, flame 0..1 under it.
function chipRocket(x, y, s, rot, t, flame = 1, key = 'rocket') {
  if (flame > .02) {
    glow(x, y + s * .9, s * 2.2 * flame, '#FFB24A', .8 * flame);
    boilSeed(key + 'f');
    paint([[x - s * .35, y + s * .45], [x + s * .35, y + s * .45], [x + jit(s * .12), y + s * (.9 + 1.4 * flame + .3 * pulse2(t))]], { wash: '#FFD98A', ink: null });
  }
  boilSeed(key);
  push(); translate(x, y); rotate(rot);
  for (let i = -2; i <= 2; i++) for (const sd of [-1, 1]) inkLine([[sd * s * .5, i * s * .17], [sd * s * .66, i * s * .17]], 1.2, '#C9CED8', 'ink', 0);
  paint(rrPts(-s * .5, -s * .5, s, s, s * .08), { wash: '#2E3D2E', ink: PAL.ink, sw: 1.4 });
  paint(rrPts(-s * .3, -s * .3, s * .6, s * .6, s * .05), { wash: mixCol('#3F7A3A', '#76E0A0', .4 + .4 * pulse(t)), ink: PAL.ink, sw: .8 });
  pop();
}

// A cratered painted moon with a soft glow.
function moon(x, y, r, key = 'moon') {
  glow(x, y, r * 1.8, '#FFF1C8', .35);
  boilSeed(key);
  paint(ellPts(x, y, r, r, 40), { wash: '#E8E0CC', fill: '#CFC6B4', fillOp: 140, bleed: .05, tex: .5, ink: PAL.ink, sw: 1.2 });
  for (let i = 0; i < 6; i++) paint(ellPts(x + (hash(i * 3) - .5) * r * 1.2, y + (hash(i * 5) - .5) * r * 1.2, r * (.08 + .1 * hash(i)), r * (.07 + .08 * hash(i)), 12), { wash: '#BDB39E', ink: null });
}

// A red-capped mushroom standing on (x, y), s tall.
function mushroom(x, y, s, key = 'shroom') {
  boilSeed(key);
  paint(rrPts(x - s * .18, y - s * .5, s * .36, s * .55, s * .1), { wash: PAL.cream, ink: PAL.ink, sw: .8 });
  paint([...[...Array(11)].map((_, i) => { const a = Math.PI + i / 10 * Math.PI; return [x + Math.cos(a) * s * .6, y - s * .45 + Math.sin(a) * s * .5]; })], { wash: '#E0483B', ink: PAL.ink, sw: .8 });
  for (let i = 0; i < 3; i++) paint(ellPts(x + (i - 1) * s * .28, y - s * .72 + (i === 1 ? -s * .1 : 0), s * .07, s * .06, 8), { wash: PAL.cream, ink: null });
}
// Something standing on (x, y), w wide and h tall, falling apart into loose squares that swirl around and rebuild it:
// k = 0 whole (draw the real thing instead), 1 fully scattered. cols: the squares' colours, in turn.
function disintegrate(x, y, w, h, t, k, cols, { n = 46, key = 'bits' } = {}) {
  const u = h / 9;
  boilSeed(key);
  for (let i = 0; i < n; i++) {
    const hx = x + (hash(i * 2.1) - .5) * w, hy = y - hash(i * 3.7) * h;
    const a = hash(i * 5.3) * TAU + t * (1.5 + hash(i)), R = u * (3 + 7 * hash(i * 9.1));
    const px = lerp(hx, x + Math.cos(a) * R, k), py = lerp(hy, y - h / 2 + Math.sin(a) * R * .8, k), s = u * (.5 + .4 * hash(i * 7.7));
    paint(rectPts(px - s / 2, py - s / 2, s, s), { wash: cols[i % cols.length], ink: PAL.ink, sw: .5 });
  }
}

// ---------- machine world: UI and screens (look good in the flat look) ----------
// A blinking terminal cursor block, h tall, standing on (x, y).
function termCursor(x, y, h, t, col = '#9CF06A') { if (frac(t * 1.1) < .55) { boilSeed('cursor' + x); paint(rectPts(x, y - h, h * .55, h), { wash: col, ink: null }); } }
// A desktop-style app window (title bar with three dots); k scales it in from its centre.
function uiWindow(x, y, w, h, { key = 'win', body = '#F4F6FA', bar = '#D6DAE6', title = '', k = 1 } = {}) {
  if (k <= .01) return;
  push(); translate(x + w / 2, y + h / 2); scale(k); translate(-x - w / 2, -y - h / 2);
  boilSeed(key);
  paint(rrPts(x + 10, y + 14, w, h, 14), { wash: '#000000', washOp: 60, ink: null });
  paint(rrPts(x, y, w, h, 14), { wash: body, ink: PAL.ink, sw: 1.2 });
  paint(rrPts(x, y, w, 40, 14), { wash: bar, ink: null });
  paint(rectPts(x, y + 26, w, 14), { wash: bar, ink: null });
  ['#E0483B', '#F0C25A', '#9CF06A'].forEach((c, i) => paint(ellPts(x + 24 + i * 24, y + 20, 7, 7, 12), { wash: c, ink: null }));
  if (title) letter(title, x + w / 2, y + 21, 18, '#5A5F75', { font: '18px "Courier New", monospace', ink: false });
  pop();
}
// A chat bubble with a tail on side -1 (left) or 1 (right); k pops it in from the tail.
function chatBubble(x, y, w, h, side, col, k = 1, key = 'bub') {
  if (k <= .01) return;
  push(); translate(x + (side > 0 ? w : 0), y + h); scale(backOut(k)); translate(-x - (side > 0 ? w : 0), -y - h);
  boilSeed(key);
  paint(rrPts(x, y, w, h, 26), { wash: col, ink: PAL.ink, sw: 1 });
  const tx = side > 0 ? x + w - 34 : x + 34;
  paint([[tx - 16, y + h - 6], [tx + 16, y + h - 6], [tx + side * 30, y + h + 22]], { wash: col, ink: null });
  pop();
}
// The three bouncing "typing…" dots.
function typingDots(x, y, t, col = '#8A90A8') { boilSeed('dots' + x); for (let i = 0; i < 3; i++) paint(ellPts(x + i * 26, y - 10 * Math.max(0, Math.sin(t * 9 - i * .9)), 8, 8, 12), { wash: col, ink: null }); }
// Rows of syntax-coloured code bars (no text), scrolling with `scroll`.
function codeLines(x, y, w, n, t, { col = '#C9F0FF', key = 'code', lh = 26, scroll = 0 } = {}) {
  boilSeed(key);
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(scroll), ind = [0, 1, 1, 2, 1, 0][(j * 7) % 6] * 26, len = 60 + (w - 100) * hash(j * 3.7);
    const c = [col, '#E0509C', '#F0C25A', '#9CF06A'][Math.floor(hash(j * 1.9) * 4)];
    paint(rectPts(x + ind, y + i * lh, Math.min(len, w - ind), 9), { wash: c, washOp: 200, ink: null });
  }
}
// The "I'm not a robot" checkbox; k pops it in, checkK draws the tick.
function captcha(x, y, k, checkK, key = 'captcha') {
  if (k <= .01) return;
  push(); translate(x, y); scale(backOut(k));
  boilSeed(key);
  paint(rrPts(-170, -46, 340, 92, 8), { wash: '#F9F9F9', ink: '#C9CCD6', sw: 1 });
  paint(rrPts(-150, -18, 36, 36, 4), { wash: '#FFFFFF', ink: '#9AA0B4', sw: 1.2 });
  if (checkK > 0) inkLine([[-144, 0], [-134, 10], [-116, -14]].slice(0, 2 + (checkK > .5 ? 1 : 0)), 2.4, '#1FA463', 'ink', 0);
  paint(ellPts(125, -6, 20, 20, 16), { wash: '#4A7BD9', ink: null });
  pop();
  letter("I'm not a robot", x - 10, y, 22, '#333842', { font: '22px "Courier New", monospace', ink: false, alpha: clamp(k * 2 - 1) });
}
// A loading spinner of fading dots.
function spinner(x, y, r, t, key = 'spin') { boilSeed(key); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 5; paint(ellPts(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .18, r * .18, 10), { wash: PAL.cream, washOp: 60 + 190 * frac(i / 8 - t * .8), ink: null }); } }
// A thumbs-up hand (rotate by PI for thumbs-down).
function thumb(x, y, s, rot, col, key) { push(); translate(x, y); rotate(rot); boilSeed(key); paint(rrPts(-s * .35, -s * .1, s * .7, s * .55, s * .12), { wash: col, ink: PAL.ink, sw: .8 }); paint(rrPts(-s * .12, -s * .62, s * .26, s * .6, s * .12), { wash: col, ink: PAL.ink, sw: .8 }); pop(); }
// A patch of the scene re-rendered as flat tiles with a bright scanline front (r grows it).
function pixelPatch(cx, cy, r, t, { key = 'px', cols = ['#8A6048', '#7A5540', '#94684E'], front = '#4CE0F0', s = 18 } = {}) {
  if (r < 2) return;
  boilSeed(key);
  const n = Math.ceil(r / s);
  for (let gx = -n; gx <= n; gx++) for (let gy = -n; gy <= n; gy++) {
    const d = Math.hypot(gx * s, gy * s * 1.4) + 18 * hash(gx * 7.1 + gy * 3.3);
    if (d > r) continue;
    const edge = d > r - s * 1.2, c = edge ? front : cols[Math.floor(hash(gx * 3.7 + gy * 9.1) * cols.length)];
    paint(rectPts(cx + gx * s - s / 2, cy + gy * s - s / 2, s, s), { wash: c, washOp: edge ? 170 : 255, ink: null });
  }
  for (let gx = -n; gx <= n; gx += 2) { const h = Math.sqrt(Math.max(0, r * r - (gx * s) ** 2)) / 1.4; if (h > 4) inkLine([[cx + gx * s - s / 2, cy - h], [cx + gx * s - s / 2, cy + h]], .35, front, 'inkfine', 0); }
}
// A glowing digital readout panel with a line of monospace text.
function readout(x, y, text, { col = '#9CF06A', key = 'readout', w = 500, h = 140, size = 60 } = {}) {
  boilSeed(key);
  paint(rrPts(x - w / 2, y - h / 2, w, h, 16), { wash: '#10142A', ink: col, sw: 1.6 });
  letter(text, x, y, size, col, { font: `${size}px "Courier New", monospace`, ink: false });
}
// A big LED wall: show 'wave', 'life' (Game of Life gliders) or 'gpus' (cells filling up).
function ledWall(t, x, y, w, h, show) {
  boilSeed('ledwall'); paint(rrPts(x - w / 2, y - h / 2, w, h, 14), { wash: '#06070F', ink: '#4CE0F0', sw: 1.6 });
  const n = 22, m = 10, s = w / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    let v = 0;
    if (show === 'life') { const g = (i + Math.floor(t * 6)) % 5, h2 = (j + Math.floor(t * 6)) % 5; v = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].some(([a, b]) => a === g && b === h2) ? 1 : 0; }
    else if (show === 'gpus') v = i + j * n < (t % 100) * 60 ? .9 : .08;
    else v = .5 + .5 * Math.sin(i * .6 + j * .4 - t * 6);
    if (v > .12) paint(rectPts(x - w / 2 + i * s + 3, y - h / 2 + j * (h / m) + 3, s - 6, h / m - 6), { wash: mixCol('#0F2A3A', show === 'gpus' ? '#9CF06A' : '#4CE0F0', v), ink: null });
  }
}

// ---------- desk and lab props ----------
// A rubber duck (for rubber-duck debugging).
function duck(x, y, s, key = 'duck') {
  boilSeed(key);
  paint(ellPts(x, y - s * .35, s * .6, s * .38, 20), { wash: '#F6D34A', ink: PAL.ink, sw: .9 });
  paint(ellPts(x + s * .38, y - s * .82, s * .3, s * .28, 16), { wash: '#F6D34A', ink: PAL.ink, sw: .9 });
  paint([[x + s * .62, y - s * .84], [x + s * .9, y - s * .78], [x + s * .62, y - s * .7]], { wash: '#F08A3A', ink: PAL.ink, sw: .6 });
  paint(ellPts(x + s * .44, y - s * .9, s * .05, s * .06, 8), { wash: PAL.ink, ink: null });
}
// A coffee mug with steam.
function mug(x, y, s, t, key = 'mug') {
  boilSeed(key);
  paint(rrPts(x - s * .4, y - s, s * .8, s, s * .1), { wash: PAL.cream, ink: PAL.ink, sw: 1 });
  inkLine([[x + s * .4, y - s * .75], [x + s * .65, y - s * .6], [x + s * .4, y - s * .3]], 1.4, PAL.ink, 'ink', .6);
  paint(rectPts(x - s * .4, y - s * .7, s * .8, s * .14), { wash: '#E0483B', ink: null });
  for (let i = 0; i < 2; i++) inkLine([0, 1, 2, 3].map(k => [x - s * .12 + i * s * .24 + 8 * Math.sin(t * 2 + k + i), y - s * 1.1 - k * s * .25]), .7, '#E8E0D0', 'inkfine', .6);
}
// A floppy disk (the "save" icon).
function floppy(x, y, s, key = 'floppy') {
  boilSeed(key);
  paint(rrPts(x, y - s, s, s, s * .06), { wash: '#3A4A7A', ink: PAL.ink, sw: .9 });
  paint(rectPts(x + s * .22, y - s, s * .56, s * .32), { wash: '#C9CED8', ink: null });
  paint(rectPts(x + s * .15, y - s * .5, s * .7, s * .44), { wash: PAL.cream, ink: null });
}
// A potted plant whose leaves sway.
function plant(x, y, s, t, key = 'plant') {
  boilSeed(key);
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * .45 + .05 * Math.sin(t * 1.3 + i); paint(ribbon([[x, y - s * .5], [x + Math.cos(a) * s * .6, y - s * .5 + Math.sin(a) * s * .7], [x + Math.cos(a) * s * 1.1, y - s * .5 + Math.sin(a) * s * 1.1]], s * .08, s * .22), { wash: PAL.sap, ink: PAL.ink, sw: .6 }); }
  paint(rrPts(x - s * .35, y - s * .55, s * .7, s * .55, s * .08), { wash: '#C0643E', ink: PAL.ink, sw: .9 });
}
// A sticky note with scribbled lines.
function stickyNote(x, y, s, rot, col, key) {
  boilSeed(key);
  push(); translate(x, y); rotate(rot);
  paint(rectPts(-s / 2, -s / 2, s, s), { wash: col, ink: null });
  for (let i = 0; i < 3; i++) inkLine([[-s * .35, -s * .2 + i * s * .2], [s * (.1 + .25 * hash(i + s)), -s * .2 + i * s * .2]], .6, PAL.ink, 'inkfine', 0);
  pop();
}
// A poster of a rising log-scale chart (Moore's law).
function moorePoster(x, y, w, h, key = 'moore') {
  boilSeed(key);
  paint(rectPts(x, y, w, h, 2), { wash: '#EFE6D2', ink: PAL.ink, sw: 1 });
  inkLine([[x + 24, y + 18], [x + 24, y + h - 20], [x + w - 16, y + h - 20]], 1, PAL.ink, 'inkfine', 0);
  inkLine([...Array(8)].map((_, i) => [x + 30 + i * (w - 56) / 7, y + h - 26 - i * (h - 60) / 7 + 6 * Math.sin(i * 2)]), 1.8, PAL.teal, 'ink', .3);
  for (let i = 0; i < 8; i++) paint(ellPts(x + 30 + i * (w - 56) / 7, y + h - 26 - i * (h - 60) / 7 + 6 * Math.sin(i * 2), 4, 4, 8), { wash: PAL.teal, ink: null });
}
// A poster of an attention heatmap (a bright diagonal).
function heatPoster(x, y, w, h, t, key = 'heat') {
  boilSeed(key);
  paint(rectPts(x, y, w, h, 2), { wash: '#EFE6D2', ink: PAL.ink, sw: 1 });
  const n = 7, s = (w - 30) / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = i === j ? 1 : hash(i * 13 + j * 7) * .6; paint(rectPts(x + 15 + i * s, y + 15 + j * s, s - 2, s - 2), { wash: mixCol('#F3E9C8', PAL.violet, v), ink: null }); }
}
// A server rack with blinking LEDs, standing on (x, y).
function serverRack(x, y, w, h, t, key = 'rack') {
  boilSeed(key);
  paint(rectPts(x, y - h, w, h), { wash: '#2A2C3E', ink: PAL.ink, sw: 1.1 });
  for (let i = 0; i < 9; i++) {
    const yy = y - h + 20 + i * (h - 30) / 9;
    paint(rectPts(x + 12, yy, w - 24, (h - 30) / 9 - 8), { wash: '#3A3E56', ink: null });
    for (let j = 0; j < 4; j++) if (hash(i * 7 + j + Math.floor(t * 6 + i)) > .45) paint(ellPts(x + 26 + j * 14, yy + 12, 3.5, 3.5, 8), { wash: ['#9CF06A', '#4CE0F0', '#F0C25A'][j % 3], ink: null });
  }
}
// A beach chair under an umbrella ("out of office").
function beachChair(x, y, s, key) {
  boilSeed(key);
  inkLine([[x - s * .5, y], [x + s * .3, y - s * .9]], 2, '#8A6A4A', 'ink', 0); inkLine([[x + s * .4, y], [x - s * .2, y - s * .5]], 2, '#8A6A4A', 'ink', 0);
  paint([[x - s * .4, y - s * .2], [x + s * .25, y - s * .8], [x + s * .4, y - s * .7], [x - s * .2, y - s * .1]], { wash: '#F2B84A', ink: PAL.ink, sw: .8 });
  inkLine([[x + s * .7, y], [x + s * .7, y - s * 1.6]], 1.6, '#6A5A4A', 'ink', 0);
  paint([[x + s * .1, y - s * 1.5], [x + s * .7, y - s * 1.9], [x + s * 1.3, y - s * 1.5]], { wash: '#E0483B', ink: PAL.ink, sw: .8 });
}

// ---------- set pieces ----------
// A row of candlestick-chart bars that scroll like a skyline; rise pushes the right side up.
function candles(scroll, baseY, t, { key = 'candles', n = 30, rise = 0, small = false } = {}) {
  boilSeed(key);
  for (let i = 0; i < n; i++) {
    const x = -600 + i * 120 - scroll % 120, idx = i + Math.floor(scroll / 120), up = hash(idx * 3.7) > .3;
    const trend = rise * Math.pow(Math.max(0, i - 10) / 20, 2) * 900, h = (small ? 90 + 170 * hash(idx * 1.3) : 140 + 200 * hash(idx * 1.3)) + trend, top = baseY - h;
    inkLine([[x + 30, top - 40], [x + 30, baseY + 10]], 1.4, up ? '#9CF06A' : '#E0483B', 'ink', 0);
    paint(rectPts(x + 8, top, 44, h * .7), { wash: up ? '#2F8F5A' : '#A83A3A', ink: PAL.ink, sw: .8 });
    for (let j = 0; j < 6; j++) if (hash(idx * 17 + j) > .5) paint(rectPts(x + 16 + (j % 2) * 16, top + 20 + Math.floor(j / 2) * 40, 10, 14), { wash: up ? '#9CF06A' : '#FFB0A0', ink: null });
  }
}
// A side-view locomotive on a track at angle ang, u = size unit; wheels turn with t.
function train(x, y, ang, t, u, { key = 'train' } = {}) {
  push(); translate(x, y); rotate(ang);
  boilSeed(key);
  paint(rrPts(-u * 9, -u * 5.2, u * 11, u * 3.6, u * .6), { wash: '#2C3150', ink: PAL.ink, sw: 1.2 });
  paint(rrPts(-u * 8.4, -u * 4.8, u * 6.8, u * 2.8, u * 1.3), { wash: '#3A8F6A', ink: PAL.ink, sw: 1 });
  for (let i = 0; i < 4; i++) paint(rectPts(-u * 7.8 + i * u * 1.6, -u * 4.3, u * .9, u * 1.8), { wash: '#76E0A0', ink: null });
  paint(rectPts(-u * 9, -u * 8.4, u * 3.4, u * 3.4), { wash: '#2C3150', ink: PAL.ink, sw: 1.1 });
  paint(rectPts(-u * .2, -u * 7.4, u * 1.4, u * 2.4), { wash: '#1A1D2E', ink: PAL.ink, sw: 1 });
  paint(rectPts(-u * .5, -u * 7.8, u * 2, u * .5), { wash: '#1A1D2E', ink: PAL.ink, sw: .8 });
  paint([[u * 2, -u * 1.6], [u * 3.4, -u * .4], [u * 2, -u * .4]], { wash: '#E0483B', ink: PAL.ink, sw: .8 });
  pop();
  for (const wx of [-7, -4.4, -1.8, .6]) { const c = Math.cos(ang), s = Math.sin(ang); wheel(x + wx * u * c - (-u * 1) * s, y + wx * u * s + (-u * 1) * c, u * 1.05, { rot: t * 14, key: key + 'w' + wx }); }
}
// A GPU card that unfolds into a robot: k 0 = card, 1 = robot.
function robot(x, y, s, k, t, key = 'bot') {
  // a GPU card that unfolds into a robot (k 0 = card, 1 = robot)
  boilSeed(key);
  const legs = ease(seg(k, .2, .6)), arms = ease(seg(k, .4, .8)), head = ease(seg(k, .6, 1));
  for (const sd of [-1, 1]) { paint(rectPts(x + sd * s * .3 - s * .1, y - s * .2 - s * .9 * legs, s * .2, s * .9 * legs + 4), { wash: '#3A4A7A', ink: PAL.ink, sw: .8 }); paint(rectPts(x + sd * (s * .5 + s * .5 * arms) - s * .1, y - s * 1.4 - s * .8 * legs, s * .2, s * .7 * arms + 4), { wash: '#3A4A7A', ink: PAL.ink, sw: .8 }); }
  paint(rrPts(x - s * .6, y - s * .2 - s * .9 * legs - s * .8, s * 1.2, s * .8, s * .08), { wash: '#2C3150', ink: PAL.ink, sw: 1 });
  for (let i = 0; i < 3; i++) paint(ellPts(x - s * .3 + i * s * .3, y - s * .6 - s * .9 * legs, s * .12, s * .12, 12), { wash: '#1A1D2E', ink: '#4CE0F0', sw: .6 });
  if (head > .02) { paint(rrPts(x - s * .3, y - s * 1.1 - s * .9 * legs - s * .5 * head, s * .6, s * .45 * head, s * .06), { wash: '#C9CED8', ink: PAL.ink, sw: .8 }); paint(rectPts(x - s * .22, y - s * 1.0 - s * .9 * legs - s * .4 * head, s * .44, s * .12 * head), { wash: '#E0483B', ink: null }); glow(x, y - s * .95 - s * .9 * legs - s * .35 * head, s * .5, '#E0483B', .6 * head); }
}
// A red theatre curtain; k 0 = up, 1 = down.
function curtain(k, t, key = 'curtain') {
  const y = lerp(-1200, 0, ease(k));
  boilSeed(key);
  for (let i = 0; i < 12; i++) { const x = -80 + i * 180, sway = 10 * Math.sin(t * 1.2 + i); paint([[x, y - 60], [x + 190, y - 60], [x + 190 + sway, y + 1120], [x + sway, y + 1150]], { wash: i % 2 ? '#8E1E2E' : '#A8283A', ink: '#4A0E18', sw: .8 }); }
  paint(rectPts(-100, y - 80, W + 200, 110), { wash: '#6E1422', ink: PAL.ink, sw: 1 });
  for (let i = 0; i < 20; i++) paint(ellPts(i * 100, y + 30, 50, 30, 12), { wash: '#F0C25A', ink: null });
}

// ---------- 3D ----------
// A small perspective camera for 3D worlds under 2D paint: floor at y = 0, z into the screen. c: { f (focal), h (camera
// height), hz (horizon y on screen), cx (screen centre x), x, z (camera position) }. proj3 returns [screenX, screenY, scale].
const CAM3 = { f: 900, h: 420, hz: 430, cx: 960, x: 0, z: 0 };
const proj3 = (x, y, z, c = CAM3) => { const d = Math.max(20, z - c.z); return [c.cx + c.f * (x - c.x) / d, c.hz + c.f * (c.h - y) / d, c.f / d]; };
// A 3D grid floor rushing toward the camera (speed), optionally waving, with a glow on the horizon.
function grid3(t, { c = CAM3, col = '#4CE0F0', x0 = -3000, x1 = 3000, z0 = 60, z1 = 6000, step = 300, speed = 0, key = 'grid3', wave = 0, floor = '#0A0D22' } = {}) {
  boilSeed(key);
  paint(rectPts(-3000, c.hz, W + 6000, 3000), { wash: floor, ink: null });
  const zoff = (speed * t) % step;
  for (let z = z0 - zoff + step; z < z1; z += step) {
    const pts = []; for (let x = x0; x <= x1; x += 300) { const wy = wave * Math.sin(x * .002 + z * .003 + t * 3); pts.push(proj3(x, wy, z, c).slice(0, 2)); }
    inkLine(pts, .5 + 1.4 * (1 - z / z1), col, 'inkfine', wave ? .5 : 0);
  }
  for (let x = x0; x <= x1; x += step) inkLine([proj3(x, 0, z0 + 1, c).slice(0, 2), proj3(x, 0, z1, c).slice(0, 2)], .6, col, 'inkfine', 0);
  glow(c.cx, c.hz, 700, col, .35);
}
// Rows of server racks in perspective along a 3D corridor (camera c, see proj3).
function racks3(t, c, lit = 1) {
  const rows = []; for (let z = 3900; z >= 500; z -= 340) for (const x of [-1500, -900, 900, 1500]) rows.push([x, z]);
  rows.forEach(([x, z], n) => {
    const a = proj3(x - 150, 0, z, c), b = proj3(x + 150, 620, z, c), w = b[0] - a[0], h = a[1] - b[1];
    boilSeed('rack3' + n); paint(rectPts(a[0], b[1], w, h), { wash: mixCol('#141830', '#232A50', 1 - z / 4000), ink: PAL.ink, sw: .6 });
    for (let j = 0; j < 7; j++) for (let k = 0; k < 3; k++) if (hash(n * 31 + j * 7 + k + Math.floor(t * 8 + n)) < .55 * lit) paint(ellPts(a[0] + w * (.25 + k * .25), b[1] + h * (.1 + j * .12), Math.max(1.5, w * .03), Math.max(1.5, w * .03), 6), { wash: ['#9CF06A', '#4CE0F0', '#E0509C'][(j + k) % 3], ink: null });
  });
}
