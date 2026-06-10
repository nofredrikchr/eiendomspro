/** /api/faktiske-tall — GET (hele blobben) · PUT (erstatt blobben). Eier-scoped. */
import { medBruker } from '../_http.js';
import { lagBlob } from '../_eiendom/db.js';

const blob = lagBlob('faktiske_tall');

export default medBruker({
  GET: async (req, res, okt) => res.status(200).json({ faktiskeTall: await blob.hent(okt.bruker.id) }),
  PUT: async (req, res, okt) => res.status(200).json({ faktiskeTall: await blob.lagre(okt.bruker.id, req.body ?? {}) }),
});
