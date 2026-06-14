/**
 * Trygg lesing/skriving av rene UI-preferanser i localStorage.
 *
 * KUN for UI-preferanser (åpne seksjoner, avviste bannere o.l.) — ALDRI for
 * ekte appdata; den ligger eier-scopet i Neon via /api. localStorage kan kaste
 * (privat modus, blokkerte cookies), så alt pakkes i try/catch og degraderer
 * stille til standardverdien.
 */

const PREFIKS = 'eiendomspro_ui_';

/** Les en UI-pref (JSON-parset). Returnerer `standard` ved manglende/ugyldig verdi. */
export function lesPref(nokkel, standard) {
  try {
    const rå = localStorage.getItem(PREFIKS + nokkel);
    if (rå === null) return standard;
    return JSON.parse(rå);
  } catch {
    return standard;
  }
}

/** Skriv en UI-pref (JSON-serialisert). Stille no-op hvis localStorage ikke er tilgjengelig. */
export function settPref(nokkel, verdi) {
  try {
    localStorage.setItem(PREFIKS + nokkel, JSON.stringify(verdi));
  } catch {
    // Ignorer — UI-preferanser er ikke kritiske.
  }
}
