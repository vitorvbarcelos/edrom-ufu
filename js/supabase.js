/* ============================================================
   EDROM — supabase.js
   Camada leve de acesso ao Supabase via REST (sem SDK).
   SÓ a chave ANON pública fica aqui — é a correta pro navegador,
   protegida por RLS. NUNCA coloque service_role/secret no cliente.

   Enquanto as tabelas não existem (rodar o supabase-schema.sql no
   painel), tudo cai no fallback de localStorage e o site funciona.
   ============================================================ */

window.EdromSB = (() => {
  'use strict';

  const URL = 'https://rktknlxzjixczfuhysss.supabase.co/rest/v1';
  // chave ANON pública (segura no front — RLS protege os dados)
  const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrdGtubHh6aml4Y3pmdWh5c3NzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTQ3MTgsImV4cCI6MjA5ODczMDcxOH0.dQmuRX9YPVDZFxyDH-ttCt6w1hb40jUKcBdBHeC6HNM';

  const headers = (extra = {}) => ({
    'apikey': ANON,
    'Authorization': 'Bearer ' + ANON,
    'Content-Type': 'application/json',
    ...extra,
  });

  let ok = true; // vira false se o backend falhar (aí usa só localStorage)

  // INSERT — devolve a linha criada (ou null se falhar)
  async function insert(table, row) {
    try {
      const res = await fetch(`${URL}/${table}`, {
        method: 'POST',
        headers: headers({ 'Prefer': 'return=representation' }),
        body: JSON.stringify(row),
      });
      if (!res.ok) throw new Error('insert ' + res.status);
      const data = await res.json();
      ok = true;
      return Array.isArray(data) ? data[0] : data;
    } catch (e) {
      ok = false;
      return null;
    }
  }

  // SELECT — query no formato PostgREST (ex.: 'select=*&order=score.desc&limit=50')
  async function select(table, query = 'select=*') {
    try {
      const res = await fetch(`${URL}/${table}?${query}`, { headers: headers() });
      if (!res.ok) throw new Error('select ' + res.status);
      ok = true;
      return await res.json();
    } catch (e) {
      ok = false;
      return null;
    }
  }

  // ping leve (usado pelo keep-alive / diagnóstico)
  async function ping() {
    try {
      const res = await fetch(`${URL}/ranking?select=id&limit=1`, { headers: headers() });
      return res.ok;
    } catch { return false; }
  }

  const isOnline = () => ok;

  return { insert, select, ping, isOnline, URL };
})();
