/* ============================================================
   EDROM — instagram.js
   Feed do Instagram na página de contato. Três modos, nessa ordem:
     1) WIDGET ao vivo  -> HTML de um widget (Behold/SnapWidget/LightWidget),
        salvo no admin. É o único jeito de ter posts em TEMPO REAL sem
        back-end (o serviço atualiza sozinho).
     2) POSTS por URL   -> lista de links de posts (admin) renderizados com
        o embed OFICIAL do Instagram (conteúdo real de cada post).
     3) TEASERS          -> se nada foi configurado, cards da marca que
        levam ao perfil @edromufu.
   ============================================================ */

(() => {
  'use strict';

  const grid = document.getElementById('instaGrid');
  if (!grid) return;

  const PERFIL = 'https://www.instagram.com/edromufu/';
  const iconSvg = `<svg class="insta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>`;

  const widget = (EdromData.getInstaWidget() || '').trim();
  const posts = EdromData.getInstaPosts() || [];

  // carrega o embed.js oficial do Instagram (idempotente)
  function loadInstagramEmbed() {
    if (window.instgrm && window.instgrm.Embeds) { window.instgrm.Embeds.process(); return; }
    if (document.getElementById('ig-embed-js')) return;
    const s = document.createElement('script');
    s.id = 'ig-embed-js';
    s.async = true;
    s.src = 'https://www.instagram.com/embed.js';
    document.body.appendChild(s);
  }

  /* --- MODO 1: widget ao vivo --- */
  if (widget) {
    grid.classList.remove('insta-grid');       // o widget controla o próprio layout
    grid.classList.add('insta-widget-wrap');
    grid.innerHTML = widget;
    // reexecuta scripts que vierem no HTML colado (innerHTML não roda <script>)
    grid.querySelectorAll('script').forEach(old => {
      const s = document.createElement('script');
      [...old.attributes].forEach(a => s.setAttribute(a.name, a.value));
      s.textContent = old.textContent;
      old.replaceWith(s);
    });
    return;
  }

  /* --- MODO 2: posts oficiais por URL --- */
  if (posts.length) {
    grid.classList.remove('insta-grid');
    grid.classList.add('insta-embeds');
    grid.innerHTML = posts.slice(0, 8).map(url => `
      <blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"></blockquote>
    `).join('');
    loadInstagramEmbed();
    // o embed do Instagram às vezes precisa de um segundo "process"
    setTimeout(loadInstagramEmbed, 1500);
    return;
  }

  /* --- MODO 3: teasers da marca --- */
  const legendas = [
    'Bastidores da equipe', 'Dia de competição', 'Nossas robôs',
    'Processo seletivo', 'Conquistas', 'Vida na UFU', 'Tech & engenharia', 'Venha fazer parte',
  ];
  const grads = [
    'linear-gradient(135deg,#3D407D,#4F4A9E)',
    'linear-gradient(135deg,#4F4A9E,#191833)',
    'linear-gradient(135deg,#100F24,#3D407D)',
    'linear-gradient(135deg,#201F40,#4F4A9E)',
  ];
  grid.innerHTML = legendas.map((txt, i) => `
    <a class="insta-card reveal" data-delay="${i % 4}" href="${PERFIL}" target="_blank" rel="noopener" style="background:${grads[i % grads.length]}">
      ${iconSvg}
      <div class="insta-fallback">
        <img src="assets/marca/simbolo-edrom.png" alt="">
        <span>${txt}</span>
      </div>
    </a>`).join('');
})();
