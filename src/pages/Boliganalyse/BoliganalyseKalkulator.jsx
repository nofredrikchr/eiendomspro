import { useState, useMemo } from 'react';
import {
  Home, TrendingUp, Calculator, FileText, ChevronDown, ChevronUp,
  Copy, Check, BarChart3, AlertTriangle, Info, ArrowRight, Sparkles,
  Trash2, FolderOpen, Clock
} from 'lucide-react';

// ─── Lagrede rapporter (localStorage) ────────────────────────────────────────
const STORAGE_KEY = 'eiendomspro_boliganalyser';

function lastRapporter() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function lagreRapporter(liste) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
}
function lagreNyRapport(inp, t) {
  const liste = lastRapporter();
  const stressKontantstrøm = t.nettoLeieÅr - (t.stressTermMnd || 0) * 12;
  const ny = {
    id: `ba_${Date.now()}`,
    lagretTidspunkt: new Date().toISOString(),
    inp,
    snapshot: {
      bruttoYield: t.bruttoYield,
      nettoYield: t.nettoYield,
      kontantstrømMnd: t.kontantstrømMnd,
      kontantstrømEtterSkattÅr: t.kontantstrømEtterSkattÅr,
      roe: t.roe,
      lånBeløp: t.lånBeløp,
      nettoLeieÅr: t.nettoLeieÅr,
      bruttoLeieÅr: t.bruttoLeieÅr,
      totaleKostÅr: t.totaleKostÅr,
      estimertSkattÅr: t.estimertSkattÅr,
      kjøpesum: t.kjøpesum,
      totalInvestering: t.totalInvestering,
      boligverdi: t.boligverdi,
      verdiskapt: t.verdiskapt,
      egenkapital: t.egenkapital,
      cashInvestert: t.cashInvestert,
      maxCashUt: t.maxCashUt,
      ltv: t.ltv,
      ekstraLånekapasitet: t.ekstraLånekapasitet,
      stressKontantstrømMnd: stressKontantstrøm / 12,
    },
  };
  lagreRapporter([ny, ...liste].slice(0, 20)); // maks 20 lagrede
  return ny.id;
}

// ─── AI-evaluering av sammenlignede boliger ───────────────────────────────────
function evaluerBoliger(valgte) {
  if (valgte.length < 2) return null;
  const navn = (r) => r.inp.adresse || 'Ukjent';
  const s = (r) => r.snapshot;

  // Poengsystem: vekt nøkkeltall
  const score = valgte.map((r) => {
    const sn = s(r);
    let p = 0;
    p += (sn.nettoYield || 0) * 10;            // yield viktigst
    p += (sn.kontantstrømMnd || 0) / 100;       // kontantstrøm
    p += (sn.roe || 0) * 3;                      // avkastning på EK
    p += (sn.verdiskapt || 0) / 50000;          // verdiskaping ved oppussing
    p += (sn.stressKontantstrømMnd || 0) / 200; // robusthet
    p -= Math.max(0, (sn.ltv || 0) - 85) * 2;   // straff høy LTV
    return { r, p };
  }).sort((a, b) => b.p - a.p);

  const vinner = score[0].r;
  const taper = score[score.length - 1].r;

  // Finn beste på hvert nøkkeltall
  const bestPå = (felt, hoy = true) => {
    const sortert = [...valgte].sort((a, b) => hoy ? (s(b)[felt] - s(a)[felt]) : (s(a)[felt] - s(b)[felt]));
    return sortert[0];
  };
  const bestYield = bestPå('nettoYield');
  const bestKontant = bestPå('kontantstrømMnd');
  const bestVerdiskaping = bestPå('verdiskapt');
  const lavestLtv = bestPå('ltv', false);
  const bestStress = bestPå('stressKontantstrømMnd');

  const punkter = [];
  punkter.push(`${navn(bestYield)} har høyest netto yield (${pct(s(bestYield).nettoYield)}), som betyr best løpende avkastning på investert kapital.`);
  punkter.push(`${navn(bestKontant)} gir best månedlig kontantstrøm (${kr(s(bestKontant).kontantstrømMnd)}/mnd) — viktigst hvis du vil at boligen skal være selvfinansierende.`);
  if (s(bestVerdiskaping).verdiskapt > 0)
    punkter.push(`${navn(bestVerdiskaping)} har størst verdiskaping ved oppussing (${kr(s(bestVerdiskaping).verdiskapt)}) — best for en utvikle-og-refinansiere-strategi.`);
  punkter.push(`${navn(lavestLtv)} har lavest belåningsgrad (${pct(s(lavestLtv).ltv)}) og dermed lavest finansiell risiko.`);
  if (s(bestStress).stressKontantstrømMnd >= 0)
    punkter.push(`${navn(bestStress)} tåler en renteoppgang best — fortsatt positiv kontantstrøm i stresstest.`);

  // Anbefaling
  const v = s(vinner);
  let begrunnelse;
  if (v.kontantstrømMnd >= 0 && v.nettoYield >= 4) {
    begrunnelse = `sterk kombinasjon av god yield (${pct(v.nettoYield)}) og positiv kontantstrøm (${kr(v.kontantstrømMnd)}/mnd). Den står godt på egne ben økonomisk.`;
  } else if (v.verdiskapt > 0 && v.maxCashUt > 0) {
    begrunnelse = `best totaløkonomi når man tar med verdiskaping (${kr(v.verdiskapt)}) og muligheten til å hente ut kapital ved refinansiering (${kr(v.maxCashUt)}).`;
  } else {
    begrunnelse = `samlet sett best avkastning vektet på yield, kontantstrøm og avkastning på egenkapital.`;
  }

  return {
    vinner, taper, punkter,
    anbefaling: `Basert på tallene peker ${navn(vinner)} seg ut som det beste kjøpet. Den har ${begrunnelse}`,
    advarsel: v.stressKontantstrømMnd < 0
      ? `Merk: ${navn(vinner)} får negativ kontantstrøm ved en renteoppgang til stresstest-nivå. Sørg for likviditetsbuffer.`
      : null,
  };
}
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatKr } from '../../utils/format';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(n, decimals = 1) {
  return isFinite(n) ? `${n.toFixed(decimals)} %` : '–';
}
function kr(n) {
  if (!isFinite(n) || isNaN(n)) return '–';
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(n);
}
function num(n) {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n);
}
function parseNum(v) {
  const s = String(v).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// ─── Annuity calculator ───────────────────────────────────────────────────────
function månedligTermin(lån, renteÅr, lopetidÅr) {
  if (!lån || !renteÅr || !lopetidÅr) return 0;
  const r = renteÅr / 100 / 12;
  const n = lopetidÅr * 12;
  if (r === 0) return lån / n;
  return lån * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// ─── Core calculations ────────────────────────────────────────────────────────
function beregn(inp) {
  const kjøpesum = parseNum(inp.kjøpesum);
  const oppussing = parseNum(inp.oppussing);
  const oppussingVedlikehold = parseNum(inp.oppussingVedlikehold);
  const nyTakst = parseNum(inp.nyTakst);
  const rente = parseNum(inp.rentesats);
  const lopetid = parseNum(inp.nedbetalingstid) || 25;
  const leieinntekter = inp.leieinntekter || [{ id: 1, navn: '', belop: '' }];
  const totalLeieMnd = leieinntekter.reduce((s, l) => s + parseNum(l.belop), 0);
  const utleieandel = parseNum(inp.utleieandel) || 95;
  const bruttoInntekt = parseNum(inp.bruttoArsinntekt);
  const eksGjeld = parseNum(inp.eksisterendeGjeld);
  const erBorettslag = inp.boligtype === 'borettslag';

  // Omkostninger ved kjøp
  const dokAvgift = erBorettslag ? 0 : kjøpesum * 0.025;
  const tinglysing = erBorettslag ? 5995 + 440 : 440 + 440;
  const totaleOmkostninger = dokAvgift + tinglysing;

  // ── Prosjektkalkyle ──────────────────────────────────────────
  // Total cash som går ut: kjøpesum + oppussing + omkostninger
  const totalKostnad = kjøpesum + oppussing + totaleOmkostninger;

  // Boligverdi etter ferdigstillelse
  // Ny takst = markedsverdi etter oppussing (brukes av bank ved refinansiering)
  // Hvis ikke fylt inn: antar kjøpesum + oppussing som verdi
  const boligverdi = nyTakst > 0 ? nyTakst : kjøpesum + oppussing;

  // Verdi skapt = boligverdi − total kostnad (gevinst ved oppussingsprosjektet)
  const verdiskapt = boligverdi - totalKostnad;

  // ── Sluttlån (ønsket lån etter refinansiering) ───────────────
  // Eiendomsutviklere setter alltid sluttlånet — hva de vil sitte med etter alt er gjort
  // Sluttlånet kan overstige kjøpesum — det er normalt ved refinansiering mot ny takst
  const lånBeløp = inp.laanModus === 'kalkulert'
    ? parseNum(inp.laanebelop)
    : Math.max(0, totalKostnad - parseNum(inp.egenkapital || 0));

  // Cash du faktisk legger inn (kan bli negativt = du får cash ut ved refinansiering)
  const cashInvestert = totalKostnad - lånBeløp;

  // EK i boligen = boligverdi − sluttlån (din andel av verdien)
  const egenkapital = Math.max(0, boligverdi - lånBeløp);

  // LTV = sluttlån / boligverdi (bankens nøkkeltall)
  const ltv = boligverdi ? (lånBeløp / boligverdi) * 100 : 0;
  const ekProsent = boligverdi ? (egenkapital / boligverdi) * 100 : 0;

  // EK-krav ved kjøp = justerbar % av (kjøpesum + omkostninger)
  const ekKravPst = parseNum(inp.ekKravProsent) || 10;
  const ekKravMin = (kjøpesum + totaleOmkostninger) * (ekKravPst / 100);

  // ── Prosjektstartanalyse ─────────────────────────────────────────────────────
  // Maks LTV banken tillater = 100% − EK-krav%
  const maxLTV = (100 - ekKravPst) / 100;

  // Kjøpslån: maks du kan låne ved kjøp (før oppussing)
  const maxKjøpslån = kjøpesum * maxLTV;
  const minEKvedKjøp = kjøpesum + totaleOmkostninger - maxKjøpslån; // cash du MÅ ha

  // Minimum ny takst for at banken skal refinansiere til sluttlånet
  const minNyTakstSluttlån = maxLTV > 0 ? lånBeløp / maxLTV : 0;

  // Minimum ny takst for å hente tilbake ALL investert cash (break-even)
  // Ved break-even: sluttlån = totalKostnad → minTakst = totalKostnad / maxLTV
  const minNyTakstFullRefin = maxLTV > 0 ? totalKostnad / maxLTV : 0;

  // Takst-buffer: hvor mye over min-kravet er din ny takst?
  const takstBufferSluttlån = boligverdi - minNyTakstSluttlån;
  const takstBufferFullRefin = boligverdi - minNyTakstFullRefin;

  // Har du nok takst?
  const harNokTakstSluttlån = nyTakst > 0 && boligverdi >= minNyTakstSluttlån;
  const harNokTakstFullRefin = nyTakst > 0 && boligverdi >= minNyTakstFullRefin;

  // ── Pengestrøm — hva går inn og hva kan du hente ut ─────────────────────────
  // Total cash som gikk ut av lommen i prosjektet
  const totalCashInn = totalKostnad; // kjøpesum + oppussing + omk

  // Maks mulig sluttlån = ny takst × maxLTV
  const maxMuligSluttlån = boligverdi * maxLTV;

  // Hva sluttlånet dekker av totalKostnad
  const sluttlånDekkerKostnad = Math.min(lånBeløp, totalKostnad);
  const cashIkkeHentetUt = Math.max(0, totalKostnad - lånBeløp); // fortsatt i prosjektet

  // Med maks mulig sluttlån — hva kan du hente ut?
  const maxCashUt = maxMuligSluttlån - totalKostnad; // negativt = du må legge inn mer
  const ekstraMedMaksLån = maxMuligSluttlån - lånBeløp; // ekstra du KAN låne ut over ditt sluttlån

  // Alias for resten av koden
  const totalInvestering = totalKostnad;
  const startBoligverdi = boligverdi;
  const verdiøkningOppussing = verdiskapt;

  // Månedlig lånekostnad
  const termMnd = inp.laanModus === 'manuell'
    ? parseNum(inp.terminbelop)
    : månedligTermin(lånBeløp, rente, lopetid);
  const renterMnd = lånBeløp * (rente / 100 / 12);
  const avdragMnd = Math.max(0, termMnd - renterMnd);

  // Leieinntekt
  const bruttoLeieMnd = totalLeieMnd;
  const bruttoLeieÅr = totalLeieMnd * 12;
  const ledighetMnd = totalLeieMnd * (1 - utleieandel / 100);    // vakanse i kr/mnd
  const ledighetÅr = ledighetMnd * 12;
  const effektivLeieÅr = bruttoLeieÅr - ledighetÅr;

  // Driftskostnader
  const felleskostnaderMnd = parseNum(inp.felleskostnader);
  const felleskostnaderÅr = felleskostnaderMnd * 12;
  const husforsikringMnd = parseNum(inp.husforsikring);
  const husforsikringÅr = husforsikringMnd * 12;
  const kommunaleÅr = parseNum(inp.kommunaleAvgifter);           // per år
  const vedlikeholdPst = parseNum(inp.vedlikeholdProsent) || 3;
  const vedlikeholdMnd = totalLeieMnd * (vedlikeholdPst / 100); // % av brutto leie/mnd
  const vedlikeholdÅr = vedlikeholdMnd * 12;
  const tilleggskostnader = inp.tilleggskostnader || [];
  const tilleggÅr = tilleggskostnader.reduce((s, t) => s + parseNum(t.belop) * 12, 0);
  const totaleKostÅr = felleskostnaderÅr + husforsikringÅr + kommunaleÅr + vedlikeholdÅr + tilleggÅr;

  // Netto leieinntekt
  const nettoLeieÅr = effektivLeieÅr - totaleKostÅr;
  const nettoLeieMnd = nettoLeieÅr / 12;

  // Kontantstrøm
  const kontantstrømÅr = nettoLeieÅr - termMnd * 12;
  const kontantstrømMnd = kontantstrømÅr / 12;

  // Yield — basert på total investering (kjøpesum + oppussing + omkostninger)
  const yieldBase = totalInvestering || kjøpesum;
  const bruttoYield = yieldBase ? (bruttoLeieÅr / yieldBase) * 100 : 0;
  const nettoYield = yieldBase ? (nettoLeieÅr / yieldBase) * 100 : 0;

  // ROE (cash-on-cash)
  const roe = egenkapital ? (kontantstrømÅr / egenkapital) * 100 : 0;


  // 5x-regel og lånekapasitet
  // Banker aksepterer typisk 70% av leieinntekt
  const bankAkseptertLeieÅr = effektivLeieÅr * 0.70;
  const ekstraLånekapasitet = bankAkseptertLeieÅr * 5;
  const nødvendigBruttoInntekt = Math.max(0, (lånBeløp + eksGjeld - ekstraLånekapasitet) / 5);
  const maxGjeldMedLeie = (bruttoInntekt + bankAkseptertLeieÅr) * 5;
  const harNokLånekapasitet = bruttoInntekt ? (lånBeløp + eksGjeld) <= maxGjeldMedLeie : null;

  // Stresstest
  const stressRente = Math.max(7, rente + 3);
  const stressTermMnd = månedligTermin(lånBeløp, stressRente, lopetid);
  const stressKontantstrøm = nettoLeieÅr - stressTermMnd * 12;

  // Skatt: 22% av netto leieinntekt (effektiv leie − driftskostnader)
  const skattepliktigInntektÅr = Math.max(0, nettoLeieÅr);
  const estimertSkattÅr = skattepliktigInntektÅr * 0.22;
  const kontantstrømEtterSkattÅr = kontantstrømÅr - estimertSkattÅr;

  // 10-år prognose
  const prognose = [];
  let gjeldRest = lånBeløp;
  const r = rente / 100 / 12;
  const n = lopetid * 12;
  for (let år = 1; år <= 10; år++) {
    const eiendomsverdi = startBoligverdi * Math.pow(1.03, år);
    const leieinntektÅr = bruttoLeieÅr * Math.pow(1.025, år);
    // Beregn gjenstående gjeld etter år år
    gjeldRest = r > 0
      ? lånBeløp * (Math.pow(1 + r, n) - Math.pow(1 + r, år * 12)) / (Math.pow(1 + r, n) - 1)
      : Math.max(0, lånBeløp - avdragMnd * 12 * år);
    const ekVerdi = eiendomsverdi - gjeldRest;
    const nYield = totalKostnad ? (leieinntektÅr / totalKostnad) * 100 : 0;
    prognose.push({ år, eiendomsverdi, leieinntektÅr, gjeldRest, ekVerdi, nYield });
  }

  return {
    kjøpesum, oppussing, oppussingVedlikehold, nyTakst,
    boligverdi, startBoligverdi, verdiskapt, verdiøkningOppussing,
    totalKostnad, cashInvestert,
    egenkapital, lånBeløp, rente, lopetid,
    ltv, ekProsent, ekKravPst, ekKravMin,
    maxLTV, maxKjøpslån, minEKvedKjøp,
    minNyTakstSluttlån, minNyTakstFullRefin,
    takstBufferSluttlån, takstBufferFullRefin,
    harNokTakstSluttlån, harNokTakstFullRefin,
    totalCashInn, maxMuligSluttlån, sluttlånDekkerKostnad,
    cashIkkeHentetUt, maxCashUt, ekstraMedMaksLån,
    dokAvgift, tinglysing, totaleOmkostninger, totalInvestering,
    termMnd, renterMnd, avdragMnd, stressTermMnd, stressRente,
    bruttoLeieMnd, bruttoLeieÅr, effektivLeieÅr, ledighetMnd, ledighetÅr,
    felleskostnaderÅr, husforsikringÅr, kommunaleÅr, vedlikeholdÅr, vedlikeholdPst, vedlikeholdMnd, tilleggÅr,
    totaleKostÅr, nettoLeieÅr, nettoLeieMnd,
    kontantstrømMnd, kontantstrømÅr, kontantstrømEtterSkattÅr,
    bruttoYield, nettoYield, roe,
    bankAkseptertLeieÅr, ekstraLånekapasitet, nødvendigBruttoInntekt,
    maxGjeldMedLeie, harNokLånekapasitet, eksGjeld,
    skattepliktigInntektÅr, estimertSkattÅr,
    prognose,
  };
}

// ─── AI analyse generator ─────────────────────────────────────────────────────
function genererAnalyse(inp, t) {
  const adresse = inp.adresse || 'Eiendommen';
  const vurdering = t.nettoYield >= 4 ? 'god' : t.nettoYield >= 2.5 ? 'moderat' : 'svak';
  const kontantOk = t.kontantstrømMnd >= 0;
  const stressOk = t.stressKontantstrøm >= 0;

  return `INVESTERINGSANALYSE – ${adresse.toUpperCase()}
Analysert: ${new Date().toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' })}

──────────────────────────────────────────
SAMMENDRAG
──────────────────────────────────────────
${adresse} er en ${vurdering} investering basert på dagens tall. Eiendommen har en brutto yield på ${pct(t.bruttoYield)} og netto yield på ${pct(t.nettoYield)}. ${t.kontantstrømMnd >= 0 ? `Månedlig kontantstrøm er positiv på ${kr(t.kontantstrømMnd)}, noe som betyr at eiendommen er selvfinansierende fra dag én.` : `Månedlig kontantstrøm er negativ med ${kr(Math.abs(t.kontantstrømMnd))}, som betyr at du må dekke differansen fra lønn.`}

──────────────────────────────────────────
LØNNSOMHETSANALYSE
──────────────────────────────────────────
Med en kjøpesum på ${kr(t.kjøpesum)} og en månedlig leie på ${kr(t.bruttoLeieMnd)}, genererer eiendommen ${kr(t.bruttoLeieÅr)} i brutto leieinntekt per år. Etter driftskostnader på ${kr(t.totaleKostÅr)} og en tomgangsreserve (${100 - parseNum(inp.utleieandel || 95)} % av leietiden) sitter du igjen med ${kr(t.nettoLeieÅr)} i netto leieinntekt.

Etter betaling av renter og avdrag på lånet ditt på ${kr(t.lånBeløp)} (${pct(t.rente, 2)} rente, ${t.lopetid} år), er kontantstrømmen ${kr(t.kontantstrømÅr)} per år, tilsvarende ${kr(t.kontantstrømMnd)} per måned.

Din avkastning på investert egenkapital (ROE) er estimert til ${pct(t.roe)}.

──────────────────────────────────────────
BELÅNING OG LÅNEKAPASITET
──────────────────────────────────────────
Du har investert ${kr(t.egenkapital)} i egenkapital, som tilsvarer ${pct(t.ekProsent)} av total investering på ${kr(t.totalInvestering)}. Belåningsgraden (LTV) er ${pct(t.ltv)}.

Norske banker aksepterer typisk 70 % av dokumentert leieinntekt ved vurdering av lånekapasitet. Det betyr at denne eiendommens leieinntekt tilsvarer ${kr(t.bankAkseptertLeieÅr)} i bankmessig akseptert inntekt per år — og gir deg en ekstra lånekapasitet på ${kr(t.ekstraLånekapasitet)} (5 × akseptert leieinntekt) utover din ordinære jobbinntekt.

${t.nødvendigBruttoInntekt > 0 ? `For å tilfredsstille 5×-gjeldsgradsregelen (inkl. din eksisterende gjeld på ${kr(t.eksGjeld)}) trenger du en brutto årsinntekt fra jobb på minimum ${kr(t.nødvendigBruttoInntekt)}.` : `Leieinntekten alene er tilstrekkelig til å dekke gjeldsgradsregelen for dette lånet.`}

──────────────────────────────────────────
RISIKOVURDERING
──────────────────────────────────────────
Stresstesten (renteøkning til ${pct(t.stressRente, 1)}) viser at ${stressOk ? `eiendommen fortsatt gir positiv kontantstrøm på ${kr(t.stressKontantstrøm / 12)} per måned. Dette er et godt tegn på robusthet.` : `kontantstrømmen blir negativ med ${kr(Math.abs(t.stressKontantstrøm) / 12)} per måned. Du bør ha likviditetsreserve for å tåle en renteoppgang.`}

Leieinntekter er solide forutsatt at leietaker betaler til avtalt tid og at tomgang holdes lav. En tomgangsrate på ${100 - parseNum(inp.utleieandel || 95)} % er lagt til grunn — dette er et realistisk estimat for norske byer i 2025.

──────────────────────────────────────────
SKATT
──────────────────────────────────────────
Som utleier av sekundærbolig er all leieinntekt skattepliktig fra første krone (22 % flat sats). Etter fradrag for gjeldsrenter og driftskostnader er skattepliktig inntekt estimert til ${kr(t.skattepliktigInntektÅr)} per år, tilsvarende en estimert skatt på ${kr(t.estimertSkattÅr)}. Etter skatt er kontantstrømmen ${kr(t.kontantstrømEtterSkattÅr / 12)} per måned.

──────────────────────────────────────────
10-ÅRS PROGNOSE
──────────────────────────────────────────
Med en antatt eiendomsprisvekst på 3 % per år og KPI-regulering av leien på 2,5 % per år, vil eiendommens markedsverdi etter 10 år være ${kr(t.prognose[9]?.eiendomsverdi)} og din egenkapitalverdi vil være ${kr(t.prognose[9]?.ekVerdi)}.

──────────────────────────────────────────
KONKLUSJON
──────────────────────────────────────────
${t.nettoYield >= 4
    ? `Dette er en sterk investering med god yield og positiv kontantstrøm. Netto yield på ${pct(t.nettoYield)} overstiger typisk risikofri rente og gir solid realavkastning.`
    : t.nettoYield >= 2.5
      ? `Dette er en moderat investering som kan forsvares over tid gjennom kombinasjonen av leieinntekter og eiendomsprisvekst. Lønnsomheten er avhengig av at forutsetningene holder.`
      : `Yield-nivået er lavt i norsk sammenheng. Eiendommen kan likevel ha verdi som langsiktig kapitalplassering dersom man tror på prisvekst i dette segmentet.`
  }`;
}

// ─── Bankmelding generator ────────────────────────────────────────────────────
function genererBankmelding(inp, t) {
  const adresse = inp.adresse || '[Eiendomsadresse]';
  const dato = new Date().toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' });
  return `${dato}

Til: [Bankens navn]
Fra: [Ditt navn]
Emne: Finansieringsforespørsel – utleieeiendom ${adresse}

Jeg søker om finansiering for kjøp av utleieeiendom og ønsker med dette å gi en oversikt over investeringens lønnsomhet og min betalingsevne.

EIENDOM
Adresse: ${adresse}
Type: ${inp.boligtype === 'borettslag' ? 'Borettslag' : 'Selveier'}
Kjøpesum: ${kr(t.kjøpesum)}
Totale omkostninger: ${kr(t.totaleOmkostninger)}
Total investering: ${kr(t.totalInvestering)}

FINANSIERING
Egenkapital: ${kr(t.egenkapital)} (${pct(t.ekProsent)} av total investering)
Ønsket lån: ${kr(t.lånBeløp)}
Belåningsgrad (LTV): ${pct(t.ltv)}
Rente (lagt til grunn): ${pct(t.rente, 2)}
Løpetid: ${t.lopetid} år
Månedlig terminbeløp: ${kr(t.termMnd)}

LEIEINNTEKTER
Månedlig leie: ${kr(t.bruttoLeieMnd)}
Brutto leieinntekt per år: ${kr(t.bruttoLeieÅr)}
Netto leieinntekt per år (etter kostnader): ${kr(t.nettoLeieÅr)}
Bankmessig akseptert leieinntekt (70 %): ${kr(t.bankAkseptertLeieÅr)} per år

DRIFTSKOSTNADER
Totale driftskostnader: ${kr(t.totaleKostÅr)} per år

KONTANTSTRØM
Månedlig kontantstrøm (etter lånekostnad): ${kr(t.kontantstrømMnd)}
Årlig kontantstrøm: ${kr(t.kontantstrømÅr)}
Kontantstrøm etter skatt (est.): ${kr(t.kontantstrømEtterSkattÅr / 12)} per måned

NØKKELTALL
Brutto yield: ${pct(t.bruttoYield)}
Netto yield: ${pct(t.nettoYield)}
ROE (egenkapitalavkastning): ${pct(t.roe)}

STRESSTESTING
Testet ved rente ${pct(t.stressRente, 1)} (+ 3 pp): Månedlig terminbeløp ${kr(t.stressTermMnd)}
Kontantstrøm ved stressrente: ${kr(t.stressKontantstrøm / 12)} per måned

Jeg stiller gjerne til møte for ytterligere gjennomgang.

Med vennlig hilsen,
[Ditt navn]
[Mobilnummer]
[E-post]`;
}

// ─── UI Components ────────────────────────────────────────────────────────────
function SeksjonHeader({ nummer, tittel, icon: Icon, open, onClick, ferdig }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left cursor-pointer"
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors
        ${ferdig ? 'bg-[#15803D]/15 text-[#15803D]' : 'bg-[#E9E8E2] text-[#65696F]'}`}>
        {ferdig ? <Check size={13} /> : nummer}
      </div>
      <div className="flex items-center gap-2 flex-1">
        <Icon size={15} className={ferdig ? 'text-[#15803D]' : 'text-[#7A7D83]'} />
        <span className={`text-sm font-medium ${ferdig ? 'text-[#1A1B1E]' : 'text-[#4B4E54]'}`}>{tittel}</span>
      </div>
      {open ? <ChevronUp size={15} className="text-[#7A7D83] shrink-0" /> : <ChevronDown size={15} className="text-[#7A7D83] shrink-0" />}
    </button>
  );
}

function Seksjon({ nummer, tittel, icon, open, onToggle, ferdig, children }) {
  return (
    <div className="rounded-xl border border-[#E9E8E2] overflow-hidden">
      <div className={`px-5 py-4 ${open ? 'bg-[#FFFFFF]' : 'bg-[#F1F1ED] hover:bg-[#FFFFFF]'} transition-colors`}>
        <SeksjonHeader nummer={nummer} tittel={tittel} icon={icon} open={open} onClick={onToggle} ferdig={ferdig} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-4 bg-[#F1F1ED] border-t border-[#E9E8E2] space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function KPIKort({ label, value, sub, color = 'white', warn = false }) {
  return (
    <div className={`rounded-xl p-4 border ${warn ? 'border-[#DC2626]/20 bg-[#DC2626]/5' : 'border-[#E9E8E2] bg-[#FFFFFF]'}`}>
      <div className="text-xs text-[#7A7D83] mb-1">{label}</div>
      <div className={`text-xl font-bold num`} style={{ color, fontFamily: 'DM Mono, monospace' }}>{value}</div>
      {sub && <div className="text-xs text-[#7A7D83] mt-0.5">{sub}</div>}
    </div>
  );
}

function BudsjettRad({ label, verdi, indent = false, bold = false, positive = null, border = false }) {
  const farge = positive === true ? '#15803D' : positive === false ? '#DC2626' : '#2A2D33';
  return (
    <div className={`flex items-center justify-between py-2 ${border ? 'border-t border-[#E9E8E2] mt-1' : ''}`}>
      <span className={`text-sm ${indent ? 'pl-4 text-[#65696F]' : bold ? 'text-[#1A1B1E] font-medium' : 'text-[#4B4E54]'}`}>{label}</span>
      <span className={`text-sm num font-${bold ? 'semibold' : 'normal'}`} style={{ color: farge, fontFamily: 'DM Mono, monospace' }}>{verdi}</span>
    </div>
  );
}

function InfoBoks({ type = 'info', children }) {
  const styles = {
    info: 'bg-blue-500/5 border-blue-500/20 text-blue-300',
    warn: 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300',
    ok: 'bg-[#15803D]/5 border-[#15803D]/20 text-[#15803D]',
    error: 'bg-[#DC2626]/5 border-[#DC2626]/20 text-[#DC2626]',
  };
  const icons = { info: Info, warn: AlertTriangle, ok: Check, error: AlertTriangle };
  const Icon = icons[type];
  return (
    <div className={`flex gap-2.5 p-3 rounded-lg border text-xs leading-relaxed ${styles[type]}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ─── Rapport ──────────────────────────────────────────────────────────────────
function Rapport({ inp, t }) {
  const [kopiert, setKopiert] = useState('');
  const analysetekst = useMemo(() => genererAnalyse(inp, t), [inp, t]);
  const bankmelding = useMemo(() => genererBankmelding(inp, t), [inp, t]);

  function kopier(tekst, id) {
    navigator.clipboard.writeText(tekst).then(() => {
      setKopiert(id);
      setTimeout(() => setKopiert(''), 2500);
    });
  }

  if (!t.kjøpesum) {
    return (
      <div className="text-center py-20">
        <BarChart3 size={32} className="text-[#AEB0B4] mx-auto mb-3" />
        <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen data å vise ennå</div>
        <div className="text-xs text-[#7A7D83]">Fyll inn kjøpesum og leie i kalkulatoren for å generere rapport</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Nøkkeltall */}
      <div>
        <h2 className="text-sm font-semibold text-[#1A1B1E] mb-4">Nøkkeltall</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPIKort label="Brutto yield" value={pct(t.bruttoYield)} sub="Leieinntekt / kjøpesum" color={t.bruttoYield >= 5 ? '#15803D' : t.bruttoYield >= 3 ? '#4D7C0F' : '#DC2626'} />
          <KPIKort label="Netto yield" value={pct(t.nettoYield)} sub="Etter alle kostnader" color={t.nettoYield >= 3.5 ? '#15803D' : t.nettoYield >= 2 ? '#4D7C0F' : '#DC2626'} />
          <KPIKort label="Kontantstrøm" value={kr(t.kontantstrømMnd) + '/mnd'} sub="Etter lånekostnad" color={t.kontantstrømMnd >= 0 ? '#15803D' : '#DC2626'} warn={t.kontantstrømMnd < 0} />
          <KPIKort label="ROE" value={pct(t.roe)} sub="Avkastning på EK" color={t.roe >= 5 ? '#15803D' : t.roe >= 0 ? '#4D7C0F' : '#DC2626'} />
        </div>
      </div>

      {/* Månedlig budsjett */}
      <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5">
        <h2 className="text-sm font-semibold text-[#1A1B1E] mb-4">Månedlig budsjett</h2>
        <div className="divide-y divide-[#E9E8E2]">
          <div className="pb-2">
            <BudsjettRad label="Brutto leieinntekt" verdi={`+ ${kr(t.bruttoLeieMnd)}`} positive={true} bold />
            <BudsjettRad label={`Ledighetsvakanse (${100 - parseNum(inp.utleieandel || 95)} %)`} verdi={`− ${kr(t.ledighetMnd)}`} indent positive={false} />
          </div>
          <div className="py-2">
            <div className="text-xs text-[#7A7D83] mb-1 pt-1">Driftskostnader</div>
            {t.felleskostnaderÅr > 0 && <BudsjettRad label="Felleskostnader" verdi={`− ${kr(t.felleskostnaderÅr / 12)}`} indent positive={false} />}
            {t.husforsikringÅr > 0 && <BudsjettRad label="Husforsikring" verdi={`− ${kr(t.husforsikringÅr / 12)}`} indent positive={false} />}
            {t.kommunaleÅr > 0 && <BudsjettRad label="Kommunale avgifter" verdi={`− ${kr(t.kommunaleÅr / 12)}`} indent positive={false} />}
            <BudsjettRad label={`Avsatt vedlikehold (${t.vedlikeholdPst} % av leie)`} verdi={`− ${kr(t.vedlikeholdMnd)}`} indent positive={false} />
            {(inp.tilleggskostnader || []).filter(tk => tk.navn && parseNum(tk.belop) > 0).map((tk) => (
              <BudsjettRad key={tk.id} label={tk.navn} verdi={`− ${kr(parseNum(tk.belop))}`} indent positive={false} />
            ))}
            <BudsjettRad label="Sum driftskostnader" verdi={`− ${kr(t.totaleKostÅr / 12)}`} bold />
          </div>
          <div className="py-2">
            <BudsjettRad label="Netto leieinntekt" verdi={kr(t.nettoLeieMnd)} bold positive={t.nettoLeieMnd >= 0} />
          </div>
          <div className="py-2">
            <div className="text-xs text-[#7A7D83] mb-1 pt-1">Lånekostnader</div>
            <BudsjettRad label="Renter" verdi={`− ${kr(t.renterMnd)}`} indent positive={false} />
            <BudsjettRad label="Avdrag" verdi={`− ${kr(t.avdragMnd)}`} indent positive={false} />
            <BudsjettRad label="Totalt terminbeløp" verdi={`− ${kr(t.termMnd)}`} bold />
          </div>
          <div className="pt-3">
            <BudsjettRad label="Kontantstrøm før skatt" verdi={kr(t.kontantstrømMnd)} bold positive={t.kontantstrømMnd >= 0} border />
            <BudsjettRad label={`Estimert skatt (22 %)`} verdi={`− ${kr(t.estimertSkattÅr / 12)}`} indent positive={false} />
            <BudsjettRad label="Kontantstrøm etter skatt" verdi={kr(t.kontantstrømEtterSkattÅr / 12)} bold positive={t.kontantstrømEtterSkattÅr >= 0} />
          </div>
        </div>
      </div>

      {/* Belåningsanalyse */}
      <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5">
        <h2 className="text-sm font-semibold text-[#1A1B1E] mb-4">Belåning og lånekapasitet</h2>
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="space-y-2 text-sm">
            <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider mb-2">Prosjektkalkyle</div>
            <div className="flex justify-between"><span className="text-[#65696F]">Kjøpesum</span><span className="text-[#1A1B1E] num">{kr(t.kjøpesum)}</span></div>
            {t.oppussing > 0 && <div className="flex justify-between"><span className="text-[#65696F]">+ Oppussing</span><span className="text-[#1A1B1E] num">{kr(t.oppussing)}</span></div>}
            <div className="flex justify-between"><span className="text-[#65696F]">+ Omkostninger</span><span className="text-[#1A1B1E] num">{kr(t.totaleOmkostninger)}</span></div>
            <div className="flex justify-between font-medium border-t border-[#E9E8E2] pt-2 mt-1"><span className="text-[#1A1B1E]">= Total kostnad</span><span className="text-[#1A1B1E] num">{kr(t.totalKostnad)}</span></div>
            <div className="flex justify-between"><span className="text-[#65696F]">− Sluttlån</span><span className="text-[#DC2626] num">− {kr(t.lånBeløp)}</span></div>
            <div className="flex justify-between font-medium border-t border-[#E9E8E2] pt-2 mt-1">
              <span style={{ color: t.cashInvestert >= 0 ? '#2A2D33' : '#15803D' }}>= Cash investert</span>
              <span className="num" style={{ color: t.cashInvestert >= 0 ? '#2A2D33' : '#15803D' }}>{t.cashInvestert >= 0 ? kr(t.cashInvestert) : `+ ${kr(Math.abs(t.cashInvestert))} ut`}</span>
            </div>
            <div className="border-t border-[#E9E8E2] pt-3 mt-2 space-y-2">
              <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider mb-2">Etter ferdigstillelse</div>
              <div className="flex justify-between"><span className="text-[#65696F]">Boligverdi ({inp.nyTakst ? 'ny takst' : 'kjøpesum + oppussing'})</span><span className="text-[#1A1B1E] num">{kr(t.boligverdi)}</span></div>
              <div className="flex justify-between"><span className="text-[#65696F]">− Sluttlån</span><span className="text-[#DC2626] num">− {kr(t.lånBeløp)}</span></div>
              <div className="flex justify-between font-medium"><span className="text-[#15803D]">= EK i boligen</span><span className="num text-[#15803D]">{kr(t.egenkapital)}</span></div>
              <div className="flex justify-between"><span className="text-[#65696F]">LTV</span><span className="num" style={{ color: t.ltv <= 90 ? '#15803D' : '#DC2626' }}>{pct(t.ltv)}</span></div>
              {t.nyTakst > 0 && <div className="flex justify-between font-medium border-t border-[#E9E8E2] pt-2"><span className="text-[#15803D]">Verdi skapt</span><span className="num text-[#15803D]">{kr(t.verdiskapt)}</span></div>}
              <div className="flex justify-between border-t border-[#E9E8E2] pt-2"><span className="text-[#65696F]">EK-krav ved kjøp ({t.ekKravPst} %)</span><span className="text-[#1A1B1E] num">{kr(t.ekKravMin)}</span></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider mb-2">5× gjeldsgradsregel</div>
            <div className="flex justify-between text-sm">
              <span className="text-[#65696F]">Leieinntekt (70 % bankvektet)</span>
              <span className="text-[#1A1B1E] num">{kr(t.bankAkseptertLeieÅr)}/år</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#65696F]">Ekstra lånekapasitet fra leie</span>
              <span className="num" style={{ color: '#15803D' }}>{kr(t.ekstraLånekapasitet)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-[#E9E8E2] pt-2">
              <span className="text-[#65696F]">Nødvendig bruttoinntekt (jobb)</span>
              <span className="text-[#1A1B1E] num font-semibold">{t.nødvendigBruttoInntekt > 0 ? kr(t.nødvendigBruttoInntekt) : '–'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#65696F]">Stresstest rente</span>
              <span className="text-[#1A1B1E] num">{pct(t.stressRente, 1)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[#65696F]">Terminbeløp ved stressrente</span>
              <span className="text-[#1A1B1E] num">{kr(t.stressTermMnd)}/mnd</span>
            </div>
          </div>
        </div>
        {t.lånBeløp > 0 && t.ltv > 90 && (
          <InfoBoks type="error">
            LTV på {pct(t.ltv)} overskrider bankens grense på 90 % av boligverdi ({kr(t.boligverdi)}). Reduser lånet med {kr(t.lånBeløp - t.boligverdi * 0.9)} eller øk boligverdien.
          </InfoBoks>
        )}
        {t.lånBeløp > 0 && t.ltv <= 90 && (
          <InfoBoks type="ok">
            LTV {pct(t.ltv)} — innenfor bankens krav på maks 90 % av boligverdi.
          </InfoBoks>
        )}
        {t.lånBeløp > t.kjøpesum && t.ltv <= 90 && (
          <InfoBoks type="info">
            Sluttlånet ({kr(t.lånBeløp)}) er høyere enn kjøpesummen ({kr(t.kjøpesum)}). Dette er normalt ved refinansiering — banken låner mot ny takst ({kr(t.boligverdi)}) og LTV er kun {pct(t.ltv)}.
          </InfoBoks>
        )}
        {t.nødvendigBruttoInntekt > 0 && (
          <div className="mt-3">
            <InfoBoks type="info">
              Med en eksisterende gjeld på {kr(t.eksGjeld)} og leieinntektens ekstra kapasitet på {kr(t.ekstraLånekapasitet)}, trenger du minimum {kr(t.nødvendigBruttoInntekt)} i brutto lønnsinntekt per år for å oppfylle 5×-regelen.
            </InfoBoks>
          </div>
        )}
      </div>

      {/* Prosjektstartanalyse */}
      {t.kjøpesum > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.03)' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <h2 className="text-sm font-semibold text-[#1A1B1E]">Prosjektstartanalyse</h2>
            <p className="text-xs text-[#65696F] mt-0.5">Hva du trenger for å gjennomføre dette prosjektet — fra kjøp til refinansiering</p>
          </div>

          <div className="p-5 space-y-6">

            {/* Steg 1 — Startkapital */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-[#9A7A24]/15 text-[#9A7A24] text-xs font-bold flex items-center justify-center">1</div>
                <span className="text-sm font-medium text-[#1A1B1E]">Hva du må ha for å starte</span>
              </div>
              <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#65696F]">Kjøpesum</span><span className="num text-[#1A1B1E]">{kr(t.kjøpesum)}</span></div>
                <div className="flex justify-between"><span className="text-[#65696F]">+ Omkostninger (dok.avg. + tinglysing)</span><span className="num text-[#1A1B1E]">{kr(t.totaleOmkostninger)}</span></div>
                <div className="flex justify-between border-t border-[#E9E8E2] pt-2"><span className="text-[#65696F]">= Kjøpskostnad</span><span className="num text-[#1A1B1E]">{kr(t.kjøpesum + t.totaleOmkostninger)}</span></div>
                <div className="flex justify-between"><span className="text-[#65696F]">Maks kjøpslån ({100 - t.ekKravPst} % av kjøpesum)</span><span className="num text-[#DC2626]">− {kr(t.maxKjøpslån)}</span></div>
                <div className="flex justify-between font-semibold border-t border-[#E9E8E2] pt-2">
                  <span className="text-[#9A7A24]">= Min. egenkapital du MÅ ha</span>
                  <span className="num text-[#9A7A24]">{kr(t.minEKvedKjøp)}</span>
                </div>
                <p className="text-xs text-[#7A7D83] pt-1 leading-relaxed">
                  Du trenger minimum {kr(t.minEKvedKjøp)} i egenkapital for å kjøpe eiendommen. Oppussingsbudsjettet på {kr(t.oppussing)} finansieres separat via byggelån eller egne midler underveis.
                </p>
              </div>
            </div>

            {/* Steg 2 — Krav til ny takst */}
            {t.lånBeløp > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#9A7A24]/15 text-[#9A7A24] text-xs font-bold flex items-center justify-center">2</div>
                  <span className="text-sm font-medium text-[#1A1B1E]">Krav til ny takst for refinansiering</span>
                </div>
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-4 space-y-3 text-sm">

                  {/* For sluttlånet */}
                  <div className="space-y-2">
                    <div className="text-xs text-[#7A7D83] uppercase tracking-wider">For å refinansiere til sluttlånet ({kr(t.lånBeløp)})</div>
                    <div className="flex justify-between">
                      <span className="text-[#65696F]">Min. ny takst ({100 - t.ekKravPst} % LTV-krav)</span>
                      <span className="num text-[#1A1B1E]">{kr(t.minNyTakstSluttlån)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#65696F]">Din ny takst</span>
                      <span className="num" style={{ color: t.harNokTakstSluttlån ? '#15803D' : t.nyTakst > 0 ? '#DC2626' : '#7A7D83' }}>
                        {t.nyTakst > 0 ? kr(t.boligverdi) : '– (ikke fylt inn)'}
                      </span>
                    </div>
                    {t.nyTakst > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[#7A7D83]">Buffer over minstekrav</span>
                        <span className="num" style={{ color: t.takstBufferSluttlån >= 0 ? '#15803D' : '#DC2626' }}>{kr(t.takstBufferSluttlån)}</span>
                      </div>
                    )}
                    {t.nyTakst > 0 && !t.harNokTakstSluttlån && (
                      <p className="text-xs text-[#DC2626] leading-relaxed">Ny takst er for lav. Du mangler {kr(t.minNyTakstSluttlån - t.boligverdi)} i verdi for å refinansiere til sluttlånet innenfor {t.ekKravPst} % EK-krav.</p>
                    )}
                    {t.nyTakst > 0 && t.harNokTakstSluttlån && (
                      <p className="text-xs text-[#15803D] leading-relaxed">✓ Ny takst er høy nok. Banken vil refinansiere til sluttlånet innenfor {t.ekKravPst} % EK-krav.</p>
                    )}
                  </div>

                  {/* For full refinansiering */}
                  <div className="border-t border-[#E9E8E2] pt-3 space-y-2">
                    <div className="text-xs text-[#7A7D83] uppercase tracking-wider">For å hente tilbake ALL investert cash</div>
                    <div className="flex justify-between">
                      <span className="text-[#65696F]">Total kostnad ÷ {100 - t.ekKravPst} %</span>
                      <span className="num text-[#1A1B1E]">{kr(t.minNyTakstFullRefin)}</span>
                    </div>
                    {t.nyTakst > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#65696F]">Din ny takst</span>
                          <span className="num" style={{ color: t.harNokTakstFullRefin ? '#15803D' : '#DC2626' }}>{kr(t.boligverdi)}</span>
                        </div>
                        {t.harNokTakstFullRefin
                          ? <p className="text-xs text-[#15803D] leading-relaxed">✓ Du henter ut {kr(Math.abs(t.cashInvestert))} mer enn du la inn — full refinansiering er mulig.</p>
                          : <p className="text-xs text-[#65696F] leading-relaxed">Ny takst er ikke høy nok til full refinansiering. Du sitter igjen med {kr(t.cashInvestert)} investert.</p>
                        }
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Steg 3 — Pengestrøm og uttak */}
            {t.nyTakst > 0 && t.lånBeløp > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-[#9A7A24]/15 text-[#9A7A24] text-xs font-bold flex items-center justify-center">3</div>
                  <span className="text-sm font-medium text-[#1A1B1E]">Pengestrøm — hva går inn og hva kan du hente ut</span>
                </div>

                {/* Cash inn */}
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl overflow-hidden mb-3">
                  <div className="px-4 py-2.5 border-b border-[#E9E8E2]">
                    <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Cash inn — hva du legger inn</span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#65696F]">Egenkapital ved kjøp (min. {t.ekKravPst} %)</span><span className="num text-[#1A1B1E]">{kr(t.minEKvedKjøp)}</span></div>
                    {t.oppussing > 0 && <div className="flex justify-between"><span className="text-[#65696F]">Oppussing (eget eller byggelån)</span><span className="num text-[#1A1B1E]">{kr(t.oppussing)}</span></div>}
                    <div className="flex justify-between text-xs text-[#7A7D83]"><span>Omkostninger (dok.avg. + tinglysing)</span><span className="num">{kr(t.totaleOmkostninger)}</span></div>
                    <div className="flex justify-between font-semibold border-t border-[#E9E8E2] pt-2 text-[#1A1B1E]">
                      <span>Total cash lagt inn</span>
                      <span className="num">{kr(t.totalCashInn)}</span>
                    </div>
                  </div>
                </div>

                {/* Ditt sluttlån */}
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl overflow-hidden mb-3">
                  <div className="px-4 py-2.5 border-b border-[#E9E8E2]">
                    <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Ditt sluttlån ({pct(t.ltv)} LTV)</span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#65696F]">Total cash lagt inn</span><span className="num text-[#1A1B1E]">{kr(t.totalCashInn)}</span></div>
                    <div className="flex justify-between"><span className="text-[#65696F]">− Sluttlån dekker</span><span className="num text-[#15803D]">− {kr(t.sluttlånDekkerKostnad)}</span></div>
                    <div className="flex justify-between font-semibold border-t border-[#E9E8E2] pt-2" style={{ color: t.cashInvestert <= 0 ? '#15803D' : '#2A2D33' }}>
                      <span>{t.cashInvestert <= 0 ? '= Cash ut (over investert beløp)' : '= Cash fortsatt investert'}</span>
                      <span className="num">{t.cashInvestert <= 0 ? `+ ${kr(Math.abs(t.cashInvestert))}` : kr(t.cashInvestert)}</span>
                    </div>
                    {t.cashInvestert > 0 && (
                      <p className="text-xs text-[#65696F] leading-relaxed">Sluttlånet dekker ikke hele investeringen. Du har fortsatt {kr(t.cashInvestert)} stående i prosjektet.</p>
                    )}
                    {t.cashInvestert <= 0 && (
                      <p className="text-xs text-[#15803D] leading-relaxed">✓ Sluttlånet dekker hele investeringen. Du henter ut {kr(Math.abs(t.cashInvestert))} mer enn du la inn.</p>
                    )}
                  </div>
                </div>

                {/* Maks mulig uttak */}
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)' }}>
                  <div className="px-4 py-2.5 border-b" style={{ borderColor: 'rgba(74,222,128,0.15)' }}>
                    <span className="text-xs font-medium text-[#15803D] uppercase tracking-wider">Maks mulig uttak ({pct(t.ekKravPst * 10 / 10, 0)} % EK-krav)</span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-[#65696F]">Ny takst</span><span className="num text-[#1A1B1E]">{kr(t.boligverdi)}</span></div>
                    <div className="flex justify-between"><span className="text-[#65696F]">× Maks LTV ({100 - t.ekKravPst} %)</span><span className="num text-[#1A1B1E]">{kr(t.maxMuligSluttlån)}</span></div>
                    <div className="flex justify-between"><span className="text-[#65696F]">− Total cash lagt inn</span><span className="num text-[#1A1B1E]">− {kr(t.totalCashInn)}</span></div>
                    <div className="flex justify-between font-semibold border-t pt-2" style={{ borderColor: 'rgba(74,222,128,0.2)', color: t.maxCashUt >= 0 ? '#15803D' : '#DC2626' }}>
                      <span>{t.maxCashUt >= 0 ? '= Maks cash du kan hente ut' : '= Du mangler i takst for full refin.'}</span>
                      <span className="num">{t.maxCashUt >= 0 ? `+ ${kr(t.maxCashUt)}` : `− ${kr(Math.abs(t.maxCashUt))}`}</span>
                    </div>
                    {t.ekstraMedMaksLån > 0 && (
                      <div className="flex justify-between text-xs text-[#7A7D83] pt-1">
                        <span>Ekstra du KAN låne utover ditt sluttlån</span>
                        <span className="num text-[#15803D]">+ {kr(t.ekstraMedMaksLån)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Konklusjonstall */}
                <div className="mt-3 bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-4">
                  <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider mb-3">Fasit</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Du la inn totalt', val: kr(t.totalCashInn), color: '#2A2D33' },
                      { label: 'Cash ut ved ditt sluttlån', val: t.cashInvestert <= 0 ? `+ ${kr(Math.abs(t.cashInvestert))}` : `− ${kr(t.cashInvestert)}`, color: t.cashInvestert <= 0 ? '#15803D' : '#DC2626' },
                      { label: 'Maks cash ut (ved maks lån)', val: t.maxCashUt >= 0 ? `+ ${kr(t.maxCashUt)}` : `− ${kr(Math.abs(t.maxCashUt))}`, color: t.maxCashUt >= 0 ? '#15803D' : '#DC2626' },
                      { label: 'EK i boligen', val: kr(t.egenkapital), color: '#15803D' },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-lg p-3">
                        <div className="text-xs text-[#7A7D83] mb-1">{label}</div>
                        <div className="text-sm font-semibold num" style={{ color, fontFamily: 'DM Mono, monospace' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 10-år prognose */}
      <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5">
        <h2 className="text-sm font-semibold text-[#1A1B1E] mb-1">10-år prognose</h2>
        <p className="text-xs text-[#7A7D83] mb-4">Eiendomsprisvekst 3 %/år · KPI-regulering av leie 2,5 %/år</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#7A7D83] border-b border-[#E9E8E2]">
                {['År', 'Eiendomsverdi', 'Leieinntekt', 'Gjeld', 'Egenkapital', 'Yield'].map(h => (
                  <th key={h} className="text-left py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.prognose.map((r) => (
                <tr key={r.år} className="border-b border-[#E9E8E2]/50 hover:bg-black/[0.02] transition-colors">
                  <td className="py-2 pr-4 text-[#65696F]">{r.år}</td>
                  <td className="py-2 pr-4 text-[#1A1B1E] num">{kr(r.eiendomsverdi)}</td>
                  <td className="py-2 pr-4 num" style={{ color: '#15803D' }}>{kr(r.leieinntektÅr)}</td>
                  <td className="py-2 pr-4 text-[#DC2626] num">{kr(r.gjeldRest)}</td>
                  <td className="py-2 pr-4 text-[#1A1B1E] num font-medium">{kr(r.ekVerdi)}</td>
                  <td className="py-2 pr-4 text-[#4B4E54] num">{pct(r.nYield)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Analyse */}
      <div className="rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9E8E2]">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[#9A7A24]" />
            <h2 className="text-sm font-semibold text-[#1A1B1E]">AI-analyse</h2>
          </div>
          <button
            onClick={() => kopier(analysetekst, 'analyse')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] transition-all cursor-pointer"
          >
            {kopiert === 'analyse' ? <><Check size={12} className="text-[#15803D]" /> Kopiert</> : <><Copy size={12} /> Kopier</>}
          </button>
        </div>
        <pre className="px-5 py-4 text-xs text-[#4B4E54] leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {analysetekst}
        </pre>
      </div>

      {/* Bankmelding */}
      <div className="rounded-xl border border-[#9A7A24]/20 bg-[#FFFFFF] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#9A7A24]/20" style={{ background: 'rgba(201,168,76,0.05)' }}>
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[#9A7A24]" />
            <h2 className="text-sm font-semibold text-[#1A1B1E]">Bankmelding</h2>
            <span className="text-xs text-[#65696F]">— klar til å sende til din bank</span>
          </div>
          <button
            onClick={() => kopier(bankmelding, 'bank')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:bg-black/[0.045] transition-all cursor-pointer"
            style={{ color: kopiert === 'bank' ? '#15803D' : '#9A7A24' }}
          >
            {kopiert === 'bank' ? <><Check size={12} /> Kopiert!</> : <><Copy size={12} /> Kopier melding</>}
          </button>
        </div>
        <pre className="px-5 py-4 text-xs text-[#4B4E54] leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {bankmelding}
        </pre>
      </div>

    </div>
  );
}

// ─── Sammenligningsvisning med AI-evaluering ──────────────────────────────────
const SAMMENLIGN_RADER = [
  { label: 'Kjøpesum', felt: 'kjøpesum', fmt: kr },
  { label: 'Total investering', felt: 'totalInvestering', fmt: kr },
  { label: 'Boligverdi (ny takst)', felt: 'boligverdi', fmt: kr },
  { label: 'Verdiskaping', felt: 'verdiskapt', fmt: kr, hoyBest: true },
  { label: 'Brutto yield', felt: 'bruttoYield', fmt: (v) => pct(v), hoyBest: true },
  { label: 'Netto yield', felt: 'nettoYield', fmt: (v) => pct(v), hoyBest: true },
  { label: 'Kontantstrøm/mnd', felt: 'kontantstrømMnd', fmt: kr, hoyBest: true },
  { label: 'Kontantstrøm v/stress', felt: 'stressKontantstrømMnd', fmt: kr, hoyBest: true },
  { label: 'ROE', felt: 'roe', fmt: (v) => pct(v), hoyBest: true },
  { label: 'Egenkapital i bolig', felt: 'egenkapital', fmt: kr, hoyBest: true },
  { label: 'LTV', felt: 'ltv', fmt: (v) => pct(v), hoyBest: false },
  { label: 'Maks uttak v/refin.', felt: 'maxCashUt', fmt: kr, hoyBest: true },
];

function Sammenligning({ valgte, onLukk }) {
  const evaluering = useMemo(() => evaluerBoliger(valgte), [valgte]);
  const navn = (r) => r.inp.adresse || 'Ukjent';

  // Finn beste verdi per rad for utheving
  function besteId(felt, hoyBest) {
    if (hoyBest === undefined) return null;
    const sortert = [...valgte].sort((a, b) => hoyBest ? (b.snapshot[felt] - a.snapshot[felt]) : (a.snapshot[felt] - b.snapshot[felt]));
    return sortert[0]?.id;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#9A7A24]" />
          <h2 className="text-sm font-semibold text-[#1A1B1E]">Sammenligning av {valgte.length} boliger</h2>
        </div>
        <button onClick={onLukk} className="text-xs text-[#65696F] hover:text-[#1A1B1E] transition-colors cursor-pointer">← Tilbake til lagrede</button>
      </div>

      {/* AI-evaluering */}
      {evaluering && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'rgba(201,168,76,0.03)' }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: 'rgba(201,168,76,0.2)' }}>
            <Sparkles size={15} className="text-[#9A7A24]" />
            <span className="text-sm font-semibold text-[#1A1B1E]">AI-evaluering</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="rounded-lg bg-[#15803D]/8 border border-[#15803D]/25 p-4">
              <div className="text-xs font-medium text-[#15803D] uppercase tracking-wider mb-1">Anbefaling</div>
              <p className="text-sm text-[#1A1B1E] leading-relaxed">{evaluering.anbefaling}</p>
            </div>
            <div className="space-y-2">
              {evaluering.punkter.map((p, i) => (
                <div key={i} className="flex gap-2 text-sm text-[#4B4E54] leading-relaxed">
                  <span className="text-[#9A7A24] shrink-0 mt-0.5">•</span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
            {evaluering.advarsel && (
              <div className="flex gap-2 p-3 rounded-lg border border-[#B45309]/25 bg-[#B45309]/5 text-xs text-[#B45309] leading-relaxed">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>{evaluering.advarsel}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sammenligningstabell */}
      <div className="overflow-x-auto rounded-xl border border-[#E9E8E2]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F1F1ED] border-b border-[#E9E8E2]">
              <th className="px-4 py-3 text-left text-xs font-medium text-[#7A7D83] sticky left-0 bg-[#F1F1ED]">Nøkkeltall</th>
              {valgte.map((r) => (
                <th key={r.id} className="px-4 py-3 text-right text-xs font-medium text-[#1A1B1E] min-w-32">{navn(r)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMMENLIGN_RADER.map((rad) => {
              const best = besteId(rad.felt, rad.hoyBest);
              return (
                <tr key={rad.felt} className="border-b border-[#E9E8E2]/50">
                  <td className="px-4 py-2.5 text-[#65696F] sticky left-0 bg-[#F6F6F4]">{rad.label}</td>
                  {valgte.map((r) => {
                    const v = r.snapshot[rad.felt];
                    const erBest = best === r.id && rad.hoyBest !== undefined && valgte.length > 1;
                    return (
                      <td key={r.id} className="px-4 py-2.5 text-right num"
                        style={{ fontFamily: 'DM Mono, monospace', color: erBest ? '#15803D' : '#2A2D33', fontWeight: erBest ? 600 : 400 }}>
                        {rad.fmt(v ?? 0)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2.5 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 leading-relaxed">
        <Info size={13} className="shrink-0 mt-0.5" />
        <span><span className="text-[#15803D]">Grønn</span> = beste verdi per nøkkeltall. AI-evalueringen vekter yield, kontantstrøm, avkastning på egenkapital, verdiskaping og robusthet mot renteoppgang.</span>
      </div>
    </div>
  );
}

// ─── Lagrede rapporter-oversikt ───────────────────────────────────────────────
function LagredeRapporter({ onLastInn }) {
  const [rapporter, setRapporter] = useState(() => lastRapporter());
  const [valgt, setValgt] = useState([]); // ids
  const [visSammenligning, setVisSammenligning] = useState(false);

  function slett(id) {
    const oppdatert = rapporter.filter((r) => r.id !== id);
    lagreRapporter(oppdatert);
    setRapporter(oppdatert);
    setValgt((v) => v.filter((x) => x !== id));
  }
  function toggleValg(id) {
    setValgt((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  }

  if (rapporter.length === 0) {
    return (
      <div className="text-center py-20">
        <FolderOpen size={32} className="text-[#AEB0B4] mx-auto mb-3" />
        <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen lagrede analyser</div>
        <div className="text-xs text-[#7A7D83]">Klikk «Generer full rapport» i kalkulatoren for å lagre en analyse</div>
      </div>
    );
  }

  if (visSammenligning) {
    const valgteRapporter = rapporter.filter((r) => valgt.includes(r.id));
    return <Sammenligning valgte={valgteRapporter} onLukk={() => setVisSammenligning(false)} />;
  }

  return (
    <div className="space-y-3">
      {/* Sammenlign-verktøylinje */}
      <div className="flex items-center justify-between bg-[#F1F1ED] border border-[#E9E8E2] rounded-xl px-4 py-3">
        <span className="text-xs text-[#65696F]">
          {valgt.length === 0 ? 'Velg 2 eller flere analyser for å sammenligne' : `${valgt.length} valgt`}
        </span>
        <Button variant="primary" size="sm" disabled={valgt.length < 2} onClick={() => setVisSammenligning(true)}>
          <BarChart3 size={13} /> Sammenlign valgte
        </Button>
      </div>

      {rapporter.map((r) => {
        const dato = new Date(r.lagretTidspunkt);
        const datoStr = dato.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' });
        const tidStr = dato.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
        const s = r.snapshot;
        const adresse = r.inp.adresse || 'Ukjent adresse';

        const erValgt = valgt.includes(r.id);
        return (
          <div
            key={r.id}
            className="bg-[#FFFFFF] border rounded-xl p-5 transition-colors group"
            style={{ borderColor: erValgt ? 'rgba(201,168,76,0.4)' : '#E9E8E2' }}
          >
            <div className="flex items-start gap-4">
              {/* Avkrysning for sammenligning */}
              <button type="button" onClick={() => toggleValg(r.id)}
                className={`w-5 h-5 rounded mt-0.5 shrink-0 flex items-center justify-center border transition-all cursor-pointer
                  ${erValgt ? 'bg-[#9A7A24] border-[#9A7A24]' : 'border-[#AEB0B4] hover:border-[#7A7D83]'}`}>
                {erValgt && <Check size={13} className="text-[#F6F6F4]" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-[#1A1B1E] text-sm truncate">{adresse}</span>
                  <span className="text-xs text-[#7A7D83] bg-[#E9E8E2] px-2 py-0.5 rounded-full shrink-0">
                    {r.inp.boligtype === 'borettslag' ? 'Borettslag' : 'Selveier'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#7A7D83] mb-3">
                  <Clock size={11} />
                  <span>{datoStr} kl. {tidStr}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Kjøpesum', val: kr(parseNum(r.inp.kjøpesum)) },
                    { label: 'Netto yield', val: pct(s.nettoYield), color: s.nettoYield >= 3 ? '#15803D' : s.nettoYield >= 1.5 ? '#4D7C0F' : '#DC2626' },
                    { label: 'Kontantstrøm', val: `${kr(s.kontantstrømMnd)}/mnd`, color: s.kontantstrømMnd >= 0 ? '#15803D' : '#DC2626' },
                    { label: 'ROE', val: pct(s.roe), color: s.roe >= 5 ? '#15803D' : s.roe >= 0 ? '#4D7C0F' : '#DC2626' },
                  ].map(({ label, val, color }) => (
                    <div key={label}>
                      <div className="text-xs text-[#7A7D83]">{label}</div>
                      <div className="text-sm font-semibold num mt-0.5" style={{ color: color || '#2A2D33', fontFamily: 'DM Mono, monospace' }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => onLastInn(r.inp)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#1A1B1E] bg-black/[0.055] hover:bg-black/[0.07] transition-all cursor-pointer"
                >
                  <FolderOpen size={12} /> Last inn
                </button>
                <button
                  onClick={() => slett(r.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 transition-all cursor-pointer"
                >
                  <Trash2 size={12} /> Slett
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Kalkulator form ──────────────────────────────────────────────────────────
const defaultInp = {
  // Eksempel: Bjørneveien 8, Grålum
  adresse: 'Bjørneveien 8, Grålum',
  boligtype: 'selveier',
  kjøpesum: '3000000',
  oppussing: '1500000',
  oppussingVedlikehold: '1100000',
  nyTakst: '5650000',
  ekKravProsent: '10',
  laanModus: 'kalkulert',
  laanebelop: '3500000',
  terminbelop: '',
  rentesats: '5',
  nedbetalingstid: '30',
  leieinntekter: [
    { id: 1, navn: '1. etasje', belop: '11800' },
    { id: 2, navn: '2. etasje', belop: '15200' },
    { id: 3, navn: 'Hybel kjeller', belop: '6900' },
    { id: 4, navn: 'Rom 1 kjeller', belop: '6700' },
    { id: 5, navn: 'Rom 2 kjeller', belop: '6500' },
  ],
  utleieandel: '95',
  felleskostnader: '',
  husforsikring: '1420',
  kommunaleAvgifter: '2400',
  vedlikeholdProsent: '3',
  tilleggskostnader: [
    { id: 10, navn: 'Internett', belop: '999' },
  ],
  bruttoArsinntekt: '',
  eksisterendeGjeld: '',
};

export default function BoliganalyseKalkulator() {
  const [inp, setInp] = useState(defaultInp);
  const [aktivTab, setAktivTab] = useState('kalkulator');
  const [åpneSeksjoner, setÅpneSeksjoner] = useState({ 1: true, 2: false, 3: false, 4: false, 5: false });
  const [lagretId, setLagretId] = useState(null);
  const [visBekreftet, setVisBekreftet] = useState(false);

  const set = (felt) => (e) => setInp((f) => ({ ...f, [felt]: e.target.value }));
  const toggle = (n) => setÅpneSeksjoner((s) => ({ ...s, [n]: !s[n] }));

  const t = useMemo(() => beregn(inp), [inp]);

  function håndterGenererRapport() {
    if (!t.kjøpesum) return;
    lagreNyRapport(inp, t);
    setVisBekreftet(true);
    setTimeout(() => setVisBekreftet(false), 2500);
    setAktivTab('rapport');
  }

  function håndterLagreKun() {
    if (!t.kjøpesum) return;
    lagreNyRapport(inp, t);
    setVisBekreftet(true);
    setTimeout(() => setVisBekreftet(false), 2500);
  }

  function lastInnRapport(lagretInp) {
    setInp(lagretInp);
    setAktivTab('kalkulator');
  }

  const ferdig = {
    1: !!inp.kjøpesum,
    2: !!inp.egenkapital && !!inp.rente,
    3: (inp.leieinntekter || []).some(l => parseNum(l.belop) > 0),
    4: true,
    5: true,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Boliganalyse</h1>
          <p className="text-sm text-[#65696F] mt-1">Beregn lønnsomhet, belåning og få AI-rapport klar for bankmøtet</p>
        </div>
        {aktivTab === 'kalkulator' && t.kjøpesum > 0 && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={håndterLagreKun}>
              {visBekreftet ? <><Check size={14} className="text-[#15803D]" /> Lagret!</> : <><FolderOpen size={14} /> Lagre</>}
            </Button>
            <Button variant="primary" onClick={håndterGenererRapport}>
              <ArrowRight size={14} /> Generer rapport
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 border-b border-[#E9E8E2] pb-1">
        {[['kalkulator', 'Kalkulator', Calculator], ['rapport', 'Rapport', BarChart3], ['lagrede', 'Lagrede', FolderOpen]].map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAktivTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer
              ${aktivTab === id ? 'bg-black/[0.055] text-[#1A1B1E]' : 'text-[#65696F] hover:text-[#2A2D33] hover:bg-black/[0.03]'}`}
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Kalkulator */}
      {aktivTab === 'kalkulator' && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Skjema */}
          <div className="lg:col-span-3 space-y-3">

            <Seksjon nummer="1" tittel="Boligen" icon={Home} open={åpneSeksjoner[1]} onToggle={() => toggle(1)} ferdig={ferdig[1]}>
              <Input label="Adresse" value={inp.adresse} onChange={set('adresse')} placeholder="Bjørneveien 8, Oslo" />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Type"
                  value={inp.boligtype}
                  onChange={set('boligtype')}
                  options={[
                    { value: 'selveier', label: 'Selveier' },
                    { value: 'borettslag', label: 'Borettslag/aksje' },
                  ]}
                />
                <Input label="Kjøpesum" value={inp.kjøpesum} onChange={set('kjøpesum')} placeholder="3 500 000" type="number" />
              </div>

              {/* Oppussing */}
              <div className="pt-1">
                <div className="text-xs text-[#7A7D83] uppercase tracking-wider mb-3">Oppussing / rehabilitering</div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Total oppussingskostnad" value={inp.oppussing} onChange={set('oppussing')} placeholder="0" type="number" />
                  <Input label="Herav vedlikehold (fradragsberettiget)" value={inp.oppussingVedlikehold} onChange={set('oppussingVedlikehold')} placeholder="0" type="number" />
                </div>
                <Input label="Ny takst etter oppussing (valgfritt)" value={inp.nyTakst} onChange={set('nyTakst')} placeholder="Estimert verdi etter oppussing" type="number" className="mt-4" />
                {inp.nyTakst && parseNum(inp.nyTakst) > 0 && (
                  <p className="text-xs text-[#7A7D83] mt-1">
                    Ny takst brukes som startverdi i 10-år prognose. Verdiøkning ved oppussing: <span className="num" style={{ color: t.verdiøkningOppussing >= 0 ? '#15803D' : '#DC2626' }}>{kr(t.verdiøkningOppussing)}</span>
                  </p>
                )}
              </div>

              {inp.kjøpesum && (
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#7A7D83]"><span>Kjøpesum</span><span className="num">{kr(parseNum(inp.kjøpesum))}</span></div>
                  {t.oppussing > 0 && <div className="flex justify-between text-[#7A7D83]"><span>Oppussing</span><span className="num">{kr(t.oppussing)}</span></div>}
                  <div className="flex justify-between text-[#7A7D83]"><span>Dokumentavgift {inp.boligtype !== 'borettslag' ? '(2,5 %)' : '(0 %)'}</span><span className="num">{kr(t.dokAvgift)}</span></div>
                  <div className="flex justify-between text-[#7A7D83]"><span>Tinglysing m.m.</span><span className="num">{kr(t.tinglysing)}</span></div>
                  <div className="flex justify-between font-medium text-[#1A1B1E] border-t border-[#E9E8E2] pt-1.5 mt-1"><span>Total investering</span><span className="num">{kr(t.totalInvestering)}</span></div>
                  {t.startBoligverdi !== t.totalInvestering && (
                    <div className="flex justify-between text-[#15803D]"><span>Startverdi bolig (etter ombygging)</span><span className="num">{kr(t.startBoligverdi)}</span></div>
                  )}
                </div>
              )}
            </Seksjon>

            <Seksjon nummer="2" tittel="Finansiering" icon={Calculator} open={åpneSeksjoner[2]} onToggle={() => toggle(2)} ferdig={ferdig[2]}>
              {/* Modus-toggle */}
              <div className="flex gap-2 mb-2">
                {[['kalkulert', 'Kalkulert'], ['manuell', 'Manuell']].map(([m, label]) => (
                  <button key={m} type="button"
                    onClick={() => setInp((f) => ({ ...f, laanModus: m }))}
                    className={`px-4 py-2 text-sm rounded-lg border transition-all cursor-pointer
                      ${inp.laanModus === m ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30' : 'text-[#65696F] border-[#E9E8E2] hover:border-[#DCDAD2]'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {inp.laanModus === 'manuell' ? (
                <Input label="Terminbeløp per mnd" value={inp.terminbelop} onChange={set('terminbelop')} placeholder="12 500" type="number" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="Lånebeløp" value={inp.laanebelop} onChange={set('laanebelop')} placeholder="2 800 000" type="number" />
                    <Input label="Rentesats (%)" value={inp.rentesats} onChange={set('rentesats')} placeholder="5.5" type="number" step="0.1" />
                    <Input label="Løpetid (år)" value={inp.nedbetalingstid} onChange={set('nedbetalingstid')} placeholder="25" type="number" />
                  </div>
                </div>
              )}

              {t.termMnd > 0 && (
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl overflow-hidden mt-1">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E8E2]">
                    <span className="text-sm text-[#4B4E54]">Terminbeløp</span>
                    <span className="text-[#15803D] font-semibold num">{kr(t.termMnd)}/mnd</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="text-xs text-[#7A7D83] mb-2 uppercase tracking-wider">Fordeling første måned</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                        <span className="text-xs text-[#4B4E54]">Renter</span>
                      </div>
                      <span className="text-sm text-[#2563EB] num">{kr(t.renterMnd)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#15803D]" />
                        <span className="text-xs text-[#4B4E54]">Avdrag</span>
                      </div>
                      <span className="text-sm text-[#15803D] num">{kr(t.avdragMnd)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#E9E8E2] overflow-hidden flex">
                      <div className="h-full bg-[#2563EB] transition-all duration-300"
                        style={{ width: `${t.termMnd > 0 ? Math.round((t.renterMnd / t.termMnd) * 100) : 0}%` }} />
                      <div className="h-full bg-[#15803D] flex-1" />
                    </div>
                    <div className="flex justify-between text-xs text-[#7A7D83]">
                      <span>Renter {t.termMnd > 0 ? Math.round((t.renterMnd / t.termMnd) * 100) : 0}%</span>
                      <span>Avdrag {t.termMnd > 0 ? Math.round((t.avdragMnd / t.termMnd) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EK-krav ved kjøp */}
              <div className="pt-1">
                <div className="text-xs text-[#4B4E54] mb-1.5">EK-krav ved kjøp</div>
                <div className="flex items-center gap-2 bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-3 py-2.5">
                  <input
                    type="number"
                    value={inp.ekKravProsent}
                    onChange={set('ekKravProsent')}
                    step="1"
                    className="w-10 bg-transparent text-[#1A1B1E] text-sm outline-none num"
                    style={{ fontFamily: 'DM Mono, monospace' }}
                  />
                  <span className="text-[#7A7D83] text-sm">% av kjøpesum + omkostninger</span>
                  <span className="ml-auto text-xs text-[#1A1B1E] num">{kr(t.ekKravMin)}</span>
                </div>
                <p className="text-xs text-[#7A7D83] mt-1">Dette er bankens krav til egenkapital ved kjøpstidspunktet — ikke din EK etter ferdigstillelse.</p>
              </div>

              {t.lånBeløp > 0 && t.boligverdi > 0 && (
                <div className="space-y-2 mt-1">
                  {/* Prosjektkalkyle */}
                  <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[#E9E8E2]">
                      <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Prosjektkalkyle</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#7A7D83]"><span>Kjøpesum</span><span className="num">{kr(t.kjøpesum)}</span></div>
                      {t.oppussing > 0 && <div className="flex justify-between text-[#7A7D83]"><span>+ Oppussing</span><span className="num">{kr(t.oppussing)}</span></div>}
                      <div className="flex justify-between text-[#7A7D83]"><span>+ Omkostninger</span><span className="num">{kr(t.totaleOmkostninger)}</span></div>
                      <div className="flex justify-between font-medium text-[#1A1B1E] border-t border-[#E9E8E2] pt-1.5"><span>= Total kostnad</span><span className="num">{kr(t.totalKostnad)}</span></div>
                      <div className="flex justify-between text-[#7A7D83] pt-0.5"><span>− Sluttlån</span><span className="num text-[#DC2626]">− {kr(t.lånBeløp)}</span></div>
                      <div className="flex justify-between font-medium border-t border-[#E9E8E2] pt-1.5" style={{ color: t.cashInvestert >= 0 ? '#2A2D33' : '#15803D' }}>
                        <span>= Cash investert av deg</span>
                        <span className="num">{t.cashInvestert >= 0 ? kr(t.cashInvestert) : `+ ${kr(Math.abs(t.cashInvestert))} ut`}</span>
                      </div>
                    </div>
                  </div>

                  {/* EK etter ferdigstillelse */}
                  <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-[#E9E8E2]">
                      <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Etter ferdigstillelse</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#7A7D83]"><span>Boligverdi ({inp.nyTakst ? 'ny takst' : 'kjøpesum + oppussing'})</span><span className="num">{kr(t.boligverdi)}</span></div>
                      <div className="flex justify-between text-[#7A7D83]"><span>− Sluttlån</span><span className="num text-[#DC2626]">− {kr(t.lånBeløp)}</span></div>
                      <div className="flex justify-between font-medium text-[#15803D] border-t border-[#E9E8E2] pt-1.5"><span>= EK i boligen</span><span className="num">{kr(t.egenkapital)}</span></div>
                      <div className="flex justify-between text-[#7A7D83]"><span>LTV (lån / boligverdi)</span><span className="num" style={{ color: t.ltv <= 90 ? '#15803D' : '#DC2626' }}>{pct(t.ltv)}</span></div>
                      {t.nyTakst > 0 && (
                        <div className="flex justify-between border-t border-[#E9E8E2] pt-1.5" style={{ color: t.verdiskapt >= 0 ? '#15803D' : '#DC2626' }}>
                          <span>Verdi skapt (ny takst − total kostnad)</span>
                          <span className="num">{kr(t.verdiskapt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Forklaring når lån > kjøpesum */}
                  {t.lånBeløp > t.kjøpesum && (
                    <InfoBoks type="info">
                      Sluttlånet ({kr(t.lånBeløp)}) er høyere enn kjøpesummen ({kr(t.kjøpesum)}). Dette er normalt ved refinansiering etter oppussing — banken låner mot ny takst ({kr(t.boligverdi)}) og LTV er {pct(t.ltv)}. Du henter ut {kr(t.lånBeløp - t.kjøpesum)} mer enn du betalte for eiendommen.
                    </InfoBoks>
                  )}
                </div>
              )}
            </Seksjon>

            <Seksjon nummer="3" tittel="Leieinntekt" icon={TrendingUp} open={åpneSeksjoner[3]} onToggle={() => toggle(3)} ferdig={ferdig[3]}>
              {/* Leieinntekter — multiple rader */}
              <div className="space-y-2">
                {(inp.leieinntekter || []).map((l, i) => (
                  <div key={l.id} className="flex gap-2 items-end">
                    <Input
                      label={i === 0 ? 'Betegnelse' : ''}
                      value={l.navn}
                      onChange={(e) => setInp((f) => {
                        const list = [...f.leieinntekter];
                        list[i] = { ...list[i], navn: e.target.value };
                        return { ...f, leieinntekter: list };
                      })}
                      placeholder={`f.eks. 1. etasje`}
                      className="flex-1"
                    />
                    <Input
                      label={i === 0 ? 'Månedlig leie' : ''}
                      value={l.belop}
                      onChange={(e) => setInp((f) => {
                        const list = [...f.leieinntekter];
                        list[i] = { ...list[i], belop: e.target.value };
                        return { ...f, leieinntekter: list };
                      })}
                      placeholder="12 500"
                      type="number"
                      className="w-40"
                    />
                    {(inp.leieinntekter || []).length > 1 && (
                      <button type="button"
                        onClick={() => setInp((f) => ({ ...f, leieinntekter: f.leieinntekter.filter((_, j) => j !== i) }))}
                        className="pb-0.5 text-[#7A7D83] hover:text-[#DC2626] transition-colors cursor-pointer shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => setInp((f) => ({ ...f, leieinntekter: [...(f.leieinntekter || []), { id: Date.now(), navn: '', belop: '' }] }))}
                className="flex items-center gap-1.5 text-xs text-[#7A7D83] hover:text-[#1A1B1E] transition-colors cursor-pointer mt-1">
                <span className="w-5 h-5 rounded border border-[#E9E8E2] flex items-center justify-center text-lg leading-none">+</span>
                Legg til leieobjekt
              </button>

              {/* Utleiegrad / ledighetsvakanse */}
              <div className="pt-2">
                <Select
                  label="Utleiegrad"
                  value={inp.utleieandel}
                  onChange={set('utleieandel')}
                  options={[
                    { value: '100', label: '100 % — ingen ledighet' },
                    { value: '97', label: '97 % — lav ledighet (3 % vakanse)' },
                    { value: '95', label: '95 % — normal (5 % vakanse)' },
                    { value: '90', label: '90 % — høy ledighet (10 % vakanse)' },
                  ]}
                />
                <p className="text-xs text-[#7A7D83] mt-1">
                  Ledighetsvakanse: <span className="num text-[#1A1B1E]">{kr(t.ledighetMnd)}/mnd</span> ({100 - parseNum(inp.utleieandel || 95)} % av brutto leie)
                </p>
              </div>

              {t.bruttoLeieMnd > 0 && (
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between text-[#7A7D83]"><span>Brutto leieinntekt</span><span className="num">{kr(t.bruttoLeieMnd)}/mnd · {kr(t.bruttoLeieÅr)}/år</span></div>
                  <div className="flex justify-between text-[#7A7D83]"><span>− Ledighetsvakanse</span><span className="num text-[#DC2626]">− {kr(t.ledighetMnd)}/mnd</span></div>
                  <div className="flex justify-between font-medium text-[#1A1B1E] border-t border-[#E9E8E2] pt-1"><span>Effektiv leieinntekt</span><span className="num">{kr((t.bruttoLeieMnd - t.ledighetMnd))}/mnd · {kr(t.effektivLeieÅr)}/år</span></div>
                </div>
              )}
            </Seksjon>

            <Seksjon nummer="4" tittel="Driftskostnader" icon={FileText} open={åpneSeksjoner[4]} onToggle={() => toggle(4)} ferdig={ferdig[4]}>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Felleskostnader (kr/mnd)" value={inp.felleskostnader} onChange={set('felleskostnader')} placeholder="2 500" type="number" />
                <Input label="Husforsikring (kr/mnd)" value={inp.husforsikring} onChange={set('husforsikring')} placeholder="500" type="number" />
                <Input label="Kommunale avgifter (kr/år)" value={inp.kommunaleAvgifter} onChange={set('kommunaleAvgifter')} placeholder="8 000" type="number" />
              </div>

              {/* Avsatt vedlikehold — prosent av leie */}
              <div className="flex gap-3 items-end pt-1">
                <div className="flex-1">
                  <div className="text-xs text-[#4B4E54] mb-1.5">Avsatt vedlikehold</div>
                  <div className="flex items-center gap-2 bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-3 py-2.5">
                    <input
                      type="number"
                      value={inp.vedlikeholdProsent}
                      onChange={set('vedlikeholdProsent')}
                      step="0.5"
                      className="w-12 bg-transparent text-[#1A1B1E] text-sm outline-none num"
                      style={{ fontFamily: 'DM Mono, monospace' }}
                    />
                    <span className="text-[#7A7D83] text-sm">% av brutto leie</span>
                    <span className="ml-auto text-xs text-[#15803D] num">{kr(t.vedlikeholdMnd)}/mnd</span>
                  </div>
                </div>
              </div>

              {/* Tilleggskostnader — dynamiske rader */}
              {(inp.tilleggskostnader || []).length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs text-[#7A7D83] uppercase tracking-wider">Tilleggskostnader</div>
                  {(inp.tilleggskostnader || []).map((tk, i) => (
                    <div key={tk.id} className="flex gap-2 items-end">
                      <Input
                        label={i === 0 ? 'Navn' : ''}
                        value={tk.navn}
                        onChange={(e) => setInp((f) => {
                          const list = [...f.tilleggskostnader];
                          list[i] = { ...list[i], navn: e.target.value };
                          return { ...f, tilleggskostnader: list };
                        })}
                        placeholder="f.eks. Alarm"
                        className="flex-1"
                      />
                      <Input
                        label={i === 0 ? 'Kr/mnd' : ''}
                        value={tk.belop}
                        onChange={(e) => setInp((f) => {
                          const list = [...f.tilleggskostnader];
                          list[i] = { ...list[i], belop: e.target.value };
                          return { ...f, tilleggskostnader: list };
                        })}
                        placeholder="0"
                        type="number"
                        className="w-36"
                      />
                      <button type="button"
                        onClick={() => setInp((f) => ({ ...f, tilleggskostnader: f.tilleggskostnader.filter((_, j) => j !== i) }))}
                        className="pb-0.5 text-[#7A7D83] hover:text-[#DC2626] transition-colors cursor-pointer shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button"
                onClick={() => setInp((f) => ({ ...f, tilleggskostnader: [...(f.tilleggskostnader || []), { id: Date.now(), navn: '', belop: '' }] }))}
                className="flex items-center gap-1.5 text-xs text-[#7A7D83] hover:text-[#1A1B1E] transition-colors cursor-pointer mt-1">
                <span className="w-5 h-5 rounded border border-[#E9E8E2] flex items-center justify-center text-lg leading-none">+</span>
                Legg til kostnad (alarm, internett m.m.)
              </button>

              <div className="flex justify-between text-xs text-[#7A7D83] pt-2 border-t border-[#E9E8E2]">
                <span>Sum driftskostnader/år</span>
                <span className="num text-[#1A1B1E]">{kr(t.totaleKostÅr)}</span>
              </div>
            </Seksjon>

            <Seksjon nummer="5" tittel="Din økonomi" icon={BarChart3} open={åpneSeksjoner[5]} onToggle={() => toggle(5)} ferdig={ferdig[5]}>
              <p className="text-xs text-[#7A7D83]">Brukes til å beregne om du tilfredsstiller 5×-gjeldsgradsregelen.</p>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Brutto årsinntekt (jobb)" value={inp.bruttoArsinntekt} onChange={set('bruttoArsinntekt')} placeholder="700 000" type="number" />
                <Input label="Eksisterende gjeld" value={inp.eksisterendeGjeld} onChange={set('eksisterendeGjeld')} placeholder="0" type="number" />
              </div>
              {inp.bruttoArsinntekt && inp.kjøpesum && (
                <div className="text-xs space-y-1">
                  <div className="flex justify-between text-[#7A7D83]">
                    <span>Maks total gjeld (5× inntekt inkl. leie)</span>
                    <span className="num">{kr(t.maxGjeldMedLeie)}</span>
                  </div>
                  <div className="flex justify-between text-[#7A7D83]">
                    <span>Din totale gjeld (eks. + ny)</span>
                    <span className={`num ${(t.lånBeløp + t.eksGjeld) <= t.maxGjeldMedLeie ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                      {kr(t.lånBeløp + t.eksGjeld)}
                    </span>
                  </div>
                </div>
              )}
            </Seksjon>

            <Button variant="primary" className="w-full justify-center" onClick={håndterGenererRapport}>
              {visBekreftet ? <><Check size={14} /> Lagret og åpnet!</> : <><BarChart3 size={14} /> Generer full rapport</>}
            </Button>
          </div>

          {/* Sticky live-preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] p-5 space-y-4">
              <div className="text-xs font-semibold text-[#7A7D83] uppercase tracking-wider">Live-oversikt</div>

              {t.kjøpesum ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-[#7A7D83]">Brutto yield</div>
                      <div className="text-lg font-bold num" style={{ color: t.bruttoYield >= 5 ? '#15803D' : t.bruttoYield >= 3 ? '#4D7C0F' : '#DC2626', fontFamily: 'DM Mono, monospace' }}>{pct(t.bruttoYield)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A7D83]">Netto yield</div>
                      <div className="text-lg font-bold num" style={{ color: t.nettoYield >= 3 ? '#15803D' : t.nettoYield >= 1.5 ? '#4D7C0F' : '#DC2626', fontFamily: 'DM Mono, monospace' }}>{pct(t.nettoYield)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A7D83]">Kontantstrøm/mnd</div>
                      <div className="text-lg font-bold num" style={{ color: t.kontantstrømMnd >= 0 ? '#15803D' : '#DC2626', fontFamily: 'DM Mono, monospace' }}>{kr(t.kontantstrømMnd)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#7A7D83]">ROE</div>
                      <div className="text-lg font-bold num" style={{ color: t.roe >= 5 ? '#15803D' : t.roe >= 0 ? '#4D7C0F' : '#DC2626', fontFamily: 'DM Mono, monospace' }}>{pct(t.roe)}</div>
                    </div>
                  </div>

                  <div className="h-px bg-[#E9E8E2]" />

                  <div className="space-y-2">
                    {[
                      ['Lånbeløp', kr(t.lånBeløp)],
                      ['Terminbeløp/mnd', kr(t.termMnd)],
                      ['Netto leieinntekt/år', kr(t.nettoLeieÅr)],
                      ['Estimert skatt/år', kr(t.estimertSkattÅr)],
                      ['Ekstra lånekapasitet', kr(t.ekstraLånekapasitet)],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-[#7A7D83]">{label}</span>
                        <span className="num text-[#1A1B1E]">{val}</span>
                      </div>
                    ))}
                  </div>

                  {t.kontantstrømMnd < 0 && (
                    <InfoBoks type="warn">
                      Negativ kontantstrøm på {kr(Math.abs(t.kontantstrømMnd))}/mnd. Du dekker mellomlegget fra lønn.
                    </InfoBoks>
                  )}
                  {t.nettoYield < 2 && t.nettoYield > 0 && (
                    <InfoBoks type="warn">
                      Netto yield under 2 % er lavt i norsk sammenheng. Typisk Oslo-yield 2025: 1,8–2,8 %.
                    </InfoBoks>
                  )}
                  {t.lånBeløp > 0 && t.ltv > 90 && (
                    <InfoBoks type="error">
                      LTV {pct(t.ltv)} — over 90 %-grensen.
                    </InfoBoks>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Calculator size={24} className="text-[#AEB0B4] mx-auto mb-2" />
                  <p className="text-xs text-[#7A7D83]">Fyll inn kjøpesum for å se beregninger</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rapport */}
      {aktivTab === 'rapport' && <Rapport inp={inp} t={{ ...t, stressKontantstrøm: t.nettoLeieÅr - t.stressTermMnd * 12 }} />}

      {/* Lagrede — key={} tvinger re-mount og fresh localStorage-les ved tabbytte */}
      {aktivTab === 'lagrede' && <LagredeRapporter key={Date.now()} onLastInn={lastInnRapport} />}
    </div>
  );
}
