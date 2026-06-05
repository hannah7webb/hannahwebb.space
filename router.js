(function () {
  const PAGES = new Set([
    'index.html', 'projects.html', 'clarinet.html', 'writing.html',
    'the-modern-misinformation-crisis.html', 'what-music-taught-me-about-life.html',
    '',
  ]);

  // Stamp the initial history entry so popstate fires on back/forward
  history.replaceState({ url: location.href }, '');

  async function navigate(url, push) {
    try {
      const res  = await fetch(url);
      const html = await res.text();
      const doc  = new DOMParser().parseFromString(html, 'text/html');

      // Swap page-specific CSS
      const newStyle = doc.querySelector('style');
      const curStyle = document.querySelector('style');
      if (newStyle && curStyle) curStyle.textContent = newStyle.textContent;

      // Swap main content — footer lives inside <main> on every page
      const newMain = doc.querySelector('main');
      const curMain = document.querySelector('main');
      if (newMain && curMain) curMain.innerHTML = newMain.innerHTML;

      // Update title and active nav link
      document.title = doc.title;
      const page = new URL(url, location.href).pathname.split('/').pop() || 'index.html';
      document.querySelectorAll('nav a').forEach(a =>
        a.classList.toggle('active', a.getAttribute('href') === page)
      );

      if (push) history.pushState({ url }, '', url);
      window.scrollTo(0, 0);

    } catch {
      location.href = url; // fallback: let the browser navigate normally
    }
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a');
    if (!a || a.target === '_blank') return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto')) return;
    if (!PAGES.has(href.split('/').pop())) return; // only intercept main nav pages
    e.preventDefault();
    navigate(href, true);
  });

  window.addEventListener('popstate', () => navigate(location.href, false));
})();
