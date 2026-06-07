import { useState, useMemo } from 'react';
import {
  PieChart, TrendingUp, Receipt, Wallet, LineChart, Coins, GitCompare,
  Download, FileDown, ChevronDown, Building2, Info,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { byggOkonomi, byggPrognose, aggreger, DRIFT_LABELS } from '../utils/byggRapport';
import { beregnSkattSamlet, KOSTNAD_LABELS } from '../utils/skatt';
import { genererRapportPDF } from '../utils/rapportPDF';
import { formatKr } from '../utils/format';

const NÅ = new Date().getFullYear();
const pct = (v) => (isFinite(v) ? `${v.toFixed(1)} %` : '–');

// ─── Rapporttyper ─────────────────────────────────────────────────────────────
const RAPPORTER = [
  { id: 'portefolje', label: 'Porteføljesammendrag', ikon: PieChart },
  { id: 'lonnsomhet', label: 'Lønnsomhet', ikon: TrendingUp },
  { id: 'sammenligning', label: 'Sammenligning', ikon: GitCompare },
  { id: 'kontantstrom', label: 'Kontantstrøm', ikon: Wallet },
  { id: 'kostnader', label: 'Kostnader', ikon: Coins },
  { id: 'verdiutvikling', label: 'Verdiutvikling', ikon: LineChart },
  { id: 'skatt', label: 'Skatt', ikon: Receipt },
];

// ─── CSV-eksport ──────────────────────────────────────────────────────────────
function lastNedCsv(navn, rader) {
  const blob = new Blob([rader.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${navn}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Hjelpekomponenter ────────────────────────────────────────────────────────
function KPI({ label, verdi, farge = '#2A2D33', sub }) {
  return (
    <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-4">
      <div className="text-xs text-[#7A7D83] mb-1">{label}</div>
      <div className="text-lg font-bold num" style={{ color: farge, fontFamily: 'DM Mono, monospace' }}>{verdi}</div>
      {sub && <div className="text-xs text-[#7A7D83] mt-0.5">{sub}</div>}
    </div>
  );
}

function Tabell({ kolonner, rader, sumRad }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#E9E8E2]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F1F1ED] border-b border-[#E9E8E2]">
            {kolonner.map((k, i) => (
              <th key={k} className={`px-4 py-3 text-xs font-medium text-[#7A7D83] ${i === 0 ? 'text-left' : 'text-right'}`}>{k}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rader.map((r, ri) => (
            <tr key={ri} className="border-b border-[#E9E8E2]/50 hover:bg-black/[0.02] transition-colors">
              {r.map((celle, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? 'text-[#1A1B1E]' : 'text-right num text-[#4B4E54]'}`}
                  style={ci > 0 ? { fontFamily: 'DM Mono, monospace' } : {}}>
                  {celle}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {sumRad && (
          <tfoot>
            <tr className="border-t border-[#E9E8E2] bg-[#F1F1ED] font-semibold">
              {sumRad.map((celle, ci) => (
                <td key={ci} className={`px-4 py-3 ${ci === 0 ? 'text-[#1A1B1E]' : 'text-right num text-[#1A1B1E]'}`}
                  style={ci > 0 ? { fontFamily: 'DM Mono, monospace' } : {}}>
                  {celle}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function EksportRad({ onCsv, onPdf }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={onPdf}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] transition-all cursor-pointer">
        <FileDown size={14} /> PDF
      </button>
      <button onClick={onCsv}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] transition-all cursor-pointer">
        <Download size={14} /> CSV
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PORTEFØLJESAMMENDRAG
// ════════════════════════════════════════════════════════════════════════════
function Portefolje({ okonomi }) {
  const agg = aggreger(okonomi);
  function eksport() {
    const r = ['Bygg;Verdi;Gjeld;Egenkapital;Brutto leie/år;NOI/år;Kontantstrøm/år;Brutto yield;Netto yield;LTV'];
    okonomi.forEach((b) => r.push(`${b.navn};${Math.round(b.verdi)};${Math.round(b.gjeld)};${Math.round(b.egenkapital)};${Math.round(b.bruttoAar)};${Math.round(b.noiAar)};${Math.round(b.kontantstromAar)};${b.bruttoYield.toFixed(1)};${b.nettoYield.toFixed(1)};${b.ltv.toFixed(1)}`));
    r.push(`SUM;${Math.round(agg.verdi)};${Math.round(agg.gjeld)};${Math.round(agg.egenkapital)};${Math.round(agg.bruttoAar)};${Math.round(agg.noiAar)};${Math.round(agg.kontantstromAar)};${agg.bruttoYield.toFixed(1)};${agg.nettoYield.toFixed(1)};${agg.ltv.toFixed(1)}`);
    lastNedCsv('Portefoljesammendrag', r);
  }
  function eksportPdf() {
    genererRapportPDF({
      tittel: 'Porteføljesammendrag', undertittel: `${agg.antall} bygg`, filnavn: 'Portefoljesammendrag',
      kpis: [
        { label: 'Samlet verdi', verdi: formatKr(agg.verdi) },
        { label: 'Samlet gjeld', verdi: formatKr(agg.gjeld) },
        { label: 'Egenkapital', verdi: formatKr(agg.egenkapital) },
        { label: 'Kontantstrøm/år', verdi: formatKr(agg.kontantstromAar) },
      ],
      seksjoner: [{
        tittel: 'Per bygg',
        kolonner: ['Bygg', 'Verdi', 'Gjeld', 'EK', 'Brutto/år', 'NOI/år', 'Yield', 'LTV'],
        rader: okonomi.map((b) => [b.navn, formatKr(b.verdi), formatKr(b.gjeld), formatKr(b.egenkapital), formatKr(b.bruttoAar), formatKr(b.noiAar), pct(b.nettoYield), pct(b.ltv)]),
        sumRad: ['Sum', formatKr(agg.verdi), formatKr(agg.gjeld), formatKr(agg.egenkapital), formatKr(agg.bruttoAar), formatKr(agg.noiAar), pct(agg.nettoYield), pct(agg.ltv)],
      }],
    });
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><EksportRad onCsv={eksport} onPdf={eksportPdf} /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Samlet verdi" verdi={formatKr(agg.verdi)} farge="#15803D" sub={`${agg.antall} bygg`} />
        <KPI label="Samlet gjeld" verdi={formatKr(agg.gjeld)} farge="#DC2626" sub={`LTV ${pct(agg.ltv)}`} />
        <KPI label="Egenkapital" verdi={formatKr(agg.egenkapital)} farge="#4D7C0F" />
        <KPI label="Kontantstrøm/år" verdi={formatKr(agg.kontantstromAar)} farge={agg.kontantstromAar >= 0 ? '#15803D' : '#DC2626'} sub={`${formatKr(agg.kontantstromMnd)}/mnd`} />
      </div>
      <Tabell
        kolonner={['Bygg', 'Verdi', 'Gjeld', 'EK', 'Brutto/år', 'NOI/år', 'Yield', 'LTV']}
        rader={okonomi.map((b) => [
          b.navn, formatKr(b.verdi), formatKr(b.gjeld), formatKr(b.egenkapital),
          formatKr(b.bruttoAar), formatKr(b.noiAar), pct(b.nettoYield), pct(b.ltv),
        ])}
        sumRad={['Sum', formatKr(agg.verdi), formatKr(agg.gjeld), formatKr(agg.egenkapital), formatKr(agg.bruttoAar), formatKr(agg.noiAar), pct(agg.nettoYield), pct(agg.ltv)]}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LØNNSOMHET
// ════════════════════════════════════════════════════════════════════════════
function Lonnsomhet({ okonomi }) {
  const agg = aggreger(okonomi);
  function eksport() {
    const r = ['Bygg;Brutto leie/år;Driftskostnader/år;NOI/år;Brutto yield;Netto yield;ROE'];
    okonomi.forEach((b) => r.push(`${b.navn};${Math.round(b.bruttoAar)};${Math.round(b.driftAar)};${Math.round(b.noiAar)};${b.bruttoYield.toFixed(1)};${b.nettoYield.toFixed(1)};${b.roe.toFixed(1)}`));
    lastNedCsv('Lonnsomhetsrapport', r);
  }
  function eksportPdf() {
    genererRapportPDF({
      tittel: 'Lønnsomhetsrapport', filnavn: 'Lonnsomhetsrapport',
      kpis: [
        { label: 'Brutto leie/år', verdi: formatKr(agg.bruttoAar) },
        { label: 'Driftskostnader/år', verdi: formatKr(agg.driftAar) },
        { label: 'NOI/år', verdi: formatKr(agg.noiAar) },
        { label: 'Snitt netto yield', verdi: pct(agg.nettoYield) },
      ],
      seksjoner: [{
        kolonner: ['Bygg', 'Brutto/år', 'Drift/år', 'NOI/år', 'Brutto yield', 'Netto yield', 'ROE'],
        rader: okonomi.map((b) => [b.navn, formatKr(b.bruttoAar), formatKr(b.driftAar), formatKr(b.noiAar), pct(b.bruttoYield), pct(b.nettoYield), pct(b.roe)]),
        sumRad: ['Sum/snitt', formatKr(agg.bruttoAar), formatKr(agg.driftAar), formatKr(agg.noiAar), pct(agg.bruttoYield), pct(agg.nettoYield), '–'],
      }],
      notat: 'NOI = brutto leie − driftskostnader, før lånekostnader. Yield beregnes mot total investering (kjøpesum + oppussing).',
    });
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><EksportRad onCsv={eksport} onPdf={eksportPdf} /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Brutto leie/år" verdi={formatKr(agg.bruttoAar)} farge="#15803D" />
        <KPI label="Driftskostnader/år" verdi={formatKr(agg.driftAar)} farge="#DC2626" />
        <KPI label="NOI/år" verdi={formatKr(agg.noiAar)} farge="#4D7C0F" sub="Netto driftsresultat" />
        <KPI label="Snitt netto yield" verdi={pct(agg.nettoYield)} farge="#9A7A24" />
      </div>
      <Tabell
        kolonner={['Bygg', 'Brutto leie/år', 'Driftskostn./år', 'NOI/år', 'Brutto yield', 'Netto yield', 'ROE']}
        rader={okonomi.map((b) => [
          b.navn, formatKr(b.bruttoAar), formatKr(b.driftAar), formatKr(b.noiAar),
          pct(b.bruttoYield), pct(b.nettoYield), pct(b.roe),
        ])}
        sumRad={['Sum / snitt', formatKr(agg.bruttoAar), formatKr(agg.driftAar), formatKr(agg.noiAar), pct(agg.bruttoYield), pct(agg.nettoYield), '–']}
      />
      <InfoBoks>NOI (Net Operating Income) = brutto leie − driftskostnader, før lånekostnader. Yield beregnes mot total investering (kjøpesum + oppussing).</InfoBoks>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KONTANTSTRØM
// ════════════════════════════════════════════════════════════════════════════
function Kontantstrom({ okonomi }) {
  const agg = aggreger(okonomi);
  function eksport() {
    const r = ['Bygg;Brutto leie/mnd;Drift/mnd;Termin/mnd;Renter/mnd;Avdrag/mnd;Kontantstrøm/mnd;Kontantstrøm/år'];
    okonomi.forEach((b) => r.push(`${b.navn};${Math.round(b.bruttoMnd)};${Math.round(b.driftMnd)};${Math.round(b.terminMnd)};${Math.round(b.renterMnd)};${Math.round(b.avdragMnd)};${Math.round(b.kontantstromMnd)};${Math.round(b.kontantstromAar)}`));
    lastNedCsv('Kontantstromrapport', r);
  }
  function eksportPdf() {
    genererRapportPDF({
      tittel: 'Kontantstrømrapport', filnavn: 'Kontantstromrapport',
      kpis: [
        { label: 'Brutto leie/mnd', verdi: formatKr(agg.bruttoMnd) },
        { label: 'Kontantstrøm/mnd', verdi: formatKr(agg.kontantstromMnd) },
        { label: 'Kontantstrøm/år', verdi: formatKr(agg.kontantstromAar) },
        { label: 'Avdrag/år', verdi: formatKr(okonomi.reduce((s, b) => s + b.avdragMnd * 12, 0)) },
      ],
      seksjoner: [{
        kolonner: ['Bygg', 'Brutto/mnd', 'Drift/mnd', 'Termin/mnd', 'Renter/mnd', 'Avdrag/mnd', 'Kontantstrøm/mnd'],
        rader: okonomi.map((b) => [b.navn, formatKr(b.bruttoMnd), formatKr(b.driftMnd), formatKr(b.terminMnd), formatKr(b.renterMnd), formatKr(b.avdragMnd), formatKr(b.kontantstromMnd)]),
        sumRad: ['Sum', formatKr(agg.bruttoMnd), formatKr(okonomi.reduce((s,b)=>s+b.driftMnd,0)), formatKr(okonomi.reduce((s,b)=>s+b.terminMnd,0)), formatKr(okonomi.reduce((s,b)=>s+b.renterMnd,0)), formatKr(okonomi.reduce((s,b)=>s+b.avdragMnd,0)), formatKr(agg.kontantstromMnd)],
      }],
    });
  }
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><EksportRad onCsv={eksport} onPdf={eksportPdf} /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Brutto leie/mnd" verdi={formatKr(agg.bruttoMnd)} farge="#15803D" />
        <KPI label="Kontantstrøm/mnd" verdi={formatKr(agg.kontantstromMnd)} farge={agg.kontantstromMnd >= 0 ? '#15803D' : '#DC2626'} />
        <KPI label="Kontantstrøm/år" verdi={formatKr(agg.kontantstromAar)} farge={agg.kontantstromAar >= 0 ? '#15803D' : '#DC2626'} />
        <KPI label="Avdrag/år (formuesbygging)" verdi={formatKr(okonomi.reduce((s, b) => s + b.avdragMnd * 12, 0))} farge="#2563EB" />
      </div>
      <Tabell
        kolonner={['Bygg', 'Brutto/mnd', 'Drift/mnd', 'Termin/mnd', 'Renter/mnd', 'Avdrag/mnd', 'Kontantstrøm/mnd']}
        rader={okonomi.map((b) => [
          b.navn, formatKr(b.bruttoMnd), formatKr(b.driftMnd), formatKr(b.terminMnd),
          formatKr(b.renterMnd), formatKr(b.avdragMnd), formatKr(b.kontantstromMnd),
        ])}
        sumRad={['Sum', formatKr(agg.bruttoMnd), formatKr(okonomi.reduce((s,b)=>s+b.driftMnd,0)), formatKr(okonomi.reduce((s,b)=>s+b.terminMnd,0)), formatKr(okonomi.reduce((s,b)=>s+b.renterMnd,0)), formatKr(okonomi.reduce((s,b)=>s+b.avdragMnd,0)), formatKr(agg.kontantstromMnd)]}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KOSTNADER
// ════════════════════════════════════════════════════════════════════════════
function Kostnader({ okonomi }) {
  const kategorier = Object.keys(DRIFT_LABELS);
  const sumPerKat = {};
  kategorier.forEach((k) => { sumPerKat[k] = okonomi.reduce((s, b) => s + (b.kostnader[k] || 0) * 12, 0); });
  const total = Object.values(sumPerKat).reduce((s, v) => s + v, 0);

  function eksport() {
    const r = ['Kategori;Kr/år;Andel %'];
    kategorier.forEach((k) => { if (sumPerKat[k]) r.push(`${DRIFT_LABELS[k]};${Math.round(sumPerKat[k])};${total ? ((sumPerKat[k]/total)*100).toFixed(1) : 0}`); });
    r.push(`SUM;${Math.round(total)};100`);
    lastNedCsv('Kostnadsrapport', r);
  }
  function eksportPdf() {
    const sortert = kategorier.filter((k) => sumPerKat[k] > 0).sort((a, b) => sumPerKat[b] - sumPerKat[a]);
    genererRapportPDF({
      tittel: 'Kostnadsrapport', filnavn: 'Kostnadsrapport',
      kpis: [
        { label: 'Driftskostnader/år', verdi: formatKr(total) },
        { label: 'Driftskostnader/mnd', verdi: formatKr(total / 12) },
        { label: 'Per bygg/år', verdi: formatKr(okonomi.length ? total / okonomi.length : 0) },
        { label: 'Antall bygg', verdi: String(okonomi.length) },
      ],
      seksjoner: [{
        tittel: 'Kostnadsfordeling',
        kolonner: ['Kategori', 'Kr/år', 'Andel'],
        rader: sortert.map((k) => [DRIFT_LABELS[k], formatKr(sumPerKat[k]), `${total ? ((sumPerKat[k]/total)*100).toFixed(0) : 0} %`]),
        sumRad: ['Sum', formatKr(total), '100 %'],
      }],
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><EksportRad onCsv={eksport} onPdf={eksportPdf} /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Driftskostnader/år" verdi={formatKr(total)} farge="#DC2626" />
        <KPI label="Driftskostnader/mnd" verdi={formatKr(total / 12)} farge="#DC2626" />
        <KPI label="Per bygg/år (snitt)" verdi={formatKr(okonomi.length ? total / okonomi.length : 0)} farge="#4B4E54" />
        <KPI label="Antall bygg" verdi={String(okonomi.length)} farge="#4B4E54" />
      </div>
      {/* Fordeling */}
      <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5">
        <h3 className="text-sm font-semibold text-[#1A1B1E] mb-4">Kostnadsfordeling per kategori</h3>
        <div className="space-y-2.5">
          {kategorier.filter((k) => sumPerKat[k] > 0).sort((a, b) => sumPerKat[b] - sumPerKat[a]).map((k) => {
            const andel = total ? (sumPerKat[k] / total) * 100 : 0;
            return (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#4B4E54]">{DRIFT_LABELS[k]}</span>
                  <span className="num text-[#1A1B1E]">{formatKr(sumPerKat[k])}/år <span className="text-[#7A7D83]">({andel.toFixed(0)} %)</span></span>
                </div>
                <div className="h-1.5 bg-[#E9E8E2] rounded-full overflow-hidden">
                  <div className="h-full bg-[#DC2626]/60 rounded-full" style={{ width: `${andel}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SAMMENLIGNING
// ════════════════════════════════════════════════════════════════════════════
function Sammenligning({ okonomi }) {
  if (okonomi.length < 2) {
    return (
      <div className="text-center py-16">
        <GitCompare size={28} className="text-[#AEB0B4] mx-auto mb-3" />
        <div className="text-sm font-medium text-[#1A1B1E] mb-1">Trenger minst to bygg</div>
        <div className="text-xs text-[#7A7D83]">Legg inn flere bygg for å sammenligne lønnsomhet. (Sjekk at filteret ikke begrenser utvalget.)</div>
      </div>
    );
  }

  // Metrikker: høyere er bedre unntatt LTV
  const metrikker = [
    { key: 'nettoYield', label: 'Netto yield', format: pct, bedre: 'hoy' },
    { key: 'kontantstromMnd', label: 'Kontantstrøm/mnd', format: formatKr, bedre: 'hoy' },
    { key: 'roe', label: 'ROE', format: pct, bedre: 'hoy' },
    { key: 'noiAar', label: 'NOI/år', format: formatKr, bedre: 'hoy' },
    { key: 'ltv', label: 'LTV', format: pct, bedre: 'lav' },
  ];

  // Beste/dårligste per metrikk
  const ekstrem = {};
  metrikker.forEach((m) => {
    const verdier = okonomi.map((b) => b[m.key]);
    ekstrem[m.key] = {
      best: m.bedre === 'hoy' ? Math.max(...verdier) : Math.min(...verdier),
      verst: m.bedre === 'hoy' ? Math.min(...verdier) : Math.max(...verdier),
    };
  });

  // Vinner: høyest netto yield
  const vinner = [...okonomi].sort((a, b) => b.nettoYield - a.nettoYield)[0];

  function eksport() {
    const r = ['Bygg;' + metrikker.map((m) => m.label).join(';')];
    okonomi.forEach((b) => r.push(`${b.navn};${metrikker.map((m) => Math.round(b[m.key] * 10) / 10).join(';')}`));
    lastNedCsv('Sammenligning', r);
  }
  function eksportPdf() {
    genererRapportPDF({
      tittel: 'Boligsammenligning', filnavn: 'Sammenligning',
      kpis: [
        { label: 'Mest lønnsomme bolig', verdi: vinner.navn },
        { label: 'Netto yield', verdi: pct(vinner.nettoYield) },
        { label: 'Kontantstrøm/mnd', verdi: formatKr(vinner.kontantstromMnd) },
        { label: 'Antall bygg', verdi: String(okonomi.length) },
      ],
      seksjoner: [{
        kolonner: ['Bygg', ...metrikker.map((m) => m.label)],
        rader: okonomi.map((b) => [b.navn, ...metrikker.map((m) => m.format(b[m.key]))]),
      }],
      notat: 'Beste verdi per nøkkeltall er uthevet i appen. Mest lønnsomme bolig rangeres etter netto yield.',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><EksportRad onCsv={eksport} onPdf={eksportPdf} /></div>

      {/* Vinner-kort */}
      <div className="rounded-xl p-5 border" style={{ borderColor: 'rgba(74,222,128,0.25)', background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.02))' }}>
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={15} className="text-[#15803D]" />
          <span className="text-xs font-medium text-[#15803D] uppercase tracking-wider">Mest lønnsomme bolig</span>
        </div>
        <div className="text-xl font-bold text-[#1A1B1E]">{vinner.navn}</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm">
          <span className="text-[#65696F]">Netto yield <span className="text-[#15803D] num font-medium">{pct(vinner.nettoYield)}</span></span>
          <span className="text-[#65696F]">Kontantstrøm <span className="text-[#15803D] num font-medium">{formatKr(vinner.kontantstromMnd)}/mnd</span></span>
          <span className="text-[#65696F]">ROE <span className="text-[#15803D] num font-medium">{pct(vinner.roe)}</span></span>
        </div>
      </div>

      {/* Sammenligningstabell med uthevet best/verst */}
      <div className="overflow-x-auto rounded-xl border border-[#E9E8E2]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F1F1ED] border-b border-[#E9E8E2]">
              <th className="px-4 py-3 text-xs font-medium text-[#7A7D83] text-left">Bygg</th>
              {metrikker.map((m) => (
                <th key={m.key} className="px-4 py-3 text-xs font-medium text-[#7A7D83] text-right">{m.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {okonomi.map((b) => (
              <tr key={b.id} className="border-b border-[#E9E8E2]/50 hover:bg-black/[0.02] transition-colors">
                <td className="px-4 py-3 text-[#1A1B1E]">{b.navn}</td>
                {metrikker.map((m) => {
                  const v = b[m.key];
                  const erBest = Math.abs(v - ekstrem[m.key].best) < 0.001;
                  const erVerst = Math.abs(v - ekstrem[m.key].verst) < 0.001 && okonomi.length > 1;
                  const farge = erBest ? '#15803D' : erVerst ? '#DC2626' : '#4B4E54';
                  return (
                    <td key={m.key} className="px-4 py-3 text-right num" style={{ fontFamily: 'DM Mono, monospace', color: farge, fontWeight: erBest ? 600 : 400 }}>
                      {m.format(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <InfoBoks><span className="text-[#15803D]">Grønn</span> = beste verdi, <span className="text-[#DC2626]">rød</span> = svakeste verdi per nøkkeltall. Lav LTV regnes som best (mindre belåning).</InfoBoks>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VERDIUTVIKLING
// ════════════════════════════════════════════════════════════════════════════
function Verdiutvikling({ byggListe, leieobjekter }) {
  // Aggreger prognose over alle valgte bygg
  const prognoser = byggListe.map((b) => byggPrognose(b, leieobjekter, 10));
  const samlet = [];
  for (let i = 0; i < 10; i++) {
    samlet.push({
      aar: i + 1,
      verdi: prognoser.reduce((s, p) => s + (p[i]?.verdi || 0), 0),
      restGjeld: prognoser.reduce((s, p) => s + (p[i]?.restGjeld || 0), 0),
      egenkapital: prognoser.reduce((s, p) => s + (p[i]?.egenkapital || 0), 0),
      noi: prognoser.reduce((s, p) => s + (p[i]?.noi || 0), 0),
    });
  }
  function eksport() {
    const r = ['År;Eiendomsverdi;Restgjeld;Egenkapital;NOI'];
    samlet.forEach((s) => r.push(`${s.aar};${Math.round(s.verdi)};${Math.round(s.restGjeld)};${Math.round(s.egenkapital)};${Math.round(s.noi)}`));
    lastNedCsv('Verdiutvikling-10ar', r);
  }
  const sisteEK = samlet[9]?.egenkapital || 0;
  const forsteEK = byggListe.reduce((s, b) => s + byggOkonomi(b, leieobjekter).egenkapital, 0);
  function eksportPdf() {
    genererRapportPDF({
      tittel: 'Verdiutvikling', undertittel: '10-års prognose', filnavn: 'Verdiutvikling-10ar',
      kpis: [
        { label: 'EK i dag', verdi: formatKr(forsteEK) },
        { label: 'EK om 10 år', verdi: formatKr(sisteEK) },
        { label: 'EK-vekst', verdi: formatKr(sisteEK - forsteEK) },
        { label: 'Verdi om 10 år', verdi: formatKr(samlet[9]?.verdi || 0) },
      ],
      seksjoner: [{
        kolonner: ['År', 'Eiendomsverdi', 'Restgjeld', 'Egenkapital', 'NOI/år'],
        rader: samlet.map((s) => [String(s.aar), formatKr(s.verdi), formatKr(s.restGjeld), formatKr(s.egenkapital), formatKr(s.noi)]),
      }],
      notat: 'Prognose med verdistigning, leievekst og kostnadsvekst fra hvert byggs parametere. Restgjeld beregnes fra annuitetslån.',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><EksportRad onCsv={eksport} onPdf={eksportPdf} /></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Egenkapital i dag" verdi={formatKr(forsteEK)} farge="#4D7C0F" />
        <KPI label="EK om 10 år" verdi={formatKr(sisteEK)} farge="#15803D" />
        <KPI label="EK-vekst" verdi={formatKr(sisteEK - forsteEK)} farge="#15803D" sub="over 10 år" />
        <KPI label="Verdi om 10 år" verdi={formatKr(samlet[9]?.verdi || 0)} farge="#4B4E54" />
      </div>
      <Tabell
        kolonner={['År', 'Eiendomsverdi', 'Restgjeld', 'Egenkapital', 'NOI/år']}
        rader={samlet.map((s) => [String(s.aar), formatKr(s.verdi), formatKr(s.restGjeld), formatKr(s.egenkapital), formatKr(s.noi)])}
      />
      <InfoBoks>Prognose med verdistigning, leievekst og kostnadsvekst fra hvert byggs parametere. Restgjeld beregnes fra annuitetslån.</InfoBoks>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SKATT (med privat/AS-skille)
// ════════════════════════════════════════════════════════════════════════════
function SkatteRapport({ byggListe, leieobjekter }) {
  const [aar, setAar] = useState(NÅ);
  const [visRenter, setVisRenter] = useState(true);
  const samlet = useMemo(() => beregnSkattSamlet(byggListe, leieobjekter, aar, NÅ), [byggListe, leieobjekter, aar]);

  const privat = samlet.perBygg.filter((b) => b.skattmodus !== 'as');
  const asBygg = samlet.perBygg.filter((b) => b.skattmodus === 'as');
  const sumPrivat = privat.reduce((s, b) => s + (visRenter ? b.skattEtterRenter : b.skattUtleie), 0);
  const sumAsSelskap = asBygg.reduce((s, b) => s + (visRenter ? b.skattEtterRenter : b.skattUtleie), 0);
  // AS: effektiv skatt ved utbytte ≈ selskapsskatt + 37,84 % av det som tas ut
  const asResultat = asBygg.reduce((s, b) => s + (visRenter ? b.skattepliktigEtterRenter : b.nettoResultat), 0);
  const asEtterSelskapsskatt = Math.max(0, asResultat) * 0.78;
  const utbytteskatt = asEtterSelskapsskatt * 0.3784;
  const asEffektiv = sumAsSelskap + utbytteskatt;

  function eksport() {
    const r = [`Skatterapport ${aar}`, '', 'PRIVAT (22%)'];
    privat.forEach((b) => r.push(`${b.navn};netto ${Math.round(b.nettoResultat)};skatt ${Math.round(visRenter ? b.skattEtterRenter : b.skattUtleie)}`));
    r.push(`Sum privat skatt;${Math.round(sumPrivat)}`, '', 'AS (selskapsskatt 22%)');
    asBygg.forEach((b) => r.push(`${b.navn};netto ${Math.round(b.nettoResultat)};skatt ${Math.round(visRenter ? b.skattEtterRenter : b.skattUtleie)}`));
    r.push(`Sum selskapsskatt;${Math.round(sumAsSelskap)}`, `Effektiv skatt ved utbytte;${Math.round(asEffektiv)}`);
    lastNedCsv(`Skatterapport-${aar}`, r);
  }
  function eksportPdf() {
    const seksjoner = [];
    if (privat.length) seksjoner.push({
      tittel: 'Privat utleie — 22 % flat skatt',
      kolonner: ['Bygg', 'Brutto leie', 'Driftskostn.', 'Netto', 'Skatt 22 %'],
      rader: privat.map((b) => [b.navn, formatKr(b.bruttoLeie), formatKr(b.sumDrift), formatKr(b.nettoResultat), formatKr(visRenter ? b.skattEtterRenter : b.skattUtleie)]),
      sumRad: ['Sum privat', '', '', '', formatKr(sumPrivat)],
    });
    if (asBygg.length) seksjoner.push({
      tittel: 'Aksjeselskap (AS) — 22 % selskapsskatt',
      kolonner: ['Bygg', 'Brutto leie', 'Driftskostn.', 'Netto', 'Selskapsskatt'],
      rader: asBygg.map((b) => [b.navn, formatKr(b.bruttoLeie), formatKr(b.sumDrift), formatKr(b.nettoResultat), formatKr(visRenter ? b.skattEtterRenter : b.skattUtleie)]),
      sumRad: ['Sum selskapsskatt', '', '', '', formatKr(sumAsSelskap)],
    });
    if (asBygg.length) seksjoner.push({
      tittel: 'AS — effektiv skatt ved uttak av overskudd',
      kolonner: ['Post', 'Beløp'],
      rader: [
        ['Selskapsskatt (22 %)', formatKr(sumAsSelskap)],
        ['+ Utbytteskatt ved uttak (37,84 %)', formatKr(utbytteskatt)],
      ],
      sumRad: ['= Effektiv skatt ved uttak', formatKr(asEffektiv)],
    });
    genererRapportPDF({
      tittel: 'Skatterapport', undertittel: `Inntektsår ${aar}`, filnavn: `Skatterapport-${aar}`,
      kpis: [
        { label: 'Skatt privat', verdi: formatKr(sumPrivat) },
        { label: 'Selskapsskatt AS', verdi: formatKr(sumAsSelskap) },
        { label: 'Effektiv AS ved uttak', verdi: formatKr(asEffektiv) },
      ],
      seksjoner,
      notat: 'Estimat til hjelp for skattemeldingen (RF-1159). Privat: 22 % av netto. AS: 22 % selskapsskatt + 37,84 % utbytteskatt ved uttak (effektivt ca. 51,5 %). Kontroller mot egne bilag.',
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={aar} onChange={(e) => setAar(Number(e.target.value))}
              className="appearance-none bg-[#FFFFFF] border border-[#E9E8E2] rounded-lg pl-3 pr-9 py-2 text-sm text-[#1A1B1E] outline-none focus:border-[#DCDAD2] cursor-pointer">
              {[NÅ - 1, NÅ, NÅ + 1].map((y) => <option key={y} value={y}>{y}{y === NÅ ? ' (i år)' : y > NÅ ? ' (prognose)' : ''}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7D83] pointer-events-none" />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#65696F] cursor-pointer">
            <input type="checkbox" checked={visRenter} onChange={(e) => setVisRenter(e.target.checked)} className="accent-[#15803D]" />
            Inkluder gjeldsrenter
          </label>
        </div>
        <EksportRad onCsv={eksport} onPdf={eksportPdf} />
      </div>

      {/* Privat-seksjon */}
      {privat.length > 0 && (
        <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1A1B1E]">Privat utleie <span className="text-xs text-[#7A7D83] font-normal">· 22 % flat skatt</span></h3>
            <span className="text-sm font-semibold num text-[#9A7A24]">{formatKr(sumPrivat)}</span>
          </div>
          <Tabell
            kolonner={['Bygg', 'Brutto leie', 'Driftskostn.', 'Netto', 'Skatt 22 %']}
            rader={privat.map((b) => [b.navn, formatKr(b.bruttoLeie), formatKr(b.sumDrift), formatKr(b.nettoResultat), formatKr(visRenter ? b.skattEtterRenter : b.skattUtleie)])}
          />
        </div>
      )}

      {/* AS-seksjon */}
      {asBygg.length > 0 && (
        <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#1A1B1E]">Aksjeselskap (AS) <span className="text-xs text-[#7A7D83] font-normal">· 22 % selskapsskatt</span></h3>
            <span className="text-sm font-semibold num text-[#9A7A24]">{formatKr(sumAsSelskap)}</span>
          </div>
          <Tabell
            kolonner={['Bygg', 'Brutto leie', 'Driftskostn.', 'Netto', 'Selskapsskatt']}
            rader={asBygg.map((b) => [b.navn, formatKr(b.bruttoLeie), formatKr(b.sumDrift), formatKr(b.nettoResultat), formatKr(visRenter ? b.skattEtterRenter : b.skattUtleie)])}
          />
          <div className="mt-4 bg-[#F6F6F4] border border-[#9A7A24]/20 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[#65696F]">Selskapsskatt (22 %)</span><span className="num text-[#1A1B1E]">{formatKr(sumAsSelskap)}</span></div>
            <div className="flex justify-between"><span className="text-[#65696F]">+ Utbytteskatt ved uttak (37,84 %)</span><span className="num text-[#1A1B1E]">{formatKr(utbytteskatt)}</span></div>
            <div className="flex justify-between border-t border-[#E9E8E2] pt-2 font-semibold"><span className="text-[#9A7A24]">= Effektiv skatt hvis du tar ut overskuddet</span><span className="num text-[#9A7A24]">{formatKr(asEffektiv)}</span></div>
            <p className="text-xs text-[#7A7D83] pt-1">Lar du overskuddet stå i selskapet, betaler du bare selskapsskatten på 22 %.</p>
          </div>
        </div>
      )}

      <InfoBoks>
        Estimat til hjelp for skattemeldingen (RF-1159). Privat utleie skattlegges 22 % av netto. AS betaler 22 % selskapsskatt, og ytterligere 37,84 % utbytteskatt når du tar pengene ut — effektivt ca. 51,5 %. Kontroller mot egne bilag før innsending.
      </InfoBoks>
    </div>
  );
}

function InfoBoks({ children }) {
  return (
    <div className="flex gap-2.5 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 leading-relaxed">
      <Info size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HOVED
// ════════════════════════════════════════════════════════════════════════════
export default function Rapporter() {
  const { bygg, leieobjekter, utleiere = [] } = useApp();
  const [rapport, setRapport] = useState('portefolje');
  const [filterBygg, setFilterBygg] = useState('alle');
  const [filterEier, setFilterEier] = useState('alle');

  // Filtrer bygg
  const valgteBygg = useMemo(() => {
    return bygg.filter((b) => {
      if (filterBygg !== 'alle' && b.id !== filterBygg) return false;
      if (filterEier === 'privat' && (b.skattemodus || 'privat') !== 'privat') return false;
      if (filterEier === 'as' && b.skattemodus !== 'as') return false;
      return true;
    });
  }, [bygg, filterBygg, filterEier]);

  const okonomi = useMemo(() => valgteBygg.map((b) => byggOkonomi(b, leieobjekter)), [valgteBygg, leieobjekter]);

  if (bygg.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Rapporter</h1>
          <p className="text-sm text-[#65696F] mt-1">Analyse og rapportering for porteføljen din</p>
        </div>
        <div className="text-center py-20">
          <PieChart size={28} className="text-[#AEB0B4] mx-auto mb-3" />
          <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen bygg registrert</div>
          <div className="text-xs text-[#7A7D83]">Legg inn byggene dine under «Mine Bygg» — så bygger rapportene seg automatisk.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1A1B1E]">Rapporter</h1>
        <p className="text-sm text-[#65696F] mt-1">Hent ut rapporter på hele porteføljen eller per bygg</p>
      </div>

      {/* Filter-rad */}
      <div className="flex flex-wrap gap-3 mb-6">
        <FilterSelect label="Bygg" value={filterBygg} onChange={setFilterBygg}
          options={[{ value: 'alle', label: 'Alle bygg' }, ...bygg.map((b) => ({ value: b.id, label: `${b.gatenavn} ${b.gatenummer}` }))]} />
        <FilterSelect label="Eierform" value={filterEier} onChange={setFilterEier}
          options={[{ value: 'alle', label: 'Alle' }, { value: 'privat', label: 'Kun privat' }, { value: 'as', label: 'Kun AS' }]} />
      </div>

      {/* Rapporttype-velger */}
      <div className="flex gap-1 mb-8 border-b border-[#E9E8E2] pb-1 overflow-x-auto">
        {RAPPORTER.map(({ id, label, ikon: Ikon }) => (
          <button key={id} type="button" onClick={() => setRapport(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer whitespace-nowrap
              ${rapport === id ? 'bg-black/[0.055] text-[#1A1B1E]' : 'text-[#65696F] hover:text-[#2A2D33] hover:bg-black/[0.03]'}`}>
            <Ikon size={15} className="shrink-0" /> {label}
          </button>
        ))}
      </div>

      {valgteBygg.length === 0 ? (
        <div className="text-center py-16 text-[#7A7D83] text-sm">Ingen bygg matcher filteret.</div>
      ) : (
        <>
          {rapport === 'portefolje' && <Portefolje okonomi={okonomi} />}
          {rapport === 'lonnsomhet' && <Lonnsomhet okonomi={okonomi} />}
          {rapport === 'sammenligning' && <Sammenligning okonomi={okonomi} />}
          {rapport === 'kontantstrom' && <Kontantstrom okonomi={okonomi} />}
          {rapport === 'kostnader' && <Kostnader okonomi={okonomi} />}
          {rapport === 'verdiutvikling' && <Verdiutvikling byggListe={valgteBygg} leieobjekter={leieobjekter} />}
          {rapport === 'skatt' && <SkatteRapport byggListe={valgteBygg} leieobjekter={leieobjekter} />}
        </>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="relative">
      <span className="absolute -top-2 left-2.5 px-1 bg-[#F6F6F4] text-[10px] text-[#7A7D83] uppercase tracking-wider">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-[#FFFFFF] border border-[#E9E8E2] rounded-lg pl-3 pr-9 py-2.5 text-sm text-[#1A1B1E] outline-none focus:border-[#DCDAD2] cursor-pointer min-w-44">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7D83] pointer-events-none" />
    </div>
  );
}
