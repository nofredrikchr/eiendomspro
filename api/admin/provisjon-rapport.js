/** GET /api/admin/provisjon-rapport?periode=YYYY-MM-DD — månedlig utbetalingsrapport (admin). */
import { medAdmin } from '../_http.js';
import { utbetalingsrapport } from '../_partner/db.js';

export default medAdmin({
  GET: async (req, res) => {
    const periode = typeof req.query?.periode === 'string' ? req.query.periode : null;
    const rapport = await utbetalingsrapport(periode);
    return res.status(200).json({ periode: periode || 'alle', rapport });
  },
});
