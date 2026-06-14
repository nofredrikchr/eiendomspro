/**
 * Partner-/agentverving (I1 — Eiendomsmalen o.l.). Kunde som registrerer seg med
 * gyldig partnerkode får 20 % rabatt i 3 mnd og merkes permanent. Partneren tjener
 * 25 % provisjon av faktisk betalt beløp (eks. mva, etter rabatt) så lenge kunden
 * betaler. Provisjon reverseres ved refusjon.
 */
import { randomBytes } from 'node:crypto';
import { sql } from '../_db.js';
import {
  PARTNER_PROVISJON_PCT, PARTNER_RABATT_PCT, PARTNER_RABATT_MND, partnerProvisjonOre,
} from '../../src/lib/planer.js';

// ─── Partner-kobling ved registrering ───────────────────────────────────────────
export async function finnPartnerViaKode(referralCode) {
  const r = await sql`select * from partnere where referral_code = ${referralCode} and status = 'aktiv' limit 1`;
  return r[0] || null;
}

/** Kobler en nyregistrert kunde til en partner (permanent) + setter rabatt-vindu. */
export async function registrerPartnerVerving(referralCode, brukerId) {
  const partner = await finnPartnerViaKode(referralCode);
  if (!partner) return null;
  const mnd = partner.rabatt_mnd ?? PARTNER_RABATT_MND;
  const rabattTil = new Date(Date.now() + mnd * 30 * 86_400_000).toISOString();
  const rader = await sql`
    insert into partner_verving (partner_id, bruker_id, rabatt_til)
    values (${partner.id}, ${brukerId}, ${rabattTil})
    on conflict (bruker_id) do nothing
    returning *`;
  return rader[0] || null;
}

export async function hentPartnerVervingForBruker(brukerId) {
  const r = await sql`select * from partner_verving where bruker_id = ${brukerId} limit 1`;
  return r[0] || null;
}

/** Har kunden aktiv partner-rabatt akkurat nå (innenfor 3-mnd-vinduet)? */
export async function harAktivPartnerRabatt(brukerId, naa = Date.now()) {
  const pv = await hentPartnerVervingForBruker(brukerId);
  if (!pv || !pv.rabatt_til) return false;
  return new Date(pv.rabatt_til).getTime() > naa;
}

// ─── Provisjon ─────────────────────────────────────────────────────────────────
/** Bokfør provisjon for en betaling fra en partner-vervet kunde (25 % av eks. mva). */
export async function registrerProvisjon(brukerId, bruttoBetaltOre, periode = null) {
  const pv = await hentPartnerVervingForBruker(brukerId);
  if (!pv) return null;
  const provisjonOre = partnerProvisjonOre(bruttoBetaltOre);
  const rader = await sql`
    insert into partner_provisjon_ledger (partner_id, bruker_id, periode, brutto_betalt_ore, provisjon_ore, status)
    values (${pv.partner_id}, ${brukerId}, ${periode}, ${bruttoBetaltOre}, ${provisjonOre}, 'opptjent')
    returning *`;
  return rader[0] || null;
}

/** Reverser opptjent provisjon ved refusjon (markeres, beløpet beholdes for spor). */
export async function reverserProvisjon(brukerId, periode = null) {
  await sql`
    update partner_provisjon_ledger set status = 'reversert'
    where bruker_id = ${brukerId} and status = 'opptjent'
      and (${periode}::date is null or periode = ${periode})`;
}

// ─── Partner-administrasjon (admin) ─────────────────────────────────────────────
function lagPartnerkode(navn) {
  const base = (navn || 'PARTNER').toUpperCase().replace(/[^A-ZÆØÅ0-9]/g, '').slice(0, 12) || 'PARTNER';
  const alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(4);
  let s = '';
  for (let i = 0; i < 4; i += 1) s += alfabet[b[i] % alfabet.length];
  return `${base}-${s}`;
}

export async function opprettPartner({ navn, epost, provisjonPct, rabattPct, rabattMnd, brukerId = null }) {
  for (let forsok = 0; forsok < 5; forsok += 1) {
    const kode = lagPartnerkode(navn);
    const r = await sql`
      insert into partnere (navn, epost, bruker_id, referral_code, provisjon_pct, rabatt_pct, rabatt_mnd)
      values (${navn}, ${epost ?? null}, ${brukerId},
              ${kode}, ${provisjonPct ?? PARTNER_PROVISJON_PCT}, ${rabattPct ?? PARTNER_RABATT_PCT}, ${rabattMnd ?? PARTNER_RABATT_MND})
      on conflict (referral_code) do nothing
      returning *`;
    if (r[0]) return r[0];
  }
  throw new Error('Kunne ikke generere partnerkode.');
}

export async function listPartnere() {
  return sql`select * from partnere order by opprettet desc`;
}

export async function hentPartner(partnerId) {
  const r = await sql`select * from partnere where id = ${partnerId} limit 1`;
  return r[0] || null;
}

/** Partner-dashboard: vervede, aktive betalende, opptjent/utbetalt provisjon. */
export async function hentPartnerDashboard(partnerId) {
  const [antall] = await sql`
    select
      (select count(*) from partner_verving where partner_id = ${partnerId}) as vervede,
      (select count(*) from partner_verving pv
         join abonnement a on a.bruker_id = pv.bruker_id
        where pv.partner_id = ${partnerId} and a.status in ('aktiv','betalingsproblem','over_grensen')) as aktive_betalende,
      (select coalesce(sum(provisjon_ore),0) from partner_provisjon_ledger where partner_id = ${partnerId} and status = 'opptjent') as opptjent_ore,
      (select coalesce(sum(provisjon_ore),0) from partner_provisjon_ledger where partner_id = ${partnerId} and status = 'utbetalt') as utbetalt_ore`;
  const ledger = await sql`
    select id, bruker_id, periode, brutto_betalt_ore, provisjon_ore, status, opprettet
    from partner_provisjon_ledger where partner_id = ${partnerId}
    order by opprettet desc limit 200`;
  return { ...antall, ledger };
}
