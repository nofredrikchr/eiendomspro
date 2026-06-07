/** POST /api/feedback/:id/melding — legg til melding. avsender utledes fra sesjon. */
import { dbKonfigurert } from '../../_db.js';
import { krevBruker } from '../../_auth/index.js';
import { sakEier, leggMelding } from '../../_feedback/db.js';

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

    const { tekst, type, meta } = req.body ?? {};
    if (!tekst || !String(tekst).trim()) return res.status(400).json({ feil: 'Tom melding.' });
    // avsender styres av sesjon (ikke klienten): admin -> 'admin', ellers 'bruker'.
    const avsender = erAdmin ? 'admin' : 'bruker';
    const sak = await leggMelding(id, { avsender, tekst, type: type || 'melding', meta: meta ?? null });
    return res.status(200).json({ sak });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
