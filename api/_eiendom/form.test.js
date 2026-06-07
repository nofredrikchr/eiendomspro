import { describe, it, expect } from 'vitest';
import { radTilObjekt } from './form.js';

describe('radTilObjekt', () => {
  it('sprer data-feltene ut i et flatt objekt', () => {
    const o = radTilObjekt({ id: 'u1', eier_id: 'e1', data: { gatenavn: 'Bjørneveien', antallEtasjer: '3' }, opprettet: '2026-01-01T00:00:00.000Z', oppdatert: '2026-01-02T00:00:00.000Z' });
    expect(o.gatenavn).toBe('Bjørneveien');
    expect(o.antallEtasjer).toBe('3');
  });

  it('lar rad-id overstyre en eventuell gammel id i data', () => {
    const o = radTilObjekt({ id: 'kanonisk-uuid', data: { id: 'gammel-genid', x: 1 }, opprettet: 't', oppdatert: 't' });
    expect(o.id).toBe('kanonisk-uuid');
  });

  it('lar rad-tidsstempler overstyre data', () => {
    const o = radTilObjekt({ id: 'u1', data: { opprettet: 'gammel' }, opprettet: '2026-05-01T00:00:00.000Z', oppdatert: '2026-05-02T00:00:00.000Z' });
    expect(o.opprettet).toBe('2026-05-01T00:00:00.000Z');
    expect(o.oppdatert).toBe('2026-05-02T00:00:00.000Z');
  });

  it('konverterer Date-tidsstempler til ISO-streng', () => {
    const o = radTilObjekt({ id: 'u1', data: {}, opprettet: new Date('2026-03-03T10:00:00Z'), oppdatert: new Date('2026-03-04T10:00:00Z') });
    expect(o.opprettet).toBe('2026-03-03T10:00:00.000Z');
  });

  it('lekker ikke interne kolonner (eier_id, bygg_id)', () => {
    const o = radTilObjekt({ id: 'u1', eier_id: 'e1', bygg_id: 'b1', data: { x: 1 }, opprettet: 't', oppdatert: 't' });
    expect(o.eier_id).toBeUndefined();
    expect(o.bygg_id).toBeUndefined();
  });

  it('beholder byggId fra data (frontend-feltet)', () => {
    const o = radTilObjekt({ id: 'u1', bygg_id: 'b-uuid', data: { byggId: 'b-uuid', type: 'leilighet' }, opprettet: 't', oppdatert: 't' });
    expect(o.byggId).toBe('b-uuid');
  });

  it('takler manglende/ugyldig data', () => {
    expect(radTilObjekt({ id: 'u1', data: null, opprettet: 't', oppdatert: 't' }).id).toBe('u1');
    expect(radTilObjekt(null)).toBeNull();
  });
});
