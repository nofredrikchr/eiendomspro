/** GET /api/admin/brukere?sok= — liste over brukere. Kun admin (niva=3). */
import { medAdmin } from '../_http.js';
import { listBrukere } from '../_admin/db.js';

export default medAdmin({
  GET: async (req, res) => {
    const sok = typeof req.query?.sok === 'string' ? req.query.sok : '';
    return res.status(200).json({ brukere: await listBrukere({ sok }) });
  },
});
