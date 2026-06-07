export const SESJON_COOKIE = 'epro_sesjon';

/** Bygger en sikker Set-Cookie-streng for sesjonstokenet. */
export function byggSesjonsCookie(token, maxAgeSekunder = 60 * 60 * 24 * 30) {
  return [
    `${SESJON_COOKIE}=${token}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAgeSekunder}`,
  ].join('; ');
}

/** Bygger en Set-Cookie-streng som sletter sesjonstokenet umiddelbart. */
export function byggSlettCookie() {
  return `${SESJON_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

/** Parser en Cookie-header til et { navn: verdi }-objekt. */
export function parseCookies(header) {
  const ut = {};
  if (!header || typeof header !== 'string') return ut;
  for (const del of header.split(';')) {
    const i = del.indexOf('=');
    if (i === -1) continue;
    const navn = del.slice(0, i).trim();
    const verdi = del.slice(i + 1).trim();
    if (navn) ut[navn] = verdi;
  }
  return ut;
}
