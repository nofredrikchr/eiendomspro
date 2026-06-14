/** GET /api/abonnement — gjeldende plan/status/kreditt for innlogget bruker. */
import { medBruker } from '../_http.js';
import { hentAbonnement, hentKredittOre } from '../_plan/db.js';
import { effektivPlan, trialDagerIgjen, objectLimit, erSkrivebeskyttet } from '../../src/lib/planer.js';

/** Kun trygge, offentlige felter (aldri stripe-IDer e.l. til klienten). */
export function trygtAbonnement(ab) {
  if (!ab) return null;
  return {
    status: ab.status,
    planId: ab.plan_id,
    faktureringsintervall: ab.faktureringsintervall,
    trialEndsAt: ab.trial_ends_at ?? null,
    gjeldendeSlutt: ab.gjeldende_slutt ?? null,
    betaltForsteGang: !!ab.betalt_forste_gang,
    harKort: !!ab.har_kort,
  };
}

export default medBruker({
  GET: async (req, res, okt) => {
    const ab = await hentAbonnement(okt.bruker.id);
    const kredittOre = await hentKredittOre(okt.bruker.id);
    const plan = effektivPlan(ab);
    return res.status(200).json({
      abonnement: trygtAbonnement(ab),
      plan,
      trialDagerIgjen: trialDagerIgjen(ab),
      objektgrense: objectLimit(plan),
      skrivebeskyttet: erSkrivebeskyttet(ab),
      kredittOre,
    });
  },
});
