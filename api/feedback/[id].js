/** /api/feedback/:id — GET (eier/admin) · PATCH status|belonning (admin) · DELETE (eier/admin). */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { hentSak, sakEier, settStatus, giBelonning, slettSak } from '../_feedback/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  const erAdmin = okt.bruker.niva === 3;
  const { id } = req.query;

  try {
    const eier = await sakEier(id);
    if (eier === undefined) return res.status(404).json({ feil: 'Ikke funnet.' });
    const harTilgang = erAdmin || eier === okt.bruker.id;
    if (!harTilgang) return res.status(403).json({ feil: 'Ingen tilgang.' });

    if (req.method === 'GET') {
      return res.status(200).json({ sak: await hentSak(id) });
    }
    if (req.method === 'PATCH') {
      if (!erAdmin) return res.status(403).json({ feil: 'Krever admin.' });
      const { status, belonning } = req.body ?? {};
      let sak = null;
      if (status) sak = await settStatus(id, status);
      if (belonning) sak = await giBelonning(id, belonning);
      if (!sak) return res.status(400).json({ feil: 'Oppgi status eller belonning.' });
      return res.status(200).json({ sak });
    }
    if (req.method === 'DELETE') {
      await slettSak(id);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(e.kode === 'UGYLDIG' ? 400 : 500).json({ feil: e.message });
  }
}
