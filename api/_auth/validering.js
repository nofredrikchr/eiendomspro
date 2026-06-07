import { normaliserTelefon } from './telefon.js';

const EPOST_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSORD = 8;
const ROLLER = ['utleier', 'leietaker'];

function renEpost(v) {
  return typeof v === 'string' && v.trim() ? v.trim().toLowerCase() : null;
}

/**
 * Validerer registreringsdata. Returnerer { ok, feil, verdier } der verdier er
 * normaliserte felter (epost lowercased, telefon i E.164).
 */
export function validerRegistrering(data = {}) {
  const feil = {};
  const epost = renEpost(data.epost);
  const telefon = data.telefon ? normaliserTelefon(data.telefon) : null;
  const fulltNavn = typeof data.fulltNavn === 'string' ? data.fulltNavn.trim() : '';
  const passord = typeof data.passord === 'string' ? data.passord : '';
  const primaryRolle = data.primaryRolle;

  if (data.epost && !epost) feil.epost = 'Ugyldig e-postadresse.';
  else if (epost && !EPOST_RE.test(epost)) feil.epost = 'Ugyldig e-postadresse.';
  if (data.telefon && !telefon) feil.telefon = 'Ugyldig telefonnummer.';
  if (!epost && !telefon) feil.kontakt = 'Oppgi e-post eller telefon.';
  if (passord.length < MIN_PASSORD) feil.passord = `Passord må være minst ${MIN_PASSORD} tegn.`;
  if (!fulltNavn) feil.fulltNavn = 'Oppgi fullt navn.';
  if (!ROLLER.includes(primaryRolle)) feil.primaryRolle = 'Velg om du primært er utleier eller leietaker.';

  return {
    ok: Object.keys(feil).length === 0,
    feil,
    verdier: { epost, telefon, passord, fulltNavn, primaryRolle },
  };
}

/**
 * Validerer innloggingsdata. Tolker identifikator som e-post (har @) eller telefon.
 * Returnerer { ok, feil, verdier: { epost, telefon, passord } }.
 */
export function validerInnlogging(data = {}) {
  const feil = {};
  const raw = typeof data.identifikator === 'string' ? data.identifikator.trim() : '';
  const passord = typeof data.passord === 'string' ? data.passord : '';
  let epost = null;
  let telefon = null;

  if (!raw) {
    feil.identifikator = 'Oppgi e-post eller telefon.';
  } else if (raw.includes('@')) {
    epost = renEpost(raw);
    if (!epost || !EPOST_RE.test(epost)) feil.identifikator = 'Ugyldig e-postadresse.';
  } else {
    telefon = normaliserTelefon(raw);
    if (!telefon) feil.identifikator = 'Ugyldig telefonnummer.';
  }
  if (!passord) feil.passord = 'Oppgi passord.';

  return { ok: Object.keys(feil).length === 0, feil, verdier: { epost, telefon, passord } };
}
