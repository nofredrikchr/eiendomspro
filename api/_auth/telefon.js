/**
 * Normaliserer et telefonnummer til E.164 (+landskode + sifre).
 * Bare norske 8-sifrede nummer antas norske (+47). Returnerer null ved ugyldig.
 */
export function normaliserTelefon(input) {
  if (typeof input !== 'string') return null;
  let s = input.replace(/[\s\-().]/g, '');
  if (!s) return null;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) {
    const sifre = s.slice(1);
    return /^\d{8,15}$/.test(sifre) ? '+' + sifre : null;
  }
  if (/^\d{8}$/.test(s)) return '+47' + s;
  return null;
}
