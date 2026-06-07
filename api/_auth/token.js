import { randomBytes, createHash } from 'node:crypto';

/** Genererer et opakt, kryptografisk tilfeldig token (base64url, 256 bit). */
export function genererToken() {
  return randomBytes(32).toString('base64url');
}

/** SHA-256-hash (hex) av et token. Kun hashen lagres i DB — aldri tokenet selv. */
export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}
