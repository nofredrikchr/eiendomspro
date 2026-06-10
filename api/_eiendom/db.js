/**
 * DB-lag for bygg & leieobjekter (eier-scoped). Objektet lagres som JSONB i
 * `data`; id/opprettet/oppdatert er kolonner. Alle spørringer filtrerer på
 * eier_id slik at en bruker aldri ser eller endrer andres data.
 */
import { sql } from '../_db.js';
import { radTilObjekt } from './form.js';

// Fjern felter som styres av kolonner (skal ikke ligge i data-blobben).
function rensData(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const { id, opprettet, oppdatert, eier_id, ...rest } = obj;
  void id; void opprettet; void oppdatert; void eier_id;
  return rest;
}

// ─── Bygg ─────────────────────────────────────────────────────────────────────
export async function listBygg(eierId) {
  const rader = await sql`select * from bygg where eier_id = ${eierId} order by opprettet asc`;
  return rader.map(radTilObjekt);
}

export async function opprettBygg(eierId, data) {
  const [rad] = await sql`
    insert into bygg (eier_id, data) values (${eierId}, ${JSON.stringify(rensData(data))}::jsonb)
    returning *`;
  return radTilObjekt(rad);
}

export async function oppdaterBygg(eierId, id, data) {
  const rader = await sql`
    update bygg set data = ${JSON.stringify(rensData(data))}::jsonb, oppdatert = now()
    where id = ${id} and eier_id = ${eierId}
    returning *`;
  return rader[0] ? radTilObjekt(rader[0]) : null;
}

export async function slettBygg(eierId, id) {
  // leieobjekter fjernes automatisk via ON DELETE CASCADE på bygg_id.
  const rader = await sql`delete from bygg where id = ${id} and eier_id = ${eierId} returning id`;
  return rader.length > 0;
}

// ─── Leieobjekter ─────────────────────────────────────────────────────────────
export async function listLeieobjekter(eierId) {
  const rader = await sql`select * from leieobjekter where eier_id = ${eierId} order by opprettet asc`;
  return rader.map(radTilObjekt);
}

async function sjekkByggEies(eierId, byggId) {
  if (!byggId) return; // leieobjekt uten bygg er tillatt
  const r = await sql`select 1 from bygg where id = ${byggId} and eier_id = ${eierId} limit 1`;
  if (!r.length) { const e = new Error('Ukjent bygg.'); e.kode = 'UKJENT_BYGG'; throw e; }
}

export async function opprettLeieobjekt(eierId, data) {
  const byggId = data?.byggId || null;
  await sjekkByggEies(eierId, byggId);
  const [rad] = await sql`
    insert into leieobjekter (eier_id, bygg_id, data)
    values (${eierId}, ${byggId}, ${JSON.stringify(rensData(data))}::jsonb)
    returning *`;
  return radTilObjekt(rad);
}

export async function oppdaterLeieobjekt(eierId, id, data) {
  const byggId = data?.byggId || null;
  await sjekkByggEies(eierId, byggId);
  const rader = await sql`
    update leieobjekter set data = ${JSON.stringify(rensData(data))}::jsonb, bygg_id = ${byggId}, oppdatert = now()
    where id = ${id} and eier_id = ${eierId}
    returning *`;
  return rader[0] ? radTilObjekt(rader[0]) : null;
}

export async function slettLeieobjekt(eierId, id) {
  const rader = await sql`delete from leieobjekter where id = ${id} and eier_id = ${eierId} returning id`;
  return rader.length > 0;
}

// ─── Generisk eier-scoped CRUD for resten av entitetene ─────────────────────────
// Tabellnavn er en whitelist (aldri brukerinput) som bakes inn i spørringen;
// eier_id/id/data sendes som $1/$2-parametre (neon-driverens konvensjonelle kall).
const CRUD_TABELLER = new Set(['kontrakter', 'fakturaer', 'annonser', 'meldinger', 'protokoller', 'notater', 'utlegg', 'utleiere', 'analyser']);

export function lagCrud(tabell) {
  if (!CRUD_TABELLER.has(tabell)) throw new Error(`Ukjent tabell: ${tabell}`);
  return {
    async list(eierId) {
      const rader = await sql(`select * from ${tabell} where eier_id = $1 order by opprettet asc`, [eierId]);
      return rader.map(radTilObjekt);
    },
    async opprett(eierId, data) {
      const rader = await sql(
        `insert into ${tabell} (eier_id, data) values ($1, $2::jsonb) returning *`,
        [eierId, JSON.stringify(rensData(data))],
      );
      return radTilObjekt(rader[0]);
    },
    async oppdater(eierId, id, data) {
      const rader = await sql(
        `update ${tabell} set data = $1::jsonb, oppdatert = now() where id = $2 and eier_id = $3 returning *`,
        [JSON.stringify(rensData(data)), id, eierId],
      );
      return rader[0] ? radTilObjekt(rader[0]) : null;
    },
    async slett(eierId, id) {
      const rader = await sql(`delete from ${tabell} where id = $1 and eier_id = $2 returning id`, [id, eierId]);
      return rader.length > 0;
    },
  };
}

// ─── Generisk blob (én rad per bruker): integrasjoner, profil, faktiske tall ───
const BLOB_TABELLER = new Set(['integrasjoner', 'bruker_profil', 'faktiske_tall']);
export function lagBlob(tabell) {
  if (!BLOB_TABELLER.has(tabell)) throw new Error(`Ukjent blob: ${tabell}`);
  return {
    async hent(eierId) {
      const r = await sql(`select data from ${tabell} where eier_id = $1`, [eierId]);
      return r[0]?.data ?? {};
    },
    async lagre(eierId, data) {
      const blob = data && typeof data === 'object' ? data : {};
      await sql(
        `insert into ${tabell} (eier_id, data) values ($1, $2::jsonb)
         on conflict (eier_id) do update set data = $2::jsonb, oppdatert = now()`,
        [eierId, JSON.stringify(blob)],
      );
      return blob;
    },
  };
}
