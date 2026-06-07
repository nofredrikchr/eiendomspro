/** POST /api/feedback/:id/lest — marker motpartens meldinger som lest. */
import { dbKonfigurert } from '../../_db.js';
import { krevBruker } from '../../_auth/index.js';
import { sakEier, markerLest } from '../../_feedback/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  const erAdmin = okt.bruker.niva === 3;
  const { id } = req.query;
  try {
    const eier = await sakEier(id);
    if (eier === undefined) return res.status(404).json({ feil: 'Ikke funnet.' });
    if (!erAdmin && eier !== okt.bruker.id) return res.status(403).json({ feil: 'Ingen tilgang.' });
    // leser styres av sesjon: admin leser bruker-meldinger, bruker leser admin-meldinger.
    await markerLest(id, erAdmin ? 'admin' : 'bruker');
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
