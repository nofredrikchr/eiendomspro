import { useState, useMemo, useRef } from 'react';
import { ArrowRight, Check, Info } from 'lucide-react';
import { MarketingNav, MarketingFooter, M } from '../components/Marketing';
import { useSEO } from '../hooks/useSEO';
import { formatKr, formatPct, calcTerminbelop } from '../utils/format';
import { sporHendelse, HENDELSE } from '../utils/analytikk';

const START = {
  kjopesum: '3200000', oppussing: '100000', egenkapital: '1000000',
  rente: '5.5', aar: '25', leie: '17500', drift: '2500',
};

function n(v) { return Number(String(v).replace(/\s/g, '').replace(',', '.')) || 0; }

function Felt({ label, navn, verdi, sett, suffix = 'kr', hjelp }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium mb-1.5" style={{ color: M.tekst2 }}>{label}</span>
      <div className="relative">
        <input
          type="number" inputMode="numeric" value={verdi}
          onChange={(e) => sett(navn, e.target.value)}
          className="num w-full rounded-lg py-2.5 pl-3 pr-12 text-sm bg-white transition-all outline-none"
          style={{ border: `1px solid ${M.kant}`, color: M.tekst }}
          onFocus={(e) => { e.target.style.borderColor = M.navy; e.target.style.boxShadow = `0 0 0 3px rgba(22,40,74,0.10)`; }}
          onBlur={(e) => { e.target.style.borderColor = M.kant; e.target.style.boxShadow = 'none'; }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: M.tekst3 }}>{suffix}</span>
      </div>
      {hjelp && <span className="block text-[11px] mt-1" style={{ color: M.tekst3 }}>{hjelp}</span>}
    </label>
  );
}

function Resultat({ label, verdi, farge, stor }) {
  return (
    <div className="flex items-baseline justify-between py-2.5" style={{ borderBottom: `1px solid ${M.kant}` }}>
      <span className="text-sm" style={{ color: M.tekst2 }}>{label}</span>
      <span className={`num font-semibold ${stor ? 'text-2xl' : 'text-base'}`} style={{ color: farge || M.tekst }}>{verdi}</span>
    </div>
  );
}

export default function Kalkulator() {
  useSEO({
    title: 'Yield-kalkulator for utleiebolig — beregn avkastning gratis | EiendomsPRO',
    description: 'Gratis yield-kalkulator for utleiebolig. Regn ut brutto og netto yield, månedlig kontantstrøm og avkastning på egenkapital på sekunder. Laget for norske utleiere.',
    path: '/kalkulator',
  });

  const [f, settForm] = useState(START);
  const harSpurt = useRef(false);
  const sett = (navn, verdi) => {
    settForm((s) => ({ ...s, [navn]: verdi }));
    if (!harSpurt.current) { harSpurt.current = true; sporHendelse(HENDELSE.kalkulatorBrukt); }
  };

  const r = useMemo(() => {
    const totalKostnad = n(f.kjopesum) + n(f.oppussing);
    const laan = Math.max(0, totalKostnad - n(f.egenkapital));
    const termMnd = calcTerminbelop(laan, n(f.rente), n(f.aar));
    const bruttoLeieAar = n(f.leie) * 12;
    const driftAar = n(f.drift) * 12;
    const nettoLeieAar = bruttoLeieAar - driftAar;
    const bruttoYield = totalKostnad ? (bruttoLeieAar / totalKostnad) * 100 : 0;
    const nettoYield = totalKostnad ? (nettoLeieAar / totalKostnad) * 100 : 0;
    const kontantstromMnd = (nettoLeieAar - termMnd * 12) / 12;
    const ek = n(f.egenkapital);
    const ekAvkastning = ek > 0 ? ((kontantstromMnd * 12) / ek) * 100 : 0;
    return { totalKostnad, laan, termMnd, bruttoYield, nettoYield, kontantstromMnd, ekAvkastning };
  }, [f]);

  const kontantFarge = r.kontantstromMnd >= 0 ? M.gronn : '#DC2626';

  return (
    <div style={{ background: M.lerret, minHeight: '100vh' }}>
      <MarketingNav />

      <section className="px-6 pt-14 pb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="h-px w-6" style={{ background: M.gull }} />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: M.gull }}>Gratis verktøy</span>
        </div>
        <h1 className="font-display mb-4" style={{ color: M.navy, fontSize: 'clamp(2rem,4.4vw,3.2rem)', lineHeight: 1.08, fontWeight: 600 }}>
          Yield-kalkulator for utleiebolig
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: M.tekst2 }}>
          Regn ut yield, kontantstrøm og avkastning på egenkapital på sekunder — helt gratis, uten innlogging.
        </p>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-5 items-start">
          {/* Inndata */}
          <div className="bg-white rounded-2xl p-6 shadow-card" style={{ border: `1px solid ${M.kant}` }}>
            <h2 className="text-base font-semibold mb-5" style={{ color: M.tekst }}>Tallene dine</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Felt label="Kjøpesum" navn="kjopesum" verdi={f.kjopesum} sett={sett} />
              <Felt label="Oppussing" navn="oppussing" verdi={f.oppussing} sett={sett} hjelp="Valgfritt" />
              <Felt label="Egenkapital" navn="egenkapital" verdi={f.egenkapital} sett={sett} />
              <Felt label="Lånerente" navn="rente" verdi={f.rente} sett={sett} suffix="%" />
              <Felt label="Nedbetalingstid" navn="aar" verdi={f.aar} sett={sett} suffix="år" />
              <Felt label="Månedsleie" navn="leie" verdi={f.leie} sett={sett} />
              <Felt label="Driftskostnader" navn="drift" verdi={f.drift} sett={sett} suffix="kr/mnd"
                hjelp="Felleskost., forsikring, kommunale avg., vedlikehold" />
            </div>
            <div className="flex items-start gap-2 mt-5 text-[12px] leading-relaxed" style={{ color: M.tekst3 }}>
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>Yield regnes av total kostnad (kjøpesum + oppussing). Kontantstrøm = leie minus drift og lånekostnad (annuitetslån).</span>
            </div>
          </div>

          {/* Resultat */}
          <div className="lg:sticky lg:top-20 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-card-lg" style={{ border: `1px solid ${M.kant}` }}>
              <h2 className="text-base font-semibold mb-3" style={{ color: M.tekst }}>Resultat</h2>
              <Resultat label="Brutto yield" verdi={formatPct(r.bruttoYield, 1)} farge={M.navy} />
              <Resultat label="Netto yield" verdi={formatPct(r.nettoYield, 1)} farge={M.navy} stor />
              <Resultat label="Kontantstrøm" verdi={`${r.kontantstromMnd >= 0 ? '+' : ''}${formatKr(Math.round(r.kontantstromMnd))}/mnd`} farge={kontantFarge} stor />
              <Resultat label="Avkastning på egenkapital" verdi={formatPct(r.ekAvkastning, 1)} farge={M.gronn} />
              <div className="flex justify-between pt-3 text-[12px]" style={{ color: M.tekst3 }}>
                <span>Lånebeløp {formatKr(r.laan)}</span>
                <span>Termin {formatKr(Math.round(r.termMnd))}/mnd</span>
              </div>
            </div>

            {/* Lead-gen */}
            <div className="rounded-2xl p-6" style={{ background: M.navy }}>
              <h3 className="text-white font-semibold mb-3">Vil du se hele bildet?</h3>
              <ul className="space-y-2 mb-5">
                {['10-års prognose for verdi og kontantstrøm', 'Skatteberegning — privat og AS', 'Lagre og sammenlign flere boliger', 'AI-vurdering av kjøpet'].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    <Check size={16} style={{ color: '#9FE7B8' }} className="mt-0.5 shrink-0" />{t}
                  </li>
                ))}
              </ul>
              <a href="/register" onClick={() => sporHendelse(HENDELSE.kalkulatorTilRegistrering)}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{ background: '#fff', color: M.navy }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                Lagre analysen — opprett gratis konto <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SEO-innhold */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display mb-4" style={{ color: M.navy, fontSize: 'clamp(1.5rem,3vw,2.1rem)', fontWeight: 600 }}>Hva er yield på utleiebolig?</h2>
          <div className="space-y-4 text-[15px] leading-relaxed" style={{ color: M.tekst2 }}>
            <p><strong style={{ color: M.tekst }}>Yield</strong> er den årlige avkastningen utleieboligen gir, målt mot hva den koster. <strong style={{ color: M.tekst }}>Brutto yield</strong> regnes som årlig leieinntekt delt på total kostnad (kjøpesum pluss oppussing). <strong style={{ color: M.tekst }}>Netto yield</strong> trekker først fra driftskostnader som felleskostnader, forsikring, kommunale avgifter og vedlikehold — og gir et mer realistisk bilde.</p>
            <p><strong style={{ color: M.tekst }}>Kontantstrøm</strong> er det som faktisk blir igjen hver måned etter at både driftskostnader og lånekostnader er betalt. Positiv kontantstrøm betyr at boligen finansierer seg selv. <strong style={{ color: M.tekst }}>Avkastning på egenkapital</strong> viser hvor mye du tjener på pengene du faktisk har lagt inn.</p>
            <p>En tommelfingerregel er at netto yield på 4–6 % er solid for norske utleieboliger, men det varierer mye med by, rente og standard. Bruk kalkulatoren over til å teste dine egne tall — og opprett en gratis konto for å se 10-års prognose, skatt og sammenligning av flere boliger.</p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
