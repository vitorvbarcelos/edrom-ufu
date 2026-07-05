/* ============================================================
   EDROM — admin.js
   Painel administrativo: login simples (sessionStorage),
   leads, inscrições do seletivo, edição do seletivo,
   equipe e conteúdo. Tudo em localStorage, sem back-end.
   ============================================================ */

(() => {
  'use strict';

  /* ============================================================
     CREDENCIAIS — TROQUE AQUI o usuário e a senha do painel
     ============================================================ */
  const ADMIN_USER = 'edrom';
  const ADMIN_PASS = 'edrom2026';

  /* ---------- login ---------- */
  const loginWrap = document.getElementById('loginWrap');
  const adminShell = document.getElementById('adminShell');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');

  function isLogged() {
    return sessionStorage.getItem('admin_logged_in') === 'true';
  }

  // atualiza o selo de status (Global x Local)
  function updateModoBadge() {
    const el = document.getElementById('modoBadge');
    if (!el) return;
    const global = window.EdromSB && window.EdromSB.isAuthed();
    el.textContent = global ? '● Global (Supabase)' : '● Modo local';
    el.className = 'modo-badge ' + (global ? 'on' : 'off');
    el.title = global
      ? 'Você está logado no Supabase: edições valem para TODOS os visitantes.'
      : 'Modo local: edições ficam só neste navegador. Faça login com e-mail (Supabase) para salvar para todos.';
  }

  function showPanel() {
    loginWrap.style.display = 'none';
    adminShell.classList.add('is-logged');
    updateModoBadge();
    renderAll();
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('loginUser').value.trim();
    const p = document.getElementById('loginPass').value;
    loginError.classList.remove('show');

    // 1) tenta login GLOBAL no Supabase (e-mail + senha) -> edições valem pra todos
    if (window.EdromSB && u.includes('@')) {
      const res = await window.EdromSB.signIn(u, p);
      if (res.ok) {
        sessionStorage.setItem('admin_logged_in', 'true');
        showPanel();
        showToast('Conectado ao Supabase — edições valem para todos.');
        return;
      }
    }
    // 2) fallback LOCAL (usuário/senha fixos) -> edita só neste navegador
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      sessionStorage.setItem('admin_logged_in', 'true');
      showPanel();
    } else {
      loginError.textContent = 'Login inválido. Use o e-mail/senha do Supabase (global) ou o usuário local.';
      loginError.classList.add('show');
    }
  });

  document.getElementById('btnLogout').addEventListener('click', async () => {
    sessionStorage.removeItem('admin_logged_in');
    if (window.EdromSB) await window.EdromSB.signOut();
    location.reload();
  });

  /* ---------- toast ---------- */
  const toast = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  /* ---------- abas ---------- */
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('is-active');
    });
  });

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtData = (iso) => {
    try { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
    catch { return iso || ''; }
  };

  /* ============================================================
     ABA 1 — LEADS
     ============================================================ */
  const leadsSearch = document.getElementById('leadsSearch');
  const leadsFilter = document.getElementById('leadsFilter');

  function renderLeads() {
    const tbody = document.querySelector('#leadsTable tbody');
    const empty = document.getElementById('leadsEmpty');
    const q = leadsSearch.value.trim().toLowerCase();
    const tipo = leadsFilter.value;

    let leads = EdromData.getLeads();
    // guarda o índice original para exclusão correta mesmo com filtro
    let rows = leads.map((l, idx) => ({ ...l, _idx: idx }));
    if (tipo) rows = rows.filter(l => l.tipo === tipo);
    if (q) rows = rows.filter(l =>
      `${l.nome} ${l.email} ${l.empresa || ''} ${l.curso || ''} ${l.area || ''}`.toLowerCase().includes(q));

    rows.reverse(); // mais recentes primeiro

    tbody.innerHTML = rows.map(l => `
      <tr>
        <td><span class="tag ${l.tipo}">${l.tipo === 'patrocinio' ? 'Patrocínio' : 'Membro'}</span></td>
        <td>${esc(l.nome)}${l.empresa ? `<br><small style="color:var(--periwinkle)">${esc(l.empresa)}</small>` : ''}</td>
        <td>${esc(l.email)}<br><small style="color:var(--periwinkle)">${esc(l.telefone || '')}</small></td>
        <td>${l.tipo === 'patrocinio'
          ? `Apoio: ${esc(l.apoio || '—')}`
          : `${esc(l.curso || '')} · ${esc(l.periodo || '')}º período · ${esc(l.area || '')}`}</td>
        <td>${fmtData(l.data)}</td>
        <td><button class="mini-btn danger" data-del-lead="${l._idx}">Excluir</button></td>
      </tr>`).join('');

    empty.hidden = rows.length > 0;
    tbody.parentElement.style.display = rows.length ? '' : 'none';

    tbody.querySelectorAll('[data-del-lead]').forEach(btn => {
      btn.addEventListener('click', () => {
        const all = EdromData.getLeads();
        all.splice(parseInt(btn.dataset.delLead, 10), 1);
        EdromData.setLeads(all);
        renderLeads();
        showToast('Lead excluído.');
      });
    });
  }

  leadsSearch.addEventListener('input', renderLeads);
  leadsFilter.addEventListener('change', renderLeads);

  // Exportar CSV dos leads
  document.getElementById('btnExportCsv').addEventListener('click', () => {
    const leads = EdromData.getLeads();
    if (!leads.length) { showToast('Nenhum lead para exportar.'); return; }
    const cols = ['tipo', 'nome', 'empresa', 'email', 'telefone', 'apoio', 'curso', 'periodo', 'area', 'data'];
    const escCsv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(';')]
      .concat(leads.map(l => cols.map(c => escCsv(l[c])).join(';')))
      .join('\n');
    downloadFile('edrom-leads.csv', csv, 'text/csv;charset=utf-8');
    showToast('CSV exportado.');
  });

  /* ============================================================
     ABA 2 — INSCRIÇÕES DO SELETIVO
     ============================================================ */
  const insSearch = document.getElementById('insSearch');
  const STATUS_OPTS = ['Em análise', 'Aprovado', 'Reprovado', 'Aguardando'];

  function renderInscricoes() {
    const tbody = document.querySelector('#insTable tbody');
    const empty = document.getElementById('insEmpty');
    const q = insSearch.value.trim().toLowerCase();
    const etapas = (EdromData.getSeletivo().etapas || []).map(e => e.nome);

    let list = EdromData.getInscricoes().map((i, idx) => ({ ...i, _idx: idx }));
    if (q) list = list.filter(i =>
      `${i.nome} ${i.email} ${i.codigo} ${i.area}`.toLowerCase().includes(q));
    list.reverse();

    tbody.innerHTML = list.map(i => `
      <tr>
        <td style="font-family:var(--font-pixel);font-size:9px;color:var(--raio)">${esc(i.codigo)}</td>
        <td>${esc(i.nome)}<br><small style="color:var(--periwinkle)">${esc(i.email)} · ${esc(i.telefone || '')}</small></td>
        <td>${esc(i.area)}<br><small style="color:var(--periwinkle)">${esc(i.curso)} · ${esc(i.periodo)}º</small></td>
        <td>
          <select class="inline-select" data-etapa="${i._idx}">
            ${etapas.map((nome, ei) => `<option value="${ei}" ${ei === i.etapaAtual ? 'selected' : ''}>${ei + 1}. ${esc(nome)}</option>`).join('')}
          </select>
        </td>
        <td>
          <select class="inline-select" data-status="${i._idx}">
            ${STATUS_OPTS.map(s => `<option ${s === i.status ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td><button class="mini-btn danger" data-del-ins="${i._idx}">Excluir</button></td>
      </tr>`).join('');

    empty.hidden = list.length > 0;
    tbody.parentElement.style.display = list.length ? '' : 'none';

    // avançar/mudar etapa — o candidato vê a atualização no site
    tbody.querySelectorAll('[data-etapa]').forEach(sel => {
      sel.addEventListener('change', () => {
        const all = EdromData.getInscricoes();
        const item = all[parseInt(sel.dataset.etapa, 10)];
        item.etapaAtual = parseInt(sel.value, 10);
        item.historico = item.historico || [];
        item.historico.push({ evento: `Etapa alterada para "${etapas[item.etapaAtual]}"`, data: new Date().toISOString() });
        EdromData.setInscricoes(all);
        showToast('Etapa atualizada.');
      });
    });
    tbody.querySelectorAll('[data-status]').forEach(sel => {
      sel.addEventListener('change', () => {
        const all = EdromData.getInscricoes();
        const item = all[parseInt(sel.dataset.status, 10)];
        item.status = sel.value;
        item.historico = item.historico || [];
        item.historico.push({ evento: `Status alterado para "${sel.value}"`, data: new Date().toISOString() });
        EdromData.setInscricoes(all);
        showToast('Status atualizado.');
      });
    });
    tbody.querySelectorAll('[data-del-ins]').forEach(btn => {
      btn.addEventListener('click', () => {
        const all = EdromData.getInscricoes();
        all.splice(parseInt(btn.dataset.delIns, 10), 1);
        EdromData.setInscricoes(all);
        renderInscricoes();
        showToast('Inscrição excluída.');
      });
    });
  }

  insSearch.addEventListener('input', renderInscricoes);

  /* ============================================================
     ABA 3 — PROCESSO SELETIVO (configuração)
     ============================================================ */
  const etapasList = document.getElementById('etapasList');

  function etapaRow(nome = '', data = '') {
    const row = document.createElement('div');
    row.className = 'etapa-row';
    row.innerHTML = `
      <input type="text" class="etapa-nome" placeholder="Nome da etapa" value="${esc(nome)}">
      <input type="text" class="etapa-data" placeholder="Data (ex.: Agosto 2026)" value="${esc(data)}">
      <button type="button" class="mini-btn danger">×</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    return row;
  }

  // feedback padrão de salvamento global x local
  function feedbackSalvo(res, okMsg) {
    if (res && res.ok) showToast(okMsg + ' — vale pra todos.');
    else showToast('Salvo só neste navegador. Faça login com e-mail (Supabase) pra valer pra todos.');
  }

  async function renderSeletivoForm() {
    const s = await EdromData.getSeletivoGlobal();
    document.getElementById('selAtivo').checked = !!s.ativo;
    document.getElementById('selAbertas').checked = !!s.inscricoesAbertas;
    document.getElementById('selTitulo').value = s.titulo || '';
    document.getElementById('selDescricao').value = s.descricao || '';
    etapasList.innerHTML = '';
    (s.etapas || []).forEach(e => etapasList.appendChild(etapaRow(e.nome, e.data)));
    // badge de status
    const badge = document.getElementById('selStatusBadge');
    if (!s.ativo) { badge.className = 'sel-status off'; badge.textContent = 'ENCERRADO'; }
    else if (s.inscricoesAbertas) { badge.className = 'sel-status aberto'; badge.textContent = 'INSCRIÇÕES ABERTAS'; }
    else { badge.className = 'sel-status fechado'; badge.textContent = 'INSCRIÇÕES FECHADAS'; }
  }

  // atalhos abrir / fechar / encerrar / novo
  async function patchSeletivo(patch, msg) {
    const res = await EdromData.setSeletivoGlobal({ ...EdromData.getSeletivo(), ...patch });
    await renderSeletivoForm();
    renderInscricoes();
    feedbackSalvo(res, msg);
  }
  document.getElementById('btnAbrirInsc').addEventListener('click', () =>
    patchSeletivo({ ativo: true, inscricoesAbertas: true }, 'Inscrições ABERTAS. O site já reflete.'));
  document.getElementById('btnFecharInsc').addEventListener('click', () =>
    patchSeletivo({ inscricoesAbertas: false }, 'Inscrições fechadas.'));
  document.getElementById('btnEncerrarSel').addEventListener('click', () => {
    if (!confirm('Encerrar o seletivo? Ele deixa de aparecer no site (as inscrições já feitas continuam salvas).')) return;
    patchSeletivo({ ativo: false, inscricoesAbertas: false }, 'Seletivo encerrado.');
  });
  document.getElementById('btnNovoSel').addEventListener('click', async () => {
    if (!confirm('Criar um novo seletivo? Isso substitui o título, a descrição e as etapas atuais por um modelo em branco (as inscrições já feitas continuam salvas).')) return;
    const res = await EdromData.setSeletivoGlobal({
      ativo: true, inscricoesAbertas: false,
      titulo: 'Novo Processo Seletivo EDROM',
      descricao: '',
      etapas: [
        { nome: 'Inscrição', data: '' },
        { nome: 'Desafio', data: '' },
        { nome: 'Entrevista', data: '' },
        { nome: 'Resultado', data: '' },
      ],
    });
    await renderSeletivoForm();
    feedbackSalvo(res, 'Novo seletivo criado (fechado)');
  });

  document.getElementById('btnAddEtapa').addEventListener('click', () => {
    etapasList.appendChild(etapaRow());
  });

  document.getElementById('btnSalvarSeletivo').addEventListener('click', async () => {
    const etapas = Array.from(etapasList.querySelectorAll('.etapa-row')).map(row => ({
      nome: row.querySelector('.etapa-nome').value.trim(),
      data: row.querySelector('.etapa-data').value.trim(),
    })).filter(e => e.nome);

    const res = await EdromData.setSeletivoGlobal({
      ativo: document.getElementById('selAtivo').checked,
      inscricoesAbertas: document.getElementById('selAbertas').checked,
      titulo: document.getElementById('selTitulo').value.trim(),
      descricao: document.getElementById('selDescricao').value.trim(),
      etapas,
    });
    renderInscricoes(); // etapas podem ter mudado de nome/quantidade
    feedbackSalvo(res, 'Seletivo salvo');
  });

  /* ============================================================
     ABA 4 — EQUIPE
     ============================================================ */
  const memberForm = document.getElementById('memberForm');
  const memberGrid = document.getElementById('memberGrid');
  const memberFotoFile = document.getElementById('memberFotoFile');
  let memberFotoBase64 = ''; // foto enviada por upload (convertida)

  // upload de foto -> base64 (fica salvo direto no localStorage)
  memberFotoFile.addEventListener('change', () => {
    const file = memberFotoFile.files[0];
    if (!file) { memberFotoBase64 = ''; return; }
    const reader = new FileReader();
    reader.onload = () => { memberFotoBase64 = reader.result; showToast('Foto carregada.'); };
    reader.readAsDataURL(file);
  });

  async function renderTeamAdmin() {
    const team = await EdromData.getTeamGlobal();
    memberGrid.innerHTML = team.map((m, i) => `
      <div class="member-admin-card">
        <img src="${esc(m.foto) || 'assets/marca/simbolo-edrom.png'}" alt=""
             onerror="this.src='assets/marca/simbolo-edrom.png'">
        <div class="info">
          <h4>${esc(m.nome)}</h4>
          <p>${esc(m.cargo)}</p>
          <p>${esc(m.curso)}</p>
        </div>
        <div class="row-actions">
          <button class="mini-btn" data-edit="${i}">Editar</button>
          <button class="mini-btn danger" data-remove="${i}">Remover</button>
        </div>
      </div>`).join('');

    memberGrid.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = EdromData.getTeam()[parseInt(btn.dataset.edit, 10)];
        document.getElementById('memberIndex').value = btn.dataset.edit;
        document.getElementById('memberNome').value = m.nome;
        document.getElementById('memberCargo').value = m.cargo;
        document.getElementById('memberCurso').value = m.curso;
        document.getElementById('memberFotoUrl').value = (m.foto || '').startsWith('data:') ? '' : (m.foto || '');
        memberFotoBase64 = (m.foto || '').startsWith('data:') ? m.foto : '';
        document.getElementById('memberFormTitle').textContent = 'Editar membro';
        document.getElementById('btnCancelMember').hidden = false;
        memberForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    memberGrid.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const team = EdromData.getTeam();
        const m = team[parseInt(btn.dataset.remove, 10)];
        if (!confirm(`Remover "${m.nome}" da equipe?`)) return;
        team.splice(parseInt(btn.dataset.remove, 10), 1);
        const res = await EdromData.setTeamGlobal(team);
        await renderTeamAdmin();
        feedbackSalvo(res, 'Membro removido');
      });
    });
  }

  function resetMemberForm() {
    memberForm.reset();
    document.getElementById('memberIndex').value = '';
    document.getElementById('memberFormTitle').textContent = 'Adicionar membro';
    document.getElementById('btnCancelMember').hidden = true;
    memberFotoBase64 = '';
  }

  document.getElementById('btnCancelMember').addEventListener('click', resetMemberForm);

  memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('memberNome').value.trim();
    const cargo = document.getElementById('memberCargo').value.trim();
    const curso = document.getElementById('memberCurso').value.trim();
    if (!nome || !cargo || !curso) return;

    // prioridade: upload base64 > URL > vazio
    const url = document.getElementById('memberFotoUrl').value.trim();
    const foto = memberFotoBase64 || url || '';

    const team = EdromData.getTeam();
    const idx = document.getElementById('memberIndex').value;
    const msg = idx === '' ? 'Membro adicionado' : 'Membro atualizado';
    if (idx === '') team.push({ nome, cargo, curso, foto });
    else team[parseInt(idx, 10)] = { nome, cargo, curso, foto };
    const res = await EdromData.setTeamGlobal(team);
    resetMemberForm();
    await renderTeamAdmin();
    feedbackSalvo(res, msg);
  });

  /* ============================================================
     ABA RANKING / JOGO — moderação
     ============================================================ */
  const rankSearch = document.getElementById('rankSearch');

  function renderRankingAdmin() {
    const tbody = document.querySelector('#rankTable tbody');
    const empty = document.getElementById('rankEmpty');
    const q = rankSearch.value.trim().toLowerCase();

    let list = EdromData.getRanking().map((e, idx) => ({ ...e, _idx: idx }));
    if (q) list = list.filter(e => (e.nome || '').toLowerCase().includes(q));

    tbody.innerHTML = list.map((e, i) => `
      <tr>
        <td style="font-family:var(--font-pixel);font-size:9px;color:var(--raio)">${i + 1}º</td>
        <td>${esc(e.nome)}</td>
        <td style="color:var(--raio);font-weight:600">${e.score}</td>
        <td>${fmtData(e.data)}</td>
        <td><button class="mini-btn danger" data-del-rank="${e._idx}">Remover</button></td>
      </tr>`).join('');

    empty.hidden = list.length > 0;
    tbody.parentElement.style.display = list.length ? '' : 'none';

    tbody.querySelectorAll('[data-del-rank]').forEach(btn => {
      btn.addEventListener('click', () => {
        const all = EdromData.getRanking();
        all.splice(parseInt(btn.dataset.delRank, 10), 1);
        EdromData.setRanking(all);
        renderRankingAdmin();
        showToast('Score removido do ranking.');
      });
    });
  }
  rankSearch.addEventListener('input', renderRankingAdmin);

  document.getElementById('btnLimparRanking').addEventListener('click', () => {
    if (!confirm('Apagar TODO o ranking do jogo? Isso não pode ser desfeito.')) return;
    EdromData.setRanking([]);
    renderRankingAdmin();
    showToast('Ranking zerado.');
  });

  // --- palavras proibidas ---
  const palavroesList = document.getElementById('palavroesList');
  const novaPalavra = document.getElementById('novaPalavra');

  function renderPalavroes() {
    const list = EdromData.getPalavroes();
    palavroesList.innerHTML = list.map((p, i) => `
      <span class="palavra-chip">${esc(p)}<button data-del-palavra="${i}" aria-label="Remover">×</button></span>
    `).join('') || '<span style="color:var(--periwinkle);font-size:.88rem">Nenhuma palavra na lista.</span>';

    palavroesList.querySelectorAll('[data-del-palavra]').forEach(btn => {
      btn.addEventListener('click', () => {
        const all = EdromData.getPalavroes();
        all.splice(parseInt(btn.dataset.delPalavra, 10), 1);
        EdromData.setPalavroes(all);
        renderPalavroes();
      });
    });
  }

  function addPalavra() {
    const val = novaPalavra.value.trim().toLowerCase();
    if (!val) return;
    const all = EdromData.getPalavroes();
    if (!all.includes(val)) { all.push(val); EdromData.setPalavroes(all); }
    novaPalavra.value = '';
    renderPalavroes();
    showToast('Palavra adicionada à lista de bloqueio.');
  }
  document.getElementById('btnAddPalavra').addEventListener('click', addPalavra);
  novaPalavra.addEventListener('keydown', (e) => { if (e.key === 'Enter') addPalavra(); });

  /* ============================================================
     ABA 5 — CONTEÚDO
     ============================================================ */
  const patrocList = document.getElementById('patrocList');

  function patrocRow(nome = '', logo = '') {
    const row = document.createElement('div');
    row.className = 'etapa-row';
    row.innerHTML = `
      <input type="text" class="patroc-nome" placeholder="Nome" value="${esc(nome)}">
      <input type="url" class="patroc-logo" placeholder="URL do logo" value="${esc(logo)}">
      <button type="button" class="mini-btn danger">×</button>`;
    row.querySelector('button').addEventListener('click', () => row.remove());
    return row;
  }

  async function renderConteudoForm() {
    const c = await EdromData.getConteudoGlobal();
    document.getElementById('contSobre').value = c.sobre || '';
    document.getElementById('contDestaque').value = c.destaque || '';
    document.getElementById('contAnos').value = c.stats?.anos ?? 0;
    document.getElementById('contMembros').value = c.stats?.membros ?? 0;
    document.getElementById('contCompeticoes').value = c.stats?.competicoes ?? 0;
    document.getElementById('contPremios').value = c.stats?.premios ?? 0;
    patrocList.innerHTML = '';
    (c.patrocinadores || []).forEach(p => patrocList.appendChild(patrocRow(p.nome, p.logo)));
    // instagram
    document.getElementById('instaWidget').value = EdromData.getInstaWidget() || '';
    document.getElementById('instaPosts').value = (EdromData.getInstaPosts() || []).join('\n');
  }

  document.getElementById('btnSalvarInsta').addEventListener('click', () => {
    EdromData.setInstaWidget(document.getElementById('instaWidget').value.trim());
    const posts = document.getElementById('instaPosts').value
      .split('\n').map(s => s.trim()).filter(s => /instagram\.com\/(p|reel)\//.test(s));
    EdromData.setInstaPosts(posts);
    showToast('Instagram salvo. A página de Contato já usa isso.');
  });

  document.getElementById('btnAddPatroc').addEventListener('click', () => {
    patrocList.appendChild(patrocRow());
  });

  document.getElementById('btnSalvarConteudo').addEventListener('click', async () => {
    const c = EdromData.getConteudo();
    c.sobre = document.getElementById('contSobre').value.trim();
    c.destaque = document.getElementById('contDestaque').value.trim();
    c.stats = {
      anos: parseInt(document.getElementById('contAnos').value, 10) || 0,
      membros: parseInt(document.getElementById('contMembros').value, 10) || 0,
      competicoes: parseInt(document.getElementById('contCompeticoes').value, 10) || 0,
      premios: parseInt(document.getElementById('contPremios').value, 10) || 0,
    };
    c.patrocinadores = Array.from(patrocList.querySelectorAll('.etapa-row')).map(row => ({
      nome: row.querySelector('.patroc-nome').value.trim(),
      logo: row.querySelector('.patroc-logo').value.trim(),
    })).filter(p => p.nome);
    const res = await EdromData.setConteudoGlobal(c);
    feedbackSalvo(res, 'Conteúdo salvo');
  });

  /* ============================================================
     BACKUP — exportar / importar tudo (.json)
     ============================================================ */
  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  document.getElementById('btnExportBackup').addEventListener('click', () => {
    downloadFile('edrom-backup.json', EdromData.exportBackup(), 'application/json');
    showToast('Backup exportado.');
  });

  const importFile = document.getElementById('importFile');
  document.getElementById('btnImportBackup').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        EdromData.importBackup(reader.result);
        renderAll();
        showToast('Backup restaurado com sucesso.');
      } catch {
        showToast('Arquivo inválido — use um backup .json exportado daqui.');
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  /* ---------- render geral ---------- */
  function renderAll() {
    renderLeads();
    renderInscricoes();
    renderSeletivoForm();      // async — carrega do Supabase se logado
    renderTeamAdmin();         // async
    renderRankingAdmin();
    renderPalavroes();
    renderConteudoForm();      // async
    updateModoBadge();
  }

  // Sessão já autenticada (ex.: recarregou a página) — abre o painel direto.
  // Fica no fim do arquivo para todas as referências já existirem.
  if (isLogged()) showPanel();
})();
