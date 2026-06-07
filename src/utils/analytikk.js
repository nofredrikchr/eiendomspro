/**
 * Personvernvennlig hendelsessporing — provider-agnostisk.
 *
 * Standard: Plausible (cookieless, GDPR-vennlig, krever ingen samtykkebanner).
 * Skriptet lastes i index.html. Funksjonen er en no-op til en leverandør er
 * tilgjengelig, så den knekker aldri UI-et — trygg å kalle overalt.
 *
 * Bytte/legge til leverandør senere (Umami, PostHog) gjøres kun her.
 */
export function sporHendelse(navn, egenskaper) {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.plausible === 'function') {
      window.plausible(navn, egenskaper ? { props: egenskaper } : undefined);
    }
    // Umami:   window.umami?.track(navn, egenskaper);
    // PostHog: window.posthog?.capture(navn, egenskaper);
  } catch {
    /* La aldri analytics påvirke brukeropplevelsen */
  }
}

// Vanlige hendelsesnavn samlet ett sted (unngår skrivefeil i trakten)
export const HENDELSE = {
  registreringKlikk: 'Registrering: klikk',
  kalkulatorBrukt: 'Kalkulator: beregnet',
  kalkulatorTilRegistrering: 'Kalkulator: til registrering',
  guideLest: 'Guide: lest',
  prisCtaKlikk: 'Pris: CTA-klikk',
};
