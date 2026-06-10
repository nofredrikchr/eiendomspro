/** /api/bygg — GET (egne bygg) · POST (opprett). Eier = innlogget bruker. */
import { medBruker } from '../_http.js';
import { listBygg, opprettBygg } from '../_eiendom/db.js';

export default medBruker({
  GET: async (req, res, okt) => res.status(200).json({ bygg: await listBygg(okt.bruker.id) }),
  POST: async (req, res, okt) => res.status(201).json({ bygg: await opprettBygg(okt.bruker.id, req.body ?? {}) }),
});
