import { describe, it, expect } from 'vitest';
import { genererToken, hashToken } from './token.js';

describe('genererToken', () => {
  it('genererer en lang, ugjettbar streng', () => {
    const t = genererToken();
    expect(typeof t).toBe('string');
    expect(t.length).toBeGreaterThanOrEqual(32);
  });

  it('gir unikt token hver gang', () => {
    const a = genererToken();
    const b = genererToken();
    expect(a).not.toBe(b);
  });
});

describe('hashToken', () => {
  it('gir 64-tegns hex (SHA-256)', () => {
    const h = hashToken('hemmelig');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('er deterministisk for samme input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('gir ulik hash for ulik input', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('lagrer aldri token i klartekst (hash != input)', () => {
    expect(hashToken('hemmelig')).not.toBe('hemmelig');
  });
});
