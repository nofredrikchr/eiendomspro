/** GET /api/auth/google/callback — bytt code mot bruker, opprett sesjon, redirect. */
import { googleKonfigurert, hentGoogleBruker } from '../../_auth/google.js';
import { finnEllerOpprettGoogleBruker, opprettSesjon } from '../../_auth/index.js';
import { byggSesjonsCookie, parseCookies } from '../../_auth/cookie.js';
import { appUrl } from '../../_auth/url.js';

const SLETT_STATE = 'epro_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

function redirect(res, location, cookies = []) {
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
}

export default async function handler(req, res) {
  if (!googleKonfigurert()) return redirect(res, '/login?feil=google_ikke_konfigurert');
  const { code, state } = req.query ?? {};
  const stateCookie = parseCookies(req.headers?.cookie)['epro_oauth_state'];
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirect(res, '/login?feil=google_state', [SLETT_STATE]);
  }
  try {
    const redirectUri = `${appUrl(req)}/api/auth/google/callback`;
    const g = await hentGoogleBruker({ code, redirectUri });
    const resultat = await finnEllerOpprettGoogleBruker({
      sub: g.sub,
      epost: g.epost,
      navn: g.navn,
      epostVerifisert: g.epostVerifisert,
    });
    // null = Google har ikke verifisert e-posten → avvis (kontoovertakelses-vern).
    if (!resultat) return redirect(res, '/login?feil=google_epost', [SLETT_STATE]);
    const { bruker } = resultat;
    const token = await opprettSesjon(bruker.id, {
      ip: (req.headers['x-forwarded-for'] || '').split(',')[0] || null,
      userAgent: req.headers['user-agent'] || null,
    });
    return redirect(res, '/app', [byggSesjonsCookie(token), SLETT_STATE]);
  } catch {
    return redirect(res, '/login?feil=google', [SLETT_STATE]);
  }
}
