// src/scenes/motiongfx.js: "Clawd in Motion", a 10 s sketch of mixing: a hand-painted Clawd living inside a
// motion-graphics world (src/motion.js, the `motion` look). Shapes draw themselves on, a circle morphs into a card
// that Clawd hops out of, type enters letter by letter, a masked reveal opens behind it, and everything draws off.
// It's one idea, not a template.
(() => {
  const COL = { bg: '#0E1024', a: '#4CE0F0', b: '#F2A283', c: '#F6D34A', d: '#8A6CF0', line: '#E9ECF7' };
  const circle = (cx, cy, r) => ellPts(cx, cy, r, r, 64);
  const LINES = [[4.2, 'one line at a time'], [6.4, 'draw it on the beat']];

  function world(t, lt, dur) {
    const beat = pulse(t, 7);
    camBegin(960, 540, 1 + .015 * beat + .03 * seg(t, 0, 10), .004 * Math.sin(t * .6));
    paint(rectPts(-200, -200, W + 400, H + 400), { wash: COL.bg, ink: null });
    dotGrid(960, 540, 24, 14, 80, stagger(t, 0, 0, 0, 1.2) * (1 - cubicInOut(seg(t, 9, 9.8))), { col: '#FFFFFF1C' });
    // a circle draws itself on, then morphs into a card
    const card = rrPts(660, 300, 600, 400, 28), ring0 = circle(960, 500, 120);
    const m = expoInOut(seg(t, 1.3, 2.2)), back = expoInOut(seg(t, 8.6, 9.4));
    drawOn(arcPts(960, 500, 120, -Math.PI / 2, TAU * .75), t, .3, 1.2, { sw: 2.2, col: COL.a, off: [9.3, 9.8] });
    if (t > 1.2 && t < 9.4) {
      const k = m * (1 - back), shape = morphPts(ring0, card, k);
      paint(shape, { wash: mixCol('#1B2046', '#232A5C', k), ink: COL.a, sw: 1.2 });
      // inside the card: a masked reveal of stripes that slides on the beat
      const open = expoOut(seg(t, 5.8, 6.6)) * (1 - expoInOut(seg(t, 8.2, 8.7)));
      if (k > .9 && open > .01) masked(card, () => { for (let i = -8; i < 12; i++) { const x = 560 + i * 70 + (t * 120) % 70 - 900 * (1 - open); paint([[x, 280], [x + 34, 280], [x - 120, 720], [x - 154, 720]], { wash: i % 2 ? COL.d : COL.a, washOp: 90, ink: null }); } });
    }
    // an equalizer of pills grows on every beat
    for (let i = 0; i < 12; i++) { const h = 30 + 120 * Math.abs(Math.sin(bpOf(t) * Math.PI * .5 + i * .7)) * inOut(t, 2.4 + i * .04, 8.6); boilSeed('eq' + i); if (h > 32) paint(rrPts(700 + i * 46, 780 - h, 26, h, 13), { wash: [COL.a, COL.b, COL.c, COL.d][i % 4], ink: null }); }
    // progress ring in the corner, filling across the piece
    arcRing(1720, 180, 60, seg(t, 1, 9), { col: COL.c, track: '#FFFFFF18' });
    // Clawd, painted in watercolor, hops out of the card on arcs that draw themselves as lines
    const hops = [[2.6, [960, 700], [760, 560]], [3.4, [760, 560], [1180, 480]], [4.4, [1180, 480], [960, 700]]];
    let pos = [960, 700], air = 0;
    for (const [h0, a, b] of hops) {
      const P = [...Array(21)].map((_, i) => arcPt(a, b, 220, i / 20));
      drawOn(P, t, h0, h0 + .5, { sw: 1.4, col: COL.line, off: [h0 + .5, h0 + 1.1] });
      if (t >= h0 && t < h0 + .5) { const k = cubicInOut(seg(t, h0, h0 + .5)); pos = arcPt(a, b, 220, k); air = Math.sin(k * Math.PI); }
      else if (t >= h0 + .5) pos = b;
      burstLines(b[0], b[1] - 20, t - (h0 + .5), { col: COL.c, r0: 40, r1: 150 });
    }
    const hop = jump(t, 7.2, 7.8, 2.4);
    const show = backOut(seg(t, 2.35, 2.6)) * (1 - expoInOut(seg(t, 8.9, 9.3)));
    if (show > .02) withLook('watercolor', () => clawd(pos[0], pos[1], 22 * show, { ...emotions(t, [[0, 'excited'], [5, 'cool'], [7.1, 'starstruck']]), sq: -.2 * air + hop.sq, dy: hop.dy, boilKey: 'clawdMG' }));
    camEnd();
    // the words enter letter by letter, like a title sequence
    for (const [t0, txt] of LINES) motionText(txt, 960, 900, t, t0, { size: 64, col: COL.line, style: t0 < 5 ? 'rise' : 'type', out: [t0 + 1.8, t0 + 2.1] });
    if (lt < .3) flash(1 - lt / .3, COL.bg);
    if (t > 9.7) flash(seg(t, 9.7, 10), COL.bg);
  }
  registerScene('motiongfx', { title: 'Clawd in Motion (motion-graphics example)', duration: 10, bpm: 120, offset: 0, look: 'motion', lyrics: [], shots: [[0, world]] });
})();
