import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/Logo';

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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F6F6F4' }}>
      <div className="relative w-full max-w-sm text-center">
        <div className="flex justify-center mb-8"><Logo variant="dark" height={32} /></div>
        <div className="rounded-2xl p-8 shadow-card-lg" style={{ background: '#FFFFFF', border: '1px solid #E9E8E2' }}>
          {status === 'jobber' && <p className="text-sm text-[#65696F]">Bekrefter e-posten din…</p>}
          {status === 'ok' && (
            <>
              <div className="w-12 h-12 rounded-full bg-[#15803D]/15 flex items-center justify-center mx-auto mb-3"><Check size={22} className="text-[#15803D]" /></div>
              <h1 className="text-base font-semibold text-[#1A1B1E] mb-2">E-posten er bekreftet</h1>
              <button onClick={() => navigate('/app')} className="text-sm text-[#2563EB] hover:underline cursor-pointer">Gå til appen</button>
            </>
          )}
          {status === 'feil' && (
            <>
              <div className="w-12 h-12 rounded-full bg-[#DC2626]/10 flex items-center justify-center mx-auto mb-3"><AlertCircle size={22} className="text-[#DC2626]" /></div>
              <h1 className="text-base font-semibold text-[#1A1B1E] mb-2">Lenken er ugyldig eller utløpt</h1>
              <p className="text-sm text-[#65696F]">Logg inn og be om en ny bekreftelseslenke.</p>
              <button onClick={() => navigate('/login')} className="text-sm text-[#2563EB] hover:underline cursor-pointer mt-3">Til innlogging</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
