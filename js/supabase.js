/* ============================================================
   EDROM — supabase.js
   Camada leve de acesso ao Supabase via REST + Auth (sem SDK).
   SÓ a chave ANON pública fica aqui — é a correta pro navegador,
   protegida por RLS. NUNCA coloque service_role/secret no cliente.

   - Leitura pública (ranking, equipe, conteúdo, seletivo): usa a anon.
   - Escrita protegida (equipe/conteúdo/seletivo): exige LOGIN do admin
     via Supabase Auth (e-mail+senha). RLS só deixa escrever autenticado.
   - Enquanto as tabelas/usuário não existem, tudo cai no fallback de
     localStorage e o site funciona igual.
   ============================================================ */

window.EdromSB = (() => {
  'use strict';

  const BASE = 'https://rktknlxzjixczfuhysss.supabase.co';
  const REST = BASE + '/rest/v1';
  const AUTH = BASE + '/auth/v1';
  // chave ANON pública (segura no front — RLS protege os dados)
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdGtubHh6aml4Y3pmdWh5c3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTQ3MTgsImV4cCI6MjA5ODczMDcxOH0.dQmuRX9YPVDZFxyDH-ttCt6w1hb40jUKcBdBHeC6HNM';

  // sessão do admin (token) — só no navegador de quem loga
  let session = null;
  try { session = JSON.parse(localStorage.getItem('edrom_sb_session') || 'null'); } catch (e) {}

  const saveSession = (s) => { session = s; try { localStorage.setItem('edrom_sb_session', JSON.stringify(s)); } catch (e) {} };
  const clearSession = () => { session = null; try { localStorage.removeItem('edrom_sb_session'); } catch (e) {} };
  const tokenValido = () => !!(session && session.access_token && session.expires_at && session.expires_at * 1000 > Date.now() + 5000);
  const isAuthed = () => tokenValido();
  const bearer = () => (tokenValido() ? session.access_token : ANON);

  const headers = (extra = {}) => ({
    'apikey': ANON,
    'Authorization': 'Bearer ' + bearer(),
    'Content-Type': 'application/json',
    ...extra,
  });

  let ok = true; // vira false se o backend falhar (aí usa só localStorage)

  /* ---------- Auth ---------- */
  async function signIn(email, password) {
    try {
      const res = await fetch(`${AUTH}/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.access_token) return { ok: false, erro: data.error_description || data.msg || 'Falha no login' };
      saveSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at || (Math.floor(Date.now() / 1000) + (data.expires_in || 3600)),
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: 'Sem conexão com o Supabase' };
    }
  }
  async function signOut() {
    try { if (session && session.access_token) await fetch(`${AUTH}/logout`, { method: 'POST', headers: headers() }); } catch (e) {}
    clearSession();
  }

  /* ---------- REST ---------- */
  async function insert(table, row) {
    try {
      const res = await fetch(`${REST}/${table}`, {
        method: 'POST', headers: headers({ 'Prefer': 'return=representation' }), body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error('insert ' + res.status);
      ok = true; const data = await res.json();
      return Array.isArray(data) ? data[0] : data;
    } catch (e) { ok = false; return null; }
  }

  // upsert (insere ou atualiza) — on_conflict = coluna única
  async function upsert(table, row, onConflict) {
    try {
      const q = onConflict ? `?on_conflict=${onConflict}` : '';
      const res = await fetch(`${REST}/${table}${q}`, {
        method: 'POST',
        headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=representation' }),
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error('upsert ' + res.status);
      ok = true; return await res.json();
    } catch (e) { ok = false; return null; }
  }

  async function remove(table, query) {
    try {
      const res = await fetch(`${REST}/${table}?${query}`, { method: 'DELETE', headers: headers() });
      ok = res.ok; return res.ok;
    } catch (e) { ok = false; return false; }
  }

  async function select(table, query = 'select=*') {
    try {
      const res = await fetch(`${REST}/${table}?${query}`, { headers: headers() });
      if (!res.ok) throw new Error('select ' + res.status);
      ok = true; return await res.json();
    } catch (e) { ok = false; return null; }
  }

  async function ping() {
    try { const res = await fetch(`${REST}/ranking?select=id&limit=1`, { headers: headers() }); return res.ok; }
    catch { return false; }
  }

  const isOnline = () => ok;

  return { insert, upsert, remove, select, ping, isOnline, signIn, signOut, isAuthed, REST };
})();
