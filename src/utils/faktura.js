import { genererKID } from './kid';

/**
 * Delt faktura-logikk — brukes av både utleiers leieforhold-side og
 * leietakerportalen, slik at begge alltid viser samme tall.
 */

// ─── Generer husleie-fakturaer fra kontrakten ────────────────────────────────
export function genererHusleiFakturaer(kontrakt) {
  if (!kontrakt?.startdato || !kontrakt?.maanedligLeie) return [];

  const start = new Date(kontrakt.startdato);
  const slutt = kontrakt.sluttdato ? new Date(kontrakt.sluttdato) : null;
  const iDag = new Date();
  const betalingsdag = Number(kontrakt.betalingsdato) || 1;
  const sluttGrense = Math.min(
    slutt ? slutt.getTime() : Infinity,
    iDag.getTime() + 31 * 86400000, // én måned frem i tid
  );

  const fakturaer = [];
  let dato = new Date(start.getFullYear(), start.getMonth(), betalingsdag);
  let seq = 1;

  while (dato.getTime() <= sluttGrense) {
    if (dato >= start) {
      const maaned = dato.toISOString().slice(0, 7);
      fakturaer.push({
        id: `husleie_${kontrakt.id}_${maaned}`,
        type: 'husleie',
        forfall: dato.toISOString().slice(0, 10),
        beskrivelse: `Husleie ${dato.toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' })}`,
        belop: Number(kontrakt.maanedligLeie),
        status: dato < iDag ? 'betalt' : 'ubetalt',
        kid: genererKID(kontrakt.id, seq),
        kategori: '',
      });
      seq++;
    }
    dato = new Date(dato.getFullYear(), dato.getMonth() + 1, betalingsdag);
    if (fakturaer.length > 36) break; // sikkerhetsbrems (3 år)
  }

  return fakturaer.reverse(); // nyeste først
}

// ─── Slå sammen husleie + utlegg, sortert nyeste først ───────────────────────
export function alleFakturaerForKontrakt(kontrakt, utleggListe = []) {
  const husleie = genererHusleiFakturaer(kontrakt);
  const utlegg = utleggListe
    .filter((u) => u.kontraktId === kontrakt.id)
    .map((u) => ({
      id: u.id,
      type: 'utlegg',
      forfall: u.forfallsdato,
      beskrivelse: u.beskrivelse,
      belop: Number(u.belop) || 0,
      status: u.status || 'ubetalt',
      kid: genererKID(kontrakt.id, 900 + (utleggListe.indexOf(u) || 0)),
      kategori: u.kategori || '',
    }));

  return [...husleie, ...utlegg].sort((a, b) => new Date(b.forfall) - new Date(a.forfall));
}

// ─── Neste ubetalte faktura (den som forfaller først) ────────────────────────
export function nesteForfall(kontrakt, utleggListe = []) {
  const ubetalte = alleFakturaerForKontrakt(kontrakt, utleggListe)
    .filter((f) => f.status !== 'betalt')
    .sort((a, b) => new Date(a.forfall) - new Date(b.forfall));
  return ubetalte[0] || null;
}

// ─── Summer ──────────────────────────────────────────────────────────────────
export function fakturaSummer(fakturaer) {
  const totalt = fakturaer.reduce((s, f) => s + f.belop, 0);
  const ubetalt = fakturaer
    .filter((f) => f.status !== 'betalt')
    .reduce((s, f) => s + f.belop, 0);
  return { totalt, ubetalt };
}
