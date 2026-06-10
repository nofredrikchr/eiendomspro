/**
 * Felles HTTP-wrapper for /api-endepunkter. Samler vaktene alle endepunkter
 * trenger, i fast rekkefølge:
 *
 *   1. dbKonfigurert()       → 503 { feil: 'Database ikke konfigurert.' }
 *   2. metodesjekk           → 405 med Allow-header
 *   3. krevBruker            → 401 { feil: 'Ikke innlogget.' }
 *      (medAdmin i tillegg)  → 403 { feil: 'Krever admin.' } hvis niva !== 3
 *   4. grov størrelsesvakt   → 413 { feil: 'For stor forespørsel.' }
 *   5. try/catch rundt handler:
 *      - e.kode === 'UKJENT_BYGG'        → 400 { feil: 'Ukjent bygg.' }
 *      - e.status (heltall) + e.feil     → kontrollert feil fra handleren
 *      - ellers                          → logg + 500 { feil: 'Uventet serverfeil.' }
 *        (e.message sendes ALDRI til klienten — kan lekke interne detaljer)
 *
 * Bruk:
 *   export default medBruker({
 *     GET:  async (req, res, okt) => res.status(200).json({ ... }),
 *     POST: async (req, res, okt) => res.status(201).json({ ... }),
 *   });
 */
import { dbKonfigurert } from './_db.js';
import { krevBruker } from './_auth/index.js';

const MAKS_BODY_TEGN = 2_000_000;

function lagWrapper(metoder, { krevAdminNiva = false } = {}) {
  const tillatt = Object.keys(metoder).join(', ');
  return async function handler(req, res) {
    if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });

    const fn = metoder[req.method];
    if (!fn) {
      res.setHeader('Allow', tillatt);
      return res.status(405).json({ feil: 'Metode ikke tillatt.' });
    }

    const okt = await krevBruker(req);
    if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
    if (krevAdminNiva && okt.bruker.niva !== 3) return res.status(403).json({ feil: 'Krever admin.' });

    if (JSON.stringify(req.body ?? {}).length > MAKS_BODY_TEGN) {
      return res.status(413).json({ feil: 'For stor forespørsel.' });
    }

    try {
      return await fn(req, res, okt);
    } catch (e) {
      if (e?.kode === 'UKJENT_BYGG') return res.status(400).json({ feil: 'Ukjent bygg.' });
      if (Number.isInteger(e?.status) && typeof e?.feil === 'string') {
        return res.status(e.status).json({ feil: e.feil });
      }
      console.error('[api]', e);
      return res.status(500).json({ feil: 'Uventet serverfeil.' });
    }
  };
}

/** Wrapper for vanlige innloggede endepunkter. */
export function medBruker(metoder) {
  return lagWrapper(metoder);
}

/** Wrapper for admin-endepunkter (niva=3). 401 hvis ikke innlogget, 403 hvis ikke admin. */
export function medAdmin(metoder) {
  return lagWrapper(metoder, { krevAdminNiva: true });
}
