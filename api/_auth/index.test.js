/**
 * Enhetstester for DB-orkestreringen i index.js med mocket sql-klient.
 * Fokus: Google-kobling (kontoovertakelses-vern) og hentSesjonsBruker-formen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../_db.js', () => ({ sql: vi.fn(), dbKonfigurert: () => true }));

import { sql } from '../_db.js';
import { finnEllerOpprettGoogleBruker, hentSesjonsBruker } from './index.js';

// Hjelper: les den statiske SQL-teksten fra kall nr. n (tagged template).
const sqlTekst = (n) => sql.mock.calls[n][0].join(' ');

beforeEach(() => sql.mockReset());

describe('finnEllerOpprettGoogleBruker — email_verified-vern', () => {
  it('avviser (null) når Google-eposten IKKE er verifisert og sub ikke er koblet', async () => {
    sql.mockResolvedValueOnce([]); // oauth_kontoer: ingen kobling på sub
    const r = await finnEllerOpprettGoogleBruker({
      sub: 'sub-1', epost: 'offer@firma.no', navn: 'Angriper', epostVerifisert: false,
    });
    expect(r).toBeNull();
    // Skal stoppe FØR e-postoppslag/kobling — kun ett sql-kall (sub-oppslaget).
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it('avviser også når epostVerifisert mangler (undefined !== true)', async () => {
    sql.mockResolvedValueOnce([]);
    const r = await finnEllerOpprettGoogleBruker({ sub: 'sub-2', epost: 'a@b.no', navn: 'A' });
    expect(r).toBeNull();
  });

  it('godtar eksisterende sub-kobling selv om eposten er uverifisert', async () => {
    sql
      .mockResolvedValueOnce([{ bruker_id: 'u1' }]) // oauth_kontoer-treff på sub
      .mockResolvedValueOnce([{ id: 'u1', epost: 'a@b.no' }]) // hentBrukerById
      .mockResolvedValueOnce([{ rolle: 'utleier' }]); // hentRoller
    const r = await finnEllerOpprettGoogleBruker({
      sub: 'sub-3', epost: 'a@b.no', navn: 'A', epostVerifisert: false,
    });
    expect(r?.bruker?.id).toBe('u1');
    expect(r?.roller).toEqual(['utleier']);
  });

  it('kobler mot eksisterende konto via e-post KUN når Google-eposten er verifisert', async () => {
    sql
      .mockResolvedValueOnce([]) // ingen sub-kobling
      .mockResolvedValueOnce([{ id: 'u2', epost: 'a@b.no' }]) // finnBruker(epost)
      .mockResolvedValueOnce([]) // update epost_verifisert
      .mockResolvedValueOnce([]) // insert oauth_kontoer
      .mockResolvedValueOnce([{ rolle: 'utleier' }]); // hentRoller
    const r = await finnEllerOpprettGoogleBruker({
      sub: 'sub-4', epost: 'a@b.no', navn: 'A', epostVerifisert: true,
    });
    expect(r?.bruker?.id).toBe('u2');
    expect(sqlTekst(3)).toContain('insert into oauth_kontoer');
  });
});

describe('hentSesjonsBruker — én spørring, uendret retur-form', () => {
  it('returnerer { bruker, roller } der bruker ikke har roller-felt', async () => {
    sql.mockResolvedValueOnce([{
      id: 'u1', epost: 'a@b.no', passord_hash: 'hemmelig', status: 'aktiv',
      sesjon_id: 's1', utloper: '2026-07-01T00:00:00Z', roller: ['utleier', 'leietaker'],
    }]);
    const okt = await hentSesjonsBruker({ headers: { cookie: 'epro_sesjon=tok123' } });
    expect(okt.roller).toEqual(['utleier', 'leietaker']);
    expect(okt.bruker.id).toBe('u1');
    expect(okt.bruker.sesjon_id).toBe('s1');
    expect(okt.bruker).not.toHaveProperty('roller');
    expect(sql).toHaveBeenCalledTimes(1); // sesjon + bruker + roller i ett
  });

  it('returnerer null uten cookie og uten DB-kall', async () => {
    expect(await hentSesjonsBruker({ headers: {} })).toBeNull();
    expect(sql).not.toHaveBeenCalled();
  });

  it('returnerer null når sesjonen ikke finnes/er utløpt', async () => {
    sql.mockResolvedValueOnce([]);
    expect(await hentSesjonsBruker({ headers: { cookie: 'epro_sesjon=utlopt' } })).toBeNull();
  });
});
