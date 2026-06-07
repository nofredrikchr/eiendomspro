import { describe, it, expect } from 'vitest';
import { byggSesjonsCookie, byggSlettCookie, parseCookies, SESJON_COOKIE } from './cookie.js';

describe('byggSesjonsCookie', () => {
  it('setter token med sikre flagg', () => {
    const c = byggSesjonsCookie('abc123', 3600);
    expect(c).toContain(`${SESJON_COOKIE}=abc123`);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/Secure/i);
    expect(c).toMatch(/SameSite=Lax/i);
    expect(c).toMatch(/Path=\//i);
    expect(c).toMatch(/Max-Age=3600/i);
  });
});

describe('byggSlettCookie', () => {
  it('utløper cookien umiddelbart', () => {
    const c = byggSlettCookie();
    expect(c).toContain(`${SESJON_COOKIE}=`);
    expect(c).toMatch(/Max-Age=0/i);
    expect(c).toMatch(/HttpOnly/i);
  });
});

describe('parseCookies', () => {
  it('parser flere cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' });
  });

  it('håndterer tomt/undefined header', () => {
    expect(parseCookies('')).toEqual({});
    expect(parseCookies(undefined)).toEqual({});
  });

  it('finner sesjonstokenet igjen', () => {
    const header = byggSesjonsCookie('mitt-token', 3600).split(';')[0];
    expect(parseCookies(header)[SESJON_COOKIE]).toBe('mitt-token');
  });
});
