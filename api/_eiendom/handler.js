/**
 * Generiske, eier-scopede CRUD-handlere for /api-entiteter. Hver entitet får to
 * filer (index = GET/POST, [id] = PUT/DELETE) som bare kaller disse. Vaktene
 * (db/metode/auth/størrelse/feil) ligger i medBruker (api/_http.js).
 */
import { medBruker } from '../_http.js';

export function indexHandler(crud, listeNavn) {
  return medBruker({
    GET: async (req, res, okt) => res.status(200).json({ [listeNavn]: await crud.list(okt.bruker.id) }),
    POST: async (req, res, okt) => res.status(201).json({ item: await crud.opprett(okt.bruker.id, req.body ?? {}) }),
  });
}

export function idHandler(crud) {
  return medBruker({
    PUT: async (req, res, okt) => {
      const item = await crud.oppdater(okt.bruker.id, req.query.id, req.body ?? {});
      return item ? res.status(200).json({ item }) : res.status(404).json({ feil: 'Ikke funnet.' });
    },
    DELETE: async (req, res, okt) => {
      const ok = await crud.slett(okt.bruker.id, req.query.id);
      return ok ? res.status(200).json({ ok: true }) : res.status(404).json({ feil: 'Ikke funnet.' });
    },
  });
}
