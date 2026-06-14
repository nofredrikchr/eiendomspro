/**
 * POST /api/abonnement/start — start prøveperiode/abonnement på Privat eller Pro.
 *
 * Modell: prøveperiode på betalt plan KREVER kort (Stripe samler det inn nå, men
 * trekker først når prøven utløper). Brukeren må selv si opp for å unngå trekk.
 * Body: { planId, intervall, trialDager? } — default 14 dagers prøve.
 * Stub-modus simulerer prøvestart direkte slik at flyten kan testes uten Stripe.
 */
import { medBruker } from '../_http.js';
import { appUrl } from '../_url.js';
import { opprettCheckout } from '../_betaling/index.js';
import { startTrial } from '../_plan/db.js';

const STD_TRIAL_DAGER = 14;

export default medBruker({
  POST: async (req, res, okt) => {
    const { planId, intervall = 'mnd' } = req.body ?? {};
    const trialDager = req.body?.trialDager === 0 ? 0 : STD_TRIAL_DAGER;
    if (!['privat', 'pro'].includes(planId)) return res.status(400).json({ feil: 'Ugyldig plan.' });
    if (!['mnd', 'aar'].includes(intervall)) return res.status(400).json({ feil: 'Ugyldig faktureringsintervall.' });

    const base = appUrl(req);
    const r = await opprettCheckout({
      brukerId: okt.bruker.id,
      planId,
      intervall,
      trialDager,
      suksessUrl: `${base}/velkommen`,
      avbrytUrl: `${base}/velg-plan?avbrutt=1`,
      kundeEpost: okt.bruker.epost,
    });
    // Stub: ingen ekte Stripe — simuler prøvestart (kort «registrert»).
    if (r.stub) {
      await startTrial(okt.bruker.id, { planId, intervall, trialDager: trialDager || STD_TRIAL_DAGER });
    }
    return res.status(200).json({ url: r.url, stub: !!r.stub });
  },
});
