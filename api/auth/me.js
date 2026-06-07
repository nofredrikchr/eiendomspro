/** GET /api/auth/me — gjeldende bruker (eller { bruker: null }). Driver AuthContext. */
import { dbKonfigurert } from '../_db.js';
import { hentSesjonsBruker, offentligBruker } from '../_auth/index.js';

export default async function handler(req, res) {
  // Uten DB (demo-modus) finnes ingen innlogget bruker — ikke en feil.
  if (!dbKonfigurert()) return res.status(200).json({ bruker: null, demo: true });
  try {
    const okt = await hentSesjonsBruker(req);
    if (!okt) return res.status(200).json({ bruker: null });
    return res.status(200).json({ bruker: offentligBruker(okt.bruker, okt.roller) });
  } catch (e) {
    return res.status(500).json({ bruker: null, feil: e.message });
  }
}
