/** /api/bygg/:id — PUT (oppdater) · DELETE (slett, kaskaderer leieobjekter). */
import { medBruker } from '../_http.js';
import { oppdaterBygg, slettBygg } from '../_eiendom/db.js';

export default medBruker({
  PUT: async (req, res, okt) => {
    const bygg = await oppdaterBygg(okt.bruker.id, req.query.id, req.body ?? {});
    return bygg ? res.status(200).json({ bygg }) : res.status(404).json({ feil: 'Ikke funnet.' });
  },
  DELETE: async (req, res, okt) => {
    const ok = await slettBygg(okt.bruker.id, req.query.id);
    return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ feil: 'Ikke funnet.' });
  },
});
