/* ============================================================
   EDROM — main.js
   Renderização dinâmica (conteúdo do localStorage) +
   camada de experiência: smooth scroll, parallax, reveals,
   count-up, cursor customizado e botões magnéticos.
   ============================================================ */

(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     1. RENDERIZAÇÃO DINÂMICA — conteúdo vem do localStorage
     ============================================================ */

  // --- Sobre + destaque ---
  async function renderConteudo() {
    const c = await EdromData.getConteudoGlobal();
    const sobreEl = document.getElementById('sobreTexto');
    const destaqueEl = document.getElementById('sobreDestaque');
    if (sobreEl) sobreEl.textContent = c.sobre;
    if (destaqueEl) destaqueEl.textContent = c.destaque;

    // stats guardadas em data-target; o count-up anima até esse valor
    const map = {
      statAnos: c.stats.anos,
      statMembros: c.stats.membros,
      statCompeticoes: c.stats.competicoes,
      statPremios: c.stats.premios,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.dataset.target = val;
    });
    initCountUp(); // só depois dos números (async) chegarem
  }

  // --- Equipe (edrom_team) ---
  async function renderTeam() {
    const grid = document.getElementById('teamGrid');
    if (!grid) return;
    const team = await EdromData.getTeamGlobal();
    grid.innerHTML = team.map((m, i) => `
      <article class="team-card reveal" data-delay="${i % 4}">
        <div class="team-photo">
          <img src="${m.foto || 'assets/marca/simbolo-edrom.png'}" alt="${m.nome}" loading="lazy"
               onerror="this.src='assets/marca/simbolo-edrom.png'">
        </div>
        <div class="team-info">
          <h3>${m.nome}</h3>
          <div class="team-cargo">${m.cargo}</div>
          <div class="team-curso">${m.curso}</div>
        </div>
      </article>
    `).join('');
    revealScan(grid); // cards injetados async precisam ser observados
  }

  // --- Projetos & artigos (conteúdo fixo com links reais) ---
  const PDF_BASE = 'https://d2aca772-5d6f-491d-b4e8-05bb8f48b42c.filesusr.com/ugd/';
  const ARTIGOS = [
    ['Development of Power Supply and Communication Circuits of a Humanoid Robot to Play Robot Soccer', '9d5617_a5f61d5f7f6144ed8ec3fd40d030daf8.pdf'],
    ['Mechanical Human Robot Design Developed to Play Soccer', '9d5617_88db0d92df1940249addbfb65bf6bb9f.pdf'],
    ['Implementation and control of a biped walk on a Humanoid Robot', '9d5617_488f1bfe610e48c79e196f3c04295259.pdf'],
    ['Lithium-ion Polymer Batteries: reasons, behaviors and procedures', '9d5617_d9293e6086274bb294d8d8c3172a05f9.pdf'],
    ['Soccer Field Recognition Using Normalized Image Technique', '9d5617_cb73ea8feb7f4d349508bc4b0df2e07e.pdf'],
  ];
  const TDPS = [
    ['Team Description Paper — EDROM', '9d5617_642820b61f074fbe995d6326c9fae915.pdf'],
    ['EDROM Humanoid Teen Size', '9d5617_45641ec659964ce2a3265e084f072a64.pdf'],
    ['EDROM Humanoid — Team Description Paper', '9d5617_decc1eac0e824b4385129fcd9e43ccae.pdf'],
    ['EDROM Humanoid Robot Racing — Team Description Paper', '9d5617_b29a108788194620816adb9559c51df4.pdf'],
  ];

  function paperCard([titulo, arquivo]) {
    return `
      <a class="paper-card" href="${PDF_BASE}${arquivo}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>
        <span>${titulo}</span>
        <span class="ext"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg></span>
      </a>`;
  }

  function renderProjetos() {
    const a = document.getElementById('artigosList');
    const t = document.getElementById('tdpsList');
    if (a) a.innerHTML = ARTIGOS.map(paperCard).join('');
    if (t) t.innerHTML = TDPS.map(paperCard).join('');
  }

  // --- Patrocinadores (edrom_conteudo.patrocinadores) ---
  async function renderSponsors() {
    const list = (await EdromData.getConteudoGlobal()).patrocinadores || [];

    // grid (página de patrocínio)
    const grid = document.getElementById('sponsorLogos');
    if (grid) {
      grid.innerHTML = list.map(p => `
        <div class="sponsor-logo" title="${p.nome}">
          <img src="${p.logo}" alt="${p.nome}" loading="lazy"
               onerror="this.src='assets/marca/simbolo-edrom.png'">
        </div>`).join('');
    }

    // marquee (home) — duplica a lista pra rolar em loop contínuo
    const track = document.getElementById('sponsorMarquee');
    if (track) {
      const item = (p) => `
        <div class="marquee-item" title="${p.nome}">
          <img src="${p.logo}" alt="${p.nome}" loading="lazy"
               onerror="this.src='assets/marca/simbolo-edrom.png'">
        </div>`;
      // repete o suficiente pra encher a faixa e duplica para o loop de -50%
      let base = list.slice();
      while (base.length < 6) base = base.concat(list);
      track.innerHTML = (base.concat(base)).map(item).join('');
    }
  }

  /* ============================================================
     2. EXPERIÊNCIA — scroll, parallax, reveals, cursor
     ============================================================ */

  // --- Loader ---
  function initLoader() {
    const loader = document.getElementById('loader');
    if (!loader) return;
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('is-done'), reducedMotion ? 0 : 500);
    });
    // fallback: nunca deixar o loader travado
    setTimeout(() => loader.classList.add('is-done'), 3500);
  }

  // --- Smooth scroll (Lenis) ---
  function initLenis() {
    if (reducedMotion || typeof Lenis === 'undefined') return null;
    // scroll afinado: ease-out exponencial curto — responde rápido e assenta suave
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.05,
      touchMultiplier: 1.6,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // âncoras usam o Lenis para navegar suave
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70 });
        closeMobileMenu();
      });
    });

    // integra Lenis com o ScrollTrigger do GSAP
    if (typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
    }
    window.__lenis = lenis; // exposto para depuração/testes

    // recalcula a altura quando tudo carregar (imagens do time, UFU, marquee etc.)
    // — sem isso o Lenis "corta" o scroll antes do rodapé.
    const recalc = () => { try { lenis.resize(); } catch (e) {} if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); };
    window.addEventListener('load', () => { recalc(); setTimeout(recalc, 400); });
    // imagens que carregam depois também disparam recálculo
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete) img.addEventListener('load', recalc, { once: true });
    });
    return lenis;
  }

  // --- Parallax por scroll (GSAP ScrollTrigger) ---
  function initParallax() {
    if (reducedMotion || typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    // elementos com data-parallax sobem/descem em velocidades diferentes
    document.querySelectorAll('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.parallax) || 0.3;
      gsap.to(el, {
        y: () => -window.innerHeight * speed * 0.5,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    // títulos de seção ganham um leve deslocamento parallax
    document.querySelectorAll('.section-title').forEach(el => {
      gsap.fromTo(el, { y: 40 }, {
        y: -20,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  // --- Interação do hero com o mouse (tilt 3D leve) ---
  function initHeroMouse() {
    if (reducedMotion) return;
    const visual = document.getElementById('heroVisual');
    const symbol = visual ? visual.querySelector('.hero-symbol') : null;
    const title = document.querySelector('.hero-title');
    if (!visual || !symbol) return;

    let rafId = null;
    window.addEventListener('mousemove', (e) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        const cx = (e.clientX / window.innerWidth - 0.5);
        const cy = (e.clientY / window.innerHeight - 0.5);
        // símbolo inclina levemente na direção do cursor
        symbol.style.transform = `rotateY(${cx * 14}deg) rotateX(${-cy * 14}deg) translateZ(0)`;
        if (title) title.style.transform = `translate(${cx * 10}px, ${cy * 6}px)`;
        rafId = null;
      });
    });
  }

  // --- Scroll reveal (IntersectionObserver) ---
  let revealIO = null;
  function initReveals() {
    if (reducedMotion) { revealScan = (root = document) => root.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible')); revealScan(); return; }
    revealIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealScan();
  }
  // observa reveals (inclusive os injetados depois, ex.: cards da equipe async)
  let revealScan = (root = document) => {
    if (!revealIO) return;
    root.querySelectorAll('.reveal:not(.is-visible)').forEach(el => revealIO.observe(el));
  };

  // --- Count-up dos números ---
  function initCountUp() {
    const els = document.querySelectorAll('[data-countup]');
    const animate = (el) => {
      const target = parseInt(el.dataset.target || '0', 10);
      if (reducedMotion) { el.textContent = target; return; }
      const dur = 1600;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cúbico
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }

  // --- Cursor customizado ---
  function initCursor() {
    if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring) return;
    document.body.classList.add('has-cursor');

    let mx = -100, my = -100;   // posição real do mouse
    let rx = -100, ry = -100;   // posição do anel (segue com atraso)

    window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();

    // anel cresce sobre elementos interativos
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest('a, button, .paper-card, .area-card, .team-card')) {
        ring.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest('a, button, .paper-card, .area-card, .team-card')) {
        ring.classList.remove('is-hover');
      }
    });
  }

  // --- Ripple (onda) no clique dos botões ---
  function initRipple() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const span = document.createElement('span');
      span.className = 'ripple';
      span.style.width = span.style.height = size + 'px';
      span.style.left = (e.clientX - r.left - size / 2) + 'px';
      span.style.top = (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
    });
  }

  // --- Botões magnéticos ---
  function initMagnetic() {
    if (reducedMotion || !window.matchMedia('(hover: hover)').matches) return;
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      });
      btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
    });
  }

  // --- Header: fundo ao rolar + menu mobile ---
  function initHeader() {
    const header = document.getElementById('siteHeader');
    const toggle = document.getElementById('menuToggle');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (toggle) {
      toggle.addEventListener('click', () => header.classList.toggle('menu-open'));
    }
  }

  function closeMobileMenu() {
    const header = document.getElementById('siteHeader');
    if (header) header.classList.remove('menu-open');
  }

  // --- Barra de progresso de scroll + link ativo no menu ---
  function initScrollUI() {
    const bar = document.getElementById('scrollProgress');
    if (bar) {
      const update = () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      };
      window.addEventListener('scroll', update, { passive: true });
      update();
    }

    // destaca no menu a seção visível no momento
    const links = Array.from(document.querySelectorAll('.header-nav a[href^="#"]:not(.header-cta)'));
    const byId = {};
    links.forEach(a => { byId[a.getAttribute('href').slice(1)] = a; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = byId[entry.target.id];
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach(a => a.classList.remove('is-active'));
          link.classList.add('is-active');
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    document.querySelectorAll('main section[id]').forEach(s => io.observe(s));
  }

  // fecha menu ao clicar em link (fallback sem Lenis)
  document.addEventListener('click', (e) => {
    if (e.target.closest('.header-nav a')) closeMobileMenu();
  });

  /* ============================================================
     3. BOOT
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    renderConteudo();
    renderTeam();
    renderProjetos();
    renderSponsors();

    initLoader();
    initLenis();
    initParallax();
    initHeroMouse();
    initReveals();
    initCursor();
    initMagnetic();
    initRipple();
    initHeader();
    initScrollUI();
  });
})();
