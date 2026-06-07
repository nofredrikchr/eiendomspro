import { useState } from 'react';
import { Mail, KeyRound, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { useAuth } from '../../context/AuthContext';

export default function Login({ startModus = 'magisk' }) {
  const { sendMagiskLenke, loggInnPassord, registrer, erDemo } = useAuth();
  const [modus, setModus] = useState(startModus); // 'magisk' | 'passord' | 'registrer'
  const [email, setEmail] = useState('');
  const [passord, setPassord] = useState('');
  const [navn, setNavn] = useState('');
  const [jobber, setJobber] = useState(false);
  const [feil, setFeil] = useState(null);
  const [sendt, setSendt] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setFeil(null);
    setJobber(true);
    let res;
    if (modus === 'magisk') res = await sendMagiskLenke(email);
    else if (modus === 'passord') res = await loggInnPassord(email, passord);
    else res = await registrer(email, passord, navn);
    setJobber(false);
    if (res?.feil) { setFeil(res.feil); return; }
    if (modus === 'magisk' || modus === 'registrer') setSendt(true);
    // Ved passord-innlogging tar onAuthStateChange over og ruter videre.
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#F6F6F4' }}>
      {/* Mykt lysskjær */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 50% 50% at 50% 30%, rgba(22,40,74,0.05), transparent 70%)',
      }} />

      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo variant="dark" height={32} />
        </div>

        <div className="rounded-2xl p-6 shadow-card-lg" style={{ background: '#FFFFFF', border: '1px solid #E9E8E2' }}>
          {sendt ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-[#15803D]/15 flex items-center justify-center mx-auto mb-4">
                <Check size={22} className="text-[#15803D]" />
              </div>
              <h2 className="text-base font-semibold text-[#1A1B1E] mb-2">Sjekk e-posten din</h2>
              <p className="text-sm text-[#65696F] leading-relaxed">
                {modus === 'registrer'
                  ? `Vi har sendt en bekreftelseslenke til ${email}. Klikk den for å fullføre registreringen.`
                  : `Vi har sendt en innloggingslenke til ${email}. Klikk den for å logge inn.`}
              </p>
              <button onClick={() => { setSendt(false); setModus('magisk'); }}
                className="text-xs text-[#2563EB] hover:underline mt-4 cursor-pointer">← Tilbake</button>
            </div>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-[#1A1B1E] mb-1">
                {modus === 'registrer' ? 'Opprett konto' : 'Logg inn'}
              </h1>
              <p className="text-sm text-[#65696F] mb-5">
                {modus === 'magisk' ? 'Få en innloggingslenke på e-post — ingen passord å huske.'
                  : modus === 'passord' ? 'Logg inn med e-post og passord.'
                  : 'Kom i gang med EiendomsPRO.'}
              </p>

              {erDemo && (
                <div className="flex gap-2 p-3 rounded-lg border border-[#9A7A24]/25 bg-[#9A7A24]/8 text-xs text-[#9A7A24] leading-relaxed mb-4">
                  <AlertCircle size={13} className="shrink-0 mt-0.5" />
                  <span>Demo-modus: innlogging er ikke aktivert ennå (kommer med Neon-backend). Du kan gå rett inn.</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-3">
                {modus === 'registrer' && (
                  <Felt ikon={null} type="text" placeholder="Navn" value={navn} onChange={setNavn} />
                )}
                <Felt ikon={Mail} type="email" placeholder="E-post" value={email} onChange={setEmail} required />
                {(modus === 'passord' || modus === 'registrer') && (
                  <Felt ikon={KeyRound} type="password" placeholder="Passord" value={passord} onChange={setPassord} required />
                )}

                {feil && (
                  <div className="flex gap-2 text-xs text-[#DC2626] leading-relaxed">
                    <AlertCircle size={13} className="shrink-0 mt-0.5" /><span>{feil}</span>
                  </div>
                )}

                <button type="submit" disabled={jobber || erDemo}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: '#16284A', color: '#FFFFFF' }}>
                  {jobber ? 'Sender...' : modus === 'magisk' ? 'Send innloggingslenke' : modus === 'registrer' ? 'Opprett konto' : 'Logg inn'}
                  {!jobber && <ArrowRight size={15} />}
                </button>
              </form>

              {/* Modus-bytte */}
              <div className="mt-5 pt-4 border-t border-[#E9E8E2] space-y-2 text-center text-xs">
                {modus !== 'magisk' && (
                  <button onClick={() => { setModus('magisk'); setFeil(null); }} className="block w-full text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">
                    Bruk magisk lenke i stedet
                  </button>
                )}
                {modus !== 'passord' && (
                  <button onClick={() => { setModus('passord'); setFeil(null); }} className="block w-full text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">
                    Logg inn med passord
                  </button>
                )}
                {modus !== 'registrer' && (
                  <button onClick={() => { setModus('registrer'); setFeil(null); }} className="block w-full text-[#65696F] hover:text-[#1A1B1E] cursor-pointer">
                    Har du ikke konto? <span className="text-[#15803D]">Opprett en</span>
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

function Felt({ ikon: Ikon, type, placeholder, value, onChange, required }) {
  return (
    <div className="relative">
      {Ikon && <Ikon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#65696F]" />}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={`w-full bg-white border border-[#DCDAD2] rounded-xl py-2.5 text-sm text-[#1A1B1E] placeholder-[#9CA0A6] outline-none focus:border-[#16284A] focus:ring-2 focus:ring-[#16284A]/10 transition-all ${Ikon ? 'pl-9 pr-4' : 'px-4'}`}
      />
    </div>
  );
}
