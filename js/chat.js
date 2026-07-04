/* ============================================================
   EDROM — chat.js
   Chat de atendimento SEM IA: árvore de decisão com passos
   fixos (mesmo mecanismo do LinkBio). Coleta dados, valida,
   e salva leads em localStorage ('edrom_leads').
   ============================================================ */

(() => {
  'use strict';

  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const messagesEl = document.getElementById('chatMessages');
  const inputRow = document.getElementById('chatInputRow');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');

  if (!fab || !panel) return;

  let state = { fluxo: null, passo: 0, dados: {}, aguardandoInput: null };
  let started = false;

  /* ---------- utilitários de UI ---------- */

  const scrollBottom = () => {
    // rola pro fim sempre (2 frames pra pegar a altura já renderizada)
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
      requestAnimationFrame(() => { messagesEl.scrollTop = messagesEl.scrollHeight; });
    });
  };
  // garante o auto-scroll a cada mudança (mensagem, "digitando", opções)
  new MutationObserver(scrollBottom).observe(messagesEl, { childList: true, subtree: true });

  function addUserMsg(text) {
    const el = document.createElement('div');
    el.className = 'chat-msg user';
    el.textContent = text;
    messagesEl.appendChild(el);
    scrollBottom();
  }

  // Mensagem do bot com efeito "digitando" (atraso proposital)
  function botSay(text, delay = 700) {
    return new Promise(resolve => {
      const typing = document.createElement('div');
      typing.className = 'chat-typing';
      typing.innerHTML = '<i></i><i></i><i></i>';
      messagesEl.appendChild(typing);
      scrollBottom();
      setTimeout(() => {
        typing.remove();
        const el = document.createElement('div');
        el.className = 'chat-msg bot';
        el.textContent = text;
        messagesEl.appendChild(el);
        scrollBottom();
        resolve();
      }, delay);
    });
  }

  // Opções em forma de botões (árvore de decisão)
  function showOptions(options) {
    hideInput();
    const wrap = document.createElement('div');
    wrap.className = 'chat-options';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'chat-option';
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        wrap.remove();
        addUserMsg(opt.label);
        opt.action();
      });
      wrap.appendChild(btn);
    });
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function showInput(placeholder, validator, onValue, mask) {
    inputRow.classList.remove('is-hidden');
    input.placeholder = placeholder || 'Digite aqui...';
    input.value = '';
    input.oninput = mask ? () => { input.value = mask(input.value); } : null;
    state.aguardandoInput = { validator, onValue };
    setTimeout(() => input.focus(), 100);
  }

  function hideInput() {
    inputRow.classList.add('is-hidden');
    state.aguardandoInput = null;
  }

  function submitInput() {
    if (!state.aguardandoInput) return;
    const value = input.value.trim();
    const { validator, onValue } = state.aguardandoInput;
    if (validator && !validator(value)) {
      // erro de validação: shake no campo
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 450);
      return;
    }
    hideInput();
    addUserMsg(value);
    onValue(value);
  }

  sendBtn.addEventListener('click', submitInput);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitInput(); });

  /* ---------- validações e máscara ---------- */

  const vNome = (v) => v.length >= 2;
  const vEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const vTelefone = (v) => v.replace(/\D/g, '').length >= 10;
  const vLivre = (v) => v.length >= 1;

  // Máscara de telefone: (34) 99999-9999
  function maskTelefone(v) {
    const d = v.replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d.length ? `(${d}` : '';
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  /* ---------- roteiro (árvore de decisão) ---------- */

  async function startChat() {
    state = { fluxo: null, passo: 0, dados: {}, aguardandoInput: null };
    await botSay('Olá! Aqui é o atendimento da EDROM — a equipe de robótica da UFU.', 600);
    await botSay('Como posso te ajudar hoje?', 700);
    showOptions([
      { label: 'Quero patrocinar a EDROM', action: fluxoPatrocinio },
      { label: 'Quero fazer parte da equipe', action: fluxoMembro },
    ]);
  }

  /* ----- Fluxo A: patrocínio ----- */
  async function fluxoPatrocinio() {
    state.fluxo = 'patrocinio';
    await botSay('Que ótimo! Empresas parceiras são o motor da EDROM.', 700);
    await botSay('Pra começar, qual o seu nome?', 600);
    showInput('Seu nome', vNome, async (nome) => {
      state.dados.nome = nome;
      await botSay(`Prazer, ${nome.split(' ')[0]}! Qual o nome da sua empresa?`, 700);
      showInput('Nome da empresa', vLivre, async (empresa) => {
        state.dados.empresa = empresa;
        await botSay('Qual e-mail podemos usar para contato?', 600);
        showInput('email@empresa.com', vEmail, async (email) => {
          state.dados.email = email;
          await botSay('E um telefone com DDD?', 600);
          showInput('(34) 99999-9999', vTelefone, async (telefone) => {
            state.dados.telefone = telefone;
            await botSay('Como a empresa pode apoiar a equipe?', 600);
            showOptions([
              { label: 'Apoio financeiro', action: () => finishPatrocinio('financeiro') },
              { label: 'Materiais / equipamentos', action: () => finishPatrocinio('material') },
              { label: 'Serviços', action: () => finishPatrocinio('servicos') },
              { label: 'Outro', action: () => finishPatrocinio('outro') },
            ]);
          }, maskTelefone);
        });
      });
    });
  }

  async function finishPatrocinio(apoio) {
    state.dados.apoio = apoio;
    EdromData.addLead({ tipo: 'patrocinio', ...state.dados });
    await botSay('Perfeito! Registramos seu interesse em patrocinar a EDROM.', 800);
    await botSay('Nossa diretoria vai entrar em contato em breve. Se preferir, fale direto com a gente: edromufu@gmail.com', 900);
    await botSay('Obrigado por acreditar na robótica universitária!', 700);
    offerRestart();
  }

  /* ----- Fluxo B: fazer parte da equipe ----- */
  async function fluxoMembro() {
    state.fluxo = 'membro';
    await botSay('Boa escolha! A EDROM é feita de gente que gosta de resolver problema difícil.', 750);
    await botSay('Qual o seu nome?', 600);
    showInput('Seu nome', vNome, async (nome) => {
      state.dados.nome = nome;
      await botSay(`Show, ${nome.split(' ')[0]}! Qual o seu e-mail?`, 650);
      showInput('seu@email.com', vEmail, async (email) => {
        state.dados.email = email;
        await botSay('Telefone com DDD?', 600);
        showInput('(34) 99999-9999', vTelefone, async (telefone) => {
          state.dados.telefone = telefone;
          await botSay('Qual curso você faz?', 600);
          showInput('Ex.: Engenharia Mecatrônica', vLivre, async (curso) => {
            state.dados.curso = curso;
            await botSay('Em que período você está?', 600);
            showInput('Ex.: 3º', vLivre, async (periodo) => {
              state.dados.periodo = periodo;
              await botSay('Qual área te interessa mais?', 600);
              const areas = ['Estrutura', 'Elétrica', 'Movimento', 'Visão', 'Behaviour', 'Marketing', 'Finanças', 'RH'];
              showOptions(areas.map(a => ({ label: a, action: () => finishMembro(a) })));
            });
          });
        }, maskTelefone);
      });
    });
  }

  async function finishMembro(area) {
    state.dados.area = area;
    EdromData.addLead({ tipo: 'membro', ...state.dados });

    const seletivo = EdromData.getSeletivo();
    if (seletivo.ativo && seletivo.inscricoesAbertas) {
      // Seletivo aberto: oferece a inscrição direta
      await botSay(`Registrado! E temos uma boa notícia: o "${seletivo.titulo}" está com inscrições ABERTAS.`, 850);
      await botSay('Quer se inscrever agora?', 600);
      showOptions([
        {
          label: 'Inscrever no seletivo',
          action: async () => {
            await botSay('Vou abrir o formulário de inscrição pra você. Boa sorte!', 700);
            if (window.EdromSeletivo) {
              // estamos na página do seletivo: abre o modal já preenchido
              window.EdromSeletivo.abrirInscricao(state.dados);
            } else {
              // outra página: guarda os dados e leva pro seletivo (abre o modal lá)
              try { sessionStorage.setItem('edrom_prefill_inscricao', JSON.stringify(state.dados)); } catch (e) {}
              window.location.href = 'seletivo.html#inscrever';
            }
            offerRestart();
          },
        },
        {
          label: 'Agora não',
          action: async () => {
            await botSay('Sem problema! Seu contato ficou guardado — te avisaremos das novidades.', 800);
            offerRestart();
          },
        },
      ]);
    } else {
      await botSay('Registrado! No momento as inscrições do processo seletivo estão fechadas.', 850);
      await botSay('Mas seu contato ficou guardado: assim que abrir uma nova turma, você fica sabendo. Fique de olho no @edromufu!', 900);
      offerRestart();
    }
  }

  function offerRestart() {
    showOptions([
      { label: 'Recomeçar conversa', action: () => { messagesEl.innerHTML = ''; startChat(); } },
    ]);
  }

  /* ---------- abre/fecha painel ---------- */
  fab.addEventListener('click', () => {
    const open = panel.classList.toggle('is-open');
    fab.classList.toggle('is-open', open);
    if (open && !started) {
      started = true;
      startChat();
    }
  });

  // CTAs de patrocínio (seção Patrocínio + banda final) abrem o chat direto no fluxo
  document.querySelectorAll('.js-open-chat-patrocinio').forEach(btn => {
    btn.addEventListener('click', () => {
      panel.classList.add('is-open');
      fab.classList.add('is-open');
      started = true;
      messagesEl.innerHTML = '';
      hideInput();
      addUserMsg('Quero patrocinar a EDROM');
      fluxoPatrocinio();
    });
  });
})();
