import { createContext, useContext, useState, useEffect } from 'react';
import { byggApi, leieobjektApi } from '../services/eiendomApi';
import {
  kontraktApi, fakturaApi, annonseApi, meldingApi, protokollApi,
  notatApi, utleggApi, utleierApi, faktiskeTallApi,
} from '../services/entitetApi';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Alle entiteter ligger nå i Neon (eier-scoped via /api), ikke localStorage.
  const [bygg, setBygg] = useState([]);
  const [leieobjekter, setLeieobjekter] = useState([]);
  const [kontrakter, setKontrakter] = useState([]);
  const [fakturaer, setFakturaer] = useState([]);
  const [annonser, setAnnonser] = useState([]);
  const [meldinger, setMeldinger] = useState([]);
  const [protokoller, setProtokoller] = useState([]);
  const [notater, setNotater] = useState([]);
  const [utlegg, setUtlegg] = useState([]);
  const [utleiere, setUtleiere] = useState([]);
  const [faktiskeTall, setFaktiskeTallState] = useState({});
  const [lasterEiendom, setLasterEiendom] = useState(true);

  // Last alt fra API ved oppstart (parallelt). setState skjer i promise-callback.
  // Ved 401 (ikke innlogget) feiler Promise.all → alt forblir tomt.
  useEffect(() => {
    let aktiv = true;
    Promise.all([
      byggApi.list(), leieobjektApi.list(), kontraktApi.list(), fakturaApi.list(),
      annonseApi.list(), meldingApi.list(), protokollApi.list(), notatApi.list(),
      utleggApi.list(), utleierApi.list(), faktiskeTallApi.hent(),
    ])
      .then(([b, l, k, f, a, m, p, n, u, ut, ft]) => {
        if (!aktiv) return;
        setBygg(b); setLeieobjekter(l); setKontrakter(k); setFakturaer(f);
        setAnnonser(a); setMeldinger(m); setProtokoller(p); setNotater(n);
        setUtlegg(u); setUtleiere(ut); setFaktiskeTallState(ft);
      })
      .catch(() => { /* ikke innlogget e.l. → alt tomt (default) */ })
      .finally(() => { if (aktiv) setLasterEiendom(false); });
    return () => { aktiv = false; };
  }, []);

  // Generisk eier-scoped CRUD mot API + lokal speiling. Funksjonene gjenskapes
  // per render (ufarlig: ingen brukes i effect-deps; AppProvider re-rendrer kun
  // ved dataendring).
  function crud(klient, setState) {
    return {
      add: async (data) => { const item = await klient.opprett(data); setState((p) => [...p, item]); return item; },
      update: async (id, data) => { const item = await klient.oppdater(id, data); setState((p) => p.map((x) => (x.id === id ? item : x))); return item; },
      remove: async (id) => { await klient.slett(id); setState((p) => p.filter((x) => x.id !== id)); },
    };
  }

  // ─── Bygg & leieobjekter (bygg-sletting kaskaderer leieobjekter) ────────────
  const addBygg = async (data) => { const item = await byggApi.opprett(data); setBygg((p) => [...p, item]); return item; };
  const updateBygg = async (id, data) => { const item = await byggApi.oppdater(id, data); setBygg((p) => p.map((b) => (b.id === id ? item : b))); return item; };
  const deleteBygg = async (id) => {
    await byggApi.slett(id);
    setBygg((p) => p.filter((b) => b.id !== id));
    setLeieobjekter((p) => p.filter((l) => l.byggId !== id)); // speil server-cascade
  };
  const addLeieobjekt = async (data) => { const item = await leieobjektApi.opprett(data); setLeieobjekter((p) => [...p, item]); return item; };
  const updateLeieobjekt = async (id, data) => { const item = await leieobjektApi.oppdater(id, data); setLeieobjekter((p) => p.map((l) => (l.id === id ? item : l))); return item; };
  const deleteLeieobjekt = async (id) => { await leieobjektApi.slett(id); setLeieobjekter((p) => p.filter((l) => l.id !== id)); };

  // ─── Resten via generisk CRUD ───────────────────────────────────────────────
  const kontraktCrud = crud(kontraktApi, setKontrakter);
  const fakturaCrud = crud(fakturaApi, setFakturaer);
  const annonseCrud = crud(annonseApi, setAnnonser);
  const protokollCrud = crud(protokollApi, setProtokoller);
  const notatCrud = crud(notatApi, setNotater);
  const utleggCrud = crud(utleggApi, setUtlegg);
  const utleierCrud = crud(utleierApi, setUtleiere);

  // ─── Meldinger (egne operasjoner) ───────────────────────────────────────────
  const sendMelding = async (data) => {
    const item = await meldingApi.opprett({
      kontraktId: data.kontraktId,
      avsender: data.avsender || 'utleier',
      avsenderNavn: data.avsenderNavn || 'Utleier',
      tekst: data.tekst,
      type: data.type || 'melding',
      vedlikeholdStatus: data.vedlikeholdStatus || null,
      lest: data.avsender === 'utleier', // egne meldinger er "lest"
    });
    setMeldinger((p) => [...p, item]);
    return item;
  };
  const markerLest = async (kontraktId) => {
    const uleste = meldinger.filter((m) => m.kontraktId === kontraktId && !m.lest);
    if (!uleste.length) return; // ingen endring → unngå API-kall og render-løkke
    await Promise.all(uleste.map((m) => meldingApi.oppdater(m.id, { ...m, lest: true })));
    setMeldinger((p) => p.map((m) => (m.kontraktId === kontraktId ? { ...m, lest: true } : m)));
  };
  const oppdaterVedlikeholdStatus = async (meldingId, status) => {
    const m = meldinger.find((x) => x.id === meldingId);
    if (!m) return;
    const item = await meldingApi.oppdater(meldingId, { ...m, vedlikeholdStatus: status });
    setMeldinger((p) => p.map((x) => (x.id === meldingId ? item : x)));
  };

  // ─── faktiskeTall (blob; støtter funksjons-oppdatering) ──────────────────────
  const setFaktiskeTall = async (data) => {
    const next = typeof data === 'function' ? data(faktiskeTall) : data;
    setFaktiskeTallState(next);
    try { await faktiskeTallApi.lagre(next); } catch { /* lokal verdi beholdes */ }
  };

  return (
    <AppContext.Provider value={{
      bygg, leieobjekter, lasterEiendom, kontrakter, utleiere, faktiskeTall, fakturaer,
      meldinger, sendMelding, markerLest, oppdaterVedlikeholdStatus,
      protokoller, addProtokoll: protokollCrud.add, updateProtokoll: protokollCrud.update, deleteProtokoll: protokollCrud.remove,
      notater, addNotat: notatCrud.add, updateNotat: notatCrud.update, deleteNotat: notatCrud.remove,
      utlegg, addUtlegg: utleggCrud.add, updateUtlegg: utleggCrud.update, deleteUtlegg: utleggCrud.remove,
      annonser, addAnnonse: annonseCrud.add, updateAnnonse: annonseCrud.update, deleteAnnonse: annonseCrud.remove,
      addBygg, updateBygg, deleteBygg,
      addLeieobjekt, updateLeieobjekt, deleteLeieobjekt,
      addKontrakt: kontraktCrud.add, updateKontrakt: kontraktCrud.update, deleteKontrakt: kontraktCrud.remove,
      addUtleier: utleierCrud.add, updateUtleier: utleierCrud.update, deleteUtleier: utleierCrud.remove,
      setFaktiskeTall,
      addFaktura: fakturaCrud.add, updateFaktura: fakturaCrud.update, deleteFaktura: fakturaCrud.remove,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- idiomatisk context-hook ved siden av provider
export function useApp() {
  return useContext(AppContext);
}
