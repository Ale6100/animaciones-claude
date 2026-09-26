# Choreography & Visual Styles Reference

This guide preserves the exact techniques, formulas, and helper functions discovered while bridging **John Heibel's** organic watercolor world with **Donald Jewkes'** high-energy K-pop music video paradigm. These are ingredients of the adaptive music video (see the README): use them when a section's mood calls for them.

---

## 1. Group Staging & Synchronization (K-Pop Dance Unit)

In Donald Jewkes' style, Clawd doesn't perform alone; he leads a 3-member pop dance unit.

### Layout & Sizing
* **Lead Superstar (Clawd)**: Center stage at $x = 960, y = 820$, size unit $u = 21 - 23$. Wears sunglasses (`eyes: 'shades'`) during drops.
* **Stage Right Dancer ("Kai")**: $x = 520 - 540, y = 820$, size unit $u = 18 - 19$. Distinct accessory: `hat: 'beanie'`, `tint: 'rosy'`.
* **Stage Left Dancer ("Rin")**: $x = 1380 - 1400, y = 820$, size unit $u = 18 - 19$. Distinct accessory: `hat: 'headphones'`, `tint: 'violet'`.

### Entrance Dynamics
Dancers enter on a build-up using squash-and-stretch anticipation:
```javascript
const dancerJump = jump(t, tDrop, tDrop + 0.6, 8);
clawd(dancerX, dancerY, 18, {
  ...dancerJump,
  view: 'front',
  hat: 'beanie',
  eyes: 'wide',
  emote: '!'
});
```

### Beat-Locked Choreography
All dancers lock to `PROJECT.bpm` using `move(style, t)`:
* **Pre-Chorus**: `move('roof', t)` (both arms pumping skyward) or `move('shimmy', t)`.
* **Chorus Drop**: `move('hop', t)` (energetic synchronized jumping) or `move('bounce', t)`.
* **Synchronized Turn**: `turn(t, tStart, tEnd, heading0, heading1)` applied to all three dancers at the identical time interval.

---

## 2. Concert Lighting & Atmospheric Effects

### Stage Spotlights
Three conical light beams (cyan, pink, gold) sweeping across the floor with soft glow:
```javascript
function drawConcertSpotlights(t, intensity = 1) {
  if (intensity <= 0) return;
  const lights = [
    { originX: 200, originY: -60, targetX: 960 + Math.sin(t * 2.2) * 440, targetY: 820, col: '#00D8FE', r: 210 },
    { originX: 1720, originY: -60, targetX: 960 - Math.sin(t * 2.2) * 440, targetY: 820, col: '#FF4081', r: 210 },
    { originX: 960, originY: -80, targetX: 960 + Math.cos(t * 1.6) * 300, targetY: 810, col: '#FFD166', r: 260 },
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
```

### Beat Shockwaves
Expanding concentric ellipses triggered at the feet on kick drum beats:
```javascript
function drawBeatShockwave(t, cx, cy, col = '#00D8FE') {
  const bp = bpOf(t);
  const f = frac(bp);
  const r = f * 340;
  const op = 1 - f;
  if (op > 0.05) {
    paint(ellPts(cx, cy, r * 1.3, r * 0.42, 24), {
      wash: null,
      ink: col,
      sw: 2.6 * op
    });
  }
}
```

---

## 3. Abstract Fluid Motion Graphics (Navier-Stokes)

Luminous sinusoidal ribbons representing latent tensor manifolds ($Q, K, V$):
```javascript
function drawFluidField(t, alpha = 1) {
  if (alpha <= 0) return;
  const cols = ['#00D8FE', '#FF4081', '#FFD166', '#A855F7'];
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

    // Flowing attention token
    const partPhase = frac(t * 0.5 + j * 0.25);
    const px = lerp(100, W - 100, partPhase);
    const py = yBase + Math.sin(px * 0.0035 + t * speed + j * 1.4) * 42;
    paint(ellPts(px, py, 8, 8, 12), { wash: '#FFD166', fill: '#FFFFFF', fillOp: 200, ink: PAL.ink, sw: 1 });
    glow(px, py, 24, col, 0.5 * alpha);
  }
}
```

---

## 4. Kinetic Typography Badges

In K-pop music videos, text does not wander across empty space; it appears within high-contrast neon badges that pop with `backOut`:
```javascript
function drawKineticBadge(txt, x, y, scaleProgress, textColor, badgeBorderColor) {
  if (scaleProgress <= 0.05) return;
  push();
  translate(x, y);
  scale(scaleProgress);
  paint(rrPts(-360, -45, 720, 90, 16, 2), {
    wash: '#0F1226', washOp: 235, fill: badgeBorderColor, fillOp: 60, ink: badgeBorderColor, sw: 2
  });
  pop();
  letter(txt, x, y, 48, textColor, { font: '900 46px "Permanent Marker", sans-serif' });
}
```

---

## 5. Audio Truth & Workflow Rules

1. **TTS is not singing**: Never use standard Python text-to-speech to mimic pop singing. TTS generates monotonous spoken prose.
2. **Use real vocal tracks**: Use AI music services (Suno, Udio) or pre-recorded vocal songs.
3. **Timestamp Matching**:
   * Inspect the exact start/end second of each vocal line in the audio track.
   * Mirror those exact numbers in `src/lyrics.js` for karaoke pills.
   * Keyframe the character mouth and choreography in the scene file to coincide with those exact timestamps.
