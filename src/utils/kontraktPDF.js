// jspdf lastes dynamisk i genererKontraktPDF — holder biblioteket
// utenfor hovedbundelen til PDF faktisk genereres.

// ─── Formattering ─────────────────────────────────────────────────────────────
function datoFmt(d) {
  if (!d) return '—';
  const dato = new Date(d);
  if (isNaN(dato)) return '—';
  return dato.toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function datoLang(d) {
  if (!d) return '—';
  const dato = new Date(d);
  if (isNaN(dato)) return '—';
  return dato.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}
function kr(v) {
  if (!v && v !== 0) return '—';
  return `kr ${Number(v).toLocaleString('nb-NO')},-`;
}

// Norsk tekst — jsPDF Helvetica haandterer iso-latin korrekt med latin1
function txt(s) {
  return (s || '').toString();
}

// ─── Last logo som PNG dataURL via canvas ────────────────────────────────────
function lastLogo(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Render 4× for skarphet
      canvas.width = img.naturalWidth * 4 || 640;
      canvas.height = img.naturalHeight * 4 || 160;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── PDF-generator (async pga. bilde-lasting) ────────────────────────────────
export async function genererKontraktPDF({ kontrakt, leieobjekt, bygg, utleier }) {
  const { jsPDF } = await import('jspdf');
  const u = utleier || {};
  const utleierNavn = txt(u.navn || 'Utleier');
  const utleierKonto = u.kontonummer || kontrakt.kontonummer || '';

  const doc = new jsPDF({ unit: 'mm', format: 'a4', putOnlyUsedFonts: true });

  // ─── Layout-konstanter ─────────────────────────────────────────
  const mL = 22;          // venstre margin
  const mR = 188;         // høyre margin
  const W = mR - mL;      // tekstbredde (166 mm)
  const midX = mL + W / 2;
  let y = 0;

  // ─── Palett ────────────────────────────────────────────────────
  const C = {
    svart:    [20, 20, 20],
    moerk:    [50, 50, 55],
    graa:     [120, 120, 130],
    lysgraa:  [210, 210, 215],
    ramme:    [200, 200, 205],
    boks:     [248, 248, 250],
    hvit:     [255, 255, 255],
    navy:     [22, 40, 70],
    guld:     [165, 125, 35],
  };

  // ─── Hjelp-funksjoner ──────────────────────────────────────────
  const sf = (stil = 'normal', sz = 10) => { doc.setFont('helvetica', stil); doc.setFontSize(sz); };
  const sc = (rgb) => { doc.setTextColor(...rgb); };
  const dc = (rgb) => { doc.setDrawColor(...rgb); };
  const fc = (rgb) => { doc.setFillColor(...rgb); };

  function hLinje(x1 = mL, x2 = mR, tykkelse = 0.25, farge = C.lysgraa) {
    dc(farge); doc.setLineWidth(tykkelse);
    doc.line(x1, y, x2, y);
    y += 1;
  }

  function avstand(mm = 4) { y += mm; }

  // Tekstblokk med automatisk linjeskift
  function tekst(s, x, width, stil = 'normal', sz = 9.5, farge = C.moerk) {
    sf(stil, sz); sc(farge);
    const linjer = doc.splitTextToSize(txt(s), width);
    doc.text(linjer, x, y);
    return linjer.length;
  }

  function blokk(s, x = mL, width = W, stil = 'normal', sz = 9.5, farge = C.moerk) {
    const linjer = tekst(s, x, width, stil, sz, farge);
    y += linjer * (sz * 0.38) + 3;
  }

  // Etikett + verdi på en rad (to kolonner)
  function rad(etikett, verdi, bold = false) {
    sf('normal', 7.5); sc(C.graa);
    doc.text(txt(etikett), mL, y);
    sf(bold ? 'bold' : 'normal', 9.5); sc(C.svart);
    const linjer = doc.splitTextToSize(txt(verdi || '—'), W - 55);
    doc.text(linjer, mL + 55, y);
    y += Math.max(6, linjer.length * 4.8);
  }

  // To kolonner side om side
  function toKol(e1, v1, e2, v2) {
    sf('normal', 7.5); sc(C.graa);
    doc.text(txt(e1), mL, y);
    if (e2) doc.text(txt(e2), midX + 2, y);
    y += 3.5;
    sf('normal', 9.5); sc(C.svart);
    doc.text(txt(v1 || '—'), mL, y);
    if (e2) doc.text(txt(v2 || '—'), midX + 2, y);
    y += 6;
  }

  // Seksjonstittel: bold med tynn skillelinje under
  function seksjon(nr, tittel) {
    avstand(6);
    sjekkSideskift(25);
    sf('bold', 11); sc(C.navy);
    doc.text(`§ ${nr}  ${tittel.toUpperCase()}`, mL, y);
    y += 2;
    hLinje(mL, mR, 0.4, C.navy);
    avstand(3);
  }

  function italics(s) {
    blokk(s, mL, W, 'italic', 8.5, C.graa);
  }

  function paragraf(s) {
    blokk(s, mL, W, 'normal', 9, C.moerk);
  }

  // ─── Sidefot + sidehode ────────────────────────────────────────
  function leggTilSideHode(side) {
    doc.setPage(side);
    if (side > 1) {
      // Tynn navy-strek øverst
      fc(C.navy); doc.rect(0, 0, 210, 1, 'F');
      // Kontekstlinje
      dc(C.lysgraa); doc.setLineWidth(0.25);
      doc.line(mL, 8, mR, 8);
      sf('normal', 7); sc(C.graa);
      doc.text('LEIEKONTRAKT', mL, 6);
      doc.text(txt(`${kontrakt.leietakerNavn || ''} – ${bygg?.gatenavn || ''} ${bygg?.gatenummer || ''}`), 105, 6, { align: 'center' });
      doc.text(`Side ${side}`, mR, 6, { align: 'right' });
    }
  }

  function nyeSide() {
    doc.addPage();
    leggTilSideHode(doc.getNumberOfPages());
    y = 18;
  }

  function sjekkSideskift(nødvendig = 30) {
    if (y > 265 - nødvendig) nyeSide();
  }

  // ═══════════════════════════════════════════════════════════════
  // FORSIDE
  // ═══════════════════════════════════════════════════════════════

  // Last kun ikonet som bilde (ingen tekst i SVG → ingen font-problemer)
  const ikonDataUrl = await lastLogo('/eiendomspro-logo-ikon.png');

  // Tynn navy-strek øverst
  fc(C.navy); doc.rect(0, 0, 210, 1.5, 'F');

  // Ikon: 12×12 mm
  if (ikonDataUrl) {
    doc.addImage(ikonDataUrl, 'PNG', mL, 4, 12, 12);
  }

  // Ordmerke ved siden av ikonet — jsPDF-tekst = alltid korrekt
  const gull = [201, 168, 76];
  const tekstX = mL + 14;
  const tekstY = 13;
  sf('bold', 14); sc(C.navy);
  doc.text('Eiendoms', tekstX, tekstY);
  const wE = doc.getTextWidth('Eiendoms');
  sf('bold', 14); sc(gull);
  doc.text('PRO', tekstX + wE, tekstY);
  const wP = doc.getTextWidth('PRO');
  sf('normal', 9); sc(gull);
  doc.text('.no', tekstX + wE + wP, tekstY);

  // Dokumenttittel høyre
  sf('bold', 16); sc(C.navy);
  doc.text('LEIEKONTRAKT', mR, 13, { align: 'right' });

  // Skillelinje
  y = 22;
  dc(C.navy); doc.setLineWidth(0.5);
  doc.line(mL, y, mR, y);
  y = 28;

  // ─── Parter-boks ──────────────────────────────────────────────
  const parterH = 32;
  fc(C.boks); dc(C.ramme);
  doc.setLineWidth(0.3);
  doc.roundedRect(mL, y, W, parterH, 2, 2, 'FD');

  // Vertikal skillelinje
  dc(C.ramme);
  doc.line(midX, y + 4, midX, y + parterH - 4);

  sf('bold', 7); sc(C.graa);
  doc.text('UTLEIER', mL + 5, y + 8);
  doc.text('LEIETAKER', midX + 5, y + 8);

  sf('bold', 10); sc(C.svart);
  doc.text(utleierNavn, mL + 5, y + 14);
  doc.text(txt(kontrakt.leietakerNavn || '—'), midX + 5, y + 14);

  sf('normal', 8.5); sc(C.moerk);
  let uY = y + 20;
  if (u.type === 'foretak' && u.orgnummer) { doc.text(`Org.nr: ${u.orgnummer}`, mL + 5, uY); uY += 5; }
  if (u.type !== 'foretak' && u.fodselsdato) { doc.text(`Fødselsdato: ${u.fodselsdato}`, mL + 5, uY); uY += 5; }
  if (u.epost) doc.text(txt(u.epost), mL + 5, uY);
  if (u.tlf) doc.text(txt(u.tlf), mL + 5, uY + 5);

  let ltY = y + 20;
  if (kontrakt.leietakerFodselsdato) { doc.text(`Fødselsdato: ${datoFmt(kontrakt.leietakerFodselsdato)}`, midX + 5, ltY); ltY += 5; }
  if (kontrakt.leietakerEpost) doc.text(txt(kontrakt.leietakerEpost), midX + 5, ltY);
  if (kontrakt.leietakerTlf) doc.text(txt(kontrakt.leietakerTlf), midX + 5, ltY + 5);

  y += parterH + 6;

  // ─── Eiendom-boks ─────────────────────────────────────────────
  const eiendomH = 22;
  fc(C.boks); dc(C.ramme);
  doc.setLineWidth(0.3);
  doc.roundedRect(mL, y, W, eiendomH, 2, 2, 'FD');
  dc(C.ramme);
  doc.line(midX, y + 4, midX, y + eiendomH - 4);

  sf('bold', 7); sc(C.graa);
  doc.text('EIENDOM', mL + 5, y + 7);
  doc.text('LEIEOBJEKT', midX + 5, y + 7);

  sf('bold', 9); sc(C.svart);
  const adr = bygg ? `${bygg.gatenavn} ${bygg.gatenummer}, ${bygg.postnummer} ${bygg.poststed}` : '—';
  doc.text(txt(adr), mL + 5, y + 13);
  const objInfo = [leieobjekt?.betegnelse, leieobjekt?.type ? typeLabel(leieobjekt.type) : ''].filter(Boolean).join(' · ') || '—';
  sf('normal', 9); sc(C.svart);
  doc.text(txt(objInfo), midX + 5, y + 13);
  if (leieobjekt?.areal) { sf('normal', 8); sc(C.graa); doc.text(`${leieobjekt.areal} m²`, midX + 5, y + 18); }

  y += eiendomH + 6;

  // ─── Dato-rad ─────────────────────────────────────────────────
  sf('normal', 8.5); sc(C.graa);
  doc.text(`Kontraktsdato: ${datoFmt(new Date().toISOString())}`, mL, y);
  doc.text(`Startdato: ${datoLang(kontrakt.startdato)}`, mR, y, { align: 'right' });
  y += 5;

  dc(C.navy); doc.setLineWidth(0.6);
  doc.line(mL, y, mR, y);
  y += 8;

  // ═══════════════════════════════════════════════════════════════
  // § 1  KONTRAKTENS PARTER
  // ═══════════════════════════════════════════════════════════════
  seksjon(1, 'Kontraktens parter');

  sf('bold', 9); sc(C.moerk); doc.text('Utleier', mL, y); y += 5;
  toKol(
    u.type === 'foretak' ? 'Selskapsnavn' : 'Navn', utleierNavn,
    u.type === 'foretak' ? 'Organisasjonsnummer' : 'Fødselsdato',
    u.type === 'foretak' ? (u.orgnummer || '—') : (u.fodselsdato || '—')
  );
  if (u.epost || u.tlf) toKol('E-post', u.epost, 'Telefon', u.tlf);
  if (u.adresse) rad('Adresse', `${u.adresse}, ${u.postnummer} ${u.poststed}`);
  avstand(2);
  hLinje(mL, mR, 0.2);
  avstand(3);

  sf('bold', 9); sc(C.moerk); doc.text('Leietaker', mL, y); y += 5;
  toKol('Fullt navn', kontrakt.leietakerNavn, 'Fødselsdato', datoFmt(kontrakt.leietakerFodselsdato));
  if (kontrakt.leietakerEpost || kontrakt.leietakerTlf)
    toKol('E-post', kontrakt.leietakerEpost, 'Telefon', kontrakt.leietakerTlf);

  // ═══════════════════════════════════════════════════════════════
  // § 2  EIENDOM
  // ═══════════════════════════════════════════════════════════════
  seksjon(2, 'Eiendom og leieobjekt');

  toKol('Adresse', bygg ? `${bygg.gatenavn} ${bygg.gatenummer}` : '—',
        'Postnummer / poststed', bygg ? `${bygg.postnummer} ${bygg.poststed}` : '—');
  if (bygg?.gardsnummer || bygg?.bruksnummer)
    toKol('Gardsnummer (Gnr.)', bygg.gardsnummer || '—', 'Bruksnummer (Bnr.)', bygg.bruksnummer || '—');

  toKol('Type leieobjekt', leieobjekt ? typeLabel(leieobjekt.type) : '—',
        'Betegnelse', leieobjekt?.betegnelse || '—');
  toKol('Areal', leieobjekt?.areal ? `${leieobjekt.areal} m²` : '—',
        'Antall rom', leieobjekt?.antallRom ? String(leieobjekt.antallRom) : '—');

  // ═══════════════════════════════════════════════════════════════
  // § 3  LEIE
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(60);
  seksjon(3, 'Leie');

  rad('Leie per maaned', kr(kontrakt.maanedligLeie), true);

  // Inkludert i leien
  const inkl = [
    kontrakt.inkludererStrom && 'Strøm og oppvarming',
    kontrakt.inkludererVann && 'Vann og avlop',
    kontrakt.inkludererInternett && 'Internett',
    kontrakt.inkludererTV && 'TV-abonnement',
    kontrakt.annenInkludert && txt(kontrakt.annenInkludert),
  ].filter(Boolean);
  rad('Inkludert i leien', inkl.length > 0 ? inkl.join(', ') : 'Ingen tillegg inkludert');

  if (!kontrakt.inkludererStrom)
    paragraf('Strom og oppvarming betales av leietaker i tillegg til leien.');

  rad('Betaling', `Leien betales forskuddsvis den ${kontrakt.betalingsdato || 1}. hver maaned.`);

  const visKonto = kontrakt.kontonummer || utleierKonto;
  rad('Konto for leie', visKonto ? visKonto.replace(/(\d{4})(\d{2})(\d{5})/, '$1.$2.$3') : '—');

  if (kontrakt.indeksregulering) {
    paragraf(
      'Indeksregulering: Hver av partene kan, med en maneds skriftlig varsel, kreve leien endret tilsvarende endringen i ' +
      'konsumprisindeksen siden siste leiefastsetting. Endring kan tidligst settes i verk ett ar etter siste leiefastsetting.'
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // § 4  VARIGHET
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(50);
  seksjon(4, 'Varighet og oppsigelse');

  const erTidsubestemt = kontrakt.kontraktstype === 'tidsubestemt';
  rad('Avtaletype', erTidsubestemt ? 'Tidsubestemt avtale' : 'Tidsbestemt avtale');
  toKol('Startdato', datoLang(kontrakt.startdato),
        erTidsubestemt ? '' : 'Sluttdato',
        erTidsubestemt ? '' : datoLang(kontrakt.sluttdato));
  rad('Oppsigelsestid', `${kontrakt.oppsigelsestid || 3} maneder (regnes fra 1. i maneden etter oppsigelsen)`);

  if (erTidsubestemt) {
    paragraf('Leieforholdet loeper til det blir sagt opp av en av partene i samsvar med oppsigelsesfristen.');
  } else {
    paragraf('Leieforholdet opphorer automatisk ved utlopet av leietiden uten ytterligere oppsigelse, jf. husleieloven ss 9-2.');
  }

  // ═══════════════════════════════════════════════════════════════
  // § 5  SIKKERHET
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(55);
  seksjon(5, 'Sikkerhet');

  const sType = kontrakt.sikkerhetsType || kontrakt.depositumType || 'depositumskonto';

  if (sType === 'ingen') {
    paragraf('Partene har avtalt at det ikke stilles sikkerhet for leieforholdet.');
  } else if (sType === 'garanti') {
    italics('Leietaker stiller folgende sikkerhet for skyldig leie, skader pa boligen, manglende rengjoring ved utflytting og andre krav som folger av leieavtalen:');
    rad('Type sikkerhet', 'Garanti fra forsikringsselskap', true);
    rad('Belop', kr(kontrakt.depositum));
    if (kontrakt.garantiUtsteder) rad('Utsteder (forsikringsselskap)', txt(kontrakt.garantiUtsteder));
    if (kontrakt.garantiKostnad) rad('Garantikostnad', kr(kontrakt.garantiKostnad));
    if (kontrakt.depositumFrist) rad('Betalingsfrist', datoFmt(kontrakt.depositumFrist));
    paragraf(
      'Garantibevis ma foreligge for leietaker overtar boligen. Kontrakten er ikke bindende for utleier for garantibeviset foreligger, med mindre overtakelse allerede er gjennomfort.'
    );
  } else {
    // depositumskonto
    italics('Leietaker stiller folgende sikkerhet for skyldig leie, skader pa boligen, manglende rengjoring ved utflytting og andre krav som folger av leieavtalen:');
    rad('Type sikkerhet', 'Depositumskonto (sperret bankkonto)', true);
    rad('Belop', kr(kontrakt.depositum));
    if (kontrakt.depositumFrist) rad('Betalingsfrist', datoFmt(kontrakt.depositumFrist));
    paragraf(
      'Depositumet ma innbetales pa en sperret bankkonto i leietakers navn. Depositumet ma foreligge for leietaker overtar boligen. ' +
      'Kontrakten er ikke bindende for utleier for depositumet er innbetalt, med mindre overtakelse allerede er gjennomfort.'
    );
    if (kontrakt.maanedligLeie) {
      const maks = Number(kontrakt.maanedligLeie) * 6;
      paragraf(`Maksimalt tillatt depositum er ${kr(maks)} (6 maaneders leie), jf. husleieloven ss 3-5.`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // § 6  UTLEIERS PLIKTER
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(40);
  seksjon(6, "Utleiers plikter");
  paragraf('Utleier plikter i leietiden a stille boligen til leietakers disposisjon i samsvar med denne avtale, jf. husleieloven ss 5-1 (1).');
  paragraf('Utleier plikter i leietiden a holde boligen i den stand som folger av husleielovens kap. 2.');

  // ═══════════════════════════════════════════════════════════════
  // § 7  LEIETAKERS PLIKTER
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(55);
  seksjon(7, "Leietakers plikter");
  paragraf('Leietaker ma folge de pabud og regler utleier setter. Leietaker ma for ovrig behandle boligen med tilborlig aktsomhet, og ellers i trad med avtalen og husleieloven kap. 5.');
  paragraf('Leietakers vedlikeholdsplikter reguleres av husleieloven ss 5-3. Annet vedlikehold kan leietaker kun utfore etter samtykke fra utleier.');
  paragraf('Boligen kan ikke brukes til annet formal enn beboelse. Leietaker plikter a erstatte selvforskyldte skader, og skade som skyldes medlemmer av husstanden eller andre som leietaker har gitt adgang til boligen.');

  // ═══════════════════════════════════════════════════════════════
  // § 8  ORDENSREGLER
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(45);
  seksjon(8, "Ordensregler");
  toKol(
    'Royking',
    kontrakt.royking ? 'Royking er tillatt i boligen.' : 'Royking er ikke tillatt innendors.',
    'Husdyr',
    kontrakt.husdyr ? 'Husdyr er tillatt etter avtale med utleier.' : 'Det er ikke tillatt a holde husdyr uten skriftlig tillatelse fra utleier.'
  );
  avstand(2);
  paragraf('Alminnelig ro og orden: Leietaker plikter a respektere naboers behov for ro og hvile. Det skal vare stille etter kl. 23:00.');
  if (kontrakt.husordensregler) {
    paragraf('Se vedlagte husordensregler.');
  }

  // ═══════════════════════════════════════════════════════════════
  // § 9  AVTALEBRUDD
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(40);
  seksjon(9, "Avtalebrudd");
  paragraf('Leietaker godtar at tvangsfravikelse kan kreves hvis leien ikke blir betalt innen 14 dager etter at skriftlig varsel er sendt, jf. tvangsfullbyrdelsesloven ss 13-2 tredje ledd a).');
  paragraf('Gjor leietaker seg skyldig i vesentlige brudd pa leieavtalen, kan leieavtalen heves, jf. husleieloven ss 9-9.');

  // ═══════════════════════════════════════════════════════════════
  // § 10  UTFLYTTING
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(40);
  seksjon(10, "Utflytting");
  paragraf('Leietaker plikter a levere boligen tilbake i ryddig og rengjort stand, med alle nokler, og med ikke storre skader enn normalt slitasje medforer, jf. husleieloven ss 10-2.');
  paragraf('Det gjennomfores utflyttingsbefaring der tilstand dokumenteres. Eventuelle krav mot depositum fremlegges skriftlig innen rimelig tid.');

  // ═══════════════════════════════════════════════════════════════
  // § 11  ANDRE BESTEMMELSER (fritekst)
  // ═══════════════════════════════════════════════════════════════
  if (kontrakt.andrebestemmelser && txt(kontrakt.andrebestemmelser).trim()) {
    sjekkSideskift(30);
    seksjon(11, "Andre bestemmelser");
    paragraf(txt(kontrakt.andrebestemmelser));
  }

  // ═══════════════════════════════════════════════════════════════
  // SIGNATURER
  // ═══════════════════════════════════════════════════════════════
  sjekkSideskift(75);
  avstand(8);

  dc(C.navy); doc.setLineWidth(0.6);
  doc.line(mL, y, mR, y);
  avstand(6);

  sf('bold', 12); sc(C.navy);
  doc.text('Signaturer', mL, y);
  avstand(3);
  sf('normal', 8.5); sc(C.graa);
  doc.text('Begge parter bekrefter a ha lest og forstaatt kontraktens innhold. Kontrakten er bindende ved signering.', mL, y);
  avstand(12);

  const sigW = (W - 12) / 2;

  // Utleier-boks
  fc(C.boks); dc(C.ramme);
  doc.setLineWidth(0.25);
  doc.roundedRect(mL, y, sigW, 38, 1.5, 1.5, 'FD');

  sf('bold', 7.5); sc(C.graa);
  doc.text('UTLEIER', mL + 5, y + 7);
  sf('normal', 9); sc(C.svart);
  doc.text(utleierNavn, mL + 5, y + 13);
  dc(C.lysgraa); doc.setLineWidth(0.3);
  doc.line(mL + 5, y + 26, mL + sigW - 5, y + 26);
  sf('normal', 7.5); sc(C.graa);
  doc.text('Underskrift', mL + 5, y + 30);
  doc.text('Dato: _______________', mL + 5, y + 35);

  // Leietaker-boks
  const sig2X = mL + sigW + 12;
  fc(C.boks); dc(C.ramme);
  doc.roundedRect(sig2X, y, sigW, 38, 1.5, 1.5, 'FD');

  sf('bold', 7.5); sc(C.graa);
  doc.text('LEIETAKER', sig2X + 5, y + 7);
  sf('normal', 9); sc(C.svart);
  doc.text(txt(kontrakt.leietakerNavn || '—'), sig2X + 5, y + 13);
  dc(C.lysgraa); doc.setLineWidth(0.3);
  doc.line(sig2X + 5, y + 26, sig2X + sigW - 5, y + 26);
  sf('normal', 7.5); sc(C.graa);
  doc.text('Underskrift', sig2X + 5, y + 30);
  doc.text('Dato: _______________', sig2X + 5, y + 35);

  y += 44;

  // ─── Sidefot på alle sider ────────────────────────────────────
  const totalSider = doc.getNumberOfPages();
  for (let i = 1; i <= totalSider; i++) {
    doc.setPage(i);
    // Tynn forlinje
    dc(C.lysgraa); doc.setLineWidth(0.3);
    doc.line(mL, 282, mR, 282);
    sf('normal', 7); sc(C.graa);
    doc.text('EiendomsPRO.no  ·  Leiekontrakt', mL, 287);
    doc.text(`Side ${i} av ${totalSider}`, 105, 287, { align: 'center' });
    doc.text(datoFmt(new Date().toISOString()), mR, 287, { align: 'right' });
  }

  // ─── Lagre ────────────────────────────────────────────────────
  const filnavn = `Leiekontrakt-${(kontrakt.leietakerNavn || 'ukjent').replace(/\s+/g, '-')}-${(kontrakt.startdato || '').replace(/-/g, '')}.pdf`;
  doc.save(filnavn);
}

// ─── Type-etikett ─────────────────────────────────────────────────────────────
function typeLabel(type) {
  return { hybel: 'Hybel', leilighet: 'Leilighet', sokkelleilighet: 'Sokkelleilighet', enebolig: 'Enebolig', naering: 'Naeringslokale' }[type] || type || '—';
}
