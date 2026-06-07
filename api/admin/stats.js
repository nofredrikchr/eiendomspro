/** GET /api/admin/stats — systemstatistikk. Kun admin (niva=3). */
import { dbKonfigurert } from '../_db.js';
import { krevAdmin } from '../_auth/index.js';
import { hentStatistikk } from '../_admin/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevAdmin(req);
  if (!okt) return res.status(403).json({ feil: 'Krever admin.' });
  try {
    return res.status(200).json({ stats: await hentStatistikk() });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
