import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/ui/Button';

/* ─────────────────────────────────────────────────────────────────────────────
   EiendomsPRO — bekreft e-post (redesign 2026)
   Sentrert hvitt kort på kremlerret. Kun presentasjon endret.
   ──────────────────────────────────────────────────────────────────────────── */

export default function VerifyPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(useLocation().search).get('token');
  const [status, setStatus] = useState(token ? 'jobber' : 'feil'); // 'jobber' | 'ok' | 'feil'

  useEffect(() => {
    if (!token) return;
    let aktiv = true;
    fetch('/api/auth/verify', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((r) => { if (aktiv) setStatus(r.ok ? 'ok' : 'feil'); })
      .catch(() => { if (aktiv) setStatus('feil'); });
    return () => { aktiv = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-canvas text-ink animate-fade-up flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px]">
        <button onClick={() => navigate('/')} className="flex justify-center w-full mb-7 bg-transparent border-none p-0 cursor-pointer">
          <Logo variant="dark" height={32} />
        </button>
        <div className="bg-surface border border-line rounded-[20px] shadow-card-lg p-[clamp(28px,4vw,38px)] text-center">
          {status === 'jobber' && (
            <>
              <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center mx-auto mb-3.5">
                <Loader2 size={22} className="text-brand animate-spin" />
              </div>
              <h1 className="m-0 mb-1.5 text-[clamp(20px,3vw,24px)] font-extrabold tracking-[-0.025em] text-ink">Bekrefter e-posten din…</h1>
              <p className="m-0 text-sm text-muted leading-relaxed">Dette tar bare et øyeblikk.</p>
            </>
          )}
          {status === 'ok' && (
            <>
              <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center mx-auto mb-3.5"><Check size={22} className="text-brand" /></div>
              <h1 className="m-0 mb-1.5 text-[clamp(20px,3vw,24px)] font-extrabold tracking-[-0.025em] text-ink">E-posten er bekreftet</h1>
              <p className="m-0 mb-5 text-sm text-muted leading-relaxed">Alt klart — velkommen til EiendomsPRO.</p>
              <Button onClick={() => navigate('/app')} size="lg" className="w-full">
                Gå til appen
                <ArrowRight size={16} strokeWidth={2.2} />
              </Button>
            </>
          )}
          {status === 'feil' && (
            <>
              <div className="w-12 h-12 rounded-full bg-amber-bg flex items-center justify-center mx-auto mb-3.5"><AlertCircle size={22} className="text-amber" /></div>
              <h1 className="m-0 mb-1.5 text-[clamp(20px,3vw,24px)] font-extrabold tracking-[-0.025em] text-ink">Lenken er ugyldig eller utløpt</h1>
              <p className="m-0 mb-5 text-sm text-muted leading-relaxed">Logg inn og be om en ny bekreftelseslenke.</p>
              <Button onClick={() => navigate('/login')} variant="secondary" size="lg" className="w-full">Til innlogging</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
