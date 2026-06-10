/**
 * Feedback- og support-tjeneste for EiendomsPRO — Neon-backend via /api/feedback.
 *
 * Admin (niva=3) ser alle saker; vanlige brukere ser kun egne. Tilgang og
 * avsender/leser styres server-side (sesjon), ikke av klienten. Samme
 * funksjonskontrakt som før, så kallstedene er uendret.
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

// ─── Etiketter ────────────────────────────────────────────────────────────────
export const TYPE_INFO = {
  feil:     { label: 'Feil / bug', farge: '#f87171', emoji: '🐞' },
  onske:    { label: 'Ønske / forslag', farge: '#C9A84C', emoji: '💡' },
  sporsmal: { label: 'Spørsmål', farge: '#60a5fa', emoji: '💬' },
};
export const STATUS_INFO = {
  ny:           { label: 'Ny', farge: '#60a5fa' },
  under_arbeid: { label: 'Under arbeid', farge: '#f59e0b' },
  lost:         { label: 'Løst', farge: '#4ade80' },
  avvist:       { label: 'Avvist', farge: '#71717a' },
};

// ─── Gjeldende bruker / rolle (fra sesjon) ──────────────────────────────────────
export async function gjeldendeBruker() {
  try {
    const { bruker } = await api('/api/auth/me');
    if (bruker) return { id: bruker.id, navn: bruker.fulltNavn, epost: bruker.epost || '' };
  } catch { /* ikke innlogget */ }
  return { id: 'meg', navn: 'Meg', epost: '' };
}
export async function erAdmin() {
  try { const { bruker } = await api('/api/auth/me'); return bruker?.niva === 3; } catch { return false; }
}

// ─── Saker ──────────────────────────────────────────────────────────────────────
export async function hentSaker() {
  try { return (await api('/api/feedback')).saker ?? []; } catch { return []; }
}
export async function hentSak(id) {
  try { return (await api(`/api/feedback/${id}`)).sak ?? null; } catch { return null; }
}
export async function opprettSak({ type, tittel, beskrivelse }) {
  return (await api('/api/feedback', { method: 'POST', body: JSON.stringify({ type, tittel, beskrivelse }) })).sak;
}
export async function sendMelding(sakId, { tekst, type = 'melding', meta = null } = {}) {
  return (await api(`/api/feedback/${sakId}/melding`, { method: 'POST', body: JSON.stringify({ tekst, type, meta }) })).sak;
}
export async function settStatus(sakId, status) {
  return (await api(`/api/feedback/${sakId}`, { method: 'PATCH', body: JSON.stringify({ status }) })).sak;
}
export async function giBelonning(sakId, { beskrivelse, maaneder }) {
  return (await api(`/api/feedback/${sakId}`, { method: 'PATCH', body: JSON.stringify({ belonning: { beskrivelse, maaneder } }) })).sak;
}
export async function markerLest(sakId) {
  try { await api(`/api/feedback/${sakId}/lest`, { method: 'POST', body: JSON.stringify({}) }); } catch { /* ignore */ }
}
export async function slettSak(sakId) {
  await api(`/api/feedback/${sakId}`, { method: 'DELETE' });
}

// ─── Tellere (utledet fra saker) ────────────────────────────────────────────────
export async function antallUlestForBruker() {
  const saker = await hentSaker();
  return saker.reduce((sum, s) => sum + (s.meldinger || []).filter((m) => m.avsender === 'admin' && !m.lestBruker).length, 0);
}
export async function antallUlestForAdmin() {
  const saker = await hentSaker();
  return saker.reduce((sum, s) => sum + (s.meldinger || []).filter((m) => m.avsender === 'bruker' && !m.lestAdmin).length, 0);
}
export async function antallApneForAdmin() {
  const saker = await hentSaker();
  return saker.filter((s) => s.status === 'ny' || s.status === 'under_arbeid').length;
}

// ─── Live oppdatering (polling) ──────────────────────────────────────────────────
/**
 * Uten websocket/SSE poller vi lett hvert 20. sekund (overstyrbart per kallsted).
 * Returnerer avmeldingsfunksjon.
 */
export function abonner(callback, intervallMs = 20000) {
  const id = setInterval(callback, intervallMs);
  return () => clearInterval(id);
}
