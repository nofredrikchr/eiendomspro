import { describe, it, expect } from 'vitest';
import { offentligBruker } from './bruker.js';

const rad = {
  id: 'u1',
  epost: 'a@b.no',
  telefon: '+4798765432',
  passord_hash: '$argon2id$HEMMELIG',
  fullt_navn: 'A B',
  niva: 1,
  primary_rolle: 'utleier',
  aktiv_modus: 'utleier',
  epost_verifisert: false,
};

describe('offentligBruker', () => {
  it('lekker ALDRI passord_hash', () => {
    const u = offentligBruker(rad, ['utleier']);
    expect(u.passord_hash).toBeUndefined();
    expect(JSON.stringify(u)).not.toContain('argon2');
    expect(JSON.stringify(u)).not.toContain('HEMMELIG');
  });

  it('mapper snake_case-rad til camelCase offentlig objekt', () => {
    const u = offentligBruker(rad, ['utleier']);
    expect(u).toMatchObject({
      id: 'u1',
      epost: 'a@b.no',
      telefon: '+4798765432',
      fulltNavn: 'A B',
      niva: 1,
      primaryRolle: 'utleier',
      aktivModus: 'utleier',
      roller: ['utleier'],
      erAdmin: false,
    });
  });

  it('setter erAdmin for niva 3', () => {
    expect(offentligBruker({ ...rad, niva: 3 }, []).erAdmin).toBe(true);
  });

  it('defaulter roller til tom liste', () => {
    expect(offentligBruker(rad).roller).toEqual([]);
  });
});
