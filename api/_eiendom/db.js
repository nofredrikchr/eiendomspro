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
