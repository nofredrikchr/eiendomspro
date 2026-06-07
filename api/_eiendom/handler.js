/**
 * Generiske, eier-scopede CRUD-handlere for /api-entiteter. Hver entitet får to
 * filer (index = GET/POST, [id] = PUT/DELETE) som bare kaller disse.
 */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';

export function indexHandler(crud, listeNavn) {
  return async function handler(req, res) {
    if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
    const okt = await krevBruker(req);
    if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
    try {
      if (req.method === 'GET') return res.status(200).json({ [listeNavn]: await crud.list(okt.bruker.id) });
      if (req.method === 'POST') return res.status(201).json({ item: await crud.opprett(okt.bruker.id, req.body ?? {}) });
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ feil: 'Metode ikke tillatt.' });
    } catch (e) {
      return res.status(500).json({ feil: e.message });
    }
  };
}

export function idHandler(crud) {
  return async function handler(req, res) {
    if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
    const okt = await krevBruker(req);
    if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
    const { id } = req.query;
    try {
      if (req.method === 'PUT') {
        const item = await crud.oppdater(okt.bruker.id, id, req.body ?? {});
        return item ? res.status(200).json({ item }) : res.status(404).json({ feil: 'Ikke funnet.' });
      }
      if (req.method === 'DELETE') {
        const ok = await crud.slett(okt.bruker.id, id);
        return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ feil: 'Ikke funnet.' });
      }
      res.setHeader('Allow', 'PUT, DELETE');
      return res.status(405).json({ feil: 'Metode ikke tillatt.' });
    } catch (e) {
      return res.status(500).json({ feil: e.message });
    }
  };
}
