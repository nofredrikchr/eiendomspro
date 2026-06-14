/**
 * Abonnementets livssyklus: hva som skjer ved betaling, mislykket betaling,
 * oppsigelse og nedgradering. Orkestrerer abonnement + kreditt + verving +
 * partnerprovisjon. Den rene beslutnings-logikken (statusEtterBetalingsfeil,
 * nyPeriodeSlutt, bruktKreditt, statusVedNedgradering) ligger i src/lib/planer.js.
 *
 * Punkt K (betalingsstopp), L (datapersistens — ingenting slettes, kun status),
 * I (verving/partner utløses ved første betaling / løpende).
 */
import { sql } from '../_db.js';
import {
  prisOre, nyPeriodeSlutt, statusEtterBetalingsfeil, bruktKreditt, statusVedNedgradering,
} from '../../src/lib/planer.js';
import {
  hentAbonnement, oppdaterAbonnement, loggAbonnementHendelse, hentKredittOre, endreKreditt,
} from './db.js';
import { markerVervingBetalende } from '../_verving/db.js';
import { registrerProvisjon, reverserProvisjon, harAktivPartnerRabatt } from '../_partner/db.js';
import { medPartnerRabattOre } from '../../src/lib/planer.js';

async function antallLeieobjekter(brukerId) {
  const r = await sql`select count(*)::int as n from leieobjekter where eier_id = ${brukerId}`;
  return r[0]?.n ?? 0;
}

/** Beløp som faktisk skal trekkes for en plan/intervall, inkl. ev. partner-rabatt. */
export async function beregnFakturaOre(brukerId, planId, intervall) {
  const brutto = prisOre(planId, intervall);
  if (await harAktivPartnerRabatt(brukerId)) return medPartnerRabattOre(brutto);
  return brutto;
}

/**
 * Betaling gjennomført (Stripe invoice.paid, eller stub-start). Aktiverer planen,
 * trekker tilgjengelig kontokreditt, og utløser verve-/partnerbelønning.
 */
export async function handterBetaltFaktura(brukerId, { planId, intervall = 'mnd', bruttoOre = null }) {
  const ab = await hentAbonnement(brukerId);
  const forsteGang = !ab?.betalt_forste_gang;
  const faktura = bruttoOre ?? (await beregnFakturaOre(brukerId, planId, intervall));

  // Trekk kontokreditt (vervebelønning) mot fakturaen — kreditt går aldri tapt.
  const saldo = await hentKredittOre(brukerId);
  const { brukt, nettoOre } = bruktKreditt(faktura, saldo);
  if (brukt > 0) await endreKreditt(brukerId, -brukt, 'brukt_faktura', { planId, intervall, faktura });

  const oppdatert = await oppdaterAbonnement(brukerId, {
    plan_id: planId,
    status: 'aktiv',
    faktureringsintervall: intervall,
    gjeldende_slutt: nyPeriodeSlutt(intervall),
    betalt_forste_gang: true,
    feilede_trekk: 0,
  });
  await loggAbonnementHendelse(brukerId, 'betalt', { planId, intervall, faktura, bruktKreditt: brukt, nettoOre });

  // Verving: belønning utløses ved den vervedes FØRSTE betalte faktura.
  if (forsteGang) {
    try { await markerVervingBetalende(brukerId); } catch { /* verving er best-effort */ }
  }
  // Partner: 25 % provisjon av faktisk betalt (netto etter kreditt), løpende.
  try {
    const periode = new Date().toISOString().slice(0, 10);
    await registrerProvisjon(brukerId, nettoOre, periode);
  } catch { /* provisjon er best-effort */ }

  return oppdatert;
}

/** Mislykket trekk (invoice.payment_failed): tell opp, behold tilgang til 3 forsøk brukt. */
export async function handterMislyktBetaling(brukerId) {
  const ab = await hentAbonnement(brukerId);
  const feilede = (ab?.feilede_trekk ?? 0) + 1;
  const status = statusEtterBetalingsfeil(feilede);
  const oppdatert = await oppdaterAbonnement(brukerId, { status, feilede_trekk: feilede });
  await loggAbonnementHendelse(brukerId, 'status_endret', { status, feilede_trekk: feilede, arsak: 'betaling_feilet' });
  return oppdatert;
}

/** Oppsigelse: behold full tilgang ut betalt periode, deretter gratis (effektivPlan). */
export async function handterKansellering(brukerId) {
  const oppdatert = await oppdaterAbonnement(brukerId, { status: 'kansellert' });
  await loggAbonnementHendelse(brukerId, 'status_endret', { status: 'kansellert' });
  return oppdatert;
}

/** Refusjon: reverser partnerprovisjon for kunden. */
export async function handterRefusjon(brukerId) {
  try { await reverserProvisjon(brukerId); } catch { /* best-effort */ }
  await loggAbonnementHendelse(brukerId, 'refusjon', {});
}

/**
 * Nedgradering til lavere plan. Overstiger objektantallet den nye grensen settes
 * 'over_grensen' (les, men ikke opprett nytt) — ingenting slettes (punkt L).
 */
export async function nedgrader(brukerId, nyPlan, intervall = 'mnd') {
  const antall = await antallLeieobjekter(brukerId);
  const status = statusVedNedgradering(nyPlan, antall);
  const oppdatert = await oppdaterAbonnement(brukerId, { plan_id: nyPlan, status, faktureringsintervall: intervall });
  await loggAbonnementHendelse(brukerId, 'nedgradert', { nyPlan, status, antallObjekter: antall });
  return oppdatert;
}
