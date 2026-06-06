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
  const COLS = 16, ROWS = 10, AMP = 34, PAD = AMP * 2;

  // light: warm gold / orange / pink / berry
  const LT = [[232,184,96],[232,150,110],[232,160,184],[200,120,152]];
  // dark: near-black with subtle iridescent teal / green / violet peaks
  const DK = [[6,32,26],[24,6,36],[6,30,12],[30,6,26]];

  // ── transition state ───────────────────────────────────────────────────────
  // progress runs 0 → (1 + BAND); each triangle's local blend triggers when
  // the sweep front reaches its diagonal position (+ per-cell noise offset).
  const TRANS_MS   = 1800;
  const TRANS_BAND = 0.35; // width of the traveling blend front (fraction of diagonal)
  let trans = null;        // { fromDark, dir, startTime, progress }

  // ── state ──────────────────────────────────────────────────────────────────
  let W, H, verts;
  const stored = JSON.parse(sessionStorage.getItem('bg') || 'null');
  let t = stored ? stored.t + (Date.now() - stored.ts) / 1000 * 0.36 : 0;

  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem('bg', JSON.stringify({ t, ts: Date.now() }));
  });

  window.addEventListener('themechange', e => {
    const newDark = e.detail.dark;
    if (newDark === darkMode) return;
    trans = {
      fromDark:  darkMode,
      dir:       newDark ? 1 : -1, // 1 = LT→DK (TL→BR sweep), -1 = DK→LT (BR→TL sweep)
      startTime: performance.now(),
      progress:  0,
    };
    darkMode = newDark;
  });

  function lerp(a, b, u) { return a + (b - a) * u; }
  function smoothstep(x) { return x * x * (3 - 2 * x); }

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
          co:    (Math.random() - 0.5) * 44,
          tn:    Math.random(), // per-vertex transition noise for stagger
        });
      }
    }
  }

  function getPos(v) {
    if (v.edge) return { x: v.bx, y: v.by };
    const wave  = Math.sin(v.bx / (W * 0.28) - t * 2.2 + v.phase) * AMP;
    const swell = Math.sin(v.by / (H * 0.4)  + t * v.freq * 0.9 + v.phase) * (AMP * 0.5);
    return { x: v.bx + swell * 0.25, y: v.by + wave + swell };
  }

  // Returns raw (unclamped) [r, g, b] for a palette at normalized position (mx, my)
  function palColor(pal, mx, my, co) {
    const [tl, tr, bl, br] = pal;
    return [
      lerp(lerp(tl[0],tr[0],mx), lerp(bl[0],br[0],mx), my) + co,
      lerp(lerp(tl[1],tr[1],mx), lerp(bl[1],br[1],mx), my) + co * 0.55,
      lerp(lerp(tl[2],tr[2],mx), lerp(bl[2],br[2],mx), my) + co * 0.45,
    ];
  }

  // ── drawing ────────────────────────────────────────────────────────────────
  function drawTri(a, b, c) {
    const pa = getPos(a), pb = getPos(b), pc = getPos(c);
    const mx = Math.min(1, Math.max(0, (a.bx+b.bx+c.bx)/3/W));
    const my = Math.min(1, Math.max(0, (a.by+b.by+c.by)/3/H));
    const co = (a.co + b.co + c.co) / 3;

    let r, g, bv, alpha = 0.88, doStroke = false;

    if (trans) {
      // Position of this triangle along the sweep diagonal (0 = start corner, 1 = end corner)
      let diagPos = (mx + my) / 2;
      if (trans.dir === -1) diagPos = 1 - diagPos;

      // Per-triangle noise shifts its entry point along the front — organic stagger
      const noise = (a.tn + b.tn + c.tn) / 3;
      const effDiag = Math.max(0, Math.min(1, diagPos + (noise - 0.5) * 0.22));

      // Local blend 0→1: 0 = still in "from" palette, 1 = fully in "to" palette
      const rawBlend = (trans.progress - effDiag) / TRANS_BAND;
      const blend    = smoothstep(Math.max(0, Math.min(1, rawBlend)));

      const [rA, gA, bA] = palColor(trans.fromDark ? DK : LT, mx, my, co);
      const [rB, gB, bB] = palColor(darkMode       ? DK : LT, mx, my, co);

      // Subtle "crease" at blend midpoint — brief darkening as each tile flips
      const crease = Math.sin(blend * Math.PI) * 12;

      r  = Math.min(255, Math.max(0, Math.round(lerp(rA, rB, blend) - crease)));
      g  = Math.min(255, Math.max(0, Math.round(lerp(gA, gB, blend) - crease)));
      bv = Math.min(255, Math.max(0, Math.round(lerp(bA, bB, blend) - crease)));
      alpha = 0.88 - Math.sin(blend * Math.PI) * 0.07; // slight alpha dip reinforces the crease
    } else {
      const pal = darkMode ? DK : LT;
      const lo = darkMode ? 8 : 80, hi = darkMode ? 245 : 255;
      const [rc, gc, bc] = palColor(pal, mx, my, co);
      r  = Math.min(hi, Math.max(lo, Math.round(rc)));
      g  = Math.min(hi, Math.max(lo, Math.round(gc)));
      bv = Math.min(hi, Math.max(lo, Math.round(bc)));
      doStroke = !darkMode;
    }

    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.lineTo(pc.x, pc.y);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r},${g},${bv},${alpha.toFixed(3)})`;
    ctx.fill();
    if (doStroke) {
      ctx.strokeStyle = `rgba(${Math.max(0,r-15)},${Math.max(0,g-15)},${Math.max(0,bv-15)},0.15)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  // ── RAF loop: ~30 fps cap, pauses when tab hidden ──────────────────────────
  const INTERVAL = 1000 / 30;
  let lastTs = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    if (now - lastTs < INTERVAL) return;
    lastTs = now;

    // Advance transition progress
    if (trans) {
      trans.progress = (now - trans.startTime) / TRANS_MS * (1 + TRANS_BAND);
      if (trans.progress >= 1 + TRANS_BAND) {
        trans = null;
        canvas.style.backgroundColor = darkMode ? '#050507' : '#E0B078';
      }
    }

    // Base gradient — blends between palettes during transition
    const palTo   = darkMode ? DK : LT;
    const palFrom = trans ? (trans.fromDark ? DK : LT) : null;
    const gBlend  = trans
      ? smoothstep(Math.max(0, Math.min(1, trans.progress / (1 + TRANS_BAND))))
      : 1;

    function gc(i) {
      if (!palFrom) return palTo[i];
      return palTo[i].map((v, ch) => Math.round(lerp(palFrom[i][ch], v, gBlend)));
    }
    const gtl = gc(0), gbr = gc(3);
    const gmid1 = gc(1), gmid2 = gc(2);
    const gmid = [0,1,2].map(i => Math.round((gmid1[i] + gmid2[i]) / 2));

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   `rgb(${gtl[0]},${gtl[1]},${gtl[2]})`);
    bg.addColorStop(0.5, `rgb(${gmid[0]},${gmid[1]},${gmid[2]})`);
    bg.addColorStop(1,   `rgb(${gbr[0]},${gbr[1]},${gbr[2]})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    t += 0.007;
    const w1 = COLS + 1;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const vtl = verts[row*w1+col],       vtr = verts[row*w1+col+1];
        const vbl = verts[(row+1)*w1+col],   vbr = verts[(row+1)*w1+col+1];
        drawTri(vtl, vtr, vbl);
        drawTri(vtr, vbr, vbl);
      }
    }
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
})();
