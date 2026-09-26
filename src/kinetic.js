// kinetic.js: Kinetic Typography & Continuous Camera Director
// Modular subsystem for dynamic lyric videos, continuous camera choreography,
// and physical character-text interactions (standing on words, dodging, reactions).

(() => {
  // ---------------------------------------------------------------------------
  // 1. Continuous Camera Director
  // ---------------------------------------------------------------------------

  // Interpolates camera smoothly across waypoints: [[t0, [cx, cy, zoom, rot], easeFn], ...]
  // Guarantees zero abrupt jumps/cuts across the entire sequence.
  window.camPath = function(t, waypoints, defaultEase = ease) {
    if (!waypoints || waypoints.length === 0) return null;
    if (t <= waypoints[0][0]) {
      const [, [cx, cy, zoom, rot]] = waypoints[0];
      return { cx, cy, zoom, rot: rot || 0 };
    }
    const last = waypoints[waypoints.length - 1];
    if (t >= last[0]) {
      const [, [cx, cy, zoom, rot]] = last;
      return { cx, cy, zoom, rot: rot || 0 };
    }

    for (let i = 1; i < waypoints.length; i++) {
      const [tA, stateA, easeA] = waypoints[i - 1];
      const [tB, stateB] = waypoints[i];
      if (t >= tA && t < tB) {
        const eFn = easeA || defaultEase;
        const progress = eFn(clamp((t - tA) / (tB - tA)));
        const cx = lerp(stateA[0], stateB[0], progress);
        const cy = lerp(stateA[1], stateB[1], progress);
        const zoom = lerp(stateA[2], stateB[2], progress);
        const rot = lerp(stateA[3] || 0, stateB[3] || 0, progress);
        return { cx, cy, zoom, rot };
      }
    }
    return null;
  };

  // Applies continuous camera from waypoints
  window.camApplyPath = function(t, waypoints, defaultEase = ease) {
    const cam = camPath(t, waypoints, defaultEase);
    if (cam) camBegin(cam.cx, cam.cy, cam.zoom, cam.rot);
    return cam;
  };

  // Continuous traveling shot moving from pointA to pointB
  window.camDolly = function(t, t0, t1, pA, pB, zoomA = 1, zoomB = 1, rotA = 0, rotB = 0, easeFn = ease) {
    const k = easeFn(clamp((t - t0) / (t1 - t0)));
    const cx = lerp(pA[0], pB[0], k);
    const cy = lerp(pA[1], pB[1], k);
    const zoom = lerp(zoomA, zoomB, k);
    const rot = lerp(rotA, rotB, k);
    camBegin(cx, cy, zoom, rot);
    return { cx, cy, zoom, rot, k };
  };

  // Continuous orbital camera sweeping around a focus point
  window.camOrbit = function(t, cx, cy, radius = 200, zoom = 1, speed = 1, baseRot = 0) {
    const angle = t * speed * TAU;
    const camX = cx + Math.cos(angle) * radius;
    const camY = cy + Math.sin(angle) * (radius * 0.4);
    const rot = baseRot + Math.sin(angle) * 0.06;
    camBegin(camX, camY, zoom, rot);
    return { cx: camX, cy: camY, zoom, rot };
  };

  // Infinite zoom-through: dives into the hole of a letter/portal into the next scene
  window.zoomThrough = function(t, t0, t1, targetX, targetY, startZoom = 1, maxZoom = 25) {
    const k = easeIn(clamp((t - t0) / (t1 - t0)));
    const zoom = lerp(startZoom, maxZoom, k);
    const rot = k * 0.15;
    camBegin(targetX, targetY, zoom, rot);
    return { zoom, k, opacity: clamp(1 - (k - 0.7) / 0.3) };
  };

  // ---------------------------------------------------------------------------
  // 2. Kinetic Typography Engine
  // ---------------------------------------------------------------------------

  // Measures exact bounding box of any text string in pixels
  window.measureKineticText = function(txt, size, font = '"Permanent Marker", sans-serif') {
    const ctx = (typeof outX !== 'undefined' && outX) ? outX : (typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null);
    if (!ctx) return { width: (txt || '').length * size * 0.65, height: size * 0.85, font };
    ctx.save();
    ctx.font = `800 ${size}px ${font}`;
    const metrics = ctx.measureText(txt || '');
    const width = metrics.width || ((txt || '').length * size * 0.65);
    const height = size * 0.85; // approximate ascender height
    ctx.restore();
    return { width, height, font };
  };

  // Computes the physical platform bounds of a word so characters can stand on it
  window.wordPlatform = function(txt, x, y, size, o = {}) {
    const font = o.font || '"Permanent Marker", sans-serif';
    const { width, height } = measureKineticText(txt, size, font);
    const align = o.align || 'center';
    let left = x - width / 2;
    if (align === 'left') left = x;
    else if (align === 'right') left = x - width;

    const topY = y - height * 0.52;
    const bottomY = y + height * 0.48;
    const right = left + width;

    return {
      txt, x, y, size, font, width, height, align,
      left, right, topY, bottomY,
      center: [left + width / 2, topY],
      // Sample landing points for feet along the letters
      landingPt: (frac = 0.5) => [lerp(left + 20, right - 20, clamp(frac)), topY]
    };
  };

  // Places Clawd physically standing or dancing on top of a kinetic word platform
  window.clawdOnWord = function(platform, frac = 0.5, u = 20, clawdOptions = {}) {
    const [px, py] = platform.landingPt(frac);
    clawd(px, py, u, {
      view: 'front',
      ...clawdOptions
    });
    return [px, py];
  };

  // Reactive character dodge when a kinetic word flies past
  window.wordDodge = function(t, wordPassT, duration = 0.6) {
    if (t < wordPassT - 0.2 || t > wordPassT + duration) {
      return { dy: 0, sq: 0, rot: 0, duck: 0 };
    }
    const p = clamp((t - (wordPassT - 0.2)) / (duration + 0.2));
    const duck = Math.sin(p * Math.PI);
    return {
      dy: duck * 1.5,
      sq: duck * 0.25,
      rot: (p - 0.5) * 0.18,
      duck
    };
  };

  // Renders a single kinetic word with motion presets, transformations, and styles
  window.kineticWord = function(txt, x, y, size, t, o = {}) {
    const t0 = o.t0 != null ? o.t0 : t;
    const t1 = o.t1 != null ? o.t1 : (t0 + 2.0);
    const age = t - t0;
    const dur = Math.max(0.01, t1 - t0);
    const progress = clamp(age / dur);

    // Entry motion styles
    let curX = x, curY = y;
    let curScale = o.scale != null ? o.scale : 1.0;
    let curRot = o.rot != null ? o.rot : 0.0;
    let curAlpha = o.alpha != null ? o.alpha : 1.0;

    const motion = o.motion || 'slam';

    if (motion === 'slam') {
      // Slams into screen from huge scale with bounce
      const enterDur = o.enterDur || 0.24;
      if (age < enterDur) {
        const k = clamp(age / enterDur);
        const pop = backOut(k);
        curScale *= pop;
        curRot += (1 - k) * 0.35;
      }
    } else if (motion === 'spin') {
      // Spins into place on an arc
      const enterDur = o.enterDur || 0.35;
      if (age < enterDur) {
        const k = clamp(age / enterDur);
        curRot += (1 - k) * Math.PI * 1.5;
        curScale *= backOut(k);
      }
    } else if (motion === 'flyby') {
      // Streaks across screen from side with speed stretch
      const k = ease(progress);
      curX = lerp(o.startX || (x - 800), o.endX || (x + 800), k);
      curScale *= 1 + Math.sin(k * Math.PI) * 0.2;
    } else if (motion === 'orbit') {
      // Circles around center point
      const angle = (t * (o.speed || 1.8) + (o.phase || 0)) * TAU;
      const radius = o.radius || 240;
      curX = x + Math.cos(angle) * radius;
      curY = y + Math.sin(angle) * (radius * 0.4);
      curRot = Math.sin(angle) * 0.2;
    } else if (motion === 'float') {
      // Gentle wavy floating idle
      curY += Math.sin(t * 3.5 + (o.phase || 0)) * 14;
      curRot += Math.cos(t * 2.5) * 0.04;
    }

    // Exit fade/shrink if near end
    const exitDur = o.exitDur || 0.2;
    if (age > dur - exitDur) {
      const exitP = (age - (dur - exitDur)) / exitDur;
      curAlpha *= clamp(1 - exitP);
      if (o.exitMotion === 'fly') curY -= exitP * 120;
      else if (o.exitMotion === 'drop') curY += exitP * 120;
    }

    if (curAlpha <= 0.01 || curScale <= 0.01) return;

    // Queue into letter compositor
    letter(txt, curX, curY, size * curScale, o.color || PAL.cream, {
      rot: curRot,
      alpha: curAlpha,
      font: o.font,
      align: o.align || 'center',
      stroke: o.stroke,
      screen: o.screen || false
    });

    // Optional neon glow
    if (o.glow) {
      glow(curX, curY, size * curScale * 0.8, o.glowColor || o.color || '#FFD166', (o.glowAlpha || 0.6) * curAlpha);
    }
  };

  // Lays a word out letter by letter so each letter can react on its own. Pure function of t.
  //   o.rot: tilt of the whole word · o.wave: idle wave amplitude (px)
  //   o.enter: seconds for the letters to arrive one after another from o.t0; o.enterStyle: 'drop' | 'pop' | 'rise'
  //   o.hits: [{ t, x }] impacts that make the letters near x dip and spring back
  //   o.shatter: { t, x, force } sends every letter flying on an arc · o.fade: { t, dur } fades the word out
  // Returns the letters' positions so characters can stand on them: { letters: [{ ch, x, y, w, top }], left, right, topAt(x) }.
  window.wordLetters = function(txt, x, y, size, t, o = {}) {
    const ctx = outX, chars = [...txt];
    ctx.save(); ctx.font = `${size}px "Permanent Marker", "Comic Sans MS", cursive`;
    const widths = chars.map(ch => ctx.measureText(ch).width), total = widths.reduce((a, b) => a + b, 0);
    ctx.restore();
    const wr = o.rot || 0, c = Math.cos(wr), s = Math.sin(wr);
    let cx = -total / 2;
    const letters = chars.map((ch, i) => {
      const w = widths[i], ox = cx + w / 2; cx += w;
      let oy = (o.wave || 0) * Math.sin(t * 4 + i * .7), rot = wr, alpha = 1, pop = null, sx = 0;
      if (o.enter) {
        const k = clamp((t - (o.t0 ?? 0) - i * o.enter / chars.length) / .25), style = o.enterStyle || 'drop';
        if (style === 'drop') { oy -= (1 - easeOut(k)) * size * 1.5; alpha *= clamp(k * 2); }
        else if (style === 'rise') { oy += (1 - easeOut(k)) * size * .8; alpha *= k; }
        else pop = k;
      }
      let lx = x + ox * c - oy * s, ly = y + ox * s + oy * c;
      for (const h of o.hits || []) {
        if (t < h.t) continue;
        const near = Math.exp(-Math.pow((lx - h.x) / (size * 1.2), 2));
        ly += near * size * .25 * Math.exp(-(t - h.t) * 7) * Math.cos((t - h.t) * 22);
      }
      if (o.fade && t > o.fade.t) alpha *= clamp(1 - (t - o.fade.t) / (o.fade.dur || .4));
      if (o.shatter && t >= o.shatter.t) {
        const q = o.shatter, a = t - q.t, dir = Math.sign(lx - q.x) || 1, f = q.force || 1;
        const vx = dir * (300 + 600 * Math.abs(lx - q.x) / (total || 1)) * f, vy = -(500 + 200 * hash(i * 3.1)) * f;
        lx += vx * a; ly += vy * a + 1400 * a * a; rot += dir * a * (4 + 3 * hash(i)); alpha *= clamp(1 - a / .9); sx = 1;
      }
      return { ch, x: lx, y: ly, w, top: sx ? -Infinity : ly - size * .42, rot, alpha, pop };
    });
    for (const L of letters) {
      if (L.alpha <= .01) continue;
      letter(L.ch, L.x, L.y, size, o.color || PAL.cream, { rot: L.rot, alpha: L.alpha, stroke: o.stroke, pop: L.pop, screen: o.screen });
    }
    const topAt = px => { let best = letters[0]; for (const L of letters) if (Math.abs(L.x - px) < Math.abs(best.x - px)) best = L; return best.top; };
    return { letters, left: x - total / 2 * c, right: x + total / 2 * c, topAt, x, y, size };
  };

  // Physical lyrics: every sung word lands somewhere on screen when it is sung, in a layout that changes line by line,
  // stays while its line is alive and leaves (shatter, fade or fall). Words are scene objects: the result lists the
  // words on screen with their positions, so characters can stand on them, hop across them or knock them away.
  //   lines: [{ t0, t1, words: [[t0, t1, word], ...] }] (LYRICS[id] from tools/sync_lyrics.py, or written by hand)
  //   o: { area: [x0, y0, x1, y1], size, colors, stroke, motion: 'drop'|'pop'|'rise', exit: 'shatter'|'fade'|'fall',
  //        maxWords (default 6: longer lines are split into phrases), hold (s after the line ends), wave, tilt, layouts: ['stairs','arc','scatter','stack'], hits: [{ t, x }],
  //        bounce (default true: each word dips as if landed on, just after it appears),
  //        textAt(t0) → overrides for a line starting at t0, e.g. t0 => moodAt(t0, sections).text }
  // Splits long lines (a transcription segment can hold a whole verse) into short phrases of at most `max` words,
  // cutting at sung pauses when there is one, so every phrase stays big and readable.
  window.splitPhrases = function(lines, max = 6, pause = .35) {
    const out = [];
    for (const L of lines) {
      if (!L.words || !L.words.length) continue;
      let cur = [];
      const size = Math.ceil(L.words.length / Math.ceil(L.words.length / max));   // even phrases: 7 words → 4 + 3, not 6 + 1
      L.words.forEach((w, i) => {
        cur.push(w);
        const next = L.words[i + 1], gap = next ? next[0] - w[1] : Infinity;
        if (!next || cur.length >= size || (gap > pause && cur.length >= 2)) { out.push({ t0: cur[0][0], t1: cur[cur.length - 1][1], words: cur }); cur = []; }
      });
    }
    return out;
  };

  window.physicalLyrics = function(t, lines, o = {}) {
    lines = splitPhrases(lines, o.maxWords || 6);
    const [ax0, ay0, ax1, ay1] = o.area || [160, 140, W - 160, H - 220];
    const onScreen = [];
    lines.forEach((L, li) => {
      if (!L.words || !L.words.length) return;
      // each line keeps the style it was born with, so a mood change never restyles words already on screen
      const q = o.textAt ? { ...o, ...o.textAt(L.words[0][0]) } : o;
      const hold = q.hold ?? .5, exit = q.exit || 'shatter', gone = L.t1 + hold;
      const cols = q.colors || [PAL.cream, PAL.ochre, PAL.rose], layouts = q.layouts || ['stairs', 'arc', 'scatter', 'stack'];
      if (t < L.words[0][0] - .05 || t > gone + 1) return;
      const n = L.words.length, layout = layouts[Math.floor(hash(li * 3.7) * layouts.length)];
      // sizes first (longer-held words are bigger), then one scale that makes the whole phrase fit the area,
      // then positions from the words' real widths so long words never overlap their neighbours
      const base = q.size || 110, aw = ax1 - ax0, ah = ay1 - ay0, gapK = .35;
      const raw = L.words.map(([a, b, word]) => base * (.8 + .6 * clamp((b - a - .2) / .6)) * (word.length <= 3 ? 1.15 : 1));
      const width = (i, sc) => L.words[i][2].length * raw[i] * sc * .62;
      const perRow = layout === 'stack' ? 1 : layout === 'scatter' ? 3 : n, rowsN = Math.ceil(n / perRow);
      const rowsOf = [...Array(rowsN)].map((_, r) => [...Array(Math.min(perRow, n - r * perRow))].map((_, j) => r * perRow + j));
      const rowW = (r, sc) => rowsOf[r].reduce((acc, i) => acc + width(i, sc) + base * sc * gapK, -base * sc * gapK);
      const widest = Math.max(...rowsOf.map((_, r) => rowW(r, 1))), tallest = Math.max(...raw);
      const vSpan = layout === 'stairs' || layout === 'arc' ? 1.8 : rowsN * 1.15;
      const sc = Math.min(1, aw * .96 / widest, ah / (vSpan * tallest));
      const place = [];
      rowsOf.forEach((row, r) => {
        let cx = ax0 + (aw - rowW(r, sc)) / 2;
        for (const i of row) { const w = width(i, sc); place[i] = { cx: cx + w / 2, w }; cx += w + base * sc * gapK; }
      });
      L.words.forEach(([a, b, word], wi) => {
        if (t < a - .02) return;
        const hs = hash(li * 17 + wi * 5.3), { cx, w } = place[wi], k = (cx - ax0) / aw, row = Math.floor(wi / perRow);
        const rowY = rowsN > 1 ? lerp(ay0 + tallest * sc * .6, ay1 - tallest * sc * .5, row / (rowsN - 1)) : (ay0 + ay1) / 2;
        let x = cx, y;
        if (layout === 'stairs') y = lerp(ay1 - tallest * sc * .5, ay0 + tallest * sc * .6, k);
        else if (layout === 'arc') y = lerp(ay1 - tallest * sc * .5, ay0 + tallest * sc * .6, .25 + .75 * Math.sin(k * Math.PI));
        else if (layout === 'stack') { x = lerp(ax0 + w / 2, ax1 - w / 2, .3 + .4 * hs); y = rowY; }
        else y = rowY + (hs - .5) * tallest * sc * .3;
        const size = raw[wi] * sc;
        const rot = (q.tilt ?? .35) * (hash(li * 7 + wi * 13) - .5);
        const lo = { rot, color: cols[(li + wi) % cols.length], stroke: q.stroke || PAL.ink, wave: q.wave || 0, enter: .18, t0: a, enterStyle: q.motion || 'drop',
          hits: [...(q.bounce === false ? [] : [{ t: a + .2, x }]), ...(q.hits || [])] };
        if (exit === 'shatter') lo.shatter = { t: gone + wi * .04, x: (ax0 + ax1) / 2 };
        else if (exit === 'fade') lo.fade = { t: gone, dur: .5 };
        const fall = exit === 'fall' && t > gone ? 1400 * Math.pow(t - gone - wi * .05, 2) * (t > gone + wi * .05 ? 1 : 0) : 0;
        const wl = wordLetters(word, x, y + fall, size, t, lo);
        onScreen.push({ word, t0: a, t1: b, line: li, x, y: y + fall, size, top: wl.topAt(x), wl, sung: t >= a && t < b });
      });
    });
    return onScreen;
  };

  // A character hopping from word to word, landing on each one as it is sung. Returns { x, y, air, k } for the feet;
  // spread jump-like squash yourself from `air`. Falls back to `home` when no word is on screen.
  window.hopAcross = function(t, words, home = [W / 2, H - 200], flight = .3) {
    const seq = words.filter(w => w.top > -1e6).sort((a, b) => a.t0 - b.t0);
    let cur = null, prev = null;
    for (const w of seq) { if (w.t0 <= t) { prev = cur; cur = w; } }
    if (!cur) return { x: home[0], y: home[1], air: 0, k: 1 };
    const land = [cur.x, cur.top], from = prev ? [prev.x, prev.top] : home, k = clamp((t - (cur.t0 - flight * .2)) / flight);
    if (k >= 1) return { x: land[0], y: land[1], air: 0, k: 1 };
    const [x, y] = arcPt(from, land, 90 + Math.abs(land[0] - from[0]) * .15, ease(k));
    return { x, y, air: Math.sin(Math.PI * k), k };
  };

  // Staggers an array of kinetic words across time to match rhythmic phrasing
  window.kineticPhrase = function(words, t, startT, wordDuration = 0.5, o = {}) {
    words.forEach((w, idx) => {
      const wStart = startT + idx * (o.stagger || 0.28);
      const wEnd = wStart + wordDuration + (o.hold || 0.8);
      if (t >= wStart && t < wEnd + 0.3) {
        const offsetIdx = idx - (words.length - 1) / 2;
        const wx = (o.x || 960) + offsetIdx * (o.spacing || 180);
        const wy = (o.y || 480) + (o.stairY ? offsetIdx * o.stairY : 0);
        kineticWord(w, wx, wy, o.size || 56, t, {
          t0: wStart,
          t1: wEnd,
          color: o.colors ? o.colors[idx % o.colors.length] : (o.color || '#FFD166'),
          stroke: o.stroke || '#0D1127',
          motion: o.motion || 'slam',
          ...o
        });
      }
    });
  };
})();
