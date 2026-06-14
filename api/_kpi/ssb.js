/**
 * Server-side henting av KPI fra SSB (tabell 03013, json-stat2). Samme kilde som
 * klientens src/services/ssbKpi.js, men uten sessionStorage — egnet for cron.
 * Node 22 har global fetch. KPI-regulering: husleieloven § 4-2.
 */
const TABELL = 'https://data.ssb.no/api/v0/no/table/03013/';

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

export function tilSsbMaaned(input) {
  if (!input) return null;
  if (input instanceof Date) return `${input.getFullYear()}M${String(input.getMonth() + 1).padStart(2, '0')}`;
  const m = String(input).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}M${m[2]}` : null;
}

export function ssbMaanedTilTekst(ssb) {
  const m = String(ssb).match(/^(\d{4})M(\d{2})$/);
  if (!m) return ssb;
  const mnd = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
  return `${mnd[Number(m[2]) - 1]} ${m[1]}`;
}

export function indeksFor(serie, ssbMaaned) {
  if (serie[ssbMaaned] != null) return serie[ssbMaaned];
  const keys = Object.keys(serie).sort();
  let treff = null;
  for (const k of keys) { if (k <= ssbMaaned) treff = k; else break; }
  return treff ? serie[treff] : null;
}

let _cache = null;
let _cacheTid = 0;

/** Hent KPI-serien (måned → indeks). In-memory cache i 12 t (per lambda-instans). */
export async function hentKpiSerie(antallMnd = 200) {
  if (_cache && Date.now() - _cacheTid < 12 * 3600 * 1000) return _cache;
  const res = await fetch(TABELL, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: byggQuery(antallMnd),
  });
  if (!res.ok) throw new Error(`SSB svarte ${res.status}`);
  const d = await res.json();
  const indexMap = d.dimension?.Tid?.category?.index || {};
  const verdier = d.value || [];
  const serie = {};
  Object.keys(indexMap).forEach((t) => { const v = verdier[indexMap[t]]; if (v != null) serie[t] = v; });
  const gyldige = Object.keys(serie).sort();
  const sisteMaaned = gyldige[gyldige.length - 1];
  _cache = { serie, sisteMaaned, sisteVerdi: serie[sisteMaaned] };
  _cacheTid = Date.now();
  return _cache;
}
