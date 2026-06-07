import { describe, it, expect } from 'vitest';
import { hashPassord, verifyPassord } from './passord.js';

describe('hashPassord / verifyPassord', () => {
  it('produserer en argon2-hash som ikke er klartekst', async () => {
    const hash = await hashPassord('Riktig-Passord-1');
    expect(hash).toMatch(/^\$argon2/);
    expect(hash).not.toContain('Riktig-Passord-1');
  });

  it('verifiserer riktig passord', async () => {
    const hash = await hashPassord('Riktig-Passord-1');
    expect(await verifyPassord(hash, 'Riktig-Passord-1')).toBe(true);
  });

  it('avviser feil passord', async () => {
    const hash = await hashPassord('Riktig-Passord-1');
    expect(await verifyPassord(hash, 'Feil-Passord-2')).toBe(false);
  });

  it('gir ulik hash for samme passord (tilfeldig salt)', async () => {
    const a = await hashPassord('samme');
    const b = await hashPassord('samme');
    expect(a).not.toBe(b);
  });
});
