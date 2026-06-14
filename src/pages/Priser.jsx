import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { PLANER, formaterKr, besparelseAarOre } from '../lib/planer';

const KORT = [
  {
    id: 'gratis',
    fremhevet: false,
    punkter: [
      '1 leieobjekt',
      'Månedlig netto kontantstrøm',
      'Brutto- og netto yield',
      'Ingen betalingsinfo nødvendig',
    ],
    cta: 'Start gratis – ingen kort',
  },
  {
    id: 'privat',
    fremhevet: false,
    punkter: [
      'Inntil 5 leieobjekter',
      'Alle analyser låst opp',
      '10-års prognose',
      'Oppussings- og investeringsanalyse',
      'Budsjett vs. faktisk kontantstrøm',
      'Sammenligning mellom boliger',
      'Bankrapport (PDF)',
      'KPI-varsling for leieregulering',
    ],
    cta: 'Velg Privat',
  },
  {
    id: 'pro',
    fremhevet: true,
    punkter: [
      'Ubegrenset antall leieobjekter',
      'Alt i Privat',
      'Privat/Selskap (AS)-modus med skattebehandling',
      'Alle rapporter',
      'Prioritert support',
    ],
    cta: 'Velg Pro',
  },
];

const FAQ = [
  ['Er det bindingstid?', 'Nei. Du kan si opp når som helst, og beholder tilgangen ut den betalte perioden.'],
  ['Hva skjer etter prøveperioden?', 'Du beholder en permanent Gratis-konto. De avanserte analysene låses, men alt du har lagt inn bevares.'],
  ['Hva skjer med dataene mine?', 'Alt du har lagt inn – bygg, leieobjekter, kostnader, kontrakter og rapporter – bevares fullstendig. Melder du deg inn igjen, er alt umiddelbart tilbake der du slapp.'],
  ['Hva koster BankID-signering?', 'Signert leiekontrakt med BankID koster 49 kr for betalende abonnenter og 199 kr for gratisbrukere. Allerede signerte kontrakter kan alltid lastes ned senere.'],
  ['Hvordan fungerer verving?', 'Verv en venn og få 2 måneder gratis når vennen blir betalende. Vennen får selv 1 måned gratis. Ingen øvre grense.'],
];

function Pris({ planId, intervall }) {
  const p = PLANER[planId];
  if (p.prisMndOre === 0) return <div className="text-[34px] font-extrabold text-ink leading-none">0 kr</div>;
  if (intervall === 'aar') {
    return (
      <div>
        <div className="text-[34px] font-extrabold text-ink leading-none">{formaterKr(p.prisAarOre)}<span className="text-sm font-bold text-faint">/år</span></div>
        <div className="text-[12.5px] font-bold text-brand-ink mt-1">Spar {formaterKr(besparelseAarOre(planId))} – 2 måneder gratis</div>
      </div>
    );
  }
  return <div className="text-[34px] font-extrabold text-ink leading-none">{formaterKr(p.prisMndOre)}<span className="text-sm font-bold text-faint">/mnd</span></div>;
}

export default function Priser() {
  const [intervall, setIntervall] = useState('aar');
  const [jobber, setJobber] = useState(null);
  const [feil, setFeil] = useState(null);
  const navigate = useNavigate();
  const { innlogget, lastInn } = useAuth();

  async function velg(planId) {
    if (planId === 'gratis') { navigate(innlogget ? '/app' : '/register'); return; }
    if (!innlogget) { navigate(`/register?plan=${planId}&intervall=${intervall}`); return; }
    setFeil(null);
    setJobber(planId);
    try {
      const { abonnementApi } = await import('../services/abonnementApi');
      const r = await abonnementApi.start(planId, intervall);
      await lastInn();
      if (r.url) { window.location.assign(r.url); return; }
      navigate('/innstillinger?betaling=ok');
    } catch (e) {
      setFeil(e.message || 'Noe gikk galt. Prøv igjen.');
    } finally {
      setJobber(null);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="max-w-[1140px] mx-auto px-[clamp(16px,3.5vw,44px)] py-5 flex items-center justify-between">
        <button onClick={() => navigate(innlogget ? '/app' : '/')} className="cursor-pointer"><Logo variant="dark" height={30} /></button>
        <button onClick={() => navigate(innlogget ? '/app' : '/')}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-ink-2 cursor-pointer">
          <ArrowLeft size={15} /> Tilbake
        </button>
      </header>

      <main className="max-w-[1140px] mx-auto px-[clamp(16px,3.5vw,44px)] pb-20">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold text-ink leading-tight">Velg planen som passer deg</h1>
          <p className="text-[15px] text-muted mt-3">Start gratis i 14 dager med full Pro-tilgang – uten kort. Ingen bindingstid, og dataene dine bevares alltid.</p>
        </div>

        {/* Måned/år-veksler */}
        <div className="flex items-center justify-center gap-1 mb-9">
          <div className="inline-flex rounded-full bg-line-soft p-1">
            <button onClick={() => setIntervall('mnd')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition ${intervall === 'mnd' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              Månedlig
            </button>
            <button onClick={() => setIntervall('aar')}
              className={`px-4 py-1.5 rounded-full text-[13px] font-bold cursor-pointer transition inline-flex items-center gap-1.5 ${intervall === 'aar' ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}>
              Årlig <span className="text-[11px] font-extrabold text-brand-ink bg-mint rounded-full px-1.5 py-0.5">2 mnd gratis</span>
            </button>
          </div>
        </div>

        {feil && <div className="max-w-md mx-auto mb-5 rounded-xl border border-danger/25 bg-danger/[0.07] px-4 py-2.5 text-sm font-medium text-danger text-center">{feil}</div>}

        {/* Kort */}
        <div className="grid md:grid-cols-3 gap-5 items-start">
          {KORT.map((kort) => {
            const p = PLANER[kort.id];
            return (
              <div key={kort.id}
                className={`relative rounded-2xl bg-surface p-6 flex flex-col ${kort.fremhevet ? 'ring-2 ring-brand shadow-soft md:-mt-3 md:pt-9' : 'border border-line'}`}>
                {kort.fremhevet && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-full bg-brand text-white text-[11px] font-extrabold px-3 py-1">
                    <Sparkles size={12} /> Mest populær
                  </div>
                )}
                <div className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-faint">{p.navn}</div>
                <div className="mt-3 mb-1 min-h-[64px]"><Pris planId={kort.id} intervall={intervall} /></div>
                <p className="text-[13px] text-muted mb-5">{p.tagline}</p>
                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {kort.punkter.map((punkt) => (
                    <li key={punkt} className="flex items-start gap-2 text-[13.5px] text-ink-2">
                      <Check size={16} className="text-brand shrink-0 mt-0.5" />
                      <span>{punkt}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => velg(kort.id)} disabled={jobber === kort.id}
                  className={`w-full rounded-xl py-3 text-[15px] font-bold cursor-pointer transition disabled:opacity-50
                    ${kort.fremhevet ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-surface text-ink-2 border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink'}`}>
                  {jobber === kort.id ? 'Starter…' : kort.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="text-xl font-extrabold text-ink text-center mb-6">Ofte stilte spørsmål</h2>
          <div className="flex flex-col gap-3">
            {FAQ.map(([sp, svar]) => (
              <div key={sp} className="rounded-2xl border border-line bg-surface p-5">
                <div className="text-[15px] font-bold text-ink mb-1.5">{sp}</div>
                <p className="text-sm text-muted leading-relaxed">{svar}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <button onClick={() => velg('gratis')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand text-white px-7 py-3.5 text-[15px] font-bold hover:bg-brand-hover cursor-pointer">
            Start gratis – ingen kort
          </button>
        </div>
      </main>
    </div>
  );
}
