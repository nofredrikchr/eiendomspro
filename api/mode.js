/** POST /api/mode — bytt aktiv modus (utleier/leietaker). Lazy-provisjonerer rollen. */
import { dbKonfigurert } from './_db.js';
import { krevBruker, byttModus, offentligBruker } from './_auth/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  try {
    const { modus } = req.body ?? {};
    const resultat = await byttModus(okt.bruker.id, modus);
    if (!resultat) return res.status(400).json({ feil: 'Ugyldig modus.' });
    return res.status(200).json({ bruker: offentligBruker(resultat.bruker, resultat.roller) });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
