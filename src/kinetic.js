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
