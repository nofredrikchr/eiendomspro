/** /api/integrasjoner — GET/PUT per-utleier integrasjons-config (blob, eier-scoped). */
import { medBruker } from '../_http.js';
import { lagBlob } from '../_eiendom/db.js';

const blob = lagBlob('integrasjoner');

export default medBruker({
  GET: async (req, res, okt) => res.status(200).json({ config: await blob.hent(okt.bruker.id) }),
  PUT: async (req, res, okt) => res.status(200).json({ config: await blob.lagre(okt.bruker.id, req.body ?? {}) }),
});
