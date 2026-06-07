/** POST /api/auth/request-reset — send passord-reset-lenke på e-post. Alltid 200 (ingen enumerering). */
import { dbKonfigurert } from '../_db.js';
import { finnBruker } from '../_auth/index.js';
import { lagEngangsToken } from '../_auth/tokens.js';
import { sjekkRate } from '../_auth/ratelimit.js';
import { sendEpost, malReset } from '../_auth/epost.js';
import { normaliserTelefon } from '../_auth/telefon.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ feil: 'Metode ikke tillatt.' }); }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'ukjent';
  if (!(await sjekkRate(`reset:${ip}`, 5, 900))) return res.status(429).json({ feil: 'For mange forsøk. Prøv igjen senere.' });

  const raw = typeof req.body?.identifikator === 'string' ? req.body.identifikator.trim() : '';
  const epost = raw.includes('@') ? raw.toLowerCase() : null;
  const telefon = !epost ? normaliserTelefon(raw) : null;

  try {
    const bruker = await finnBruker({ epost, telefon });
    // Send kun hvis kontoen finnes OG har e-post (reset-lenke går på e-post).
    if (bruker?.epost) {
      const token = await lagEngangsToken(bruker.id, 'passord_reset', 60);
      const lenke = `https://${req.headers.host}/reset?token=${token}`;
      const { emne, html } = malReset(lenke);
      await sendEpost({ til: bruker.epost, emne, html });
    }
  } catch { /* svelg — ikke lekk noe */ }

  return res.status(200).json({ ok: true });
}
