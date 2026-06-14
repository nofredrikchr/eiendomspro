/**
 * Server-side DB-lag for abonnement, kontokreditt og vervekoder. Eier-scopet på
 * bruker_id. Den rene pris-/feature-logikken (effektivPlan, objektgrense osv.)
 * ligger i den delte modulen src/lib/planer.js og er sannheten for gating —
 * dette laget er kun persistens + orkestrering.
 */
import { randomBytes } from 'node:crypto';
import { sql } from '../_db.js';

const TRIAL_DAGER = 14;

// ─── Abonnement ─────────────────────────────────────────────────────────────────
export async function hentAbonnement(brukerId) {
  const r = await sql`select * from abonnement where bruker_id = ${brukerId} limit 1`;
  return r[0] || null;
}

/** Slå opp bruker fra Stripe-kunde-ID (brukes av webhooks). */
export async function finnBrukerViaStripeCustomer(stripeCustomerId) {
  if (!stripeCustomerId) return null;
  const r = await sql`select bruker_id from abonnement where stripe_customer_id = ${stripeCustomerId} limit 1`;
  return r[0]?.bruker_id || null;
}

/**
 * Reverse trial ved registrering: permanent Gratis-konto (plan_id='gratis') men
 * 14 dager full Pro-tilgang via status='prøve' + trial_ends_at. Kortløst.
 * Idempotent — oppretter også kontokreditt-rad og personlig vervekode.
 */
export async function opprettTrialOgKonto(brukerId, fulltNavn) {
  const utloper = new Date(Date.now() + TRIAL_DAGER * 86_400_000).toISOString();
  const rader = await sql`
    insert into abonnement (bruker_id, plan_id, status, trial_ends_at)
    values (${brukerId}, 'gratis', 'prøve', ${utloper})
    on conflict (bruker_id) do nothing
    returning *`;
  if (rader[0]) {
    await loggAbonnementHendelse(brukerId, 'trial_start', { trial_ends_at: utloper });
  }
  await sql`insert into konto_kreditt (bruker_id) values (${brukerId}) on conflict do nothing`;
  await hentEllerLagVervekode(brukerId, fulltNavn);
  return rader[0] || (await hentAbonnement(brukerId));
}

export async function loggAbonnementHendelse(brukerId, type, detaljer = null, utfortAv = null) {
  await sql`
    insert into abonnement_hendelser (bruker_id, type, detaljer, utfort_av)
    values (${brukerId}, ${type}, ${detaljer ? JSON.stringify(detaljer) : null}::jsonb, ${utfortAv})`;
}

/** Generisk, eier-scopet patch av et abonnement (brukes av webhooks/admin). */
export async function oppdaterAbonnement(brukerId, felter) {
  const r = await sql`
    update abonnement set
      plan_id = coalesce(${felter.plan_id ?? null}, plan_id),
      status = coalesce(${felter.status ?? null}, status),
      faktureringsintervall = coalesce(${felter.faktureringsintervall ?? null}, faktureringsintervall),
      gjeldende_slutt = coalesce(${felter.gjeldende_slutt ?? null}, gjeldende_slutt),
      betalt_forste_gang = coalesce(${felter.betalt_forste_gang ?? null}, betalt_forste_gang),
      feilede_trekk = coalesce(${felter.feilede_trekk ?? null}, feilede_trekk),
      stripe_customer_id = coalesce(${felter.stripe_customer_id ?? null}, stripe_customer_id),
      stripe_subscription_id = coalesce(${felter.stripe_subscription_id ?? null}, stripe_subscription_id),
      har_kort = coalesce(${felter.har_kort ?? null}, har_kort),
      oppdatert = now()
    where bruker_id = ${brukerId}
    returning *`;
  return r[0] || null;
}

// ─── Kontokreditt (verving) ─────────────────────────────────────────────────────
export async function hentKredittOre(brukerId) {
  const r = await sql`select saldo_ore from konto_kreditt where bruker_id = ${brukerId} limit 1`;
  return r[0]?.saldo_ore ?? 0;
}

/** Endre kreditt-saldo (positivt = opptjent, negativt = brukt) + skriv hendelse. */
export async function endreKreditt(brukerId, endringOre, arsak, detaljer = null) {
  await sql`insert into konto_kreditt (bruker_id) values (${brukerId}) on conflict do nothing`;
  await sql`
    update konto_kreditt set saldo_ore = greatest(0, saldo_ore + ${endringOre}), oppdatert = now()
    where bruker_id = ${brukerId}`;
  await sql`
    insert into kreditt_hendelser (bruker_id, endring_ore, arsak, detaljer)
    values (${brukerId}, ${endringOre}, ${arsak}, ${detaljer ? JSON.stringify(detaljer) : null}::jsonb)`;
  return hentKredittOre(brukerId);
}

// ─── Vervekoder ─────────────────────────────────────────────────────────────────
function lagKode(fulltNavn) {
  const fornavn = (fulltNavn || 'BRUKER').split(/\s+/)[0]
    .toUpperCase().replace(/[^A-ZÆØÅ0-9]/g, '').slice(0, 10) || 'BRUKER';
  // base32-aktig suffiks fra tilfeldige bytes (unngår 0/O/1/I-forveksling)
  const alfabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = randomBytes(4);
  let suffiks = '';
  for (let i = 0; i < 4; i += 1) suffiks += alfabet[b[i] % alfabet.length];
  return `${fornavn}-${suffiks}`;
}

export async function hentEllerLagVervekode(brukerId, fulltNavn) {
  const eks = await sql`select kode from vervekoder where bruker_id = ${brukerId} limit 1`;
  if (eks[0]) return eks[0].kode;
  // Prøv noen ganger ved (usannsynlig) kollisjon på kode.
  for (let forsok = 0; forsok < 5; forsok += 1) {
    const kode = lagKode(fulltNavn);
    const r = await sql`
      insert into vervekoder (kode, bruker_id) values (${kode}, ${brukerId})
      on conflict (kode) do nothing
      returning kode`;
    if (r[0]) return r[0].kode;
    // kanskje brukeren fikk en kode samtidig (race) — sjekk igjen
    const igjen = await sql`select kode from vervekoder where bruker_id = ${brukerId} limit 1`;
    if (igjen[0]) return igjen[0].kode;
  }
  throw new Error('Kunne ikke generere vervekode.');
}

export async function finnVervekode(kode) {
  const r = await sql`select * from vervekoder where kode = ${kode} limit 1`;
  return r[0] || null;
}
