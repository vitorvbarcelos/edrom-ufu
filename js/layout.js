/* ============================================================
   EDROM — layout.js
   Injeta o "cromo" compartilhado em TODAS as páginas do site:
   barra de progresso, grid de fundo, cursor, header (com nav
   multipágina), rodapé e o chat flutuante (robô).
   Cada página só declara <body data-page="..."> e o conteúdo.
   Roda de forma síncrona, ANTES de main.js/chat.js, para que
   esses scripts encontrem os elementos já no DOM.
   ============================================================ */

(() => {
  'use strict';

  const page = document.body.dataset.page || 'inicio';

  // Páginas do site (navegação principal)
  const NAV = [
    { href: 'index.html',      label: 'Início',     page: 'inicio' },
    { href: 'equipe.html',     label: 'Equipe',     page: 'equipe' },
    { href: 'projetos.html',   label: 'Projetos',   page: 'projetos' },
    { href: 'patrocinio.html', label: 'Patrocínio', page: 'patrocinio' },
    { href: 'seletivo.html',   label: 'Seletivo',   page: 'seletivo' },
    { href: 'jogo.html',       label: 'Jogo',       page: 'jogo' },
    { href: 'contato.html',    label: 'Contato',    page: 'contato' },
  ];

  const navLinks = NAV.map(n =>
    `<a href="${n.href}" class="${n.page === page ? 'is-active' : ''}">${n.label}</a>`
  ).join('');

  /* ---------- HEADER ---------- */
  const header = `
    <div class="scroll-progress" id="scrollProgress" aria-hidden="true"></div>
    <header class="site-header" id="siteHeader">
      <div class="header-inner">
        <a href="index.html" class="header-logo" aria-label="EDROM — início">
          <img src="assets/marca/edrom-horizontal.png" alt="EDROM">
        </a>
        <nav class="header-nav" id="headerNav">
          ${navLinks}
          <a href="patrocinio.html" class="btn btn-primary btn-small header-cta" data-magnetic>Seja patrocinador</a>
        </nav>
        <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>
    </header>`;

  /* ---------- FOOTER ---------- */
  const footer = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="assets/marca/edrom-horizontal.png" alt="EDROM">
            <p>Equipe de Desenvolvimento em Robótica Móvel — Universidade Federal de Uberlândia. Robótica que joga futebol sozinha, desde 2008.</p>
          </div>
          <div class="footer-col">
            <h4>Navegação</h4>
            <a href="index.html">Início</a>
            <a href="equipe.html">Equipe</a>
            <a href="projetos.html">Projetos</a>
            <a href="seletivo.html">Seletivo</a>
            <a href="jogo.html">Jogo do Robô</a>
          </div>
          <div class="footer-col">
            <h4>Conecte-se</h4>
            <a href="https://instagram.com/edromufu" target="_blank" rel="noopener">Instagram</a>
            <a href="https://www.linkedin.com/company/edrom-ufu" target="_blank" rel="noopener">LinkedIn</a>
            <a href="https://facebook.com/edromufu" target="_blank" rel="noopener">Facebook</a>
            <a href="mailto:edromufu@gmail.com">edromufu@gmail.com</a>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 EDROM — UFU. Todos os direitos reservados.</span>
          <span>Vinculada à FEMEC/UFU</span>
        </div>
      </div>
    </footer>`;

  /* ---------- CHAT (robô) ---------- */
  const chat = `
    <button class="chat-fab" id="chatFab" aria-label="Abrir chat de atendimento">
      <img class="chat-fab-robo" src="assets/chat-robo.png" alt="">
      <svg class="icon-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
    <div class="chat-panel" id="chatPanel" role="dialog" aria-label="Chat de atendimento EDROM">
      <div class="chat-header">
        <img src="assets/chat-robo.png" alt="">
        <div>
          <h3>Robô EDROM</h3>
          <span>Atendimento automático</span>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="chat-input-row is-hidden" id="chatInputRow">
        <input type="text" id="chatInput" placeholder="Digite aqui..." autocomplete="off">
        <button class="chat-send" id="chatSend" aria-label="Enviar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
        </button>
      </div>
    </div>`;

  /* ---------- CROMO DE FUNDO + CURSOR ---------- */
  const chrome = `
    <div class="cursor-dot" id="cursorDot"></div>
    <div class="cursor-ring" id="cursorRing"></div>
    <div class="bg-grid" aria-hidden="true"></div>`;

  const loader = `
    <div class="loader" id="loader">
      <img src="assets/marca/simbolo-edrom.png" alt="Símbolo EDROM">
      <span>CARREGANDO</span>
    </div>`;

  // Injeta: loader + header + cromo no topo do body; footer + chat no fim.
  document.body.insertAdjacentHTML('afterbegin', loader + header + chrome);
  document.body.insertAdjacentHTML('beforeend', footer + chat);
})();
