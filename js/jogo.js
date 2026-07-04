/* ============================================================
   EDROM — jogo.js
   "Jogo do Robô": marque gols contra o goleiro robô.
   - Trave a MIRA (seta oscila), trave a FORÇA (barra oscila), chute.
   - O goleiro fica mais rápido a cada gol (dificuldade infinita).
   - Se ele defende, faz uma animação de defesa e o jogo acaba.
   - Ranking guarda só o RECORDE de cada nome (filtro de palavrões).
   Renderiza num sistema de coordenadas LÓGICO (800x600) com letterbox,
   então funciona igual em qualquer tamanho — inclusive em tela cheia.
   Cursor customizado (mira estilo game) desenhado no próprio canvas.
   ============================================================ */

(() => {
  'use strict';

  const canvas = document.getElementById('jogoCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const ovStart = document.getElementById('ovStart');
  const ovOver = document.getElementById('ovOver');
  const hudNivel = document.getElementById('hudNivel');
  const hudGols = document.getElementById('hudGols');
  const hudRecorde = document.getElementById('hudRecorde');
  const finalScore = document.getElementById('finalScore');
  const overMsg = document.getElementById('overMsg');
  const nameRow = document.getElementById('nameRow');
  const playerName = document.getElementById('playerName');
  const rankingList = document.getElementById('rankingList');

  const roboImg = new Image();
  roboImg.src = 'assets/chat-robo.png';

  /* ---------- coordenadas lógicas ---------- */
  const LW = 800, LH = 600;            // "mundo" do jogo
  const GOAL_Y = LH * 0.20;            // linha do gol (topo)
  const POST_L = LW * 0.20, POST_R = LW * 0.80;
  const BALL_HOME = { x: LW / 2, y: LH * 0.82 };
  const BALL_R = 19;

  // estado do letterbox (calculado no resize)
  let scale = 1, offX = 0, offY = 0;
  let cssW = 0, cssH = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    const r = canvas.getBoundingClientRect();
    cssW = r.width; cssH = r.height;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    // encaixa 800x600 dentro do canvas mantendo proporção (letterbox)
    scale = Math.min(cssW / LW, cssH / LH);
    offX = (cssW - LW * scale) / 2;
    offY = (cssH - LH * scale) / 2;
  }
  window.addEventListener('resize', resize);

  // converte ponto da tela (cliente) para coordenada lógica
  function toLogical(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const x = ((clientX - r.left) - offX) / scale;
    const y = ((clientY - r.top) - offY) / scale;
    return { x, y };
  }

  /* ---------- estado ---------- */
  // 'start' | 'aim' | 'power' | 'shoot' | 'save' | 'over'
  let state = 'start';
  let score = 0, level = 1, recorde = 0;

  let aimX = 0, aimDir = 1, aimSpeed = 0;
  let power = 0, powerDir = 1;
  let lockedAimX = 0, lockedPower = 0;

  let keeperX = 0, keeperPhase = 0, keeperW = 0, keeperGrab = 0;
  let ball = { x: 0, y: 0, fromX: 0, fromY: 0, toX: 0, toY: 0, t: 0, dur: 0 };
  let flash = 0, saveTimer = 0;
  let lastTime = 0, clock = 0;
  let pointer = { x: LW / 2, y: LH * 0.7, over: false };

  const GOALS_PER_LEVEL = 3;   // 3 gols para subir de nível
  let goalsThisLevel = 0;
  const SHOT_LIMIT = 5;        // 5s pra chutar depois de mirar; senão chuta sozinho
  let shotTimer = 0;

  // botão de boost DESENHADO no canvas (sem botão externo)
  const boostBtn = { x: 0, y: 0, r: 0 };

  // boost "bola pegando fogo": 3 por partida, deixa o chute MUITO rápido
  const BOOST_MAX = 3;
  let boostsLeft = BOOST_MAX, boostArmed = false, ballOnFire = false;

  // tema de cor que muda a cada nível (robô + bola trocam de cor)
  function levelHue() { return ((level - 1) * 35) % 360; }
  function themeColor(l = 0.6, s = 0.9) { return `hsl(${(levelHue() + 45) % 360}, ${s * 100}%, ${l * 100}%)`; }

  function keeperWidth() { return Math.min(LW * 0.22, LW * 0.12 + level * LW * 0.004); }
  function keeperRange() { return { min: POST_L + keeperW / 2, max: POST_R - keeperW / 2 }; }

  /* ---------- ciclo ---------- */
  function startGame() {
    recorde = (EdromData.getRanking()[0] || {}).score || 0;
    score = 0; level = 1; goalsThisLevel = 0;
    boostsLeft = BOOST_MAX; boostArmed = false; ballOnFire = false;
    ovStart.classList.add('is-hidden');
    ovOver.classList.add('is-hidden');
    beginAim();
    updateHud();
  }

  function beginAim() {
    keeperW = keeperWidth();
    state = 'aim';
    aimX = POST_L + keeperW * 0.6;
    aimDir = 1;
    aimSpeed = (LW * 0.55) * (1 + level * 0.06);
    ballOnFire = false;
    shotTimer = SHOT_LIMIT; // reinicia o cronômetro de 5s a cada chute
    // goleiro começa numa posição/fase ALEATÓRIA a cada chute
    keeperPhase = Math.random() * Math.PI * 2;
    const { min, max } = keeperRange();
    keeperX = min + Math.random() * (max - min);
  }

  function beginPower() { state = 'power'; power = 0; powerDir = 1; lockedAimX = aimX; }

  function shoot() {
    state = 'shoot';
    lockedPower = Math.max(0.15, power);
    ball.fromX = BALL_HOME.x; ball.fromY = BALL_HOME.y;
    ball.toX = lockedAimX; ball.toY = GOAL_Y;
    ball.x = ball.fromX; ball.y = ball.fromY;
    ball.t = 0;
    // com boost a bola vai MUITO mais rápido (goleiro quase não reage)
    if (boostArmed && boostsLeft > 0) {
      ballOnFire = true; boostsLeft--; boostArmed = false;
      ball.dur = 0.22;
      updateHud();
    } else {
      ballOnFire = false;
      ball.dur = 0.95 - lockedPower * 0.55; // 0.4s .. 0.8s
    }
  }

  function resolveShot() {
    const saved = Math.abs(ball.toX - keeperX) < (keeperW / 2 + BALL_R);
    if (saved) startSave();
    else {
      score++; goalsThisLevel++; flash = 1;
      if (goalsThisLevel >= GOALS_PER_LEVEL) { level++; goalsThisLevel = 0; } // 3 gols = +1 nível
      if (score > recorde) recorde = score;
      updateHud();
      beginAim();
    }
  }

  // animação de defesa: bola gruda na mão do goleiro, ele "agarra"
  function startSave() {
    state = 'save';
    saveTimer = 0;
    keeperGrab = 1;
    ball.fromX = ball.toX; ball.fromY = ball.toY;
    ball.toX = keeperX; ball.toY = GOAL_Y + LH * 0.02;
  }

  function gameOver() {
    state = 'over';
    document.body.classList.remove('in-game'); // cursor volta na tela de fim
    finalScore.textContent = score;
    overMsg.textContent = 'Coloque seu nome no ranking:';
    overMsg.style.color = '';
    nameRow.style.display = '';
    playerName.value = '';
    document.getElementById('btnSave').disabled = false;
    ovOver.classList.remove('is-hidden');
    setTimeout(() => playerName.focus(), 100);
  }

  function updateHud() {
    hudNivel.textContent = level;
    hudGols.textContent = score;
    hudRecorde.textContent = Math.max(recorde, (EdromData.getRanking()[0] || {}).score || 0);
  }

  function toggleBoost() {
    if (boostsLeft <= 0) return;
    if (state !== 'aim' && state !== 'power') return;
    boostArmed = !boostArmed;
  }

  /* ---------- entrada ---------- */
  function action() {
    if (state === 'aim') beginPower();
    else if (state === 'power') shoot();
  }
  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const p = toLogical(e.clientX, e.clientY);
    pointer.x = p.x; pointer.y = p.y; pointer.over = true;
    // clique no botão de boost desenhado no canvas?
    if (isPlaying() && Math.hypot(p.x - boostBtn.x, p.y - boostBtn.y) <= boostBtn.r) {
      toggleBoost();
      return;
    }
    action();
  });
  const isPlaying = () => state !== 'start' && state !== 'over';
  // rastreia o mouse na JANELA (funciona também em tela cheia) e mapeia pro canvas
  window.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    pointer.x = ((e.clientX - r.left) - offX) / scale;
    pointer.y = ((e.clientY - r.top) - offY) / scale;
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    pointer.over = inside;
    // só esconde o cursor quando ESTÁ jogando (nas telas de início/fim o cursor precisa aparecer)
    document.body.classList.toggle('in-game', inside && isPlaying());
  });

  document.getElementById('btnKick').addEventListener('click', action);
  window.addEventListener('keydown', (e) => {
    if (document.body.dataset.page !== 'jogo') return;
    if (e.code === 'Space' && (state === 'aim' || state === 'power')) { e.preventDefault(); action(); }
    if ((e.key === 'b' || e.key === 'B')) { e.preventDefault(); toggleBoost(); }
  });

  document.getElementById('btnStart').addEventListener('click', startGame);
  document.getElementById('btnRestart').addEventListener('click', startGame);
  document.getElementById('btnRestart2').addEventListener('click', startGame);

  // tela cheia
  const stage = document.querySelector('.jogo-stage');
  document.getElementById('btnFull').addEventListener('click', () => {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      (stage.requestFullscreen || stage.webkitRequestFullscreen || (() => {})).call(stage);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen || (() => {})).call(document);
    }
  });
  const onFsChange = () => { for (let i = 0; i < 6; i++) setTimeout(resize, i * 80); };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  document.getElementById('btnSave').addEventListener('click', salvarScore);
  playerName.addEventListener('keydown', (e) => { if (e.key === 'Enter') salvarScore(); });

  function salvarScore() {
    const nome = playerName.value.trim() || 'ANÔNIMO';
    const res = EdromData.addScore(nome, score);
    if (!res.ok) {
      playerName.classList.add('shake');
      overMsg.textContent = 'Nome não permitido. Escolha outro, por favor.';
      overMsg.style.color = '#ff5a5a';
      setTimeout(() => playerName.classList.remove('shake'), 450);
      return;
    }
    if (res.melhorou === false) {
      overMsg.textContent = `Seu recorde continua ${res.recordeAnterior}. Dessa vez fez ${score} — jogue de novo pra superar!`;
      overMsg.style.color = 'var(--periwinkle)';
    } else {
      overMsg.textContent = res.posicao <= 3
        ? `Incrível! Você entrou no TOP ${res.posicao} do ranking!`
        : `Novo recorde salvo! Você está em ${res.posicao}º no ranking.`;
      overMsg.style.color = 'var(--raio)';
    }
    nameRow.style.display = 'none';
    renderRanking(nome, res.melhorou === false ? res.recordeAnterior : score);
    updateHud();
  }

  /* ---------- ranking (GLOBAL via Supabase, fallback local) ---------- */
  async function renderRanking(meNome, meScore) {
    const list = await EdromData.getRankingGlobal();
    if (list[0]) { recorde = Math.max(recorde, list[0].score); updateHud(); }
    if (!list.length) {
      rankingList.innerHTML = '<div class="ranking-empty">Ninguém no ranking ainda.<br>Seja o primeiro a marcar!</div>';
      return;
    }
    rankingList.innerHTML = list.slice(0, 30).map((e, i) => {
      const me = meNome && e.nome === meNome && e.score === meScore;
      return `
        <div class="ranking-row ${i === 0 ? 'top1' : ''} ${me ? 'me' : ''}">
          <span class="pos">${i + 1}º</span>
          <span class="nome">${escapeHtml(e.nome)}</span>
          <span class="pts">${e.score}</span>
        </div>`;
    }).join('');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- update ---------- */
  function update(dt) {
    // goleiro sempre em movimento (mais rápido a cada nível)
    if (state !== 'save') {
      const kSpeed = 1.1 + level * 0.14;
      keeperPhase += dt * kSpeed;
      const { min, max } = keeperRange();
      keeperX = (min + max) / 2 + Math.sin(keeperPhase) * (max - min) / 2;
    }
    keeperGrab = Math.max(0, keeperGrab - dt * 2);

    // cronômetro de 5s: mira/força correndo. Se zerar, chuta sozinho.
    if (state === 'aim' || state === 'power') {
      shotTimer -= dt;
      if (shotTimer <= 0) {
        shotTimer = 0;
        if (state === 'aim') { beginPower(); shoot(); }
        else shoot();
      }
    }

    if (state === 'aim') {
      aimX += aimDir * aimSpeed * dt;
      const min = POST_L + BALL_R, max = POST_R - BALL_R;
      if (aimX > max) { aimX = max; aimDir = -1; }
      if (aimX < min) { aimX = min; aimDir = 1; }
    } else if (state === 'power') {
      power += powerDir * 1.4 * dt;
      if (power > 1) { power = 1; powerDir = -1; }
      if (power < 0) { power = 0; powerDir = 1; }
    } else if (state === 'shoot') {
      ball.t += dt / ball.dur;
      const t = Math.min(1, ball.t);
      ball.x = ball.fromX + (ball.toX - ball.fromX) * t;
      ball.y = ball.fromY + (ball.toY - ball.fromY) * t - Math.sin(t * Math.PI) * LH * 0.10;
      if (t >= 1) resolveShot();
    } else if (state === 'save') {
      // bola vai pra mão do goleiro; goleiro acompanha a bola
      saveTimer += dt;
      const t = Math.min(1, saveTimer / 0.35);
      ball.x = ball.fromX + (ball.toX - ball.fromX) * t;
      ball.y = ball.fromY + (ball.toY - ball.fromY) * t;
      keeperX = ball.x; // goleiro "pula" pra bola
      keeperGrab = 1;
      if (saveTimer > 1.2) gameOver();
    }
    if (flash > 0) flash = Math.max(0, flash - dt * 1.6);
  }

  /* ---------- desenho ---------- */
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // fundo do letterbox
    ctx.fillStyle = '#0c1a10';
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);
    // recorta na área lógica
    ctx.beginPath(); ctx.rect(0, 0, LW, LH); ctx.clip();

    drawField();
    drawGoal();
    drawKeeper();
    drawLevelBar();
    drawAim();
    drawShotTimer();
    drawBall();
    drawPower();
    drawBoostButton();
    drawGoalFlash();
    drawReticle();

    ctx.restore();
  }

  function drawField() {
    const grad = ctx.createLinearGradient(0, 0, 0, LH);
    grad.addColorStop(0, '#1f7a41'); grad.addColorStop(1, '#14562c');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, LW, LH);
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    for (let i = 0; i < 6; i += 2) ctx.fillRect(0, (LH / 6) * i, LW, LH / 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(LW / 2, LH * 0.56, LW * 0.12, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, LH * 0.56); ctx.lineTo(LW, LH * 0.56); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(LW / 2, LH * 0.56, 4, 0, Math.PI * 2); ctx.fill();
  }

  function drawGoal() {
    const gy = GOAL_Y - LH * 0.02, gh = LH * 0.11;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 5;
    ctx.strokeRect(POST_L, gy, POST_R - POST_L, gh);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1;
    for (let x = POST_L; x <= POST_R; x += (POST_R - POST_L) / 12) {
      ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x, gy + gh); ctx.stroke();
    }
    for (let y = gy; y <= gy + gh; y += gh / 4) {
      ctx.beginPath(); ctx.moveTo(POST_L, y); ctx.lineTo(POST_R, y); ctx.stroke();
    }
  }

  function drawKeeper() {
    const kW = keeperW * (1 + keeperGrab * 0.12);
    const kH = kW;
    const cy = GOAL_Y + kH * 0.20 - keeperGrab * 8;
    const y = cy - kH / 2;
    // aura de cor que muda por nível
    const aura = ctx.createRadialGradient(keeperX, cy, kW * 0.2, keeperX, cy, kW * 0.85);
    aura.addColorStop(0, themeColor(0.6, 0.9).replace('hsl', 'hsla').replace(')', ', 0.55)'));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(keeperX, cy, kW * 0.85, 0, Math.PI * 2); ctx.fill();
    // robô tingido pela cor do nível (hue-rotate); nível 1 = amarelo original
    if (roboImg.complete && roboImg.naturalWidth) {
      ctx.save();
      if (level > 1) ctx.filter = `hue-rotate(${levelHue()}deg) saturate(1.15)`;
      ctx.drawImage(roboImg, keeperX - kW / 2, y, kW, kH);
      ctx.restore();
    } else {
      ctx.fillStyle = themeColor(0.6);
      ctx.beginPath(); ctx.arc(keeperX, cy, kW / 2, 0, Math.PI * 2); ctx.fill();
    }
  }

  // barra lateral de nível (esquerda): mostra o progresso de gols (3 = sobe de nível)
  function drawLevelBar() {
    const segs = GOALS_PER_LEVEL, bx = 16, bw = 16, gap = 6;
    const bh = LH * 0.42, by = LH * 0.30, segH = (bh - gap * (segs - 1)) / segs;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '700 11px "Space Grotesk", sans-serif';
    ctx.fillText('NÍVEL', bx + bw / 2, by - 30);
    ctx.fillStyle = themeColor(0.65);
    ctx.font = '700 22px "Space Grotesk", sans-serif';
    ctx.fillText(String(level), bx + bw / 2, by - 8);
    for (let i = 0; i < segs; i++) {
      const yy = by + bh - (i + 1) * segH - i * gap;
      const on = i < goalsThisLevel;
      ctx.fillStyle = on ? themeColor(0.6) : 'rgba(255,255,255,0.12)';
      roundRect(bx, yy, bw, segH, 4); ctx.fill();
      if (on) { ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 9px "Space Grotesk", sans-serif';
    ctx.fillText(goalsThisLevel + '/' + GOALS_PER_LEVEL, bx + bw / 2, by + bh + 16);
    ctx.restore();
  }

  // botão de BOOST desenhado no canvas (ícone de chama em SVG/Path2D, sem emoji)
  const FLAME = new Path2D('M12 2c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .3-2 1-3 .2 1 .8 1.6 1.5 1.8C10 7 10 4 12 2Z');
  function drawBoostButton() {
    if (!isPlaying()) return;
    boostBtn.r = 30; boostBtn.x = LW - 52; boostBtn.y = LH - 52;
    const on = boostsLeft > 0;
    const armed = boostArmed;
    ctx.save();
    // fundo do botão
    ctx.beginPath(); ctx.arc(boostBtn.x, boostBtn.y, boostBtn.r, 0, Math.PI * 2);
    if (armed) { ctx.fillStyle = 'rgba(255,90,20,0.95)'; }
    else if (on) { ctx.fillStyle = 'rgba(20,15,30,0.75)'; }
    else { ctx.fillStyle = 'rgba(20,15,30,0.5)'; }
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = armed ? '#fff' : (on ? 'rgba(255,120,40,0.9)' : 'rgba(255,255,255,0.2)');
    ctx.stroke();
    if (armed) { // brilho pulsante quando armado
      ctx.strokeStyle = `rgba(255,210,63,${0.5 + 0.5 * Math.sin(clock * 8)})`;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(boostBtn.x, boostBtn.y, boostBtn.r + 4, 0, Math.PI * 2); ctx.stroke();
    }
    // ícone de chama (Path2D 24x24 centrado e escalado)
    ctx.save();
    ctx.translate(boostBtn.x - 15, boostBtn.y - 18); ctx.scale(1.25, 1.25);
    ctx.fillStyle = on ? '#FFD23F' : 'rgba(255,255,255,0.3)';
    ctx.fill(FLAME);
    ctx.restore();
    // pips de quantos boosts restam
    for (let i = 0; i < BOOST_MAX; i++) {
      ctx.beginPath();
      ctx.arc(boostBtn.x - 14 + i * 14, boostBtn.y + 20, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i < boostsLeft ? '#FFD23F' : 'rgba(255,255,255,0.2)';
      ctx.fill();
    }
    ctx.restore();
  }

  // cronômetro de 5s (anel ao redor da bola durante mira/força)
  function drawShotTimer() {
    if (state !== 'aim' && state !== 'power') return;
    const frac = Math.max(0, shotTimer / SHOT_LIMIT);
    const cx = BALL_HOME.x, cy = BALL_HOME.y, r = BALL_R + 12;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.strokeStyle = frac < 0.3 ? '#ff5a5a' : themeColor(0.6);
    ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    ctx.restore();
  }

  // chama do boost na bola
  function drawFire(cx, cy, r) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + clock * 6;
      const len = r * (1.1 + 0.5 * Math.abs(Math.sin(clock * 10 + i)));
      const grd = ctx.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      grd.addColorStop(0, 'rgba(255,220,80,0.95)');
      grd.addColorStop(0.5, 'rgba(255,120,20,0.8)');
      grd.addColorStop(1, 'rgba(255,40,20,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a - 0.3) * r * 0.7, cy + Math.sin(a - 0.3) * r * 0.7);
      ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      ctx.lineTo(cx + Math.cos(a + 0.3) * r * 0.7, cy + Math.sin(a + 0.3) * r * 0.7);
      ctx.closePath(); ctx.fill();
    }
  }

  function drawAim() {
    if (state !== 'aim' && state !== 'power') return;
    ctx.setLineDash([8, 10]); ctx.strokeStyle = 'rgba(255,210,63,0.9)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(BALL_HOME.x, BALL_HOME.y); ctx.lineTo(aimX, GOAL_Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,210,63,0.95)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(aimX, GOAL_Y, BALL_R * 0.9, 0, Math.PI * 2); ctx.stroke();
  }

  function drawPower() {
    if (state !== 'power') return;
    const bw = LW * 0.34, bh = 16, bx = LW / 2 - bw / 2, by = BALL_HOME.y + BALL_R + 20;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(bx, by, bw, bh, 8); ctx.fill();
    const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    pg.addColorStop(0, '#9DB4E8'); pg.addColorStop(1, '#FFD23F');
    ctx.fillStyle = pg; roundRect(bx, by, bw * power, bh, 8); ctx.fill();
    ctx.fillStyle = '#F4F3FB'; ctx.font = '700 13px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('FORÇA', LW / 2, by - 7);
  }

  function drawBall() {
    let bx = BALL_HOME.x, by = BALL_HOME.y;
    if (state === 'shoot' || state === 'save') { bx = ball.x; by = ball.y; }
    // fogo do boost por trás da bola
    if (ballOnFire && (state === 'shoot' || state === 'save')) drawFire(bx, by, BALL_R * 1.5);
    // brilho na cor do nível
    const glow = ctx.createRadialGradient(bx, by, BALL_R * 0.6, bx, by, BALL_R * 1.7);
    glow.addColorStop(0, themeColor(0.6, 0.9).replace('hsl', 'hsla').replace(')', ', 0.5)'));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(bx, by, BALL_R * 1.7, 0, Math.PI * 2); ctx.fill();
    drawSoccerBall(bx, by, BALL_R);
  }

  // bola estilo copa: esfera branca com pentágonos e sombreado.
  // A cor dos pentágonos muda com o nível (preto no nível 1).
  function drawSoccerBall(cx, cy, r) {
    const pentColor = level > 1 ? themeColor(0.18, 0.7) : '#15151f';
    ctx.save();
    // sombra no chão
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.95, r * 0.9, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    // esfera
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.2, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c8cdd8');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    // pentágono central
    const pent = (px, py, rad, rot) => {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = rot + i * (Math.PI * 2 / 5) - Math.PI / 2;
        const x = px + Math.cos(a) * rad, y = py + Math.sin(a) * rad;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    ctx.fillStyle = pentColor;
    pent(cx, cy, r * 0.40, 0); ctx.fill();
    // costuras + pentágonos parciais na borda
    ctx.strokeStyle = 'rgba(20,20,30,0.55)'; ctx.lineWidth = r * 0.09;
    for (let i = 0; i < 5; i++) {
      const a = i * (Math.PI * 2 / 5) - Math.PI / 2;
      const ex = cx + Math.cos(a) * r * 0.40, ey = cy + Math.sin(a) * r * 0.40;
      const ox = cx + Math.cos(a) * r, oy = cy + Math.sin(a) * r;
      ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ox, oy); ctx.stroke();
      // pentágono pequeno perto da borda (entre as costuras)
      const a2 = a + Math.PI / 5;
      const sx = cx + Math.cos(a2) * r * 0.82, sy = cy + Math.sin(a2) * r * 0.82;
      ctx.fillStyle = pentColor;
      pent(sx, sy, r * 0.17, a2 + Math.PI); ctx.fill();
    }
    // brilho
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(cx - r * 0.34, cy - r * 0.4, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawGoalFlash() {
    if (flash <= 0 && state !== 'save') return;
    if (flash > 0) {
      ctx.fillStyle = `rgba(255,210,63,${flash * 0.35})`;
      ctx.fillRect(0, 0, LW, LH);
      ctx.fillStyle = `rgba(255,255,255,${flash})`;
      ctx.font = '700 74px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('GOL!', LW / 2, LH * 0.5);
    }
    if (state === 'save') {
      const a = Math.min(1, saveTimer / 0.4);
      ctx.fillStyle = `rgba(255,90,90,${0.25 * a})`;
      ctx.fillRect(0, 0, LW, LH);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.font = '700 56px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('DEFENDEU!', LW / 2, LH * 0.5);
    }
  }

  // cursor de mira estilo game (Roblox-like), desenhado no canvas.
  // Mostra durante o jogo (inclusive em tela cheia, onde o mouse "some").
  function drawReticle() {
    if (state === 'start' || state === 'over') return;
    const x = pointer.x, y = pointer.y, r = 17;
    const spin = clock * 1.2;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(spin);
    // anel girando (4 arcos separados)
    ctx.strokeStyle = 'rgba(255,210,63,0.95)'; ctx.lineWidth = 2.6;
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath(); ctx.arc(0, 0, r, a + 0.35, a + Math.PI / 2 - 0.35); ctx.stroke();
    }
    ctx.restore();
    // ticks fixos + centro
    ctx.strokeStyle = 'rgba(255,210,63,0.95)'; ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(x - r - 7, y); ctx.lineTo(x - r + 1, y);
    ctx.moveTo(x + r - 1, y); ctx.lineTo(x + r + 7, y);
    ctx.moveTo(x, y - r - 7); ctx.lineTo(x, y - r + 1);
    ctx.moveTo(x, y + r - 1); ctx.lineTo(x, y + r + 7);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------- loop ---------- */
  function loop(now) {
    if (!lastTime) lastTime = now;
    let dt = (now - lastTime) / 1000; lastTime = now;
    if (dt > 0.05) dt = 0.05;
    clock += dt;
    if (state !== 'start' && state !== 'over') update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  resize();
  renderRanking();
  updateHud();
  requestAnimationFrame(loop);
})();
