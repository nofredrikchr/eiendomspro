/**
 * POST /api/abonnement/start — start abonnement (Privat/Pro, mnd/år).
 * Stub-modus fullfører «betalingen» umiddelbart slik at flyten kan testes i preview.
 * Ekte Stripe gir en Checkout-URL klienten redirecter til.
 */
import { medBruker } from '../_http.js';
import { appUrl } from '../_url.js';
import { opprettCheckout } from '../_betaling/index.js';
import { handterBetaltFaktura } from '../_plan/livssyklus.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const { planId, intervall = 'mnd' } = req.body ?? {};
    if (!['privat', 'pro'].includes(planId)) return res.status(400).json({ feil: 'Ugyldig plan.' });
    if (!['mnd', 'aar'].includes(intervall)) return res.status(400).json({ feil: 'Ugyldig faktureringsintervall.' });

    const base = appUrl(req);
    const r = await opprettCheckout({
      brukerId: okt.bruker.id,
      planId,
      intervall,
      suksessUrl: `${base}/velkommen`,
      avbrytUrl: `${base}/priser?avbrutt=1`,
      kundeEpost: okt.bruker.epost,
    });
    // Stub: ingen ekte Stripe — aktiver direkte (simulert betaling).
    if (r.stub) await handterBetaltFaktura(okt.bruker.id, { planId, intervall });
    return res.status(200).json({ url: r.url, stub: !!r.stub });
  },
});
