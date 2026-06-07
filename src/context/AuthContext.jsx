import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Autentisering for EiendomsPRO (Fase 0).
 *
 * Snakker med /api/auth/* (Neon-backend). Når DB ikke er konfigurert svarer
 * /api/auth/me med { demo: true } → appen kjører i demo-modus uten innloggingsvegg
 * (som før, nyttig lokalt uten DATABASE_URL).
 *
 * Eksponerer: bruker, innlogget, laster, erDemo, niva, roller, aktivModus,
 * registrer(), loggInn(), loggUt().
 */
const AuthContext = createContext(null);

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
  });
  let data = {};
  try { data = await res.json(); } catch { /* tom respons */ }
  return { res, data };
}

export function AuthProvider({ children }) {
  const [bruker, setBruker] = useState(null);
  const [laster, setLaster] = useState(true);
  const [erDemo, setErDemo] = useState(false);

  const lastInn = useCallback(async () => {
    const { data } = await api('/api/auth/me');
    setBruker(data.bruker ?? null);
    setErDemo(!!data.demo);
  }, []);

  // Hent sesjon ved oppstart. setState skjer i promise-callback (ekstern kilde),
  // ikke synkront i effekten. aktiv-flagget unngår setState etter unmount.
  useEffect(() => {
    let aktiv = true;
    api('/api/auth/me')
      .then(({ data }) => {
        if (!aktiv) return;
        setBruker(data.bruker ?? null);
        setErDemo(!!data.demo);
      })
      .catch(() => { /* ingen sesjon */ })
      .finally(() => { if (aktiv) setLaster(false); });
    return () => { aktiv = false; };
  }, []);

  const registrer = useCallback(async (felter) => {
    const { res, data } = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(felter) });
    if (res.ok) { setBruker(data.bruker); return { ok: true }; }
    return { ok: false, feil: data.feil || { generelt: 'Noe gikk galt.' } };
  }, []);

  const loggInn = useCallback(async (felter) => {
    const { res, data } = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(felter) });
    if (res.ok) { setBruker(data.bruker); return { ok: true }; }
    return { ok: false, feil: data.feil || { generelt: 'Noe gikk galt.' } };
  }, []);

  const loggUt = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch { /* uansett ut lokalt */ }
    setBruker(null);
  }, []);

  // Bytt aktiv modus (utleier/leietaker). Provisjonerer rollen lazy server-side.
  const byttModus = useCallback(async (modus) => {
    const { res, data } = await api('/api/mode', { method: 'POST', body: JSON.stringify({ modus }) });
    if (res.ok) { setBruker(data.bruker); return { ok: true }; }
    return { ok: false, feil: typeof data.feil === 'string' ? data.feil : 'Kunne ikke bytte modus.' };
  }, []);

  const verdier = {
    bruker,
    laster,
    innlogget: !!bruker,
    erDemo,
    niva: bruker?.niva ?? null,
    roller: bruker?.roller ?? [],
    aktivModus: bruker?.aktivModus ?? null,
    registrer,
    loggInn,
    loggUt,
    byttModus,
    lastInn,
  };

  return <AuthContext.Provider value={verdier}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- idiomatisk context-hook ved siden av provider
export function useAuth() {
  return useContext(AuthContext);
}
