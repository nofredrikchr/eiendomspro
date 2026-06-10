/** GET /api/admin/stats — systemstatistikk. Kun admin (niva=3). */
import { medAdmin } from '../_http.js';
import { hentStatistikk } from '../_admin/db.js';

export default medAdmin({
  GET: async (req, res) => res.status(200).json({ stats: await hentStatistikk() }),
});
