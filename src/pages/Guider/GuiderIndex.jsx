import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { MarketingNav, MarketingFooter, CTAStripe } from '../../components/Marketing';
import { useSEO } from '../../hooks/useSEO';
import { ARTIKLER } from './artikler';

export default function GuiderIndex() {
  useSEO({
    title: 'Guider for utleiere — yield, skatt og leiekontrakt | EiendomsPRO',
    description: 'Praktiske guider for norske utleiere: regn ut yield, forstå skatt på utleie, og lag en trygg leiekontrakt etter husleieloven.',
    path: '/guider',
  });

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingNav />

      <section className="px-[clamp(20px,4vw,40px)] pt-16 pb-10 text-center">
        <div className="inline-flex items-center gap-2 bg-mint text-brand-ink text-[13px] font-bold px-3.5 py-[7px] rounded-full mb-5">
          Guider
        </div>
        <h1 className="m-0 mb-4 font-extrabold tracking-[-0.025em] text-balance" style={{ fontSize: 'clamp(2rem,4.4vw,3.2rem)', lineHeight: 1.08 }}>
          Kunnskap for norske utleiere
        </h1>
        <p className="m-0 mx-auto text-lg max-w-2xl leading-[1.6] text-muted">
          Konkrete guider om lønnsomhet, skatt og leiekontrakter — skrevet for deg som leier ut i Norge.
        </p>
      </section>

      <section className="px-[clamp(20px,4vw,40px)] pb-16">
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-5">
          {ARTIKLER.map((a) => (
            <Link key={a.slug} to={`/guider/${a.slug}`}
              className="group bg-surface rounded-[20px] p-6 shadow-card border border-line hover:-translate-y-0.5 hover:shadow-card-lg transition-all flex flex-col">
              <span className="text-xs font-extrabold uppercase tracking-[0.08em] mb-3 text-brand">{a.kategori}</span>
              <h2 className="text-xl font-extrabold tracking-[-0.01em] mb-2 text-ink" style={{ lineHeight: 1.2 }}>{a.tittel}</h2>
              <p className="text-sm leading-relaxed flex-1 text-muted">{a.ingress}</p>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-line-soft">
                <span className="flex items-center gap-1.5 text-xs text-muted-2"><Clock size={13} /> {a.lesetid}</span>
                <span className="flex items-center gap-1 text-sm font-bold text-brand-ink group-hover:gap-2 transition-all">Les guide <ArrowRight size={15} strokeWidth={2.2} /></span>
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
