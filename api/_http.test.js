import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DB-konfig og auth slik at wrapperen kan testes uten Neon.
vi.mock('./_db.js', () => ({ dbKonfigurert: vi.fn(() => true), sql: null }));
vi.mock('./_auth/index.js', () => ({ krevBruker: vi.fn() }));

import { dbKonfigurert } from './_db.js';
import { krevBruker } from './_auth/index.js';
import { medBruker, medAdmin } from './_http.js';

function lagRes() {
  return {
    statusKode: null,
    body: null,
    headers: {},
    status(kode) { this.statusKode = kode; return this; },
    json(body) { this.body = body; return this; },
    setHeader(navn, verdi) { this.headers[navn] = verdi; },
  };
}

const OKT = { bruker: { id: 'b1', niva: 1 } };
const ADMIN_OKT = { bruker: { id: 'a1', niva: 3 } };

beforeEach(() => {
  dbKonfigurert.mockReturnValue(true);
  krevBruker.mockResolvedValue(OKT);
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe('medBruker', () => {
  it('returnerer 503 når databasen ikke er konfigurert', async () => {
    dbKonfigurert.mockReturnValue(false);
    const res = lagRes();
    await medBruker({ GET: async () => {} })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(503);
    expect(res.body).toEqual({ feil: 'Database ikke konfigurert.' });
  });

  it('returnerer 405 med Allow-header for ukjent metode', async () => {
    const res = lagRes();
    await medBruker({ GET: async () => {}, POST: async () => {} })({ method: 'DELETE' }, res);
    expect(res.statusKode).toBe(405);
    expect(res.headers.Allow).toBe('GET, POST');
    expect(res.body).toEqual({ feil: 'Metode ikke tillatt.' });
  });

  it('returnerer 401 når bruker ikke er innlogget', async () => {
    krevBruker.mockResolvedValue(null);
    const res = lagRes();
    await medBruker({ GET: async () => {} })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(401);
    expect(res.body).toEqual({ feil: 'Ikke innlogget.' });
  });

  it('returnerer 413 for for stor body', async () => {
    const res = lagRes();
    const stor = { tekst: 'x'.repeat(2_000_001) };
    await medBruker({ POST: async () => {} })({ method: 'POST', body: stor }, res);
    expect(res.statusKode).toBe(413);
    expect(res.body).toEqual({ feil: 'For stor forespørsel.' });
  });

  it('kaller handleren med (req, res, okt) ved suksess', async () => {
    const res = lagRes();
    const handler = vi.fn(async (req, r, okt) => r.status(200).json({ id: okt.bruker.id }));
    const req = { method: 'GET' };
    await medBruker({ GET: handler })(req, res);
    expect(handler).toHaveBeenCalledWith(req, res, OKT);
    expect(res.statusKode).toBe(200);
    expect(res.body).toEqual({ id: 'b1' });
  });

  it('returnerer generisk 500 ved ukjent feil — uten e.message', async () => {
    const logg = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = lagRes();
    await medBruker({ GET: async () => { throw new Error('hemmelig intern detalj'); } })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(500);
    expect(res.body).toEqual({ feil: 'Uventet serverfeil.' });
    expect(JSON.stringify(res.body)).not.toContain('hemmelig');
    expect(logg).toHaveBeenCalled();
  });

  it('mapper UKJENT_BYGG til 400', async () => {
    const res = lagRes();
    const feil = new Error('Ukjent bygg.');
    feil.kode = 'UKJENT_BYGG';
    await medBruker({ POST: async () => { throw feil; } })({ method: 'POST', body: {} }, res);
    expect(res.statusKode).toBe(400);
    expect(res.body).toEqual({ feil: 'Ukjent bygg.' });
  });

  it('lar handleren kaste kontrollerte feil med status + feil', async () => {
    const res = lagRes();
    const feil = new Error('Ugyldig status.');
    feil.status = 400;
    feil.feil = 'Ugyldig status.';
    await medBruker({ PATCH: async () => { throw feil; } })({ method: 'PATCH', body: {} }, res);
    expect(res.statusKode).toBe(400);
    expect(res.body).toEqual({ feil: 'Ugyldig status.' });
  });

  it('ignorerer e.status uten e.feil (faller til generisk 500)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = lagRes();
    const feil = new Error('rar feil');
    feil.status = 400; // mangler e.feil → skal IKKE lekke message
    await medBruker({ GET: async () => { throw feil; } })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(500);
    expect(res.body).toEqual({ feil: 'Uventet serverfeil.' });
  });
});

describe('medAdmin', () => {
  it('returnerer 401 når ingen er innlogget', async () => {
    krevBruker.mockResolvedValue(null);
    const res = lagRes();
    await medAdmin({ GET: async () => {} })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(401);
    expect(res.body).toEqual({ feil: 'Ikke innlogget.' });
  });

  it('returnerer 403 for innlogget bruker uten niva=3', async () => {
    krevBruker.mockResolvedValue(OKT);
    const res = lagRes();
    await medAdmin({ GET: async () => {} })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(403);
    expect(res.body).toEqual({ feil: 'Krever admin.' });
  });

  it('slipper admin (niva=3) gjennom', async () => {
    krevBruker.mockResolvedValue(ADMIN_OKT);
    const res = lagRes();
    await medAdmin({ GET: async (req, r, okt) => r.status(200).json({ admin: okt.bruker.id }) })({ method: 'GET' }, res);
    expect(res.statusKode).toBe(200);
    expect(res.body).toEqual({ admin: 'a1' });
  });
});
