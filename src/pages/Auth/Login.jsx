import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, AlertCircle, Building2, Home, Check, ShieldCheck, Heart, CreditCard } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';

/* ─────────────────────────────────────────────────────────────────────────────
   EiendomsPRO — innlogging / registrering (redesign 2026)
   Varmt kremlerret, hvitt kort med teal-CTA, og en mint merkevare-panel på
   desktop. Håndterer tre modi: innlogg | registrer | glemt. Ingen emoji.
   ──────────────────────────────────────────────────────────────────────────── */

const FEIL_TEKST = {
  google_ikke_konfigurert: 'Google-innlogging er ikke aktivert ennå.',
  google_state: 'Google-innlogging utløp eller ble avbrutt. Prøv igjen.',
  google: 'Google-innlogging feilet. Prøv igjen eller bruk e-post.',
};

export default function Login({ startModus = 'innlogg' }) {
  const { loggInn, registrer, bePassordReset, erDemo } = useAuth();
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const urlFeil = FEIL_TEKST[params.get('feil')];
  const vervekode = params.get('ref') || '';
  const partnerkode = params.get('partner') || '';
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
      ? await registrer({
        fulltNavn, epost: epost || undefined, telefon: telefon || undefined, passord, primaryRolle,
        vervekode: vervekode || undefined, partnerkode: partnerkode || undefined,
      })
      : await loggInn({ identifikator, passord });
    setJobber(false);
    if (!res.ok) { setFeil(res.feil); return; }
    navigate('/app');
  }

  const tittel = modus === 'registrer' ? 'Opprett konto' : modus === 'glemt' ? 'Tilbakestill passord' : 'Velkommen tilbake';
  const undertittel = modus === 'registrer'
    ? 'Kom i gang med en roligere utleiehverdag.'
    : modus === 'glemt'
      ? 'Oppgi e-posten din, så sender vi en lenke for å velge nytt passord.'
      : 'Logg inn med e-post eller telefon og passord.';

  return (
    <div className="min-h-screen bg-canvas text-ink animate-fade-up grid lg:grid-cols-2">
      {/* ── Merkevare-panel (desktop) ──────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col justify-between bg-brand-deep text-white relative overflow-hidden p-[clamp(36px,4vw,56px)]">
        <div className="absolute -top-[70px] -right-[70px] w-[260px] h-[260px] rounded-full bg-white/[0.07]" />
        <div className="absolute -bottom-24 -left-12 w-[300px] h-[300px] rounded-full bg-white/[0.05]" />
        <button onClick={() => navigate('/')} className="relative bg-transparent border-none p-0 cursor-pointer self-start">
          <Logo variant="light" height={32} />
        </button>
        <div className="relative">
          <div className="inline-flex items-center gap-2 bg-white/[0.12] text-white text-[13px] font-bold px-3.5 py-[7px] rounded-full mb-6">
            <ShieldCheck size={14} />
            Laget for langtidsutleie i Norge
          </div>
          <h2 className="m-0 mb-4 font-extrabold tracking-[-0.025em] leading-[1.1] max-w-[18ch] text-balance" style={{ fontSize: 'clamp(28px, 3vw, 38px)' }}>
            Et hjem for gode leieforhold.
          </h2>
          <p className="m-0 mb-8 text-[15px] leading-[1.6] text-white/80 max-w-[42ch]">
            Rolig oversikt over bygg, kontrakter og økonomi — og en egen portal der leietakerne dine føler seg ivaretatt.
          </p>
          <div className="grid gap-3.5">
            {[
              { icon: Building2, t: 'Full oversikt over bygg og økonomi' },
              { icon: ShieldCheck, t: 'Trygge kontrakter og depositum' },
              { icon: Heart, t: 'Leietakere som trives' },
            ].map(({ icon: Icon, t }) => (
              <div key={t} className="flex items-center gap-3.5">
                <span className="w-[38px] h-[38px] rounded-[12px] bg-white/[0.12] flex items-center justify-center shrink-0"><Icon size={17} /></span>
                <div className="text-[15px] font-semibold text-white/90">{t}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative m-0 text-[13px] font-medium text-white/60">© 2026 Eiendomspro · Langtidsutleie, gjort enkelt</p>
      </aside>

      {/* ── Skjema-panel ───────────────────────────────────────────────────── */}
      <main className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <button onClick={() => navigate('/')} className="flex justify-center w-full mb-7 lg:hidden bg-transparent border-none p-0 cursor-pointer">
            <Logo variant="dark" height={32} />
          </button>

          <div className="bg-surface border border-line rounded-[20px] shadow-card-lg p-[clamp(24px,4vw,34px)]">
            <h1 className="m-0 mb-1.5 text-[clamp(22px,3vw,26px)] font-extrabold tracking-[-0.025em] text-ink">{tittel}</h1>
            <p className="m-0 mb-6 text-[14.5px] leading-relaxed text-muted">{undertittel}</p>

            {erDemo && (
              <div className="flex gap-2 p-3 rounded-xl border border-amber-line bg-amber-bg text-xs font-semibold text-amber leading-relaxed mb-5">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>Demo-modus: database er ikke konfigurert, så innlogging er deaktivert. Du kan gå rett inn.</span>
              </div>
            )}

            {modus === 'registrer' && vervekode && (
              <div className="flex gap-2 p-3 rounded-xl border border-line bg-mint/60 text-xs font-semibold text-brand-ink leading-relaxed mb-5">
                <Heart size={14} className="shrink-0 mt-0.5" />
                <span>Du er invitert! Du får <strong>1 måned gratis</strong> på ditt første abonnement.</span>
              </div>
            )}
            {modus === 'registrer' && partnerkode && (
              <div className="flex gap-2 p-3 rounded-xl border border-line bg-mint/60 text-xs font-semibold text-brand-ink leading-relaxed mb-5">
                <Check size={14} className="shrink-0 mt-0.5" />
                <span>Partnerkode aktivert: <strong>20 % rabatt i 3 måneder</strong>.</span>
              </div>
            )}

            {resetSendt ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-mint flex items-center justify-center mx-auto mb-3.5">
                  <Check size={22} className="text-brand" />
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Hvis det finnes en konto med den e-posten, har vi sendt en lenke for å tilbakestille passordet.
                </p>
                <button onClick={() => { setResetSendt(false); setModus('innlogg'); }}
                  className="text-[13px] font-bold text-brand-ink hover:underline mt-5 cursor-pointer bg-transparent border-none">← Tilbake til innlogging</button>
              </div>
            ) : (
              <>
                {modus !== 'glemt' && (
                  <>
                    <a href="/api/auth/google/start"
                      className="w-full flex items-center justify-center gap-2.5 py-[11px] rounded-xl text-sm font-bold border-[1.5px] border-line-input text-ink-2 hover:border-brand hover:text-brand-ink transition-all cursor-pointer mb-4">
                      <GoogleIkon /> Fortsett med Google
                    </a>
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-line" />
                      <span className="text-xs font-semibold text-muted-2">eller</span>
                      <div className="flex-1 h-px bg-line" />
                    </div>
                  </>
                )}

                <form onSubmit={submit} className="space-y-3.5">
                  {modus === 'registrer' && (
                    <>
                      <Input label="Fullt navn" type="text" placeholder="Ola Nordmann" value={fulltNavn} onChange={(e) => setFulltNavn(e.target.value)} required />
                      <Input label="E-post" type="email" placeholder="ola@eksempel.no" value={epost} onChange={(e) => setEpost(e.target.value)} autoComplete="email" />
                      <Input label="Telefon (valgfritt)" type="tel" placeholder="+47 …" value={telefon} onChange={(e) => setTelefon(e.target.value)} autoComplete="tel" />
                      <Input label="Passord (minst 8 tegn)" type="password" placeholder="••••••••" value={passord} onChange={(e) => setPassord(e.target.value)} required autoComplete="new-password" />
                      <Input label="Bekreft passord" type="password" placeholder="••••••••" value={bekreftPassord} onChange={(e) => setBekreftPassord(e.target.value)} required autoComplete="new-password" />
                      <RolleVelger valgt={primaryRolle} onChange={setPrimaryRolle} />
                    </>
                  )}
                  {modus === 'innlogg' && (
                    <>
                      <Input label="E-post eller telefon" type="text" placeholder="ola@eksempel.no" value={identifikator} onChange={(e) => setIdentifikator(e.target.value)} required autoComplete="username" />
                      <Input label="Passord" type="password" placeholder="••••••••" value={passord} onChange={(e) => setPassord(e.target.value)} required autoComplete="current-password" />
                      <button type="button" onClick={() => { setModus('glemt'); setFeil(null); }}
                        className="text-[13px] font-bold text-muted hover:text-ink-2 cursor-pointer bg-transparent border-none p-0">Glemt passord?</button>
                    </>
                  )}
                  {modus === 'glemt' && (
                    <Input label="E-post eller telefon" type="text" placeholder="ola@eksempel.no" value={identifikator} onChange={(e) => setIdentifikator(e.target.value)} required autoComplete="username" />
                  )}

                  {feilTekst() && (
                    <div className="flex gap-2 text-[13px] font-semibold text-danger leading-relaxed">
                      <AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{feilTekst()}</span>
                    </div>
                  )}

                  <Button type="submit" size="lg" disabled={jobber || (erDemo && modus !== 'glemt')} className="w-full">
                    {jobber ? 'Jobber…' : modus === 'registrer' ? 'Opprett konto' : modus === 'glemt' ? 'Send lenke' : 'Logg inn'}
                    {!jobber && <ArrowRight size={16} strokeWidth={2.2} />}
                  </Button>
                </form>

                <div className="mt-6 pt-5 border-t border-line-soft text-center text-[13px] font-semibold">
                  {modus === 'registrer' ? (
                    <button onClick={() => { setModus('innlogg'); setFeil(null); }} className="block w-full text-muted hover:text-ink-2 cursor-pointer bg-transparent border-none">
                      Har du konto? <span className="text-brand-ink font-bold">Logg inn</span>
                    </button>
                  ) : modus === 'glemt' ? (
                    <button onClick={() => { setModus('innlogg'); setFeil(null); }} className="block w-full text-muted hover:text-ink-2 cursor-pointer bg-transparent border-none">
                      ← Tilbake til innlogging
                    </button>
                  ) : (
                    <button onClick={() => { setModus('registrer'); setFeil(null); }} className="block w-full text-muted hover:text-ink-2 cursor-pointer bg-transparent border-none">
                      Ingen konto? <span className="text-brand-ink font-bold">Opprett en</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {erDemo && (
            <div className="text-center mt-5">
              <a href="/app" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-ink hover:underline">
                Fortsett til appen (demo)
                <ArrowRight size={15} strokeWidth={2.2} />
              </a>
            </div>
          )}
        </div>
      </main>
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
      <div className="text-[12.5px] font-bold text-muted mb-2">Hva skal du primært bruke EiendomsPRO til?</div>
      <div className="grid grid-cols-2 gap-2.5">
        {valg.map((v) => {
          const aktiv = valgt === v.id;
          return (
            <button type="button" key={v.id} onClick={() => onChange(v.id)}
              className={`flex flex-col items-start gap-1 p-3 rounded-xl border-[1.5px] text-left transition-all cursor-pointer ${
                aktiv ? 'border-brand bg-mint-soft' : 'border-line-input bg-surface hover:border-brand/40'
              }`}>
              <v.ikon size={17} className={aktiv ? 'text-brand' : 'text-faint-2'} />
              <span className="text-sm font-bold text-ink">{v.tittel}</span>
              <span className="text-xs font-semibold text-muted-2">{v.undertekst}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11.5px] font-medium text-muted-2 mt-2 flex items-center gap-1.5">
        <CreditCard size={12} className="text-faint-2" />
        Du kan enkelt bytte mellom utleier og leietaker senere.
      </p>
    </div>
  );
}
