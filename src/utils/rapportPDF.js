import { jsPDF } from 'jspdf';

/**
 * Generisk rapport-PDF for EiendomsPRO.
 *
 * genererRapportPDF({
 *   tittel, undertittel, filnavn,
 *   kpis: [{ label, verdi }],
 *   seksjoner: [{ tittel, kolonner: [..], rader: [[..]], sumRad: [..] }],
 *   notat: 'fritekst nederst',
 * })
 */
function txt(s) { return (s ?? '').toString(); }

function lastLogo(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = (img.naturalWidth || 320) * 4;
      c.height = (img.naturalHeight || 80) * 4;
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function genererRapportPDF({ tittel, undertittel, filnavn, kpis = [], seksjoner = [], notat }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const mL = 16, mR = 194, W = mR - mL;
  let y = 0;

  const C = {
    svart: [20, 20, 20], moerk: [55, 55, 60], graa: [120, 120, 130],
    lysgraa: [225, 225, 230], boks: [247, 247, 249], hvit: [255, 255, 255],
    navy: [22, 40, 70], gull: [201, 168, 76], gronn: [34, 160, 90], rod: [200, 60, 60],
  };
  const sf = (s = 'normal', sz = 10) => { doc.setFont('helvetica', s); doc.setFontSize(sz); };
  const sc = (c) => doc.setTextColor(...c);
  const dc = (c) => doc.setDrawColor(...c);
  const fc = (c) => doc.setFillColor(...c);

  function sideHode() {
    dc(C.lysgraa); doc.setLineWidth(0.3); doc.line(mL, 287, mR, 287);
    sf('normal', 7); sc(C.graa);
    doc.text('EiendomsPRO.no', mL, 292);
    doc.text(`Side ${doc.getNumberOfPages()}`, 105, 292, { align: 'center' });
    doc.text(new Date().toLocaleDateString('nb-NO'), mR, 292, { align: 'right' });
  }
  function sjekkSide(behov = 20) {
    if (y > 270 - behov) { doc.addPage(); y = 20; }
  }

  // ── Header ──
  const ikon = await lastLogo('/eiendomspro-logo-ikon.png');
  fc(C.navy); doc.rect(0, 0, 210, 1.5, 'F');
  if (ikon) doc.addImage(ikon, 'PNG', mL, 6, 11, 11);
  sf('bold', 13); sc(C.navy);
  doc.text('Eiendoms', mL + 13, 14);
  const wE = doc.getTextWidth('Eiendoms');
  sf('bold', 13); sc(C.gull);
  doc.text('PRO', mL + 13 + wE, 14);

  sf('bold', 15); sc(C.navy);
  doc.text(txt(tittel), mR, 12, { align: 'right' });
  if (undertittel) { sf('normal', 8.5); sc(C.graa); doc.text(txt(undertittel), mR, 17, { align: 'right' }); }

  y = 24; dc(C.navy); doc.setLineWidth(0.5); doc.line(mL, y, mR, y); y = 32;

  // ── KPI-rad ──
  if (kpis.length) {
    const kpiBredde = (W - (kpis.length - 1) * 4) / kpis.length;
    kpis.forEach((k, i) => {
      const x = mL + i * (kpiBredde + 4);
      fc(C.boks); dc(C.lysgraa); doc.setLineWidth(0.25);
      doc.roundedRect(x, y, kpiBredde, 18, 1.5, 1.5, 'FD');
      sf('normal', 7); sc(C.graa);
      doc.text(txt(k.label), x + 3, y + 6, { maxWidth: kpiBredde - 6 });
      sf('bold', 11); sc(C.svart);
      doc.text(txt(k.verdi), x + 3, y + 13);
    });
    y += 26;
  }

  // ── Seksjoner med tabeller ──
  seksjoner.forEach((seksjon) => {
    sjekkSide(30);
    if (seksjon.tittel) {
      sf('bold', 10.5); sc(C.navy);
      doc.text(txt(seksjon.tittel), mL, y); y += 2;
      dc(C.lysgraa); doc.setLineWidth(0.3); doc.line(mL, y, mR, y); y += 5;
    }
    const kol = seksjon.kolonner || [];
    const antall = kol.length;
    const kolW = W / antall;

    // Header
    sf('bold', 7.5); sc(C.graa);
    kol.forEach((k, i) => {
      const x = i === 0 ? mL : mL + i * kolW;
      doc.text(txt(k), i === 0 ? x : x + kolW - 1, y, i === 0 ? {} : { align: 'right' });
    });
    y += 2; dc(C.lysgraa); doc.setLineWidth(0.2); doc.line(mL, y, mR, y); y += 4;

    // Rader
    (seksjon.rader || []).forEach((rad) => {
      sjekkSide(12);
      sf('normal', 8.5); sc(C.svart);
      rad.forEach((celle, i) => {
        const x = i === 0 ? mL : mL + i * kolW;
        if (i === 0) doc.text(txt(celle), x, y, { maxWidth: kolW - 2 });
        else { sc(C.moerk); doc.text(txt(celle), x + kolW - 1, y, { align: 'right' }); sc(C.svart); }
      });
      y += 5.5;
    });

    // Sumrad
    if (seksjon.sumRad) {
      dc(C.lysgraa); doc.setLineWidth(0.3); doc.line(mL, y - 1, mR, y - 1); y += 3;
      sf('bold', 8.5); sc(C.svart);
      seksjon.sumRad.forEach((celle, i) => {
        const x = i === 0 ? mL : mL + i * kolW;
        doc.text(txt(celle), i === 0 ? x : x + kolW - 1, y, i === 0 ? {} : { align: 'right' });
      });
      y += 5.5;
    }
    y += 6;
  });

  // ── Notat ──
  if (notat) {
    sjekkSide(20);
    fc([245, 248, 252]); dc([200, 215, 235]); doc.setLineWidth(0.25);
    const linjer = doc.splitTextToSize(txt(notat), W - 8);
    const h = linjer.length * 4 + 6;
    doc.roundedRect(mL, y, W, h, 1.5, 1.5, 'FD');
    sf('normal', 7.5); sc([60, 90, 130]);
    doc.text(linjer, mL + 4, y + 5);
    y += h + 4;
  }

  // ── Sidefot på alle sider ──
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) { doc.setPage(i); sideHode(); }

  doc.save(`${filnavn || 'rapport'}.pdf`);
}
