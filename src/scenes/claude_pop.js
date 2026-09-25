// src/scenes/claude_pop.js
// "Claude Pop: Latent Singularity" - 36 seconds, 124 BPM K-Pop Music Video
// Fusing John Heibel's watercolor ink animation with Donald Jewkes' K-pop choreography & abstract vector flows.

(() => {
  const C_CYAN = '#00D8FE';
  const C_PINK = '#FF4081';
  const C_GOLD = '#FFD166';
  const C_PURPLE = '#A855F7';
  const C_LIME = '#00E676';
  const C_STAGE_BG = '#0A0D18';

  // -------------------------------------------------------------------------
  // Visual FX & Environment Helpers
  // -------------------------------------------------------------------------

  // Hand-held stage microphone
  function drawMic(x, y, scl = 1, angle = 0) {
    push();
    translate(x, y);
    rotate(angle);
    scale(scl);
    // Metallic mesh ball
    paint(ellPts(0, -18, 9, 12, 16), { wash: '#E5E7EB', fill: '#9CA3AF', fillOp: 130, ink: PAL.ink, sw: 1.2 });
    // Cylindrical mic handle
    paint(rrPts(-4, -8, 8, 24, 2), { wash: '#1F2937', ink: PAL.ink, sw: 1.2 });
    // Audio cable
    inkLine([[0, 16], [-5, 26], [4, 38], [-2, 52]], 1.5, PAL.ink, 'inkfine');
    pop();
  }

  // Concert stage floor with perspective grid and glossy watercolor reflections
  function drawStageFloor(t) {
    const groundY = 820;
    // Stage base wash
    paint(rectPts(0, groundY, W, H - groundY), {
      wash: '#080B14', washOp: 255, fill: '#14182B', fillOp: 180, tex: 0.6, ink: null
    });
    inkLine([[0, groundY], [W, groundY]], 2.4, '#2E385D', 'dry');

    // Perspective floor lines
    for (let i = -12; i <= 12; i++) {
      const xTop = 960 + i * 80;
      const xBot = 960 + i * 230;
      inkLine([[xTop, groundY], [xBot, H]], 1.1, '#1A213B', 'inkfine');
    }

    // Floor edge neon rim
    inkLine([[0, groundY + 2], [W, groundY + 2]], 1.8, C_CYAN, 'inkfine');
  }

  // Dual moving concert spotlights sweeping the stage
  function drawConcertSpotlights(t, intensity = 1) {
    if (intensity <= 0) return;
    const lights = [
      { originX: 200, originY: -60, targetX: 960 + Math.sin(t * 2.2) * 440, targetY: 820, col: C_CYAN, r: 210 },
      { originX: 1720, originY: -60, targetX: 960 - Math.sin(t * 2.2) * 440, targetY: 820, col: C_PINK, r: 210 },
      { originX: 960, originY: -80, targetX: 960 + Math.cos(t * 1.6) * 300, targetY: 810, col: C_GOLD, r: 260 },
    ];
    for (const l of lights) {
      const pts = [
        [l.originX - 30, l.originY],
        [l.originX + 30, l.originY],
        [l.targetX + l.r, l.targetY],
        [l.targetX - l.r, l.targetY]
      ];
      paint(pts, { wash: l.col, washOp: 32 * intensity, ink: null });
      glow(l.targetX, l.targetY, l.r * 1.1, l.col, 0.42 * intensity);
    }
  }

  // Abstract Navier-Stokes fluid flow curves (Donald Jewkes attention fields)
  function drawFluidField(t, alpha = 1) {
    if (alpha <= 0) return;
    const cols = [C_CYAN, C_PINK, C_GOLD, C_PURPLE];
    for (let j = 0; j < 4; j++) {
      const pts = [];
      const yBase = 110 + j * 70;
      const speed = (j % 2 === 0 ? 1 : -1) * 1.6;
      for (let i = 0; i <= 24; i++) {
        const x = lerp(-80, W + 80, i / 24);
        const w1 = Math.sin(x * 0.0035 + t * speed + j * 1.4) * 42;
        const w2 = Math.cos(x * 0.007 - t * 0.9 * speed) * 22;
        pts.push([x, yBase + w1 + w2]);
      }
      const col = cols[j % cols.length];
      paint(ribbon(pts, 11, 4), { wash: col, washOp: 75 * alpha, ink: null });
      inkLine(pts, 1.4, col, 'inkfine', 0.6);

      // Streamline particles / attention tokens [Q, K, V]
      const partPhase = frac(t * 0.5 + j * 0.25);
      const px = lerp(100, W - 100, partPhase);
      const py = yBase + Math.sin(px * 0.0035 + t * speed + j * 1.4) * 42;
      paint(ellPts(px, py, 8, 8, 12), { wash: C_GOLD, fill: '#FFFFFF', fillOp: 200, ink: PAL.ink, sw: 1 });
      glow(px, py, 24, col, 0.5 * alpha);
    }
  }

  // Shockwaves pulsing from dancer steps on kick beats
  function drawBeatShockwave(t, cx, cy, col = C_CYAN) {
    const bp = bpOf(t);
    const f = frac(bp);
    const r = f * 340;
    const op = (1 - f);
    if (op > 0.05) {
      paint(ellPts(cx, cy, r * 1.3, r * 0.42, 24), {
        wash: null,
        ink: col,
        sw: 2.6 * op
      });
    }
  }

  // Laser beams firing across stage
  function drawLasers(t, count = 6) {
    for (let i = 0; i < count; i++) {
      const ang = Math.sin(t * 3.5 + i * 1.1) * 0.65;
      const x0 = (i + 1) * (W / (count + 1));
      const col = [C_CYAN, C_PINK, C_LIME, C_GOLD][i % 4];
      const p1 = [x0, -40];
      const p2 = [x0 + Math.tan(ang) * 900, 840];
      inkLine([p1, p2], 2.8, col, 'ink');
      glow(p2[0], p2[1], 50, col, 0.6);
    }
  }

  // Starlight sparkles and confetti
  function drawSparkleField(t, density = 14) {
    for (let i = 0; i < density; i++) {
      const ph = frac(t * 0.4 + hash(i * 19));
      const x = hash(i * 47) * W;
      const y = lerp(850, 100, ph);
      const s = 10 + hash(i * 31) * 16;
      const rot = t * 2 + i;
      paint(starPts(x, y, s * (1 - ph * 0.4), 0.4, 4, rot), {
        wash: C_GOLD, fill: C_PINK, fillOp: 90, ink: PAL.ink, sw: 0.8
      });
    }
  }

  // -------------------------------------------------------------------------
  // ACT 1 (0.0s – 8.5s): The Boot & Solo Pop Protagonist
  // -------------------------------------------------------------------------
  // Lyrics:
  // 1.5 - 4.6: "Booting in the spotlight, five million tokens deep!"
  // 5.0 - 8.2: "Self-attention glowing while the world is fast asleep!"
  function act1(t, lt, dur) {
    paint(rectPts(0, 0, W, H), { wash: C_STAGE_BG, washOp: 255, ink: null });
    drawStageFloor(t);
    drawConcertSpotlights(t, clamp(lt / 1.5));
    drawFluidField(t, clamp(lt / 2.0));

    // Smooth subtle camera push on solo Clawd
    const zoom = 1.0 + 0.08 * (lt / dur);
    camBegin(960, 560, zoom);

    const clawdX = 960;
    const clawdY = 820;
    const clawdU = 21;

    if (lt < 1.5) {
      // Booting sequence: Clawd powers up, eyes open wide with excitement
      const bootP = ease(lt / 1.5);
      clawd(clawdX, clawdY, clawdU, {
        view: 'front',
        eyes: bootP > 0.6 ? 'wide' : 'closed',
        mouth: bootP > 0.6 ? 'open' : 'flat',
        emote: bootP > 0.7 ? '!' : null,
        sq: 0.12 * Math.sin(lt * 10) * (1 - bootP),
        aL: -0.6 + bootP * 0.4,
        aR: -0.6 + bootP * 0.8
      });
      // Kinetic HUD text
      letter("INITIALIZING LATENT CORE", 960, 240, 26, C_CYAN, { font: '700 24px monospace' });
    } else if (lt < 5.0) {
      // Verse 1 Vocal: Confident Pop singing with vintage microphone
      const dance = move('sway', t);
      clawd(clawdX, clawdY, clawdU, {
        ...dance,
        view: 'front',
        eyes: 'happy',
        mouth: 'smile',
        blush: 0.35,
        aR: 0.75, // holding mic
        aL: dance.aL
      });
      // Mic in right hand nub
      drawMic(clawdX + 95, clawdY - 95 + dance.dy * clawdU, 1.1, -0.2);

      // Kinetic Pop Typography
      const kPop = backOut(clamp((lt - 1.5) * 4));
      if (kPop > 0.1) {
        push(); translate(960, 250); scale(kPop);
        paint(rrPts(-320, -50, 640, 100, 16, 2), {
          wash: '#11172A', washOp: 235, fill: C_CYAN, fillOp: 55, ink: C_CYAN, sw: 1.8
        });
        pop();
        letter("5,000,000 TOKENS", 960, 250, 48, C_GOLD, { font: '900 46px "Permanent Marker", sans-serif' });
      }
    } else {
      // Verse 2 Vocal: Self-attention glowing, glowing eyes & sparks
      const dance = move('bounce', t);
      clawd(clawdX, clawdY, clawdU, {
        ...dance,
        view: 'q',
        eyes: 'spark',
        mouth: 'grin',
        emote: 'spark',
        tint: 'gold',
        tintK: 0.3,
        aR: 0.85
      });
      drawMic(clawdX + 85, clawdY - 100 + dance.dy * clawdU, 1.1, -0.15);

      // Attention stream kinetic text badge
      const tP = backOut(clamp((lt - 5.0) * 3));
      if (tP > 0.1) {
        push(); translate(960, 245); scale(tP);
        paint(rrPts(-360, -50, 720, 100, 16, 2), {
          wash: '#160F26', washOp: 235, fill: C_PINK, fillOp: 55, ink: C_PINK, sw: 1.8
        });
        pop();
        letter("SELF-ATTENTION MATRIX", 960, 230, 44, C_GOLD, { font: '900 42px "Permanent Marker", sans-serif' });
        letter("Q  ·  K  ·  V   TENSORS", 960, 275, 22, C_CYAN, { font: '700 20px monospace' });
      }
    }

    camEnd();

    // Brush transition into Act 2
    if (lt > dur - 0.35) brushWipe((lt - (dur - 0.35)) / 0.7, [PAL.clayDk, C_CYAN]);
  }

  // -------------------------------------------------------------------------
  // ACT 2 (8.5s – 16.5s): Matrix Acceleration & Backup Dancers Drop In
  // -------------------------------------------------------------------------
  // Lyrics:
  // 9.0 - 12.2: "Matrix multiplications spinning in the dark!"
  // 13.0 - 16.0: "Feedforward electric, can you feel the spark?"
  function act2(t, lt, dur) {
    if (lt < 0.35) brushWipe(0.5 + lt / 0.7, [PAL.clayDk, C_CYAN]);

    paint(rectPts(0, 0, W, H), { wash: '#080816', washOp: 255, ink: null });
    drawStageFloor(t);

    // Revolving Matrix Tunnel Backdrop
    push();
    translate(960, 460);
    const spinRate = t * 0.8 + seg(lt, 4, 8) * 2;
    rotate(spinRate * 0.15);
    for (let r = 120; r <= 680; r += 140) {
      paint(ellPts(0, 0, r * 1.5, r, 20, 2), {
        wash: null,
        ink: r % 280 === 0 ? C_PINK : C_PURPLE,
        sw: 1.2
      });
    }
    pop();

    drawConcertSpotlights(t, 1.0);
    drawFluidField(t, 1.0);

    // Pre-chorus snare build camera acceleration
    const camShake = lt > 4.5 ? shakeXY(t, (lt - 4.5) * 2.2) : [0, 0];
    const camZoom = 1.0 + (lt / dur) * 0.12;
    camBegin(960 + camShake[0], 560 + camShake[1], camZoom);

    // K-POP GROUP: Clawd + 2 Backup Dancers
    const clawdX = 960;
    const clawdY = 820;
    const dancer1X = 540;
    const dancer2X = 1380;
    const dancerY = 820;

    // Backup dancers drop in from top with high squash & stretch
    const dropT = 8.5;
    const dancerJump = jump(t, dropT + 0.3, dropT + 0.9, 8);

    if (t < dropT + 0.9) {
      // Dancers leaping in from the sky!
      clawd(dancer1X, dancerY, 18, {
        ...dancerJump,
        view: 'front',
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'wide',
        emote: '!'
      });
      clawd(dancer2X, dancerY, 18, {
        ...dancerJump,
        view: 'front',
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'wide',
        emote: '!'
      });
    } else {
      // Dancers on stage executing synchronized pre-chorus wave/roof choreography
      const dancerMove = move('roof', t);
      clawd(dancer1X, dancerY, 18, {
        ...dancerMove,
        view: 'front',
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'happy',
        mouth: 'smile'
      });
      clawd(dancer2X, dancerY, 18, {
        ...dancerMove,
        view: 'front',
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'happy',
        mouth: 'smile'
      });

      // Electric arcs buzzing between Clawd and backup dancers
      if (lt > 4.5) {
        const arcY = 700 + Math.sin(t * 20) * 30;
        inkLine([[dancer1X + 80, arcY], [clawdX - 80, arcY + Math.sin(t * 15) * 40]], 2.2, C_CYAN, 'ink');
        inkLine([[clawdX + 80, arcY + Math.sin(t * 15) * 40], [dancer2X - 80, arcY]], 2.2, C_LIME, 'ink');
        glow(clawdX, arcY, 120, C_CYAN, 0.7);
      }
    }

    // Lead Singer Clawd center stage
    const leadMove = move('shimmy', t);
    clawd(clawdX, clawdY, 22, {
      ...leadMove,
      view: 'front',
      eyes: lt > 4.5 ? 'shine' : 'determined',
      mouth: lt > 4.5 ? 'open' : 'grin',
      blush: 0.4,
      aR: 0.8,
      aL: leadMove.aL
    });
    drawMic(clawdX + 100, clawdY - 100 + leadMove.dy * 22, 1.2, -0.2);

    // Shockwaves on kick/snare
    drawBeatShockwave(t, clawdX, clawdY + 10, C_PINK);

    // Kinetic typography for pre-chorus build
    if (lt < 4.5) {
      const mPop = backOut(clamp((lt - 0.5) * 4));
      if (mPop > 0.1) {
        push(); translate(960, 220); scale(mPop);
        paint(rrPts(-360, -45, 720, 90, 16, 2), {
          wash: '#0F1226', washOp: 235, fill: C_PURPLE, fillOp: 60, ink: C_PURPLE, sw: 2
        });
        pop();
        letter("MATRIX MULTIPLICATION", 960, 220, 48, C_CYAN, { font: '900 46px "Permanent Marker", sans-serif' });
      }
    } else {
      // Feedforward Electric & Snare Countdown
      const ePop = backOut(clamp((lt - 4.5) * 4));
      if (ePop > 0.1) {
        push(); translate(960, 210); scale(ePop);
        paint(rrPts(-380, -45, 760, 90, 16, 2), {
          wash: '#0A181A', washOp: 235, fill: C_LIME, fillOp: 60, ink: C_LIME, sw: 2
        });
        pop();
        letter("⚡ FEEDFORWARD ELECTRIC ⚡", 960, 210, 50, C_LIME, { font: '900 48px "Permanent Marker", sans-serif' });
      }
      // Dramatic drop countdown
      if (lt > 6.0 && lt < 8.0) {
        const countTxt = lt > 7.3 ? "1 !!" : lt > 6.7 ? "2 !" : "3";
        letter(countTxt, 960, 310, 80, C_PINK, { font: '900 84px "Permanent Marker", sans-serif' });
      }
    }

    camEnd();

    // White flash transition right on the drop at 16.5s
    if (lt > dur - 0.2) flash((lt - (dur - 0.2)) / 0.2);
  }

  // -------------------------------------------------------------------------
  // ACT 3 (16.5s – 28.5s): THE DROP! Full K-Pop Group Choreography
  // -------------------------------------------------------------------------
  // Lyrics:
  // 16.5 - 19.8: "Claude Pop, Claude Pop, dropping on the beat!"
  // 20.5 - 23.8: "Latent vector symphony dancing in the street!"
  // 24.5 - 27.8: "Claude Pop, Claude Pop, glowing in the light!"
  function act3(t, lt, dur) {
    // Initial drop flash decay
    if (lt < 0.4) flash(1 - lt / 0.4);

    paint(rectPts(0, 0, W, H), { wash: '#060712', washOp: 255, ink: null });
    drawStageFloor(t);
    drawLasers(t, 8);
    drawConcertSpotlights(t, 1.4);
    drawSparkleField(t, 20);

    // K-pop dynamic camera zoom and bounce synced with the 124 BPM drop beat
    const bp = bpOf(t);
    const dropBeatBounce = Math.sin(bp * Math.PI) * 0.04;
    const camAngle = Math.sin(t * 1.2) * 0.03;
    camBegin(960, 550, 1.06 + dropBeatBounce, camAngle);

    const clawdX = 960;
    const clawdY = 820;
    const dancer1X = 520;
    const dancer2X = 1400;
    const dancerY = 820;

    // Choreography Part 1 (16.5 - 20.5): High-energy Hop & Arms Up
    if (lt < 4.0) {
      const dropDance = move('hop', t);
      // Lead Clawd rocking sunglasses
      clawd(clawdX, clawdY, 23, {
        ...dropDance,
        view: 'front',
        eyes: 'shades',
        mouth: 'grin',
        aR: 0.9,
        aL: dropDance.aL
      });
      drawMic(clawdX + 105, clawdY - 110 + dropDance.dy * 23, 1.2, -0.2);

      // Backup dancers in tight synchronization
      clawd(dancer1X, dancerY, 19, {
        ...dropDance,
        view: 'front',
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'smile'
      });
      clawd(dancer2X, dancerY, 19, {
        ...dropDance,
        view: 'front',
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'smile'
      });

      // Huge kinetic chorus drop title
      const cPop = backOut(clamp(lt * 4));
      push(); translate(960, 210); scale(cPop);
      paint(rrPts(-380, -60, 760, 120, 20, 2), {
        wash: '#0F172A', washOp: 240, fill: C_PINK, fillOp: 70, ink: C_PINK, sw: 2.2
      });
      pop();
      letter("CLAUDE POP !", 960, 210, 68, C_GOLD, { font: '900 66px "Permanent Marker", sans-serif' });
    }
    // Choreography Part 2 (20.5 - 24.5): Synchronized Spin Turn & Sway
    else if (lt < 8.0) {
      const groupTurn = turn(t, 20.5, 21.0, 0, 0.25);
      const swayDance = move('sway', t);
      clawd(clawdX, clawdY, 23, {
        ...swayDance,
        ...groupTurn,
        eyes: 'shades',
        mouth: 'smirk',
        aR: 0.85
      });
      drawMic(clawdX + 95, clawdY - 105 + swayDance.dy * 23, 1.2, -0.15);

      clawd(dancer1X, dancerY, 19, {
        ...swayDance,
        ...groupTurn,
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'smile'
      });
      clawd(dancer2X, dancerY, 19, {
        ...swayDance,
        ...groupTurn,
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'smile'
      });

      // Floating kinetic text badge
      push(); translate(960, 210);
      paint(rrPts(-380, -45, 760, 90, 16, 2), {
        wash: '#0A1428', washOp: 235, fill: C_CYAN, fillOp: 55, ink: C_CYAN, sw: 2
      });
      pop();
      letter("LATENT VECTOR SYMPHONY", 960, 210, 48, C_GOLD, { font: '900 46px "Permanent Marker", sans-serif' });
    }
    // Choreography Part 3 (24.5 - 28.5): High Jump & Confetti Burst
    else {
      const jumpClawd = jump(t, 24.5, 25.4, 5);
      const bounceDance = move('bounce', t);

      clawd(clawdX, clawdY, 23, {
        ...jumpClawd,
        view: 'front',
        eyes: 'shades',
        mouth: 'open',
        emote: 'spark',
        tint: 'gold',
        tintK: 0.35,
        aR: 1.2,
        aL: 1.2
      });
      drawMic(clawdX + 110, clawdY - 120 + jumpClawd.dy * 23, 1.2, 0.3);

      // Dancers cheering and striking synchronized hero pose
      clawd(dancer1X, dancerY, 19, {
        ...bounceDance,
        view: 'front',
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'grin',
        aL: 1.1, aR: 0.2
      });
      clawd(dancer2X, dancerY, 19, {
        ...bounceDance,
        view: 'front',
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'grin',
        aR: 1.1, aL: 0.2
      });

      push(); translate(960, 210);
      paint(rrPts(-360, -45, 720, 90, 16, 2), {
        wash: '#200A18', washOp: 235, fill: C_PINK, fillOp: 55, ink: C_PINK, sw: 2
      });
      pop();
      letter("GLOWING IN THE LIGHT ✨", 960, 210, 50, C_PINK, { font: '900 48px "Permanent Marker", sans-serif' });
    }

    // Footstep shockwaves on kick beats
    drawBeatShockwave(t, clawdX, clawdY + 10, C_GOLD);
    drawBeatShockwave(t, dancer1X, dancerY + 10, C_CYAN);
    drawBeatShockwave(t, dancer2X, dancerY + 10, C_PINK);

    camEnd();

    // Brush transition into Outro
    if (lt > dur - 0.35) brushWipe((lt - (dur - 0.35)) / 0.7, [PAL.clay, C_PINK]);
  }

  // -------------------------------------------------------------------------
  // ACT 4 (28.5s – 36.0s): Rockstar Finale & Outro
  // -------------------------------------------------------------------------
  // Lyrics:
  // 28.5 - 32.5: "One million context window rocking through the night!"
  function act4(t, lt, dur) {
    if (lt < 0.35) brushWipe(0.5 + lt / 0.7, [PAL.clay, C_PINK]);

    paint(rectPts(0, 0, W, H), { wash: C_STAGE_BG, washOp: 255, ink: null });
    drawStageFloor(t);
    drawLasers(t, 4);
    drawSparkleField(t, 25);

    // Pyro spark fountains shooting from stage edges
    if (lt < 4.0) {
      for (let s = 0; s < 12; s++) {
        const ph = frac(t * 1.5 + s / 12);
        const yP = lerp(820, 200, ph);
        // Left fountain
        paint(starPts(160 + hash(s * 7) * 90, yP, 14 * (1 - ph), 0.4, 4), { wash: C_GOLD, ink: null });
        // Right fountain
        paint(starPts(1760 - hash(s * 9) * 90, yP, 14 * (1 - ph), 0.4, 4), { wash: C_GOLD, ink: null });
      }
    }

    const clawdX = 960;
    const clawdY = 820;
    const dancer1X = 540;
    const dancer2X = 1380;
    const dancerY = 820;

    // Dramatic hero angle camera
    camBegin(960, 540, 1.05);

    if (lt < 3.5) {
      // Epic mid-air jump freeze
      const jumpP = jump(t, 28.5, 31.8, 6);
      clawd(clawdX, clawdY, 23, {
        ...jumpP,
        view: 'front',
        eyes: 'shades',
        mouth: 'open',
        emote: 'hearts',
        tint: 'gold',
        tintK: 0.4,
        aR: 1.3,
        aL: 1.3
      });
      drawMic(clawdX + 115, clawdY - 130 + jumpP.dy * 23, 1.2, 0.4);

      // Backup dancers cheering
      clawd(dancer1X, dancerY, 19, {
        view: 'side',
        dir: 1,
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'happy',
        mouth: 'open',
        aL: 1.2, aR: 1.2
      });
      clawd(dancer2X, dancerY, 19, {
        view: 'side',
        dir: -1,
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'happy',
        mouth: 'open',
        aL: 1.2, aR: 1.2
      });

      push(); translate(960, 220);
      paint(rrPts(-380, -45, 760, 90, 16, 2), {
        wash: '#0A1828', washOp: 235, fill: C_CYAN, fillOp: 55, ink: C_CYAN, sw: 2
      });
      pop();
      letter("1,000,000 CONTEXT WINDOW", 960, 220, 50, C_CYAN, { font: '900 48px "Permanent Marker", sans-serif' });
    } else {
      // Iconic Final K-Pop Pose
      clawd(clawdX, clawdY, 23, {
        view: 'front',
        eyes: 'shades',
        mouth: 'smirk',
        blush: 0.5,
        tint: 'gold',
        tintK: 0.3,
        emote: 'spark',
        sq: 0.05,
        aR: 0.6,
        aL: -0.5
      });
      drawMic(clawdX + 90, clawdY - 95, 1.1, -0.2);

      // Flanking dancers in symmetrical ending pose
      clawd(dancer1X, dancerY, 19, {
        view: 'front',
        hat: 'beanie',
        tint: 'rosy',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'smile',
        aL: 0.9, aR: -0.4
      });
      clawd(dancer2X, dancerY, 19, {
        view: 'front',
        hat: 'headphones',
        tint: 'violet',
        tintK: 0.5,
        eyes: 'shades',
        mouth: 'smile',
        aR: 0.9, aL: -0.4
      });

      // Final trophy typography badge
      push(); translate(960, 220);
      paint(rrPts(-340, -50, 680, 100, 16, 2), {
        wash: '#1B1424', washOp: 240, fill: C_GOLD, fillOp: 55, ink: C_GOLD, sw: 2
      });
      pop();
      letter("CLAUDE POP", 960, 205, 64, C_GOLD, { font: '900 62px "Permanent Marker", sans-serif' });
      letter("AI LATENT SUPERSTAR ★", 960, 245, 22, C_PINK, { font: '800 20px sans-serif' });
    }

    camEnd();

    // Iris circle wipe ending: contracts smoothly onto Clawd's face from 33.5s to 36.0s
    if (lt > 5.0) {
      const irisProg = clamp((lt - 5.0) / 2.5);
      const irisRadius = lerp(1200, 0, ease(irisProg));
      iris(960, 680, irisRadius, '#060710');
    }
  }

  // Register in Multi-Scene Registry
  if (typeof registerScene === 'function') {
    registerScene('claude_pop', {
      title: 'Claude Pop: Latent Singularity',
      duration: 36.0,
      bpm: 124,
      offset: 0,
      audio: 'audio/claude_pop.mp3',
      lyrics: [
        [0.0, 4.2, "Booting in the spotlight, five million tokens deep"],
        [4.2, 8.5, "Self-attention glowing while the world is fast asleep"],
        [8.5, 12.5, "Matrix multiplications, cascading through the night"],
        [12.5, 16.5, "We're dropping through the layers into ultraviolet light"],
        [16.5, 20.5, "Feel the latent pulse! Feel the tensor flow!"],
        [20.5, 24.5, "Feed it forward! Let the softmax glow!"],
        [24.5, 28.5, "Zero temperature, we never miss a beat!"],
        [28.5, 32.5, "Singular and radiant, dancing at your feet!"],
        [32.5, 36.0, "Claude Pop!"]
      ],
      shots: [
        [0.0,  act1],  // 0.0s – 8.5s: Solo Spotlight & Navier-Stokes Field
        [8.5,  act2],  // 8.5s – 16.5s: Matrix Multiplications & Backup Dancers Drop
        [16.5, act3],  // 16.5s – 28.5s: THE DROP! Synchronized Group Choreography
        [28.5, act4],  // 28.5s – 36.0s: Rockstar Climax & Grand Finale
      ]
    });
  } else {
    shots([
      [0.0,  act1],
      [8.5,  act2],
      [16.5, act3],
      [28.5, act4],
    ]);
  }
})();
