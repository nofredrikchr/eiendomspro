import { describe, it, expect } from 'vitest';
import { erAdmin, harRolle, landingsModus, gyldigModus } from './roller.js';

describe('gyldigModus', () => {
  it('godtar utleier og leietaker', () => {
    expect(gyldigModus('utleier')).toBe(true);
    expect(gyldigModus('leietaker')).toBe(true);
  });
  it('avviser admin og ukjente verdier', () => {
    expect(gyldigModus('admin')).toBe(false);
    expect(gyldigModus('')).toBe(false);
    expect(gyldigModus(null)).toBe(false);
    expect(gyldigModus('UTLEIER')).toBe(false);
  });
});

describe('erAdmin', () => {
  it('er sann kun for niva 3', () => {
    expect(erAdmin({ niva: 3 })).toBe(true);
    expect(erAdmin({ niva: 1 })).toBe(false);
    expect(erAdmin({ niva: 2 })).toBe(false);
    expect(erAdmin(null)).toBe(false);
  });
});

describe('harRolle', () => {
  it('sjekker om en rolle finnes i settet', () => {
    expect(harRolle(['utleier'], 'utleier')).toBe(true);
    expect(harRolle(['utleier'], 'leietaker')).toBe(false);
    expect(harRolle(null, 'utleier')).toBe(false);
  });
});

describe('landingsModus', () => {
  it('sender admin til admin-flate', () => {
    expect(landingsModus({ niva: 3 })).toBe('admin');
  });

  it('foretrekker aktiv_modus over primary_rolle', () => {
    expect(landingsModus({ niva: 1, primary_rolle: 'utleier', aktiv_modus: 'leietaker' })).toBe('leietaker');
  });

  it('faller tilbake til primary_rolle når aktiv_modus mangler', () => {
    expect(landingsModus({ niva: 2, primary_rolle: 'leietaker' })).toBe('leietaker');
  });

  it('returnerer null uten bruker', () => {
    expect(landingsModus(null)).toBeNull();
  });
});
