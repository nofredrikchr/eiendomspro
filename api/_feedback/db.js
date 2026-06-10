/**
 * Feedback-DB-lag (Neon). Tabellene feedback_saker/feedback_meldinger + trigger
 * trg_touch_sak finnes fra db/schema.sql. Tilgang: admin (niva=3) ser alle saker,
 * vanlige brukere ser kun egne. Kallstedet (endepunktene) håndhever tilgang.
 */
import { sql } from '../_db.js';

const STATUS_LABEL = { ny: 'Ny', under_arbeid: 'Under arbeid', lost: 'Løst', avvist: 'Avvist' };

function mapMelding(m) {
  return {
    id: m.id, avsender: m.avsender, type: m.type, tekst: m.tekst, meta: m.meta,
    tidspunkt: m.tidspunkt, lestBruker: m.lest_bruker, lestAdmin: m.lest_admin,
  };
}
function mapSak(s, meldinger = []) {
  return {
    id: s.id, brukerId: s.bruker_id, brukerNavn: s.bruker_navn, brukerEpost: s.bruker_epost,
    type: s.type, tittel: s.tittel, beskrivelse: s.beskrivelse, status: s.status,
    belonning: s.belonning, opprettet: s.opprettet, oppdatert: s.oppdatert,
    meldinger: meldinger.map(mapMelding),
  };
}

export async function listSaker({ brukerId, erAdmin }) {
  const saker = erAdmin
    ? await sql`select * from feedback_saker order by oppdatert desc`
    : await sql`select * from feedback_saker where bruker_id = ${brukerId} order by oppdatert desc`;
  if (!saker.length) return [];
  const ids = saker.map((s) => s.id);
  const meldinger = await sql`select * from feedback_meldinger where sak_id = any(${ids}::uuid[]) order by tidspunkt asc`;
  const perSak = {};
  for (const m of meldinger) (perSak[m.sak_id] ||= []).push(m);
  return saker.map((s) => mapSak(s, perSak[s.id] || []));
}

export async function hentSak(id) {
  const rader = await sql`select * from feedback_saker where id = ${id}`;
  if (!rader[0]) return null;
  const meldinger = await sql`select * from feedback_meldinger where sak_id = ${id} order by tidspunkt asc`;
  return mapSak(rader[0], meldinger);
}

/** Eier-id for tilgangssjekk uten å hente hele saken. */
export async function sakEier(id) {
  const rader = await sql`select bruker_id from feedback_saker where id = ${id}`;
  return rader[0] ? rader[0].bruker_id : undefined; // undefined = finnes ikke
}

export async function opprettSak({ brukerId, brukerNavn, brukerEpost, type, tittel, beskrivelse }) {
  const [s] = await sql`
    insert into feedback_saker (bruker_id, bruker_navn, bruker_epost, type, tittel, beskrivelse, status)
    values (${brukerId}, ${brukerNavn}, ${brukerEpost}, ${type}, ${tittel}, ${beskrivelse}, 'ny')
    returning *`;
  await sql`
    insert into feedback_meldinger (sak_id, avsender, type, tekst, lest_bruker, lest_admin)
    values (${s.id}, 'bruker', 'melding', ${beskrivelse}, true, false)`;
  return hentSak(s.id);
}

export async function leggMelding(sakId, { avsender, tekst, type = 'melding', meta = null }) {
  await sql`
    insert into feedback_meldinger (sak_id, avsender, type, tekst, meta, lest_bruker, lest_admin)
    values (${sakId}, ${avsender}, ${type}, ${tekst}, ${meta ? JSON.stringify(meta) : null}::jsonb,
            ${avsender === 'bruker'}, ${avsender === 'admin'})`;
  return hentSak(sakId); // trigger oppdaterer feedback_saker.oppdatert
}

export async function settStatus(sakId, status) {
  if (!STATUS_LABEL[status]) {
    const e = new Error('Ugyldig status.');
    e.kode = 'UGYLDIG'; e.status = 400; e.feil = 'Ugyldig status.'; // kontrollert feil → 400 i _http.js
    throw e;
  }
  await sql`update feedback_saker set status = ${status}, oppdatert = now() where id = ${sakId}`;
  await sql`
    insert into feedback_meldinger (sak_id, avsender, type, tekst, lest_bruker, lest_admin)
    values (${sakId}, 'admin', 'status', ${`Status endret til «${STATUS_LABEL[status]}».`}, false, true)`;
  return hentSak(sakId);
}

export async function giBelonning(sakId, { beskrivelse, maaneder }) {
  const naa = new Date().toISOString();
  await sql`
    update feedback_saker set belonning = ${JSON.stringify({ beskrivelse, maaneder, gitt: naa })}::jsonb, oppdatert = now()
    where id = ${sakId}`;
  await sql`
    insert into feedback_meldinger (sak_id, avsender, type, tekst, meta, lest_bruker, lest_admin)
    values (${sakId}, 'admin', 'belonning', ${beskrivelse}, ${JSON.stringify({ maaneder })}::jsonb, false, true)`;
  return hentSak(sakId);
}

export async function markerLest(sakId, leser) {
  if (leser === 'admin') {
    await sql`update feedback_meldinger set lest_admin = true where sak_id = ${sakId} and avsender = 'bruker'`;
  } else {
    await sql`update feedback_meldinger set lest_bruker = true where sak_id = ${sakId} and avsender = 'admin'`;
  }
}

export async function slettSak(sakId) {
  await sql`delete from feedback_saker where id = ${sakId}`; // cascade fjerner meldinger
}
