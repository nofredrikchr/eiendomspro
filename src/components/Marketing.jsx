import { Link } from 'react-router-dom';
import { Logo } from './Logo';
import { ArrowRight } from 'lucide-react';
import { sporHendelse, HENDELSE } from '../utils/analytikk';
import { M } from './marketing-tokens';

export function MarketingNav() {
  return (
    <nav className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'saturate(180%) blur(12px)', borderBottom: `1px solid ${M.kant}` }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" aria-label="EiendomsPRO forside"><Logo variant="dark" height={28} /></Link>
        <div className="hidden md:flex items-center gap-7">
          <a href="/#funksjoner" className="text-sm transition-colors" style={{ color: M.tekst2 }}>Funksjoner</a>
          <Link to="/kalkulator" className="text-sm transition-colors" style={{ color: M.tekst2 }}>Kalkulator</Link>
          <Link to="/guider" className="text-sm transition-colors" style={{ color: M.tekst2 }}>Guider</Link>
          <a href="/#priser" className="text-sm transition-colors" style={{ color: M.tekst2 }}>Priser</a>
          <a href="/login" className="text-sm transition-colors" style={{ color: M.tekst2 }}>Logg inn</a>
          <a href="/register" onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde: 'marketing-nav' })}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-all" style={{ background: M.navy, color: '#fff' }}
            onMouseEnter={e => e.currentTarget.style.background = M.navyHover}
            onMouseLeave={e => e.currentTarget.style.background = M.navy}>
            Kom i gang gratis
          </a>
        </div>
        <a href="/register" className="md:hidden text-sm font-semibold px-3.5 py-2 rounded-lg" style={{ background: M.navy, color: '#fff' }}>Start gratis</a>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="px-6 py-12" style={{ background: '#fff', borderTop: `1px solid ${M.kant}` }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-3">
          <Link to="/"><Logo variant="dark" height={24} /></Link>
          <span className="text-xs" style={{ color: M.tekst3 }}>© {new Date().getFullYear()} EiendomsPRO AS</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" style={{ color: M.tekst2 }}>
          <Link to="/kalkulator" className="hover:opacity-70 transition-opacity">Yield-kalkulator</Link>
          <Link to="/guider" className="hover:opacity-70 transition-opacity">Guider</Link>
          <a href="/#priser" className="hover:opacity-70 transition-opacity">Priser</a>
          <a href="/login" className="hover:opacity-70 transition-opacity">Logg inn</a>
        </div>
      </div>
    </footer>
  );
}

export function CTAStripe({ tittel = 'Klar for full oversikt?', undertekst = 'Kom i gang gratis — ingen kredittkort.', kilde = 'cta-stripe' }) {
  return (
    <section className="px-6 py-16" style={{ background: M.lerret }}>
      <div className="max-w-3xl mx-auto text-center rounded-3xl px-8 py-12" style={{ background: M.navy }}>
        <h2 className="font-display text-white mb-3" style={{ fontSize: 'clamp(1.6rem,3.2vw,2.3rem)', fontWeight: 600, lineHeight: 1.15 }}>{tittel}</h2>
        <p className="mb-7" style={{ color: 'rgba(255,255,255,0.78)' }}>{undertekst}</p>
        <a href="/register" onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde })}
          className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-base font-semibold transition-all"
          style={{ background: '#fff', color: M.navy }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          Kom i gang gratis <ArrowRight size={17} />
        </a>
      </div>
    </section>
  );
}
