/**
 * Frontend-klienter for abonnement, verving, partner, KPI-varsler og BankID-signering.
 * Sesjons-scopet via cookie (samme mønster som entitetApi).
 */
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  let data = {};
  try { data = await res.json(); } catch { /* tom */ }
  if (!res.ok) {
    const feil = new Error(typeof data.feil === 'string' ? data.feil : `Feil ${res.status}`);
    feil.status = res.status;
    feil.data = data;
    throw feil;
  }
  return data;
}

export const abonnementApi = {
  hent: () => api('/api/abonnement'),
  start: (planId, intervall = 'mnd') => api('/api/abonnement/start', { method: 'POST', body: JSON.stringify({ planId, intervall }) }),
  kanseller: () => api('/api/abonnement/kanseller', { method: 'POST' }),
  leggTilKort: () => api('/api/abonnement/kort', { method: 'POST' }),
  portal: () => api('/api/abonnement/portal', { method: 'POST' }),
};

export const vervingApi = {
  hent: () => api('/api/verving'),
};

export const partnerApi = {
  hent: () => api('/api/partner'),
};

export const kpiVarslerApi = {
  hent: () => api('/api/kpi-varsler'),
  send: (id) => api(`/api/kpi-varsler/${id}/send`, { method: 'POST' }),
};

export const signeringApi = {
  list: () => api('/api/signering').then((d) => d.signeringer ?? []),
  start: (data) => api('/api/signering', { method: 'POST', body: JSON.stringify(data) }),
};
