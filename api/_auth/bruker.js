import { erAdmin } from './roller.js';
import {
  effektivPlan, trialDagerIgjen, objectLimit, erSkrivebeskyttet,
} from '../../src/lib/planer.js';

/**
 * Former en trygg, offentlig representasjon av en bruker-rad. Stripper bort
 * passord_hash og alt annet sensitivt — dette er det eneste bruker-objektet
 * som skal sendes til klienten.
 *
 * `ekstra` kan inneholde { abonnement, kredittOre } slik at klienten får sin
 * effektive plan, prøvedager-igjen og objektgrense uten et ekstra kall. Når det
 * utelates (eldre kallsteder) faller `plan` tilbake til 'gratis'.
 */
export function offentligBruker(rad, roller = [], ekstra = {}) {
  if (!rad) return null;
  const { abonnement = null, kredittOre = 0 } = ekstra;
  const plan = effektivPlan(abonnement);
  return {
    id: rad.id,
    epost: rad.epost ?? null,
    telefon: rad.telefon ?? null,
    fulltNavn: rad.fullt_navn,
    niva: rad.niva,
    primaryRolle: rad.primary_rolle ?? null,
    aktivModus: rad.aktiv_modus ?? null,
    epostVerifisert: !!rad.epost_verifisert,
    telefonVerifisert: !!rad.telefon_verifisert,
    roller: Array.isArray(roller) ? roller : [],
    erAdmin: erAdmin(rad),
    // ─── Abonnement / plan (kun trygge, offentlige felter) ───
    plan, // effektiv plan akkurat nå (gratis|privat|pro)
    abonnement: abonnement
      ? {
          status: abonnement.status,
          planId: abonnement.plan_id,
          faktureringsintervall: abonnement.faktureringsintervall,
          trialEndsAt: abonnement.trial_ends_at ?? null,
          gjeldendeSlutt: abonnement.gjeldende_slutt ?? null,
          betaltForsteGang: !!abonnement.betalt_forste_gang,
          harKort: !!abonnement.har_kort,
        }
      : null,
    trialDagerIgjen: trialDagerIgjen(abonnement),
    skrivebeskyttet: erSkrivebeskyttet(abonnement),
    objektgrense: objectLimit(plan),
    kredittOre: Number.isFinite(kredittOre) ? kredittOre : 0,
  };
}
