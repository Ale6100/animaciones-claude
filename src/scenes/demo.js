// demo.js: "The fallen star", an 8-second example that exercises the kit. It is one idea, not a template: don't
// copy its story, staging or palette into your own video (see ANIMATION_GUIDE.md).
//   Shot A (0–4.4 s): Clawd dozes on a hill at night. A star falls behind the next hill. Clawd wakes, has an idea,
//                     turns (drawn key views) and trots off after it. Brush wipe.
//   Shot B (4.4–8 s): Clawd finds the star dim and sad in the grass, lifts it, and throws it back into the sky, where
//                     it lights up again. Iris out.
(() => {
  const NIGHT = [PAL.indigo, PAL.violet];   // wipe colours, the same on both sides of the cut

  // ---------- set pieces ----------
  function sky(t, horizon = 1.2) {
    paint(rectPts(-600, -400, W + 1200, H + 800), { wash: PAL.night, ink: null });   // oversized: the camera pans
    paint(ellPts(W / 2, H * .95, W * .75, H * .45 * horizon, 30, 10), { fill: PAL.violet, fillOp: 110, bleed: .3, tex: .6, ink: null });
    paint(ellPts(W * .3, H * .15, W * .35, H * .25, 24, 10), { fill: PAL.indigo, fillOp: 90, bleed: .3, tex: .5, ink: null });
    for (let i = 0; i < 42; i++) {   // twinkling stars, each on its own clock
      const x = hash(i) * (W + 200) - 100, y = hash(i + 100) * H * .6 - 40, tw = .55 + .45 * Math.sin(t * (2 + 2 * hash(i + 300)) + i);
      paint(starPts(x, y, (3 + 5 * hash(i + 200)) * tw, .35, 4), { wash: PAL.cream, washOp: 150 + 100 * tw, ink: null });
    }
    paint(ellPts(260, 170, 70, 70, 24, 1.5), { wash: PAL.cream, fill: PAL.ochre, fillOp: 40, ink: PAL.ink, sw: .8 });
    paint(ellPts(245, 150, 16, 12, 10), { fill: mixCol(PAL.cream, PAL.ochre, .5), fillOp: 120, ink: null });
  }
  function hill(cx, cy, rx, ry, col, t, tufts = 0) {
    paint(ellPts(cx, cy, rx, ry, 40, 2), { wash: col, fill: mixCol(col, PAL.night, .35), fillOp: 90, bleed: .08, tex: .6, ink: PAL.ink, sw: 1 });
    for (let i = 0; i < tufts; i++) {   // grass tufts along the top, swaying
      const a = -Math.PI / 2 + (hash(i + cx) - .5) * 1.6, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry + 4, sw = wob(t, .5, hash(i) * 3) * 5;
      for (const k of [-1, 0, 1]) inkLine([[x + k * 7, y], [x + k * 11 + sw, y - 22 - 8 * hash(i + k)]], .7, mixCol(col, PAL.cream, .35), 'inkfine', .4);
    }
  }
  const hillY = (x, cx, cy, rx, ry) => cy - ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));

  // The star: a five-point pal with a face. glow 0..1 (dim → bright), sad true/false.
  function starling(x, y, r, o = {}) {
    const g = clamp(o.glow ?? .6), tw = 1 + .06 * Math.sin(T * 9);
    glow(x, y, r * (1.6 + 1.4 * g) * tw, '#FFD96A', .25 + .75 * g);
    push(); translate(x, y); rotate(o.rot || 0);
    paint(starPts(0, 0, r, .52, 5), { wash: mixCol('#B9A98A', '#FFE27A', g), fill: PAL.cream, fillOp: 30 + 80 * g, ink: PAL.ink, sw: clamp(r / 40, .5, 1.2) });
    const e = r * .16;
    if (o.sad) {
      for (const s of [-1, 1]) inkLine([[s * e * 1.9 - e * .7, -e * .3 + s * e * .25], [s * e * 1.9 + e * .7, -e * .3 - s * e * .25]], clamp(r / 50, .4, 1), PAL.ink, 'ink', 0);
      inkLine([[-e, e * 1.6], [0, e * 1.1], [e, e * 1.6]], clamp(r / 60, .35, .9), PAL.ink, 'ink', .6);
    } else {
      for (const s of [-1, 1]) paint(ellPts(s * e * 1.9, -e * .3, e * .45, e * .6, 10), { wash: PAL.ink, ink: null });
      inkLine([[-e, e * .9], [0, e * 1.6], [e, e * .9]], clamp(r / 60, .35, .9), PAL.ink, 'ink', .6);
      if (r > 20) for (const s of [-1, 1]) paint(ellPts(s * e * 3.1, e * 1.1, e * .6, e * .3, 10), { fill: PAL.rose, fillOp: 150, ink: null });
    }
    pop();
  }
  const sparkle = (x, y, r, k) => { if (k > 0 && k < 1) paint(starPts(x, y, r * backOut(k) * (1 - k * .6), .25, 4, k * 2), { wash: PAL.cream, washOp: 255 * (1 - k * k), ink: null }); };

  // ---------- shot A: the fall ----------
  const FRONT = [700, 1010, 900, 220];   // front hill ellipse (cx, cy, rx, ry)
  const tFall0 = 1.05, tLand = 1.9;
  const fallAt = t => { const k = easeIn(seg(t, tFall0, tLand)); return [lerp(1680, 1545, k), lerp(40, 700, k)]; };

  function shotFall(t, lt, dur) {
    const shake = t > tLand ? shakeXY(t, 7 * Math.exp(-(t - tLand) * 7)) : [0, 0];
    camBegin(kf(t, [[0, 900], [2.9, 900], [4.4, 1230]]) + shake[0], kf(t, [[0, 560], [2, 540]]) + shake[1], kf(t, [[0, 1], [1.85, 1.07], [2.05, 1.03], [4.4, 1.01]]));
    sky(t);
    // the falling star, its trail, and the glow where it lands
    if (t > tFall0 && t < tLand + .05) {
      const P = []; for (let k = 6; k >= 0; k--) P.push(fallAt(Math.max(tFall0, t - k * .045)));
      if (Math.hypot(P[6][0] - P[0][0], P[6][1] - P[0][1]) > 8) paint(ribbon(P, 2, 26), { wash: PAL.cream, fill: PAL.ochre, fillOp: 90, ink: null });
      const [sx, sy] = fallAt(t); starling(sx, sy, 22, { glow: 1, rot: t * 9 });
    }
    if (t > tLand) {
      const a = t - tLand, k = Math.exp(-a * 1.2);
      glow(1545, 690, 60 + 240 * (1 - Math.exp(-a * 5)), '#FFD96A', .3 + .9 * k);
      for (let i = 0; i < 7; i++) { const q = seg(a, i * .03, .5 + i * .03), ang = -Math.PI / 2 + (i - 3) * .35; sparkle(1545 + Math.cos(ang) * 190 * q, 660 + Math.sin(ang) * 170 * q, 18, q); }
    }
    hill(1560, 900, 820, 260, mixCol(PAL.teal, PAL.night, .45), t, 10);
    hill(...FRONT, mixCol(PAL.sap, PAL.night, .35), t, 16);

    // Clawd: dozing → startled → the idea → a turn through the key views → a trot down the hill after it
    const u = 17, x0 = 760, walk = stroll(t, 3.05, 4.7, x0, 1520, u);
    const x = t < 3.05 ? x0 : walk.x, gy = hillY(x, ...FRONT) + 4;
    const mood = emotions(t, [[0, 'sleepy'], [tLand + .05, 'surprised', { lookX: .8 }], [2.55, 'idea'], [3.1, 'excited']]);
    const facing = t < 2.9 ? {} : t < 3.05 ? turn(t, 2.9, 3.05, 0, .25) : { view: 'side', walk: walk.walk, dy: (mood.dy || 0) * .4 + walk.dy };
    const slope = (hillY(x + 5, ...FRONT) - hillY(x - 5, ...FRONT)) / 10;
    clawd(x, gy, u, { ...mood, ...facing, rot: (mood.rot || 0) + Math.atan(slope) * .8 });
    const eye = toScreen(x, gy - 4 * u);   // screen position of Clawd, for the iris
    camEnd();
    if (lt < .5) iris(...eye, lerp(0, 1500, easeIn(lt / .5)));   // open on Clawd
    if (lt > dur - .3) brushWipe((lt - (dur - .3)) / .6, NIGHT);
  }

  // ---------- shot B: the return ----------
  function shotReturn(t, lt, dur) {
    const G = 880, u = 24;
    camBegin(960 + 18 * Math.sin(lt * .8), 530 - lt * 6, 1 + .015 * lt);
    sky(t, 1.4);
    hill(1300, 1180, 1300, 330, mixCol(PAL.teal, PAL.night, .45), t, 0);
    paint(rectPts(-200, G - 20, W + 400, 400, 3), { wash: mixCol(PAL.sap, PAL.night, .3), fill: mixCol(PAL.sap, PAL.night, .55), fillOp: 100, bleed: .05, tex: .6, ink: null });
    inkLine([[-200, G - 18], [W / 2, G - 24], [W + 200, G - 16]], 1, PAL.ink, 'ink', .5);

    // timing (shot-local)
    const tStop = 1.0, tLift = 1.9, tHold = 2.25, tWind = 2.55, tThrow = 2.7, tHome = 3.15;
    const walk = stroll(lt, 0, tStop, 300, 950, u), x = walk.x;
    const mood = emotions(lt, [[0, 'excited'], [1.05, 'surprised', { lookX: .8, lookY: .6 }], [1.45, 'hopeful', { lookX: .6, lookY: .5 }],
                               [tHold, 'starstruck'], [tThrow + .05, 'happy'], [tHome, 'love', { lookX: .6, lookY: -.9 }]]);
    let pose;
    if (lt < tStop) pose = { view: 'side', walk: walk.walk, dy: walk.dy };
    else if (lt < tLift - .1) pose = turn(lt, tStop, tStop + .12, .25, .125);
    else if (lt < tLift) pose = { ...turn(lt, tLift - .1, tLift, .125, 0), sq: .18 * ease(seg(lt, tLift - .1, tLift)), aL: -.2, aR: -.2 };   // crouch to pick it up
    else if (lt < tThrow) {
      const up = backOut(seg(lt, tLift, tHold)), wind = ease(seg(lt, tWind, tThrow));
      pose = { aL: lerp(-.2, 1.45, up) - .5 * wind, aR: lerp(-.2, 1.45, up) - .5 * wind, sq: .2 * wind };
    } else {
      const a = lt - tThrow; pose = { aL: 1.5 - .9 * seg(a, .3, .8), aR: 1.5 - .9 * seg(a, .3, .8), sq: -.22 * Math.exp(-a * 7) * Math.cos(a * 18), dy: -1.2 * Math.exp(-a * 6) * Math.max(0, Math.cos(a * 9)) };
      if (lt > tHome + .1) pose.aR = .9 + .5 * Math.sin((lt - tHome) * 14);   // waving goodbye
    }
    const cl = { ...mood, ...pose, sq: (mood.sq || 0) + (pose.sq || 0), dy: (mood.dy || 0) * (lt < tStop ? .3 : 1) + (pose.dy || 0) };
    if (lt >= tLift) { cl.dy = pose.dy || 0; cl.aL = pose.aL; cl.aR = pose.aR; }   // arms and height belong to the lift now
    clawd(x, G, u, cl);

    // the star: sad in the grass → lifted overhead, brightening → thrown home along an arc → twinkling in the sky
    const head = [x, G + (cl.dy || 0) * u - 8 * u * (1 - (cl.sq || 0)) - 46];
    const ground = [1080, G - 30], home = [1440, 150];
    if (lt < tLift) starling(...ground, 38, { glow: .15 + .5 * seg(lt, 1.45, 1.9), sad: lt < 1.6, rot: -.15 + .04 * Math.sin(lt * 3) });
    else if (lt < tThrow) {
      const k = easeOut(seg(lt, tLift, tHold)), p = arcPt(ground, head, 80, k);
      starling(p[0], p[1] + 14 * ease(seg(lt, tWind, tThrow)), 38, { glow: .65 + .35 * seg(lt, tLift, tHold + .2), rot: .2 * Math.sin(lt * 7) });
    } else if (lt < tHome) {
      const k = easeOut(seg(lt, tThrow, tHome)), p = arcPt(head, home, 260, k);
      for (let i = 1; i < 9; i++) { const kk = Math.max(0, k - i * .045), q = arcPt(head, home, 260, kk); sparkle(q[0] + jit(4), q[1], 16 - i, .3 + i * .08); }
      starling(p[0], p[1], lerp(38, 16, k), { glow: 1, rot: lt * 10 });
    } else {
      const a = lt - tHome;
      sparkle(...home, 110, seg(a, 0, .5));
      starling(...home, 16 + 6 * Math.exp(-a * 5), { glow: .8 + .2 * Math.sin(a * 8), rot: .1 * Math.sin(a * 3) });
    }
    const eye = toScreen(x, G - 4 * u);
    camEnd();
    if (lt < .3) brushWipe(.5 + lt / .6, NIGHT);
    if (lt > dur - .38) iris(...eye, lerp(1500, 0, easeIn(seg(lt, dur - .38, dur - .04))));   // close on Clawd
  }

  shots([[0, shotFall], [4.4, shotReturn]]);
})();
