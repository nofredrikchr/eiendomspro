import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calculator, Clock, Check, Lightbulb } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '../../components/Marketing';
import { useSEO } from '../../hooks/useSEO';
import { sporHendelse, HENDELSE } from '../../utils/analytikk';
import { finnArtikkel } from './artikler';
import KpiKalkulator from './KpiKalkulator';

const BASE = 'https://eiendomspro.no';

// Enkel inline-parser: **fet** og _kursiv_
function inline(tekst) {
  const deler = [];
  const re = /\*\*(.+?)\*\*|_(.+?)_/g;
  let sist = 0, m, k = 0;
  while ((m = re.exec(tekst))) {
    if (m.index > sist) deler.push(tekst.slice(sist, m.index));
    if (m[1] != null) deler.push(<strong key={k++} className="text-ink">{m[1]}</strong>);
    else deler.push(<em key={k++}>{m[2]}</em>);
    sist = re.lastIndex;
  }
  if (sist < tekst.length) deler.push(tekst.slice(sist));
  return deler;
}

function Blokk({ b }) {
  if (b.type === 'kpikalkulator') return <KpiKalkulator />;
  if (b.type === 'h2') return <h2 className="font-extrabold tracking-[-0.02em] mt-9 mb-3 text-ink" style={{ fontSize: '1.5rem' }}>{b.tekst}</h2>;
  if (b.type === 'p') return <p className="mb-4 text-[16px] leading-[1.75] text-muted">{inline(b.tekst)}</p>;
  if (b.type === 'ul') return (
    <ul className="mb-4 space-y-2.5">
      {b.punkter.map((p, i) => (
        <li key={i} className="flex gap-3 text-[16px] leading-[1.7] text-muted">
          <span className="mt-2.5 w-1.5 h-1.5 rounded-full shrink-0 bg-brand" />
          <span>{inline(p)}</span>
        </li>
      ))}
    </ul>
  );
  if (b.type === 'tip') return (
    <div className="my-6 rounded-[14px] px-5 py-4 text-[15px] leading-relaxed bg-amber-bg border border-amber-line text-amber flex gap-3">
      <Lightbulb size={18} className="shrink-0 mt-0.5" />
      <span>{inline(b.tekst)}</span>
    </div>
  );
  return null;
}

export default function GuideArtikkel() {
  const { slug } = useParams();
  const a = finnArtikkel(slug);
  const relaterte = (a?.relaterte || []).map(finnArtikkel).filter(Boolean);

  useSEO({
    title: a ? `${a.tittel} | EiendomsPRO` : 'Guide ikke funnet | EiendomsPRO',
    description: a?.description || 'Guide for norske utleiere.',
    path: `/guider/${slug}`,
  });

  // Article-structured data for rich results
  useEffect(() => {
    if (!a) return;
    sporHendelse(HENDELSE.guideLest, { slug: a.slug });
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Article',
      headline: a.tittel, description: a.description,
      datePublished: a.dato, inLanguage: 'nb-NO',
      author: { '@type': 'Organization', name: 'EiendomsPRO' },
      publisher: { '@type': 'Organization', name: 'EiendomsPRO', logo: { '@type': 'ImageObject', url: `${BASE}/eiendomspro-logo.png` } },
      mainEntityOfPage: `${BASE}/guider/${a.slug}`,
    });
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, [a]);

  if (!a) {
    return (
      <div className="min-h-screen bg-canvas text-ink">
        <MarketingNav />
        <div className="max-w-2xl mx-auto px-6 py-32 text-center">
          <h1 className="font-extrabold tracking-[-0.02em] text-2xl mb-3 text-ink">Fant ikke guiden</h1>
          <Link to="/guider" className="text-sm font-bold text-brand-ink hover:underline">← Tilbake til alle guider</Link>
        </div>
        <MarketingFooter />
      </div>
    );
  }

  const datoTekst = (() => { try { return new Date(a.dato).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } })();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <MarketingNav />

      <article className="max-w-2xl mx-auto px-6 pt-12 pb-8">
        <Link to="/guider" className="inline-flex items-center gap-1.5 text-sm font-semibold mb-7 text-muted hover:text-ink hover:gap-2.5 transition-all">
          <ArrowLeft size={15} /> Alle guider
        </Link>
        <span className="block text-xs font-extrabold uppercase tracking-[0.08em] mb-3 text-brand">{a.kategori}</span>
        <h1 className="m-0 mb-4 font-extrabold tracking-[-0.025em] text-ink" style={{ fontSize: 'clamp(1.9rem,4vw,2.7rem)', lineHeight: 1.12 }}>{a.tittel}</h1>
        <div className="flex items-center gap-4 text-xs mb-6 text-muted-2">
          <span className="flex items-center gap-1.5"><Clock size={13} /> {a.lesetid}</span>
          <span>{datoTekst}</span>
        </div>
        <p className="text-lg leading-relaxed mb-2 pb-6 text-ink border-b border-line">{a.ingress}</p>

        <div className="mt-6">
          {a.blokker.map((b, i) => <Blokk key={i} b={b} />)}
        </div>

        {/* Kontekstuell CTA */}
        {a.cta && (
          <div className="mt-10 rounded-[20px] p-6 bg-brand-deep relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-white/[0.06]" />
            <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
              <div className="min-w-0">
                <h2 className="text-white font-extrabold tracking-[-0.01em] text-lg mb-1">{a.cta.tittel}</h2>
                {a.cta.tekst && <p className="text-[14px] leading-snug text-white/80">{a.cta.tekst}</p>}
              </div>
              {a.cta.lenke === '/kalkulator' ? (
                <Link to="/kalkulator" className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all">
                  <Calculator size={16} /> {a.cta.knapp || 'Åpne kalkulator'}
                </Link>
              ) : (
                <a href={a.cta.lenke || '/register'} onClick={() => sporHendelse(HENDELSE.registreringKlikk, { kilde: a.cta.kilde || `guide:${a.slug}` })}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-brand-ink bg-white hover:-translate-y-px shadow-card-lg transition-all">
                  {a.cta.knapp || 'Kom i gang gratis'} <ArrowRight size={16} strokeWidth={2.2} />
                </a>
              )}
            </div>
            {a.cta.punkter && (
              <ul className="relative mt-5 grid sm:grid-cols-3 gap-2.5">
                {a.cta.punkter.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-white/85">
                    <Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-mint" />{p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Relaterte guider */}
        {relaterte.length > 0 && (
          <div className="mt-12 pt-8 border-t border-line">
            <h2 className="font-extrabold tracking-[-0.01em] text-lg mb-4 text-ink">Relaterte guider</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {relaterte.map((g) => (
                <Link key={g.slug} to={`/guider/${g.slug}`}
                  className="group rounded-[14px] border border-line p-4 bg-surface hover:-translate-y-0.5 hover:shadow-card transition-all flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-brand">{g.kategori}</span>
                    <div className="text-sm font-bold mt-0.5 truncate text-ink">{g.tittel}</div>
                  </div>
                  <ArrowRight size={15} strokeWidth={2.2} className="shrink-0 text-brand-ink" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <MarketingFooter />
    </div>
  );
}
