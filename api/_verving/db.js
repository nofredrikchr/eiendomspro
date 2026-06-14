/**
 * Kunde-til-kunde-verving (I2). Tosidig «gi-og-få»:
 *  - verver får 2 måneder gratis (kreditt = 2 × egen planpris/mnd)
 *  - vervet får 1 måned gratis (kreditt = 1 × egen planpris/mnd)
 * Belønningen utløses FØRST når den vervede har betalt sin første ordinære faktura
 * (markerVervingBetalende → innfriVerving) — hindrer misbruk. Kreditt forsvinner
 * aldri (konto_kreditt) og trekkes automatisk fra neste faktura(er).
 */
import { sql } from '../_db.js';
import { finnVervekode, endreKreditt, hentAbonnement } from '../_plan/db.js';
import { effektivPlan, ververKredittOre, vervetKredittOre } from '../../src/lib/planer.js';

/**
 * Kobler en nyregistrert bruker (vervet) til en vervekode. Idempotent og defensiv:
 * ukjent kode, egen kode, eller allerede-vervet bruker gir bare ingen kobling.
 */
export async function registrerVerving(kode, vervetBrukerId) {
  const vk = await finnVervekode(kode);
  if (!vk) return null;
  if (vk.bruker_id === vervetBrukerId) return null; // kan ikke verve seg selv
  const rader = await sql`
    insert into verving (kode, verver_id, vervet_id, status)
    values (${kode}, ${vk.bruker_id}, ${vervetBrukerId}, 'registrert')
    on conflict (vervet_id) do nothing
    returning *`;
  return rader[0] || null;
}

/** Vervingen der denne brukeren er den VERVEDE (eller null). */
export async function hentVervingForVervet(vervetBrukerId) {
  const r = await sql`select * from verving where vervet_id = ${vervetBrukerId} limit 1`;
  return r[0] || null;
}

/** Alle som DENNE brukeren har vervet (for «Verv en venn»-siden). */
export async function hentVervinger(ververId) {
  const rader = await sql`
    select v.id, v.vervet_id, v.status, v.belonning_verver_ore, v.opprettet, v.innfridd_tidspunkt,
           b.fullt_navn as vervet_navn
    from verving v
    join brukere b on b.id = v.vervet_id
    where v.verver_id = ${ververId}
    order by v.opprettet desc`;
  return rader;
}

/**
 * Kalles når den vervede har betalt sin første ordinære faktura. Setter status
 * 'betalende' og innfrir belønningen (én gang). Trygt å kalle flere ganger.
 */
export async function markerVervingBetalende(vervetBrukerId) {
  const v = await hentVervingForVervet(vervetBrukerId);
  if (!v || v.status === 'innfridd' || v.status === 'annullert') return null;
  await sql`update verving set status = 'betalende' where id = ${v.id} and status = 'registrert'`;
  return innfriVerving(v.id);
}

/** Innfri belønning: kreditér verver (2 mnd) og vervet (1 mnd) basert på effektiv plan. */
export async function innfriVerving(vervingId) {
  // Lås raden mot dobbel innfrielse (oppdater status atomisk).
  const r = await sql`
    update verving set status = 'innfridd', innfridd_tidspunkt = now()
    where id = ${vervingId} and status in ('registrert','betalende')
    returning *`;
  if (!r[0]) return null; // allerede innfridd / annullert
  const v = r[0];

  const ververPlan = effektivPlan(await hentAbonnement(v.verver_id));
  const vervetPlan = effektivPlan(await hentAbonnement(v.vervet_id));
  const ververOre = ververKredittOre(ververPlan);
  const vervetOre = vervetKredittOre(vervetPlan);

  await sql`update verving set belonning_verver_ore = ${ververOre}, belonning_vervet_ore = ${vervetOre} where id = ${vervingId}`;
  if (ververOre > 0) {
    await endreKreditt(v.verver_id, ververOre, 'verving_verver', { vervingId, vervetId: v.vervet_id });
  }
  if (vervetOre > 0) {
    await endreKreditt(v.vervet_id, vervetOre, 'verving_vervet', { vervingId });
  }
  return v;
}
