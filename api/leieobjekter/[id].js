/** /api/leieobjekter/:id — PUT (oppdater) · DELETE (slett). */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { oppdaterLeieobjekt, slettLeieobjekt } from '../_eiendom/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  const eierId = okt.bruker.id;
  const { id } = req.query;
  try {
    if (req.method === 'PUT') {
      const leieobjekt = await oppdaterLeieobjekt(eierId, id, req.body ?? {});
      return leieobjekt ? res.status(200).json({ leieobjekt }) : res.status(404).json({ feil: 'Ikke funnet.' });
    }
    if (req.method === 'DELETE') {
      const ok = await slettLeieobjekt(eierId, id);
      return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ feil: 'Ikke funnet.' });
    }
    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(e.kode === 'UKJENT_BYGG' ? 400 : 500).json({ feil: e.message });
  }
}
