/** POST /api/feedback/:id/melding — legg til melding. avsender utledes fra sesjon. */
import { medBruker } from '../../_http.js';
import { sakEier, leggMelding } from '../../_feedback/db.js';

const MAKS_MELDING = 5000;

export default medBruker({
  POST: async (req, res, okt) => {
    const erAdmin = okt.bruker.niva === 3;
    const { id } = req.query;
    const eier = await sakEier(id);
    if (eier === undefined) return res.status(404).json({ feil: 'Ikke funnet.' });
    if (!erAdmin && eier !== okt.bruker.id) return res.status(403).json({ feil: 'Ingen tilgang.' });

    const { tekst, type, meta } = req.body ?? {};
    if (!tekst || !String(tekst).trim()) return res.status(400).json({ feil: 'Tom melding.' });
    if (String(tekst).length > MAKS_MELDING) return res.status(400).json({ feil: `Melding kan være maks ${MAKS_MELDING} tegn.` });
    // avsender styres av sesjon (ikke klienten): admin -> 'admin', ellers 'bruker'.
    const avsender = erAdmin ? 'admin' : 'bruker';
    const sak = await leggMelding(id, { avsender, tekst, type: type || 'melding', meta: meta ?? null });
    return res.status(200).json({ sak });
  },
});
