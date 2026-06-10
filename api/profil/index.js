/** /api/profil — GET/PUT brukerens profil-felter (blob, eier-scoped). */
import { medBruker } from '../_http.js';
import { lagBlob } from '../_eiendom/db.js';

const blob = lagBlob('bruker_profil');

export default medBruker({
  GET: async (req, res, okt) => res.status(200).json({ profil: await blob.hent(okt.bruker.id) }),
  PUT: async (req, res, okt) => res.status(200).json({ profil: await blob.lagre(okt.bruker.id, req.body ?? {}) }),
});
