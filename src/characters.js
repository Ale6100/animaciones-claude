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
  paint(ellPts(0, -5 * u, 1.9 * u, 2 * u, 22), { wash: col, ink: PAL.ink, sw });
  const hand = (s, a) => [s * 1.7 * u + Math.sin(a) * s * 2.6 * u, shY + Math.cos(a) * 2.6 * u];
  const hL = hand(-1, o.aL ?? .15), hR = hand(1, o.aR ?? .15);
  for (const [s, h] of [[-1, hL], [1, hR]]) {
    inkLine([[s * 1.5 * u, shY + .3 * u], [(s * 1.6 * u + h[0]) / 2, (shY + h[1]) / 2 + .3 * u], h], sw * 2, PAL.ink, 'ink', .4);
    paint(ellPts(h[0], h[1], .45 * u, .45 * u, 10), { wash: skin, ink: PAL.ink, sw: sw * .7 });
  }
  paint(ellPts(0, headY, 1.6 * u, 1.55 * u, 22), { wash: skin, ink: PAL.ink, sw });
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
