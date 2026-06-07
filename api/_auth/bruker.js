import { erAdmin } from './roller.js';

/**
 * Former en trygg, offentlig representasjon av en bruker-rad. Stripper bort
 * passord_hash og alt annet sensitivt — dette er det eneste bruker-objektet
 * som skal sendes til klienten.
 */
export function offentligBruker(rad, roller = []) {
  if (!rad) return null;
  return {
    id: rad.id,
    epost: rad.epost ?? null,
    telefon: rad.telefon ?? null,
    fulltNavn: rad.fullt_navn,
    niva: rad.niva,
    primaryRolle: rad.primary_rolle ?? null,
    aktivModus: rad.aktiv_modus ?? null,
    epostVerifisert: !!rad.epost_verifisert,
    telefonVerifisert: !!rad.telefon_verifisert,
    roller: Array.isArray(roller) ? roller : [],
    erAdmin: erAdmin(rad),
  };
}
