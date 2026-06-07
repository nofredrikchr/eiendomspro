/**
 * KPI-regulering av husleie — husleieloven § 4-2
 *
 * Leien kan justeres i takt med konsumprisindeksen (KPI) én gang per år,
 * tidligst ett år etter forrige leiefastsettelse, med minst én måneds skriftlig varsel.
 *
 * Vi har ikke live SSB-data i denne versjonen, så utleier oppgir KPI-endringen
 * (hentes fra ssb.no/kpi). Typisk årsendring 2024–2025 ligger rundt 3–4 %.
 */

// ─── Neste tillatte reguleringsdato ──────────────────────────────────────────
export function nesteReguleringsdato(kontrakt) {
  const basis = kontrakt.sisteRegulering || kontrakt.startdato;
  if (!basis) return null;
  const d = new Date(basis);
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function kanReguleresNaa(kontrakt) {
  const neste = nesteReguleringsdato(kontrakt);
  if (!neste) return false;
  return new Date() >= neste;
}

export function dagerTilRegulering(kontrakt) {
  const neste = nesteReguleringsdato(kontrakt);
  if (!neste) return null;
  return Math.round((neste - new Date()) / 86400000);
}

// ─── Beregn ny leie ───────────────────────────────────────────────────────────
export function beregnNyLeie(gjeldendeLeie, kpiProsent) {
  const leie = Number(gjeldendeLeie) || 0;
  const ny = leie * (1 + (Number(kpiProsent) || 0) / 100);
  // Rund til nærmeste 10 kr (vanlig praksis)
  return Math.round(ny / 10) * 10;
}

export function nesteReguleringTekst(kontrakt) {
  const neste = nesteReguleringsdato(kontrakt);
  if (!neste) return null;
  return neste.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' });
}
