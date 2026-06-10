/** /api/leieobjekter/:id — PUT (oppdater) · DELETE (slett). */
import { medBruker } from '../_http.js';
import { oppdaterLeieobjekt, slettLeieobjekt } from '../_eiendom/db.js';

export default medBruker({
  PUT: async (req, res, okt) => {
    const leieobjekt = await oppdaterLeieobjekt(okt.bruker.id, req.query.id, req.body ?? {});
    return leieobjekt ? res.status(200).json({ leieobjekt }) : res.status(404).json({ feil: 'Ikke funnet.' });
  },
  DELETE: async (req, res, okt) => {
    const ok = await slettLeieobjekt(okt.bruker.id, req.query.id);
    return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ feil: 'Ikke funnet.' });
  },
});
