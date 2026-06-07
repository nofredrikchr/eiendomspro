/** /api/profil — GET/PUT brukerens profil-felter (blob, eier-scoped). */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { lagBlob } from '../_eiendom/db.js';

const blob = lagBlob('bruker_profil');

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  try {
    if (req.method === 'GET') return res.status(200).json({ profil: await blob.hent(okt.bruker.id) });
    if (req.method === 'PUT') return res.status(200).json({ profil: await blob.lagre(okt.bruker.id, req.body ?? {}) });
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
