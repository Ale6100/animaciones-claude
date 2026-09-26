// src/scenes/showcase.js: "Pip's Night Out", a 24 s sketch of the adaptive music-video paradigm: moods per section
// (calm → energetic → calm) in one continuous shot, and physical lyrics that Pip (src/characters.js) lands on and knocks apart.
// It's one idea, not a template: a real video picks its own world, characters, moods, transitions and layouts.
(() => {
  const BPMv = 120;
  // Original demo lyrics: each line's words fall on a steady step (a synced song gets these from tools/sync_lyrics.py)
  const line = (t0, text, step) => { const words = text.split(' ').map((w, i) => [t0 + i * step, t0 + (i + .9) * step, w]); return { t0, t1: words[words.length - 1][1], words }; };
  const LINES = [
    line(1.0, 'a tiny spark in the quiet', .5), line(4.5, 'waiting for the beat', .6),
    line(8.0, 'now jump on every word', .5), line(11.0, 'break the lines apart', .5),
    line(14.0, 'ride it higher and higher', .45), line(17.0, 'light it up tonight', .6),
    line(20.5, 'and rest', .7),
  ];
  const SECTIONS = [[0, 'calm'], [8, 'energetic'], [20, 'calm']];
  const CALM = ['#141030', '#1E1848', '#2E2870', '#3B3288'], LOUD = ['#2A0F3E', '#5B1F6E', '#B03C7C', '#E0708C'];

  function night(t, lt, dur) {
    const mood = moodAt(t, SECTIONS), loud = ease(seg(t, 7.6, 8.2)) * (1 - ease(seg(t, 19.6, 20.6)));
    const cam = beatCam(t, mood);
    camBegin(960 + cam.dx, 540 + cam.dy, cam.zoom * (1 + .04 * loud), cam.rot);
    const bands = CALM.map((c, i) => mixCol(c, LOUD[i], loud));
    bands.forEach((c, i) => { boilSeed('band' + i); paint(rectPts(-400, -400 + i * 470, W + 800, 480), { wash: c, ink: null }); });
    boilSeed('stars');
    for (let i = 0; i < 40; i++) paint(starPts(hash(i * 3.1) * W, frac(hash(i * 7.7) + t * .01) * H, 3 + 5 * hash(i) * (.6 + .4 * Math.sin(t * 3 + i)), .35, 4), { wash: PAL.cream, ink: null });
    if (loud > .05) for (let i = 0; i < 5; i++) {
      boilSeed('stripe' + i);
      const x0 = ((i * 520 - t * 600) % 2600 + 2600) % 2600 - 500;
      paint([[x0, -100], [x0 + 140, -100], [x0 - 260, H + 100], [x0 - 400, H + 100]], { wash: i % 2 ? '#4CC6DE' : PAL.ochre, washOp: 90 * loud, ink: null });
    }
    if (t > 7.9 && t < 8.4) flash(1 - seg(t, 7.95, 8.4), PAL.cream);
    const words = physicalLyrics(t, LINES, { textAt: t0 => moodAt(t0, SECTIONS).text, colors: [PAL.cream, '#FFD98A', '#F08BB0'], area: [220, 380, W - 220, H - 130] });
    flushLetters();
    const home = [960 + 30 * Math.sin(t * .6), 900], onWords = hopAcross(t, words, home, .3), k = ease(seg(loud, .2, .8));
    const hop = { x: lerp(home[0], onWords.x, k), y: lerp(home[1], onWords.y, k), air: onWords.air * k };
    const sq = hop.air ? -.18 * hop.air : .12 * pulse(t, 8) * loud, bob = loud < .5 ? 8 * Math.sin(t * 1.5) : 0;
    pip(hop.x, hop.y - bob, 34, t, { sq, rot: hop.air * .25, open: loud > .5, lookX: Math.sin(t * .7) });
    const pipS = toScreen(hop.x, hop.y - 60);
    camEnd();
    if (lt < .8) iris(960, 700, lerp(0, 2300, easeIn(lt / .8)), PAL.ink);
    if (lt > dur - 1.4) iris(pipS[0], pipS[1], lerp(2300, 0, easeOut(seg(lt, dur - 1.4, dur - .2))), PAL.ink);
  }

  registerScene('showcase', { title: "Pip's Night Out (adaptive example)", duration: 24, bpm: BPMv, offset: 0, lyrics: [], shots: [[0, night]] });
})();
