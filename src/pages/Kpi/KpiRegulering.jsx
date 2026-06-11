import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Loader2, AlertTriangle, ArrowRight, ExternalLink, Info, CalendarClock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Avatar, Pill, IconTile, PageHeader, SectionCard } from '../../components/ui/kit';
import { formatKr } from '../../utils/format';
import { hentKpiSerie, indeksFor, tilSsbMaaned, ssbMaanedTilTekst } from '../../services/ssbKpi';
import { kanReguleresNaa, nesteReguleringTekst, nesteReguleringsdato, beregnNyLeie } from '../../utils/kpi';

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

  // Del kontraktene i «klare nå» og «ikke klare ennå»
  const klare = kpiKontrakter.filter((k) => kanReguleresNaa(k));
  const ikkeKlare = kpiKontrakter.filter((k) => !kanReguleresNaa(k));

  // Foreslått ny leie per kontrakt basert på live KPI-endring (årlig)
  function forslag(k) {
    const dagens = Number(k.maanedligLeie) || 0;
    const ny = annual != null ? beregnNyLeie(dagens, annual) : dagens;
    return { dagens, ny, okning: ny - dagens };
  }
  const samletOkning = klare.reduce((s, k) => s + forslag(k).okning, 0);

  return (
    <div className="space-y-7 animate-fade-up">
      <PageHeader
        tittel="KPI-regulering"
        undertittel="Juster husleien i takt med konsumprisindeksen — med live tall fra SSB."
      />

      {status === 'laster' && (
        <SectionCard>
          <div className="flex items-center gap-2.5 text-sm font-medium text-muted">
            <Loader2 size={16} className="animate-spin text-brand" /> Henter konsumprisindeksen fra SSB …
          </div>
        </SectionCard>
      )}
      {status === 'feil' && (
        <SectionCard>
          <div className="flex items-start gap-2.5 text-sm font-medium text-muted">
            <AlertTriangle size={16} className="text-amber mt-0.5 shrink-0" /> Kunne ikke hente KPI-tall fra SSB akkurat nå. Prøv igjen senere.
          </div>
        </SectionCard>
      )}

      {status === 'ok' && data && (
        <>
          <div className="grid gap-[18px] items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))' }}>
            {/* Kalkulator */}
            <SectionCard
              tittel={
                <span className="flex items-center gap-2.5">
                  <IconTile tone="mint" size={34}><TrendingUp size={16} /></IconTile>
                  Regn ut ny leie
                </span>
              }
            >
              {kpiKontrakter.length > 0 && (
                <div className="mb-4">
                  <Select
                    label="Hent fra leiekontrakt (valgfritt)" value="" onChange={(e) => hentFraKontrakt(e.target.value)}
                    options={kpiKontrakter.map((k) => ({ value: k.id, label: `${k.leietakerNavn || 'Uten navn'} — ${formatKr(Number(k.maanedligLeie) || 0)}` }))}
                    placeholder="Velg kontrakt …"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="Dagens månedsleie" type="number" value={leie} onChange={(e) => setLeie(e.target.value)} suffix="kr" />
                <label className="flex flex-col gap-1.5">
                  <span className="text-[12.5px] font-bold text-muted">Når ble leien sist regulert?</span>
                  <input
                    type="month" value={sistReg} max={idag} onChange={(e) => setSistReg(e.target.value)}
                    className="w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl text-sm font-bold text-ink num px-3.5 py-[11px] focus:outline-none focus:border-brand focus:bg-surface transition-all"
                  />
                </label>
              </div>

              {/* Resultat */}
              <div className="mt-4 rounded-[14px] border border-line bg-sand p-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex-1 text-center">
                    <div className="text-[11.5px] font-bold text-faint mb-1">Dagens leie</div>
                    <div className="num text-[17px] font-extrabold text-ink">{formatKr(gLeie)}</div>
                  </div>
                  <ArrowRight size={18} strokeWidth={2.2} className="text-brand shrink-0" />
                  <div className="flex-1 text-center">
                    <div className="text-[11.5px] font-bold text-faint mb-1">Ny leie</div>
                    <div className="num text-[19px] font-extrabold text-brand-ink">{formatKr(nyLeie)}</div>
                  </div>
                </div>
                <div className="mt-3.5 pt-3 border-t border-line text-center text-[13px] font-semibold text-muted">
                  Økning <span className="num font-extrabold text-brand-ink">+{formatKr(okning)}/mnd</span>
                  <span> ({formatKr(okning * 12)}/år) · KPI <span className="num font-extrabold text-ink">{pct(annual)}</span></span>
                </div>
                <div className="text-center text-[12px] font-medium text-muted-2 mt-2 leading-relaxed">
                  KPI-endring siste 12 mnd: {ssbMaanedTilTekst(fraRef)} → {ssbMaanedTilTekst(data.sisteMaaned)} (siste publiserte tall fra SSB).
                </div>
              </div>

              {/* Når kan du varsle / regulere */}
              <div className="mt-3 rounded-[14px] border border-mint-line bg-mint-soft p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <CalendarClock size={15} className="text-brand-ink" />
                  <span className="text-sm font-bold text-ink">Når kan du regulere?</span>
                </div>
                {kanNaa ? (
                  <p className="text-[12.5px] font-medium text-muted leading-relaxed">
                    Det har gått {mndSiden} måneder siden siste regulering — du kan regulere nå. Varsle leietaker skriftlig nå, så kan ny leie tidligst gjelde fra <strong className="font-bold text-ink">{datoFmt(gjelderFra)}</strong> (minst én måned frem).
                  </p>
                ) : (
                  <p className="text-[12.5px] font-medium text-muted leading-relaxed">
                    Leien kan tidligst reguleres <strong className="font-bold text-ink">{tidligstRegDato ? datoFmt(tidligstRegDato) : '—'}</strong> (12 måneder etter siste fastsettelse). Varsel må sendes minst én måned før.
                  </p>
                )}
                {visEtterslep && (
                  <p className="text-[12.5px] font-medium text-amber leading-relaxed mt-2">
                    Det har gått mer enn ett år siden siste regulering. Du kan velge å regulere for hele perioden ({pct(sidenSet)}) — da blir ny leie {formatKr(Math.round(gLeie * (1 + sidenSet / 100)))}.
                  </p>
                )}
              </div>
            </SectionCard>

            {/* Siste 12 måneder */}
            <SectionCard
              tittel="Siste 12 måneder"
              action={<span className="text-[12px] font-semibold text-faint">Totalindeks · 2015 = 100</span>}
            >
              <div className="rounded-[14px] bg-brand-deep px-[18px] py-4 mb-4">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-white/70 mb-1">Siste 12-mnd endring · {ssbMaanedTilTekst(data.sisteMaaned)}</div>
                <div className="num text-[30px] font-extrabold tracking-[-0.025em] text-white leading-none">{pct(tabell[0]?.yoy)}</div>
              </div>
              <div className="rounded-[13px] border border-line overflow-hidden">
                <div className="grid bg-sand px-3.5 py-2.5 text-[11px] font-extrabold tracking-[0.03em] text-faint" style={{ gridTemplateColumns: '1.3fr 1fr 1fr' }}>
                  <span>Måned</span>
                  <span className="text-right">Indeks</span>
                  <span className="text-right">12-mnd</span>
                </div>
                {tabell.map((r, i) => (
                  <div
                    key={r.maaned}
                    className={`grid px-3.5 py-2.5 text-[13px] font-bold border-t border-line ${i === 0 ? 'bg-mint-soft' : ''}`}
                    style={{ gridTemplateColumns: '1.3fr 1fr 1fr' }}
                  >
                    <span className="capitalize text-ink">{ssbMaanedTilTekst(r.maaned)}</span>
                    <span className="text-right num text-muted">{r.idx?.toFixed(1)}</span>
                    <span className={`text-right num ${(r.yoy || 0) >= 0 ? 'text-brand-ink' : 'text-danger'} ${i === 0 ? 'font-extrabold' : ''}`}>{pct(r.yoy)}</span>
                  </div>
                ))}
              </div>
              <a
                href="https://www.ssb.no/kpi" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-ink hover:underline mt-3.5"
              >
                Kilde: SSB konsumprisindeks <ExternalLink size={12} />
              </a>
            </SectionCard>
          </div>

          {/* Regler / kilde-forklaring */}
          <div className="rounded-[18px] border border-mint-line bg-mint-soft p-[22px]">
            <div className="flex items-center gap-2.5 mb-2.5">
              <Info size={16} className="text-brand-ink" />
              <h2 className="m-0 text-[15px] font-extrabold tracking-[-0.01em] text-ink">Slik regnes det — og reglene som gjelder</h2>
            </div>
            <p className="text-[13.5px] font-medium text-ink-2 leading-relaxed mb-2.5">
              Leien kan justeres i takt med <strong className="font-bold">konsumprisindeksen (KPI)</strong> fra SSB. Vi bruker <strong className="font-bold">siste publiserte tall</strong> ({ssbMaanedTilTekst(data.sisteMaaned)}) og sammenligner med samme måned året før ({ssbMaanedTilTekst(fraRef)}) — det gir årets KPI-endring på <strong className="font-bold">{pct(annual)}</strong>. Ny leie = dagens leie × (1 + KPI-endringen): {formatKr(gLeie)} × (1 + {annual != null ? annual.toFixed(1) : '0'} %) = <strong className="font-bold">{formatKr(nyLeie)}</strong>.
            </p>
            <p className="text-[13px] font-medium text-muted leading-relaxed m-0">
              Etter <strong className="font-bold text-ink-2">husleieloven § 4-2</strong> kan leien reguleres <strong className="font-bold text-ink-2">maks én gang i året</strong>, tidligst 12 måneder etter siste fastsettelse, og leietaker må få <strong className="font-bold text-ink-2">skriftlig varsel minst én måned</strong> før ny leie trer i kraft. Økningen kan ikke overstige KPI-endringen siden leien sist ble satt.
            </p>
          </div>

          {/* Klare for regulering */}
          {kpiKontrakter.length > 0 && (
            <>
              <div>
                <div className="flex items-baseline gap-2.5 mb-1">
                  <h2 className="m-0 text-base font-extrabold tracking-[-0.01em] text-ink">Klare for regulering</h2>
                  <Pill tone="mint">{klare.length}</Pill>
                </div>
                {klare.length > 0 ? (
                  <p className="text-[13px] font-semibold text-faint mb-3.5">
                    Mulig økt leieinntekt: <span className="num text-brand-ink">+{formatKr(samletOkning)}/mnd</span> på tvers av porteføljen
                  </p>
                ) : (
                  <p className="text-[13px] font-semibold text-faint mb-3.5">Ingen kontrakter er klare for regulering akkurat nå.</p>
                )}

                {klare.length > 0 && (
                  <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))' }}>
                    {klare.map((k) => {
                      const f = forslag(k);
                      const neste = nesteReguleringsdato(k);
                      return (
                        <div key={k.id} className="bg-surface border border-mint-line rounded-[20px] p-[22px]">
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar navn={k.leietakerNavn || ''} tone="mint" size={40} />
                            <div className="flex-1 min-w-0">
                              <div className="text-[14.5px] font-extrabold text-ink truncate">{k.leietakerNavn || 'Uten navn'}</div>
                              <div className="text-[12.5px] font-semibold text-faint truncate">
                                {neste ? `Kunne reguleres fra ${neste.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Klar for regulering'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 bg-sand rounded-[14px] px-4 py-3.5 mb-3.5">
                            <div>
                              <div className="text-[11.5px] font-bold text-faint">Dagens leie</div>
                              <div className="num text-base font-extrabold text-ink">{formatKr(f.dagens)}</div>
                            </div>
                            <ArrowRight size={17} strokeWidth={2.2} className="text-brand shrink-0" />
                            <div>
                              <div className="text-[11.5px] font-bold text-faint">Ny leie</div>
                              <div className="num text-base font-extrabold text-brand-ink">{formatKr(f.ny)}</div>
                            </div>
                            <Pill tone="mint" className="ml-auto">+{formatKr(f.okning)}</Pill>
                          </div>
                          <div className="text-[12.5px] font-semibold text-faint mb-3.5">
                            Basert på siste 12-mnd KPI ({pct(annual)}) · Varsle leietaker fra kontraktsiden
                          </div>
                          <Button variant="primary" className="w-full justify-center" onClick={() => navigate(`/kontrakter/${k.id}`)}>
                            Varsle regulering
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Ikke klare ennå */}
              {ikkeKlare.length > 0 && (
                <div>
                  <div className="flex items-baseline gap-2.5 mb-3">
                    <h2 className="m-0 text-base font-extrabold tracking-[-0.01em] text-ink">Ikke klare ennå</h2>
                    <Pill tone="muted">{ikkeKlare.length}</Pill>
                  </div>
                  <div className="bg-surface border border-line rounded-[18px] overflow-hidden">
                    {ikkeKlare.map((k, i) => (
                      <div
                        key={k.id}
                        onClick={() => navigate(`/kontrakter/${k.id}`)}
                        className={`flex items-center gap-3.5 px-[18px] py-3.5 cursor-pointer transition-colors hover:bg-surface-2 ${i === ikkeKlare.length - 1 ? '' : 'border-b border-line-soft'}`}
                      >
                        <Avatar navn={k.leietakerNavn || ''} tone="sand" size={34} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-bold text-ink truncate">
                            {k.leietakerNavn || 'Uten navn'}
                            {k.maanedligLeie ? <span className="font-semibold text-muted-2"> · {formatKr(Number(k.maanedligLeie) || 0)}/mnd</span> : null}
                          </div>
                        </div>
                        <span className="text-[12px] font-bold text-faint shrink-0">
                          Kan reguleres {nesteReguleringTekst(k) || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
