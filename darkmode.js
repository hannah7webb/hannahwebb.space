(function () {

  // ── initial state: saved pref → system pref → light ───────────────────────
  const saved = localStorage.getItem('dark');
  const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let dark = saved !== null ? saved === '1' : sysDark;

  // ── dark-mode CSS ──────────────────────────────────────────────────────────
  const DARK_CSS = `
    /* base */
    html.dark body { color: #a4a7bd; background-color: transparent; }

    /* headings */
    html.dark h2, html.dark h3 { color: #a4a7bd; }
    html.dark h4 { color: #a4a7bd }
    html.dark h5 { color: #585b73; }
    html.dark p  { color: #a4a7bd; }
    html.dark b  { color: #e7e8f0; }
    html.dark li { color: #a4a7bd; }

    /* "hannah webb" — plain white */
    html.dark .home-link { color: #ffffff; -webkit-text-fill-color: #ffffff; }
    html.dark h1:hover { color: #cccccc; -webkit-text-fill-color: #cccccc; }

    /* nav — same behaviour as light mode, just lighter colours */
    html.dark nav a { color: rgba(231,232,240,0.82); }
    html.dark nav a:hover { color: rgba(231,232,240,0.3); }
    html.dark nav a.active { color: rgba(231,232,240,0.3); }


    /* social icons — same layout as light mode, white colour */
    html.dark .icon-row a { color: rgba(255,255,255,0.75) !important; transition: color 0.3s; }
    html.dark .icon-row a:hover { color: rgba(255,255,255,0.4) !important; }

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

    /* clarinet entry grid */
    html.dark .entry-grid .year        { color: #e7e8f0; }
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
    html.dark #dark-toggle { color: rgba(255,255,255,0.85) !important; }
    html.dark #dark-toggle:hover { color: rgba(255,255,255,0.4) !important; }
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
