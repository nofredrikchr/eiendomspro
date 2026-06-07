import { jsPDF } from 'jspdf';

function datoFmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function datoLang(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}
function txt(s) { return (s || '').toString(); }

// ─── Last logo ────────────────────────────────────────────────────────────────
function lastLogo(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = (img.naturalWidth || 320) * 4;
      canvas.height = (img.naturalHeight || 80) * 4;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
export async function genererProtokollPDF({ protokoll, kontrakt, leieobjekt, bygg, utleier }) {
  const u = utleier || {};
  const erInn = protokoll.type === 'innflytting';

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mL = 22, mR = 188, W = mR - mL;
  const midX = mL + W / 2;
  let y = 0;

  const C = {
    svart: [20, 20, 20], moerk: [50, 50, 55], graa: [120, 120, 130],
    lysgraa: [210, 210, 215], ramme: [200, 200, 205], boks: [248, 248, 250],
    hvit: [255, 255, 255], navy: [22, 40, 70], gull: [201, 168, 76],
    gronn: [34, 197, 94], rod: [239, 68, 68], gul: [234, 179, 8],
  };

  const sf = (s = 'normal', sz = 10) => { doc.setFont('helvetica', s); doc.setFontSize(sz); };
  const sc = (rgb) => doc.setTextColor(...rgb);
  const dc = (rgb) => doc.setDrawColor(...rgb);
  const fc = (rgb) => doc.setFillColor(...rgb);

  function hLinje(x1 = mL, x2 = mR, t = 0.25, f = C.lysgraa) {
    dc(f); doc.setLineWidth(t); doc.line(x1, y, x2, y); y += 1;
  }
  function avstand(mm = 4) { y += mm; }

  function blokk(s, x = mL, w = W, stil = 'normal', sz = 9, farge = C.moerk) {
    sf(stil, sz); sc(farge);
    const linjer = doc.splitTextToSize(txt(s), w);
    doc.text(linjer, x, y);
    y += linjer.length * (sz * 0.38) + 2.5;
  }

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

  function seksjon(tittel) {
    avstand(5);
    if (y > 255) { doc.addPage(); sideHode(); y = 20; }
    sf('bold', 11); sc(C.navy);
    doc.text(tittel.toUpperCase(), mL, y); y += 2;
    hLinje(mL, mR, 0.4, C.navy); avstand(3);
  }

  function sideHode() {
    dc(C.lysgraa); doc.setLineWidth(0.25);
    doc.line(mL, 8, mR, 8);
    sf('normal', 7); sc(C.graa);
    doc.text(erInn ? 'INNFLYTTINGSPROTOKOLL' : 'UTFLYTTINGSPROTOKOLL', mL, 6);
    doc.text(txt(`${kontrakt?.leietakerNavn || ''} – ${bygg?.gatenavn || ''} ${bygg?.gatenummer || ''}`), 105, 6, { align: 'center' });
    doc.text(`Side ${doc.getNumberOfPages()}`, mR, 6, { align: 'right' });
  }

  // ─── FORSIDE ───────────────────────────────────────────────────
  const ikonDataUrl = await lastLogo('/eiendomspro-logo-ikon.png');

  fc(C.navy); doc.rect(0, 0, 210, 1.5, 'F');

  if (ikonDataUrl) doc.addImage(ikonDataUrl, 'PNG', mL, 4, 12, 12);

  const gullC = [201, 168, 76];
  const tekstX = mL + 14;
  sf('bold', 14); sc(C.navy); doc.text('Eiendoms', tekstX, 13);
  const wE = doc.getTextWidth('Eiendoms');
  sf('bold', 14); sc(gullC); doc.text('PRO', tekstX + wE, 13);
  const wP = doc.getTextWidth('PRO');
  sf('normal', 9); sc(gullC); doc.text('.no', tekstX + wE + wP, 13);

  // Tittel høyre
  sf('bold', erInn ? 14 : 14); sc(C.navy);
  doc.text(erInn ? 'INNFLYTTINGSPROTOKOLL' : 'UTFLYTTINGSPROTOKOLL', mR, 10, { align: 'right' });
  sf('normal', 8.5); sc(C.graa);
  doc.text(erInn ? 'Tilstandsregistrering ved overlevering av bolig' : 'Tilstandsregistrering ved fraflytting', mR, 15, { align: 'right' });

  y = 24; dc(C.navy); doc.setLineWidth(0.5); doc.line(mL, y, mR, y); y = 30;

  // Parter-boks
  fc(C.boks); dc(C.ramme); doc.setLineWidth(0.3);
  doc.roundedRect(mL, y, W, 30, 2, 2, 'FD');
  dc(C.ramme); doc.line(midX, y + 4, midX, y + 26);

  sf('bold', 7); sc(C.graa);
  doc.text('UTLEIER', mL + 5, y + 7);
  doc.text('LEIETAKER', midX + 5, y + 7);
  sf('bold', 10); sc(C.svart);
  doc.text(txt(u.navn || 'Utleier'), mL + 5, y + 13);
  doc.text(txt(kontrakt?.leietakerNavn || '—'), midX + 5, y + 13);
  sf('normal', 8.5); sc(C.moerk);
  if (u.epost) doc.text(txt(u.epost), mL + 5, y + 19);
  if (kontrakt?.leietakerEpost) doc.text(txt(kontrakt.leietakerEpost), midX + 5, y + 19);
  if (u.tlf) doc.text(txt(u.tlf), mL + 5, y + 24);
  if (kontrakt?.leietakerTlf) doc.text(txt(kontrakt.leietakerTlf), midX + 5, y + 24);
  y += 36;

  // Eiendom-boks
  fc(C.boks); dc(C.ramme); doc.roundedRect(mL, y, W, 20, 2, 2, 'FD');
  dc(C.ramme); doc.line(midX, y + 4, midX, y + 16);
  sf('bold', 7); sc(C.graa);
  doc.text('EIENDOM', mL + 5, y + 6);
  doc.text('PROTOKOLLTYPE OG DATO', midX + 5, y + 6);
  sf('bold', 9); sc(C.svart);
  const adr = bygg ? `${bygg.gatenavn} ${bygg.gatenummer}, ${bygg.postnummer} ${bygg.poststed}` : '—';
  doc.text(txt(adr), mL + 5, y + 12);
  const typeLabel = erInn ? 'Innflytting' : 'Utflytting';
  doc.text(`${typeLabel} — ${datoLang(protokoll.dato)}`, midX + 5, y + 12);
  if (leieobjekt?.betegnelse) { sf('normal', 8); sc(C.graa); doc.text(txt(leieobjekt.betegnelse), mL + 5, y + 17); }
  y += 26;

  sf('normal', 8); sc(C.graa);
  doc.text(`Protokoll opprettet: ${datoFmt(new Date().toISOString())}`, mL, y);
  y += 5;
  dc(C.navy); doc.setLineWidth(0.5); doc.line(mL, y, mR, y); y += 8;

  // ─── NØKLER ─────────────────────────────────────────────────────
  seksjon('Nøkler');
  const nokler = (protokoll.nokler || []).filter(n => n.antall > 0);
  if (nokler.length === 0) {
    blokk('Ingen nøkler registrert.', mL, W, 'italic', 9, C.graa);
  } else {
    // Tabell
    const cols = ['Type', 'Antall', 'Merknad'];
    const colW = [80, 30, W - 110];
    let tx = mL;
    sf('bold', 8); sc(C.graa);
    cols.forEach((c, i) => { doc.text(c, tx, y); tx += colW[i]; });
    y += 2; hLinje(mL, mR, 0.2); avstand(1);

    nokler.forEach((n) => {
      sf('normal', 9); sc(C.svart);
      tx = mL;
      doc.text(txt(n.type), tx, y); tx += colW[0];
      doc.text(String(n.antall), tx, y); tx += colW[1];
      doc.text(txt(n.merknad || '—'), tx, y);
      y += 6;
    });
  }
  avstand(2);
  blokk(erInn
    ? `Leietaker bekrefter å ha mottatt ${nokler.reduce((s, n) => s + n.antall, 0)} nøkler som beskrevet ovenfor.`
    : `Leietaker bekrefter å ha tilbakelevert ${nokler.reduce((s, n) => s + n.antall, 0)} nøkler som beskrevet ovenfor.`,
    mL, W, 'italic', 8.5, C.graa);

  // ─── MÅLERAVLESNINGER ────────────────────────────────────────────
  seksjon('Måleravlesninger');
  const malere = (protokoll.malere || []).filter(m => m.avlesning);
  if (malere.length === 0) {
    blokk('Ingen måleravlesninger registrert.', mL, W, 'italic', 9, C.graa);
  } else {
    const cols2 = ['Type', 'Målernr.', 'Avlesning', 'Dato'];
    const colW2 = [50, 50, 40, W - 140];
    let tx = mL;
    sf('bold', 8); sc(C.graa);
    cols2.forEach((c, i) => { doc.text(c, tx, y); tx += colW2[i]; });
    y += 2; hLinje(mL, mR, 0.2); avstand(1);

    malere.forEach((m) => {
      sf('normal', 9); sc(C.svart);
      tx = mL;
      doc.text(txt(m.type), tx, y); tx += colW2[0];
      doc.text(txt(m.malerNr || '—'), tx, y); tx += colW2[1];
      doc.text(txt(m.avlesning), tx, y); tx += colW2[2];
      doc.text(datoFmt(protokoll.dato), tx, y);
      y += 6;
    });
  }

  // ─── ROM-TILSTAND ─────────────────────────────────────────────────
  seksjon('Tilstandsregistrering');
  blokk('Tilstand vurderes som: God = ingen feil eller mangler · Akseptabel = normalt slitasje · Dårlig = skader eller mangler',
    mL, W, 'italic', 8, C.graa);
  avstand(2);

  const rom = (protokoll.rom || []).filter(r => r.navn);
  if (rom.length === 0) {
    blokk('Ingen rom registrert.', mL, W, 'italic', 9, C.graa);
  } else {
    const tilstandFarge = { god: C.gronn, akseptabel: C.gul, darlig: C.rod };
    const tilstandLabel = { god: 'God', akseptabel: 'Akseptabel', darlig: 'Dårlig' };

    rom.forEach((r, idx) => {
      if (y > 255) { doc.addPage(); sideHode(); y = 20; }

      // Rad
      const rowH = r.merknader ? 14 : 9;
      fc(idx % 2 === 0 ? [245, 245, 248] : C.hvit);
      doc.rect(mL, y - 5, W, rowH + 2, 'F');

      sf('bold', 9); sc(C.svart);
      doc.text(txt(r.navn), mL + 2, y);

      // Tilstand-badge
      const farge = tilstandFarge[r.tilstand] || C.graa;
      fc(farge.map(v => Math.min(255, v + 200)));
      doc.roundedRect(mR - 36, y - 4, 34, 7, 1.5, 1.5, 'F');
      sf('bold', 8); sc(farge);
      doc.text(tilstandLabel[r.tilstand] || '—', mR - 19, y, { align: 'center' });

      if (r.merknader) {
        y += 5;
        sf('normal', 8); sc(C.graa);
        const mLinjer = doc.splitTextToSize(txt(r.merknader), W - 44);
        doc.text(mLinjer, mL + 2, y);
        y += mLinjer.length * 4;
      }
      y += 6;
    });
  }

  // ─── MERKNADER ───────────────────────────────────────────────────
  if (protokoll.merknader?.trim()) {
    seksjon('Generelle merknader');
    blokk(protokoll.merknader, mL, W, 'normal', 9, C.moerk);
  }

  // ─── SIGNATURER ──────────────────────────────────────────────────
  if (y > 220) { doc.addPage(); sideHode(); y = 20; }
  avstand(8);
  dc(C.navy); doc.setLineWidth(0.6); doc.line(mL, y, mR, y); avstand(6);

  sf('bold', 12); sc(C.navy); doc.text('Signaturer', mL, y); avstand(3);
  sf('normal', 8.5); sc(C.graa);
  doc.text(erInn
    ? 'Begge parter bekrefter at boligen ble overtatt i den tilstand som er beskrevet i denne protokollen.'
    : 'Begge parter bekrefter at boligen ble tilbakelevert i den tilstand som er beskrevet i denne protokollen.',
    mL, y); avstand(10);

  const sigW = (W - 12) / 2;

  // Utleier
  fc(C.boks); dc(C.ramme); doc.setLineWidth(0.25);
  doc.roundedRect(mL, y, sigW, 35, 1.5, 1.5, 'FD');
  sf('bold', 7.5); sc(C.graa); doc.text('UTLEIER', mL + 5, y + 7);
  sf('normal', 9); sc(C.svart); doc.text(txt(u.navn || 'Utleier'), mL + 5, y + 13);
  dc(C.lysgraa); doc.line(mL + 5, y + 24, mL + sigW - 5, y + 24);
  sf('normal', 7.5); sc(C.graa); doc.text('Underskrift', mL + 5, y + 28);
  doc.text('Dato: _______________', mL + 5, y + 33);

  // Leietaker
  const s2X = mL + sigW + 12;
  fc(C.boks); dc(C.ramme); doc.roundedRect(s2X, y, sigW, 35, 1.5, 1.5, 'FD');
  sf('bold', 7.5); sc(C.graa); doc.text('LEIETAKER', s2X + 5, y + 7);
  sf('normal', 9); sc(C.svart); doc.text(txt(kontrakt?.leietakerNavn || '—'), s2X + 5, y + 13);
  dc(C.lysgraa); doc.line(s2X + 5, y + 24, s2X + sigW - 5, y + 24);
  sf('normal', 7.5); sc(C.graa); doc.text('Underskrift', s2X + 5, y + 28);
  doc.text('Dato: _______________', s2X + 5, y + 33);

  y += 42;

  // ─── SIDEFOT ─────────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    dc(C.lysgraa); doc.setLineWidth(0.3); doc.line(mL, 282, mR, 282);
    sf('normal', 7); sc(C.graa);
    doc.text(`EiendomsPRO.no  ·  ${erInn ? 'Innflyttingsprotokoll' : 'Utflyttingsprotokoll'}`, mL, 287);
    doc.text(`Side ${i} av ${total}`, 105, 287, { align: 'center' });
    doc.text(datoFmt(new Date().toISOString()), mR, 287, { align: 'right' });
  }

  const navn = (kontrakt?.leietakerNavn || 'ukjent').replace(/\s+/g, '-');
  const type = erInn ? 'innflytting' : 'utflytting';
  doc.save(`Protokoll-${type}-${navn}-${(protokoll.dato || '').replace(/-/g, '')}.pdf`);
}
