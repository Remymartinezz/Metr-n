/* Metrön : navigation entre les pages quand une page est ouverte seule (pas dans la tour de contrôle).
   Un bouton « Pages » ouvre la liste des pages par catégorie, avec le retour à la tour.
   Sur téléphone, le bouton n'apparaît qu'en faisant défiler, puis s'efface. */
(function () {
  if (window.self !== window.top || new URLSearchParams(location.search).has('screen')) return;   // dans la tour ou un aperçu : rien

  const PAGES = [
    ['Expérience', [['app.html', 'L’app'], ['widgets.html', 'Widgets'], ['notifications.html', 'Notifications']]],
    ['Labs', [['mascotte.html', 'Mascotte'], ['identite.html', 'Identité visuelle'], ['lab-themes.html', 'Labo des thèmes'], ['lab-o.html', 'Labo du ö']]],
  ];
  const here = location.pathname.split('/').pop() || 'index.html';   // index.html = la tour de contrôle

  const css = `
  .mn-btn { position: fixed; z-index: 2147483000; top: 14px; left: 14px; display: flex; align-items: center; gap: 8px; border: 0; border-radius: 999px; padding: 6px 16px 6px 6px; min-height: 44px; background: #2B1D17; color: #FFFDF2; font: 700 14px/1 "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif; box-shadow: 0 8px 24px rgb(0 0 0 / .25); cursor: pointer; transition: opacity 350ms cubic-bezier(.2,.8,.2,1), transform 350ms cubic-bezier(.2,.8,.2,1); }
  .mn-btn i { width: 32px; height: 32px; border-radius: 50%; background: #2D7BB4; overflow: hidden; display: block; flex: none; }
  .mn-btn i svg { width: 100%; height: 100%; display: block; }
  .mn-btn.off { opacity: 0; transform: translateY(16px); pointer-events: none; }
  @media (max-width: 640px) { .mn-btn { top: auto; left: 50%; bottom: calc(14px + env(safe-area-inset-bottom)); transform: translateX(-50%); } .mn-btn.off { transform: translate(-50%, 16px); } }
  .mn-bg { position: fixed; inset: 0; z-index: 2147483001; background: rgb(0 0 0 / .4); display: flex; justify-content: flex-start; align-items: flex-start; padding: 14px; }
  .mn-bg[hidden] { display: none; }
  .mn-panel { width: min(320px, 100%); background: #FFFDF2; color: #2B1D17; border-radius: 24px; padding: 14px; font: 15px/1.4 "Hanken Grotesk", "Helvetica Neue", Arial, sans-serif; box-shadow: 0 20px 50px rgb(0 0 0 / .3); max-height: calc(100vh - 28px); overflow: auto; }
  @media (max-width: 640px) { .mn-bg { align-items: flex-end; justify-content: center; padding: 10px; } .mn-panel { width: 100%; } }
  .mn-panel a { display: flex; align-items: center; min-height: 44px; padding: 8px 12px; border-radius: 14px; color: inherit; text-decoration: none; font-weight: 600; }
  .mn-panel a:hover { background: #F1EEDF; }
  .mn-panel a[aria-current="page"] { background: #2B1D17; color: #FFFDF2; }
  .mn-panel .mn-tour { background: #ADDDFF; color: #0B3A63; font-weight: 750; margin-bottom: 6px; }
  .mn-panel p { margin: 10px 12px 4px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; font-weight: 800; color: #6C635A; }
  @media (prefers-reduced-motion: reduce) { .mn-btn { transition: none; } }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const chick = `<svg viewBox="0 0 100 100" aria-hidden="true"><g transform="translate(50 52) scale(.125) translate(-350 -330)"><ellipse cx="350" cy="330" rx="315" ry="262" fill="#FFFD94"/><path d="M105 124Q105 102 127 102H245V127A140 140 0 0 1 105 267Z" fill="#663A2B"/><path d="M601 124Q601 102 579 102H461V127A140 140 0 0 0 601 267Z" fill="#663A2B"/><path d="M245 280Q353 180 462 280Q353 378 245 280Z" fill="#CE9A2B"/></g></svg>`;
  const btn = document.createElement('button');
  btn.className = 'mn-btn'; btn.type = 'button'; btn.setAttribute('aria-haspopup', 'dialog');
  btn.innerHTML = `<i>${chick}</i>Pages`;
  const bg = document.createElement('div');
  bg.className = 'mn-bg'; bg.hidden = true;
  bg.innerHTML = `<nav class="mn-panel" role="dialog" aria-modal="true" aria-label="Pages de Metrön">
    <a class="mn-tour" href="./">‹ Revenir au centre de contrôle</a>
    ${PAGES.map(([g, list]) => `<p>${g}</p>${list.map(([f, n]) => `<a href="${f}"${f === here ? ' aria-current="page"' : ''}>${n}</a>`).join('')}`).join('')}
  </nav>`;
  document.body.append(btn, bg);

  const open = () => { bg.hidden = false; bg.querySelector('a').focus(); };
  const close = () => { bg.hidden = true; btn.focus(); };
  btn.addEventListener('click', open);
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && !bg.hidden) close(); });

  // Téléphone : visible en faisant défiler (vers le haut ou le bas), puis s'efface après 2 s ; montré une fois à l'ouverture
  const mobile = matchMedia('(max-width: 640px)');
  let t = 0;
  const peek = (ms = 2000) => { if (!mobile.matches) return; btn.classList.remove('off'); clearTimeout(t); t = setTimeout(() => btn.classList.add('off'), ms); };
  document.addEventListener('scroll', () => peek(), { capture: true, passive: true });
  peek(2600);
  mobile.addEventListener('change', () => { if (!mobile.matches) btn.classList.remove('off'); });
})();
