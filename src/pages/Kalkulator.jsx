import { useState, useMemo, useRef } from 'react';
import { ArrowRight, Check, Info } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '../components/Marketing';
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
      <span className="block text-[13px] font-semibold mb-1.5 text-muted">{label}</span>
      <div className="relative">
        <input
          type="number" inputMode="numeric" value={verdi}
          onChange={(e) => sett(navn, e.target.value)}
          className="num w-full rounded-xl py-2.5 pl-3 pr-12 text-sm bg-surface text-ink border border-line-input outline-none transition-all focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-2">{suffix}</span>
      </div>
      {hjelp && <span className="block text-[11px] mt-1 text-muted-2">{hjelp}</span>}
    </label>
  );
}

function Resultat({ label, verdi, farge = 'text-ink', stor }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 border-b border-line-soft">
      <span className="text-sm text-muted">{label}</span>
      <span className={`num font-extrabold ${stor ? 'text-2xl' : 'text-base'} ${farge}`}>{verdi}</span>
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

  const kontantFarge = r.kontantstromMnd >= 0 ? 'text-brand-ink' : 'text-danger';

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingNav />

      <section className="px-[clamp(20px,4vw,40px)] pt-14 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-mint text-brand-ink text-[13px] font-bold px-3.5 py-[7px] rounded-full mb-5">
          Gratis verktøy
        </div>
        <h1 className="m-0 mb-4 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: 'clamp(2rem,4.4vw,3.2rem)', lineHeight: 1.08 }}>
          Yield-kalkulator for utleiebolig
        </h1>
        <p className="m-0 mx-auto text-lg max-w-2xl leading-[1.6] text-muted">
          Regn ut yield, kontantstrøm og avkastning på egenkapital på sekunder — helt gratis, uten innlogging.
        </p>
      </section>

      <section className="px-[clamp(20px,4vw,40px)] pb-16">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-5 items-start">
          {/* Inndata */}
          <div className="bg-surface rounded-[20px] p-6 shadow-card border border-line">
            <h2 className="text-base font-extrabold tracking-[-0.01em] mb-5 text-ink">Tallene dine</h2>
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
            <div className="flex items-start gap-2 mt-5 text-[12px] leading-relaxed text-muted-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>Yield regnes av total kostnad (kjøpesum + oppussing). Kontantstrøm = leie minus drift og lånekostnad (annuitetslån).</span>
            </div>
          </div>

          {/* Resultat */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="bg-surface rounded-[20px] p-6 shadow-card-lg border border-line">
              <h2 className="text-base font-extrabold tracking-[-0.01em] mb-3 text-ink">Resultat</h2>
              <Resultat label="Brutto yield" verdi={formatPct(r.bruttoYield, 1)} farge="text-brand-ink" />
              <Resultat label="Netto yield" verdi={formatPct(r.nettoYield, 1)} farge="text-brand-ink" stor />
              <Resultat label="Kontantstrøm" verdi={`${r.kontantstromMnd >= 0 ? '+' : ''}${formatKr(Math.round(r.kontantstromMnd))}/mnd`} farge={kontantFarge} stor />
              <Resultat label="Avkastning på egenkapital" verdi={formatPct(r.ekAvkastning, 1)} farge="text-brand-ink" />
              <div className="flex justify-between pt-3 text-[12px] text-muted-2 num">
                <span>Lånebeløp {formatKr(r.laan)}</span>
                <span>Termin {formatKr(Math.round(r.termMnd))}/mnd</span>
              </div>
            </div>

            {/* Lead-gen */}
            <div className="rounded-[20px] p-6 bg-brand-deep relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.06]" />
              <h3 className="relative text-white font-extrabold tracking-[-0.01em] mb-3">Vil du se hele bildet?</h3>
              <ul className="relative space-y-2 mb-5">
                {['10-års prognose for verdi og kontantstrøm', 'Skatteberegning — privat og AS', 'Lagre og sammenlign flere boliger', 'AI-vurdering av kjøpet'].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-sm text-white/85">
                    <Check size={16} strokeWidth={2.4} className="mt-0.5 shrink-0 text-mint" />{t}
                  </li>
                ))}
              </ul>
              <a href="/register" onClick={() => sporHendelse(HENDELSE.kalkulatorTilRegistrering)}
                className="relative flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all">
                Lagre analysen — opprett gratis konto <ArrowRight size={16} strokeWidth={2.2} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SEO-innhold */}
      <section className="px-[clamp(20px,4vw,40px)] pb-20">
        <div className="max-w-2xl mx-auto">
          <h2 className="m-0 mb-4 font-extrabold tracking-[-0.02em] text-ink" style={{ fontSize: 'clamp(1.5rem,3vw,2.1rem)' }}>Hva er yield på utleiebolig?</h2>
          <div className="space-y-4 text-[15px] leading-relaxed text-muted">
            <p><strong className="text-ink">Yield</strong> er den årlige avkastningen utleieboligen gir, målt mot hva den koster. <strong className="text-ink">Brutto yield</strong> regnes som årlig leieinntekt delt på total kostnad (kjøpesum pluss oppussing). <strong className="text-ink">Netto yield</strong> trekker først fra driftskostnader som felleskostnader, forsikring, kommunale avgifter og vedlikehold — og gir et mer realistisk bilde.</p>
            <p><strong className="text-ink">Kontantstrøm</strong> er det som faktisk blir igjen hver måned etter at både driftskostnader og lånekostnader er betalt. Positiv kontantstrøm betyr at boligen finansierer seg selv. <strong className="text-ink">Avkastning på egenkapital</strong> viser hvor mye du tjener på pengene du faktisk har lagt inn.</p>
            <p>En tommelfingerregel er at netto yield på 4–6 % er solid for norske utleieboliger, men det varierer mye med by, rente og standard. Bruk kalkulatoren over til å teste dine egne tall — og opprett en gratis konto for å se 10-års prognose, skatt og sammenligning av flere boliger.</p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
