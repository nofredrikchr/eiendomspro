/** POST /api/auth/login — verifiser passord, opprett sesjon. */
import { dbKonfigurert } from '../_db.js';
import { validerInnlogging } from '../_auth/validering.js';
import { finnBruker, hentRoller, opprettSesjon, offentligBruker, verifyPassord } from '../_auth/index.js';
import { byggSesjonsCookie } from '../_auth/cookie.js';
import { sjekkRate } from '../_auth/ratelimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: { generelt: 'Metode ikke tillatt.' } });
  }
  if (!dbKonfigurert()) return res.status(503).json({ feil: { generelt: 'Database ikke konfigurert.' } });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'ukjent';
  if (!(await sjekkRate(`login:${ip}`, 10, 900))) {
    return res.status(429).json({ feil: { generelt: 'For mange innloggingsforsøk. Prøv igjen om noen minutter.' } });
  }

  const v = validerInnlogging(req.body ?? {});
  if (!v.ok) return res.status(400).json({ feil: v.feil });

  try {
    const bruker = await finnBruker({ epost: v.verdier.epost, telefon: v.verdier.telefon });
    const ok = bruker && bruker.passord_hash && (await verifyPassord(bruker.passord_hash, v.verdier.passord));
    // Generisk feilmelding for å unngå bruker-enumerering (lekker ikke om konto finnes)
    if (!ok) return res.status(401).json({ feil: { generelt: 'Feil e-post/telefon eller passord.' } });

    const token = await opprettSesjon(bruker.id, {
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
    });
    res.setHeader('Set-Cookie', byggSesjonsCookie(token));
    const roller = await hentRoller(bruker.id);
    return res.status(200).json({ bruker: offentligBruker(bruker, roller) });
  } catch (e) {
    return res.status(500).json({ feil: { generelt: e.message } });
  }
}
