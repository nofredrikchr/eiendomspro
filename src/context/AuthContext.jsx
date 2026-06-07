import { createContext, useContext, useState } from 'react';

/**
 * Autentisering for EiendomsPRO.
 *
 * Status: demo/lokal modus. Appen kjører uten innloggingsvegg med én lokal
 * bruker, akkurat som før. Ekte innlogging bygges som egen jobb mot Neon
 * (serverless functions i /api), gjerne sammen med BankID/Signicat.
 *
 * Når Neon-auth er på plass byttes DEMO_BRUKER ut med en sesjonssjekk mot
 * /api/auth/* — resten av appen bruker allerede `innlogget`/`laster`/`erDemo`.
 */
const AuthContext = createContext(null);

const DEMO_BRUKER = { id: 'lokal', email: 'demo@lokal', navn: 'Demobruker', lokal: true };

export function AuthProvider({ children }) {
  const [bruker] = useState(DEMO_BRUKER);

  async function sendMagiskLenke() {
    return { feil: 'Innlogging er ikke aktivert ennå (kommer med Neon-backend).' };
  }
  async function loggInnPassord() {
    return { feil: 'Innlogging er ikke aktivert ennå (kommer med Neon-backend).' };
  }
  async function registrer() {
    return { feil: 'Registrering er ikke aktivert ennå (kommer med Neon-backend).' };
  }
  async function loggUt() {
    /* ingen sesjon å avslutte i demo-modus */
  }

  const verdier = {
    bruker,
    laster: false,
    innlogget: !!bruker,
    erDemo: true,
    sendMagiskLenke,
    loggInnPassord,
    registrer,
    loggUt,
  };

  return <AuthContext.Provider value={verdier}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
