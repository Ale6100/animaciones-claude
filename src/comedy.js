// comedy.js: helpers for literal comedy, where whatever the voice says appears the instant it is said.
// The joke lives in the timing: things snap in on the word, change abruptly, exaggerate and then hold deadpan.

// When is a word (or a phrase) said? Case, accents and punctuation are ignored. `nth` picks a later occurrence.
// lines: LYRICS[id] from tools/sync_lyrics.py. Returns the start time of the first word of the match, or null.
function wordAt(lines, text, nth = 0) {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ]/g, '');
  const words = lines.flatMap(L => L.words), want = text.split(/\s+/).map(norm).filter(Boolean);
  let found = 0;
  for (let i = 0; i + want.length <= words.length; i++) {
    if (want.every((w, j) => norm(words[i + j][2]) === w) && found++ === nth) return words[i][0];
  }
  return null;
}

// Details that answer the song: each cue appears when its word is sung (or at a time), stays `hold` seconds and leaves.
// list: [{ at: 'word' | seconds, nth, hold = 2, draw: (k, age) => { ... } }]; k is the popIn scale (overshoots, then 1).
function cues(t, lines, list) {
  for (const c of list) {
    const t0 = typeof c.at === 'number' ? c.at : wordAt(lines, c.at, c.nth || 0);
    if (t0 == null || t < t0) continue;
    const k = popIn(t, t0, t0 + (c.hold ?? 2));
    if (k > .01) c.draw(k, t - t0);
  }
}

// 0..1+ scale for something that pops in at t0 (a quick overshoot) and optionally pops out at t1.
function popIn(t, t0, t1 = Infinity, dur = .18) {
  if (t0 == null || t < t0) return 0;
  const inK = backOut(seg(t, t0, t0 + dur));
  return t < t1 ? inK : inK * (1 - easeIn(seg(t, t1, t1 + dur * .8)));
}

// An abrupt change at t0 (a colour turning, a size jumping): 0 before, 1 after, crossing in `dur` seconds.
const snapAt = (t, t0, dur = .1) => t0 == null ? 0 : ease(seg(t, t0, t0 + dur));

// Exaggerated growth at t0: scale goes 1 → `amount` with a springy overshoot, then settles and wobbles a little.
function growAt(t, t0, amount = 3, dur = .5) {
  if (t0 == null || t < t0) return 1;
  return 1 + (amount - 1) * elasticOut(seg(t, t0, t0 + dur));
}

// A "de repente" freeze: everything that uses the returned time stops at t0 for `hold` seconds, then carries on.
// Use it as the time for walks and idles so the character halts mid-step.
function freezeAt(t, t0, hold = .8) {
  if (t0 == null || t < t0) return t;
  return t < t0 + hold ? t0 : t - hold;
}
