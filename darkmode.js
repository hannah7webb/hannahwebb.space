(function () {

  // ── initial state: saved pref → system pref → light ───────────────────────
  const saved = localStorage.getItem('dark');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let dark = saved !== null ? saved === '1' : sysDark;

  // ── dark-mode CSS ──────────────────────────────────────────────────────────
  const DARK_CSS = `
    /* base */
    html.dark body { color: #a4a7bd; background-color: #050507; }

    /* headings */
    html.dark h2, html.dark h3 { color: #e7e8f0; }
    html.dark h4 { color: #a4a7bd; }
    html.dark h5 { color: #585b73; }
    html.dark p  { color: #a4a7bd; }
    html.dark b  { color: #e7e8f0; }
    html.dark li { color: #a4a7bd; }

    /* "hannah webb" — teal→blue→purple gradient fill */
    html.dark .home-link {
      background: linear-gradient(90deg, #4fb8a8 0%, #6f93d6 50%, #9a7ad0 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      color: transparent;
    }
    /* prevent h1:hover color from breaking the gradient */
    html.dark h1:hover { color: transparent; -webkit-text-fill-color: transparent; }

    /* nav — off-white + animated teal underline on hover */
    html.dark nav a { color: rgba(231,232,240,0.82); }
    html.dark nav a::after {
      content: '';
      position: absolute;
      bottom: -2px; left: 0;
      width: 100%; height: 2px;
      background-color: #4fb8a8;
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s ease;
    }
    html.dark nav a:hover { color: #e7e8f0; }
    html.dark nav a:hover::after,
    html.dark nav a.active::after { transform: scaleX(1); }
    html.dark nav a.active { color: #e7e8f0; }

    /* photo — dark card with soft blue glow + hairline border */
    html.dark img {
      box-shadow:
        0 0 0 1px rgba(111,147,214,0.25),
        0 0 40px rgba(79,184,168,0.12),
        0 12px 40px rgba(0,0,0,0.75);
    }

    /* social icons — outlined squares that lift on hover */
    html.dark .icon-row { gap: 10px; }
    html.dark .icon-row a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px; height: 34px;
      border: 1px solid rgba(111,147,214,0.28);
      border-radius: 6px;
      color: #a4a7bd !important;
      transition: all 0.25s ease;
    }
    html.dark .icon-row a:hover {
      border-color: #4fb8a8;
      color: #4fb8a8 !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 14px rgba(79,184,168,0.18);
    }

    /* separator lines */
    html.dark .line { background-color: rgba(111,147,214,0.14); }
    html.dark header::after { background-color: rgba(111,147,214,0.14); }

    /* project / writing cards */
    html.dark .project-card {
      background-color: rgba(15,18,30,0.78);
      border: 1px solid rgba(111,147,214,0.14);
      color: #a4a7bd;
      box-shadow: 0 8px 24px rgba(0,0,0,0.55);
    }
    html.dark .project-card:hover {
      border-color: rgba(79,184,168,0.28);
      box-shadow: 0 14px 36px rgba(0,0,0,0.7);
    }
    html.dark .project-card h3 { color: #e7e8f0; }
    html.dark .project-card p  { color: #a4a7bd; }

    /* tool badges */
    html.dark .tool-buttons,
    html.dark .tool-html, html.dark .tool-css, html.dark .tool-git,
    html.dark .tool-uiux, html.dark .tool-javascript, html.dark .tool-python {
      background-color: rgba(111,147,214,0.08);
      color: #6f93d6;
      border: 1px solid rgba(111,147,214,0.18);
    }

    /* footer / attribution */
    html.dark footer p { color: #585b73; }
    html.dark h4, html.dark h5 { color: #585b73; }

    /* clarinet entry grid */
    html.dark .entry-grid .year        { color: #6f93d6; }
    html.dark .entry-grid .description { color: #a4a7bd; }

    /* article body text (h4 in misinformation/music pages) */
    html.dark .works-cited      { color: #a4a7bd; }
    html.dark .works-cited a    { color: #6f93d6; }

    /* inline links inside content */
    html.dark main a { color: #6f93d6; }
    html.dark main a:hover { color: #4fb8a8; }

    /* bottom fade to match dark base */
    html.dark body::after {
      background: linear-gradient(to top, rgba(5,5,7,0.92), transparent);
    }

    /* the toggle button itself */
    html.dark #dark-toggle { color: rgba(164,167,189,0.35); }
    html.dark #dark-toggle:hover { color: #4fb8a8; }
  `;

  // ── apply / remove theme ───────────────────────────────────────────────────
  function applyTheme(d) {
    dark = d;
    document.documentElement.classList.toggle('dark', dark);

    let s = document.getElementById('dark-style');
    if (!s) {
      s = document.createElement('style');
      s.id = 'dark-style';
      document.head.appendChild(s);
    }
    s.textContent = dark ? DARK_CSS : '';

    // keep html background in sync for iOS overscroll
    document.documentElement.style.backgroundColor = dark ? '#050507' : '';

    localStorage.setItem('dark', dark ? '1' : '0');
    window.dispatchEvent(new CustomEvent('themechange', { detail: { dark } }));
    updateBtn();
  }

  // ── toggle button ──────────────────────────────────────────────────────────
  const btn = document.createElement('button');
  btn.id = 'dark-toggle';
  btn.title = 'Toggle dark mode';
  btn.style.cssText = [
    'position:fixed', 'top:18px', 'right:18px', 'z-index:1000',
    'background:none', 'border:none', 'cursor:pointer',
    'font-size:13px', 'color:rgba(0,0,0,0.3)',
    'transition:color 0.25s', 'padding:4px', 'line-height:1',
  ].join(';');

  function updateBtn() {
    btn.innerHTML = dark
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }

  btn.addEventListener('click', () => applyTheme(!dark));
  document.body.appendChild(btn);

  // ── init ───────────────────────────────────────────────────────────────────
  applyTheme(dark);

})();
