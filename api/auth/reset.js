/** POST /api/auth/reset — sett nytt passord via gyldig reset-token. */
import { dbKonfigurert } from '../_db.js';
import { brukEngangsToken } from '../_auth/tokens.js';
import { oppdaterPassord } from '../_auth/index.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ feil: 'Metode ikke tillatt.' }); }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });

  const { token, passord } = req.body ?? {};
  if (!token) return res.status(400).json({ feil: 'Mangler token.' });
  if (typeof passord !== 'string' || passord.length < 8) return res.status(400).json({ feil: 'Passord må være minst 8 tegn.' });

  try {
    const brukerId = await brukEngangsToken(token, 'passord_reset');
    if (!brukerId) return res.status(400).json({ feil: 'Lenken er ugyldig eller utløpt.' });
    await oppdaterPassord(brukerId, passord);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
