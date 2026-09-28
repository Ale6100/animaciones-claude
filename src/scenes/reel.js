// src/scenes/reel.js: "Motion Kit Reel", 24 s of pure motion graphics at 120 BPM that runs through the compositor
// and the motion kit: transitions declared on the shots, impacts, flashes and a glitch on the hits, a HUD overlay,
// display type, marquees, echoed morphs, a particle word, a 3D point cloud and a flipping grid, with its sound
// effects generated from the same timeline (render it and the whooshes, impacts, zaps and ticks come with it).
// It's one idea, not a template.
(() => {
  const C = { bg: '#07070B', ink: '#F4F0E8', coral: '#FF5B35', blue: '#3A5BFF', lime: '#D6FF3D', violet: '#9366FF', navy: '#0A0D2C', paper: '#EEE8DB' };
  const ground = col => paint(rectPts(-100, -100, W + 200, H + 200), { wash: col, ink: null });
  const ngon = (cx, cy, r, k, rot = -Math.PI / 2) => [...Array(k)].map((_, i) => [cx + Math.cos(rot + i / k * TAU) * r, cy + Math.sin(rot + i / k * TAU) * r]);
  const closed = P => [...P, P[0]];

  // ---------- 0: intro, 0–4 ----------
  function intro(t) {
    spotBg('#16162A', C.bg);
    const cx = 960, cy = 540, charge = expoIn(seg(t, 1.4, 1.98)), col = 1 - charge;
    if (t < 2) {
      beatRings(cx, cy, t, { t1: 1.6, r1: 760, cols: [C.ink, C.coral] });
      for (let i = 0; i < 72; i++) {
        const p = expoOut(seg(t, .5 + i / 72 * .8, 1 + i / 72 * .8)), a = i / 72 * TAU + t * .4 + charge * 3, major = i % 6 === 0;
        if (p <= 0) continue;
        const r0 = (70 + (i % 3) * 14) * col, len = (major ? 420 : i % 2 ? 140 : 250) * p * col;
        inkLine([[cx + Math.cos(a) * r0, cy + Math.sin(a) * r0], [cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len)]], major ? 1.3 : .5, major ? C.coral : withAlpha(C.ink, .45), 'ink', 0);
      }
      const r = 18 * backOut(seg(t, 0, .4)) * (1 + .4 * pulse(t, 12)) + charge * 46;
      paint(ellPts(cx, cy, r, r, 40), { wash: C.ink, ink: null });
      label('INITIALISING KIT', 120, H - 90, t, { k: seg(t, .2, .8), decode: true, alpha: col });
      counter(W - 120, H - 90, t, .3, 1.8, { pad: 3, suffix: ' %', align: 'right', alpha: col });
      paint(rectPts(120, H - 62, (W - 240) * expoInOut(seg(t, .3, 1.8)), 2), { wash: C.coral, ink: null });
      return;
    }
    for (let i = 1; i < 16; i++) drawOn([[i * 120, 0], [i * 120, H]], t, 2 + i * .02, 2.8 + i * .02, { sw: .3, col: withAlpha(C.ink, .08), off: [3.5, 3.9] });
    burstLines(cx, cy, t - 2, { r0: 80, r1: 700, n: 28, sw: 1, col: C.coral, life: .8 });
    titleText('MOTION', cx, 560, t, 2.02, { size: 260, accent: [-1, C.coral], underline: C.coral, out: [3.4, 3.8] });
    const sp = lerp(40, 14, expoOut(seg(t, 2.4, 3.3)));
    label('DESIGN KIT  —  2026', cx, 700, t, { size: 30, weight: 400, spacing: sp, align: 'center', alpha: seg(t, 2.4, 2.7) * (1 - seg(t, 3.3, 3.6)) });
  }

  // ---------- 1: kinetic type, 4–8 ----------
  function type(t) {
    ground(C.bg);
    for (let r = -3; r <= 3; r++) {
      const dir = Math.abs(r) % 2 ? 1 : -1, intro = (1 - expoOut(seg(t, 4 + (r + 3) * .05, 5 + (r + 3) * .05))) * 1400 * dir;
      marquee('MOTION / DESIGN / ', 540 + r * 215, t, { size: 200, angle: -.12, speed: 380 * dir, offset: intro, outline: Math.abs(r) === 1 || Math.abs(r) === 3 ? 3 : 0, col: r === 0 ? C.coral : C.ink });
    }
    // letters sit on their own layer over everything: flush them into the frame so the haze can cover them
    flushLetters();
    haze(.82 * expoOut(seg(t, 5.8, 6.4)), C.bg);
    titleText('RHYTHM', 960, 540, t, 6, { size: 300, weight: 800, accent: [-1, C.lime], underline: C.lime });
    label('02 — KINETIC TYPE', 960, 720, t, { size: 22, align: 'center', k: seg(t, 6.4, 7), decode: true });
  }

  // ---------- 2: geometry, 8–12 ----------
  const R = 250, GX = 960, GY = 520;
  // built on first use: ellPts() draws boil jitter from p5's random(), which doesn't exist yet while scripts load
  let SHAPES = null;
  const makeShapes = () => [ellPts(GX, GY, R, R, 48), ngon(GX, GY + 40, R * 1.2, 3), ngon(GX, GY, R * 1.1, 4, Math.PI / 4), starPts(GX, GY, R * 1.15, .45, 5),
    ngon(GX, GY, R, 6), [[-1, -3], [1, -3], [1, -1], [3, -1], [3, 1], [1, 1], [1, 3], [-1, 3], [-1, 1], [-3, 1], [-3, -1], [-1, -1]].map(([x, y]) => [GX + x * R / 3, GY + y * R / 3]),
    ngon(GX, GY, R * 1.2, 4, 0), starPts(GX, GY, R * 1.1, .72, 8)];
  const SHN = ['CIRCLE', 'TRIANGLE', 'SQUARE', 'STAR', 'HEXAGON', 'CROSS', 'DIAMOND', 'BLOOM'];
  const shapeAt = tt => {
    const b = Math.max(0, (tt - 8) / BEAT), i = Math.floor(b), k = expoInOut(clamp((b - i) / .6)), a = tt * .5, c = Math.cos(a), s = Math.sin(a);
    SHAPES = SHAPES || makeShapes();
    return morphPts(SHAPES[i % 8], SHAPES[(i + 1) % 8], k, 96).map(([x, y]) => [GX + (x - GX) * c - (y - GY) * s, GY + (x - GX) * s + (y - GY) * c]);
  };
  function geo(t) {
    ground(C.navy);
    dotGrid(960, 540, 24, 14, 80, expoOut(seg(t, 8, 9)), { col: '#FFFFFF16' });
    const cols = [C.coral, C.lime, C.blue, C.violet];
    echo(t, 14, .03, (tt, a, j) => { if (j) inkLine(closed(shapeAt(tt)), .6, withAlpha(cols[j % 4], a * .9), 'ink', 0); });
    const P = shapeAt(t);
    paint(P, { wash: withAlpha(C.coral, .92), ink: C.ink, sw: .8 });
    const i = Math.floor(Math.max(0, (t - 8) / BEAT));
    label(SHN[(i + 1) % 8], 120, 540, t, { size: 26, k: seg(t, 8 + i * BEAT, 8 + i * BEAT + .25), decode: true });
    label(`${String((i % 8) + 1).padStart(2, '0')} / 08`, 120, 580, t, { size: 18, alpha: .6 });
  }

  // ---------- 3: particles, 12–16 ----------
  function particles(t) {
    ground(C.bg);
    spotBg('#1A1B3A', C.bg, { r: .9 });
    particleWord(textPoints('CLAUDE', { size: 300, weight: 800, step: 5 }), t, 960, 520, { t0: 12.1, form: 1.5, burst: 14.5, cols: [C.coral, C.blue, C.lime, C.ink, C.violet], size: 3.6 });
    glow(960, 520, 520, C.blue, .25 * seg(t, 13, 14) * (1 - seg(t, 14.5, 15.5)));
    label('5,000 PARTICLES  ·  CRAFTED IN CODE', 960, 760, t, { size: 22, align: 'center', spacing: 8, k: seg(t, 13.2, 13.9), decode: true, alpha: 1 - seg(t, 14.4, 14.7) });
  }

  // ---------- 4: generative 3D, 16–20 ----------
  const MESHES = [[16, 'sphere'], [17, 'torus'], [18, 'knot'], [19, 'wave']];
  function gen3d(t) {
    ground(C.bg);
    spotBg('#101432', C.bg, { r: .8 });
    const waveK = seg(t, 19, 19.6);
    cloud3D(t, 960, 540, { keys: MESHES, scale: 360, col: C.coral, far: C.blue, size: 4.5, lines: true,
      rx: .35 + .15 * Math.sin(t * .5) + waveK * .5, wave: (x, z, tt) => waveK * .18 * Math.sin(x * 3 + tt * 3) * Math.cos(z * 3 - tt * 2) });
    for (const [x, y, dx, dy] of [[560, 180, 1, 1], [1360, 180, -1, 1], [560, 900, 1, -1], [1360, 900, -1, -1]]) inkLine([[x, y + dy * 40], [x, y], [x + dx * 40, y]], .7, C.ink, 'ink', 0);
    let m = 0; while (m + 1 < MESHES.length && t >= MESHES[m + 1][0]) m++;
    const rows = [['MESH', MESHES[m][1].toUpperCase()], ['VERTICES', '1500'], ['ROT.Y', (t * .6 % TAU).toFixed(3)], ['PROJ', 'PERSPECTIVE f=3.2']];
    rows.forEach(([k, v], i) => { label(k, 180, 440 + i * 40, t, { size: 16, alpha: .55, k: seg(t, 16.2 + i * .1, 16.5 + i * .1) }); label(v, 330, 440 + i * 40, t, { size: 16, col: i ? C.ink : C.lime, k: seg(t, 16.3 + i * .1, 16.7 + i * .1), decode: true }); });
    label('GENERATIVE 3D', 1740, 440, t, { size: 26, align: 'right', k: seg(t, 16.3, 16.9), decode: true });
    label('NO ENGINE. JUST MATH.', 1740, 480, t, { size: 15, align: 'right', alpha: .6, k: seg(t, 16.6, 17.2) });
    for (let i = 0; i < 12; i++) { const h = 12 + 60 * Math.abs(Math.sin(bpOf(t) * Math.PI * .5 + i * .8)); paint(rectPts(1620 + i * 10, 580 - h, 5, h), { wash: i % 3 ? C.coral : C.ink, ink: null }); }
  }

  // ---------- 5: grid systems, 20–24 ----------
  const GRID = cells(16, 9, 0, 0, W, H, 'diag');
  const FACE = [C.coral, C.blue, C.lime, C.ink, C.violet];
  function motif(c, kind, fg, bg, sx) {
    const X = x => c.cx + (x - c.cx) * sx, s = c.w * .5;
    paint([[X(c.x), c.y], [X(c.x + c.w), c.y], [X(c.x + c.w), c.y + c.h], [X(c.x), c.y + c.h]], { wash: bg, ink: null });
    const P = kind === 0 ? ellPts(c.cx, c.cy, s * .7, s * .7, 28)
      : kind === 1 ? [[c.x, c.y + c.h], ...arcPts(c.x, c.y + c.h, c.w, -Math.PI / 2, 0, 14)]
      : kind === 2 ? [[c.x + 12, c.y + c.h - 12], [c.cx, c.y + 12], [c.x + c.w - 12, c.y + c.h - 12]]
      : [[c.x, c.cy - s * .25], [c.x + c.w, c.cy - s * .25], [c.x + c.w, c.cy + s * .25], [c.x, c.cy + s * .25]];
    paint(P.map(([x, y]) => [X(x), y]), { wash: fg, ink: null });
  }
  function grid(t) {
    ground(C.bg);
    for (const c of GRID) {
      const h = hash(c.i * 7.1 + c.j * 3.3), a = flip(t, 20.3 + c.d * 1.1, .5), b = flip(t, 22.1 + c.d * .8, .5);
      const back = a.back !== b.back, sx = a.k < 1 ? a.sx : b.sx;
      const fg = FACE[Math.floor(h * 5)], bg = back ? C.paper : C.bg;
      motif(c, Math.floor(hash(c.i * 1.7 + c.j * 9.1 + (back ? 5 : 0)) * 4), back ? C.bg : fg, bg, sx);
    }
    const band = expoInOut(seg(t, 22.4, 22.8)) * (1 - expoInOut(seg(t, 23.3, 23.6)));
    if (band > .01) paint(rectPts(0, 540 - 110 * band, W, 220 * band), { wash: C.bg, ink: null });
    titleText('GRID SYSTEMS', 960, 540, t, 22.5, { size: 150, accent: [-1, C.coral], out: [23.25, 23.55] });
  }

  const beats = (a, b, name, o = {}) => { const out = []; for (let t = a; t < b - 1e-6; t += .5) out.push([t, name, o]); return out; };
  registerScene('reel', {
    title: 'Motion Kit Reel (compositor + motion kit)', duration: 24, bpm: 120, offset: 0, fps: 60, look: 'motion',
    lyrics: [],
    shots: [
      [0, intro, { name: 'INTRO' }],
      [4, type, { tr: 'slices', lead: [C.coral], name: 'KINETIC TYPE' }],
      [8, geo, { tr: 'circle', lead: [C.lime, C.bg], name: 'GEOMETRY' }],
      [12, particles, { tr: 'blinds', lead: [C.violet], name: 'PARTICLES' }],
      [16, gen3d, { tr: 'tiles', lead: [C.blue], name: 'GENERATIVE 3D' }],
      [20, grid, { tr: 'wipe', angle: 90, lead: [C.coral, C.paper], name: 'GRID SYSTEMS' }],
    ],
    post: { preset: 'reel', fadeIn: .3, fadeOut: .5 },
    impacts: [2, 4, 8, [12, .7], [14.5, 1.2], 16, 20],
    flashes: [[2, .8], [14.5, .55], [20, .35]],
    glitches: [[19.75, 20.02, 1]],
    overlay: (c, t) => chromeHUD(c, t, { title: 'CLAUDE — MOTION KIT', fade: [4.2, 23.4] }),
    sfx: [
      ...beats(0, 1.6, 'blip', { note: 84, gain: .5 }), [2, 'sub'], [2, 'revcrash', { dur: .6 }],
      ...beats(8, 12, 'zap', { gain: .7 }), [14.5, 'riser', { dur: 1.6 }], [13.2, 'typing', { dur: .7, gain: .5 }],
      [16.2, 'typing', { dur: .6, gain: .5 }], ...beats(20.3, 21.5, 'tick', { gain: .6 }), ...beats(22.1, 23, 'tick', { gain: .6 }),
      [22.5, 'hit'], [23.4, 'ding', { note: 81 }],
    ],
  });
})();
