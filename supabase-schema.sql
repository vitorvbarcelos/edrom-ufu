-- ============================================================
-- EDROM — schema do Supabase
-- Rode UMA VEZ no painel: SQL Editor -> New query -> cole -> Run.
-- Cria as tabelas e as políticas de segurança (RLS).
-- A chave ANON (pública) só consegue o que estas políticas permitem.
-- ============================================================

-- Ranking do jogo (PÚBLICO: qualquer um insere e lê) --------------------
create table if not exists public.ranking (
  id         bigint generated always as identity primary key,
  nome       text not null,
  score      int  not null default 0,
  created_at timestamptz not null default now()
);
alter table public.ranking enable row level security;

drop policy if exists "ranking_insert_anon" on public.ranking;
create policy "ranking_insert_anon" on public.ranking
  for insert to anon with check (score >= 0 and char_length(nome) between 1 and 16);

drop policy if exists "ranking_select_anon" on public.ranking;
create policy "ranking_select_anon" on public.ranking
  for select to anon using (true);

-- Leads do chat (anon SÓ insere; leitura fica pro time no painel) --------
create table if not exists public.leads (
  id         bigint generated always as identity primary key,
  tipo       text,
  nome       text,
  empresa    text,
  email      text,
  telefone   text,
  apoio      text,
  curso      text,
  periodo    text,
  area       text,
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
drop policy if exists "leads_insert_anon" on public.leads;
create policy "leads_insert_anon" on public.leads
  for insert to anon with check (true);

-- Inscrições do seletivo (anon SÓ insere) --------------------------------
create table if not exists public.inscricoes (
  id          bigint generated always as identity primary key,
  codigo      text,
  nome        text,
  email       text,
  telefone    text,
  curso       text,
  periodo     text,
  area        text,
  portfolio   text,
  seletivo    text,
  created_at  timestamptz not null default now()
);
alter table public.inscricoes enable row level security;
drop policy if exists "inscricoes_insert_anon" on public.inscricoes;
create policy "inscricoes_insert_anon" on public.inscricoes
  for insert to anon with check (true);

-- Respostas de formulários (anon SÓ insere) ------------------------------
create table if not exists public.form_respostas (
  id         bigint generated always as identity primary key,
  form_id    text,
  form_titulo text,
  valores    jsonb,
  created_at timestamptz not null default now()
);
alter table public.form_respostas enable row level security;
drop policy if exists "form_respostas_insert_anon" on public.form_respostas;
create policy "form_respostas_insert_anon" on public.form_respostas
  for insert to anon with check (true);

-- Equipe (PÚBLICO lê; SÓ ADMIN LOGADO escreve) --------------------------
create table if not exists public.team (
  id         bigint generated always as identity primary key,
  nome       text not null,
  cargo      text,
  curso      text,
  foto       text,
  ordem      int default 0,
  created_at timestamptz not null default now()
);
alter table public.team enable row level security;
drop policy if exists "team_select_all" on public.team;
create policy "team_select_all" on public.team for select using (true);
drop policy if exists "team_write_auth" on public.team;
create policy "team_write_auth" on public.team for all to authenticated using (true) with check (true);

-- Config do site: conteúdo e seletivo (PÚBLICO lê; SÓ ADMIN escreve) -----
create table if not exists public.site_config (
  key        text primary key,          -- 'conteudo' | 'seletivo'
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.site_config enable row level security;
drop policy if exists "config_select_all" on public.site_config;
create policy "config_select_all" on public.site_config for select using (true);
drop policy if exists "config_write_auth" on public.site_config;
create policy "config_write_auth" on public.site_config for all to authenticated using (true) with check (true);

-- Índices úteis
create index if not exists idx_ranking_score on public.ranking (score desc);

-- ============================================================
-- CRIE O USUÁRIO ADMIN (pra logar no /admin.html e editar equipe/conteúdo):
--   Authentication -> Users -> Add user -> e-mail + senha (marque "Auto Confirm").
-- Depois é só logar no painel com esse e-mail/senha. Sem login, o admin
-- ainda funciona LOCAL (localStorage), mas não salva pra todo mundo.
-- ============================================================

-- ============================================================
-- Pronto. O site já usa a tabela `ranking` como placar GLOBAL.
-- Leads/inscrições/respostas ficam salvos aqui (veja em Table Editor)
-- além do backup local. Nada de service_role no front-end.
-- ============================================================
