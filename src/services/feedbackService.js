/**
 * Feedback- og support-tjeneste for EiendomsPRO.
 *
 * Status: localStorage (fungerer lokalt uten backend). Alle funksjoner er
 * asynkrone (returnerer Promise) slik at det samme API-et kan peke mot Neon
 * (serverless functions i /api) senere uten å endre kallstedene.
 *
 * Når Neon kobles på: bytt ut localStorage-implementasjonen under med fetch
 * mot /api/feedback/*. Skjemaet ligger i /db/schema.sql.
 */

const KEY = 'eiendomspro_feedback';
const PROFIL_KEY = 'eiendomspro_profil';

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

// ─── Gjeldende bruker ─────────────────────────────────────────────────────────
export async function gjeldendeBruker() {
  let p = {};
  try { p = JSON.parse(localStorage.getItem(PROFIL_KEY) || '{}'); } catch { /* ignore */ }
  const navn = [p.fornavn, p.etternavn].filter(Boolean).join(' ') || 'Meg';
  return { id: 'meg', navn, epost: p.epost || '' };
}

export async function erAdmin() {
  return true; // lokal modus: full tilgang. Kobles til Neon-auth senere.
}

// ════════════════════════════════════════════════════════════════════════════
// LOCALSTORAGE-IMPLEMENTASJON
// ════════════════════════════════════════════════════════════════════════════
function lesLocal() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
function skrivLocal(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
function nyId() { return `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

// ════════════════════════════════════════════════════════════════════════════
// PUBLIKT API
// ════════════════════════════════════════════════════════════════════════════
export async function hentSaker() {
  return lesLocal().sort((a, b) => new Date(b.oppdatert) - new Date(a.oppdatert));
}

export async function hentSak(id) {
  return lesLocal().find((s) => s.id === id) || null;
}

export async function opprettSak({ type, tittel, beskrivelse }) {
  const bruker = await gjeldendeBruker();
  const naa = new Date().toISOString();
  const sak = {
    id: nyId(), brukerId: bruker.id, brukerNavn: bruker.navn, brukerEpost: bruker.epost,
    type, tittel, beskrivelse, status: 'ny', opprettet: naa, oppdatert: naa,
    meldinger: [{ id: nyId(), avsender: 'bruker', type: 'melding', tekst: beskrivelse, tidspunkt: naa, lestBruker: true, lestAdmin: false }],
  };
  skrivLocal([sak, ...lesLocal()]);
  return sak;
}

export async function sendMelding(sakId, { avsender, tekst, type = 'melding', meta = null }) {
  const saker = lesLocal();
  const sak = saker.find((s) => s.id === sakId);
  if (!sak) return null;
  const naa = new Date().toISOString();
  sak.meldinger.push({ id: nyId(), avsender, type, tekst, meta, tidspunkt: naa, lestBruker: avsender === 'bruker', lestAdmin: avsender === 'admin' });
  sak.oppdatert = naa;
  skrivLocal(saker);
  return sak;
}

export async function settStatus(sakId, status) {
  const saker = lesLocal();
  const sak = saker.find((s) => s.id === sakId);
  if (!sak) return null;
  sak.status = status; sak.oppdatert = new Date().toISOString();
  sak.meldinger.push({ id: nyId(), avsender: 'admin', type: 'status', tekst: `Status endret til «${STATUS_INFO[status]?.label || status}».`, tidspunkt: sak.oppdatert, lestBruker: false, lestAdmin: true });
  skrivLocal(saker);
  return sak;
}

export async function giBelonning(sakId, { beskrivelse, maaneder }) {
  const saker = lesLocal();
  const sak = saker.find((s) => s.id === sakId);
  if (!sak) return null;
  const naa = new Date().toISOString();
  sak.belonning = { beskrivelse, maaneder, gitt: naa }; sak.oppdatert = naa;
  sak.meldinger.push({ id: nyId(), avsender: 'admin', type: 'belonning', tekst: beskrivelse, meta: { maaneder }, tidspunkt: naa, lestBruker: false, lestAdmin: true });
  skrivLocal(saker);
  return sak;
}

export async function markerLest(sakId, leser /* 'bruker' | 'admin' */) {
  const saker = lesLocal();
  const sak = saker.find((s) => s.id === sakId);
  if (!sak) return;
  const felt = leser === 'admin' ? 'lestAdmin' : 'lestBruker';
  sak.meldinger.forEach((m) => { m[felt] = true; });
  skrivLocal(saker);
}

// ─── Tellere (async) ──────────────────────────────────────────────────────────
export async function antallUlestForBruker() {
  return lesLocal().reduce((sum, s) => sum + s.meldinger.filter((m) => m.avsender === 'admin' && !m.lestBruker).length, 0);
}
export async function antallUlestForAdmin() {
  return lesLocal().reduce((sum, s) => sum + s.meldinger.filter((m) => m.avsender === 'bruker' && !m.lestAdmin).length, 0);
}
export async function antallApneForAdmin() {
  return lesLocal().filter((s) => s.status === 'ny' || s.status === 'under_arbeid').length;
}

// ─── Live oppdatering ─────────────────────────────────────────────────────────
/**
 * Abonnerer på endringer. I localStorage-modus brukes 'storage'-eventer
 * (oppdaterer mellom faner). Returnerer en avmeldingsfunksjon.
 * Når Neon kobles på kan dette byttes til SSE/websocket mot /api.
 */
export function abonner(callback) {
  const handler = (e) => { if (e.key === KEY) callback(); };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export async function slettSak(sakId) {
  skrivLocal(lesLocal().filter((s) => s.id !== sakId));
}
