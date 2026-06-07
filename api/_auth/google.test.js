import { describe, it, expect } from 'vitest';
import { byggGoogleAuthUrl } from './google.js';

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
