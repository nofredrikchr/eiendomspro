/**
 * POST /api/abonnement/kanseller — si opp abonnementet / avbryt prøveperioden.
 * Ingen bindingstid: full tilgang ut inneværende periode (eller prøveperiode),
 * deretter Gratis. Stripe-abonnementet sies opp ved periodeslutt, så det blir
 * INGEN nytt trekk. Ingen data slettes (punkt L).
 */
import { medBruker } from '../_http.js';
import { handterKansellering } from '../_plan/livssyklus.js';
import { hentAbonnement } from '../_plan/db.js';
import { kansellerAbonnement } from '../_betaling/index.js';
import { trygtAbonnement } from './index.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const naa = await hentAbonnement(okt.bruker.id);
    // Si opp hos Stripe ved periodeslutt (hindrer trekk når prøven utløper).
    if (naa?.stripe_subscription_id) {
      try { await kansellerAbonnement(naa.stripe_subscription_id); } catch { /* best-effort; lokal status settes uansett */ }
    }
    const ab = await handterKansellering(okt.bruker.id);
    return res.status(200).json({ abonnement: trygtAbonnement(ab) });
  },
});
