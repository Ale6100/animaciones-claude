// src/scenes/literal.js: "La pelota", an 8 s sketch of literal comedy: every noun and adjective appears the instant
// it is said (wordAt + popIn / snapAt / growAt from src/comedy.js), then the gag holds deadpan.
// It's one idea, not a template: a real video improvises its own gags over the transcription of its audio.
(() => {
  // Hand-timed words for the demo (a real voice gets these from tools/sync_lyrics.py)
  const say = (t0, text, step) => ({ t0, words: text.split(' ').map((w, i) => [t0 + i * step, t0 + (i + .9) * step, w]) });
  const LINES = [say(.4, 'el otro día yo tenía una pelota,', .32), say(3.1, 'era verde,', .35), say(4.2, 'y era muy grande', .38)];
  const T = { me: wordAt(LINES, 'yo'), ball: wordAt(LINES, 'pelota'), green: wordAt(LINES, 'verde'), big: wordAt(LINES, 'grande') };

  function gag(t, lt, dur) {
    const mood = MOODS.comedy, tt = moodTime(t, mood), bigK = growAt(t, T.big, 7, .7), grown = snapAt(t, T.big, .25);
    const zoomOut = lerp(1, .55, ease(seg(t, T.big + .1, T.big + .5)));
    camBegin(960, lerp(560, 200, (1 - zoomOut) / .45), zoomOut * (1 + .06 * snapAt(t, T.ball, .08) * (1 - grown)));
    boilSeed('room');
    paint(rectPts(-2000, -2000, W + 4000, H + 4000), { wash: PAL.paper, ink: null });
    paint(rectPts(-2000, 880, W + 4000, 2000), { wash: '#E9DCC4', ink: null });
    inkLine([[-2000, 880], [W + 2000, 880]], 1.4, PAL.ink, 'ink', 0);

    const inK = popIn(t, T.me), strain = grown, wob = strain * Math.sin(t * 38) * .03;
    if (inK > 0) {
      const holding = snapAt(t, T.ball, .12), arms = lerp(.15, 1.05, holding) + strain * 1.85;
      push(); translate(960, 880); scale(inK); translate(-960, -880);
      const hands = person(960, 880, 34, tt, { aL: arms, aR: arms, mood: strain > .5 ? (t > T.big + 1.4 ? 'sad' : 'strain') : holding > .5 ? 'happy' : 'neutral',
        sq: .12 * strain + .05 * Math.sin(t * 40) * strain, rot: wob, look: t > T.big + 1.4 ? 0 : .3, walk: strain > .5 ? t * 3 : null, key: 'me' });
      pop();
      if (T.ball != null && t >= T.ball) {
        const r = 58 * bigK * popIn(t, T.ball), mid = [(hands.handL[0] + hands.handR[0]) / 2, (hands.handL[1] + hands.handR[1]) / 2];
        const col = mixCol('#E8AA38', '#6E9F58', snapAt(t, T.green, .12));
        ball(mid[0], mid[1] - lerp(r * .9 - 20, r - 10, strain), r, col, { rot: wob * 3 });
        if (T.green != null) burst(mid[0], mid[1] - r, t - T.green, 120, '#6E9F58', 'greenpuff', 10);
      }
      if (t > T.big + 1.6) emote('sweat', 960 + 75, 880 - 34 * 8.3, 40, seg(t, T.big + 1.6, T.big + 1.8), t);
    }
    camEnd();
    if (lt < .25) flash(1 - lt / .25, PAL.paper);
    if (lt > dur - .5) iris(960, 540, lerp(1500, 0, easeIn(seg(lt, dur - .5, dur))), PAL.ink);
  }

  registerScene('literal', { title: 'La pelota (literal comedy example)', duration: 8, bpm: 100, offset: 0, lyrics: [], shots: [[0, gag]] });
})();
