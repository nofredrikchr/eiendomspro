/** POST /api/auth/register — opprett konto + sesjon. */
import { dbKonfigurert } from '../_db.js';
import { validerRegistrering } from '../_auth/validering.js';
import { finnBruker, opprettBruker, opprettSesjon, offentligBruker } from '../_auth/index.js';
import { byggSesjonsCookie } from '../_auth/cookie.js';
import { sjekkRate } from '../_auth/ratelimit.js';
import { lagEngangsToken } from '../_auth/tokens.js';
import { sendEpost, malVerifisering } from '../_auth/epost.js';
import { opprettTrialOgKonto, hentAbonnement } from '../_plan/db.js';
import { registrerVerving } from '../_verving/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: { generelt: 'Metode ikke tillatt.' } });
  }
  if (!dbKonfigurert()) return res.status(503).json({ feil: { generelt: 'Database ikke konfigurert.' } });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'ukjent';
  if (!(await sjekkRate(`register:${ip}`, 10, 3600))) {
    return res.status(429).json({ feil: { generelt: 'For mange registreringer fra denne nettverksadressen. Prøv igjen senere.' } });
  }

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

    // Reverse trial: permanent Gratis-konto + 14 dager full Pro (kortløst).
    // Oppretter også kontokreditt-rad og personlig vervekode.
    await opprettTrialOgKonto(bruker.id, bruker.fullt_navn);

    // Verve-/partnerkode (best-effort — registrering skal aldri feile på ugyldig kode).
    const vervekode = typeof req.body?.vervekode === 'string' ? req.body.vervekode.trim() : null;
    const partnerkode = typeof req.body?.partnerkode === 'string' ? req.body.partnerkode.trim() : null;
    if (vervekode) {
      try { await registrerVerving(vervekode, bruker.id); } catch { /* ugyldig vervekode ignoreres */ }
    }
    if (partnerkode) {
      try {
        const { registrerPartnerVerving } = await import('../_partner/db.js');
        await registrerPartnerVerving(partnerkode, bruker.id);
      } catch { /* ugyldig partnerkode ignoreres */ }
    }

    // Send verifiserings-e-post (best-effort; dormant uten RESEND_API_KEY).
    if (bruker.epost) {
      try {
        const vtoken = await lagEngangsToken(bruker.id, 'epost_verifisering', 60 * 24);
        const { emne, html } = malVerifisering(`https://${req.headers.host}/verifiser?token=${vtoken}`);
        await sendEpost({ til: bruker.epost, emne, html });
      } catch { /* registrering skal ikke feile pga. e-post */ }
    }

    const abonnement = await hentAbonnement(bruker.id);
    return res.status(201).json({ bruker: offentligBruker(bruker, [v.verdier.primaryRolle], { abonnement, kredittOre: 0 }) });
  } catch (e) {
    return res.status(500).json({ feil: { generelt: e.message } });
  }
}
