/**
 * Skatteberegning for utleie — norske regler (2025)
 *
 * For skattepliktig utleie av sekundærbolig:
 *   Brutto leieinntekt
 *   − Fradragsberettigede driftskostnader (kommunale avg, forsikring, vedlikehold, m.m.)
 *   = Netto utleieresultat  → skattepliktig (22 %)
 *   − Gjeldsrenter (fradragsberettiget mot alminnelig inntekt, 22 %)
 *   = Skattepliktig resultat etter renter
 *
 * Tall rapporteres i skattemeldingen (skjema RF-1159 for fast eiendom).
 * Sats: 22 % på netto (2025).
 *
 * Driftskostnader i byggmodellen er PER MÅNED (jf. ByggSkjema), unntatt
 * vedlikehold som er en prosent av brutto leie.
 */

const SKATTESATS = 0.22;

function n(v) { return Number(v) || 0; }

// ─── Årlig rente (estimat) ────────────────────────────────────────────────────
function aarligRenteEstimat(bygg) {
  // Førsteårs renteandel ≈ lånebeløp × rentesats. Synker over tid; brukes som estimat.
  if (bygg.laanModus === 'manuell') {
    // Manuell: anslå renter som ~70 % av terminbeløp første år
    return n(bygg.terminbelop) * 12 * 0.7;
  }
  return n(bygg.laanebelop) * (n(bygg.rentesats) / 100);
}

// ─── Skatt for ett bygg ───────────────────────────────────────────────────────
export function beregnSkattForBygg(bygg, leieobjekter = [], år, basisÅr) {
  // Brutto månedsleie: fra leieinntekter-liste, ellers fra leieobjekter
  const leieListe = bygg.leieinntekter || [];
  const leieFraListe = leieListe.reduce((s, l) => s + n(l.belop), 0);
  const leieFraObjekter = leieobjekter
    .filter((l) => l.byggId === bygg.id)
    .reduce((s, l) => s + n(l.forventetLeie), 0);
  let bruttoMnd = leieFraListe > 0 ? leieFraListe : leieFraObjekter;

  // Prognose-justering for valgt år (sammensatt pristigning)
  const diff = (år || basisÅr) - basisÅr;
  const leieVekst = Math.pow(1 + n(bygg.pristigningLeie || 1.5) / 100, diff);
  const kostVekst = Math.pow(1 + n(bygg.pristigningKostnader || 1.5) / 100, diff);
  bruttoMnd *= leieVekst;

  const bruttoLeie = bruttoMnd * 12;

  // Driftskostnader (per mnd → år), justert for prognoseår
  const stromMnd = bygg.leieInkludererStrom ? n(bygg.forventetStromMnd) : n(bygg.strom);
  const tilleggMnd = (bygg.tilleggskostnader || []).reduce((s, t) => s + n(t.belop), 0);

  // Vedlikehold: bruk faktiske, fradragsberettigede vedlikeholdskostnader fra
  // oppussingspostene hvis slike er registrert — ellers prosentavsetning av leie.
  const faktiskVedlikehold = (bygg.oppussingsposter || [])
    .filter((p) => p.type === 'vedlikehold')
    .reduce((s, p) => s + n(p.faktisk), 0);
  const vedlikehold = faktiskVedlikehold > 0
    ? faktiskVedlikehold
    : bruttoLeie * (n(bygg.vedlikeholdProsent || 3) / 100);

  const driftskostnader = {
    kommunale:    n(bygg.kommunaleAvgifter) * 12 * kostVekst,
    forsikring:   n(bygg.husforsikring) * 12 * kostVekst,
    internett:    n(bygg.internett) * 12 * kostVekst,
    alarm:        n(bygg.alarm) * 12 * kostVekst,
    strom:        stromMnd * 12 * kostVekst,
    vedlikehold,
    annet:        tilleggMnd * 12 * kostVekst,
    styrehonorar: n(bygg.styrehonorar) * kostVekst,
  };

  const sumDrift = Object.values(driftskostnader).reduce((s, v) => s + v, 0);
  const nettoResultat = bruttoLeie - sumDrift;

  const gjeldsrenter = aarligRenteEstimat(bygg);
  const skattepliktigEtterRenter = nettoResultat - gjeldsrenter;

  const skattmodus = bygg.skattemodus || 'privat';
  const skattUtleie = Math.max(0, nettoResultat) * SKATTESATS;
  const skattEtterRenter = Math.max(0, skattepliktigEtterRenter) * SKATTESATS;

  return {
    byggId: bygg.id,
    navn: `${bygg.gatenavn} ${bygg.gatenummer}`,
    skattmodus,
    bruttoLeie,
    driftskostnader,
    sumDrift,
    nettoResultat,
    gjeldsrenter,
    skattepliktigEtterRenter,
    skattUtleie,
    skattEtterRenter,
    skattesats: SKATTESATS,
  };
}

// ─── Samlet for hele porteføljen ──────────────────────────────────────────────
export function beregnSkattSamlet(byggListe, leieobjekter, år, basisÅr) {
  const perBygg = byggListe.map((b) => beregnSkattForBygg(b, leieobjekter, år, basisÅr));
  const sum = (felt) => perBygg.reduce((s, b) => s + b[felt], 0);
  return {
    perBygg,
    bruttoLeie: sum('bruttoLeie'),
    sumDrift: sum('sumDrift'),
    nettoResultat: sum('nettoResultat'),
    gjeldsrenter: sum('gjeldsrenter'),
    skattepliktigEtterRenter: sum('skattepliktigEtterRenter'),
    skattUtleie: sum('skattUtleie'),
    skattEtterRenter: sum('skattEtterRenter'),
  };
}

export const KOSTNAD_LABELS = {
  kommunale: 'Kommunale avgifter',
  forsikring: 'Husforsikring',
  internett: 'Internett',
  alarm: 'Alarm',
  strom: 'Strøm (utleiers andel)',
  vedlikehold: 'Avsatt vedlikehold',
  annet: 'Andre driftskostnader',
  styrehonorar: 'Styrehonorar',
};
