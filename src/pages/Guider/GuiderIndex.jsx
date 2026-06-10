import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { MarketingNav, MarketingFooter, CTAStripe } from '../../components/Marketing';
import { M } from '../../components/marketing-tokens';
import { useSEO } from '../../hooks/useSEO';
import { ARTIKLER } from './artikler';

export default function GuiderIndex() {
  useSEO({
    title: 'Guider for utleiere — yield, skatt og leiekontrakt | EiendomsPRO',
    description: 'Praktiske guider for norske utleiere: regn ut yield, forstå skatt på utleie, og lag en trygg leiekontrakt etter husleieloven.',
    path: '/guider',
  });

  return (
    <div style={{ background: M.lerret, minHeight: '100vh' }}>
      <MarketingNav />

      <section className="px-6 pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <span className="h-px w-6" style={{ background: M.gull }} />
          <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: M.gull }}>Guider</span>
        </div>
        <h1 className="font-display mb-4" style={{ color: M.navy, fontSize: 'clamp(2rem,4.4vw,3.2rem)', lineHeight: 1.08, fontWeight: 600 }}>
          Kunnskap for norske utleiere
        </h1>
        <p className="text-lg max-w-2xl mx-auto" style={{ color: M.tekst2 }}>
          Konkrete guider om lønnsomhet, skatt og leiekontrakter — skrevet for deg som leier ut i Norge.
        </p>
      </section>

      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
          {ARTIKLER.map((a) => (
            <Link key={a.slug} to={`/guider/${a.slug}`}
              className="group bg-white rounded-2xl p-6 shadow-card hover:shadow-card-lg transition-all flex flex-col"
              style={{ border: `1px solid ${M.kant}` }}>
              <span className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: M.gull }}>{a.kategori}</span>
              <h2 className="font-display text-xl mb-2" style={{ color: M.navy, fontWeight: 600, lineHeight: 1.2 }}>{a.tittel}</h2>
              <p className="text-sm leading-relaxed flex-1" style={{ color: M.tekst2 }}>{a.ingress}</p>
              <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: `1px solid ${M.kant}` }}>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: M.tekst3 }}><Clock size={13} /> {a.lesetid}</span>
                <span className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all" style={{ color: M.navy }}>Les guide <ArrowRight size={15} /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <CTAStripe tittel="Sett kunnskapen ut i livet" undertekst="Opprett en gratis konto og få full oversikt over utleieøkonomien din." kilde="guider-index" />
      <MarketingFooter />
    </div>
  );
}
