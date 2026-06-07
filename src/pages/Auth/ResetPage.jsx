import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, AlertCircle, Check } from 'lucide-react';
import { Logo } from '../../components/Logo';

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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F6F6F4' }}>
      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo variant="dark" height={32} /></div>
        <div className="rounded-2xl p-6 shadow-card-lg" style={{ background: '#FFFFFF', border: '1px solid #E9E8E2' }}>
          {ferdig ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#15803D]/15 flex items-center justify-center mx-auto mb-3"><Check size={22} className="text-[#15803D]" /></div>
              <h1 className="text-base font-semibold text-[#1A1B1E] mb-2">Passordet er endret</h1>
              <button onClick={() => navigate('/login')} className="text-sm text-[#2563EB] hover:underline cursor-pointer">Logg inn</button>
            </div>
          ) : !token ? (
            <p className="text-sm text-[#65696F]">Mangler eller ugyldig lenke. Be om en ny fra innloggingssiden.</p>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-[#1A1B1E] mb-1">Velg nytt passord</h1>
              <p className="text-sm text-[#65696F] mb-5">Skriv inn et nytt passord for kontoen din.</p>
              <form onSubmit={submit} className="space-y-3">
                <Felt placeholder="Nytt passord (minst 8 tegn)" value={passord} onChange={setPassord} />
                <Felt placeholder="Bekreft nytt passord" value={bekreft} onChange={setBekreft} />
                {feil && <div className="flex gap-2 text-xs text-[#DC2626]"><AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{feil}</span></div>}
                <button type="submit" disabled={jobber}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40"
                  style={{ background: '#16284A', color: '#FFFFFF' }}>{jobber ? 'Lagrer…' : 'Lagre nytt passord'}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Felt({ placeholder, value, onChange }) {
  return (
    <div className="relative">
      <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65696F]" />
      <input type="password" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required
        className="w-full bg-white border border-[#DCDAD2] rounded-xl py-2.5 pl-9 pr-4 text-sm text-[#1A1B1E] placeholder-[#9CA0A6] outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all" />
    </div>
  );
}
