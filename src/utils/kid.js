/**
 * KID-nummer-generator — norsk betalingsstandard
 *
 * KID (KundeIDentifikasjon) brukes på alle norske faktura/giro-betalinger
 * slik at banken automatisk matcher innbetaling mot riktig faktura.
 *
 * Format vi bruker: [kontraktId-kort][fakturaNr][år][kontrollsiffer]
 * Maks 25 siffer (Nets-standard).
 *
 * Kontrollsiffer: MOD10 (Luhn) — brukes av de fleste norske banker og Nets.
 * Alternativt MOD11 for AvtaleGiro — eksportert separat.
 */

// ─── MOD10 (Luhn) kontrollsiffer ─────────────────────────────────────────────
export function mod10(tall) {
  const s = String(tall).replace(/\D/g, '');
  let sum = 0;
  let dobbel = false;
  for (let i = s.length - 1; i >= 0; i--) {
    let siffer = parseInt(s[i], 10);
    if (dobbel) {
      siffer *= 2;
      if (siffer > 9) siffer -= 9;
    }
    sum += siffer;
    dobbel = !dobbel;
  }
  const rest = sum % 10;
  return rest === 0 ? 0 : 10 - rest;
}

// ─── MOD11 kontrollsiffer (brukes av AvtaleGiro/Nets) ────────────────────────
export function mod11(tall) {
  const s = String(tall).replace(/\D/g, '');
  const vekter = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  let vektIdx = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    sum += parseInt(s[i], 10) * vekter[vektIdx % vekter.length];
    vektIdx++;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return 0;
  if (rest === 10) return null; // ugyldig kombinasjon — legg til padding og prøv igjen
  return rest;
}

// ─── Generer KID for en faktura ───────────────────────────────────────────────
/**
 * @param {string} kontraktId  - intern kontrakt-ID
 * @param {number} fakturaSeq  - løpende fakturanummer for denne kontrakten (1, 2, 3 ...)
 * @param {'mod10'|'mod11'} metode
 * @returns {string} KID-nummer klar til bruk på faktura
 *
 * Eksempel: kontrakt "abc123", faktura 7, år 2025 → "12307252025" + kontrollsiffer
 */
export function genererKID(kontraktId, fakturaSeq = 1, metode = 'mod10') {
  // Forkortet kontrakts-ID: siste 4 tegn av ID, kun tall via hash
  const idHash = hashId(kontraktId);           // 4 siffer
  const seq = String(fakturaSeq).padStart(3, '0'); // 3 siffer (001–999)
  const aar = String(new Date().getFullYear()).slice(2); // 2 siffer (25, 26 ...)

  const base = `${idHash}${seq}${aar}`;        // 9 siffer

  if (metode === 'mod11') {
    let kid = base;
    let kontroll = mod11(kid);
    // Hvis mod11 returnerer null (ugyldig), legg til en padding-null
    if (kontroll === null) {
      kid = `0${base}`;
      kontroll = mod11(kid);
    }
    return `${kid}${kontroll}`;
  }

  // Standard MOD10
  const kontroll = mod10(base);
  return `${base}${kontroll}`;
}

// ─── Formater KID for visning ─────────────────────────────────────────────────
export function formaterKID(kid) {
  // Grupper i par fra høyre: "1234 56 78 9"
  const s = String(kid).replace(/\D/g, '');
  return s.replace(/(.{1,4})(?=(.{2})+$)/g, '$1 ').trim();
}

// ─── Valider KID (MOD10) ──────────────────────────────────────────────────────
export function validerKID(kid) {
  const s = String(kid).replace(/\D/g, '');
  if (s.length < 2 || s.length > 25) return false;
  const base = s.slice(0, -1);
  const kontroll = parseInt(s.slice(-1), 10);
  return mod10(base) === kontroll;
}

// ─── Intern hjelpefunksjon: konverterer streng-ID til 4-sifret tall ──────────
function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) & 0xffff;
  }
  return String(h % 10000).padStart(4, '0');
}
