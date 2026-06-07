import { hash, verify } from '@node-rs/argon2';

// argon2id med fornuftige standardparametre. Saltet genereres internt per hash.
const OPSJONER = { algorithm: 2 /* argon2id */, memoryCost: 19456, timeCost: 2, parallelism: 1 };

/** Hasher et passord med argon2id. Returnerer en selvbeskrivende $argon2id$-streng. */
export function hashPassord(klartekst) {
  return hash(String(klartekst), OPSJONER);
}

/** Verifiserer et passord mot en lagret hash. Returnerer boolean (kaster aldri på feil match). */
export async function verifyPassord(lagretHash, klartekst) {
  try {
    return await verify(lagretHash, String(klartekst));
  } catch {
    return false;
  }
}
