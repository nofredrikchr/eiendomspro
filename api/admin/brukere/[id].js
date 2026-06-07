/** PATCH /api/admin/brukere/:id — endre niva/status (logges). Kun admin (niva=3). */
import { dbKonfigurert } from '../../_db.js';
import { krevAdmin } from '../../_auth/index.js';
import { oppdaterBruker } from '../../_admin/db.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevAdmin(req);
  if (!okt) return res.status(403).json({ feil: 'Krever admin.' });
  const { id } = req.query;
  try {
    const { niva, status } = req.body ?? {};
    const bruker = await oppdaterBruker(okt.bruker.id, id, { niva, status });
    return bruker ? res.status(200).json({ bruker }) : res.status(404).json({ feil: 'Ikke funnet.' });
  } catch (e) {
    return res.status(e.kode === 'UGYLDIG' ? 400 : 500).json({ feil: e.message });
  }
}
