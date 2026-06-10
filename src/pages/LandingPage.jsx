import { useState, useEffect, useRef } from 'react';
import { Logo } from '../components/Logo';
import { sporHendelse, HENDELSE } from '../utils/analytikk';
import {
  TrendingUp, FileText, Receipt, Landmark, BellRing,
  Calculator, ShieldCheck, ArrowRight, Check, Plus, Minus, Building2,
  ScrollText, LineChart,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   EiendomsPRO — forside
   Lyst, rolig og «finans/eiendom-seriøst». Serif-display + Inter, navy + dempet
   gull, lucide-ikoner (ikke emoji). Ærlig copy: ny norsk tjeneste, bli blant de
   første — ingen oppdiktede vurderinger.
   ──────────────────────────────────────────────────────────────────────────── */

const NAVY = '#16284A';
const GULL = '#9A7A24';
const GRONN = '#15803D';
const TEKST = '#1A1B1E';
const TEKST2 = '#52555B';
const TEKST3 = '#6E727A';
const KANT = '#E5E4DE';
const LERRET = '#F6F6F4';

// ─── Fade-in ved scroll ───────────────────────────────────────────────────────
function useFadeIn() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function FadeIn({ children, delay = 0, className = '' }) {
  const [ref, visible] = useFadeIn();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity .6s ease ${delay}ms, transform .6s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

function Eyebrow({ children }) {
  return (
    <div className="inline-flex items-center gap-2 mb-5">
      <span className="h-px w-6" style={{ background: GULL }} />
      <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: GULL }}>{children}</span>
    </div>
  );
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 16);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{
      background: scrolled ? 'rgba(255,255,255,0.85)' : 'transparent',
      backdropFilter: scrolled ? 'saturate(180%) blur(12px)' : 'none',
      borderBottom: scrolled ? `1px solid ${KANT}` : '1px solid transparent',
    }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Logo variant="dark" height={28} />
        </div>
        <div className="hidden md:flex items-center gap-7">
          {[['funksjoner', 'Funksjoner'], ['slik', 'Slik fungerer det'], ['priser', 'Priser']].map(([id, label]) => (
            <button key={id} onClick={() => scrollTo(id)}
              className="text-sm transition-colors cursor-pointer hover:opacity-100" style={{ color: TEKST2 }}>
              {label}
            </button>
          ))}
          <a href="/kalkulator" className="text-sm transition-colors" style={{ color: TEKST2 }}>Kalkulator</a>
          <a href="/guider" className="text-sm transition-colors" style={{ color: TEKST2 }}>Guider</a>
          <a href="/login" className="text-sm transition-colors" style={{ color: TEKST2 }}>Logg inn</a>
          <a href="/register" onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde: 'forside-nav' })} className="text-sm font-semibold px-4 py-2 rounded-lg transition-all"
            style={{ background: NAVY, color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1E3A5F'}
            onMouseLeave={e => e.currentTarget.style.background = NAVY}>
            Kom i gang gratis
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Lett produktvisning (lys, ekte UI-stil) ──────────────────────────────────
function ProductPreview() {
  const stats = [
    { k: 'Netto / mnd', v: '24 850', s: 'kr', c: GRONN },
    { k: 'Yield', v: '6,4', s: '%', c: NAVY },
    { k: 'Kontantstrøm', v: '+8 100', s: 'kr', c: GRONN },
  ];
  const bars = [44, 58, 52, 66, 61, 78];
  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="rounded-2xl bg-white overflow-hidden shadow-soft" style={{ border: `1px solid ${KANT}` }}>
        {/* topplinje */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: `1px solid ${KANT}` }}>
          <div className="flex items-center gap-2">
            <Building2 size={15} style={{ color: NAVY }} />
            <span className="text-[13px] font-semibold" style={{ color: TEKST }}>Bjørneveien 8</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(21,128,61,0.10)', color: GRONN }}>Utleid</span>
          </div>
          <span className="text-[11px]" style={{ color: TEKST3 }}>Oversikt</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            {stats.map(s => (
              <div key={s.k} className="rounded-xl p-3.5" style={{ background: LERRET, border: `1px solid ${KANT}` }}>
                <div className="text-[10.5px] uppercase tracking-wider mb-1.5" style={{ color: TEKST3 }}>{s.k}</div>
                <div className="num font-semibold" style={{ color: s.c, fontSize: 18 }}>
                  {s.v}<span className="text-[11px] ml-0.5" style={{ color: TEKST3 }}>{s.s}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 rounded-xl p-4" style={{ background: LERRET, border: `1px solid ${KANT}` }}>
              <div className="text-[10.5px] uppercase tracking-wider mb-3" style={{ color: TEKST3 }}>Leieinntekt · 6 mnd</div>
              <div className="flex items-end gap-2 h-16">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === bars.length - 1 ? NAVY : '#C9C6BC' }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl p-4 flex flex-col justify-between" style={{ background: NAVY }}>
              <div className="text-[10.5px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.6)' }}>Neste KPI</div>
              <div>
                <div className="text-white font-semibold text-[13px]">01.07.2026</div>
                <div className="num text-[12px]" style={{ color: '#9FE7B8' }}>+3,4 %</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* liten flytende «skatt»-brikke */}
      <div className="hidden sm:flex absolute -right-5 -bottom-5 items-center gap-2.5 bg-white rounded-xl px-4 py-3 shadow-card-lg" style={{ border: `1px solid ${KANT}` }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(154,122,36,0.12)' }}>
          <Calculator size={15} style={{ color: GULL }} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: TEKST3 }}>Estimert skatt</div>
          <div className="num text-[13px] font-semibold" style={{ color: TEKST }}>14 200 kr</div>
        </div>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative px-6 pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden" style={{ background: LERRET }}>
      {/* mykt lysskjær */}
      <div className="absolute inset-x-0 top-0 h-[420px] pointer-events-none" style={{
        background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(22,40,74,0.05), transparent 70%)',
      }} />
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-7"
          style={{ background: '#fff', border: `1px solid ${KANT}`, color: TEKST2 }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: GRONN }} />
          Ny norsk tjeneste — bli blant de første utleierne
        </div>

        <h1 className="font-display tracking-tight mb-6" style={{ color: NAVY, fontSize: 'clamp(2.4rem, 5.2vw, 4.2rem)', lineHeight: 1.05, fontWeight: 600 }}>
          Se nøyaktig hva hver<br />
          <span style={{ fontStyle: 'italic', color: GULL }}>utleiebolig</span> tjener deg.
        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-9 leading-relaxed" style={{ color: TEKST2 }}>
          EiendomsPRO regner ut yield, kontantstrøm, skatt og 10-års prognose for hver bolig — automatisk.
          Pluss leiekontrakter etter husleieloven og rapporter banken stoler på. Laget for norske utleiere med 1–50 boliger.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-7">
          <a href="/register" onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde: 'forside-hero' })} className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all"
            style={{ background: NAVY, color: '#fff' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1E3A5F'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = NAVY; e.currentTarget.style.transform = 'translateY(0)'; }}>
            Kom i gang gratis <ArrowRight size={17} />
          </a>
          <button onClick={() => document.getElementById('slik')?.scrollIntoView({ behavior: 'smooth' })}
            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-medium transition-all cursor-pointer"
            style={{ background: '#fff', border: `1px solid ${KANT}`, color: TEKST }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#CFCEC5'}
            onMouseLeave={e => e.currentTarget.style.borderColor = KANT}>
            Se hvordan det fungerer
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm mb-16" style={{ color: TEKST3 }}>
          {['Gratis å starte', 'Ingen bindingstid', 'Norsk tjeneste og support'].map(t => (
            <span key={t} className="flex items-center gap-1.5"><Check size={15} style={{ color: GRONN }} /> {t}</span>
          ))}
        </div>

        <FadeIn><ProductPreview /></FadeIn>
      </div>
    </section>
  );
}

// ─── Tillit / posisjonering (ærlig — ingen falske tall) ───────────────────────
function TrustStrip() {
  const punkter = [
    'Husleieloven',
    'Skatteetatens RF-1159',
    'KPI-regulering (SSB)',
    'Privat og AS',
    'Bankvennlige rapporter',
  ];
  return (
    <section className="px-6 py-7" style={{ background: '#fff', borderTop: `1px solid ${KANT}`, borderBottom: `1px solid ${KANT}` }}>
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3 text-center">
        <span className="text-xs uppercase tracking-wider shrink-0" style={{ color: TEKST3 }}>Bygget på norske regler</span>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {punkter.map(p => (
            <span key={p} className="text-sm font-medium flex items-center gap-1.5" style={{ color: TEKST2 }}>
              <span className="w-1 h-1 rounded-full" style={{ background: GULL }} />{p}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Problem ──────────────────────────────────────────────────────────────────
function ProblemSection() {
  const problems = [
    'Du vet ikke om boligen faktisk er lønnsom etter renter, skatt og vedlikehold.',
    'Du glemmer KPI-regulering og taper tusenvis i leie hvert eneste år.',
    'Banken vil ha dokumentasjon — og du bruker kvelder på å sette den sammen i Excel.',
  ];
  return (
    <section className="py-24 px-6" style={{ background: LERRET }}>
      <div className="max-w-3xl mx-auto text-center">
        <FadeIn>
          <Eyebrow>Kjenner du deg igjen?</Eyebrow>
          <h2 className="font-display mb-12" style={{ color: NAVY, fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 600, lineHeight: 1.15 }}>
            Utleie skal lønne seg.<br />Men gjør den egentlig det?
          </h2>
        </FadeIn>
        <div className="space-y-3 text-left">
          {problems.map((p, i) => (
            <FadeIn key={i} delay={i * 90}>
              <div className="flex items-start gap-4 bg-white rounded-xl px-5 py-4 shadow-card" style={{ border: `1px solid ${KANT}` }}>
                <span className="text-2xl leading-none font-display shrink-0" style={{ color: '#C9C6BC' }}>{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[15px] leading-relaxed pt-0.5" style={{ color: TEKST2 }}>{p}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Funksjoner ───────────────────────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    { icon: TrendingUp, title: 'Lønnsomhet per bolig', desc: 'Yield, kontantstrøm og avkastning på egenkapital etter alle kostnader — med 10-års prognose for hver eiendom.' },
    { icon: FileText, title: 'Leiekontrakter', desc: 'Opprett kontrakter etter husleieloven på minutter. Last ned som proff PDF med inn- og utflyttingsprotokoll.' },
    { icon: Calculator, title: 'Skatt — privat og AS', desc: 'Automatisk skatteberegning for både privatperson og selskap, klar til skattemeldingen (RF-1159).' },
    { icon: Landmark, title: 'Bankrapport', desc: 'Generér en profesjonell rapport over hele porteføljen. Et solid fortrinn i møtet med banken.' },
    { icon: LineChart, title: 'Verdiutvikling og prognose', desc: 'Følg verdi, gjeld og egenkapital over tid — og se hvor porteføljen er om 10 år.' },
    { icon: BellRing, title: 'KPI-regulering', desc: 'Aldri glem å regulere leien igjen. Du får varsel når leien kan justeres etter konsumprisindeksen.' },
  ];
  return (
    <section id="funksjoner" className="py-24 px-6" style={{ background: '#fff' }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="text-center mb-14 max-w-2xl mx-auto">
            <Eyebrow>Alt på ett sted</Eyebrow>
            <h2 className="font-display mb-4" style={{ color: NAVY, fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 600, lineHeight: 1.15 }}>
              Verktøyet bygget for norske utleiere
            </h2>
            <p className="text-lg" style={{ color: TEKST2 }}>
              Ikke et generisk regnskapsprogram. Alt er laget for utleie — fra yield-beregning til husleieloven.
            </p>
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <FadeIn key={i} delay={(i % 3) * 80}>
              <div className="rounded-2xl p-6 h-full bg-white shadow-card transition-all duration-200 hover:shadow-card-lg" style={{ border: `1px solid ${KANT}` }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(22,40,74,0.06)' }}>
                  <f.icon size={19} style={{ color: NAVY }} />
                </div>
                <h3 className="text-[15px] font-semibold mb-2" style={{ color: TEKST }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TEKST2 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Slik fungerer det ────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: Building2, title: 'Legg inn boligene', desc: 'Adresse, kjøpesum, lån, kostnader og leie. Cirka to minutter per bolig.' },
    { icon: ScrollText, title: 'Opprett leiekontrakt', desc: 'Fyll inn leietaker og vilkår — kontrakten genereres ferdig etter husleieloven.' },
    { icon: TrendingUp, title: 'Få full oversikt', desc: 'Lønnsomhet, skatt, prognoser og rapporter beregnes automatisk, med én gang.' },
  ];
  return (
    <section id="slik" className="py-24 px-6" style={{ background: LERRET }}>
      <div className="max-w-4xl mx-auto">
        <FadeIn>
          <div className="text-center mb-14">
            <Eyebrow>Kom i gang på minutter</Eyebrow>
            <h2 className="font-display" style={{ color: NAVY, fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 600, lineHeight: 1.15 }}>
              Tre steg til full kontroll
            </h2>
          </div>
        </FadeIn>
        <div className="grid md:grid-cols-3 gap-6 relative">
          {steps.map((s, i) => (
            <FadeIn key={i} delay={i * 120}>
              <div className="relative bg-white rounded-2xl p-6 h-full shadow-card" style={{ border: `1px solid ${KANT}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
                    <s.icon size={18} color="#fff" />
                  </div>
                  <span className="num text-sm font-semibold" style={{ color: GULL }}>0{i + 1}</span>
                </div>
                <h3 className="text-base font-semibold mb-2" style={{ color: TEKST }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: TEKST2 }}>{s.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Norsk-spesifikt fremhevet (navy seksjon for kontrast) ────────────────────
function NorwegianSection() {
  const items = [
    { icon: ScrollText, t: 'Husleieloven', d: 'Kontrakter og oppsigelsesvilkår følger norsk lov.' },
    { icon: Calculator, t: 'Riktig skatt', d: '22 % for privat, selskapsmodell for AS — automatisk.' },
    { icon: ShieldCheck, t: 'Depositum og protokoll', d: 'Depositumskonto, inn- og utflyttingsprotokoll på plass.' },
    { icon: Receipt, t: 'KID og faktura', d: 'Husleiefaktura med KID — klart for automatisk innkreving.' },
  ];
  return (
    <section className="py-24 px-6" style={{ background: NAVY }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 mb-5">
              <span className="h-px w-6" style={{ background: GULL }} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: '#D9BE7A' }}>Laget for norske forhold</span>
            </div>
            <h2 className="font-display text-white" style={{ fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 600, lineHeight: 1.15 }}>
              Internasjonale verktøy forstår ikke norsk utleie. Det gjør vi.
            </h2>
          </div>
        </FadeIn>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div className="rounded-2xl p-6 h-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <it.icon size={20} style={{ color: '#D9BE7A' }} className="mb-4" />
                <h3 className="text-[15px] font-semibold text-white mb-1.5">{it.t}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>{it.d}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Priser ───────────────────────────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: 'Gratis', price: '0', undertekst: 'For deg med én bolig', highlight: false, badge: null,
      features: ['1 bolig', 'Full lønnsomhetsanalyse', 'Yield og nøkkeltall', '1 leiekontrakt (PDF)'],
      kommer: [], cta: 'Kom i gang gratis',
    },
    {
      name: 'Utleier', price: '149', undertekst: 'Fast pris — uansett antall boliger', highlight: true, badge: 'Mest populær',
      features: [
        'Ubegrenset antall boliger',
        'Alle rapporter (lønnsomhet, kontantstrøm, verdi)',
        'Skatterapport — privat og AS',
        'Ubegrensede leiekontrakter (PDF)',
        'Inn- og utflyttingsprotokoll',
        '10-års prognose og bankrapport',
      ],
      kommer: [], cta: 'Start gratis',
    },
    {
      name: 'Pro', price: '299', undertekst: 'Full automatisering', highlight: false, badge: null,
      features: ['Alt i Utleier'],
      kommer: ['BankID-signering', 'Automatisk fakturering med KID', 'AvtaleGiro og innkreving', 'Finn.no-publisering', 'Leietakerportal'],
      cta: 'Bli tidlig bruker',
    },
  ];
  return (
    <section id="priser" className="py-24 px-6" style={{ background: LERRET }}>
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <Eyebrow>Priser</Eyebrow>
            <h2 className="font-display mb-4" style={{ color: NAVY, fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 600, lineHeight: 1.15 }}>
              Fast pris. Uansett hvor mange boliger.
            </h2>
            <p className="text-lg" style={{ color: TEKST2 }}>
              Andre tar betalt per kontrakt. Vi tar én fast månedspris — så det lønner seg jo flere boliger du har.
            </p>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="max-w-2xl mx-auto mb-12 rounded-xl px-5 py-3.5 flex items-center justify-center gap-2.5 text-sm text-center"
            style={{ background: 'rgba(154,122,36,0.08)', border: `1px solid rgba(154,122,36,0.30)` }}>
            <span style={{ color: GULL }}>★</span>
            <span style={{ color: '#6B5A1E' }}>
              <strong style={{ color: GULL }}>Tidligbruker-tilbud:</strong> de 400 første utleierne får <strong style={{ color: TEKST }}>50 % rabatt for alltid</strong>.
            </span>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {plans.map((plan, i) => (
            <FadeIn key={i} delay={i * 90}>
              <div className="rounded-2xl p-6 flex flex-col h-full relative bg-white"
                style={{
                  border: plan.highlight ? `1.5px solid ${NAVY}` : `1px solid ${KANT}`,
                  boxShadow: plan.highlight ? '0 12px 40px rgba(22,40,74,0.12)' : '0 1px 3px rgba(16,24,40,0.06)',
                }}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap" style={{ background: NAVY, color: '#fff' }}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-base font-semibold mb-1" style={{ color: TEKST }}>{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="num font-semibold" style={{ color: NAVY, fontSize: 38 }}>{plan.price}</span>
                    <span className="text-sm" style={{ color: TEKST3 }}>kr/mnd</span>
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: TEKST3 }}>{plan.undertekst}</p>
                </div>
                <ul className="space-y-2.5 flex-1 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: TEKST2 }}>
                      <Check size={16} style={{ color: GRONN }} className="mt-0.5 shrink-0" />{f}
                    </li>
                  ))}
                  {plan.kommer.map((f, j) => (
                    <li key={`k${j}`} className="flex items-start gap-2.5 text-sm" style={{ color: TEKST3 }}>
                      <Plus size={16} className="mt-0.5 shrink-0" style={{ color: '#C2C1B6' }} />
                      <span className="flex items-center gap-1.5 flex-wrap">{f}
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: LERRET, color: TEKST3, border: `1px solid ${KANT}` }}>Kommer</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <a href="/register" onClick={() => sporHendelse(HENDELSE.prisCtaKlikk, { plan: plan.name })} className="block text-center py-3 rounded-xl text-sm font-semibold transition-all"
                  style={plan.highlight ? { background: NAVY, color: '#fff' } : { background: '#fff', border: `1px solid ${KANT}`, color: TEKST }}
                  onMouseEnter={e => { if (plan.highlight) e.currentTarget.style.background = '#1E3A5F'; else e.currentTarget.style.borderColor = '#CFCEC5'; }}
                  onMouseLeave={e => { if (plan.highlight) e.currentTarget.style.background = NAVY; else e.currentTarget.style.borderColor = KANT; }}>
                  {plan.cta}
                </a>
              </div>
            </FadeIn>
          ))}
        </div>
        <p className="text-center text-xs mt-8" style={{ color: TEKST3 }}>
          Alle priser eks. mva. Ingen bindingstid. Pro-funksjonene rulles ut fortløpende — tidlige brukere får tilgang først.
        </p>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function AccordionItem({ q, a, open, onClick }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-card" style={{ border: `1px solid ${KANT}` }}>
      <button onClick={onClick} className="w-full flex items-center justify-between px-6 py-5 text-left text-[15px] font-medium cursor-pointer" style={{ color: TEKST }}>
        <span>{q}</span>
        <span className="shrink-0 ml-4" style={{ color: NAVY }}>{open ? <Minus size={18} /> : <Plus size={18} />}</span>
      </button>
      <div style={{ maxHeight: open ? 320 : 0, overflow: 'hidden', transition: 'max-height .35s ease' }}>
        <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: TEKST2 }}>{a}</p>
      </div>
    </div>
  );
}

function FAQSection() {
  const [openIdx, setOpenIdx] = useState(0);
  const faqs = [
    { q: 'Passer EiendomsPRO for meg med bare én bolig?', a: 'Ja. Gratis-planen er laget nettopp for deg — full lønnsomhetsanalyse og oversikt over én bolig, helt gratis. Vil du ha flere boliger, alle rapporter og ubegrensede leiekontrakter, oppgraderer du til Utleier for 149 kr/mnd (fast pris uansett antall boliger).' },
    { q: 'Er leiekontraktene juridisk gyldige?', a: 'Ja. Kontraktene er utformet etter husleieloven og norsk lovgivning. Du laster dem ned som PDF, og BankID-signering kommer for Pro-brukere.' },
    { q: 'Hva koster det å begynne?', a: 'Ingenting. Du kommer i gang gratis uten kredittkort, og velger selv om og når du vil oppgradere. Det trekkes ingenting automatisk.' },
    { q: 'Kan jeg bruke det for et AS?', a: 'Ja. EiendomsPRO regner skatt for både privatperson (22 %) og selskap, og du kan knytte et selskap som utleier på kontraktene.' },
    { q: 'Hvor trygt lagres dataene mine?', a: 'Data lagres kryptert og vi følger GDPR. Vi deler ikke data med tredjeparter, og du kan når som helst eksportere eller slette alt.' },
    { q: 'Hjelper rapportene meg i bankmøtet?', a: 'Ja. Du kan generere en samlet rapport over porteføljen med verdi, gjeld, egenkapital, kontantstrøm og prognose — og et komplett byggelånsbudsjett du kan vise banken.' },
  ];
  return (
    <section className="py-24 px-6" style={{ background: '#fff' }}>
      <div className="max-w-2xl mx-auto">
        <FadeIn>
          <div className="text-center mb-12">
            <Eyebrow>Ofte stilte spørsmål</Eyebrow>
            <h2 className="font-display" style={{ color: NAVY, fontSize: 'clamp(1.8rem,3.4vw,2.6rem)', fontWeight: 600, lineHeight: 1.15 }}>
              Spørsmål og svar
            </h2>
          </div>
        </FadeIn>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} q={f.q} a={f.a} open={openIdx === i} onClick={() => setOpenIdx(openIdx === i ? -1 : i)} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Avsluttende CTA ──────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-24 px-6" style={{ background: LERRET }}>
      <FadeIn>
        <div className="max-w-3xl mx-auto text-center rounded-3xl px-8 py-14 md:py-16" style={{ background: NAVY }}>
          <h2 className="font-display text-white mb-4" style={{ fontSize: 'clamp(2rem,4vw,3rem)', fontWeight: 600, lineHeight: 1.1 }}>
            Slutt å gjette.<br /><span style={{ fontStyle: 'italic', color: '#D9BE7A' }}>Begynn å vite.</span>
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.78)' }}>
            Bli blant de første norske utleierne med full kontroll på økonomien. Gratis å starte.
          </p>
          <a href="/register" onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde: 'forside-final' })} className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all"
            style={{ background: '#fff', color: NAVY }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
            Kom i gang gratis <ArrowRight size={17} />
          </a>
          <p className="text-sm mt-4" style={{ color: 'rgba(255,255,255,0.55)' }}>Ingen kredittkort · Ingen binding · Oppsett på minutter</p>
        </div>
      </FadeIn>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="px-6 py-12" style={{ background: '#fff', borderTop: `1px solid ${KANT}` }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <Logo variant="dark" height={24} />
          <span className="text-xs" style={{ color: TEKST3 }}>© {new Date().getFullYear()} EiendomsPRO AS</span>
        </div>
        <div className="flex gap-6 text-sm" style={{ color: TEKST2 }}>
          <a href="#funksjoner" className="hover:opacity-70 transition-opacity">Funksjoner</a>
          <a href="#priser" className="hover:opacity-70 transition-opacity">Priser</a>
          <a href="/login" className="hover:opacity-70 transition-opacity">Logg inn</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Eksport ──────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: LERRET, minHeight: '100vh' }}>
      <Navbar />
      <Hero />
      <TrustStrip />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorks />
      <NorwegianSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
