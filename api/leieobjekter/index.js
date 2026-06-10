/** /api/leieobjekter — GET (egne) · POST (opprett). Eier = innlogget bruker. */
import { medBruker } from '../_http.js';
import { listLeieobjekter, opprettLeieobjekt } from '../_eiendom/db.js';

export default medBruker({
  GET: async (req, res, okt) => res.status(200).json({ leieobjekter: await listLeieobjekter(okt.bruker.id) }),
  POST: async (req, res, okt) => res.status(201).json({ leieobjekt: await opprettLeieobjekt(okt.bruker.id, req.body ?? {}) }),
});
