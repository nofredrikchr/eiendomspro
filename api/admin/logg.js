/** GET /api/admin/logg — revisjonslogg (siste handlinger). Kun admin (niva=3). */
import { medAdmin } from '../_http.js';
import { hentLogg } from '../_admin/db.js';

export default medAdmin({
  GET: async (req, res) => res.status(200).json({ logg: await hentLogg(100) }),
});
