import { describe, it, expect, vi, afterEach } from 'vitest';
import { byggGoogleAuthUrl, hentGoogleBruker } from './google.js';

describe('byggGoogleAuthUrl', () => {
  const url = byggGoogleAuthUrl({ clientId: 'cid.apps.googleusercontent.com', redirectUri: 'https://x.no/api/auth/google/callback', state: 'abc123' });
  const u = new URL(url);

  it('peker på Googles OAuth2-endepunkt', () => {
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
  });
  it('har riktige parametre', () => {
    expect(u.searchParams.get('client_id')).toBe('cid.apps.googleusercontent.com');
    expect(u.searchParams.get('redirect_uri')).toBe('https://x.no/api/auth/google/callback');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('state')).toBe('abc123');
  });
  it('ber om openid email profile', () => {
    const scope = u.searchParams.get('scope');
    expect(scope).toContain('openid');
    expect(scope).toContain('email');
    expect(scope).toContain('profile');
  });
});

describe('hentGoogleBruker — epostVerifisert', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubGoogle(userinfo) {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).includes('oauth2.googleapis.com/token')) {
        return { ok: true, json: async () => ({ access_token: 'tok' }) };
      }
      return { ok: true, json: async () => userinfo };
    }));
  }

  it('mapper email_verified=true til epostVerifisert=true', async () => {
    stubGoogle({ sub: 's1', email: 'a@b.no', email_verified: true, name: 'A' });
    const g = await hentGoogleBruker({ code: 'c', redirectUri: 'https://x.no/cb' });
    expect(g.epostVerifisert).toBe(true);
    expect(g.sub).toBe('s1');
    expect(g.epost).toBe('a@b.no');
  });

  it('mapper email_verified=false til epostVerifisert=false', async () => {
    stubGoogle({ sub: 's2', email: 'a@b.no', email_verified: false, name: 'A' });
    const g = await hentGoogleBruker({ code: 'c', redirectUri: 'https://x.no/cb' });
    expect(g.epostVerifisert).toBe(false);
  });

  it('manglende email_verified gir epostVerifisert=false (aldri undefined)', async () => {
    stubGoogle({ sub: 's3', email: 'a@b.no', name: 'A' });
    const g = await hentGoogleBruker({ code: 'c', redirectUri: 'https://x.no/cb' });
    expect(g.epostVerifisert).toBe(false);
  });
});
