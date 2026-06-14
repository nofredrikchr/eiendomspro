/**
 * Forhåndsberegnet DEMO-eiendom for verdidrevet onboarding.
 *
 * Vises til nye brukere uten bygg, FØR de bes om å legge inn egne data. Alle
 * tall er statiske og illustrative — dette er en read-only visning. Det skrives
 * ALDRI til DB eller localStorage, og det kalles ingen /api herfra.
 *
 * Tallene er bevisst realistiske for en liten norsk utleiebolig, slik at den
 * nye brukeren raskt skjønner hvilken innsikt EiendomsPRO gir.
 */

export const DEMO_EIENDOM = {
  adresse: 'Storgata 14',
  poststed: '0182 Oslo',
  type: 'Toroms leilighet',
  areal: 58, // m²

  // Investering
  kjoepesum: 3_900_000,
  oppussing: 250_000,

  // Inntekt
  leieInntektMnd: 17_500,

  // Månedlige kostnader
  terminbelop: 11_200, // lån, annuitet
  kommunaleAvgifter: 1_100,
  husforsikring: 480,
  vedlikeholdMnd: 525, // 3 % av leien, satt av månedlig
};

// ─── Avledede nøkkeltall (forhåndsberegnet, ingen brukerinput) ──────────────
const totalInvestering = DEMO_EIENDOM.kjoepesum + DEMO_EIENDOM.oppussing;
const fasteKostnaderMnd =
  DEMO_EIENDOM.terminbelop +
  DEMO_EIENDOM.kommunaleAvgifter +
  DEMO_EIENDOM.husforsikring +
  DEMO_EIENDOM.vedlikeholdMnd;
const nettoMnd = DEMO_EIENDOM.leieInntektMnd - fasteKostnaderMnd;
const nettoAar = nettoMnd * 12;
const bruttoYield = (DEMO_EIENDOM.leieInntektMnd * 12 / totalInvestering) * 100;

// Forenklet skattebilde: netto leieinntekt skattlegges som kapitalinntekt (22 %).
// Rein illustrasjon — ikke skatteråd.
const SKATTESATS = 0.22;
const skattAar = Math.max(0, nettoAar) * SKATTESATS;
const nettoEtterSkattAar = nettoAar - skattAar;

export const DEMO_NOKKELTALL = {
  totalInvestering,
  leieInntektMnd: DEMO_EIENDOM.leieInntektMnd,
  fasteKostnaderMnd,
  nettoMnd,
  nettoAar,
  bruttoYield,
  skattesats: SKATTESATS,
  skattAar,
  nettoEtterSkattAar,
};

// ─── Data til grafen: inntekt vs. kostnad vs. netto (per måned) ─────────────
export const DEMO_GRAFDATA = [
  { navn: 'Leieinntekt', belop: DEMO_EIENDOM.leieInntektMnd },
  { navn: 'Kostnader', belop: fasteKostnaderMnd },
  { navn: 'Netto', belop: nettoMnd },
];

// Spesifikasjon av de månedlige kostnadene (til en liten oversikt).
export const DEMO_KOSTNADER = [
  { navn: 'Lån (termin)', belop: DEMO_EIENDOM.terminbelop },
  { navn: 'Kommunale avgifter', belop: DEMO_EIENDOM.kommunaleAvgifter },
  { navn: 'Husforsikring', belop: DEMO_EIENDOM.husforsikring },
  { navn: 'Avsatt vedlikehold', belop: DEMO_EIENDOM.vedlikeholdMnd },
];
