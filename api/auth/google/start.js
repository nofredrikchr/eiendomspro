/** GET /api/auth/google/start — start Google-innlogging (redirect til samtykke). */
import { googleKonfigurert, googleConfig, byggGoogleAuthUrl } from '../../_auth/google.js';
import { genererToken } from '../../_auth/token.js';

export default function handler(req, res) {
  if (!googleKonfigurert()) {
    res.statusCode = 302;
    res.setHeader('Location', '/login?feil=google_ikke_konfigurert');
    return res.end();
  }
  const state = genererToken();
  const redirectUri = `https://${req.headers.host}/api/auth/google/callback`;
  const url = byggGoogleAuthUrl({ clientId: googleConfig().clientId, redirectUri, state });
  res.setHeader('Set-Cookie', `epro_oauth_state=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`);
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
}
