import { calcTerminbelop } from './format';

// xlsx og jspdf er tunge biblioteker — de lastes dynamisk først når en
// eksport faktisk kjøres, slik at de holdes utenfor hovedbundelen.
async function lastXLSX() {
  return import('xlsx');
}
async function lastJsPDF() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

function fmtN(v) {
  return Math.round(v || 0);
}

function calcLoanScheduleExport(laan, rentesats, aar, years = 10) {
  if (!laan || !rentesats || !aar || laan <= 0) {
    return Array.from({ length: years }, () => ({ renter: 0, avdrag: 0, balance: laan || 0 }));
  }
  const r = rentesats / 100 / 12;
  const terminbelop = calcTerminbelop(laan, rentesats, aar);
  const schedule = [];
  let balance = laan;
  for (let y = 0; y < years; y++) {
    let aarligRenter = 0, aarligAvdrag = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const mR = balance * r;
      const mA = Math.min(terminbelop - mR, balance);
      aarligRenter += mR; aarligAvdrag += mA; balance -= mA;
    }
    schedule.push({ renter: Math.round(aarligRenter), avdrag: Math.round(aarligAvdrag), balance: Math.max(0, Math.round(balance)) });
  }
  return schedule;
}

export function buildPrognoseRader(form, totalLeie, faste, vedlikeholdKr) {
  const YEARS = 10;
  const laan = Number(form.laanebelop || 0);
  const loanSchedule = form.laanModus === 'kalkulert'
    ? calcLoanScheduleExport(laan, Number(form.rentesats || 0), Number(form.nedbetalingstid || 0), YEARS)
    : Array.from({ length: YEARS }, () => ({ renter: 0, avdrag: 0, balance: laan }));

  const nyTakst = Number(form.nyTakst || 0);
  const kjoepesum = Number(form.kjoepesum || 0);
  const startVerdi = nyTakst > 0 ? nyTakst : kjoepesum;
  const verdistigning = Number(form.verdistigning || 4) / 100;
  const utleiegrad = Number(form.utleiegrad || 95) / 100;
  const pristigningLeie = Number(form.pristigningLeie || 1.5) / 100;
  const pristigningKostn = Number(form.pristigningKostnader || 1.5) / 100;
  const skattemodus = form.skattemodus || 'privat';

  const rows = [];
  let bruttoLeie = totalLeie * 12;

  for (let y = 0; y < YEARS; y++) {
    if (y > 0) bruttoLeie *= (1 + pristigningLeie);
    const ledighet = bruttoLeie * (1 - utleiegrad);
    const nettoLeie = bruttoLeie - ledighet;
    const drift = (faste - vedlikeholdKr) * 12 * Math.pow(1 + pristigningKostn, y);
    const vedlikehold = vedlikeholdKr * 12 * Math.pow(1 + pristigningKostn, y);
    const nettoLeieinntekt = nettoLeie - drift - vedlikehold;

    const { renter, avdrag, balance } = loanSchedule[y];
    let skatt;
    let rentefradrag = 0;
    if (skattemodus === 'privat') {
      skatt = Math.max(0, nettoLeieinntekt) * 0.22;
      rentefradrag = renter * 0.22;
    } else {
      skatt = Math.max(0, nettoLeieinntekt - renter) * 0.22;
    }

    const kontantstrøm = nettoLeieinntekt - renter - avdrag - skatt + rentefradrag;
    const boligverdi = startVerdi > 0 ? startVerdi * Math.pow(1 + verdistigning, y + 1) : 0;
    const ltv = boligverdi > 0 ? (balance / boligverdi) * 100 : 0;
    const egenkapital = boligverdi - balance;

    rows.push({
      aar: y + 1,
      bruttoLeie: fmtN(bruttoLeie),
      ledighet: fmtN(ledighet),
      drift: fmtN(drift),
      vedlikehold: fmtN(vedlikehold),
      nettoLeieinntekt: fmtN(nettoLeieinntekt),
      renter,
      avdrag,
      skatt: fmtN(skatt),
      rentefradrag: fmtN(rentefradrag),
      kontantstrøm: fmtN(kontantstrøm),
      boligverdi: fmtN(boligverdi),
      boliglaan: balance,
      ltv: Math.round(ltv),
      egenkapital: fmtN(egenkapital),
    });
  }
  return rows;
}

// ════════════════════════════════════════════════════════════════════════════
// BYGGELÅNSBUDSJETT — bank-vennlig eksport (Excel 2 ark + PDF)
// ════════════════════════════════════════════════════════════════════════════
const TYPE_LBL = { vedlikehold: 'Vedlikehold', paakostning: 'Påkostning' };
const STATUS_LBL = { planlagt: 'Planlagt', paagaaende: 'Pågående', fullfort: 'Fullført' };

// Ren ASCII-tallformat for PDF (jsPDF-fonten mangler glyffer for U+00A0 og U+2212)
function krAscii(v) {
  const n = Math.round(v || 0);
  const tall = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n < 0 ? '-' : ''}${tall} kr`;
}

function beregnByggelaan(form) {
  const poster = form.oppussingsposter || [];
  const sumBudsjettert = poster.reduce((s, p) => s + Number(p.budsjettert || 0), 0);
  const sumFaktisk = poster.reduce((s, p) => s + Number(p.faktisk || 0), 0);
  const ufProsent = Number(form.uforutsettProsent || 0);
  const uforutsett = sumBudsjettert * ufProsent / 100;
  const grunnlag = sumBudsjettert + uforutsett;
  const brukBL = !!form.brukByggelaan;
  const blMnd = Number(form.byggelaanMnd || 0);
  const blRente = Number(form.byggelaanRente || 0);
  const byggelaanRenter = brukBL ? grunnlag * (blRente / 100) * (blMnd / 12) * 0.5 : 0;
  const etableringsgebyr = brukBL ? Number(form.byggelaanEtablering || 0) : 0;
  const totalBudsjett = sumBudsjettert + uforutsett + byggelaanRenter + etableringsgebyr;
  // Gruppert per rom
  const map = {};
  poster.forEach((p) => {
    const k = (p.rom || '').trim() || 'Annet';
    map[k] ||= { navn: k, budsjett: 0, brukt: 0 };
    map[k].budsjett += Number(p.budsjettert || 0);
    map[k].brukt += Number(p.faktisk || 0);
  });
  const grupper = Object.values(map).sort((a, b) => b.budsjett - a.budsjett);
  return { poster, sumBudsjettert, sumFaktisk, ufProsent, uforutsett, brukBL, blMnd, blRente, byggelaanRenter, etableringsgebyr, totalBudsjett, grupper };
}

export async function exportByggelaanExcel(form, adresse) {
  const XLSX = await lastXLSX();
  const b = beregnByggelaan(form);
  const rest = (bud, brukt) => Math.round((bud || 0) - (brukt || 0));

  // ── Ark 1: Bank-sammendrag ──
  const ark1 = [
    ['BYGGELÅNSBUDSJETT', '', '', ''],
    ['Eiendom', adresse, '', ''],
    ['Dato', new Date().toLocaleDateString('nb-NO'), '', ''],
    [],
    ['Post', 'Budsjett', 'Brukt', 'Rest'],
    ...b.grupper.map((g) => [g.navn, Math.round(g.budsjett), Math.round(g.brukt), rest(g.budsjett, g.brukt)]),
    ['Sum kostnadslinjer', Math.round(b.sumBudsjettert), Math.round(b.sumFaktisk), rest(b.sumBudsjettert, b.sumFaktisk)],
    [`Uforutsett (${b.ufProsent} %)`, Math.round(b.uforutsett), 0, Math.round(b.uforutsett)],
    ...(b.brukBL ? [[`Byggelånsrenter (${b.blMnd} mnd, ${b.blRente} %)`, Math.round(b.byggelaanRenter), 0, Math.round(b.byggelaanRenter)]] : []),
    ...(b.brukBL && b.etableringsgebyr > 0 ? [['Etableringsgebyr', Math.round(b.etableringsgebyr), 0, Math.round(b.etableringsgebyr)]] : []),
    ['TOTALT', Math.round(b.totalBudsjett), Math.round(b.sumFaktisk), rest(b.totalBudsjett, b.sumFaktisk)],
  ];

  // ── Ark 2: Detaljert ──
  const detHeader = ['Beskrivelse', 'Rom', 'Enhet/leilighet', 'Type', 'Status', 'Leverandør', 'Dato', 'Budsjett', 'Brukt', 'Rest'];
  const detRows = b.poster.map((p) => [
    p.beskrivelse || '', p.rom || '', p.enhet || '', TYPE_LBL[p.type] || p.type || '', STATUS_LBL[p.status] || p.status || '',
    p.leverandor || '', p.dato || '', Math.round(Number(p.budsjettert || 0)), Math.round(Number(p.faktisk || 0)), rest(Number(p.budsjettert || 0), Number(p.faktisk || 0)),
  ]);

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(ark1);
  ws1['!cols'] = [{ wch: 38 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Byggelånsbudsjett');
  const ws2 = XLSX.utils.aoa_to_sheet([detHeader, ...detRows]);
  ws2['!cols'] = [{ wch: 32 }, { wch: 14 }, { wch: 16 }, { wch: 13 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Detaljert');

  XLSX.writeFile(wb, `byggelaansbudsjett-${(adresse || 'bygg').replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}

export async function exportByggelaanPDF(form, adresse) {
  const { jsPDF, autoTable } = await lastJsPDF();
  const b = beregnByggelaan(form);
  const kr = krAscii;
  const rest = (bud, brukt) => kr((bud || 0) - (brukt || 0));
  const doc = new jsPDF({ format: 'a4' });
  const M = 16;                 // margin
  const NAVY = [22, 40, 70];
  const GRAA = [110, 116, 128];
  const LINJE = [228, 230, 235];

  // ── Header ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...NAVY);
  doc.text('Byggelånsbudsjett', M, 22);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(50, 55, 65);
  doc.text(adresse || '', M, 29.5);
  doc.setFontSize(9); doc.setTextColor(...GRAA);
  doc.text(`Utarbeidet ${new Date().toLocaleDateString('nb-NO')}  ·  EiendomsPRO`, M, 35);
  // tynn delelinje
  doc.setDrawColor(...LINJE); doc.setLineWidth(0.4); doc.line(M, 39, 210 - M, 39);

  const tabellStil = {
    styles: { fontSize: 10, cellPadding: { top: 3.2, bottom: 3.2, left: 4, right: 4 }, textColor: [40, 44, 52], lineColor: LINJE, lineWidth: 0.1 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9.5, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } },
    alternateRowStyles: { fillColor: [249, 250, 252] },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: M, right: M },
  };

  // ── Sammendrag ──
  const grupperRader = b.grupper.map((g) => [g.navn, kr(g.budsjett), kr(g.brukt), rest(g.budsjett, g.brukt)]);
  const tilleggsrader = [
    ['Sum kostnadslinjer', kr(b.sumBudsjettert), kr(b.sumFaktisk), rest(b.sumBudsjettert, b.sumFaktisk)],
    [`Uforutsett (${b.ufProsent} %)`, kr(b.uforutsett), kr(0), kr(b.uforutsett)],
    ...(b.brukBL ? [[`Byggelånsrenter (${b.blMnd} mnd)`, kr(b.byggelaanRenter), kr(0), kr(b.byggelaanRenter)]] : []),
    ...(b.brukBL && b.etableringsgebyr > 0 ? [['Etableringsgebyr', kr(b.etableringsgebyr), kr(0), kr(b.etableringsgebyr)]] : []),
  ];
  autoTable(doc, {
    ...tabellStil,
    startY: 45,
    head: [['Post', 'Budsjett', 'Brukt', 'Rest']],
    body: [...grupperRader, ...tilleggsrader],
    foot: [['Totalt', kr(b.totalBudsjett), kr(b.sumFaktisk), rest(b.totalBudsjett, b.sumFaktisk)]],
    footStyles: { fillColor: [238, 241, 246], textColor: NAVY, fontStyle: 'bold', fontSize: 10.5, cellPadding: { top: 4, bottom: 4, left: 4, right: 4 }, halign: 'right' },
    // marker "Sum kostnadslinjer"-raden litt tydeligere
    didParseCell: (d) => {
      if (d.section === 'body' && d.row.index === grupperRader.length && d.column.index === 0) {
        d.cell.styles.fontStyle = 'bold';
      }
      if (d.section === 'foot') d.cell.styles.halign = d.column.index === 0 ? 'left' : 'right';
    },
  });

  // ── Detaljert spesifikasjon ──
  const y = doc.lastAutoTable.finalY + 14;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...NAVY);
  doc.text('Detaljert spesifikasjon', M, y);
  autoTable(doc, {
    ...tabellStil,
    startY: y + 4,
    head: [['Beskrivelse', 'Rom', 'Enhet', 'Type', 'Status', 'Budsjett', 'Brukt', 'Rest']],
    body: b.poster.map((p) => [
      p.beskrivelse || '', p.rom || '', p.enhet || '', TYPE_LBL[p.type] || '', STATUS_LBL[p.status] || '',
      kr(Number(p.budsjettert || 0)), kr(Number(p.faktisk || 0)), rest(Number(p.budsjettert || 0), Number(p.faktisk || 0)),
    ]),
    styles: { ...tabellStil.styles, fontSize: 8.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3.5, right: 3.5 } },
    columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
  });

  // ── Sidefot ──
  const sider = doc.internal.getNumberOfPages();
  for (let i = 1; i <= sider; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(...LINJE); doc.setLineWidth(0.3); doc.line(M, h - 12, 210 - M, h - 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAA);
    doc.text('EiendomsPRO  ·  Byggelånsbudsjett', M, h - 7);
    doc.text(`Side ${i} av ${sider}`, 210 - M, h - 7, { align: 'right' });
  }

  doc.save(`byggelaansbudsjett-${(adresse || 'bygg').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}

export async function exportExcel({ form, totalLeie, faste, vedlikeholdKr, netto, totalKostnader }) {
  const XLSX = await lastXLSX();
  const rows = buildPrognoseRader(form, totalLeie, faste, vedlikeholdKr);
  const adresse = `${form.gatenavn || ''} ${form.gatenummer || ''}, ${form.poststed || ''}`.trim();

  // Månedlig oppsummering
  const summary = [
    ['Utleier Pro — Budsjettrapport', ''],
    ['Eiendom', adresse],
    ['Dato', new Date().toLocaleDateString('nb-NO')],
    [],
    ['MÅNEDLIG BUDSJETT', 'Per mnd (NOK)', 'Per år (NOK)'],
    ...((form.leieinntekter || []).filter(l => l.belop).map(l => [l.navn || 'Leieobjekt', Number(l.belop), Number(l.belop) * 12])),
    ['Total leieinntekt', Math.round(totalLeie), Math.round(totalLeie * 12)],
    [],
    ['Total kostnader', Math.round(totalKostnader), Math.round(totalKostnader * 12)],
    ['Netto kontantstrøm', Math.round(netto), Math.round(netto * 12)],
  ];

  // 10-årsrad
  const progHeader = ['År', 'Brutto leie', 'Ledighet', 'Drift', 'Vedlikehold', 'Netto leieinnt.', 'Renter', 'Avdrag', 'Skatt', 'Rentefradrag', 'Kontantstrøm', 'Boligverdi', 'Boliglån', 'LTV %', 'Egenkapital'];
  const progRows = rows.map(r => [r.aar, r.bruttoLeie, r.ledighet, r.drift, r.vedlikehold, r.nettoLeieinntekt, r.renter, r.avdrag, r.skatt, r.rentefradrag, r.kontantstrøm, r.boligverdi, r.boliglaan, r.ltv, r.egenkapital]);

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(summary);
  ws1['!cols'] = [{ wch: 35 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Budsjett');

  const ws2 = XLSX.utils.aoa_to_sheet([progHeader, ...progRows]);
  ws2['!cols'] = progHeader.map(() => ({ wch: 16 }));
  XLSX.utils.book_append_sheet(wb, ws2, '10-års prognose');

  XLSX.writeFile(wb, `utleier-pro-${(adresse || 'budsjett').replace(/\s+/g, '-').toLowerCase()}.xlsx`);
}

export async function exportPDF({ form, totalLeie, faste, vedlikeholdKr, netto, totalKostnader }) {
  const { jsPDF, autoTable } = await lastJsPDF();
  const rows = buildPrognoseRader(form, totalLeie, faste, vedlikeholdKr);
  const adresse = `${form.gatenavn || ''} ${form.gatenummer || ''}, ${form.poststed || ''}`.trim();

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(74, 222, 128);
  doc.text('Utleier Pro — Budsjettrapport', 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(adresse, 14, 26);
  doc.text(`Dato: ${new Date().toLocaleDateString('nb-NO')}  |  Skattemodus: ${form.skattemodus === 'selskap' ? 'Selskap (AS)' : 'Privat'}`, 14, 33);

  // Månedlig budsjett-tabell
  doc.setFontSize(12);
  doc.setTextColor(226, 232, 240);
  doc.text('Månedlig budsjett', 14, 44);

  const leiRader = (form.leieinntekter || []).filter(l => l.belop).map(l => [l.navn || 'Leieobjekt', Number(l.belop).toLocaleString('nb-NO') + ' kr', (Number(l.belop) * 12).toLocaleString('nb-NO') + ' kr']);

  autoTable(doc, {
    startY: 48,
    head: [['Post', 'Per mnd', 'Per år']],
    body: [
      ...leiRader,
      ['Total leieinntekt', Math.round(totalLeie).toLocaleString('nb-NO') + ' kr', Math.round(totalLeie * 12).toLocaleString('nb-NO') + ' kr'],
      ['Total kostnader', Math.round(totalKostnader).toLocaleString('nb-NO') + ' kr', Math.round(totalKostnader * 12).toLocaleString('nb-NO') + ' kr'],
      ['Netto kontantstrøm', Math.round(netto).toLocaleString('nb-NO') + ' kr', Math.round(netto * 12).toLocaleString('nb-NO') + ' kr'],
    ],
    styles: { fontSize: 9, cellPadding: 3, textColor: [226, 232, 240], fillColor: [18, 18, 42] },
    headStyles: { fillColor: [30, 30, 58], textColor: [74, 222, 128], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [14, 14, 34] },
    margin: { left: 14, right: 14 },
  });

  // 10-årstabellen
  const afterBudsjett = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setTextColor(226, 232, 240);
  doc.text('10-års prognose', 14, afterBudsjett);

  autoTable(doc, {
    startY: afterBudsjett + 4,
    head: [['År', 'Brutto leie', 'Ledighet', 'Netto leieinnt.', 'Renter', 'Avdrag', 'Skatt', 'Kontantstrøm', 'Boligverdi', 'LTV%', 'Egenkapital']],
    body: rows.map(r => [
      r.aar,
      r.bruttoLeie.toLocaleString('nb-NO'),
      r.ledighet.toLocaleString('nb-NO'),
      r.nettoLeieinntekt.toLocaleString('nb-NO'),
      r.renter.toLocaleString('nb-NO'),
      r.avdrag.toLocaleString('nb-NO'),
      r.skatt.toLocaleString('nb-NO'),
      r.kontantstrøm.toLocaleString('nb-NO'),
      r.boligverdi.toLocaleString('nb-NO'),
      r.ltv + ' %',
      r.egenkapital.toLocaleString('nb-NO'),
    ]),
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [226, 232, 240], fillColor: [18, 18, 42] },
    headStyles: { fillColor: [30, 30, 58], textColor: [232, 255, 71], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [14, 14, 34] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`utleier-pro-${(adresse || 'budsjett').replace(/\s+/g, '-').toLowerCase()}.pdf`);
}
