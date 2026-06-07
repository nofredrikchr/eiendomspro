/**
 * Google OAuth (OIDC, Authorization Code). Hemmeligheter server-side.
 * Dormant til GOOGLE_CLIENT_ID/SECRET er satt i Vercel-miljøet.
 */
export function googleConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
  };
}

export function googleKonfigurert() {
  const c = googleConfig();
  return !!(c.clientId && c.clientSecret);
}

/** Pure: bygger Googles samtykke-URL. */
export function byggGoogleAuthUrl({ clientId, redirectUri, state }) {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

/** Bytter authorization code mot tokens, henter brukerinfo (sub, email, navn). */
export async function hentGoogleBruker({ code, redirectUri }) {
  const c = googleConfig();
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenResp.ok) throw new Error(`Google token-feil: ${tokenResp.status}`);
  const { access_token } = await tokenResp.json();
  const infoResp = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!infoResp.ok) throw new Error(`Google userinfo-feil: ${infoResp.status}`);
  const info = await infoResp.json();
  return { sub: info.sub, epost: info.email, epostVerifisert: !!info.email_verified, navn: info.name || info.email };
}
