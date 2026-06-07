/** Gyldige app-moduser (Airbnb-stil). Admin er IKKE en modus man kan bytte til. */
export const MODUSER = ['utleier', 'leietaker'];
export function gyldigModus(modus) {
  return MODUSER.includes(modus);
}

/** Admin = niva 3 (staff). Settes kun server-side / av annen admin. */
export function erAdmin(bruker) {
  return !!bruker && bruker.niva === 3;
}

/** Har brukeren en gitt rolle provisjonert? */
export function harRolle(roller, rolle) {
  return Array.isArray(roller) && roller.includes(rolle);
}

/**
 * Hvilken flate brukeren skal lande på: admin → 'admin'; ellers sist brukte
 * modus, så valgt primærrolle, til slutt 'utleier'. Null uten bruker.
 */
export function landingsModus(bruker) {
  if (!bruker) return null;
  if (bruker.niva === 3) return 'admin';
  return bruker.aktiv_modus || bruker.primary_rolle || 'utleier';
}
