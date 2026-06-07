/** POST /api/auth/logout — revoker gjeldende sesjon og slett cookie. */
import { slettSesjonViaToken } from '../_auth/index.js';
import { parseCookies, byggSlettCookie, SESJON_COOKIE } from '../_auth/cookie.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: { generelt: 'Metode ikke tillatt.' } });
  }
  try {
    const token = parseCookies(req.headers?.cookie)[SESJON_COOKIE];
    await slettSesjonViaToken(token);
  } catch {
    /* logg ut skal aldri feile for brukeren */
  }
  res.setHeader('Set-Cookie', byggSlettCookie());
  return res.status(200).json({ ok: true });
}
