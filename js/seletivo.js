/* ============================================================
   EDROM — seletivo.js
   Processo seletivo no site:
   - renderiza o seletivo ativo (edrom_seletivo)
   - inscrição via modal (gera código EDROM-0001)
   - acompanhamento por código ou e-mail
   ============================================================ */

(() => {
  'use strict';

  const card = document.getElementById('seletivoCard');
  const modalInscricao = document.getElementById('modalInscricao');
  const modalAcompanhar = document.getElementById('modalAcompanhar');

  /* ---------- render da seção ---------- */
  function renderSeletivo() {
    if (!card) return;
    const s = EdromData.getSeletivo();

    if (!s.ativo) {
      card.innerHTML = `
        <span class="seletivo-status fechado"><span class="dot"></span>SEM SELETIVO ATIVO</span>
        <h3>Nenhum processo seletivo aberto no momento</h3>
        <p>Fique de olho no nosso Instagram <a href="https://instagram.com/edromufu" target="_blank" rel="noopener" style="color:var(--raio)">@edromufu</a> — as novas turmas são anunciadas por lá. Você também pode deixar seu contato pelo chat.</p>
        <div class="seletivo-actions">
          <button class="btn btn-ghost" data-magnetic id="btnAcompanhar">Acompanhar inscrição</button>
        </div>`;
    } else {
      const aberto = s.inscricoesAbertas;
      card.innerHTML = `
        <span class="seletivo-status ${aberto ? 'aberto' : 'fechado'}">
          <span class="dot"></span>${aberto ? 'INSCRIÇÕES ABERTAS' : 'INSCRIÇÕES FECHADAS'}
        </span>
        <h3>${s.titulo}</h3>
        <p>${s.descricao}</p>
        <div class="etapas">
          ${s.etapas.map(e => `
            <div class="etapa">
              <h4>${e.nome}</h4>
              <span>${e.data}</span>
            </div>`).join('')}
        </div>
        <div class="seletivo-actions">
          ${aberto ? '<button class="btn btn-primary" data-magnetic id="btnInscrever">Inscreva-se</button>' : ''}
          <button class="btn btn-ghost" data-magnetic id="btnAcompanhar">Acompanhar inscrição</button>
        </div>`;
    }

    const btnInscrever = document.getElementById('btnInscrever');
    const btnAcompanhar = document.getElementById('btnAcompanhar');
    if (btnInscrever) btnInscrever.addEventListener('click', () => abrirInscricao());
    if (btnAcompanhar) btnAcompanhar.addEventListener('click', () => openModal(modalAcompanhar));
  }

  /* ---------- modais ---------- */
  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(modal) {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close-modal]')) closeModal(backdrop);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop.is-open').forEach(closeModal);
  });

  // Abre o modal de inscrição; aceita dados vindos do chat (pré-preenche)
  function abrirInscricao(prefill) {
    const form = document.getElementById('formInscricao');
    const result = document.getElementById('inscricaoResult');
    if (form) { form.hidden = false; form.reset(); }
    if (result) { result.hidden = true; result.innerHTML = ''; }
    if (prefill && form) {
      const map = { insNome: 'nome', insEmail: 'email', insTelefone: 'telefone', insCurso: 'curso', insPeriodo: 'periodo', insArea: 'area' };
      Object.entries(map).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (el && prefill[key]) el.value = prefill[key];
      });
    }
    openModal(modalInscricao);
  }

  // Exposto para o chat.js chamar (fluxo "fazer parte" -> inscrição)
  window.EdromSeletivo = { abrirInscricao };

  /* ---------- máscara de telefone no formulário ---------- */
  const telInput = document.getElementById('insTelefone');
  if (telInput) {
    telInput.addEventListener('input', () => {
      const d = telInput.value.replace(/\D/g, '').slice(0, 11);
      let out = '';
      if (d.length) out = `(${d.slice(0, 2)}`;
      if (d.length > 2) out += `) ${d.slice(2, d.length <= 10 ? 6 : 7)}`;
      if (d.length > (d.length <= 10 ? 6 : 7)) out += `-${d.slice(d.length <= 10 ? 6 : 7)}`;
      telInput.value = out;
    });
  }

  /* ---------- envio da inscrição ---------- */
  const formInscricao = document.getElementById('formInscricao');
  if (formInscricao) {
    formInscricao.addEventListener('submit', (e) => {
      e.preventDefault();

      // validação campo a campo com shake
      const campos = [
        ['insNome', v => v.length >= 2],
        ['insEmail', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)],
        ['insTelefone', v => v.replace(/\D/g, '').length >= 10],
        ['insCurso', v => v.length >= 2],
        ['insPeriodo', v => v.length >= 1],
        ['insArea', v => v.length >= 1],
      ];
      let ok = true;
      campos.forEach(([id, valid]) => {
        const el = document.getElementById(id);
        if (!valid(el.value.trim())) {
          ok = false;
          el.classList.add('shake');
          setTimeout(() => el.classList.remove('shake'), 450);
        }
      });
      if (!ok) return;

      const inscricao = EdromData.addInscricao({
        nome: document.getElementById('insNome').value.trim(),
        email: document.getElementById('insEmail').value.trim(),
        telefone: document.getElementById('insTelefone').value.trim(),
        curso: document.getElementById('insCurso').value.trim(),
        periodo: document.getElementById('insPeriodo').value.trim(),
        area: document.getElementById('insArea').value,
        portfolio: document.getElementById('insPortfolio').value.trim(),
      });

      // mostra o código gerado
      formInscricao.hidden = true;
      const result = document.getElementById('inscricaoResult');
      result.hidden = false;
      result.innerHTML = `
        <div class="result-box">
          <p>Inscrição enviada com sucesso! Guarde seu código:</p>
          <span class="codigo">${inscricao.codigo}</span>
          <p>Use este código (ou seu e-mail) na aba "Acompanhar inscrição" para ver em qual etapa você está.</p>
        </div>`;
    });
  }

  /* ---------- acompanhamento ---------- */
  const formAcompanhar = document.getElementById('formAcompanhar');
  if (formAcompanhar) {
    formAcompanhar.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = document.getElementById('trackKey');
      const result = document.getElementById('trackResult');
      const inscricao = EdromData.findInscricao(key.value);

      if (!key.value.trim() || !inscricao) {
        key.classList.add('shake');
        setTimeout(() => key.classList.remove('shake'), 450);
        result.innerHTML = `
          <div class="result-box" style="border-color: rgba(255,90,90,.4); background: rgba(255,90,90,.07);">
            <p>Inscrição não encontrada. Confira o código (ex.: EDROM-0001) ou o e-mail usado na inscrição.</p>
          </div>`;
        return;
      }

      const seletivo = EdromData.getSeletivo();
      const etapas = seletivo.etapas || [];
      const statusClass = {
        'Aprovado': 'aprovado', 'Reprovado': 'reprovado',
        'Em análise': 'analise', 'Aguardando': 'aguardando',
      }[inscricao.status] || 'analise';

      result.innerHTML = `
        <div class="result-box" style="text-align:left;">
          <p><strong style="color:var(--papel)">${inscricao.nome}</strong> — ${inscricao.area}</p>
          <span class="codigo">${inscricao.codigo}</span>
          <span class="status-badge ${statusClass}">${inscricao.status}</span>
          <div class="track-steps">
            ${etapas.map((et, i) => {
              const cls = i < inscricao.etapaAtual ? 'done' : (i === inscricao.etapaAtual ? 'current' : '');
              const mark = i < inscricao.etapaAtual ? '✓' : (i + 1);
              return `
                <div class="track-step ${cls}">
                  <div class="track-dot">${mark}</div>
                  <div>
                    <h4>${et.nome}</h4>
                    <span>${et.data}</span>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSeletivo();
    // veio do chat de outra página? abre o modal já preenchido
    if (location.hash === '#inscrever') {
      let prefill = null;
      try { prefill = JSON.parse(sessionStorage.getItem('edrom_prefill_inscricao') || 'null'); } catch (e) {}
      sessionStorage.removeItem('edrom_prefill_inscricao');
      const s = EdromData.getSeletivo();
      if (s.ativo && s.inscricoesAbertas) setTimeout(() => abrirInscricao(prefill || undefined), 400);
    }
  });
})();
