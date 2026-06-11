import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertCircle, Check, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

/* ─────────────────────────────────────────────────────────────────────────────
   EiendomsPRO — velg nytt passord (redesign 2026)
   Sentrert hvitt kort på kremlerret. Kun presentasjon endret.
   ──────────────────────────────────────────────────────────────────────────── */

export default function ResetPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(useLocation().search).get('token');
  const [passord, setPassord] = useState('');
  const [bekreft, setBekreft] = useState('');
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState('');
  const [ferdig, setFerdig] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setFeil('');
    if (passord.length < 8) { setFeil('Passord må være minst 8 tegn.'); return; }
    if (passord !== bekreft) { setFeil('Passordene er ikke like.'); return; }
    setJobber(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, passord }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setFeil(data.feil || 'Kunne ikke tilbakestille passordet.'); setJobber(false); return; }
      setFerdig(true);
    } catch { setFeil('Noe gikk galt. Prøv igjen.'); setJobber(false); }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink animate-fade-up flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <button onClick={() => navigate('/')} className="flex justify-center w-full mb-7 bg-transparent border-none p-0 cursor-pointer">
          <Logo variant="dark" height={32} />
        </button>
        <div className="bg-surface border border-line rounded-[20px] shadow-card-lg p-[clamp(24px,4vw,34px)]">
          {ferdig ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center mx-auto mb-3.5"><Check size={22} className="text-brand" /></div>
              <h1 className="m-0 mb-1.5 text-[clamp(20px,3vw,24px)] font-extrabold tracking-[-0.025em] text-ink">Passordet er endret</h1>
              <p className="m-0 mb-5 text-sm text-muted leading-relaxed">Du kan nå logge inn med det nye passordet ditt.</p>
              <Button onClick={() => navigate('/login')} size="lg" className="w-full">
                Logg inn
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </div>
          ) : !token ? (
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-amber-bg flex items-center justify-center mx-auto mb-3.5"><AlertCircle size={22} className="text-amber" /></div>
              <h1 className="m-0 mb-1.5 text-[clamp(20px,3vw,24px)] font-extrabold tracking-[-0.025em] text-ink">Ugyldig lenke</h1>
              <p className="m-0 mb-5 text-sm text-muted leading-relaxed">Lenken mangler eller er ugyldig. Be om en ny fra innloggingssiden.</p>
              <Button onClick={() => navigate('/login')} variant="secondary" size="lg" className="w-full">Til innlogging</Button>
            </div>
          ) : (
            <>
              <h1 className="m-0 mb-1.5 text-[clamp(22px,3vw,26px)] font-extrabold tracking-[-0.025em] text-ink">Velg nytt passord</h1>
              <p className="m-0 mb-6 text-[14.5px] leading-relaxed text-muted">Skriv inn et nytt passord for kontoen din.</p>
              <form onSubmit={submit} className="space-y-3.5">
                <Input label="Nytt passord (minst 8 tegn)" type="password" placeholder="••••••••" value={passord} onChange={(e) => setPassord(e.target.value)} required autoComplete="new-password" />
                <Input label="Bekreft nytt passord" type="password" placeholder="••••••••" value={bekreft} onChange={(e) => setBekreft(e.target.value)} required autoComplete="new-password" />
                {feil && <div className="flex gap-2 text-[13px] font-semibold text-danger leading-relaxed"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{feil}</span></div>}
                <Button type="submit" size="lg" disabled={jobber} className="w-full">{jobber ? 'Lagrer…' : 'Lagre nytt passord'}</Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
