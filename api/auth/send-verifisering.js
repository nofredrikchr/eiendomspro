/** POST /api/auth/send-verifisering — send (ny) e-postbekreftelse til innlogget bruker. */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { lagEngangsToken } from '../_auth/tokens.js';
import { sjekkRate } from '../_auth/ratelimit.js';
import { sendEpost, malVerifisering } from '../_auth/epost.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ feil: 'Metode ikke tillatt.' }); }
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  if (okt.bruker.epost_verifisert) return res.status(200).json({ ok: true, alleredeVerifisert: true });
  if (!okt.bruker.epost) return res.status(400).json({ feil: 'Kontoen har ingen e-post.' });
  if (!(await sjekkRate(`verify:${okt.bruker.id}`, 5, 3600))) return res.status(429).json({ feil: 'For mange forsøk. Prøv igjen senere.' });

  try {
    const token = await lagEngangsToken(okt.bruker.id, 'epost_verifisering', 60 * 24);
    const lenke = `https://${req.headers.host}/verifiser?token=${token}`;
    const { emne, html } = malVerifisering(lenke);
    const r = await sendEpost({ til: okt.bruker.epost, emne, html });
    return res.status(200).json({ ok: true, sendt: r.sendt });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
