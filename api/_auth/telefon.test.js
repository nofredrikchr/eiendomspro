import { describe, it, expect } from 'vitest';
import { normaliserTelefon } from './telefon.js';

describe('normaliserTelefon', () => {
  it('beholder et gyldig E.164-nummer', () => {
    expect(normaliserTelefon('+4798765432')).toBe('+4798765432');
  });

  it('legger til +47 for et bart norsk 8-sifret nummer', () => {
    expect(normaliserTelefon('98765432')).toBe('+4798765432');
  });

  it('fjerner mellomrom, bindestrek og parenteser', () => {
    expect(normaliserTelefon('987 65 432')).toBe('+4798765432');
    expect(normaliserTelefon('98-76-54-32')).toBe('+4798765432');
  });

  it('konverterer 00-prefiks til +', () => {
    expect(normaliserTelefon('004798765432')).toBe('+4798765432');
  });

  it('beholder andre lands landskoder', () => {
    expect(normaliserTelefon('+46 70 123 45 67')).toBe('+46701234567');
  });

  it('returnerer null for for kort nummer', () => {
    expect(normaliserTelefon('123')).toBeNull();
  });

  it('returnerer null for tomt/ugyldig input', () => {
    expect(normaliserTelefon('')).toBeNull();
    expect(normaliserTelefon(null)).toBeNull();
    expect(normaliserTelefon('abc')).toBeNull();
  });
});
