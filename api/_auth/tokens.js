/**
 * Engangs-tokens (e-postverifisering, passord-reset). Lagrer kun SHA-256-hash
 * av tokenet i engangs_tokens (fra migrasjon 001). Tokens er engangsbruk + utløper.
 */
import { sql } from '../_db.js';
import { genererToken, hashToken } from './token.js';

export async function lagEngangsToken(brukerId, type, levetidMin) {
  const token = genererToken();
  await sql`
    insert into engangs_tokens (bruker_id, type, token_hash, utloper)
    values (${brukerId}, ${type}, ${hashToken(token)}, now() + (${levetidMin} || ' minutes')::interval)`;
  return token;
}

/**
 * Validerer + forbruker et token. Returnerer bruker_id hvis gyldig (rett type,
 * ubrukt, ikke utløpt), ellers null. Markerer det som brukt atomisk.
 */
export async function brukEngangsToken(token, type) {
  if (!token) return null;
  const rader = await sql`
    update engangs_tokens set brukt = now()
    where token_hash = ${hashToken(token)} and type = ${type} and brukt is null and utloper > now()
    returning bruker_id`;
  return rader[0]?.bruker_id ?? null;
}
