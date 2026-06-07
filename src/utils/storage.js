const KEYS = {
  BYGG: 'utleier_pro_bygg',
  LEIEOBJEKTER: 'utleier_pro_leieobjekter',
  KONTRAKTER: 'utleier_pro_kontrakter',
  UTLEIERE: 'utleier_pro_utleiere',
  FAKTISKE_TALL: 'utleier_pro_faktiske_tall',
  FAKTURAER: 'utleier_pro_fakturaer',
};

function load(key, fallback = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export const storage = {
  getBygg: () => load(KEYS.BYGG),
  saveBygg: (data) => save(KEYS.BYGG, data),

  getLeieobjekter: () => load(KEYS.LEIEOBJEKTER),
  saveLeieobjekter: (data) => save(KEYS.LEIEOBJEKTER, data),

  getKontrakter: () => load(KEYS.KONTRAKTER),
  saveKontrakter: (data) => save(KEYS.KONTRAKTER, data),

  getUtleiere: () => load(KEYS.UTLEIERE),
  saveUtleiere: (data) => save(KEYS.UTLEIERE, data),

  getFaktiskeTall: () => load(KEYS.FAKTISKE_TALL, {}),
  saveFaktiskeTall: (data) => save(KEYS.FAKTISKE_TALL, data),

  getFakturaer: () => load(KEYS.FAKTURAER),
  saveFakturaer: (data) => save(KEYS.FAKTURAER, data),
};

// ─── Betalinger og integrasjoner (utvidelse) ────────────────────────────────
const EXT_KEYS = {
  BETALINGER:    'utleier_pro_betalinger',
  INTEGRASJONER: 'utleier_pro_integrasjoner',
};

function loadExt(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
}
function saveExt(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

export const storageExt = {
  getBetalinger:      () => loadExt(EXT_KEYS.BETALINGER, []),
  saveBetalinger:     (d) => saveExt(EXT_KEYS.BETALINGER, d),
  getIntegrasjoner:   () => loadExt(EXT_KEYS.INTEGRASJONER, {}),
  saveIntegrasjoner:  (d) => saveExt(EXT_KEYS.INTEGRASJONER, d),
};

// ─── Meldinger ───────────────────────────────────────────────────
const MELD_KEY = 'utleier_pro_meldinger';
export const meldingStorage = {
  get:  () => { try { return JSON.parse(localStorage.getItem(MELD_KEY) || '[]'); } catch { return []; } },
  save: (d) => localStorage.setItem(MELD_KEY, JSON.stringify(d)),
};

// ─── Protokoller ─────────────────────────────────────────────────
const PROT_KEY = 'utleier_pro_protokoller';
export const protokollStorage = {
  get:  () => { try { return JSON.parse(localStorage.getItem(PROT_KEY) || '[]'); } catch { return []; } },
  save: (d) => localStorage.setItem(PROT_KEY, JSON.stringify(d)),
};

// ─── Notater og utlegg ───────────────────────────────────────────
const NOTE_KEY = 'utleier_pro_notater';
const UTLEGG_KEY = 'utleier_pro_utlegg';
export const notatStorage = {
  get:  () => { try { return JSON.parse(localStorage.getItem(NOTE_KEY) || '[]'); } catch { return []; } },
  save: (d) => localStorage.setItem(NOTE_KEY, JSON.stringify(d)),
};
export const utleggStorage = {
  get:  () => { try { return JSON.parse(localStorage.getItem(UTLEGG_KEY) || '[]'); } catch { return []; } },
  save: (d) => localStorage.setItem(UTLEGG_KEY, JSON.stringify(d)),
};

// ─── Annonser ────────────────────────────────────────────────────
const ANNONSE_KEY = 'utleier_pro_annonser';
export const annonseStorage = {
  get:  () => { try { return JSON.parse(localStorage.getItem(ANNONSE_KEY) || '[]'); } catch { return []; } },
  save: (d) => localStorage.setItem(ANNONSE_KEY, JSON.stringify(d)),
};
