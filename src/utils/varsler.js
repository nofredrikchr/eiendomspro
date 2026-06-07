/**
 * Varselsenter — samler alle ting som krever oppfølging på tvers av appen.
 * Returnerer en flat, sortert liste med varsler.
 *
 * Typer:
 *  - kontrakt_utlop    : tidsbestemt kontrakt utløper innen 90 dager
 *  - kpi_regulering    : leien kan KPI-reguleres (forfalt eller innen 30 dager)
 *  - forfalt_betaling  : ubetalt faktura forbi forfall
 *  - ledig_enhet       : leieobjekt uten aktiv kontrakt
 *  - ulest_melding     : ulest melding fra leietaker
 */

import { kanReguleresNaa, dagerTilRegulering } from './kpi';
import { alleFakturaerForKontrakt } from './faktura';

function dagerTil(dato) {
  return Math.round((new Date(dato) - new Date()) / 86400000);
}

export function byggVarsler({ kontrakter = [], leieobjekter = [], bygg = [], meldinger = [], utlegg = [] }) {
  const varsler = [];

  const adresseForKontrakt = (k) => {
    const obj = leieobjekter.find((l) => l.id === k.leieobjektId);
    const b = obj ? bygg.find((bb) => bb.id === obj.byggId) : null;
    return b ? `${b.gatenavn} ${b.gatenummer}${obj?.betegnelse ? ' · ' + obj.betegnelse : ''}` : '';
  };

  kontrakter.forEach((k) => {
    const aktiv = k.kontraktstype === 'tidsubestemt' || !k.sluttdato || new Date(k.sluttdato) >= new Date();

    // Kontraktsutløp
    if (k.sluttdato && k.kontraktstype !== 'tidsubestemt') {
      const d = dagerTil(k.sluttdato);
      if (d >= 0 && d <= 90) {
        varsler.push({
          id: `utlop_${k.id}`,
          type: 'kontrakt_utlop',
          alvor: d < 30 ? 'hoy' : 'middels',
          tittel: `Kontrakt utløper om ${d} dager`,
          detalj: `${k.leietakerNavn} · ${adresseForKontrakt(k)}`,
          lenke: `/kontrakter/${k.id}`,
          dato: k.sluttdato,
        });
      }
    }

    // KPI-regulering
    if (aktiv && k.indeksregulering) {
      const dKpi = dagerTilRegulering(k);
      if (dKpi !== null && dKpi <= 30) {
        varsler.push({
          id: `kpi_${k.id}`,
          type: 'kpi_regulering',
          alvor: kanReguleresNaa(k) ? 'middels' : 'lav',
          tittel: kanReguleresNaa(k) ? 'Leien kan KPI-reguleres nå' : `Leien kan KPI-reguleres om ${dKpi} dager`,
          detalj: `${k.leietakerNavn} · ${adresseForKontrakt(k)}`,
          lenke: `/kontrakter/${k.id}`,
        });
      }
    }

    // Forfalte betalinger
    if (aktiv) {
      const forfalte = alleFakturaerForKontrakt(k, utlegg)
        .filter((f) => f.status !== 'betalt' && new Date(f.forfall) < new Date());
      if (forfalte.length > 0) {
        varsler.push({
          id: `forfalt_${k.id}`,
          type: 'forfalt_betaling',
          alvor: 'hoy',
          tittel: `${forfalte.length} forfalt${forfalte.length > 1 ? 'e' : ''} betaling${forfalte.length > 1 ? 'er' : ''}`,
          detalj: `${k.leietakerNavn} · ${adresseForKontrakt(k)}`,
          lenke: `/kontrakter/${k.id}`,
        });
      }
    }
  });

  // Uleste meldinger (gruppert per kontrakt)
  const ulestePerKontrakt = {};
  meldinger.filter((m) => !m.lest && m.avsender === 'leietaker').forEach((m) => {
    ulestePerKontrakt[m.kontraktId] = (ulestePerKontrakt[m.kontraktId] || 0) + 1;
  });
  Object.entries(ulestePerKontrakt).forEach(([kontraktId, antall]) => {
    const k = kontrakter.find((kk) => kk.id === kontraktId);
    if (!k) return;
    varsler.push({
      id: `melding_${kontraktId}`,
      type: 'ulest_melding',
      alvor: 'middels',
      tittel: `${antall} ulest${antall > 1 ? 'e' : ''} melding${antall > 1 ? 'er' : ''}`,
      detalj: `${k.leietakerNavn} · ${adresseForKontrakt(k)}`,
      lenke: `/meldinger/${kontraktId}`,
    });
  });

  // Ledige enheter
  leieobjekter.filter((l) => l.status === 'ledig').forEach((l) => {
    const b = bygg.find((bb) => bb.id === l.byggId);
    varsler.push({
      id: `ledig_${l.id}`,
      type: 'ledig_enhet',
      alvor: 'middels',
      tittel: `Ledig enhet: ${l.betegnelse || l.type || 'Ukjent'}`,
      detalj: b ? `${b.gatenavn} ${b.gatenummer}` : 'Ukjent bygg',
      lenke: `/leieobjekter/${l.id}`,
    });
  });

  // Sorter: høy → middels → lav
  const rang = { hoy: 0, middels: 1, lav: 2 };
  return varsler.sort((a, b) => rang[a.alvor] - rang[b.alvor]);
}

export function antallVarsler(data) {
  return byggVarsler(data).length;
}
