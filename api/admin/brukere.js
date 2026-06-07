/** GET /api/admin/brukere?sok= — liste over brukere. Kun admin (niva=3). */
import { dbKonfigurert } from '../_db.js';
import { krevAdmin } from '../_auth/index.js';
import { listBrukere } from '../_admin/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevAdmin(req);
  if (!okt) return res.status(403).json({ feil: 'Krever admin.' });
  try {
    const sok = typeof req.query?.sok === 'string' ? req.query.sok : '';
    return res.status(200).json({ brukere: await listBrukere({ sok }) });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
