/**
 * Frontend-klient for bygg & leieobjekter mot /api (Neon).
 * Alle kall er sesjons-scopet (cookie) — serveren returnerer kun innlogget
 * brukers data. Kaster Error med server-feilmelding ved ikke-2xx.
 */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  let data = {};
  try { data = await res.json(); } catch { /* tom respons */ }
  if (!res.ok) throw new Error(typeof data.feil === 'string' ? data.feil : `Feil ${res.status}`);
  return data;
}

export const byggApi = {
  list: () => api('/api/bygg').then((d) => d.bygg ?? []),
  opprett: (data) => api('/api/bygg', { method: 'POST', body: JSON.stringify(data) }).then((d) => d.bygg),
  oppdater: (id, data) => api(`/api/bygg/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((d) => d.bygg),
  slett: (id) => api(`/api/bygg/${id}`, { method: 'DELETE' }),
};

export const leieobjektApi = {
  list: () => api('/api/leieobjekter').then((d) => d.leieobjekter ?? []),
  opprett: (data) => api('/api/leieobjekter', { method: 'POST', body: JSON.stringify(data) }).then((d) => d.leieobjekt),
  oppdater: (id, data) => api(`/api/leieobjekter/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((d) => d.leieobjekt),
  slett: (id) => api(`/api/leieobjekter/${id}`, { method: 'DELETE' }),
};
