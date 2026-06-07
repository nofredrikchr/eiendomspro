import { describe, it, expect } from 'vitest';
import { validerRegistrering, validerInnlogging } from './validering.js';

const gyldig = {
  epost: 'Test@Example.NO',
  passord: 'GodtPassord1',
  fulltNavn: 'Test Testesen',
  primaryRolle: 'utleier',
};

describe('validerRegistrering', () => {
  it('godtar gyldig input og normaliserer e-post', () => {
    const r = validerRegistrering(gyldig);
    expect(r.ok).toBe(true);
    expect(r.verdier.epost).toBe('test@example.no');
    expect(r.verdier.fulltNavn).toBe('Test Testesen');
  });

  it('godtar telefon i stedet for e-post og normaliserer den', () => {
    const r = validerRegistrering({ ...gyldig, epost: undefined, telefon: '98765432' });
    expect(r.ok).toBe(true);
    expect(r.verdier.telefon).toBe('+4798765432');
  });

  it('krever minst én av e-post/telefon', () => {
    const r = validerRegistrering({ ...gyldig, epost: undefined, telefon: undefined });
    expect(r.ok).toBe(false);
    expect(r.feil.kontakt).toBeTruthy();
  });

  it('avviser ugyldig e-post', () => {
    const r = validerRegistrering({ ...gyldig, epost: 'ikke-epost' });
    expect(r.ok).toBe(false);
    expect(r.feil.epost).toBeTruthy();
  });

  it('avviser for kort passord', () => {
    const r = validerRegistrering({ ...gyldig, passord: 'kort' });
    expect(r.ok).toBe(false);
    expect(r.feil.passord).toBeTruthy();
  });

  it('krever fullt navn', () => {
    const r = validerRegistrering({ ...gyldig, fulltNavn: '   ' });
    expect(r.ok).toBe(false);
    expect(r.feil.fulltNavn).toBeTruthy();
  });

  it('krever gyldig primærrolle', () => {
    const r = validerRegistrering({ ...gyldig, primaryRolle: 'admin' });
    expect(r.ok).toBe(false);
    expect(r.feil.primaryRolle).toBeTruthy();
  });
});

describe('validerInnlogging', () => {
  it('tolker identifikator med @ som e-post', () => {
    const r = validerInnlogging({ identifikator: 'Test@Example.NO', passord: 'x' });
    expect(r.ok).toBe(true);
    expect(r.verdier.epost).toBe('test@example.no');
    expect(r.verdier.telefon).toBeNull();
  });

  it('tolker identifikator uten @ som telefon', () => {
    const r = validerInnlogging({ identifikator: '987 65 432', passord: 'x' });
    expect(r.ok).toBe(true);
    expect(r.verdier.telefon).toBe('+4798765432');
    expect(r.verdier.epost).toBeNull();
  });

  it('krever identifikator og passord', () => {
    expect(validerInnlogging({ identifikator: '', passord: 'x' }).ok).toBe(false);
    expect(validerInnlogging({ identifikator: 'a@b.no', passord: '' }).ok).toBe(false);
  });
});
