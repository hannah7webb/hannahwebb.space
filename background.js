(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  // Warm base color shows instantly before the first frame renders — prevents white flash on navigation
  canvas.style.cssText = 'position:fixed;top:0;left:0;z-index:-1;pointer-events:none;background-color:#E0B078;';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  const COLS = 16, ROWS = 10, AMP = 22;
  const PAD = AMP * 2;

  const TL = [232, 184,  96];
  const TR = [232, 150, 110];
  const BL = [232, 160, 184];
  const BR = [200, 120, 152];

  let W, H, verts;

  // Restore t from the previous page, advancing it by however long navigation took
  // so the wave picks up exactly where it left off
  const stored = JSON.parse(sessionStorage.getItem('bg') || 'null');
  let t = stored ? stored.t + (Date.now() - stored.ts) / 1000 * 0.36 : 0;

  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('bg', JSON.stringify({ t, ts: Date.now() }));
  });

  function lerp(a, b, u) { return a + (b - a) * u; }

  function resize() {
    W = canvas.width = innerWidth;
    H = canvas.height = innerHeight;
    buildVerts();
  }

  function buildVerts() {
    const cw = (W + PAD * 2) / COLS;
    const ch = (H + PAD * 2) / ROWS;
    verts = [];
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const edge = r === 0 || r === ROWS || c === 0 || c === COLS;
        const bx = c * cw - PAD;
        const by = r * ch - PAD;
        verts.push({
          bx:    bx + (edge ? 0 : (Math.random() - 0.5) * cw * 0.5),
          by:    by + (edge ? 0 : (Math.random() - 0.5) * ch * 0.5),
          edge,
          phase: Math.random() * Math.PI * 2,
          freq:  0.5 + Math.random() * 0.5,
          co:    (Math.random() - 0.5) * 32,
        });
      }
    }
  }

  function getPos(v) {
    if (v.edge) return { x: v.bx, y: v.by };
    const wave  = Math.sin(v.bx / (W * 0.28) - t * 1.3 + v.phase) * AMP;
    const swell = Math.sin(v.by / (H * 0.4)  + t * v.freq * 0.5 + v.phase) * (AMP * 0.35);
    return { x: v.bx + swell * 0.25, y: v.by + wave + swell };
  }

  function drawTri(a, b, c) {
    const pa = getPos(a), pb = getPos(b), pc = getPos(c);

    const mx = Math.min(1, Math.max(0, (a.bx + b.bx + c.bx) / 3 / W));
    const my = Math.min(1, Math.max(0, (a.by + b.by + c.by) / 3 / H));
    const co = (a.co + b.co + c.co) / 3;

    const r  = Math.min(255, Math.max(180, Math.round(lerp(lerp(TL[0], TR[0], mx), lerp(BL[0], BR[0], mx), my) + co)));
    const g  = Math.min(255, Math.max( 80, Math.round(lerp(lerp(TL[1], TR[1], mx), lerp(BL[1], BR[1], mx), my) + co * 0.55)));
    const bl = Math.min(255, Math.max( 80, Math.round(lerp(lerp(TL[2], TR[2], mx), lerp(BL[2], BR[2], mx), my) + co * 0.45)));

    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.lineTo(pc.x, pc.y);
    ctx.closePath();
    ctx.fillStyle   = `rgba(${r},${g},${bl},0.85)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${r - 15},${g - 15},${bl - 15},0.15)`;
    ctx.lineWidth   = 0.6;
    ctx.stroke();
  }

  function frame() {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   `rgb(${TL[0]},${TL[1]},${TL[2]})`);
    bg.addColorStop(0.5, `rgb(${Math.round((TR[0]+BL[0])/2)},${Math.round((TR[1]+BL[1])/2)},${Math.round((TR[2]+BL[2])/2)})`);
    bg.addColorStop(1,   `rgb(${BR[0]},${BR[1]},${BR[2]})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    t += 0.006;
    const w1 = COLS + 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tl = verts[ r      * w1 + c    ];
        const tr = verts[ r      * w1 + c + 1];
        const bl = verts[(r + 1) * w1 + c    ];
        const br = verts[(r + 1) * w1 + c + 1];
        drawTri(tl, tr, bl);
        drawTri(tr, br, bl);
      }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  resize();
  frame();
})();
