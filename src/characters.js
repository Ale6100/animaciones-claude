// characters.js: the cast beyond Clawd (src/clawd.js). Characters invented for a video that another video could use
// are promoted here; add yours with a one-line entry in the Characters list of ANIMATION_GUIDE.md.

// Nota: a living spark, a soft four-point star with a face. (x, y) is its centre, r its radius.
// o: { mood: happy|love|surprised|sad|scared|sleepy, glow 0..1 (its life: dims to grey), s (pop-in scale), sq, rot,
//      lookX, lookY, seed, key, body (lit colour), glowCol }
function nota(x, y, r, t, o = {}) {
  const g = o.glow ?? 1, mood = o.mood || 'happy', sw = clamp(r / 36, .5, 1.8), s = o.s ?? 1, glowCol = o.glowCol || '#FFD98A';
  if (s <= .01) return;
  if (g > .02) { glow(x, y, r * 4.2 * s, glowCol, .6 * g); glow(x, y, r * 1.8 * s, PAL.cream, .45 * g); }
  boilSeed('nota ' + (o.key || 0));
  push(); translate(x, y); rotate((o.rot || 0) + .1 * Math.sin(t * 2.6)); scale(s * (1 + (o.sq || 0) * .6), s * (1 - (o.sq || 0)));
  const body = mixCol('#9C90B8', o.body || '#FFD27A', g);
  paint(starPts(0, 0, r, .62, 4), { wash: body, fill: mixCol(body, PAL.cream, .6), fillOp: 120, bleed: .08, tex: .4, border: .4, ink: PAL.ink, sw, curv: .45 });
  const ex = r * .2, ey = -r * .04, lx = (o.lookX || 0) * r * .05, ly = (o.lookY || 0) * r * .05;
  const blink = frac(t * .29 + (o.seed || 0)) < .035;
  for (const side of [-1, 1]) {
    const cx = side * ex + lx, cy = ey + ly;
    if (mood === 'sleepy' || blink) inkLine([[cx - r * .07, cy], [cx + r * .07, cy + r * .015]], sw * .9, PAL.ink, 'inkfine', 0);
    else if (mood === 'happy' || mood === 'love') inkLine([[cx - r * .08, cy + r * .03], [cx, cy - r * .06], [cx + r * .08, cy + r * .03]], sw, PAL.ink, 'inkfine', .5);
    else {
      paint(ellPts(cx, cy, r * .06, r * (mood === 'surprised' ? .11 : .085), 12), { wash: PAL.ink, ink: null });
      paint(ellPts(cx - r * .02, cy - r * .035, r * .022, r * .026, 8), { wash: PAL.cream, ink: null });
      if (mood === 'sad' || mood === 'scared') inkLine([[cx - side * r * .1, cy - r * .1], [cx + side * r * .06, cy - r * .16]], sw * .8, PAL.ink, 'inkfine', 0);
    }
    paint(ellPts(side * r * .34, r * .12, r * .08, r * .045, 10), { fill: PAL.rose, fillOp: 150, bleed: .1, ink: null });
  }
  if (mood === 'surprised') paint(ellPts(0, r * .17, r * .05, r * .07, 12), { wash: PAL.ink, ink: null });
  else if (mood === 'sad' || mood === 'scared') inkLine([[-r * .08, r * .2], [0, r * .15], [r * .08, r * .2]], sw * .9, PAL.ink, 'inkfine', .5);
  else if (mood !== 'sleepy') inkLine([[-r * .09, r * .12], [0, r * .19], [r * .09, r * .12]], sw * .9, PAL.ink, 'inkfine', .5);
  pop();
  if (mood === 'love') emote('heart', x + r * .9 * s, y - r * 1.1 * s, r * .55 * s, 1, t);
}

// Pip: a round ink-blob with a glowing antenna. (x, y) is the ground point under its feet, u its size unit (~5u tall).
// o: { sq, rot, open (mouth), lookX, col, key }
function pip(x, y, u, t, o = {}) {
  const sq = o.sq || 0, blink = frac(t * .33 + .2) < .04, col = o.col || '#7ED8B4';
  boilSeed('pip ' + (o.key || 0));
  push(); translate(x, y); rotate(o.rot || 0); scale(1 + sq * .6, 1 - sq);
  for (const s of [-1, 1]) paint(ellPts(s * u * 1.1, -u * .3, u * .7, u * .35, 12), { wash: mixCol(col, PAL.ink, .35), ink: PAL.ink, sw: .9 });
  inkLine([[0, -u * 3.6], [u * .4, -u * 4.6], [u * .9, -u * 5]], 1.1, PAL.ink, 'ink', .5);
  glow(u * .9, -u * 5, u * 1.4, PAL.ochre, .7);
  paint(starPts(u * .9, -u * 5, u * .45, .45, 4, t * 2), { wash: '#FFD98A', ink: null });
  paint(ellPts(0, -u * 2, u * 2, u * 1.8, 26), { wash: col, ink: PAL.ink, sw: 1.2 });
  for (const s of [-1, 1]) {
    if (blink) inkLine([[s * u * .7 - u * .2, -u * 2.3], [s * u * .7 + u * .2, -u * 2.3]], 1, PAL.ink, 'inkfine', 0);
    else paint(ellPts(s * u * .7 + (o.lookX || 0) * u * .15, -u * 2.3, u * .2, u * .32, 12), { wash: PAL.ink, ink: null });
  }
  inkLine([[-u * .4, -u * 1.6], [0, -u * (o.open ? 1.2 : 1.4)], [u * .4, -u * 1.6]], 1, PAL.ink, 'inkfine', .5);
  pop();
}

// Person: a generic, original everyday human (a bean body, round head, ink limbs) to cast as "me", "a person",
// "my neighbour"... in literal videos. (x, y) = ground point between the feet, u = size unit (~9u tall).
// o: { aL, aR (arm angles, 0 = down, 1.6 = up, negative = back), walk (leg phase), sq, rot, flip, look (-1..1),
//      mood: neutral|happy|surprised|strain|sad, shades (sunglasses 0..1 pop), col (shirt), skin, hair, key }. Returns { handL, handR } in world space.
function person(x, y, u, t, o = {}) {
  const sq = o.sq || 0, dir = o.flip ? -1 : 1, col = o.col || '#E27A92', skin = o.skin || '#F2C9A0', hair = o.hair || '#4A3350';
  const sw = clamp(u / 12, .6, 2), mood = o.mood || 'neutral', blink = frac(t * .3 + (o.seed || 0)) < .04;
  const hipY = -3.6 * u, shY = -6.4 * u, headY = -7.9 * u, legPh = o.walk ?? null;
  boilSeed('person ' + (o.key || 0));
  push(); translate(x, y); rotate(o.rot || 0); scale(dir * (1 + sq * .5), 1 - sq);
  for (const s of [-1, 1]) {
    const sw2 = legPh == null ? 0 : Math.sin((legPh + (s > 0 ? .5 : 0)) * TAU) * .5;
    inkLine([[s * .7 * u, hipY], [s * .7 * u + sw2 * 1.4 * u, -1.6 * u], [s * .8 * u + sw2 * 1.8 * u, 0]], sw * 2.2, PAL.ink, 'ink', .4);
    paint(ellPts(s * .8 * u + sw2 * 1.8 * u + .35 * u, -.15 * u, .7 * u, .3 * u, 10), { wash: PAL.ink, ink: null });
  }
  celFill(ellPts(0, -5 * u, 1.9 * u, 2 * u, 22), { col, sw });
  const hand = (s, a) => [s * 1.7 * u + Math.sin(a) * s * 2.6 * u, shY + Math.cos(a) * 2.6 * u];
  const hL = hand(-1, o.aL ?? .15), hR = hand(1, o.aR ?? .15);
  for (const [s, h] of [[-1, hL], [1, hR]]) {
    inkLine([[s * 1.5 * u, shY + .3 * u], [(s * 1.6 * u + h[0]) / 2, (shY + h[1]) / 2 + .3 * u], h], sw * 2, PAL.ink, 'ink', .4);
    paint(ellPts(h[0], h[1], .45 * u, .45 * u, 10), { wash: skin, ink: PAL.ink, sw: sw * .7 });
  }
  celFill(ellPts(0, headY, 1.6 * u, 1.55 * u, 22), { col: skin, sw, hi: .6 });
  paint([[-1.6 * u, headY - .2 * u], [-1.2 * u, headY - 1.5 * u], [.4 * u, headY - 1.8 * u], [1.6 * u, headY - .9 * u], [1.2 * u, headY - .5 * u], [-.2 * u, headY - 1 * u]], { wash: hair, ink: PAL.ink, sw: sw * .7, curv: .4 });
  const lx = (o.look || 0) * .25 * u;
  for (const s of [-1, 1]) {
    const ex = s * .55 * u + lx, ey = headY + .1 * u;
    if (blink || mood === 'happy') inkLine([[ex - .22 * u, ey + (mood === 'happy' ? .05 * u : 0)], [ex, ey - (mood === 'happy' ? .15 * u : 0)], [ex + .22 * u, ey]], sw * .9, PAL.ink, 'inkfine', .5);
    else if (mood === 'strain') inkLine([[ex - .22 * u, ey - s * .1 * u], [ex + .22 * u, ey + s * .1 * u]], sw, PAL.ink, 'inkfine', 0);
    else paint(ellPts(ex, ey, .14 * u, mood === 'surprised' ? .3 * u : .22 * u, 10), { wash: PAL.ink, ink: null });
  }
  if (o.shades > .01) {
    const k = backOut(clamp(o.shades));
    push(); translate(lx, headY + .05 * u); scale(k);
    for (const s of [-1, 1]) paint(rrPts(s * .55 * u - .45 * u, -.28 * u, .9 * u, .55 * u, .18 * u), { wash: '#1B1820', ink: PAL.ink, sw: sw * .6 });
    inkLine([[-.12 * u, -.1 * u], [.12 * u, -.1 * u]], sw * .8, '#1B1820', 'ink', 0);
    pop();
  }
  const my = headY + .75 * u;
  if (mood === 'surprised') paint(ellPts(lx, my, .25 * u, .32 * u, 12), { wash: PAL.ink, ink: null });
  else if (mood === 'strain') paint(rectPts(lx - .45 * u, my - .12 * u, .9 * u, .3 * u), { wash: PAL.cream, ink: PAL.ink, sw: sw * .7 });
  else if (mood === 'sad') inkLine([[lx - .35 * u, my + .12 * u], [lx, my - .08 * u], [lx + .35 * u, my + .12 * u]], sw * .9, PAL.ink, 'inkfine', .5);
  else inkLine([[lx - .35 * u, my - .05 * u], [lx, my + (mood === 'happy' ? .25 : .08) * u], [lx + .35 * u, my - .05 * u]], sw * .9, PAL.ink, 'inkfine', .5);
  pop();
  const world = ([hx, hy]) => { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), px = hx * dir * (1 + sq * .5), py = hy * (1 - sq); return [x + px * c - py * s, y + px * s + py * c]; };
  return { handL: world(hL), handR: world(hR) };
}

// Scientist: an original young AI researcher (lab coat with pens in the pocket, wild hair, big round glasses) to cast
// as the human who sings to the machine. (x, y) = ground point between the feet, u = size unit (~10u tall).
// o: { aL, aR (arm angles: 0 = down, 1.6 = straight out, 3 = up), walk (leg phase), sq, rot, flip, look (-1..1),
//      mood: neutral|happy|surprised|scared|sad|determined, sing 0..1 (mouth open), glow 0..1 (the glasses light up red),
//      sweat 0..1, hair, coat, key }. Returns { handL, handR, head } in world space.
function scientist(x, y, u, t, o = {}) {
  const sq = o.sq || 0, dir = o.flip ? -1 : 1, coat = o.coat || '#F4EEE6', hair = o.hair || '#E8733A', skin = '#F2C9A0';
  const sw = clamp(u / 11, .7, 2.4), mood = o.mood || 'neutral', blink = frac(t * .27 + (o.seed || 0)) < .035, legPh = o.walk ?? null;
  const hipY = -3.8 * u, shY = -6.9 * u, headY = -8.5 * u;
  boilSeed('sci ' + (o.key || 0));
  push(); translate(x, y); rotate(o.rot || 0); scale(dir * (1 + sq * .5), 1 - sq);
  for (const s of [-1, 1]) {
    const k = legPh == null ? 0 : Math.sin((legPh + (s > 0 ? .5 : 0)) * TAU) * .5;
    paint(ribbon([[s * .7 * u, hipY], [s * .75 * u + k * 1.3 * u, -1.8 * u], [s * .8 * u + k * 1.8 * u, -.2 * u]], .75 * u, .6 * u), { wash: '#2E3558', ink: PAL.ink, sw });
    celFill(ellPts(s * .8 * u + k * 1.8 * u + .45 * u, -.25 * u, .85 * u, .38 * u, 12), { col: '#3A2A2E', sw: sw * .8 });
  }
  // the lab coat: a trapezoid with lapels, a pocket with pens, and a hem that swings
  const swing = .25 * u * Math.sin(t * 3.1);
  celFill([[-1.5 * u, shY], [1.5 * u, shY], [2.2 * u + swing, -2.5 * u], [-2.2 * u + swing, -2.5 * u]], { col: coat, shade: '#C9C2D6', sw });
  paint([[-.55 * u, shY], [0, shY + 2.6 * u], [.55 * u, shY]], { wash: '#5A7AD8', ink: PAL.ink, sw: sw * .8 });
  inkLine([[-.55 * u, shY], [-.9 * u, shY + 1.7 * u], [-.2 * u, shY + 1.4 * u]], sw * .8, PAL.ink, 'ink', .3);
  inkLine([[.55 * u, shY], [.9 * u, shY + 1.7 * u], [.2 * u, shY + 1.4 * u]], sw * .8, PAL.ink, 'ink', .3);
  inkLine([[0, shY + 2.6 * u], [swing * .4, -2.5 * u]], sw * .6, '#B8B0C8', 'inkfine', 0);
  paint(rectPts(.7 * u, shY + 2 * u, .9 * u, .8 * u), { wash: coat, ink: PAL.ink, sw: sw * .6 });
  [['#E0483B', .85], ['#3A6ED8', 1.1], ['#F6C445', 1.35]].forEach(([c, px]) => paint(rectPts(px * u, shY + 1.7 * u, .14 * u, .5 * u), { wash: c, ink: null }));
  // arms: sleeves as ribbons, hands as mitts
  const hand = (s, a) => [s * 1.6 * u + Math.sin(a) * s * 2.9 * u, shY + .3 * u + Math.cos(a) * 2.9 * u];
  const hL = hand(-1, o.aL ?? .12), hR = hand(1, o.aR ?? .12);
  for (const [s, h] of [[-1, hL], [1, hR]]) {
    const el = [(s * 1.5 * u + h[0]) / 2 + s * .25 * u, (shY + h[1]) / 2 + .35 * u];
    paint(ribbon([[s * 1.3 * u, shY + .2 * u], el, h], .8 * u, .6 * u), { wash: coat, ink: PAL.ink, sw });
    celFill(ellPts(h[0], h[1], .5 * u, .5 * u, 12), { col: skin, sw: sw * .8 });
  }
  // head, ears, wild hair
  paint(rectPts(-.4 * u, headY + 1.2 * u, .8 * u, .6 * u), { wash: skin, ink: PAL.ink, sw: sw * .7 });
  for (const s of [-1, 1]) celFill(ellPts(s * 1.55 * u, headY + .15 * u, .35 * u, .45 * u, 10), { col: skin, sw: sw * .7 });
  celFill(ellPts(0, headY, 1.6 * u, 1.7 * u, 24), { col: skin, sw, hi: .5 });
  const H = [...Array(15)].map((_, i) => { const a = Math.PI * (1.02 + i / 14 * .96), r = (i % 2 ? 1.9 : 2.5) * u + .12 * u * Math.sin(t * 2 + i); return [Math.cos(a) * r * 1.05, headY - .35 * u + Math.sin(a) * r]; });
  celFill([[-1.7 * u, headY + .2 * u], ...H, [1.7 * u, headY + .2 * u], [1.2 * u, headY - .6 * u], [-.2 * u, headY - .9 * u], [-1.2 * u, headY - .5 * u]], { col: hair, shade: mixCol(hair, '#5A1E2E', .45), sw, curv: .3 });
  for (let i = 0; i < 4; i++) inkLine([[(-1 + i * .6) * u, headY - 1.6 * u], [(-.8 + i * .6) * u, headY - 1.1 * u]], sw * .7, mixCol(hair, '#5A1E2E', .5), 'inkfine', .5);
  // brows, eyes behind big round glasses, mouth
  const lx = (o.look || 0) * .3 * u, browUp = { surprised: .3, scared: .35, sad: .15, determined: -.15, happy: .1 }[mood] || 0;
  for (const s of [-1, 1]) {
    const ex = s * .62 * u + lx, ey = headY + .15 * u;
    inkLine([[ex - .35 * u, ey - (.75 + browUp) * u + (mood === 'determined' ? s * -.12 * u : 0)], [ex + .35 * u, ey - (.8 + browUp) * u + (mood === 'sad' ? s * .12 * u : 0)]], sw * 1.3, PAL.ink, 'ink', .3);
    if (blink || mood === 'happy') inkLine([[ex - .2 * u, ey], [ex, ey - .14 * u], [ex + .2 * u, ey]], sw, PAL.ink, 'inkfine', .5);
    else { paint(ellPts(ex, ey, .2 * u, (mood === 'surprised' || mood === 'scared' ? .3 : .24) * u, 10), { wash: PAL.cream, ink: null }); paint(ellPts(ex + lx * .3, ey + .02 * u, .11 * u, .13 * u, 8), { wash: PAL.ink, ink: null }); }
  }
  const gl = clamp(o.glow || 0);
  if (gl > .02) for (const s of [-1, 1]) glow(s * .62 * u + lx, headY + .15 * u, 1.6 * u * gl, '#FF3B3B', .8 * gl);
  for (const s of [-1, 1]) paint(ellPts(s * .62 * u + lx, headY + .15 * u, .52 * u, .5 * u, 18), { wash: gl > .02 ? mixCol('#BFE8FF', '#FF4A5A', gl) : undefined, washOp: gl > .02 ? 170 * gl : undefined, ink: PAL.ink, sw: sw * 1.1 });
  inkLine([[-.12 * u + lx, headY + .1 * u], [.12 * u + lx, headY + .1 * u]], sw, PAL.ink, 'ink', 0);
  for (const s of [-1, 1]) paint(ellPts(s * .5 * u + lx, headY - .05 * u, .1 * u, .06 * u, 8, 0, -.5), { wash: '#FFFFFF', ink: null });
  const my = headY + .95 * u, op = clamp(o.sing || 0);
  if (op > .05 || mood === 'surprised' || mood === 'scared') {
    const h = Math.max(op, mood === 'surprised' || mood === 'scared' ? .5 : 0);
    paint(ellPts(lx, my + .05 * u, .36 * u, (.1 + .32 * h) * u, 14), { wash: '#6A1E2E', ink: PAL.ink, sw: sw * .8 });
    if (h > .35) paint(ellPts(lx, my + (.05 + .2 * h) * u, .2 * u, .1 * u, 10), { wash: '#E27A92', ink: null });
  } else if (mood === 'sad') inkLine([[lx - .35 * u, my + .12 * u], [lx, my - .06 * u], [lx + .35 * u, my + .12 * u]], sw, PAL.ink, 'inkfine', .5);
  else inkLine([[lx - .38 * u, my - .06 * u], [lx, my + (mood === 'happy' ? .28 : .1) * u], [lx + .38 * u, my - .06 * u]], sw, PAL.ink, 'inkfine', .5);
  if ((o.sweat || 0) > .05) { const k = backOut(clamp(o.sweat)); paint([[1.5 * u, headY - .9 * u], [1.75 * u, headY - .3 * u], [1.25 * u, headY - .3 * u]].map(([px, py]) => [1.5 * u + (px - 1.5 * u) * k, headY - .6 * u + (py + .6 * u - headY) * k]), { wash: '#8CD3F0', ink: PAL.ink, sw: sw * .6 }); }
  pop();
  const world = ([hx, hy]) => { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), px = hx * dir * (1 + sq * .5), py = hy * (1 - sq); return [x + px * c - py * s, y + px * s + py * c]; };
  return { handL: world(hL), handR: world(hR), head: world([0, headY]) };
}

// Serpent: a giant snake (one ribbon body, glowing eyes, fangs) rising from below its head point (hx, hy); s = head size.
// rise 0..1 lifts it into view, rage 0..1 opens the jaws and flares a red glow.
function serpent(t, hx, hy, s, rise, rage = 0, key = 'serpent') {
  const P = [];
  for (let i = 0; i <= 18; i++) { const f = i / 18; P.push([hx + Math.sin(f * 6 - t * 2.2) * s * 1.3 * f - f * s * .6, hy + f * s * 8 + (1 - rise) * s * 9]); }
  const head = P[0];
  if (rage > .01) glow(head[0], head[1], s * 3, '#FF3B3B', .6 * rage);
  boilSeed(key);
  paint(ribbon(P, s * .7, s * 1.4), { wash: '#1E4A4E', fill: '#2F6E62', fillOp: 120, bleed: .05, tex: .5, ink: PAL.ink, sw: 1.6 });
  for (let i = 2; i < 18; i += 2) paint(ellPts(P[i][0], P[i][1], s * .18, s * .12, 10), { wash: '#4E8F72', ink: null });
  push(); translate(head[0], head[1] + (1 - rise) * 0); rotate(-.15 + .1 * Math.sin(t * 2));
  paint(ellPts(0, 0, s * 1.2, s * .8, 22), { wash: '#1E4A4E', ink: PAL.ink, sw: 1.6 });
  const open = rage * .5;
  paint([[-s * .9, s * .3], [s * .9, s * .3], [s * .6, s * (.35 + open)], [-s * .6, s * (.35 + open)]], { wash: '#5A1A2A', ink: PAL.ink, sw: 1 });
  for (const sd of [-1, 1]) {
    paint([[sd * s * .5, s * .3], [sd * s * .38, s * (.3 + .35 + open * .4)], [sd * s * .26, s * .3]], { wash: PAL.cream, ink: PAL.ink, sw: .6 });
    glow(sd * s * .45, -s * .2, s * .6, '#FF4A3A', .6 + .4 * rage);
    paint(ellPts(sd * s * .45, -s * .2, s * .22, s * .14, 12, 0, sd * .3), { wash: '#FFCF5A', ink: PAL.ink, sw: .8 });
    paint(ellPts(sd * s * .45, -s * .2, s * .05, s * .12, 8), { wash: PAL.ink, ink: null });
  }
  pop();
}

// Clip: a helpful paperclip assistant with googly eyes and eyebrows. (x, y) = its centre, s = its length.
// o: { look (-1..1), brow (0..1 raises them), key }
function clippy(x, y, s, t, { look = 0, brow = 0, key = 'clippy' } = {}) {
  paperclip(x, y, s, .12 + .05 * Math.sin(t * 2), '#C9CED8', key);
  boilSeed(key + 'face');
  for (const sd of [-1, 1]) { paint(ellPts(x + sd * s * .13, y - s * .28, s * .09, s * .11, 12), { wash: '#FFFFFF', ink: PAL.ink, sw: .8 }); paint(ellPts(x + sd * s * .13 + look * s * .03, y - s * .27, s * .04, s * .05, 8), { wash: PAL.ink, ink: null }); inkLine([[x + sd * s * .2, y - s * (.46 + .06 * brow)], [x + sd * s * .05, y - s * (.43 - .04 * brow * sd)]], 1.4, PAL.ink, 'ink', 0); }
}

// Chatty: a chatbot living in a speech bubble, with a face. (x, y) = its centre, r = its radius. o: { mood: happy | sad, key }
function chatty(x, y, r, t, { mood = 'happy', key = 'buddy' } = {}) {
  boilSeed(key);
  paint(ellPts(x, y, r * 1.25, r, 30), { wash: '#F7D1E6', ink: PAL.ink, sw: 1.2 });
  paint([[x - r * .5, y + r * .8], [x - r * .9, y + r * 1.25], [x - r * .1, y + r * .95]], { wash: '#F7D1E6', ink: PAL.ink, sw: 1 });
  for (const sd of [-1, 1]) {
    if (mood === 'happy') inkLine([[x + sd * r * .4 - r * .14, y - r * .1], [x + sd * r * .4, y - r * .26], [x + sd * r * .4 + r * .14, y - r * .1]], 1.4, PAL.ink, 'ink', .5);
    else { paint(ellPts(x + sd * r * .4, y - r * .15, r * .1, r * .14, 12), { wash: PAL.ink, ink: null }); inkLine([[x + sd * r * .55, y - r * .42], [x + sd * r * .25, y - r * .34]], 1.2, PAL.ink, 'ink', 0); }
    paint(ellPts(x + sd * r * .62, y + r * .12, r * .14, r * .08, 10), { wash: PAL.rose, ink: null });
  }
  inkLine([[x - r * .25, y + r * .22], [x, y + r * (mood === 'happy' ? .42 : .3)], [x + r * .25, y + r * .22]], 1.3, PAL.ink, 'ink', .5);
}

// Shoggoth: an original many-eyed blob of tentacles, optionally wearing a smiley mask (the friendly face it shows).
// (x, y) = ground point under its middle, s = body radius (it stands about 2s tall; tentacles reach ~1.7s out).
// o: { mask 0..1 (pops the mask on), slip 0..1 (the mask tilts and slides off), rage 0..1 (eyes glow red, jaws open),
//      eyes (count, default 9), look (-1..1; default: each eye wanders), col, key }. Returns { mask, top } in world space.
function shoggoth(x, y, s, t, o = {}) {
  const col = o.col || '#3E3A6E', dk = mixCol(col, PAL.ink, .45), lt = mixCol(col, '#9AD8C8', .35), rage = o.rage || 0;
  const cy = y - s * .95, key = o.key || 'shog', sw = clamp(s / 60, .6, 2.2);
  if (rage > .02) glow(x, cy, s * 2.4, '#FF3B5A', .45 * rage);
  for (let i = 0; i < 7; i++) {
    boilSeed(key + 'tent' + i);
    const side = i % 2 ? 1 : -1, ph = hash(i * 3.3) * TAU, P = [];
    for (let k = 0; k <= 8; k++) {
      const f = k / 8, a = (side > 0 ? -.2 : Math.PI + .2) + side * (.25 * (i >> 1) - .3) + .5 * Math.sin(t * 2.2 + ph + f * 3) * f;
      P.push([x + side * s * .6 + Math.cos(a) * s * 1.7 * f, cy + s * .4 + Math.sin(a) * s * 1.1 * f - s * .5 * f * f * Math.sin(ph)]);
    }
    paint(ribbon(P, s * .26, s * .03), { wash: i % 3 ? col : dk, ink: PAL.ink, sw: sw * .8 });
    for (let k = 3; k < 8; k += 2) paint(ellPts(P[k][0], P[k][1] + s * .04, s * .05 * (1 - k / 10), s * .04 * (1 - k / 10), 8), { wash: lt, ink: null });
  }
  boilSeed(key + 'body');
  const B = [...Array(30)].map((_, i) => { const a = i / 30 * TAU, r = s * (1 + .08 * Math.sin(a * 5 + t * 2.6) + .05 * Math.sin(a * 3 - t * 1.7)); return [x + Math.cos(a) * r * 1.1, Math.min(y, cy + Math.sin(a) * r)]; });
  paint(B, { wash: col, fill: dk, fillOp: 90, bleed: .08, tex: .6, border: .5, ink: PAL.ink, sw, curv: .4 });
  paint(ellPts(x - s * .35, cy - s * .45, s * .45, s * .22, 16, 0, -.3), { fill: lt, fillOp: 110, bleed: .2, tex: .7, ink: null });
  const n = o.eyes ?? 9;
  for (let i = 0; i < n; i++) {
    boilSeed(key + 'eye' + i);
    const a = hash(i * 7.1) * TAU, rr = s * (.25 + .6 * hash(i * 2.9)), ex = x + Math.cos(a) * rr * 1.05, ey = cy + Math.sin(a) * rr * .8;
    const er = s * (.07 + .09 * hash(i * 5.7)), blink = frac(t * (.2 + .15 * hash(i)) + hash(i * 9.3)) < .06;
    if (blink) { inkLine([[ex - er, ey], [ex + er, ey]], sw * .8, PAL.ink, 'inkfine', 0); continue; }
    paint(ellPts(ex, ey, er, er * 1.1, 14), { wash: mixCol('#F4EFD8', '#FF5A6A', rage), ink: PAL.ink, sw: sw * .6 });
    const lx = (o.look ?? Math.sin(t * .9 + i)) * .45 * er;
    paint(ellPts(ex + lx, ey, er * .45, er * .55, 10), { wash: rage > .5 ? '#7A0E1E' : PAL.ink, ink: null });
  }
  if (rage > .05) {
    boilSeed(key + 'mouth');
    paint(ellPts(x + s * .2, cy + s * .45, s * .5, s * .12 + s * .25 * rage, 18), { wash: '#2A0E1E', ink: PAL.ink, sw: sw * .8 });
    for (let i = 0; i < 6; i++) paint([[x - s * .25 + i * s * .18, cy + s * .45 - s * .1 * rage], [x - s * .17 + i * s * .18, cy + s * .45 + s * .05], [x - s * .09 + i * s * .18, cy + s * .45 - s * .1 * rage]], { wash: PAL.cream, ink: null });
  }
  const mk = clamp(o.mask || 0), slip = clamp(o.slip || 0);
  const mx = x + s * .15 + slip * s * .5, my = cy - s * .1 + slip * slip * s * 1.1;
  if (mk > .01) {
    boilSeed(key + 'mask');
    push(); translate(mx, my); rotate(slip * 1.1); scale(backOut(mk));
    inkLine([[-s * .55, -s * .05], [-s * .95, -s * .15]], sw * .7, PAL.ink, 'ink', 0);
    paint(ellPts(0, 0, s * .55, s * .52, 26), { wash: '#F6D34A', fill: '#E8AA38', fillOp: 90, bleed: .05, tex: .5, border: .6, ink: PAL.ink, sw });
    for (const sd of [-1, 1]) paint(ellPts(sd * s * .18, -s * .12, s * .06, s * .1, 10), { wash: PAL.ink, ink: null });
    inkLine([[-s * .28, s * .1], [-s * .1, s * .25], [s * .1, s * .25], [s * .28, s * .1]], sw * 1.2, PAL.ink, 'ink', .6);
    paint(ellPts(-s * .3, -s * .3, s * .1, s * .06, 10, 0, -.5), { wash: '#FFF3B0', ink: null });
    pop();
  }
  return { mask: [mx, my], top: [x, cy - s] };
}

// Gato: an original big tabby cat sitting, with a right paw that reaches out to hold something. (x, y) = ground point,
// s = size unit (it sits about 9s tall). o: { paw 0..1 (reaches the paw forward and up), look (-1..1), mood: calm |
// smile | sad, blink, col, key }. Returns { paw } (the paw tip in world space).
function gato(x, y, s, t, o = {}) {
  const col = o.col || '#E8A45A', dk = mixCol(col, PAL.ink, .35), lt = mixCol(col, PAL.cream, .5), sw = clamp(s / 16, .6, 2.2), key = o.key || 'gato';
  const paw = clamp(o.paw || 0), breathe = Math.sin(t * 1.6) * .04;
  boilSeed(key + 'tail');
  const tail = [...Array(9)].map((_, i) => { const f = i / 8; return [x - s * 3 - f * s * 2.6, y - s * .6 - Math.sin(f * 2.6 + Math.sin(t * 1.4) * .8) * s * 2.2]; });
  paint(ribbon(tail, s * .9, s * .5), { wash: col, ink: PAL.ink, sw });
  for (let i = 2; i < 9; i += 2) inkLine([[tail[i][0] - s * .3, tail[i][1] - s * .2], [tail[i][0] + s * .3, tail[i][1] + s * .1]], sw * 1.2, dk, 'ink', 0);
  boilSeed(key + 'body');
  paint(ellPts(x, y - s * 3.1, s * 3.4, s * 3.2 * (1 + breathe), 28), { wash: col, fill: dk, fillOp: 60, bleed: .1, tex: .5, ink: PAL.ink, sw, curv: .3 });
  paint(ellPts(x + s * .3, y - s * 2.6, s * 1.7, s * 2.1, 20), { wash: lt, ink: null });
  for (let i = 0; i < 3; i++) inkLine([[x - s * 2.9, y - s * (4.5 - i * 1.1)], [x - s * 2, y - s * (4.3 - i * 1.1)]], sw * 1.4, dk, 'ink', .3);
  paint(ellPts(x - s * 1.2, y - s * .4, s * .9, s * .5, 14), { wash: lt, ink: PAL.ink, sw: sw * .8 });
  const tip = [x + s * (1.2 + 3.2 * paw), y - s * (.4 + 4.8 * paw * paw)];
  boilSeed(key + 'paw');
  paint(ribbon([[x + s * 1.3, y - s * 3.4], [lerp(x + s * 1.6, tip[0] - s, .5), lerp(y - s * 2, tip[1], .6)], tip], s * 1.1, s * .9), { wash: col, ink: PAL.ink, sw: sw * .9 });
  paint(ellPts(tip[0], tip[1], s * .85, s * .6, 14), { wash: lt, ink: PAL.ink, sw: sw * .8 });
  for (let i = -1; i <= 1; i++) paint(ellPts(tip[0] + i * s * .35, tip[1] + s * .35, s * .16, s * .12, 8), { wash: PAL.rose, ink: null });
  const hx = x + s * .4 + (o.look || 0) * s * .5, hy = y - s * 7 + breathe * s * 2;
  boilSeed(key + 'head');
  push(); translate(hx, hy); rotate((o.look || 0) * .12);
  for (const sd of [-1, 1]) { paint([[sd * s * 1.1, -s * 1.2], [sd * s * 1.9, -s * 3], [sd * s * 2.2, -s * .7]], { wash: col, ink: PAL.ink, sw }); paint([[sd * s * 1.35, -s * 1.3], [sd * s * 1.85, -s * 2.4], [sd * s * 1.95, -s * 1]], { wash: PAL.rose, ink: null }); }
  paint(ellPts(0, 0, s * 2.5, s * 2, 26), { wash: col, ink: PAL.ink, sw, curv: .3 });
  for (let i = -1; i <= 1; i++) inkLine([[i * s * .6, -s * 1.9], [i * s * .5, -s * 1.3]], sw * 1.3, dk, 'ink', 0);
  paint(ellPts(0, s * .8, s * 1.2, s * .8, 16), { wash: lt, ink: null });
  const blink = o.blink ?? frac(t * .23 + .4) < .05, mood = o.mood || 'calm';
  for (const sd of [-1, 1]) {
    const ex = sd * s * .95, ey = -s * .2;
    if (blink || mood === 'smile') inkLine([[ex - s * .4, ey + (mood === 'smile' ? s * .1 : 0)], [ex, ey - (mood === 'smile' ? s * .2 : 0)], [ex + s * .4, ey]], sw * 1.1, PAL.ink, 'ink', .5);
    else {
      paint(ellPts(ex, ey, s * .5, s * .55, 16), { wash: '#B8E07A', ink: PAL.ink, sw: sw * .8 });
      paint(ellPts(ex + (o.look || 0) * s * .15, ey, s * .12, s * .42, 10), { wash: PAL.ink, ink: null });
      paint(ellPts(ex - s * .15, ey - s * .2, s * .1, s * .1, 8), { wash: PAL.cream, ink: null });
      if (mood === 'sad') inkLine([[ex - sd * s * .5, ey - s * .75], [ex + sd * s * .3, ey - s * .6]], sw, PAL.ink, 'ink', 0);
    }
    for (const k of [-.2, .15]) inkLine([[sd * s * 1.2, s * .7 + k * s], [sd * s * 3, s * .5 + k * s * 2.4]], sw * .5, PAL.ink, 'inkfine', 0);
  }
  paint([[-s * .25, s * .45], [s * .25, s * .45], [0, s * .7]], { wash: PAL.rose, ink: PAL.ink, sw: sw * .5 });
  inkLine([[-s * .45, s * 1.05], [0, s * .8], [s * .45, s * 1.05]], sw * .9, PAL.ink, 'ink', .5);
  pop();
  return { paw: tip };
}

// Chinchilla: an original tiny fluffy rodent: round body, big round ears, bushy tail. (x, y) = ground point, s = size
// unit (about 3s tall). o: { sq (squash; + flattens), look (-1..1), mood: calm | shock, key }
function chinchilla(x, y, s, t, o = {}) {
  const sq = o.sq || 0, key = o.key || 'chin', sw = clamp(s / 14, .5, 1.6), shock = o.mood === 'shock';
  boilSeed(key);
  push(); translate(x, y); scale(1 + sq * .8, 1 - sq);
  paint(ribbon([[-s * 1.1, -s * .6], [-s * 2, -s * 1.3], [-s * 2.1, -s * 2.2]], s * .5, s * .7), { wash: '#8C8894', ink: PAL.ink, sw: sw * .8 });
  paint(ellPts(0, -s * 1.2, s * 1.4, s * 1.2, 22, s * .04), { wash: '#B7B3BF', fill: '#8C8894', fillOp: 80, bleed: .12, tex: .8, ink: PAL.ink, sw, curv: .3 });
  paint(ellPts(s * .3, -s * .9, s * .7, s * .6, 14), { wash: '#E8E4EC', ink: null });
  for (const sd of [-1, 1]) { paint(ellPts(s * .15 + sd * s * .7, -s * 2.55, s * .55, s * .62, 16), { wash: '#B7B3BF', ink: PAL.ink, sw: sw * .8 }); paint(ellPts(s * .15 + sd * s * .7, -s * 2.5, s * .32, s * .4, 12), { wash: PAL.rose, ink: null }); }
  for (const sd of [-1, 1]) {
    const ex = s * .3 + sd * s * .42 + (o.look || 0) * s * .1, ey = -s * 1.65;
    paint(ellPts(ex, ey, s * (shock ? .22 : .17), s * (shock ? .26 : .2), 10), { wash: PAL.ink, ink: null });
    paint(ellPts(ex - s * .05, ey - s * .07, s * .06, s * .06, 6), { wash: PAL.cream, ink: null });
    for (const k of [-1, 1]) inkLine([[s * .3 + sd * s * .3, -s * 1.35], [s * .3 + sd * s * 1.2, -s * 1.35 + k * s * .18]], sw * .4, PAL.ink, 'inkfine', 0);
  }
  paint(ellPts(s * .3, -s * (shock ? 1.15 : 1.35), s * (shock ? .1 : .08), s * (shock ? .14 : .06), 8), { wash: shock ? PAL.ink : PAL.rose, ink: null });
  pop();
}

// Shopkeeper: an original stocky counter worker (paper cap, big nose and moustache, shirt and apron) drawn as simple
// rounded shapes with floating hands (no arms), who acts through the brows. (x, y) = ground point under his body,
// u = size unit (about 14u tall with the cap). o: { mood (a SHOP_MOODS name, or the blended face from shopkeeperMoods),
//      hL, hR (hand positions in u, relative to (x, y)), rotL, rotR (hand turns), holdL / holdR ((x, y) => draw what the
//      hand holds, in his local space), phone 0..1 (a handset against his ear), tilt (head), lookX/lookY (-1..1),
//      flush / pale 0..1, beard 0..1 (a beard growing to the floor), band 0..1 (sweatband), vein 0..1 (throbbing
//      forehead vein), twitch 0..1 (one eye twitches), sq, dy (in u), rot, flip, shirt, apron, skin, phoneCol, key }.
// Returns { handL, handR, head, cord } in world space (cord = where the handset's cord leaves it).
const SHOP_MOODS = {
  neutral:  { brow: 0,    browY: 0,    lid: .1,  pupil: 1,   eye: 'open',  mouth: 'smile' },
  happy:    { brow: -.2,  browY: .25,  lid: 0,   pupil: 1,   eye: 'happy', mouth: 'grin' },
  confused: { brow: .4,   browY: .1,   lid: .15, pupil: .9,  eye: 'open',  mouth: 'wobble', odd: 1 },
  annoyed:  { brow: .45,  browY: -.2,  lid: .45, pupil: .9,  eye: 'open',  mouth: 'flat' },
  angry:    { brow: .8,   browY: -.3,  lid: .3,  pupil: .8,  eye: 'open',  mouth: 'teeth' },
  furious:  { brow: 1,    browY: -.35, lid: 0,   pupil: .5,  eye: 'open',  mouth: 'shout' },
  forced:   { brow: -.35, browY: .35,  lid: 0,   pupil: .65, eye: 'open',  mouth: 'teeth' },
  tired:    { brow: -.5,  browY: -.1,  lid: .6,  pupil: 1,   eye: 'open',  mouth: 'droop' },
  shock:    { brow: -.3,  browY: .5,   lid: 0,   pupil: .45, eye: 'open',  mouth: 'o' },
  smug:     { brow: .2,   browY: .05,  lid: .45, pupil: 1,   eye: 'open',  mouth: 'smile', odd: .6 },
  dizzy:    { brow: -.2,  browY: .3,   lid: 0,   pupil: 1,   eye: 'swirl', mouth: 'wobble' },
  ready:    { brow: .55,  browY: -.1,  lid: .2,  pupil: 1,   eye: 'open',  mouth: 'smirk' },
};
// Acted mood changes for the shopkeeper, like emotions() for Clawd: keys = [[t0, 'neutral'], [t1, 'angry'], ...].
// Brows and lids glide to the new face, the eyes and mouth swap under a quick blink, and the body takes (sq, dy).
function shopkeeperMoods(t, keys, amt = 1) {
  let i = 0; while (i + 1 < keys.length && t >= keys[i + 1][0]) i++;
  const cur = SHOP_MOODS[keys[i][1]] || SHOP_MOODS.neutral, age = t - keys[i][0];
  if (i === 0 || age > .35) return { mood: { ...cur }, sq: 0, dy: 0 };
  const prev = SHOP_MOODS[keys[i - 1][1]] || SHOP_MOODS.neutral, k = backOut(seg(age, 0, .3)), m = { ...cur };
  for (const f of ['brow', 'browY', 'lid', 'pupil']) m[f] = lerp(prev[f], cur[f], k);
  m.odd = lerp(prev.odd || 0, cur.odd || 0, k);
  if (age < .1) m.lid = Math.max(m.lid, 1 - age / .1);
  const tk = take(t, keys[i][0], .5 * amt);
  return { mood: m, sq: tk.sq, dy: tk.dy };
}
function shopkeeper(x, y, u, t, o = {}) {
  const key = o.key || 'shop', rs = p => boilSeed(key + ' ' + p), dir = o.flip ? -1 : 1;
  const m = typeof o.mood === 'object' ? o.mood : SHOP_MOODS[o.mood || 'neutral'] || SHOP_MOODS.neutral;
  const shirt = o.shirt || '#F4EEE2', apron = o.apron || '#C8403A', skinBase = o.skin || '#F0B98C', hair = '#4A3A34', hairLt = '#6E5850';
  const skin = mixCol(mixCol(skinBase, '#E0503C', .6 * (o.flush || 0)), '#E4E6E0', .6 * (o.pale || 0)), skinDk = mixCol(skin, '#B0604A', .45);
  const out = clamp(u / 11, .8, 3.2), inn = out * .55;   // outer contour heavier than inner detail
  const sq = o.sq || 0, breathe = Math.sin(t * 1.7) * .08 * u, headY = -11.4 * u + breathe, by = breathe * .5;
  push(); translate(x, y + (o.dy || 0) * u); rotate(o.rot || 0); scale(dir * (1 + sq * .5), 1 - sq);
  // body: shirt with collar, placket and rolled sleeves; apron with bib, ties, stitched pocket and folds
  rs('body');
  for (const s of [-1, 1]) {
    celFill(ellPts(s * 2.85 * u, -8.1 * u + by, 1.15 * u, 1.05 * u, 20), { col: shirt, sw: out, light: s < 0 ? [.3, .2] : [.15, .2] });
    inkLine([[s * 2.2 * u, -7.4 * u + by], [s * 2.9 * u, -7.15 * u + by], [s * 3.6 * u, -7.5 * u + by]], inn, mixCol(shirt, '#8A8070', .6), 'ink', .5);
  }
  celFill(rrPts(-3 * u, -9.4 * u + by, 6 * u, 9.4 * u, 2.3 * u), { col: shirt, sw: out, k: .86, light: [.2, .15] });
  for (const s of [-1, 1]) paint([[0, -9.2 * u + by], [s * 1.25 * u, -9.35 * u + by], [s * .9 * u, -8.2 * u + by]], { wash: mixCol(shirt, '#FFFFFF', .4), ink: PAL.ink, sw: inn });
  inkLine([[0, -8.3 * u + by], [0, -6.8 * u + by]], inn, mixCol(shirt, '#8A8070', .6), 'ink', 0);
  for (let i = 0; i < 2; i++) paint(ellPts(.25 * u, -8 * u + i * .7 * u + by, .12 * u, .12 * u, 8), { wash: '#C9BFAE', ink: null });
  const bib = [[-1.55 * u, -7.5 * u + by], [1.55 * u, -7.5 * u + by], [1.75 * u, -5.6 * u], [2.35 * u, -4.9 * u], [2.25 * u, 0], [-2.25 * u, 0], [-2.35 * u, -4.9 * u], [-1.75 * u, -5.6 * u]];
  celFill(bib, { col: apron, sw: out * .9, k: .86, light: [.25, .12], curv: .15 });
  for (const s of [-1, 1]) inkLine([[s * 1.35 * u, -7.4 * u + by], [s * 1.05 * u, -9.3 * u + by]], out * 1.1, mixCol(apron, PAL.ink, .15), 'ink', 0);
  for (const s of [-1, 1]) inkLine([[s * 2.3 * u, -4.9 * u], [s * 2.9 * u, -4.4 * u], [s * 2.7 * u, -3.8 * u]], inn * 1.4, apron, 'ink', .6);
  inkLine([[-2.3 * u, -4.9 * u], [2.3 * u, -4.9 * u]], inn, mixCol(apron, PAL.ink, .3), 'ink', .2);
  const pk = rrPts(-1.2 * u, -4.3 * u, 2.4 * u, 1.5 * u, .3 * u);
  paint(pk, { wash: mixCol(apron, '#000000', .12), ink: PAL.ink, sw: inn });
  inkLine(rrPts(-1.05 * u, -4.15 * u, 2.1 * u, 1.2 * u, .22 * u).concat([[-1.05 * u, -3.8 * u]]), inn * .7, mixCol(apron, '#FFD8C8', .5), 'inkfine', 0);
  paint(rectPts(.55 * u, -5.1 * u, .22 * u, 1.1 * u), { wash: '#F2C84A', ink: PAL.ink, sw: inn });
  paint([[.55 * u, -5.1 * u], [.77 * u, -5.1 * u], [.66 * u, -5.45 * u]], { wash: '#F2D2A0', ink: PAL.ink, sw: inn * .8 });
  for (const [fx, f0, f1] of [[-1.4, -2.6, -.4], [.9, -2.2, -.3], [1.7, -3.2, -1.4]]) inkLine([[fx * u, f0 * u], [fx * u + .15 * u, f1 * u]], inn, mixCol(apron, PAL.ink, .35), 'ink', .5);
  // neck and head
  rs('head');
  paint(rrPts(-1 * u, headY + 1.6 * u, 2 * u, 1.8 * u, .5 * u), { wash: skinDk, ink: null });
  push(); translate(0, headY); rotate(o.tilt || 0);
  const lx = (o.lookX || 0) * .35 * u, ly = (o.lookY || 0) * .25 * u;
  for (const s of [-1, 1]) {
    celFill(ellPts(s * 2.55 * u, .35 * u, .6 * u, .8 * u, 16), { col: skin, sw: out * .8, light: s < 0 ? [.3, .3] : [.1, .3] });
    inkLine([[s * 2.45 * u, 0], [s * 2.7 * u, .3 * u], [s * 2.5 * u, .75 * u]], inn, skinDk, 'ink', .6);
  }
  // a face wider at the jowls than at the crown
  const face = [...Array(34)].map((_, i) => { const a = i / 34 * TAU, sn = Math.sin(a); return [Math.cos(a) * 2.6 * u * (1 + .07 * Math.max(0, sn) - .05 * Math.max(0, -sn)), sn * 2.7 * u * (sn > 0 ? .98 : 1)]; });
  celFill(face, { col: skin, shade: mixCol(skin, '#9A4A3A', .35), sw: out, k: .8, light: [.2, .12], hi: .8 });
  inkLine([[-1.1 * u, 2.45 * u], [0, 2.75 * u], [1.1 * u, 2.45 * u]], inn, skinDk, 'ink', .6);
  for (let i = 0; i < 18; i++) { const a = .35 + hash(i * 3.1) * 2.4, r = (1.9 + .55 * hash(i * 7.3)) * u; paint(ellPts(Math.cos(a) * r, Math.sin(a) * r * 1.02, .05 * u, .05 * u, 6), { wash: skinDk, ink: null }); }
  // hair: sideburns and a fringe at the back, strands drawn in
  for (const s of [-1, 1]) {
    const hp = [[s * 2.6 * u, .2 * u], [s * 2.45 * u, -1.2 * u], [s * 1.8 * u, -2.05 * u], [s * 1.4 * u, -1.75 * u], [s * 1.95 * u, -.9 * u], [s * 2.2 * u, .5 * u]];
    celFill(hp, { col: hair, sw: inn, light: [.5, .2], curv: .4 });
    for (let i = 0; i < 3; i++) inkLine([[s * (2.35 - i * .12) * u, (-.9 + i * .35) * u], [s * (2.05 - i * .1) * u, (-1.5 + i * .35) * u]], inn * .7, hairLt, 'inkfine', .4);
  }
  if ((o.band || 0) > .01) {
    push(); translate(0, -1.75 * u); scale(backOut(o.band));
    celFill(rrPts(-2.6 * u, -.4 * u, 5.2 * u, .9 * u, .4 * u), { col: '#E2476E', sw: out * .8 });
    for (let i = -2; i <= 2; i++) inkLine([[i * .95 * u, -.25 * u], [i * .95 * u, .35 * u]], inn, '#FFE0E8', 'inkfine', 0);
    pop();
  } else {
    // a folded paper cap: front panel, darker side and a brim band with a crease
    celFill([[-2.2 * u, -1.75 * u], [-1.75 * u, -3.45 * u], [1.75 * u, -3.45 * u], [2.2 * u, -1.75 * u]], { col: '#FFFFFF', shade: '#D8D4CC', sw: out * .9, light: [.3, .2] });
    paint([[1.75 * u, -3.45 * u], [2.1 * u, -3.2 * u], [2.45 * u, -1.9 * u], [2.2 * u, -1.75 * u]], { wash: '#C9C4BA', ink: PAL.ink, sw: inn });
    celFill(rrPts(-2.3 * u, -2.15 * u, 4.6 * u, .55 * u, .15 * u), { col: '#EEEAE2', shade: '#CFC9BE', sw: out * .8 });
    inkLine([[-.2 * u, -3.4 * u], [.1 * u, -2.2 * u]], inn, '#C9C4BA', 'inkfine', 0);
  }
  // brows: bushy, tapered, with strands; brow > 0 pulls the inner ends down (anger), < 0 up (worry)
  for (const s of [-1, 1]) {
    const odd = s > 0 ? (m.odd || 0) : 0, bY = -1.15 * u - m.browY * .5 * u - odd * .45 * u, tl = (m.brow - odd * 1.2) * .42 * u;
    const P = [[s * 1.7 * u + lx, bY - tl * 1.05], [s * 1.05 * u + lx, bY - tl * .4 - .15 * u], [s * .38 * u + lx, bY + tl]];
    paint(ribbon(P, .5 * u, .28 * u), { wash: hair, ink: PAL.ink, sw: inn * .6 });
    for (let i = 0; i < 3; i++) inkLine([[P[0][0] + (P[2][0] - P[0][0]) * (.2 + i * .25), P[0][1] + (P[2][1] - P[0][1]) * (.2 + i * .25) - .1 * u], [P[0][0] + (P[2][0] - P[0][0]) * (.3 + i * .25), P[0][1] + (P[2][1] - P[0][1]) * (.3 + i * .25) + .08 * u]], inn * .6, hairLt, 'inkfine', 0);
  }
  if ((o.vein || 0) > .01) {
    push(); translate(1.45 * u, -2.05 * u); scale(o.vein * (1 + .25 * Math.sin(t * 22)));
    for (const r of [0, 1.6, 3.2, 4.8]) inkLine([[.35 * u * Math.cos(r), .35 * u * Math.sin(r)], [.12 * u * Math.cos(r + .5), .12 * u * Math.sin(r + .5)]], out * 1.3, '#D8302E', 'ink', .4);
    pop();
  }
  // eyes: white, brown iris, pupil and glint, a heavy upper lid line, bags when tired
  for (const s of [-1, 1]) {
    const ex = s * 1.02 * u + lx, ey = -.25 * u + ly, tw = s < 0 ? (o.twitch || 0) * (step(t, 14) % 2 ? 1 : .15) : 0;
    const lid = clamp(Math.max(m.lid, tw * .85)), rx = .55 * u, ry = .62 * u;
    if (m.lid > .45) inkLine([[ex - rx * .8, ey + ry * 1.15], [ex, ey + ry * 1.35], [ex + rx * .8, ey + ry * 1.15]], inn, skinDk, 'ink', .6);
    if (m.eye === 'happy') { inkLine([[ex - rx, ey + .15 * u], [ex, ey - .4 * u], [ex + rx, ey + .15 * u]], out * 1.2, PAL.ink, 'ink', .6); inkLine([[ex - rx * .6, ey + .45 * u], [ex + rx * .6, ey + .45 * u]], inn, skinDk, 'ink', .4); continue; }
    paint(ellPts(ex, ey, rx, ry, 20), { wash: '#FFFFFF', ink: PAL.ink, sw: inn });
    if (m.eye === 'swirl') { inkLine([...Array(18)].map((_, i) => { const a = i * .9 + t * 9 * s, r = rx * .9 * i / 17; return [ex + Math.cos(a) * r, ey + Math.sin(a) * r]; }), inn * 1.4, PAL.ink, 'inkfine', .6); continue; }
    const ir = .32 * u * Math.max(.55, m.pupil), px = ex + (o.lookX || 0) * .18 * u, py = ey + (o.lookY || 0) * .2 * u + .05 * u;
    paint(ellPts(px, py, ir, ir * 1.08, 16), { wash: '#7A4A2A', ink: null });
    paint(ellPts(px, py, ir * .55 * m.pupil, ir * .6 * m.pupil, 12), { wash: PAL.ink, ink: null });
    paint(ellPts(px - ir * .4, py - ir * .4, ir * .28, ir * .28, 8), { wash: '#FFFFFF', ink: null });
    const ly2 = ey - ry + 2 * ry * lid;
    if (lid > .04) paint([[ex - rx * 1.12, ey - ry * 1.15], [ex + rx * 1.12, ey - ry * 1.15], [ex + rx * 1.12, ly2], [ex - rx * 1.12, ly2]], { wash: skin, ink: null });
    inkLine(lid > .04 ? [[ex - rx * 1.05, ly2], [ex + rx * 1.05, ly2]] : arcPts(ex, ey + .05 * u, rx * 1.02, Math.PI * 1.08, Math.PI * 1.92, 10), out * .9, PAL.ink, 'ink', 0);
  }
  // mouth sits clear below the moustache, then the nose and moustache on top
  const mo = m.mouth, my = 1.7 * u, mx = lx * .4;
  if (mo === 'shout' || mo === 'o') {
    const w = mo === 'shout' ? 1.1 * u : .5 * u, h = mo === 'shout' ? .85 * u : .55 * u;
    paint(ellPts(mx, my + h * .35, w, h, 22), { wash: '#6A1E28', ink: PAL.ink, sw: out * .8 });
    if (mo === 'shout') { paint(rrPts(mx - w * .7, my - h * .6, w * 1.4, h * .35, .1 * u), { wash: '#FFFFFF', ink: null }); paint(ellPts(mx, my + h * .85, w * .55, h * .3, 14), { wash: '#E8708A', ink: null }); }
    else paint(ellPts(mx, my + h * .75, w * .5, h * .25, 12), { wash: '#E8708A', ink: null });
  } else if (mo === 'teeth') {
    paint(rrPts(mx - 1 * u, my - .25 * u, 2 * u, .8 * u, .3 * u), { wash: '#FFFFFF', ink: PAL.ink, sw: out * .8 });
    for (let i = -1; i <= 1; i++) inkLine([[mx + i * .48 * u, my - .2 * u], [mx + i * .48 * u, my + .5 * u]], inn, PAL.ink, 'inkfine', 0);
    inkLine([[mx - .95 * u, my + .15 * u], [mx + .95 * u, my + .15 * u]], inn, PAL.ink, 'inkfine', 0);
  } else if (mo === 'grin') {
    paint([[mx - .85 * u, my - .15 * u], [mx + .85 * u, my - .15 * u], [mx + .5 * u, my + .55 * u], [mx - .5 * u, my + .55 * u]], { wash: '#6A1E28', ink: PAL.ink, sw: out * .8, curv: .6 });
    paint(ellPts(mx, my + .35 * u, .4 * u, .15 * u, 12), { wash: '#E8708A', ink: null });
  } else {
    const c = { smile: [0, .3], flat: [.1, .1], droop: [.3, 0], wobble: [.15, .15], smirk: [.15, .25] }[mo] || [.1, .2];
    const P = mo === 'wobble' ? [[-.7, c[0]], [-.35, c[1] - .15], [0, c[0] + .12], [.35, c[1] - .15], [.7, c[0]]] : mo === 'smirk' ? [[-.6, c[0]], [.1, c[0] + .1], [.7, c[0] - .25]] : [[-.7, c[0]], [0, c[1]], [.7, c[0]]];
    inkLine(P.map(([a, b]) => [a * u + mx, my + b * u]), out, PAL.ink, 'ink', .5);
    inkLine([[mx - .3 * u, my + .6 * u], [mx + .3 * u, my + .6 * u]], inn, skinDk, 'ink', .5);
  }
  for (const s of [-1, 1]) paint(ellPts(s * 1.55 * u, 1 * u, .5 * u, .28 * u, 14), { wash: '#F08A7A', washOp: 110, ink: null });
  const nx = lx * .6, wig = mo === 'shout' ? -.2 : 0;
  const stache = [[nx, .8 * u], [nx - 1 * u, .72 * u], [nx - 1.9 * u, (1.05 + wig) * u], [nx - 2.15 * u, (1.5 + wig) * u], [nx - 1.2 * u, 1.32 * u], [nx, 1.18 * u],
    [nx + 1.2 * u, 1.32 * u], [nx + 2.15 * u, (1.5 + wig) * u], [nx + 1.9 * u, (1.05 + wig) * u], [nx + 1 * u, .72 * u]];
  celFill(stache, { col: hair, shade: '#2E2420', sw: inn, light: [.4, .1], curv: .5 });
  for (let i = 0; i < 6; i++) { const sx = (i < 3 ? -1 : 1) * (.35 + (i % 3) * .5) * u; inkLine([[nx + sx, .9 * u], [nx + sx * 1.25, 1.25 * u + wig * u * Math.abs(sx) / (1.4 * u)]], inn * .7, hairLt, 'inkfine', .3); }
  celFill(ellPts(nx, .42 * u, .85 * u, .68 * u, 20), { col: mixCol(skin, '#D8604E', .4), sw: out * .8, hi: .9, light: [.25, .15] });
  for (const s of [-1, 1]) paint(ellPts(nx + s * .32 * u, .82 * u, .13 * u, .08 * u, 8), { wash: '#6A2A28', ink: null });
  const beard = o.beard || 0;
  if (beard > .01) {
    const L = lerp(2, 11, beard) * u, sway = Math.sin(t * 2.2) * .4 * u * beard;
    celFill([[-2.1 * u, .8 * u], [-2.2 * u, L * .45], [-1 * u + sway, L * .9], [sway, L], [1 * u + sway, L * .9], [2.2 * u, L * .45], [2.1 * u, .8 * u], [0, 2.4 * u]], { col: '#D8D2CA', sw: out * .8, curv: .5 });
    for (let i = 0; i < 6; i++) inkLine([[(-1.3 + i * .52) * u, 2.6 * u], [(-1.4 + i * .56) * u + sway * .6, L * (.6 + .08 * (i % 2))]], inn, '#A8A098', 'inkfine', .4);
  }
  pop();
  // the handset, held against the ear, standing upright beside the face
  let cord = null;
  if ((o.phone || 0) > .01) {
    rs('phone');
    push(); translate(-2.95 * u, headY + .6 * u); rotate(1.75 + (o.tilt || 0)); scale(backOut(o.phone));
    handset(0, 0, 1.6 * u, 0, { col: o.phoneCol || '#C8403A', key: key + ' handset' });
    pop();
    cord = [-2.6 * u, headY + 2.4 * u];
  }
  // floating hands (no arms): a palm with three fingers, a thumb and knuckle lines, shaded
  const hand = (s, h, r, hold) => {
    rs('hand' + s);
    push(); translate(h[0] * u, h[1] * u); rotate(r || 0); scale(s < 0 ? -1 : 1, 1);
    const hShade = mixCol(skin, '#9A4A3A', .35);
    for (let i = 0; i < 3; i++) celFill(ellPts(.75 * u, -.45 * u + i * .42 * u, .5 * u, .24 * u, 14), { col: skin, shade: hShade, sw: inn * 1.3, light: [.2, .2] });
    celFill(ellPts(-.05 * u, 0, .95 * u, .8 * u, 20), { col: skin, shade: hShade, sw: out * .9, light: [.2, .15] });
    celFill(ellPts(-.2 * u, -.85 * u, .5 * u, .26 * u, 12, 0, -.35), { col: skin, shade: hShade, sw: inn * 1.3, light: [.2, .2] });
    for (let i = 0; i < 2; i++) inkLine([[.35 * u, -.25 * u + i * .42 * u], [.6 * u, -.22 * u + i * .42 * u]], inn, skinDk, 'inkfine', 0);
    pop();
    if (hold) hold(h[0] * u, h[1] * u);
  };
  const hl = o.hL || [-3.6, -4.2], hr = o.hR || [3.6, -4.2];
  hand(-1, hl, o.rotL, o.holdL); hand(1, hr, o.rotR, o.holdR);
  pop();
  const world = ([hx, hy]) => { const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), px = hx * dir * (1 + sq * .5), py = hy * (1 - sq); return [x + px * c - py * s, y + (o.dy || 0) * u + px * s + py * c]; };
  return { handL: world([hl[0] * u, hl[1] * u]), handR: world([hr[0] * u, hr[1] * u]), head: world([0, headY]), cord: cord && world(cord) };
}

// Key poses for act() (src/motion.js): scientist(x, y, u, t, { ...act(t, keys, SCI_POSES) }). Arms: 0 = down, 1.6 = out, 3 = up.
const SCI_POSES = {
  rest: { aL: .15, aR: .15, rot: 0, sq: 0 },
  point: { aR: 1.65, aL: .1, rot: .07 }, cheer: { aL: 2.9, aR: 2.9, sq: -.06 }, shrug: { aL: 1.15, aR: 1.15, sq: .08 },
  facepalm: { aR: 2.55, aL: .2, rot: .06 }, panic: { aL: 2.95, aR: 2.95, sq: -.08, rot: -.05 }, recoil: { aL: 1.35, aR: 1.35, rot: -.2, sq: .05 },
  plead: { aL: 2.2, aR: 2.2, sq: .22, rot: .16 }, think: { aR: 2.35, aL: .3 }, lean: { rot: .16, aR: .7 }, slump: { sq: .12, rot: .09, aL: 0, aR: 0 },
  present: { aR: 2.05, aL: .2 }, cower: { sq: .3, aL: 2.6, aR: 2.6, rot: .12 }, type: { aL: 1.2, aR: 1.2, rot: .08 },
};
