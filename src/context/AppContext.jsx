import { createContext, useContext, useState, useCallback } from 'react';
import { storage, meldingStorage, protokollStorage, notatStorage, utleggStorage, annonseStorage } from '../utils/storage';
import { genId } from '../utils/format';
import { seedBygg, seedLeieobjekter, seedKontrakter, seedUtleiere } from '../utils/seedData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [bygg, setByggState] = useState(() => {
    const saved = storage.getBygg();
    return saved.length > 0 ? saved : seedBygg;
  });
  const [leieobjekter, setLeieobjekterState] = useState(() => {
    const saved = storage.getLeieobjekter();
    return saved.length > 0 ? saved : seedLeieobjekter;
  });
  const [kontrakter, setKontrakterState] = useState(() => {
    const saved = storage.getKontrakter();
    return saved.length > 0 ? saved : seedKontrakter;
  });
  const [utleiere, setUtleiereState] = useState(() => {
    const saved = storage.getUtleiere();
    return saved.length > 0 ? saved : seedUtleiere;
  });
  const [faktiskeTall, setFaktiskeTallState] = useState(() => storage.getFaktiskeTall());
  const [fakturaer, setFakturaerState] = useState(() => storage.getFakturaer());
  const [meldinger, setMeldingerState] = useState(() => meldingStorage.get());
  const [protokoller, setProtokollerState] = useState(() => protokollStorage.get());
  const [notater, setNotaterState] = useState(() => notatStorage.get());
  const [utlegg, setUtleggState] = useState(() => utleggStorage.get());
  const [annonser, setAnnonserState] = useState(() => annonseStorage.get());

  const setBygg = useCallback((data) => {
    const next = typeof data === 'function' ? data(bygg) : data;
    setByggState(next);
    storage.saveBygg(next);
  }, [bygg]);

  const setLeieobjekter = useCallback((data) => {
    const next = typeof data === 'function' ? data(leieobjekter) : data;
    setLeieobjekterState(next);
    storage.saveLeieobjekter(next);
  }, [leieobjekter]);

  const setKontrakter = useCallback((data) => {
    const next = typeof data === 'function' ? data(kontrakter) : data;
    setKontrakterState(next);
    storage.saveKontrakter(next);
  }, [kontrakter]);

  const setUtleiere = useCallback((data) => {
    const next = typeof data === 'function' ? data(utleiere) : data;
    setUtleiereState(next);
    storage.saveUtleiere(next);
  }, [utleiere]);

  const setFaktiskeTall = useCallback((data) => {
    const next = typeof data === 'function' ? data(faktiskeTall) : data;
    setFaktiskeTallState(next);
    storage.saveFaktiskeTall(next);
  }, [faktiskeTall]);

  const setFakturaer = useCallback((data) => {
    const next = typeof data === 'function' ? data(fakturaer) : data;
    setFakturaerState(next);
    storage.saveFakturaer(next);
  }, [fakturaer]);

  const addFaktura = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setFakturaer((prev) => [...prev, item]);
    return item;
  }, [setFakturaer]);

  const updateFaktura = useCallback((id, data) => {
    setFakturaer((prev) => prev.map((f) => (f.id === id ? { ...f, ...data } : f)));
  }, [setFakturaer]);

  // ─── Meldinger ───────────────────────────────────────────────────
  const setMeldinger = useCallback((data) => {
    const next = typeof data === 'function' ? data(meldinger) : data;
    setMeldingerState(next);
    meldingStorage.save(next);
  }, [meldinger]);

  const sendMelding = useCallback((data) => {
    /** data: { kontraktId, avsender, avsenderNavn, tekst, type? } */
    const item = {
      id: genId(),
      kontraktId: data.kontraktId,
      avsender: data.avsender || 'utleier',
      avsenderNavn: data.avsenderNavn || 'Utleier',
      tekst: data.tekst,
      type: data.type || 'melding',           // 'melding' | 'vedlikehold' | 'system'
      vedlikeholdStatus: data.vedlikeholdStatus || null,
      lest: data.avsender === 'utleier',      // egne meldinger er alltid "lest"
      opprettet: new Date().toISOString(),
    };
    setMeldinger((prev) => [...prev, item]);
    return item;
  }, [setMeldinger]);

  const markerLest = useCallback((kontraktId) => {
    setMeldinger((prev) => {
      // Ingen endring hvis alt allerede er lest — unngår uendelig render-løkke
      if (!prev.some((m) => m.kontraktId === kontraktId && !m.lest)) return prev;
      return prev.map((m) => m.kontraktId === kontraktId ? { ...m, lest: true } : m);
    });
  }, [setMeldinger]);

  const oppdaterVedlikeholdStatus = useCallback((meldingId, status) => {
    setMeldinger((prev) =>
      prev.map((m) => m.id === meldingId ? { ...m, vedlikeholdStatus: status } : m)
    );
  }, [setMeldinger]);

  const deleteFaktura = useCallback((id) => {
    setFakturaer((prev) => prev.filter((f) => f.id !== id));
  }, [setFakturaer]);

  const addBygg = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setBygg((prev) => [...prev, item]);
    return item;
  }, [setBygg]);

  const updateBygg = useCallback((id, data) => {
    setBygg((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
  }, [setBygg]);

  const deleteBygg = useCallback((id) => {
    setBygg((prev) => prev.filter((b) => b.id !== id));
    setLeieobjekter((prev) => prev.filter((l) => l.byggId !== id));
  }, [setBygg, setLeieobjekter]);

  const addLeieobjekt = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setLeieobjekter((prev) => [...prev, item]);
    return item;
  }, [setLeieobjekter]);

  const updateLeieobjekt = useCallback((id, data) => {
    setLeieobjekter((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)));
  }, [setLeieobjekter]);

  const deleteLeieobjekt = useCallback((id) => {
    setLeieobjekter((prev) => prev.filter((l) => l.id !== id));
  }, [setLeieobjekter]);

  const addKontrakt = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setKontrakter((prev) => [...prev, item]);
    return item;
  }, [setKontrakter]);

  const updateKontrakt = useCallback((id, data) => {
    setKontrakter((prev) => prev.map((k) => (k.id === id ? { ...k, ...data } : k)));
  }, [setKontrakter]);

  const deleteKontrakt = useCallback((id) => {
    setKontrakter((prev) => prev.filter((k) => k.id !== id));
  }, [setKontrakter]);

  const addUtleier = useCallback((data) => {
    const item = { ...data, id: genId() };
    setUtleiere((prev) => [...prev, item]);
    return item;
  }, [setUtleiere]);

  const updateUtleier = useCallback((id, data) => {
    setUtleiere((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
  }, [setUtleiere]);

  const deleteUtleier = useCallback((id) => {
    setUtleiere((prev) => prev.filter((u) => u.id !== id));
  }, [setUtleiere]);

  // ─── Protokoller ──────────────────────────────────────────────────
  const setProtokoller = useCallback((data) => {
    const next = typeof data === 'function' ? data(protokoller) : data;
    setProtokollerState(next);
    protokollStorage.save(next);
  }, [protokoller]);

  const addProtokoll = useCallback((data) => {
    const item = { ...data, opprettet: new Date().toISOString() };
    setProtokoller((prev) => [...prev, item]);
    return item;
  }, [setProtokoller]);

  const updateProtokoll = useCallback((id, data) => {
    setProtokoller((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, [setProtokoller]);

  const deleteProtokoll = useCallback((id) => {
    setProtokoller((prev) => prev.filter((p) => p.id !== id));
  }, [setProtokoller]);

  // ─── Notater ──────────────────────────────────────────────────────
  const setNotater = useCallback((data) => {
    const next = typeof data === 'function' ? data(notater) : data;
    setNotaterState(next); notatStorage.save(next);
  }, [notater]);
  const addNotat = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setNotater((p) => [...p, item]); return item;
  }, [setNotater]);
  const updateNotat = useCallback((id, data) => {
    setNotater((p) => p.map((n) => n.id === id ? { ...n, ...data } : n));
  }, [setNotater]);
  const deleteNotat = useCallback((id) => {
    setNotater((p) => p.filter((n) => n.id !== id));
  }, [setNotater]);

  // ─── Utlegg ───────────────────────────────────────────────────────
  const setUtlegg = useCallback((data) => {
    const next = typeof data === 'function' ? data(utlegg) : data;
    setUtleggState(next); utleggStorage.save(next);
  }, [utlegg]);
  const addUtlegg = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setUtlegg((p) => [...p, item]); return item;
  }, [setUtlegg]);
  const updateUtlegg = useCallback((id, data) => {
    setUtlegg((p) => p.map((u) => u.id === id ? { ...u, ...data } : u));
  }, [setUtlegg]);
  const deleteUtlegg = useCallback((id) => {
    setUtlegg((p) => p.filter((u) => u.id !== id));
  }, [setUtlegg]);

  // ─── Annonser ─────────────────────────────────────────────────────
  const setAnnonser = useCallback((data) => {
    const next = typeof data === 'function' ? data(annonser) : data;
    setAnnonserState(next); annonseStorage.save(next);
  }, [annonser]);
  const addAnnonse = useCallback((data) => {
    const item = { ...data, id: genId(), opprettet: new Date().toISOString() };
    setAnnonser((p) => [...p, item]); return item;
  }, [setAnnonser]);
  const updateAnnonse = useCallback((id, data) => {
    setAnnonser((p) => p.map((a) => a.id === id ? { ...a, ...data } : a));
  }, [setAnnonser]);
  const deleteAnnonse = useCallback((id) => {
    setAnnonser((p) => p.filter((a) => a.id !== id));
  }, [setAnnonser]);

  return (
    <AppContext.Provider value={{
      bygg, leieobjekter, kontrakter, utleiere, faktiskeTall, fakturaer,
      meldinger, sendMelding, markerLest, oppdaterVedlikeholdStatus,
      protokoller, addProtokoll, updateProtokoll, deleteProtokoll,
      notater, addNotat, updateNotat, deleteNotat,
      utlegg, addUtlegg, updateUtlegg, deleteUtlegg,
      annonser, addAnnonse, updateAnnonse, deleteAnnonse,
      addBygg, updateBygg, deleteBygg,
      addLeieobjekt, updateLeieobjekt, deleteLeieobjekt,
      addKontrakt, updateKontrakt, deleteKontrakt,
      addUtleier, updateUtleier, deleteUtleier, setUtleiere,
      setFaktiskeTall,
      addFaktura, updateFaktura, deleteFaktura,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
