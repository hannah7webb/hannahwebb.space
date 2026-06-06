// layout.js — persistent layout engine for the project grid.
// Loaded once on the initial page and kept alive across SPA navigations,
// so it can rebuild the grid whenever the router lands on projects.html.
// Safe to include on every page: it no-ops when there's no .project-grid.

(function () {
  let _colCount = 0;

  function buildColumns() {
    const grid = document.querySelector('.project-grid');
    if (!grid) return; // <-- guard: nothing to do on pages without the grid
    const allCards = Array.from(grid.querySelectorAll('.fade-section'));
    const gap = 20, minW = 280;
    const numCols = Math.max(1, Math.floor((grid.clientWidth + gap) / (minW + gap)));
    if (numCols === _colCount && grid.querySelectorAll('.col-wrap').length === numCols) return;
    _colCount = numCols;

    // Detach all cards into a fragment, then remove old col wrappers
    const frag = document.createDocumentFragment();
    allCards.forEach(c => frag.appendChild(c));
    grid.querySelectorAll('.col-wrap').forEach(c => c.remove());

    // Create column wrappers
    const cols = [];
    for (let i = 0; i < numCols; i++) {
      const col = document.createElement('div');
      col.className = 'col-wrap';
      grid.appendChild(col);
      cols.push(col);
    }

    // Distribute cards left-to-right, top-to-bottom, with staggered animation delays
    allCards.forEach((card, i) => {
      card.style.animationDelay = (i * 0.15) + 's';
      cols[i % numCols].appendChild(card);
    });
  }

  // Add expand buttons — called every layout pass so buttons survive router re-renders
  function addExpandButtons() {
    document.querySelectorAll('.bullets').forEach(bullets => {
      if (bullets.parentNode.querySelector('.expand-btn')) return; // already present
      const ul = bullets.querySelector('ul');
      if (!ul || ul.querySelectorAll('li').length < 2) return;

      const anchor = bullets.closest('a.fade-section');
      const btn = document.createElement('button');
      btn.className = 'expand-btn';
      btn.textContent = '▾ show more';

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const expanded = bullets.classList.toggle('expanded');
        btn.textContent = expanded ? '▴ show less' : '▾ show more';
        if (expanded) {
          anchor.dataset.expanded = '1';
        } else {
          delete anchor.dataset.expanded;
          equalizeAndAlign();
        }
      });

      bullets.parentNode.insertBefore(btn, bullets.nextSibling);
    });
  }

  function equalizeAndAlign() {
    buildColumns();
    addExpandButtons();
    const cols = Array.from(document.querySelectorAll('.col-wrap'));
    if (!cols.length) return;

    const numRows = Math.max(...cols.map(col => col.children.length));

    for (let r = 0; r < numRows; r++) {
      const rowCards = cols.map(col => col.children[r]).filter(Boolean);

      rowCards.forEach(c => {
        c.style.height = '';
        const btn = c.querySelector('.expand-btn');
        if (btn) btn.style.marginTop = '';
      });

      const active = rowCards.filter(c => !c.dataset.expanded);
      if (!active.length) continue;

      const btns = active.map(c => c.querySelector('.expand-btn')).filter(Boolean);
      if (btns.length >= 2) {
        const tops = btns.map(btn =>
          btn.getBoundingClientRect().top - btn.closest('.project-card').getBoundingClientRect().top
        );
        const maxTop = Math.max(...tops);
        btns.forEach((btn, i) => {
          const diff = maxTop - tops[i];
          if (diff > 0.5) btn.style.marginTop = (12 + diff) + 'px';
        });
      }
    }
  }

  // Direct-load entry points
  window.addEventListener('load', equalizeAndAlign);
  window.addEventListener('resize', equalizeAndAlign);
  if (document.fonts) document.fonts.ready.then(equalizeAndAlign);

  // SPA-navigation entry point — this listener now persists across navigations,
  // because layout.js is loaded once on the initial page and never re-injected.
  window.addEventListener('routechange', function (e) {
    if (e.detail.page === 'projects.html' || e.detail.page === '') {
      _colCount = 0; // force full rebuild after router re-injects content
      // rAF lets the freshly injected cards lay out before we measure heights
      requestAnimationFrame(equalizeAndAlign);
    }
  });
})();