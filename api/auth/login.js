/** POST /api/auth/login — verifiser passord, opprett sesjon. */
import { dbKonfigurert } from '../_db.js';
import { validerInnlogging } from '../_auth/validering.js';
import { finnBruker, hentRoller, opprettSesjon, offentligBruker, verifyPassord } from '../_auth/index.js';
import { byggSesjonsCookie } from '../_auth/cookie.js';
import { sjekkRate } from '../_auth/ratelimit.js';
import { hentAbonnement, hentKredittOre } from '../_plan/db.js';

// Gyldig argon2id-hash av en tilfeldig, forkastet streng (samme parametre som
// hashPassord). Brukes til dummy-verifisering når brukeren ikke finnes, slik at
// svartiden er lik uansett — hindrer timing-basert bruker-enumerering.
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$78wS+kklwCwns47PwlNZgw$dE4ohNCg6ua1EktyVMbDUFfo6ZFeR27roQqaI5r9ZRw';

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
    // Verifiser alltid mot en hash (dummy hvis konto/hash mangler) → lik svartid.
    const ok = (await verifyPassord(bruker?.passord_hash || DUMMY_HASH, v.verdier.passord)) && !!bruker?.passord_hash;
    // Generisk feilmelding for å unngå bruker-enumerering (lekker ikke om konto finnes)
    if (!ok) return res.status(401).json({ feil: { generelt: 'Feil e-post/telefon eller passord.' } });

    const token = await opprettSesjon(bruker.id, {
      ip: req.headers['x-forwarded-for'] || null,
      userAgent: req.headers['user-agent'] || null,
    });
    res.setHeader('Set-Cookie', byggSesjonsCookie(token));
    const roller = await hentRoller(bruker.id);
    const ekstra = bruker.niva === 3
      ? {}
      : { abonnement: await hentAbonnement(bruker.id), kredittOre: await hentKredittOre(bruker.id) };
    return res.status(200).json({ bruker: offentligBruker(bruker, roller, ekstra) });
  } catch (e) {
    return res.status(500).json({ feil: { generelt: e.message } });
  }
}
