/** /api/leieobjekter — GET (egne) · POST (opprett). Eier = innlogget bruker. */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { listLeieobjekter, opprettLeieobjekt } from '../_eiendom/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  const eierId = okt.bruker.id;
  try {
    if (req.method === 'GET') return res.status(200).json({ leieobjekter: await listLeieobjekter(eierId) });
    if (req.method === 'POST') return res.status(201).json({ leieobjekt: await opprettLeieobjekt(eierId, req.body ?? {}) });
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(e.kode === 'UKJENT_BYGG' ? 400 : 500).json({ feil: e.message });
  }
}
