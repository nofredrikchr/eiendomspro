/**
 * Admin-DB-lag. Alle funksjoner forutsetter at kallstedet allerede har
 * verifisert at brukeren er admin (niva=3) via medAdmin (api/_http.js). Muterende handlinger
 * logges i admin_logg.
 */
import { sql } from '../_db.js';

const NIVAER = [1, 2, 3];
const STATUSER = ['aktiv', 'suspendert', 'slettet'];

// ─── Statistikk ───────────────────────────────────────────────────────────────
// Én rundtur i stedet for åtte: alle tellerne hentes som subselects.
export async function hentStatistikk() {
  const [r] = await sql`
    select
      (select count(*)::int from brukere)                                            as brukere,
      (select count(*)::int from brukere where niva = 1)                             as utleiere,
      (select count(*)::int from brukere where niva = 2)                             as leietakere,
      (select count(*)::int from brukere where niva = 3)                             as admins,
      (select count(*)::int from bygg)                                               as bygg,
      (select count(*)::int from leieobjekter)                                       as leieobjekter,
      (select count(*)::int from brukere where opprettet > now() - interval '7 days')  as nye7,
      (select count(*)::int from brukere where opprettet > now() - interval '30 days') as nye30`;
  return {
    brukere: r?.brukere ?? 0,
    utleiere: r?.utleiere ?? 0,
    leietakere: r?.leietakere ?? 0,
    admins: r?.admins ?? 0,
    bygg: r?.bygg ?? 0,
    leieobjekter: r?.leieobjekter ?? 0,
    nyeBrukere7: r?.nye7 ?? 0,
    nyeBrukere30: r?.nye30 ?? 0,
  };
}

// ─── Brukere ──────────────────────────────────────────────────────────────────
function formBruker(r) {
  return {
    id: r.id, epost: r.epost ?? null, telefon: r.telefon ?? null, fulltNavn: r.fullt_navn,
    niva: r.niva, primaryRolle: r.primary_rolle ?? null, aktivModus: r.aktiv_modus ?? null,
    status: r.status, opprettet: r.opprettet,
  };
}

export async function listBrukere({ sok = '' } = {}) {
  const q = `%${sok.toLowerCase()}%`;
  const rader = sok
    ? await sql`select * from brukere where lower(fullt_navn) like ${q} or lower(epost::text) like ${q} or telefon like ${q} order by opprettet desc limit 500`
    : await sql`select * from brukere order by opprettet desc limit 500`;
  return rader.map(formBruker);
}

export async function oppdaterBruker(adminId, id, { niva, status }) {
  const [fra] = await sql`select niva, status from brukere where id = ${id}`;
  if (!fra) return null;

  if (niva !== undefined) {
    if (!NIVAER.includes(niva)) {
      const e = new Error('Ugyldig nivå.');
      e.kode = 'UGYLDIG'; e.status = 400; e.feil = 'Ugyldig nivå.'; // kontrollert feil → 400 i _http.js
      throw e;
    }
    await sql`update brukere set niva = ${niva}, oppdatert = now() where id = ${id}`;
    await loggHandling(adminId, 'endre_niva', id, { fra: fra.niva, til: niva });
  }
  if (status !== undefined) {
    if (!STATUSER.includes(status)) {
      const e = new Error('Ugyldig status.');
      e.kode = 'UGYLDIG'; e.status = 400; e.feil = 'Ugyldig status.'; // kontrollert feil → 400 i _http.js
      throw e;
    }
    await sql`update brukere set status = ${status}, oppdatert = now() where id = ${id}`;
    await loggHandling(adminId, 'endre_status', id, { fra: fra.status, til: status });
  }
  const [oppdatert] = await sql`select * from brukere where id = ${id}`;
  return formBruker(oppdatert);
}

// ─── Revisjonslogg ────────────────────────────────────────────────────────────
export async function loggHandling(adminId, handling, malBruker, detaljer) {
  await sql`
    insert into admin_logg (admin_id, handling, mal_bruker, detaljer)
    values (${adminId}, ${handling}, ${malBruker}, ${JSON.stringify(detaljer ?? {})}::jsonb)`;
}

export async function hentLogg(grense = 100) {
  return sql`
    select g.id, g.handling, g.detaljer, g.tidspunkt,
           a.fullt_navn as admin_navn, m.fullt_navn as mal_navn
    from admin_logg g
    left join brukere a on a.id = g.admin_id
    left join brukere m on m.id = g.mal_bruker
    order by g.tidspunkt desc limit ${grense}`;
}
