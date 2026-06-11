import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowRight } from 'lucide-react';
import { sporHendelse, HENDELSE } from '../utils/analytikk';

/* ─────────────────────────────────────────────────────────────────────────────
   Delt markedsførings-kit (header/footer/CTA) — redesign 2026.
   Matcher forsiden: kremlerret, frisk teal-aksent, Plus Jakarta Sans.
   Beholder samme eksport-navn og props som før.
   ──────────────────────────────────────────────────────────────────────────── */

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 bg-canvas/90 backdrop-blur-[14px] border-b border-line">
      <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] h-[70px] flex items-center gap-5">
        <Link to="/" aria-label="EiendomsPRO forside"><Logo variant="dark" height={32} /></Link>
        <nav className="hidden md:flex gap-0.5 ml-auto">
          <a href="/#funksjoner" className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink transition-colors">Funksjoner</a>
          <Link to="/kalkulator" className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink transition-colors">Kalkulator</Link>
          <Link to="/guider" className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink transition-colors">Guider</Link>
          <a href="/#priser" className="px-3.5 py-2.5 rounded-[10px] text-sm font-semibold text-muted hover:bg-line-soft hover:text-ink transition-colors">Priser</a>
        </nav>
        <div className="flex gap-2.5 items-center ml-auto md:ml-0">
          <a href="/login" className="hidden sm:inline-flex px-4 py-2.5 rounded-[11px] text-sm font-bold text-ink-2 hover:bg-line-soft transition-colors">Logg inn</a>
          <a
            href="/register"
            onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde: 'marketing-nav' })}
            className="px-[18px] py-2.5 rounded-[11px] text-sm font-bold text-white bg-brand hover:bg-brand-hover shadow-brand transition-colors"
          >
            Kom i gang gratis
          </a>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="max-w-[1180px] mx-auto px-[clamp(20px,4vw,40px)] py-9 flex flex-col md:flex-row items-center gap-5 md:gap-[18px] flex-wrap">
        <Link to="/"><Logo variant="dark" height={26} /></Link>
        <span className="text-[13px] font-medium text-faint">© {new Date().getFullYear()} EiendomsPRO AS · Langtidsutleie, gjort enkelt</span>
        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 ml-auto">
          <Link to="/kalkulator" className="text-[13px] font-semibold text-muted hover:text-ink transition-colors">Yield-kalkulator</Link>
          <Link to="/guider" className="text-[13px] font-semibold text-muted hover:text-ink transition-colors">Guider</Link>
          <a href="/#priser" className="text-[13px] font-semibold text-muted hover:text-ink transition-colors">Priser</a>
          <a href="/login" className="text-[13px] font-semibold text-muted hover:text-ink transition-colors">Logg inn</a>
        </div>
      </div>
    </footer>
  );
}

export function CTAStripe({ tittel = 'Klar for full oversikt?', undertekst = 'Kom i gang gratis — ingen kredittkort.', kilde = 'cta-stripe' }) {
  return (
    <section className="px-[clamp(20px,4vw,40px)] py-[clamp(40px,6vw,72px)] bg-canvas">
      <div className="max-w-3xl mx-auto text-center bg-brand-deep rounded-[28px] px-[clamp(24px,5vw,64px)] py-[clamp(40px,6vw,64px)] relative overflow-hidden">
        <div className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full bg-white/[0.07]" />
        <div className="absolute -bottom-20 -left-10 w-[260px] h-[260px] rounded-full bg-white/[0.05]" />
        <h2 className="relative m-0 mx-auto mb-3 font-extrabold tracking-[-0.025em] text-white max-w-[24ch] text-balance" style={{ fontSize: 'clamp(26px,3.4vw,38px)' }}>{tittel}</h2>
        <p className="relative m-0 mx-auto mb-7 text-base text-white/80 max-w-[44ch]">{undertekst}</p>
        <a
          href="/register"
          onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde })}
          className="relative inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-[13px] text-[15.5px] font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all"
        >
          Kom i gang gratis <ArrowRight size={17} strokeWidth={2.2} />
        </a>
      </div>
    </section>
  );
}
