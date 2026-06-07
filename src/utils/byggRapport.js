/**
 * Samlet økonomiberegning per bygg — grunnlaget for alle rapporter.
 * Bruker samme konvensjoner som ByggSkjema (faste kostnader per mnd,
 * vedlikehold som % av leie, terminbeløp kalkulert eller manuelt).
 */
import { calcTerminbelop } from './format';

function n(v) { return Number(v) || 0; }

// ─── Full økonomi for ett bygg ────────────────────────────────────────────────
export function byggOkonomi(bygg, leieobjekter = []) {
  // Leieinntekt: fra leieinntekter-liste, ellers fra koblede leieobjekter
  const leieListe = bygg.leieinntekter || [];
  const leieFraListe = leieListe.reduce((s, l) => s + n(l.belop), 0);
  const leieFraObjekter = leieobjekter
    .filter((l) => l.byggId === bygg.id)
    .reduce((s, l) => s + n(l.forventetLeie), 0);
  const bruttoMnd = leieFraListe > 0 ? leieFraListe : leieFraObjekter;
  const bruttoAar = bruttoMnd * 12;

  // Lån
  const terminMnd = bygg.laanModus === 'kalkulert'
    ? calcTerminbelop(n(bygg.laanebelop), n(bygg.rentesats), n(bygg.nedbetalingstid))
    : n(bygg.terminbelop);
  const renterMnd = n(bygg.laanebelop) * (n(bygg.rentesats) / 100 / 12);
  const avdragMnd = terminMnd > 0 ? Math.max(0, terminMnd - renterMnd) : 0;

  // Driftskostnader (per mnd)
  const stromMnd = bygg.leieInkludererStrom ? n(bygg.forventetStromMnd) : n(bygg.strom);
  const tilleggMnd = (bygg.tilleggskostnader || []).reduce((s, t) => s + n(t.belop), 0);
  const vedlikeholdMnd = bruttoMnd * (n(bygg.vedlikeholdProsent || 3) / 100);

  const kostnader = {
    kommunale:    n(bygg.kommunaleAvgifter),
    forsikring:   n(bygg.husforsikring),
    internett:    n(bygg.internett),
    alarm:        n(bygg.alarm),
    strom:        stromMnd,
    vedlikehold:  vedlikeholdMnd,
    regnskapsforer: n(bygg.regnskapsforer),
    styrehonorar: n(bygg.styrehonorar),
    annet:        tilleggMnd,
  };
  const driftMnd = Object.values(kostnader).reduce((s, v) => s + v, 0);
  const driftAar = driftMnd * 12;

  // NOI (netto driftsresultat før lån)
  const noiMnd = bruttoMnd - driftMnd;
  const noiAar = noiMnd * 12;

  // Kontantstrøm (etter lån)
  const kontantstromMnd = noiMnd - terminMnd;
  const kontantstromAar = kontantstromMnd * 12;

  // Investering og verdi
  const kjoepesum = n(bygg.kjoepesum);
  const oppussing = n(bygg.oppussing);
  const totalInvestering = kjoepesum + oppussing;
  const nyTakst = n(bygg.nyTakst);
  const verdi = nyTakst > 0 ? nyTakst : (totalInvestering || kjoepesum);
  const gjeld = n(bygg.laanebelop);
  const egenkapital = verdi - gjeld;
  const verdiskapt = nyTakst > 0 ? nyTakst - totalInvestering : 0;

  // Nøkkeltall
  const bruttoYield = totalInvestering > 0 ? (bruttoAar / totalInvestering) * 100 : 0;
  const nettoYield = totalInvestering > 0 ? (noiAar / totalInvestering) * 100 : 0;
  const ltv = verdi > 0 ? (gjeld / verdi) * 100 : 0;
  const roe = egenkapital > 0 ? (kontantstromAar / egenkapital) * 100 : 0;
  const innvestertEK = Math.max(0, totalInvestering - gjeld);
  const cashOnCash = innvestertEK > 0 ? (kontantstromAar / innvestertEK) * 100 : 0;

  return {
    id: bygg.id,
    navn: `${bygg.gatenavn} ${bygg.gatenummer}`.trim(),
    poststed: bygg.poststed,
    skattmodus: bygg.skattemodus || 'privat',
    eierId: bygg.eierId || null,
    bruttoMnd, bruttoAar,
    terminMnd, renterMnd, avdragMnd,
    kostnader, driftMnd, driftAar,
    noiMnd, noiAar,
    kontantstromMnd, kontantstromAar,
    kjoepesum, oppussing, totalInvestering, nyTakst, verdi, gjeld, egenkapital, verdiskapt, innvestertEK,
    bruttoYield, nettoYield, ltv, roe, cashOnCash,
  };
}

// ─── 10-års prognose for ett bygg ─────────────────────────────────────────────
export function byggPrognose(bygg, leieobjekter = [], aar = 10) {
  const o = byggOkonomi(bygg, leieobjekter);
  const verdivekst = n(bygg.verdistigning || 4) / 100;
  const leievekst = n(bygg.pristigningLeie || 1.5) / 100;
  const kostvekst = n(bygg.pristigningKostnader || 1.5) / 100;
  const rente = n(bygg.rentesats) / 100 / 12;
  const nMnd = n(bygg.nedbetalingstid || 25) * 12;
  const lan = n(bygg.laanebelop);

  const rader = [];
  for (let i = 1; i <= aar; i++) {
    const verdi = o.verdi * Math.pow(1 + verdivekst, i);
    const brutto = o.bruttoAar * Math.pow(1 + leievekst, i);
    const drift = o.driftAar * Math.pow(1 + kostvekst, i);
    // Restgjeld (annuitet)
    const restGjeld = rente > 0 && nMnd > 0
      ? lan * (Math.pow(1 + rente, nMnd) - Math.pow(1 + rente, i * 12)) / (Math.pow(1 + rente, nMnd) - 1)
      : Math.max(0, lan - o.avdragMnd * 12 * i);
    const ek = verdi - Math.max(0, restGjeld);
    rader.push({
      aar: i, verdi, brutto, drift,
      noi: brutto - drift,
      restGjeld: Math.max(0, restGjeld),
      egenkapital: ek,
    });
  }
  return rader;
}

// ─── Aggreger flere bygg ──────────────────────────────────────────────────────
export function aggreger(byggOkonomiListe) {
  const sum = (f) => byggOkonomiListe.reduce((s, b) => s + b[f], 0);
  const totalInvestering = sum('totalInvestering');
  const bruttoAar = sum('bruttoAar');
  const noiAar = sum('noiAar');
  const verdi = sum('verdi');
  const gjeld = sum('gjeld');
  return {
    antall: byggOkonomiListe.length,
    bruttoMnd: sum('bruttoMnd'), bruttoAar,
    driftAar: sum('driftAar'),
    noiAar,
    kontantstromMnd: sum('kontantstromMnd'), kontantstromAar: sum('kontantstromAar'),
    totalInvestering, verdi, gjeld,
    egenkapital: verdi - gjeld,
    bruttoYield: totalInvestering > 0 ? (bruttoAar / totalInvestering) * 100 : 0,
    nettoYield: totalInvestering > 0 ? (noiAar / totalInvestering) * 100 : 0,
    ltv: verdi > 0 ? (gjeld / verdi) * 100 : 0,
  };
}

export const DRIFT_LABELS = {
  kommunale: 'Kommunale avgifter',
  forsikring: 'Forsikring',
  internett: 'Internett',
  alarm: 'Alarm',
  strom: 'Strøm',
  vedlikehold: 'Vedlikehold (avsatt)',
  regnskapsforer: 'Regnskapsfører',
  styrehonorar: 'Styrehonorar',
  annet: 'Andre kostnader',
};
