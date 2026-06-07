/**
 * Frontend-klienter for de eier-scopede entitetene i Neon (/api). Samme mønster
 * som eiendomApi (bygg/leieobjekter). Sesjons-scopet via cookie.
 */
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

function lagKlient(sti, listeNavn) {
  return {
    list: () => api(`/api/${sti}`).then((d) => d[listeNavn] ?? []),
    opprett: (data) => api(`/api/${sti}`, { method: 'POST', body: JSON.stringify(data) }).then((d) => d.item),
    oppdater: (id, data) => api(`/api/${sti}/${id}`, { method: 'PUT', body: JSON.stringify(data) }).then((d) => d.item),
    slett: (id) => api(`/api/${sti}/${id}`, { method: 'DELETE' }),
  };
}

export const kontraktApi = lagKlient('kontrakter', 'kontrakter');
export const fakturaApi = lagKlient('fakturaer', 'fakturaer');
export const annonseApi = lagKlient('annonser', 'annonser');
export const meldingApi = lagKlient('meldinger', 'meldinger');
export const protokollApi = lagKlient('protokoller', 'protokoller');
export const notatApi = lagKlient('notater', 'notater');
export const utleggApi = lagKlient('utlegg', 'utlegg');
export const utleierApi = lagKlient('utleiere', 'utleiere');

export const faktiskeTallApi = {
  hent: () => api('/api/faktiske-tall').then((d) => d.faktiskeTall ?? {}),
  lagre: (data) => api('/api/faktiske-tall', { method: 'PUT', body: JSON.stringify(data) }).then((d) => d.faktiskeTall ?? {}),
};

// Lagrede boliganalyse-rapporter (eier-scoped entitet).
export const analyseApi = lagKlient('analyser', 'analyser');

// Per-utleier integrasjons-config (blob, kun egen — lest/skrevet via /api).
export const integrasjonApi = {
  hent: () => api('/api/integrasjoner').then((d) => d.config ?? {}),
  lagre: (config) => api('/api/integrasjoner', { method: 'PUT', body: JSON.stringify(config) }).then((d) => d.config ?? {}),
};

// Brukerens profil-felter (blob).
export const profilApi = {
  hent: () => api('/api/profil').then((d) => d.profil ?? {}),
  lagre: (profil) => api('/api/profil', { method: 'PUT', body: JSON.stringify(profil) }).then((d) => d.profil ?? {}),
};

// AI-analyse via server-side proxy (plattform-nøkkel).
export const aiApi = {
  generer: (prompt) => api('/api/ai', { method: 'POST', body: JSON.stringify({ prompt }) }).then((d) => d.tekst ?? ''),
};

