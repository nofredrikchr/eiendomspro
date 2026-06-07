/** POST /api/auth/verify — bekreft e-post via token. */
import { dbKonfigurert } from '../_db.js';
import { brukEngangsToken } from '../_auth/tokens.js';
import { settEpostVerifisert } from '../_auth/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ feil: 'Metode ikke tillatt.' }); }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });

  const { token } = req.body ?? {};
  if (!token) return res.status(400).json({ feil: 'Mangler token.' });
  try {
    const brukerId = await brukEngangsToken(token, 'epost_verifisering');
    if (!brukerId) return res.status(400).json({ feil: 'Lenken er ugyldig eller utløpt.' });
    await settEpostVerifisert(brukerId);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
