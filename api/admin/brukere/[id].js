/** PATCH /api/admin/brukere/:id — endre niva/status (logges). Kun admin (niva=3). */
import { medAdmin } from '../../_http.js';
import { oppdaterBruker } from '../../_admin/db.js';

export default medAdmin({
  PATCH: async (req, res, okt) => {
    const { niva, status } = req.body ?? {};
    const bruker = await oppdaterBruker(okt.bruker.id, req.query.id, { niva, status });
    return bruker ? res.status(200).json({ bruker }) : res.status(404).json({ feil: 'Ikke funnet.' });
  },
});
