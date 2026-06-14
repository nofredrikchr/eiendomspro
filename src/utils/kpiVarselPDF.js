// Varselbrev for KPI-regulering av husleie (husleieloven § 4-2).
// jspdf lastes dynamisk — holder biblioteket utenfor hovedbundelen til
// PDF faktisk genereres (samme mønster som kontraktPDF.js / export.js).

// ─── Formattering ─────────────────────────────────────────────────────────────
function datoLang(d) {
  if (!d) return '—';
  const dato = new Date(d);
  if (isNaN(dato)) return '—';
  return dato.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// jsPDF Helvetica mangler glyffer for U+00A0 (hardt mellomrom) og U+2212 (minus).
// Bruk vanlig mellomrom som tusenskille slik at beløp blir korrekt i PDF.
function kr(v) {
  if (v == null || isNaN(Number(v))) return '—';
  const n = Math.round(Number(v));
  const tall = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}kr ${tall},-`;
}

function txt(s) {
  return (s || '').toString();
}

/**
 * Genererer et profesjonelt varselbrev for KPI-regulering av husleie som PDF
 * og laster det ned. Følger husleieloven § 4-2: refererer paragrafen, viser
 * KPI-beregningen med henvisning til SSB, og at ny leie tidligst kan gjelde
 * én måned etter varsel.
 *
 * @param {object} data
 * @param {object} data.utleier      avsender { navn, adresse, postnummer, poststed, epost, tlf, orgnummer }
 * @param {object} data.leietaker    mottaker { navn, epost, tlf }
 * @param {string} data.adresse      leieobjektets adresse (én linje)
 * @param {number} data.gjeldendeLeie nåværende månedsleie
 * @param {number} data.nyLeie        ny månedsleie
 * @param {number} data.kpiProsent    KPI-endring i prosent
 * @param {string} [data.kpiKilde]    tekst som beskriver KPI-grunnlaget (fra/til-måned, SSB)
 * @param {Date|string} data.gjelderFra  dato ny leie gjelder fra
 */
export async function genererKpiVarselPDF({
  utleier = {},
  leietaker = {},
  adresse = '',
  gjeldendeLeie = 0,
  nyLeie = 0,
  kpiProsent = 0,
  kpiKilde = '',
  gjelderFra,
} = {}) {
  const { jsPDF } = await import('jspdf');

  const utleierNavn = txt(utleier.navn || 'Utleier');
  const leietakerNavn = txt(leietaker.navn || 'Leietaker');
  const okning = Math.round(Number(nyLeie) || 0) - Math.round(Number(gjeldendeLeie) || 0);
  const pst = (Number(kpiProsent) || 0).toFixed(1);
  const gjelderFraTekst = datoLang(gjelderFra);

  const doc = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true });

  // ─── Layout-konstanter ─────────────────────────────────────────
  const mL = 22;
  const mR = 188;
  const W = mR - mL;
  let y = 0;

  // ─── Palett (samme som kontrakt-PDF) ───────────────────────────
  const C = {
    svart:   [20, 20, 20],
    moerk:   [50, 50, 55],
    graa:    [120, 120, 130],
    lysgraa: [210, 210, 215],
    ramme:   [200, 200, 205],
    boks:    [248, 248, 250],
    navy:    [22, 40, 70],
  };

  const sf = (stil = 'normal', sz = 10) => { doc.setFont('helvetica', stil); doc.setFontSize(sz); };
  const sc = (rgb) => { doc.setTextColor(...rgb); };
  const dc = (rgb) => { doc.setDrawColor(...rgb); };
  const fc = (rgb) => { doc.setFillColor(...rgb); };

  // Tekstblokk med automatisk linjeskift
  function blokk(s, x = mL, width = W, stil = 'normal', sz = 10, farge = C.moerk, lineH = 5) {
    sf(stil, sz); sc(farge);
    const linjer = doc.splitTextToSize(txt(s), width);
    doc.text(linjer, x, y);
    y += linjer.length * lineH;
  }

  // ═══════════════════════════════════════════════════════════════
  // BREVHODE
  // ═══════════════════════════════════════════════════════════════

  // Tynn navy-strek øverst
  fc(C.navy); doc.rect(0, 0, 210, 1.5, 'F');

  // Ordmerke
  const gull = [201, 168, 76];
  sf('bold', 14); sc(C.navy);
  doc.text('Eiendoms', mL, 13);
  const wE = doc.getTextWidth('Eiendoms');
  sf('bold', 14); sc(gull);
  doc.text('PRO', mL + wE, 13);
  const wP = doc.getTextWidth('PRO');
  sf('normal', 9); sc(gull);
  doc.text('.no', mL + wE + wP, 13);

  // Dokumenttittel høyre
  sf('bold', 13); sc(C.navy);
  doc.text('VARSEL OM LEIEREGULERING', mR, 13, { align: 'right' });

  y = 22;
  dc(C.navy); doc.setLineWidth(0.5);
  doc.line(mL, y, mR, y);
  y = 30;

  // ─── Avsender / mottaker-boks ──────────────────────────────────
  const midX = mL + W / 2;
  const boksH = 34;
  fc(C.boks); dc(C.ramme);
  doc.setLineWidth(0.3);
  doc.roundedRect(mL, y, W, boksH, 2, 2, 'FD');
  dc(C.ramme);
  doc.line(midX, y + 4, midX, y + boksH - 4);

  sf('bold', 7); sc(C.graa);
  doc.text('FRA (UTLEIER)', mL + 5, y + 8);
  doc.text('TIL (LEIETAKER)', midX + 5, y + 8);

  sf('bold', 10); sc(C.svart);
  doc.text(utleierNavn, mL + 5, y + 14);
  doc.text(leietakerNavn, midX + 5, y + 14);

  sf('normal', 8.5); sc(C.moerk);
  let uY = y + 20;
  if (utleier.adresse) { doc.text(txt(`${utleier.adresse}, ${utleier.postnummer || ''} ${utleier.poststed || ''}`.trim()), mL + 5, uY); uY += 5; }
  if (utleier.epost) { doc.text(txt(utleier.epost), mL + 5, uY); uY += 5; }
  if (utleier.tlf) doc.text(txt(utleier.tlf), mL + 5, uY);

  let ltY = y + 20;
  if (leietaker.epost) { doc.text(txt(leietaker.epost), midX + 5, ltY); ltY += 5; }
  if (leietaker.tlf) doc.text(txt(leietaker.tlf), midX + 5, ltY);

  y += boksH + 6;

  // ─── Sted/dato + leieobjekt ────────────────────────────────────
  sf('normal', 9); sc(C.graa);
  doc.text(`Dato: ${datoLang(new Date().toISOString())}`, mL, y);
  if (adresse) doc.text(txt(`Gjelder: ${adresse}`), mR, y, { align: 'right' });
  y += 6;

  dc(C.navy); doc.setLineWidth(0.6);
  doc.line(mL, y, mR, y);
  y += 10;

  // ═══════════════════════════════════════════════════════════════
  // BREVTEKST
  // ═══════════════════════════════════════════════════════════════
  sf('bold', 13); sc(C.navy);
  doc.text('Varsel om regulering av husleie', mL, y);
  y += 8;

  blokk(`Hei ${leietakerNavn},`, mL, W, 'normal', 10, C.moerk);
  y += 3;

  blokk(
    `Vi varsler med dette om at husleien for ${adresse || 'leieobjektet'} reguleres i takt med ` +
    'endringen i konsumprisindeksen (KPI). Reguleringen skjer etter husleieloven § 4-2, som gir ' +
    'adgang til å justere leien i samsvar med endringen i konsumprisindeksen fra Statistisk sentralbyrå (SSB).',
    mL, W, 'normal', 10, C.moerk
  );
  y += 4;

  // ─── Beregnings-boks ───────────────────────────────────────────
  const beregnH = 40;
  fc(C.boks); dc(C.ramme);
  doc.setLineWidth(0.3);
  doc.roundedRect(mL, y, W, beregnH, 2, 2, 'FD');

  let by = y + 8;
  sf('bold', 7.5); sc(C.graa);
  doc.text('NÅVÆRENDE LEIE', mL + 6, by);
  doc.text('NY LEIE PER MÅNED', midX + 4, by);
  by += 6;
  sf('bold', 13); sc(C.svart);
  doc.text(kr(gjeldendeLeie), mL + 6, by);
  sf('bold', 13); sc(C.navy);
  doc.text(kr(nyLeie), midX + 4, by);

  by += 9;
  dc(C.lysgraa); doc.setLineWidth(0.25);
  doc.line(mL + 6, by, mR - 6, by);
  by += 6;
  sf('normal', 9); sc(C.moerk);
  doc.text(`KPI-endring: ${pst} %`, mL + 6, by);
  doc.text(`Økning: ${kr(okning)}/mnd  (${kr(okning * 12)}/år)`, midX + 4, by);

  y += beregnH + 6;

  // ─── KPI-grunnlag ──────────────────────────────────────────────
  blokk(
    `Ny leie er beregnet slik: nåværende leie ${kr(gjeldendeLeie)} × (1 + ${pst} %) = ${kr(nyLeie)}.` +
    (kpiKilde ? ` Grunnlag: ${kpiKilde}.` : '') +
    ' Tallene er hentet fra Statistisk sentralbyrå (SSB) sin konsumprisindeks, tilgjengelig på ssb.no/kpi.',
    mL, W, 'normal', 10, C.moerk
  );
  y += 4;

  blokk(
    `Den nye leien gjelder fra ${gjelderFraTekst}. Etter husleieloven § 4-2 kan ny leie tidligst ` +
    'tre i kraft én måned etter at dette varselet er mottatt, og leien kan reguleres med inntil ' +
    'én gang i året.',
    mL, W, 'normal', 10, C.moerk
  );
  y += 4;

  blokk(
    'Du trenger ikke å foreta deg noe. Fra datoen over betaler du den nye månedsleien til vanlig ' +
    'konto og forfall. Har du spørsmål til reguleringen, er det bare å ta kontakt.',
    mL, W, 'normal', 10, C.moerk
  );
  y += 6;

  blokk('Med vennlig hilsen', mL, W, 'normal', 10, C.moerk);
  y += 2;
  blokk(utleierNavn, mL, W, 'bold', 10, C.svart);

  // ═══════════════════════════════════════════════════════════════
  // SIDEFOT
  // ═══════════════════════════════════════════════════════════════
  const h = doc.internal.pageSize.getHeight();
  dc(C.lysgraa); doc.setLineWidth(0.3);
  doc.line(mL, h - 14, mR, h - 14);
  sf('normal', 7); sc(C.graa);
  doc.text('EiendomsPRO.no  ·  Varsel om leieregulering (husleieloven § 4-2)', mL, h - 9);
  doc.text(datoLang(new Date().toISOString()), mR, h - 9, { align: 'right' });

  // ─── Lagre ─────────────────────────────────────────────────────
  const filnavn = `Varsel-leieregulering-${leietakerNavn.replace(/\s+/g, '-')}.pdf`;
  doc.save(filnavn);
}
