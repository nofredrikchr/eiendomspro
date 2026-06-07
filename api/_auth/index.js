/**
 * Auth-DB-lag: binder den (test-dekkede) rene kjernen til Neon.
 *
 * Rene hjelpere (telefon, token, passord, validering, cookie, roller, bruker) er
 * enhetstestet. Funksjonene her orkestrerer SQL + de rene hjelperne, og
 * verifiseres med integrasjonstester (gated på et test-DATABASE_URL) + manuell
 * røyktest mot preview (se AUTHPLAN §9).
 */
import { sql } from '../_db.js';
import { genererToken, hashToken } from './token.js';
import { hashPassord, verifyPassord } from './passord.js';
import { offentligBruker } from './bruker.js';
import { gyldigModus } from './roller.js';
import { parseCookies, SESJON_COOKIE } from './cookie.js';

const SESJON_LEVETID_DAGER = 30;
const NIVA_FOR_ROLLE = { utleier: 1, leietaker: 2 };

// ─── Brukere ──────────────────────────────────────────────────────────────────
export async function finnBruker({ epost, telefon }) {
  if (epost) {
    const r = await sql`select * from brukere where epost = ${epost} limit 1`;
    return r[0] || null;
  }
  if (telefon) {
    const r = await sql`select * from brukere where telefon = ${telefon} limit 1`;
    return r[0] || null;
  }
  return null;
}

export async function opprettBruker({ epost, telefon, passord, fulltNavn, primaryRolle }) {
  const passord_hash = await hashPassord(passord);
  const niva = NIVA_FOR_ROLLE[primaryRolle] ?? 1;
  const [bruker] = await sql`
    insert into brukere (epost, telefon, passord_hash, fullt_navn, niva, primary_rolle, aktiv_modus)
    values (${epost}, ${telefon}, ${passord_hash}, ${fulltNavn}, ${niva}, ${primaryRolle}, ${primaryRolle})
    returning *`;
  await sql`
    insert into bruker_roller (bruker_id, rolle, status, onboardet)
    values (${bruker.id}, ${primaryRolle}, 'aktiv', now())
    on conflict do nothing`;
  return bruker;
}

export async function hentRoller(brukerId) {
  const rader = await sql`select rolle from bruker_roller where bruker_id = ${brukerId} and status != 'suspendert'`;
  return rader.map((r) => r.rolle);
}

/**
 * Bytt aktiv modus (Airbnb-stil). Provisjonerer rollen lazy hvis brukeren ikke
 * har den fra før, og setter aktiv_modus. Returnerer { bruker, roller } eller
 * null hvis modus er ugyldig.
 */
export async function byttModus(brukerId, modus) {
  if (!gyldigModus(modus)) return null;
  await sql`
    insert into bruker_roller (bruker_id, rolle, status, onboardet)
    values (${brukerId}, ${modus}, 'aktiv', now())
    on conflict (bruker_id, rolle) do nothing`;
  const rader = await sql`
    update brukere set aktiv_modus = ${modus}, oppdatert = now()
    where id = ${brukerId} returning *`;
  if (!rader[0]) return null;
  return { bruker: rader[0], roller: await hentRoller(brukerId) };
}

// ─── Sesjoner ─────────────────────────────────────────────────────────────────
export async function opprettSesjon(brukerId, { ip = null, userAgent = null } = {}) {
  const token = genererToken();
  const utloper = new Date(Date.now() + SESJON_LEVETID_DAGER * 86400_000).toISOString();
  await sql`
    insert into sesjoner (bruker_id, token_hash, utloper, ip, user_agent)
    values (${brukerId}, ${hashToken(token)}, ${utloper}, ${ip}, ${userAgent})`;
  return token;
}

export async function slettSesjonViaToken(token) {
  if (!token) return;
  await sql`delete from sesjoner where token_hash = ${hashToken(token)}`;
}

/** Leser sesjons-cookie fra request, returnerer { bruker, roller } eller null. */
export async function hentSesjonsBruker(req) {
  const token = parseCookies(req.headers?.cookie)[SESJON_COOKIE];
  if (!token) return null;
  const rader = await sql`
    select b.*, s.id as sesjon_id, s.utloper
    from sesjoner s join brukere b on b.id = s.bruker_id
    where s.token_hash = ${hashToken(token)} and s.utloper > now() and b.status = 'aktiv'
    limit 1`;
  const bruker = rader[0];
  if (!bruker) return null;
  await sql`update sesjoner set sist_brukt = now() where id = ${bruker.sesjon_id}`;
  const roller = await hentRoller(bruker.id);
  return { bruker, roller };
}

// ─── Vakter (server-side håndheving) ─────────────────────────────────────────
export async function krevBruker(req) {
  return hentSesjonsBruker(req); // null → kallstedet svarer 401
}

export async function krevAdmin(req) {
  const okt = await hentSesjonsBruker(req);
  return okt && okt.bruker.niva === 3 ? okt : null;
}

// Re-eksport for kallsteder
export { offentligBruker, verifyPassord };
