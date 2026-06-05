(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let darkMode = localStorage.getItem('dark') === '1' ||
    (localStorage.getItem('dark') === null && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:-1;pointer-events:none;background-color:' +
    (darkMode ? '#050507' : '#E0B078') + ';';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  // ── palettes ───────────────────────────────────────────────────────────────
  const COLS = 16, ROWS = 10, AMP = 22, PAD = AMP * 2;

  // light: warm gold / orange / pink / berry
  const LT = [[232,184,96],[232,150,110],[232,160,184],[200,120,152]];
  // dark: near-black navy / teal / purple — channels clamped ≤ 80
  const DK = [[18,24,44],[12,32,52],[24,18,44],[16,26,58]];

  // ── state ──────────────────────────────────────────────────────────────────
  let W, H, verts;
  const stored = JSON.parse(sessionStorage.getItem('bg') || 'null');
  let t = stored ? stored.t + (Date.now() - stored.ts) / 1000 * 0.36 : 0;

  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('bg', JSON.stringify({ t, ts: Date.now() }));
  });

  window.addEventListener('themechange', e => {
    darkMode = e.detail.dark;
    canvas.style.backgroundColor = darkMode ? '#050507' : '#E0B078';
  });

  function lerp(a, b, u) { return a + (b - a) * u; }

  // ── geometry ───────────────────────────────────────────────────────────────
  function resize() {
    W = canvas.width  = innerWidth;
    H = canvas.height = innerHeight;
    buildVerts();
  }

  function buildVerts() {
    const cw = (W + PAD * 2) / COLS, ch = (H + PAD * 2) / ROWS;
    verts = [];
    for (let r = 0; r <= ROWS; r++) {
      for (let c = 0; c <= COLS; c++) {
        const edge = r === 0 || r === ROWS || c === 0 || c === COLS;
        const bx = c * cw - PAD, by = r * ch - PAD;
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

  // ── drawing ────────────────────────────────────────────────────────────────
  function drawTri(a, b, c) {
    const pa = getPos(a), pb = getPos(b), pc = getPos(c);
    const mx = Math.min(1, Math.max(0, (a.bx+b.bx+c.bx)/3/W));
    const my = Math.min(1, Math.max(0, (a.by+b.by+c.by)/3/H));
    const co = (a.co + b.co + c.co) / 3;

    const pal = darkMode ? DK : LT;
    const [tl, tr, bl, br] = pal;
    const lo = darkMode ? 0 : 80, hi = darkMode ? 80 : 255;

    const r  = Math.min(hi, Math.max(lo, Math.round(lerp(lerp(tl[0],tr[0],mx), lerp(bl[0],br[0],mx), my) + co)));
    const g  = Math.min(hi, Math.max(lo, Math.round(lerp(lerp(tl[1],tr[1],mx), lerp(bl[1],br[1],mx), my) + co * 0.55)));
    const bv = Math.min(hi, Math.max(lo, Math.round(lerp(lerp(tl[2],tr[2],mx), lerp(bl[2],br[2],mx), my) + co * 0.45)));

    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.lineTo(pc.x, pc.y);
    ctx.closePath();
    ctx.fillStyle   = `rgba(${r},${g},${bv},0.88)`;
    ctx.fill();
    ctx.strokeStyle = darkMode
      ? 'rgba(130,150,210,0.10)'
      : `rgba(${Math.max(0,r-15)},${Math.max(0,g-15)},${Math.max(0,bv-15)},0.15)`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // ── RAF loop: ~30 fps cap, pauses when tab hidden ──────────────────────────
  const INTERVAL = 1000 / 30;
  let lastTs = 0;

  function frame(now) {
    requestAnimationFrame(frame);

    // skip draw when tab not visible (browser may already throttle, but be explicit)
    if (document.hidden) return;

    // 30 fps cap
    if (now - lastTs < INTERVAL) return;
    lastTs = now;

    const pal = darkMode ? DK : LT;
    const [tl,,,br] = pal;
    const mid = [pal[1], pal[2]].reduce((a, b) => a.map((v, i) => Math.round((v + b[i]) / 2)));

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   `rgb(${tl[0]},${tl[1]},${tl[2]})`);
    bg.addColorStop(0.5, `rgb(${mid[0]},${mid[1]},${mid[2]})`);
    bg.addColorStop(1,   `rgb(${br[0]},${br[1]},${br[2]})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    t += 0.003; // halved increment to keep same apparent speed at 30fps
    const w1 = COLS + 1;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tl  = verts[r*w1+c],      tr  = verts[r*w1+c+1];
        const bl  = verts[(r+1)*w1+c],  brl = verts[(r+1)*w1+c+1];
        drawTri(tl, tr, bl);
        drawTri(tr, brl, bl);
      }
    }
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
