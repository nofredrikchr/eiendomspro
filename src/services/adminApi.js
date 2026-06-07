/** Frontend-klient for admin-API (krever niva=3 server-side). */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  let data = {};
  try { data = await res.json(); } catch { /* tom */ }
  if (!res.ok) throw new Error(typeof data.feil === 'string' ? data.feil : `Feil ${res.status}`);
  return data;
}

export const adminApi = {
  stats: () => api('/api/admin/stats').then((d) => d.stats),
  brukere: (sok = '') => api(`/api/admin/brukere?sok=${encodeURIComponent(sok)}`).then((d) => d.brukere ?? []),
  oppdaterBruker: (id, endring) => api(`/api/admin/brukere/${id}`, { method: 'PATCH', body: JSON.stringify(endring) }).then((d) => d.bruker),
  logg: () => api('/api/admin/logg').then((d) => d.logg ?? []),
};
