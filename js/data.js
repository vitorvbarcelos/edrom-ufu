/* ============================================================
   EDROM — data.js
   Camada de dados do site. Tudo vive no localStorage (JSON).
   Chaves:
     edrom_leads       -> leads coletados pelo chat
     edrom_inscricoes  -> inscrições do processo seletivo
     edrom_seletivo    -> configuração do processo seletivo
     edrom_team        -> membros do Conselho Diretor / equipe
     edrom_conteudo    -> textos e números editáveis
   Na primeira visita, populamos com os dados REAIS da EDROM.
   ============================================================ */

const EdromData = (() => {

  /* ---------- helpers de leitura/escrita ---------- */
  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn('EdromData: erro lendo', key, e);
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  /* ---------- seeds (dados reais da EDROM) ---------- */

  const SEED_TEAM = [
    { nome: 'Gustavo Brazilino', cargo: 'Presidente',             curso: 'Engenharia Mecatrônica', foto: 'https://static.wixstatic.com/media/9d5617_2dd0c87e6ef1403b92b5898d1eedd88c~mv2.png' },
    { nome: 'Gabriel Batista',   cargo: 'Vice-Presidente',        curso: 'Engenharia Mecatrônica', foto: 'https://static.wixstatic.com/media/9d5617_41557bd5497c448c9db81f3dc7a44c3f~mv2.png' },
    { nome: 'Lucas Martins',     cargo: 'Capitão',                curso: 'Engenharia Biomédica',   foto: 'https://static.wixstatic.com/media/9d5617_210602ddaac74db986b1c7863aba0355~mv2.png' },
    { nome: 'Daniel Farlei',     cargo: 'Vice-Capitão',           curso: 'Engenharia Mecatrônica', foto: 'https://static.wixstatic.com/media/9d5617_cd61b58d3969444d8ca6147bdbd182c8~mv2.png' },
    { nome: 'Pâmella Caley',     cargo: 'Diretora de Marketing',  curso: 'Engenharia Mecatrônica', foto: 'https://static.wixstatic.com/media/9d5617_7ff48e3999024a9d873a811067dc5b89~mv2.png' },
    { nome: 'Gabriel Carvalho',  cargo: 'Diretor de Finanças',    curso: 'Administração',          foto: 'https://static.wixstatic.com/media/9d5617_a9eada42211845dea57560b92d90e656~mv2.png' },
    { nome: 'Vinícius Araujo',   cargo: 'Diretor de R.H.',        curso: 'Engenharia Mecânica',    foto: 'https://static.wixstatic.com/media/9d5617_702896ea6def4f2fac9a11e8264529f6~mv2.png' },
    { nome: 'Rogério Sales Gonçalves', cargo: 'Tutor Responsável', curso: 'Professor Doutor',      foto: 'https://static.wixstatic.com/media/9d5617_8c77b20c497a426fba8c7b124f8284b5~mv2.png' },
  ];

  const SEED_CONTEUDO = {
    sobre: 'A Equipe de Desenvolvimento em Robótica Móvel (EDROM) é composta por discentes da Universidade Federal de Uberlândia (UFU) e orientada pelo professor tutor Prof. Dr. Rogério Sales Gonçalves. Desenvolve robôs autônomos, principalmente humanoides, para a disputa da Humanoid Soccer League. Fundada em 2008, já contribuiu para a formação de inúmeros integrantes no âmbito acadêmico e profissional, com o estudo de problemas reais de engenharia, trabalho em equipe e espírito empreendedor. Ao longo dos anos, conquistou mais de 25 premiações em eventos nacionais e internacionais de robótica. Vinculada à FEMEC/UFU.',
    stats: { anos: 15, membros: 20, competicoes: 5, premios: 25 },
    destaque: '3º lugar na CBR 2025 (Humanoid Soccer League)',
    patrocinadores: [
      { nome: 'FEMEC/UFU',  logo: 'https://static.wixstatic.com/media/9d5617_3163b8b62da3408d9bdebfd8729bf7ee~mv2.png' },
      { nome: 'Udi Cortes', logo: 'https://static.wixstatic.com/media/9d5617_e1cdd8ed294e4c9688b6757075236e5a~mv2.png' },
      { nome: 'Patrocinador', logo: 'https://static.wixstatic.com/media/9d5617_6ff23cd28d5a4313a64cc7100a3f5c8c~mv2.png' },
    ],
  };

  // Lista base de palavras proibidas no ranking do jogo (o admin edita/adiciona).
  // Mantida propositalmente enxuta; cobre os xingamentos mais comuns em PT-BR.
  const SEED_PALAVROES = [
    'merda', 'porra', 'caralho', 'buceta', 'cu', 'cuzao', 'cuzão', 'viado', 'viadinho',
    'puta', 'puta que pariu', 'puta que o pariu', 'pqp', 'foda', 'foder', 'fodase', 'foda-se',
    'arrombado', 'corno', 'vagabundo', 'vagabunda', 'piranha', 'vadia', 'safado', 'safada',
    'otario', 'otário', 'idiota', 'imbecil', 'babaca', 'escroto', 'desgraça', 'desgraçado',
    'filho da puta', 'fdp', 'racista', 'macaco', 'preto imundo', 'nazista', 'hitler',
    'penis', 'pênis', 'pinto', 'pau no cu', 'rola', 'xota', 'xoxota', 'boquete', 'chupa',
    'gozar', 'punheta', 'siririca', 'trouxa', 'retardado', 'mongoloide', 'mongol',
  ];

  // Seletivo de exemplo — o admin edita/abre/fecha em /admin.
  const SEED_SELETIVO = {
    ativo: true,
    titulo: 'Processo Seletivo EDROM 2026',
    descricao: 'Venha desenvolver robôs humanoides que jogam futebol sozinhos. Vagas para todas as áreas técnicas e administrativas.',
    etapas: [
      { nome: 'Inscrição',  data: 'Julho 2026' },
      { nome: 'Desafio',    data: 'Agosto 2026' },
      { nome: 'Entrevista', data: 'Agosto 2026' },
      { nome: 'Resultado',  data: 'Setembro 2026' },
    ],
    inscricoesAbertas: false, // começa FECHADO — o admin abre quando o seletivo rolar
  };

  /* ---------- inicialização (primeira visita) ---------- */
  function init() {
    if (!localStorage.getItem('edrom_team'))      write('edrom_team', SEED_TEAM);
    if (!localStorage.getItem('edrom_conteudo'))  write('edrom_conteudo', SEED_CONTEUDO);
    if (!localStorage.getItem('edrom_seletivo'))  write('edrom_seletivo', SEED_SELETIVO);
    if (!localStorage.getItem('edrom_leads'))     write('edrom_leads', []);
    if (!localStorage.getItem('edrom_inscricoes'))write('edrom_inscricoes', []);
    if (!localStorage.getItem('edrom_ranking'))   write('edrom_ranking', []);
    if (!localStorage.getItem('edrom_palavroes')) write('edrom_palavroes', SEED_PALAVROES);

    // migração única: fecha o seletivo para quem já tinha dados salvos (v2).
    // Depois disso o controle é 100% do admin.
    if (localStorage.getItem('edrom_ver') !== '2') {
      const s = read('edrom_seletivo', SEED_SELETIVO);
      s.inscricoesAbertas = false;
      write('edrom_seletivo', s);
      localStorage.setItem('edrom_ver', '2');
    }
  }

  /* ---------- API pública ---------- */

  const getTeam      = () => read('edrom_team', SEED_TEAM);
  const setTeam      = (t) => write('edrom_team', t);

  const getConteudo  = () => read('edrom_conteudo', SEED_CONTEUDO);
  const setConteudo  = (c) => write('edrom_conteudo', c);

  const getSeletivo  = () => read('edrom_seletivo', SEED_SELETIVO);
  const setSeletivo  = (s) => write('edrom_seletivo', s);

  const getLeads     = () => read('edrom_leads', []);
  function addLead(lead) {
    const leads = getLeads();
    leads.push({ ...lead, data: new Date().toISOString() });
    write('edrom_leads', leads);
  }
  const setLeads = (l) => write('edrom_leads', l);

  const getInscricoes = () => read('edrom_inscricoes', []);
  const setInscricoes = (i) => write('edrom_inscricoes', i);

  // Cria inscrição e devolve o código gerado (EDROM-0001, EDROM-0002, ...)
  function addInscricao(dados) {
    const lista = getInscricoes();
    const num = lista.length + 1;
    const codigo = 'EDROM-' + String(num).padStart(4, '0');
    const seletivo = getSeletivo();
    const inscricao = {
      codigo,
      ...dados,
      etapaAtual: 0, // índice na lista de etapas do seletivo
      status: 'Em análise',
      historico: [{ evento: 'Inscrição recebida', data: new Date().toISOString() }],
      data: new Date().toISOString(),
      seletivoTitulo: seletivo.titulo,
    };
    lista.push(inscricao);
    setInscricoes(lista);
    return inscricao;
  }

  // Busca inscrição por código OU e-mail (para "Acompanhar inscrição")
  function findInscricao(chave) {
    const q = String(chave).trim().toLowerCase();
    return getInscricoes().find(i =>
      i.codigo.toLowerCase() === q || (i.email || '').toLowerCase() === q
    ) || null;
  }

  /* ---------- ranking do jogo + moderação ---------- */

  const getRanking = () => read('edrom_ranking', []);
  const setRanking = (r) => write('edrom_ranking', r);

  const getPalavroes = () => read('edrom_palavroes', SEED_PALAVROES);
  const setPalavroes = (p) => write('edrom_palavroes', p);

  // Normaliza para comparar (remove acentos, minúsculas, tira leet básico)
  function normalizar(txt) {
    return String(txt)
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/0/g, 'o').replace(/[@4]/g, 'a').replace(/1|!/g, 'i')
      .replace(/3/g, 'e').replace(/[5$]/g, 's').replace(/7/g, 't');
  }

  // true se o nome NÃO contém palavra proibida
  function nomePermitido(nome) {
    const n = normalizar(nome);
    const compacto = n.replace(/[^a-z]/g, ''); // pega "f u d p" -> "fudp"
    return !getPalavroes().some(p => {
      const pn = normalizar(p);
      return n.includes(pn) || compacto.includes(pn.replace(/[^a-z]/g, ''));
    });
  }

  // Salva score se o nome for limpo. Guarda só o RECORDE de cada nome — a
  // pontuação só muda se for maior que a já registrada para aquele nome.
  // Retorna { ok, motivo, posicao, melhorou, recordeAnterior }
  function addScore(nome, score) {
    const limpo = String(nome).trim().slice(0, 16) || 'ANÔNIMO';
    if (!nomePermitido(limpo)) {
      return { ok: false, motivo: 'nome' };
    }
    const pts = Math.max(0, Math.floor(score));
    const lista = getRanking();
    const chave = normalizar(limpo);
    const existente = lista.find(e => normalizar(e.nome) === chave);
    let melhorou = true, recordeAnterior = 0;

    if (existente) {
      recordeAnterior = existente.score;
      if (pts > existente.score) {
        existente.score = pts;
        existente.nome = limpo;
        existente.data = new Date().toISOString();
      } else {
        melhorou = false; // não regride: mantém o recorde antigo
      }
    } else {
      lista.push({ nome: limpo, score: pts, data: new Date().toISOString() });
    }

    lista.sort((a, b) => b.score - a.score);
    setRanking(lista.slice(0, 100)); // guarda top 100
    const posicao = getRanking().findIndex(e => normalizar(e.nome) === chave) + 1;
    return { ok: true, posicao, melhorou, recordeAnterior };
  }

  /* ---------- Instagram ---------- */
  // Duas formas de mostrar posts REAIS (sem back-end):
  //  1) lista de URLs de posts -> embed oficial do Instagram
  //  2) código de um widget de feed ao vivo (Behold/SnapWidget/LightWidget)
  const getInstaPosts  = () => read('edrom_instagram', []);       // ['https://instagram.com/p/XXXX', ...]
  const setInstaPosts  = (l) => write('edrom_instagram', l);
  const getInstaWidget = () => read('edrom_instagram_widget', ''); // HTML bruto do widget
  const setInstaWidget = (h) => write('edrom_instagram_widget', h);

  /* ---------- backup (export/import) ---------- */
  const KEYS = ['edrom_leads', 'edrom_inscricoes', 'edrom_seletivo', 'edrom_team', 'edrom_conteudo', 'edrom_ranking', 'edrom_palavroes', 'edrom_instagram', 'edrom_instagram_widget'];

  function exportBackup() {
    const dump = {};
    KEYS.forEach(k => { dump[k] = read(k, null); });
    return JSON.stringify(dump, null, 2);
  }

  function importBackup(json) {
    const dump = JSON.parse(json); // deixa lançar erro se JSON inválido
    KEYS.forEach(k => {
      if (dump[k] !== undefined && dump[k] !== null) write(k, dump[k]);
    });
  }

  init();

  return {
    getTeam, setTeam,
    getConteudo, setConteudo,
    getSeletivo, setSeletivo,
    getLeads, addLead, setLeads,
    getInscricoes, setInscricoes, addInscricao, findInscricao,
    getRanking, setRanking, addScore,
    getPalavroes, setPalavroes, nomePermitido,
    getInstaPosts, setInstaPosts, getInstaWidget, setInstaWidget,
    exportBackup, importBackup,
  };
})();
