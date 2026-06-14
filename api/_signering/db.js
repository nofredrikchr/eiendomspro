/** DB-lag for BankID-kontraktsigneringer (eier-scopet). Engangskjøp, separat fra abonnement. */
import { sql } from '../_db.js';

export async function opprettSignering(eierId, {
  kontraktId = null, prisOre = 0, inkludert = false, leverandorKostnadOre = 0, status = 'venter_signering',
}) {
  const [r] = await sql`
    insert into kontrakt_signeringer (eier_id, kontrakt_id, status, pris_ore, inkludert, leverandor_kostnad_ore)
    values (${eierId}, ${kontraktId}, ${status}, ${prisOre}, ${inkludert}, ${leverandorKostnadOre})
    returning *`;
  return r;
}

export async function hentSigneringer(eierId) {
  return sql`select * from kontrakt_signeringer where eier_id = ${eierId} order by opprettet desc`;
}

export async function hentSignering(eierId, id) {
  const r = await sql`select * from kontrakt_signeringer where id = ${id} and eier_id = ${eierId} limit 1`;
  return r[0] || null;
}

/** Antall av Pro-ens inkluderte kontrakter som allerede er brukt. */
export async function antallInkludertBrukt(eierId) {
  const r = await sql`select count(*)::int as n from kontrakt_signeringer where eier_id = ${eierId} and inkludert = true`;
  return r[0]?.n ?? 0;
}

export async function markerSignert(eierId, id, { signeringRef, signertDokumentUrl }) {
  const r = await sql`
    update kontrakt_signeringer
    set status = 'signert', signering_ref = ${signeringRef}, signert_dokument_url = ${signertDokumentUrl},
        signert_tidspunkt = now(), oppdatert = now()
    where id = ${id} and eier_id = ${eierId}
    returning *`;
  return r[0] || null;
}
