/** POST /api/feedback/:id/lest — marker motpartens meldinger som lest. */
import { medBruker } from '../../_http.js';
import { sakEier, markerLest } from '../../_feedback/db.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const erAdmin = okt.bruker.niva === 3;
    const { id } = req.query;
    const eier = await sakEier(id);
    if (eier === undefined) return res.status(404).json({ feil: 'Ikke funnet.' });
    if (!erAdmin && eier !== okt.bruker.id) return res.status(403).json({ feil: 'Ingen tilgang.' });
    // leser styres av sesjon: admin leser bruker-meldinger, bruker leser admin-meldinger.
    await markerLest(id, erAdmin ? 'admin' : 'bruker');
    return res.status(200).json({ ok: true });
  },
});
