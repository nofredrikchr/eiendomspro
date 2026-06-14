/**
 * POST /api/abonnement/portal — lenke til Stripe Customer Portal (administrer kort,
 * automatisk gjenforsøk, oppdatering av utløpte kort). Stub-modus har ingen portal.
 */
import { medBruker } from '../_http.js';
import { appUrl } from '../_url.js';
import { kundeportalUrl } from '../_betaling/index.js';
import { hentAbonnement } from '../_plan/db.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const ab = await hentAbonnement(okt.bruker.id);
    const r = await kundeportalUrl({
      stripeCustomerId: ab?.stripe_customer_id || null,
      returUrl: `${appUrl(req)}/innstillinger`,
    });
    return res.status(200).json({ url: r.url, stub: !!r.stub });
  },
});
