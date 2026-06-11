import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useSEO } from '../hooks/useSEO';
import { sporHendelse, HENDELSE } from '../utils/analytikk';
import {
  ShieldCheck, TrendingUp, Building2, Heart, ArrowRight, Check,
  CreditCard, Wrench, FileText, MessageSquare, CheckCircle2,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────────
   EiendomsPRO — forside (redesign 2026)
   «Et hjem for gode leieforhold.» Varmt kremlerret, frisk teal-aksent,
   Plus Jakarta Sans, foto-drevet Airbnb-vibe for langtidsutleie. Ingen emoji.
   ──────────────────────────────────────────────────────────────────────────── */

const HERO_BILDE = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1100&q=70';
const LEIETAKER_BILDE = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1000&q=70';

export default function LandingPage() {
  const navigate = useNavigate();
  useSEO({
    title: 'EiendomsPRO — Et hjem for gode leieforhold',
    description: 'Eiendomspro gir deg som leier ut rolig oversikt over bygg, kontrakter og økonomi — og gir leietakerne dine en egen portal der de føler seg ivaretatt. Laget for langtidsutleie i Norge.',
    path: '/',
  });

  const tilRegistrering = () => { sporHendelse(HENDELSE.registreringKlikk); navigate('/register'); };
  const tilLogin = () => navigate('/login');
  const skrollTil = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-canvas text-ink animate-fade-up">
      {/* ── Toppmeny ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-[14px] border-b border-line">
        <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] h-[70px] flex items-center gap-5">
          <button onClick={() => navigate('/')} className="cursor-pointer bg-transparent border-none p-0">
            <Logo variant="dark" height={34} />
          </button>
          <nav className="hidden md:flex gap-0.5 ml-auto">
            <button onClick={() => skrollTil('funksjoner')} className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink cursor-pointer">Funksjoner</button>
            <button onClick={() => navigate('/kalkulator')} className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink cursor-pointer">Kalkulator</button>
            <button onClick={() => navigate('/guider')} className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink cursor-pointer">Guider</button>
          </nav>
          <div className="flex gap-2.5 items-center ml-auto md:ml-0">
            <button onClick={tilLogin} className="px-4 py-2.5 rounded-[11px] text-sm font-bold text-ink-2 hover:bg-line-soft cursor-pointer">Logg inn</button>
            <button onClick={tilRegistrering} className="px-[18px] py-2.5 rounded-[11px] text-sm font-bold text-white bg-brand hover:bg-brand-hover shadow-brand cursor-pointer">Kom i gang</button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] pt-[clamp(44px,7vw,92px)] pb-[clamp(48px,6vw,80px)] grid gap-[clamp(32px,5vw,64px)] items-center"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
        <div>
          <div className="inline-flex items-center gap-2 bg-mint text-brand-ink text-[13px] font-bold px-3.5 py-[7px] rounded-full mb-[22px]">
            <ShieldCheck size={14} />
            Laget for langtidsutleie i Norge
          </div>
          <h1 className="m-0 mb-[18px] font-extrabold tracking-[-0.035em] leading-[1.04] text-balance" style={{ fontSize: 'clamp(38px, 5vw, 60px)' }}>
            Et hjem for gode leieforhold.
          </h1>
          <p className="m-0 mb-[30px] leading-[1.6] text-muted max-w-[50ch]" style={{ fontSize: 'clamp(16px, 1.6vw, 18px)' }}>
            Eiendomspro gir deg som leier ut rolig oversikt over bygg, kontrakter og økonomi — og gir leietakerne dine en egen portal der de føler seg ivaretatt.
          </p>
          <div className="flex gap-3 flex-wrap mb-[30px]">
            <button onClick={tilRegistrering} className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[13px] text-[15.5px] font-bold text-white bg-brand hover:bg-brand-hover hover:-translate-y-px shadow-brand transition-all cursor-pointer">
              Kom i gang gratis
              <ArrowRight size={16} strokeWidth={2.2} />
            </button>
            <button onClick={tilLogin} className="px-6 py-3.5 rounded-[13px] text-[15.5px] font-bold text-ink-2 bg-surface border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink transition-all cursor-pointer">
              Se leietakerportalen
            </button>
          </div>
          <div className="flex gap-[18px] flex-wrap">
            {['Gratis å komme i gang', 'Norsk standard leiekontrakt', 'Bygget for langtidsleie'].map((t) => (
              <div key={t} className="flex items-center gap-[7px] text-[13.5px] font-semibold text-muted">
                <Check size={15} strokeWidth={2.4} className="text-brand" />
                {t}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[380px]">
          <div className="absolute w-[70%] h-[70%] bg-mint rounded-[28px] rotate-3" style={{ inset: '24px -10px auto auto' }} />
          <div className="relative rounded-[26px] overflow-hidden bg-[#E8E4DB] shadow-card-lg" style={{ aspectRatio: '4 / 3.4' }}>
            <img src={HERO_BILDE} alt="Lys og varm stue i utleiebolig" loading="lazy" className="w-full h-full object-cover block" />
          </div>
          <div className="absolute top-[26px] -left-2 bg-surface rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px] animate-fade-up">
            <span className="w-9 h-9 rounded-full bg-mint text-brand flex items-center justify-center"><CheckCircle2 size={17} /></span>
            <div>
              <div className="text-[13.5px] font-bold">Husleie betalt</div>
              <div className="text-xs font-semibold text-faint num">21 900 kr · 1. juni</div>
            </div>
          </div>
          <div className="absolute -bottom-3.5 right-3.5 bg-surface rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px] animate-fade-up">
            <span className="w-9 h-9 rounded-full bg-amber-bg text-amber flex items-center justify-center"><TrendingUp size={17} /></span>
            <div>
              <div className="text-[13.5px] font-bold">Snitt yield 5,8 %</div>
              <div className="text-xs font-semibold text-faint">Porteføljen din</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Funksjoner ───────────────────────────────────────────────────────── */}
      <section id="funksjoner" className="bg-surface border-y border-line px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,88px)]">
        <div className="max-w-[1180px] mx-auto">
          <div className="text-center mb-[clamp(36px,5vw,56px)]">
            <div className="text-[13px] font-extrabold text-brand tracking-[0.08em] uppercase mb-3">Alt på ett sted</div>
            <h2 className="m-0 mx-auto mb-3.5 font-extrabold tracking-[-0.025em] max-w-[22ch] text-balance" style={{ fontSize: 'clamp(27px, 3.4vw, 38px)' }}>Mindre administrasjon. Bedre boforhold.</h2>
            <p className="m-0 mx-auto text-base leading-[1.6] text-muted max-w-[52ch]">Eiendomspro er bygget for langtidsutleie — rolig oversikt for deg som eier, og trygghet for de som bor der.</p>
          </div>
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))' }}>
            {[
              { icon: Building2, tittel: 'Full oversikt', tekst: 'Bygg, leieobjekter og økonomi i ett rolig dashbord. Du ser alltid hva som krever oppfølging — og hva som går av seg selv.' },
              { icon: ShieldCheck, tittel: 'Trygge kontrakter', tekst: 'Norsk standard leiekontrakt, depositum og overtakelsesprotokoll — generert, signert og arkivert på ett sted.' },
              { icon: Heart, tittel: 'Leietakere som trives', tekst: 'En egen portal der leietaker betaler, melder fra og finner dokumentene sine — uten å måtte mase på deg.' },
            ].map(({ icon: Icon, tittel, tekst }) => (
              <div key={tittel} className="bg-sand border border-line-soft rounded-[20px] p-7 transition-all hover:-translate-y-[3px] hover:shadow-card-lg">
                <div className="w-[46px] h-[46px] rounded-[14px] bg-mint text-brand flex items-center justify-center mb-[18px]"><Icon size={21} /></div>
                <div className="text-[17px] font-bold mb-2">{tittel}</div>
                <p className="m-0 text-[14.5px] leading-[1.6] text-muted">{tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── For leietakere ───────────────────────────────────────────────────── */}
      <section className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-[clamp(52px,7vw,88px)] grid gap-[clamp(32px,5vw,64px)] items-center"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}>
        <div className="relative">
          <div className="rounded-[26px] overflow-hidden bg-[#E8E4DB] shadow-card-lg" style={{ aspectRatio: '4 / 3' }}>
            <img src={LEIETAKER_BILDE} alt="Lyst soverom i leid bolig" loading="lazy" className="w-full h-full object-cover block" />
          </div>
          <div className="absolute -bottom-3.5 left-[18px] bg-surface rounded-[15px] px-[17px] py-[13px] shadow-card-lg flex items-center gap-[11px]">
            <span className="w-9 h-9 rounded-full bg-mint text-brand flex items-center justify-center"><Wrench size={16} /></span>
            <div>
              <div className="text-[13.5px] font-bold">Sak meldt inn</div>
              <div className="text-xs font-semibold text-faint">Utleier svarer vanligvis innen 2 timer</div>
            </div>
          </div>
        </div>
        <div>
          <div className="text-[13px] font-extrabold text-brand tracking-[0.08em] uppercase mb-3">For leietakere</div>
          <h2 className="m-0 mb-3.5 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: 'clamp(27px, 3.4vw, 38px)' }}>En portal som føles som god service</h2>
          <p className="m-0 mb-[26px] text-base leading-[1.6] text-muted max-w-[50ch]">Å leie skal ikke føles som papirarbeid. Leietakerne dine får et ryddig hjem på nett — med alt de trenger gjennom hele leieforholdet.</p>
          <div className="grid gap-3.5 mb-7">
            {[
              { icon: CreditCard, t: 'Husleie og betalingshistorikk, alltid oppdatert' },
              { icon: Wrench, t: 'Meld fra når noe er galt — følg saken til den er løst' },
              { icon: FileText, t: 'Kontrakt, protokoll og kvitteringer samlet på ett sted' },
              { icon: MessageSquare, t: 'Direktelinje til utleier, uten løse SMS-tråder' },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3.5">
                <span className="w-[38px] h-[38px] rounded-[12px] bg-mint text-brand flex items-center justify-center shrink-0"><Icon size={17} /></span>
                <div className="text-[15px] font-semibold text-ink-2">{t}</div>
              </div>
            ))}
          </div>
          <button onClick={tilLogin} className="inline-flex items-center gap-2 bg-transparent border-none p-0 text-[15px] font-bold text-brand-ink hover:underline cursor-pointer">
            Se leietakerportalen
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] pb-[clamp(52px,7vw,88px)]">
        <div className="bg-brand-deep rounded-[28px] px-[clamp(24px,5vw,64px)] py-[clamp(40px,6vw,72px)] text-center relative overflow-hidden">
          <div className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full bg-white/[0.07]" />
          <div className="absolute -bottom-20 -left-10 w-[260px] h-[260px] rounded-full bg-white/[0.05]" />
          <h2 className="relative m-0 mx-auto mb-3 font-extrabold tracking-[-0.025em] text-white max-w-[24ch] text-balance" style={{ fontSize: 'clamp(26px, 3.4vw, 38px)' }}>Klar for en roligere utleiehverdag?</h2>
          <p className="relative m-0 mx-auto mb-7 text-base text-white/80 max-w-[44ch]">Kom i gang på under fem minutter. Gratis å starte — ingen kort, ingen binding.</p>
          <button onClick={tilRegistrering} className="relative px-7 py-3.5 rounded-[13px] text-[15.5px] font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all cursor-pointer">Kom i gang gratis</button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-line">
        <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-7 flex items-center gap-[18px] flex-wrap">
          <Logo variant="dark" height={26} />
          <span className="text-[13px] font-medium text-faint">© 2026 Eiendomspro · Langtidsutleie, gjort enkelt</span>
          <div className="flex gap-5 ml-auto">
            {['Personvern', 'Vilkår', 'Kontakt'].map((t) => (
              <span key={t} className="text-[13px] font-semibold text-muted hover:text-ink cursor-pointer">{t}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
