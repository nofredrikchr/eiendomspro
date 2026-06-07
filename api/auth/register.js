/** POST /api/auth/register — opprett konto + sesjon. */
import { dbKonfigurert } from '../_db.js';
import { validerRegistrering } from '../_auth/validering.js';
import { finnBruker, opprettBruker, opprettSesjon, offentligBruker } from '../_auth/index.js';
import { byggSesjonsCookie } from '../_auth/cookie.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: { generelt: 'Metode ikke tillatt.' } });
  }
  if (!dbKonfigurert()) return res.status(503).json({ feil: { generelt: 'Database ikke konfigurert.' } });

  const v = validerRegistrering(req.body ?? {});
  if (!v.ok) return res.status(400).json({ feil: v.feil });

  try {
    const dupE = v.verdier.epost ? await finnBruker({ epost: v.verdier.epost }) : null;
    const dupT = v.verdier.telefon ? await finnBruker({ telefon: v.verdier.telefon }) : null;
    if (dupE || dupT) {
      return res.status(409).json({ feil: { kontakt: 'Det finnes allerede en konto med denne e-posten/telefonen.' } });
    }
    const bruker = await opprettBruker(v.verdier);
    const token = await opprettSesjon(bruker.id, {
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
    });
    res.setHeader('Set-Cookie', byggSesjonsCookie(token));
    return res.status(201).json({ bruker: offentligBruker(bruker, [v.verdier.primaryRolle]) });
  } catch (e) {
    return res.status(500).json({ feil: { generelt: e.message } });
  }
}
