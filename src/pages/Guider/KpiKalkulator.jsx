import { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { hentKpiSerie, indeksFor, tilSsbMaaned, ssbMaanedTilTekst, manederMellom } from '../../services/ssbKpi';
import { M } from '../../components/Marketing';
import { formatKr } from '../../utils/format';
import { sporHendelse } from '../../utils/analytikk';

export default function KpiKalkulator() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('laster'); // laster | ok | feil
  const [leie, setLeie] = useState('15000');
  const [fra, setFra] = useState('');
  const harSpurt = useRef(false);

  useEffect(() => {
    let aktiv = true;
    hentKpiSerie().then((d) => {
      if (!aktiv) return;
      setData(d); setStatus('ok');
      const m = String(d.sisteMaaned).match(/(\d{4})M(\d{2})/);
      if (m) setFra(`${Number(m[1]) - 1}-${m[2]}`); // 12 mnd før siste publiserte
    }).catch(() => { if (aktiv) setStatus('feil'); });
    return () => { aktiv = false; };
  }, []);

  const maxMaaned = useMemo(() => {
    if (!data) return '';
    const m = String(data.sisteMaaned).match(/(\d{4})M(\d{2})/);
    return m ? `${m[1]}-${m[2]}` : '';
  }, [data]);

  const res = useMemo(() => {
    if (status !== 'ok' || !data || !fra || !leie) return null;
    const fraSsb = tilSsbMaaned(fra);
    const fraIdx = indeksFor(data.serie, fraSsb);
    if (fraIdx == null) return null;
    const g = Number(String(leie).replace(/\s/g, '').replace(',', '.')) || 0;
    const faktor = data.sisteVerdi / fraIdx;
    const ny = Math.round(g * faktor);
    return { ny, okning: ny - Math.round(g), pst: (faktor - 1) * 100, fraSsb, mnd: manederMellom(fraSsb, data.sisteMaaned) };
  }, [status, data, fra, leie]);

  const endre = (setter) => (e) => {
    setter(e.target.value);
    if (!harSpurt.current) { harSpurt.current = true; sporHendelse('KPI-kalkulator: brukt'); }
  };

  return (
    <div className="my-8 rounded-2xl overflow-hidden" style={{ border: `1px solid ${M.kant}`, background: '#fff' }}>
      <div className="px-5 py-4 flex items-center gap-2" style={{ background: M.navy }}>
        <TrendingUp size={17} color="#fff" />
        <span className="text-white font-semibold text-[15px]">KPI-kalkulator</span>
        <span className="ml-auto text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {status === 'ok' && data ? `Live fra SSB · ${ssbMaanedTilTekst(data.sisteMaaned)}` : 'Henter fra SSB …'}
        </span>
      </div>

      {status === 'laster' && (
        <div className="p-6 flex items-center gap-2 text-sm" style={{ color: M.tekst3 }}>
          <Loader2 size={16} className="animate-spin" /> Henter konsumprisindeksen fra Statistisk sentralbyrå …
        </div>
      )}

      {status === 'feil' && (
        <div className="p-6 flex items-start gap-2 text-sm" style={{ color: M.tekst2 }}>
          <AlertTriangle size={16} style={{ color: '#B45309' }} className="mt-0.5 shrink-0" />
          Kunne ikke hente KPI-tall fra SSB akkurat nå. Prøv igjen senere.
        </div>
      )}

      {status === 'ok' && (
        <div className="p-5 grid sm:grid-cols-2 gap-5">
          {/* Inndata */}
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[13px] font-medium mb-1.5" style={{ color: M.tekst2 }}>Dagens månedsleie</span>
              <div className="relative">
                <input type="number" inputMode="numeric" value={leie} onChange={endre(setLeie)}
                  className="num w-full rounded-lg py-2.5 pl-3 pr-10 text-sm bg-white outline-none"
                  style={{ border: `1px solid ${M.kant}`, color: M.tekst }} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: M.tekst3 }}>kr</span>
              </div>
            </label>
            <label className="block">
              <span className="block text-[13px] font-medium mb-1.5" style={{ color: M.tekst2 }}>Leien ble sist fastsatt</span>
              <input type="month" value={fra} max={maxMaaned} onChange={endre(setFra)}
                className="w-full rounded-lg py-2.5 px-3 text-sm bg-white outline-none"
                style={{ border: `1px solid ${M.kant}`, color: M.tekst }} />
            </label>
            <p className="text-[11px] leading-relaxed" style={{ color: M.tekst3 }}>
              Vi bruker siste publiserte KPI fra SSB ({data ? ssbMaanedTilTekst(data.sisteMaaned) : ''}, totalindeks 2015=100).
            </p>
          </div>

          {/* Resultat */}
          <div className="rounded-xl p-4 flex flex-col justify-center" style={{ background: M.lerret, border: `1px solid ${M.kant}` }}>
            {res ? (
              <>
                <div className="text-[11px] uppercase tracking-wider mb-1" style={{ color: M.tekst3 }}>Ny månedsleie</div>
                <div className="num font-semibold mb-2" style={{ color: M.navy, fontSize: 30 }}>{formatKr(res.ny)}</div>
                <div className="flex items-center gap-3 text-sm num" style={{ color: res.okning >= 0 ? M.gronn : '#DC2626' }}>
                  <span>+{formatKr(res.okning)}/mnd</span>
                  <span>·</span>
                  <span>{res.pst >= 0 ? '+' : ''}{res.pst.toFixed(1)} %</span>
                </div>
                <div className="text-[11px] mt-3" style={{ color: M.tekst3 }}>
                  Basert på KPI fra {ssbMaanedTilTekst(res.fraSsb)} til {ssbMaanedTilTekst(data.sisteMaaned)}.
                </div>
                {res.mnd != null && res.mnd < 12 && (
                  <div className="flex items-start gap-1.5 mt-3 text-[11px] leading-snug" style={{ color: '#B45309' }}>
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    Leien kan tidligst KPI-reguleres 12 måneder etter siste fastsettelse.
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm" style={{ color: M.tekst3 }}>Fyll inn leie og måned for å se ny leie.</div>
            )}
          </div>
        </div>
      )}

      <div className="px-5 py-3 text-[11px] leading-relaxed" style={{ borderTop: `1px solid ${M.kant}`, color: M.tekst3 }}>
        Husk: KPI-regulering kan skje maks én gang i året, og leietaker må varsles skriftlig minst én måned før økningen trer i kraft (husleieloven § 4-2).
      </div>
    </div>
  );
}
