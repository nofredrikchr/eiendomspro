import { useEffect } from 'react';

/**
 * Setter sidetittel + meta for offentlige (SEO-relevante) sider i SPA-en.
 * Google rendrer JavaScript, så dette gir hver rute riktig tittel/description/
 * canonical. (For maks robusthet kan man prerendre disse sidene senere.)
 *
 * Gjenoppretter forrige verdi når komponenten forlates, så index.html-standarden
 * gjelder igjen på forsiden.
 */
const BASE = 'https://eiendomspro.no';

function settMeta(selector, lagAttr, innhold) {
  if (!innhold) return null;
  let el = document.head.querySelector(selector);
  const fantes = !!el;
  const forrige = el?.getAttribute('content') ?? null;
  if (!el) {
    el = document.createElement('meta');
    Object.entries(lagAttr).forEach(([k, v]) => el.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('content', innhold);
  return { el, fantes, forrige };
}

function settCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  const forrige = el?.getAttribute('href') ?? null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  return forrige;
}

export function useSEO({ title, description, path = '', image }) {
  useEffect(() => {
    const forrigeTittel = document.title;
    const url = BASE + path;
    if (title) document.title = title;

    const endringer = [
      settMeta('meta[name="description"]', { name: 'description' }, description),
      settMeta('meta[property="og:title"]', { property: 'og:title' }, title),
      settMeta('meta[property="og:description"]', { property: 'og:description' }, description),
      settMeta('meta[property="og:url"]', { property: 'og:url' }, url),
      settMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title),
      settMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description),
      image && settMeta('meta[property="og:image"]', { property: 'og:image' }, image),
    ].filter(Boolean);

    const forrigeCanonical = settCanonical(url);

    return () => {
      document.title = forrigeTittel;
      endringer.forEach((e) => { if (e && e.forrige != null) e.el.setAttribute('content', e.forrige); });
      if (forrigeCanonical) settCanonical(forrigeCanonical);
    };
  }, [title, description, path, image]);
}
