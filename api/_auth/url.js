/**
 * Base-URL for lenker og OAuth-redirects. Bruker APP_URL-miljøvariabelen når
 * den er satt (anbefalt i prod — hindrer Host-header-injeksjon i e-postlenker
 * og redirect_uri). Fallback: https://<Host-header> (dagens oppførsel, nyttig
 * i preview-miljøer der URL-en varierer).
 */
export function appUrl(req) {
  const konfigurert = (process.env.APP_URL || '').trim();
  if (konfigurert) return konfigurert.replace(/\/+$/, '');
  return `https://${req?.headers?.host || ''}`;
}
