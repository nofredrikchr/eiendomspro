import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { abonnementApi } from '../services/abonnementApi';
import { PLANER } from '../lib/planer';

const FORDELER = {
  privat: ['Alle analyser låst opp', 'Inntil 5 leieobjekter', '10-års prognose og bankrapport', 'KPI-varsling for leieregulering'],
  pro: ['Ubegrenset antall leieobjekter', 'Privat/Selskap (AS)-modus', 'Alle rapporter', 'Prioritert support'],
};

export default function Velkommen() {
  const navigate = useNavigate();
  const { lastInn } = useAuth();
  const [data, setData] = useState(null);
  const [forsok, setForsok] = useState(0);

  // Etter Stripe-redirect kan webhooken ligge et øyeblikk bak — vi poller
  // /api/abonnement til status er 'prøve' (kort-sikret prøve) eller 'aktiv'.
  const sjekk = useCallback(async () => {
    try {
      const d = await abonnementApi.hent();
      setData(d);
      if (['prøve', 'aktiv'].includes(d?.abonnement?.status)) { lastInn(); return true; }
    } catch { /* prøv igjen */ }
    return false;
  }, [lastInn]);

  useEffect(() => {
    let aktiv = true;
    let timer;
    (async () => {
      const ok = await sjekk();
      if (!ok && aktiv && forsok < 5) {
        timer = setTimeout(() => { if (aktiv) setForsok((f) => f + 1); }, 1500);
      }
    })();
    return () => { aktiv = false; clearTimeout(timer); };
  }, [sjekk, forsok]);

  const status = data?.abonnement?.status;
  const ferdig = status === 'prøve' || status === 'aktiv';
  const erTrial = status === 'prøve';
  const planId = data?.abonnement?.planId || data?.plan || 'privat';
  const planNavn = PLANER[planId]?.navn ?? 'abonnementet';
  const dagerIgjen = data?.trialDagerIgjen ?? 14;
  const venter = !data || (!ferdig && forsok < 5);
  const fordeler = FORDELER[planId] || FORDELER.privat;

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      <header className="max-w-[1140px] w-full mx-auto px-[clamp(16px,3.5vw,44px)] py-5">
        <button onClick={() => navigate('/app')} className="cursor-pointer"><Logo variant="dark" height={30} /></button>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand text-white flex items-center justify-center mx-auto mb-6 shadow-brand">
            {venter ? <Loader2 size={30} className="animate-spin" /> : <Check size={32} strokeWidth={2.6} />}
          </div>

          {venter ? (
            <>
              <h1 className="text-[26px] font-extrabold text-ink mb-2">Setter opp abonnementet…</h1>
              <p className="text-[15px] text-muted leading-relaxed">Vi bekrefter detaljene dine. Dette tar vanligvis bare et par sekunder.</p>
            </>
          ) : ferdig ? (
            <>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-mint text-brand-ink text-[12px] font-extrabold px-3 py-1 mb-4">
                <Sparkles size={13} /> {planNavn}{erTrial ? ' – prøveperiode' : '-abonnement aktivt'}
              </div>
              <h1 className="text-[30px] font-extrabold text-ink leading-tight mb-2">Velkommen på laget! 🎉</h1>
              <p className="text-[15px] text-muted leading-relaxed mb-6">
                {erTrial ? (
                  <>Prøveperioden din på <strong>{planNavn}</strong> er i gang – du har <strong>{dagerIgjen} dager</strong> med full tilgang.
                    {' '}Du kan si opp når som helst i Min konto før prøven utløper, så trekkes ingenting.</>
                ) : (
                  <>Du er nå på <strong>{planNavn}</strong>-planen, og alt er låst opp. Takk for at du valgte EiendomsPRO.</>
                )}
              </p>

              <div className="rounded-2xl border border-line bg-surface p-5 text-left mb-6">
                <div className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-faint mb-3">Dette er inkludert</div>
                <ul className="flex flex-col gap-2.5">
                  {fordeler.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[14px] text-ink-2">
                      <Check size={16} className="text-brand shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-2.5">
                <button onClick={() => navigate('/app')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white px-6 py-3.5 text-[15px] font-bold hover:bg-brand-hover cursor-pointer">
                  Gå til oversikten <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate('/innstillinger')}
                  className="text-[13.5px] font-bold text-muted hover:text-brand-ink cursor-pointer">
                  {erTrial ? 'Administrer prøveperioden i Min konto' : 'Se abonnementet i Min konto'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[26px] font-extrabold text-ink mb-2">Nesten i mål</h1>
              <p className="text-[15px] text-muted leading-relaxed mb-6">
                Vi mottok betalingsdetaljene, men bekreftelsen tok litt lengre tid enn vanlig. Den dukker opp i Min konto straks – du trenger ikke gjøre noe mer.
              </p>
              <button onClick={() => navigate('/innstillinger')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand text-white px-6 py-3.5 text-[15px] font-bold hover:bg-brand-hover cursor-pointer">
                Til Min konto <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
