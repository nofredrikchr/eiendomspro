/** /api/bygg/:id — PUT (oppdater) · DELETE (slett, kaskaderer leieobjekter). */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { oppdaterBygg, slettBygg } from '../_eiendom/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  const eierId = okt.bruker.id;
  const { id } = req.query;
  try {
    if (req.method === 'PUT') {
      const bygg = await oppdaterBygg(eierId, id, req.body ?? {});
      return bygg ? res.status(200).json({ bygg }) : res.status(404).json({ feil: 'Ikke funnet.' });
    }
    if (req.method === 'DELETE') {
      const ok = await slettBygg(eierId, id);
      return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ feil: 'Ikke funnet.' });
    }
    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
