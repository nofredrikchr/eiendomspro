import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2, AlertTriangle, ArrowRight, ExternalLink, Info, CalendarClock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatKr } from '../../utils/format';
import { hentKpiSerie, indeksFor, tilSsbMaaned, ssbMaanedTilTekst } from '../../services/ssbKpi';
import { kanReguleresNaa, nesteReguleringTekst } from '../../utils/kpi';

function ssbMinus(maaned, n) {
  const m = String(maaned).match(/(\d{4})M(\d{2})/);
  if (!m) return maaned;
  let y = +m[1], mo = +m[2] - n;
  while (mo <= 0) { mo += 12; y--; }
  return `${y}M${String(mo).padStart(2, '0')}`;
}
function yoy(serie, maaned) {
  const forrige = indeksFor(serie, ssbMinus(maaned, 12));
  if (forrige == null) return null;
  return (serie[maaned] / forrige - 1) * 100;
}
function pct(v, d = 1) { return v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(d)} %`; }
function ymOf(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function idagYM() { return ymOf(new Date()); }
function leggTilMnd(ym, n) { const [y, m] = ym.split('-').map(Number); return new Date(y, m - 1 + n, 1); }
function mndMellomYM(a, b) { const [ay, am] = a.split('-').map(Number); const [by, bm] = b.split('-').map(Number); return (by - ay) * 12 + (bm - am); }
function datoFmt(d) { return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); }

export default function KpiRegulering() {
  const { kontrakter = [] } = useApp();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [status, setStatus] = useState('laster');
  const [leie, setLeie] = useState('15000');
  const [sistReg, setSistReg] = useState('');

  useEffect(() => {
    let aktiv = true;
    hentKpiSerie().then((d) => {
      if (!aktiv) return;
      setData(d); setStatus('ok');
      // standard: leien sist regulert for ca. 12 mnd siden (fra i dag)
      setSistReg(ymOf(leggTilMnd(idagYM(), -12)));
    }).catch(() => { if (aktiv) setStatus('feil'); });
    return () => { aktiv = false; };
  }, []);

  const tabell = useMemo(() => {
    if (!data) return [];
    const mnd = Object.keys(data.serie).sort();
    return mnd.slice(-12).map((m) => ({ maaned: m, idx: data.serie[m], yoy: yoy(data.serie, m) })).reverse();
  }, [data]);

  // Standard årlig regulering = siste 12-måneders KPI-endring (siste publiserte tall)
  const annual = data ? yoy(data.serie, data.sisteMaaned) : null;
  const fraRef = data ? ssbMinus(data.sisteMaaned, 12) : null;
  const gLeie = Number(String(leie).replace(/\s/g, '').replace(',', '.')) || 0;
  const nyLeie = annual != null ? Math.round(gLeie * (1 + annual / 100)) : gLeie;
  const okning = nyLeie - gLeie;

  // Timing ut fra når leien sist ble regulert
  const idag = idagYM();
  const mndSiden = sistReg ? mndMellomYM(sistReg, idag) : null;
  const kanNaa = mndSiden != null && mndSiden >= 12;
  const tidligstRegDato = sistReg ? leggTilMnd(sistReg, 12) : null;
  const minVarsel = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 2); return d; })();
  const gjelderFra = tidligstRegDato ? new Date(Math.max(tidligstRegDato.getTime(), minVarsel.getTime())) : minVarsel;

  // Eventuell «etterslep»-figur hvis det har gått vesentlig mer enn 12 mnd
  const sidenSet = (data && sistReg)
    ? (() => { const fi = indeksFor(data.serie, tilSsbMaaned(sistReg)); return fi ? (data.sisteVerdi / fi - 1) * 100 : null; })()
    : null;
  const visEtterslep = sidenSet != null && annual != null && sidenSet > annual + 0.4 && (mndSiden || 0) >= 13;

  const kpiKontrakter = kontrakter.filter((k) => k.indeksregulering);
  function hentFraKontrakt(id) {
    const k = kontrakter.find((x) => x.id === id);
    if (!k) return;
    if (k.maanedligLeie) setLeie(String(k.maanedligLeie));
    const basis = (k.sisteRegulering || k.startdato || '').slice(0, 7);
    if (basis) setSistReg(basis);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[#1A1B1E]">KPI-regulering</h1>
        <p className="text-sm text-[#65696F] mt-1">Regn ut ny husleie etter konsumprisindeksen — med live tall fra SSB.</p>
      </div>

      {status === 'laster' && <Card><div className="flex items-center gap-2 text-sm text-[#65696F]"><Loader2 size={16} className="animate-spin" /> Henter konsumprisindeksen fra SSB …</div></Card>}
      {status === 'feil' && <Card><div className="flex items-start gap-2 text-sm text-[#65696F]"><AlertTriangle size={16} className="text-[#B45309] mt-0.5" /> Kunne ikke hente KPI-tall fra SSB akkurat nå. Prøv igjen senere.</div></Card>}

      {status === 'ok' && data && (
        <>
          <div className="grid lg:grid-cols-2 gap-6 items-start">
            {/* Kalkulator */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#16284A]/8 flex items-center justify-center"><TrendingUp size={15} className="text-[#16284A]" /></div>
                <h2 className="text-base font-semibold text-[#1A1B1E]">Regn ut ny leie</h2>
              </div>

              {kpiKontrakter.length > 0 && (
                <div className="mb-4">
                  <Select label="Hent fra leiekontrakt (valgfritt)" value="" onChange={(e) => hentFraKontrakt(e.target.value)}
                    options={kpiKontrakter.map((k) => ({ value: k.id, label: `${k.leietakerNavn || 'Uten navn'} — ${formatKr(Number(k.maanedligLeie) || 0)}` }))}
                    placeholder="Velg kontrakt …" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="Dagens månedsleie" type="number" value={leie} onChange={(e) => setLeie(e.target.value)} suffix="kr" />
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-[#65696F]">Når ble leien sist regulert?</span>
                  <input type="month" value={sistReg} max={idag} onChange={(e) => setSistReg(e.target.value)}
                    className="w-full bg-white border border-[#DCDAD2] rounded-lg text-sm text-[#1A1B1E] num px-3 py-2.5 outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all" />
                </label>
              </div>

              {/* Resultat */}
              <div className="mt-4 rounded-xl border border-[#E9E8E2] bg-[#F6F6F4] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <div className="text-xs text-[#7A7D83] mb-1">Dagens leie</div>
                    <div className="num font-semibold text-[#1A1B1E]">{formatKr(gLeie)}</div>
                  </div>
                  <ArrowRight size={16} className="text-[#7A7D83] mx-2" />
                  <div className="text-center flex-1">
                    <div className="text-xs text-[#7A7D83] mb-1">Ny leie</div>
                    <div className="num font-semibold text-[#15803D] text-lg">{formatKr(nyLeie)}</div>
                  </div>
                </div>
                <div className="text-center mt-3 pt-3 border-t border-[#E9E8E2] text-sm">
                  <span className="text-[#7A7D83]">Økning </span>
                  <span className="num font-medium text-[#9A7A24]">+{formatKr(okning)}/mnd</span>
                  <span className="text-[#7A7D83]"> ({formatKr(okning * 12)}/år) · {pct(annual)}</span>
                </div>
                <div className="text-center text-xs text-[#7A7D83] mt-2">
                  KPI-endring siste 12 mnd: {ssbMaanedTilTekst(fraRef)} → {ssbMaanedTilTekst(data.sisteMaaned)} (siste publiserte tall fra SSB).
                </div>
              </div>

              {/* Når kan du varsle / regulere */}
              <div className="mt-3 rounded-xl border border-[#16284A]/15 bg-[#16284A]/[0.04] p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <CalendarClock size={15} className="text-[#16284A]" />
                  <span className="text-sm font-medium text-[#1A1B1E]">Når kan du regulere?</span>
                </div>
                {kanNaa ? (
                  <p className="text-xs text-[#65696F] leading-relaxed">
                    Det har gått {mndSiden} måneder siden siste regulering — du kan regulere nå. Varsle leietaker skriftlig nå, så kan ny leie tidligst gjelde fra <strong className="text-[#1A1B1E]">{datoFmt(gjelderFra)}</strong> (minst én måned frem).
                  </p>
                ) : (
                  <p className="text-xs text-[#65696F] leading-relaxed">
                    Leien kan tidligst reguleres <strong className="text-[#1A1B1E]">{tidligstRegDato ? datoFmt(tidligstRegDato) : '—'}</strong> (12 måneder etter siste fastsettelse). Varsel må sendes minst én måned før.
                  </p>
                )}
                {visEtterslep && (
                  <p className="text-xs text-[#B45309] leading-relaxed mt-2">
                    Det har gått mer enn ett år siden siste regulering. Du kan velge å regulere for hele perioden ({pct(sidenSet)}) — da blir ny leie {formatKr(Math.round(gLeie * (1 + sidenSet / 100)))}.
                  </p>
                )}
              </div>
            </Card>

            {/* Siste 12 måneder */}
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-[#1A1B1E]">Siste 12 måneder</h2>
                <span className="text-xs text-[#7A7D83]">Totalindeks, 2015=100</span>
              </div>
              <div className="rounded-xl bg-[#16284A] p-4 mb-3">
                <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Siste 12-mnd endring · {ssbMaanedTilTekst(data.sisteMaaned)}</div>
                <div className="num font-semibold text-white text-2xl">{pct(tabell[0]?.yoy)}</div>
              </div>
              <div className="overflow-hidden rounded-lg border border-[#E9E8E2]">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-[#7A7D83] bg-[#F6F6F4]">
                    <th className="text-left font-medium px-3 py-2">Måned</th>
                    <th className="text-right font-medium px-3 py-2">Indeks</th>
                    <th className="text-right font-medium px-3 py-2">12-mnd</th>
                  </tr></thead>
                  <tbody>
                    {tabell.map((r, i) => (
                      <tr key={r.maaned} className={i === 0 ? 'bg-[#16284A]/[0.03]' : ''} style={{ borderTop: '1px solid #E9E8E2' }}>
                        <td className="px-3 py-2 text-[#1A1B1E] capitalize">{ssbMaanedTilTekst(r.maaned)}</td>
                        <td className="px-3 py-2 text-right num text-[#4B4E54]">{r.idx?.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right num" style={{ color: (r.yoy || 0) >= 0 ? '#15803D' : '#DC2626' }}>{pct(r.yoy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a href="https://www.ssb.no/kpi" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#2563EB] hover:underline mt-3">Kilde: SSB konsumprisindeks <ExternalLink size={10} /></a>
            </Card>
          </div>

          {/* Kort forklaring på tallene */}
          <Card>
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} className="text-[#16284A]" />
              <h2 className="text-base font-semibold text-[#1A1B1E]">Slik regnes det — kort forklart</h2>
            </div>
            <div className="text-sm text-[#65696F] leading-relaxed space-y-2">
              <p>Leien kan justeres i takt med <strong className="text-[#1A1B1E]">konsumprisindeksen (KPI)</strong> fra SSB. Vi bruker <strong className="text-[#1A1B1E]">siste publiserte tall</strong> ({ssbMaanedTilTekst(data.sisteMaaned)}) og sammenligner med samme måned året før ({ssbMaanedTilTekst(fraRef)}) — framtidige tall finnes ikke ennå.</p>
              <p>Det gir årets KPI-endring på <strong className="text-[#1A1B1E]">{pct(annual)}</strong>. Ny leie = dagens leie × (1 + KPI-endringen). Eksempel: {formatKr(gLeie)} × (1 + {annual != null ? annual.toFixed(1) : '0'} %) = <strong className="text-[#1A1B1E]">{formatKr(nyLeie)}</strong>.</p>
              <p className="text-xs text-[#7A7D83]">Regler (husleieloven § 4-2): leien kan reguleres <strong className="text-[#65696F]">maks én gang i året</strong>, tidligst 12 måneder etter siste fastsettelse, og leietaker må få <strong className="text-[#65696F]">skriftlig varsel minst én måned</strong> før den nye leien trer i kraft. Økningen kan ikke være større enn KPI-endringen siden leien sist ble satt — derfor er det trygt å bruke siste 12-måneders endring ved årlig regulering.</p>
            </div>
          </Card>

          {/* Dine kontrakter med KPI-regulering */}
          {kpiKontrakter.length > 0 && (
            <Card>
              <h2 className="text-base font-semibold text-[#1A1B1E] mb-3">Dine leiekontrakter med KPI-regulering</h2>
              <div className="space-y-2">
                {kpiKontrakter.map((k) => {
                  const kan = kanReguleresNaa(k);
                  return (
                    <div key={k.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E9E8E2] bg-white px-3 py-2.5">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1A1B1E] truncate">{k.leietakerNavn || 'Uten navn'}</div>
                        <div className="text-xs text-[#7A7D83] mt-0.5">
                          {formatKr(Number(k.maanedligLeie) || 0)}/mnd · {kan ? <span className="text-[#15803D]">Kan reguleres nå</span> : <>Kan reguleres {nesteReguleringTekst(k) || '—'}</>}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/kontrakter/${k.id}`)}>Åpne</Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
