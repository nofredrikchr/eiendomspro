/**
 * Leietaker-token — gir leietaker tilgang til sin egen portal uten innlogging.
 *
 * Token genereres deterministisk fra kontrakt-ID + salt, slik at:
 *  - Eksisterende kontrakter får token uten migrering
 *  - Samme kontrakt gir alltid samme lenke
 *  - Token er ikke trivielt å gjette
 *
 * Modell tilsvarer Hybel: utleier deler en unik lenke, leietaker åpner
 * portalen sin direkte. (BankID-innlogging kan legges på senere via Signicat.)
 */

const SALT = 'eiendomspro_lt_v1';

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function genererLeietakerToken(kontraktId) {
  if (!kontraktId) return '';
  const a = hash(kontraktId + SALT).toString(36);
  const b = hash(SALT + kontraktId).toString(36);
  return `${a}${b}`.padStart(12, '0');
}

export function finnKontraktFraToken(token, kontrakter) {
  if (!token) return null;
  return kontrakter.find((k) => genererLeietakerToken(k.id) === token) || null;
}

export function leietakerLenke(kontraktId) {
  return `${window.location.origin}/leietaker/${genererLeietakerToken(kontraktId)}`;
}
