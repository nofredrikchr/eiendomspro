import { describe, it, expect, afterEach } from 'vitest';
import { appUrl } from './url.js';

describe('appUrl', () => {
  const original = process.env.APP_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = original;
  });

  it('bruker APP_URL når satt (Host-headeren ignoreres)', () => {
    process.env.APP_URL = 'https://eiendomspro.vercel.app';
    const req = { headers: { host: 'ondsinnet.example.com' } };
    expect(appUrl(req)).toBe('https://eiendomspro.vercel.app');
  });

  it('stripper avsluttende skråstreker fra APP_URL', () => {
    process.env.APP_URL = 'https://eiendomspro.vercel.app/';
    expect(appUrl({ headers: { host: 'x.no' } })).toBe('https://eiendomspro.vercel.app');
  });

  it('faller tilbake til https://<host> når APP_URL ikke er satt', () => {
    delete process.env.APP_URL;
    expect(appUrl({ headers: { host: 'preview-123.vercel.app' } })).toBe('https://preview-123.vercel.app');
  });

  it('tom APP_URL behandles som ikke satt', () => {
    process.env.APP_URL = '   ';
    expect(appUrl({ headers: { host: 'x.no' } })).toBe('https://x.no');
  });
});
