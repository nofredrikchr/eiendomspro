/**
 * POST /api/abonnement/kanseller — si opp abonnementet. Ingen bindingstid: full
 * tilgang ut betalt periode, deretter Gratis. Ingen data slettes (punkt L).
 */
import { medBruker } from '../_http.js';
import { handterKansellering } from '../_plan/livssyklus.js';
import { trygtAbonnement } from './index.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const ab = await handterKansellering(okt.bruker.id);
    return res.status(200).json({ abonnement: trygtAbonnement(ab) });
  },
});
