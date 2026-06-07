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
