import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, CreditCard, Gift } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { abonnementApi } from '../services/abonnementApi';
import { PLANER, formaterKr, besparelseAarOre } from '../lib/planer';

const KORT = [
  {
    id: 'gratis',
    punkter: ['1 leieobjekt', 'Månedlig netto kontantstrøm', 'Brutto- og netto yield'],
    cta: 'Kom i gang gratis',
    kort: false,
  },
  {
    id: 'privat',
    fremhevet: true,
    punkter: ['Inntil 5 leieobjekter', 'Alle analyser låst opp', '10-års prognose og bankrapport', 'KPI-varsling'],
    cta: 'Start 14 dagers prøve',
    kort: true,
  },
  {
    id: 'pro',
    punkter: ['Ubegrenset antall leieobjekter', 'Alt i Utleier', 'Privat/Selskap (AS)-modus', 'Prioritert support'],
    cta: 'Start 14 dagers prøve',
    kort: true,
  },
];

export default function VelgPlan() {
  const [intervall, setIntervall] = useState('mnd');
  const [jobber, setJobber] = useState(null);
  const [feil, setFeil] = useState(null);
  const navigate = useNavigate();
  const { innlogget, laster } = useAuth();

  if (!laster && !innlogget) { navigate('/login'); return null; }

  async function velg(planId) {
    if (planId === 'gratis') { navigate('/app'); return; }
    setFeil(null);
    setJobber(planId);
    try {
      const r = await abonnementApi.start(planId, intervall); // 14 dagers prøve, kort kreves
      if (r.url) { window.location.assign(r.url); return; }
      navigate('/velkommen'); // stub
    } catch (e) {
      setFeil(e.message || 'Noe gikk galt. Prøv igjen.');
      setJobber(null);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="max-w-[1140px] mx-auto px-[clamp(16px,3.5vw,44px)] py-5">
        <Logo variant="dark" height={30} />
      </header>

      <main className="max-w-[1080px] mx-auto px-[clamp(16px,3.5vw,44px)] pb-20">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-mint text-brand-ink text-[12px] font-extrabold px-3 py-1 mb-4">
            <Sparkles size={13} /> Velkommen!
          </div>
          <h1 className="text-[clamp(26px,4vw,36px)] font-extrabold text-ink leading-tight">Velg hvordan du vil starte</h1>
          <p className="text-[15px] text-muted mt-3">
            Start helt gratis, eller prøv Utleier/Pro i 14 dager. Prøveperioden krever kort, men
            <strong> du kan si opp når som helst før den utløper — da trekkes ingenting.</strong>
          </p>
        </div>

        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex rounded-full bg-line-soft p-1">
            <button onClick={() => setIntervall('mnd')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition ${intervall === 'mnd' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>Månedlig</button>
            <button onClick={() => setIntervall('aar')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition inline-flex items-center gap-1.5 ${intervall === 'aar' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              Årlig <span className="text-[11px] font-extrabold text-brand-ink bg-mint rounded-full px-1.5 py-0.5">2 mnd gratis</span>
            </button>
          </div>
        </div>

        {feil && <div className="max-w-md mx-auto mb-5 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-2.5 text-sm font-medium text-danger text-center">{feil}</div>}

        <div className="grid md:grid-cols-3 gap-5 items-start">
          {KORT.map((kort) => {
            const p = PLANER[kort.id];
            const pris = kort.id === 'gratis' ? '0 kr'
              : intervall === 'aar' ? `${formaterKr(p.prisAarOre)}` : `${formaterKr(p.prisMndOre)}`;
            const suffiks = kort.id === 'gratis' ? '/mnd' : intervall === 'aar' ? '/år' : '/mnd';
            return (
              <div key={kort.id}
                className={`relative rounded-2xl bg-surface p-6 flex flex-col ${kort.fremhevet ? 'ring-2 ring-brand shadow-soft md:-mt-3 md:pt-9' : 'border border-line'}`}>
                {kort.fremhevet && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-brand text-white text-[11px] font-extrabold px-3 py-1">
                    <Sparkles size={12} /> Mest populær
                  </div>
                )}
                <div className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-faint">{p.navn}</div>
                <div className="mt-3 mb-1 flex items-baseline gap-1">
                  <span className="text-[30px] font-extrabold text-ink leading-none">{pris}</span>
                  <span className="text-[13px] font-bold text-faint">{suffiks}</span>
                </div>
                {kort.id !== 'gratis' && intervall === 'aar'
                  ? <div className="text-[12px] font-bold text-brand-ink mb-4">Spar {formaterKr(besparelseAarOre(kort.id))}</div>
                  : <div className="text-[12px] text-faint mb-4">{kort.kort ? '14 dagers gratis prøve' : 'Ingen kort nødvendig'}</div>}
                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {kort.punkter.map((punkt) => (
                    <li key={punkt} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                      <Check size={16} className="text-brand shrink-0 mt-0.5" />{punkt}
                    </li>
                  ))}
                </ul>
                <button onClick={() => velg(kort.id)} disabled={jobber === kort.id}
                  className={`w-full rounded-xl py-3 text-[14.5px] font-bold cursor-pointer transition disabled:opacity-50 inline-flex items-center justify-center gap-2
                    ${kort.fremhevet ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-surface text-ink-2 border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink'}`}>
                  {kort.kort && <CreditCard size={14} />}
                  {jobber === kort.id ? 'Starter…' : kort.cta}
                </button>
                {kort.kort && <p className="text-[11px] text-faint text-center mt-2">Kort kreves · ingen trekk før prøven er over</p>}
              </div>
            );
          })}
        </div>

        <div className="text-center mt-8 flex items-center justify-center gap-2 text-[13px] text-faint">
          <Gift size={14} className="text-brand" /> Du kan oppgradere, nedgradere eller si opp når som helst.
        </div>
      </main>
    </div>
  );
}
