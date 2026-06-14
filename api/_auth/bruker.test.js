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

  it('uten abonnement: plan = gratis, objektgrense = 1', () => {
    const u = offentligBruker(rad, ['utleier']);
    expect(u.plan).toBe('gratis');
    expect(u.objektgrense).toBe(1);
    expect(u.abonnement).toBeNull();
    expect(u.trialDagerIgjen).toBe(0);
  });

  it('i prøveperiode på Pro: effektiv plan = pro med dager igjen', () => {
    const trialEnds = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const u = offentligBruker(rad, ['utleier'], {
      abonnement: { status: 'prøve', plan_id: 'pro', trial_ends_at: trialEnds },
      kredittOre: 12000,
    });
    expect(u.plan).toBe('pro');
    expect(u.objektgrense).toBe(Infinity);
    expect(u.trialDagerIgjen).toBeGreaterThan(0);
    expect(u.kredittOre).toBe(12000);
    expect(u.abonnement.status).toBe('prøve');
  });
});
