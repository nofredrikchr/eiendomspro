/**
 * SSB KPI — henter konsumprisindeksen (totalindeks, 2015=100) fra Statistisk
 * sentralbyrå sitt åpne API og beregner KPI-regulering av husleie.
 *
 * Tabell 03013: «Konsumprisindeks, etter konsumgruppe».
 * API: https://data.ssb.no/api/v0/no/table/03013/  (POST, json-stat2)
 * Verifisert: APIet svarer med CORS, så dette kjører direkte i nettleseren.
 *
 * KPI-regulering (husleieloven § 4-2): leien kan endres i takt med endringen i
 * KPI, maks én gang i året, tidligst 12 mnd etter siste fastsettelse, med minst
 * én måneds skriftlig varsel. Vi bruker alltid SISTE publiserte indeks.
 *
 *   ny leie = gammel leie × (indeks_ny / indeks_gammel)
 */

const TABELL = 'https://data.ssb.no/api/v0/no/table/03013/';
const CACHE_KEY = 'ssb_kpi_serie_v1';
const CACHE_TIMER = 1000 * 60 * 60 * 12; // 12 t

let _minne = null;

function byggQuery(antall) {
  return JSON.stringify({
    query: [
      { code: 'Konsumgrp', selection: { filter: 'item', values: ['TOTAL'] } },
      { code: 'ContentsCode', selection: { filter: 'item', values: ['KpiIndMnd'] } },
      { code: 'Tid', selection: { filter: 'top', values: [String(antall)] } },
    ],
    response: { format: 'json-stat2' },
  });
}

// 'YYYYMmm' (SSB) ↔ hjelpere
export function tilSsbMaaned(input) {
  // godtar 'YYYY-MM' (fra <input type=month>) eller Date
  if (!input) return null;
  if (input instanceof Date) {
    return `${input.getFullYear()}M${String(input.getMonth() + 1).padStart(2, '0')}`;
  }
  const m = String(input).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}M${m[2]}` : null;
}

export function ssbMaanedTilTekst(ssb) {
  const m = String(ssb).match(/^(\d{4})M(\d{2})$/);
  if (!m) return ssb;
  const mnd = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  return `${mnd[Number(m[2]) - 1]} ${m[1]}`;
}

/** Henter KPI-serien (måned → indeks). Cacher i sessionStorage. */
export async function hentKpiSerie(antallMnd = 200) {
  if (_minne) return _minne;
  try {
    const lagret = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (lagret && Date.now() - lagret.hentet < CACHE_TIMER) { _minne = lagret; return _minne; }
  } catch { /* ignorer */ }

  const res = await fetch(TABELL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: byggQuery(antallMnd),
  });
  if (!res.ok) throw new Error(`SSB svarte ${res.status}`);
  const d = await res.json();

  const indexMap = d.dimension?.Tid?.category?.index || {};
  const verdier = d.value || [];
  // value[i] følger Tid sortert etter category.index
  const tider = Object.entries(indexMap).sort((a, b) => a[1] - b[1]).map(([t]) => t);
  const serie = {};
  tider.forEach((t) => { const v = verdier[indexMap[t]]; if (v != null) serie[t] = v; });

  const gyldige = Object.keys(serie).sort();
  const sisteMaaned = gyldige[gyldige.length - 1];

  _minne = { serie, sisteMaaned, sisteVerdi: serie[sisteMaaned], hentet: Date.now() };
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(_minne)); } catch { /* ignorer */ }
  return _minne;
}

/** Indeks for en gitt måned ('YYYYMmm'), evt. nærmeste tidligere hvis hullet. */
export function indeksFor(serie, ssbMaaned) {
  if (serie[ssbMaaned] != null) return serie[ssbMaaned];
  // fall tilbake til nærmeste tidligere måned
  const keys = Object.keys(serie).sort();
  let treff = null;
  for (const k of keys) { if (k <= ssbMaaned) treff = k; else break; }
  return treff ? serie[treff] : null;
}

/**
 * Beregner KPI-justert leie.
 * @param {number} gammelLeie  dagens leie
 * @param {string} fraMaaned   'YYYY-MM' eller 'YYYYMmm' — da leien sist ble fastsatt
 * @param {string} [tilMaaned] valgfritt sluttmåned; default siste publiserte
 */
export async function beregnKpiJustering(gammelLeie, fraMaaned, tilMaaned) {
  const { serie, sisteMaaned } = await hentKpiSerie();
  const fra = fraMaaned.includes('M') ? fraMaaned : tilSsbMaaned(fraMaaned);
  const til = tilMaaned ? (tilMaaned.includes('M') ? tilMaaned : tilSsbMaaned(tilMaaned)) : sisteMaaned;

  const fraIndeks = indeksFor(serie, fra);
  const tilIndeks = indeksFor(serie, til);
  if (fraIndeks == null || tilIndeks == null) {
    return { ok: false, feil: 'Mangler KPI-tall for valgt periode.' };
  }
  const faktor = tilIndeks / fraIndeks;
  const nyLeie = Math.round(gammelLeie * faktor);
  const endringPst = (faktor - 1) * 100;
  return {
    ok: true,
    nyLeie,
    okning: nyLeie - Math.round(gammelLeie),
    endringPst,
    fraMaaned: fra, tilMaaned: til,
    fraIndeks, tilIndeks,
    sisteMaaned,
  };
}

/** Antall hele måneder mellom to 'YYYYMmm'. */
export function manederMellom(fraSsb, tilSsb) {
  const a = String(fraSsb).match(/^(\d{4})M(\d{2})$/);
  const b = String(tilSsb).match(/^(\d{4})M(\d{2})$/);
  if (!a || !b) return null;
  return (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
}
