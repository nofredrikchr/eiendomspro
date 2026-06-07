import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, KeyRound, User, Phone, ArrowRight, AlertCircle, Building2, Home, Check } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

const FEIL_TEKST = {
  google_ikke_konfigurert: 'Google-innlogging er ikke aktivert ennå.',
  google_state: 'Google-innlogging utløp eller ble avbrutt. Prøv igjen.',
  google: 'Google-innlogging feilet. Prøv igjen eller bruk e-post.',
};

export default function Login({ startModus = 'innlogg' }) {
  const { loggInn, registrer, bePassordReset, erDemo } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const urlFeil = FEIL_TEKST[new URLSearchParams(search).get('feil')];
  const [modus, setModus] = useState(startModus === 'registrer' ? 'registrer' : 'innlogg');
  const [identifikator, setIdentifikator] = useState('');
  const [epost, setEpost] = useState('');
  const [telefon, setTelefon] = useState('');
  const [passord, setPassord] = useState('');
  const [bekreftPassord, setBekreftPassord] = useState('');
  const [fulltNavn, setFulltNavn] = useState('');
  const [primaryRolle, setPrimaryRolle] = useState('utleier');
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState(null);
  const [resetSendt, setResetSendt] = useState(false);

  function feilTekst() {
    if (feil) return Object.values(feil).filter(Boolean).join(' ');
    return urlFeil || null;
  }

  async function submit(e) {
    e.preventDefault();
    setFeil(null);
    if (modus === 'glemt') {
      setJobber(true);
      await bePassordReset(identifikator || epost);
      setJobber(false);
      setResetSendt(true);
      return;
    }
    if (modus === 'registrer' && passord !== bekreftPassord) {
      setFeil({ passord: 'Passordene er ikke like.' });
      return;
    }
    setJobber(true);
    const res = modus === 'registrer'
      ? await registrer({ fulltNavn, epost: epost || undefined, telefon: telefon || undefined, passord, primaryRolle })
      : await loggInn({ identifikator, passord });
    setJobber(false);
    if (!res.ok) { setFeil(res.feil); return; }
    navigate('/app');
  }

  const tittel = modus === 'registrer' ? 'Opprett konto' : modus === 'glemt' ? 'Tilbakestill passord' : 'Logg inn';

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F6F6F4' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 50% at 50% 30%, rgba(22,40,74,0.05), transparent 70%)',
      }} />

      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8"><Logo variant="dark" height={32} /></div>

        <div className="rounded-2xl p-6 shadow-card-lg" style={{ background: '#FFFFFF', border: '1px solid #E9E8E2' }}>
          <h1 className="text-lg font-semibold text-[#1A1B1E] mb-1">{tittel}</h1>
          <p className="text-sm text-[#65696F] mb-5">
            {modus === 'registrer' ? 'Kom i gang med EiendomsPRO.'
              : modus === 'glemt' ? 'Oppgi e-posten din, så sender vi en lenke for å velge nytt passord.'
              : 'Logg inn med e-post eller telefon og passord.'}
          </p>

          {erDemo && (
            <div className="flex gap-2 p-3 rounded-lg border border-[#9A7A24]/25 bg-[#9A7A24]/8 text-xs text-[#9A7A24] leading-relaxed mb-4">
              <AlertCircle size={13} className="shrink-0 mt-0.5" />
              <span>Demo-modus: database er ikke konfigurert, så innlogging er deaktivert. Du kan gå rett inn.</span>
            </div>
          )}

          {resetSendt ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[#15803D]/15 flex items-center justify-center mx-auto mb-3">
                <Check size={22} className="text-[#15803D]" />
              </div>
              <p className="text-sm text-[#65696F] leading-relaxed">
                Hvis det finnes en konto med den e-posten, har vi sendt en lenke for å tilbakestille passordet.
              </p>
              <button onClick={() => { setResetSendt(false); setModus('innlogg'); }}
                className="text-xs text-[#2563EB] hover:underline mt-4 cursor-pointer">← Tilbake til innlogging</button>
            </div>
          ) : (
            <>
              {modus !== 'glemt' && (
                <>
                  <a href="/api/auth/google/start"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-[#DCDAD2] text-[#1A1B1E] hover:bg-[#FAF9F6] transition-all cursor-pointer mb-3">
                    <GoogleIkon /> Fortsett med Google
                  </a>
                  <div className="flex items-center gap-3 my-3">
                    <div className="flex-1 h-px bg-[#E9E8E2]" />
                    <span className="text-xs text-[#9CA0A6]">eller</span>
                    <div className="flex-1 h-px bg-[#E9E8E2]" />
                  </div>
                </>
              )}

              <form onSubmit={submit} className="space-y-3">
                {modus === 'registrer' && (
                  <>
                    <Felt ikon={User} type="text" placeholder="Fullt navn" value={fulltNavn} onChange={setFulltNavn} required />
                    <Felt ikon={Mail} type="email" placeholder="E-post" value={epost} onChange={setEpost} />
                    <Felt ikon={Phone} type="tel" placeholder="Telefon (valgfritt)" value={telefon} onChange={setTelefon} />
                    <Felt ikon={KeyRound} type="password" placeholder="Passord (minst 8 tegn)" value={passord} onChange={setPassord} required />
                    <Felt ikon={KeyRound} type="password" placeholder="Bekreft passord" value={bekreftPassord} onChange={setBekreftPassord} required />
                    <RolleVelger valgt={primaryRolle} onChange={setPrimaryRolle} />
                  </>
                )}
                {modus === 'innlogg' && (
                  <>
                    <Felt ikon={Mail} type="text" placeholder="E-post eller telefon" value={identifikator} onChange={setIdentifikator} required />
                    <Felt ikon={KeyRound} type="password" placeholder="Passord" value={passord} onChange={setPassord} required />
                    <button type="button" onClick={() => { setModus('glemt'); setFeil(null); }}
                      className="text-xs text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">Glemt passord?</button>
                  </>
                )}
                {modus === 'glemt' && (
                  <Felt ikon={Mail} type="text" placeholder="E-post eller telefon" value={identifikator} onChange={setIdentifikator} required />
                )}

                {feilTekst() && (
                  <div className="flex gap-2 text-xs text-[#DC2626] leading-relaxed">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{feilTekst()}</span>
                  </div>
                )}

                <button type="submit" disabled={jobber || (erDemo && modus !== 'glemt')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#16284A', color: '#FFFFFF' }}>
                  {jobber ? 'Jobber…' : modus === 'registrer' ? 'Opprett konto' : modus === 'glemt' ? 'Send lenke' : 'Logg inn'}
                  {!jobber && <ArrowRight size={15} />}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-[#E9E8E2] text-center text-xs">
                {modus === 'registrer' ? (
                  <button onClick={() => { setModus('innlogg'); setFeil(null); }} className="block w-full text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">
                    Har du konto? <span className="text-[#15803D]">Logg inn</span>
                  </button>
                ) : modus === 'glemt' ? (
                  <button onClick={() => { setModus('innlogg'); setFeil(null); }} className="block w-full text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">
                    ← Tilbake til innlogging
                  </button>
                ) : (
                  <button onClick={() => { setModus('registrer'); setFeil(null); }} className="block w-full text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">
                    Ingen konto? <span className="text-[#15803D]">Opprett en</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {erDemo && (
          <div className="text-center mt-4">
            <a href="/app" className="text-sm text-[#2563EB] hover:underline">Fortsett til appen (demo) →</a>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIkon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 110-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1024 44a20 20 0 0019.6-23.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0124 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 006.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0124 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5A20 20 0 0024 44z" />
      <path fill="#1976D2" d="M43.6 20.5H24v8h11.3a12 12 0 01-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.3 0-1.3-.1-2.7-.4-4.5z" />
    </svg>
  );
}

function RolleVelger({ valgt, onChange }) {
  const valg = [
    { id: 'utleier', ikon: Building2, tittel: 'Jeg vil leie ut', undertekst: 'Forvalt eiendom' },
    { id: 'leietaker', ikon: Home, tittel: 'Jeg vil leie', undertekst: 'Finn bolig' },
  ];
  return (
    <div>
      <div className="text-xs text-[#65696F] mb-2">Hva skal du primært bruke EiendomsPRO til?</div>
      <div className="grid grid-cols-2 gap-2">
        {valg.map((v) => {
          const aktiv = valgt === v.id;
          return (
            <button type="button" key={v.id} onClick={() => onChange(v.id)}
              className="flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer"
              style={{ borderColor: aktiv ? '#16284A' : '#DCDAD2', background: aktiv ? 'rgba(22,40,74,0.04)' : '#FFFFFF' }}>
              <v.ikon size={16} className={aktiv ? 'text-[#16284A]' : 'text-[#9CA0A6]'} />
              <span className="text-sm font-medium text-[#1A1B1E]">{v.tittel}</span>
              <span className="text-xs text-[#65696F]">{v.undertekst}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-[#9CA0A6] mt-2">Du kan enkelt bytte mellom utleier og leietaker senere.</p>
    </div>
  );
}

function Felt({ ikon: Ikon, type, placeholder, value, onChange, required }) {
  return (
    <div className="relative">
      {Ikon && <Ikon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65696F]" />}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className={`w-full bg-white border border-[#DCDAD2] rounded-xl py-2.5 text-sm text-[#1A1B1E] placeholder-[#9CA0A6] outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all ${Ikon ? 'pl-9 pr-4' : 'px-4'}`} />
    </div>
  );
}
