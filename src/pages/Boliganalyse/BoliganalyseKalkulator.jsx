import { useState, useMemo, useEffect } from 'react';
import {
  Home, TrendingUp, Calculator, FileText, ChevronDown, ChevronUp,
  Copy, Check, BarChart3, AlertTriangle, Info, ArrowRight, Sparkles,
  Trash2, FolderOpen, Clock, Activity,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { analyseApi } from '../../services/entitetApi';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SectionCard, Pill, IconTile, PageHeader } from '../../components/ui/kit';
import { lesPref, settPref } from '../../utils/uiPref';

// Alle seksjoner åpne ved første besøk — brukeren skal se hva verktøyet inneholder
// uten å klikke. Valget huskes etterpå (UI-pref i localStorage).
const ALLE_ÅPNE = { 1: true, 2: true, 3: true, 4: true, 5: true };

// ─── Lagrede rapporter (Neon, eier-scoped via /api) ──────────────────────────
async function lagreNyRapport(inp, t) {
  const stressKontantstrøm = t.nettoLeieÅr - (t.stressTermMnd || 0) * 12;
  const ny = {
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
  const lagret = await analyseApi.opprett(ny);
  return lagret.id;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pct(n, decimals = 1) {
  return isFinite(n) ? `${n.toFixed(decimals)} %` : '–';
}
function kr(n) {
  if (!isFinite(n) || isNaN(n)) return '–';
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', maximumFractionDigits: 0 }).format(n);
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
  let gjeldRest; // settes per år i løkken under før den leses
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
    termMnd, renterMnd, avdragMnd, stressTermMnd, stressRente, stressKontantstrøm,
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
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors
        ${ferdig ? 'bg-mint text-brand-ink' : 'bg-line-soft text-muted-2'}`}>
        {ferdig ? <Check size={13} /> : nummer}
      </div>
      <div className="flex items-center gap-2 flex-1">
        <Icon size={15} className={ferdig ? 'text-brand' : 'text-faint-2'} />
        <span className={`text-sm font-bold ${ferdig ? 'text-ink' : 'text-ink-2'}`}>{tittel}</span>
      </div>
      {open ? <ChevronUp size={15} className="text-faint shrink-0" /> : <ChevronDown size={15} className="text-faint shrink-0" />}
    </button>
  );
}

function Seksjon({ nummer, tittel, icon, open, onToggle, ferdig, children }) {
  return (
    <div className="rounded-[18px] border border-line bg-surface overflow-hidden">
      <div className={`px-5 py-4 ${open ? 'bg-surface' : 'bg-surface-2 hover:bg-surface'} transition-colors`}>
        <SeksjonHeader nummer={nummer} tittel={tittel} icon={icon} open={open} onClick={onToggle} ferdig={ferdig} />
      </div>
      {open && (
        <div className="px-5 pb-5 pt-4 border-t border-line-soft space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// Liten nøkkeltall-flis. `dark` = mørk teal-flate med hvit tekst.
function KPIFlis({ label, value, sub, dark = false, color }) {
  if (dark) {
    return (
      <div className="rounded-[16px] bg-brand-deep px-[18px] py-[17px]">
        <div className="text-[11.5px] font-bold text-white/75 mb-1.5">{label}</div>
        <div className="text-2xl font-extrabold tracking-[-0.02em] text-white num">{value}</div>
        {sub && <div className="text-[10.5px] font-semibold text-white/60 mt-1">{sub}</div>}
      </div>
    );
  }
  return (
    <div className="rounded-[16px] bg-surface border border-line px-[18px] py-[17px]">
      <div className="text-[11.5px] font-bold text-muted-2 mb-1.5">{label}</div>
      <div className={`text-2xl font-extrabold tracking-[-0.02em] num ${color || 'text-ink'}`}>{value}</div>
      {sub && <div className="text-[10.5px] font-semibold text-faint mt-1">{sub}</div>}
    </div>
  );
}

function BudsjettRad({ label, verdi, indent = false, bold = false, positive = null, border = false }) {
  const fargeKlasse = positive === true ? 'text-brand-ink' : positive === false ? 'text-amber' : 'text-ink-2';
  return (
    <div className={`flex items-center justify-between py-2 ${border ? 'border-t border-line-soft mt-1' : ''}`}>
      <span className={`text-[13px] ${indent ? 'pl-3.5 font-semibold text-muted-2' : bold ? 'text-ink font-extrabold' : 'font-semibold text-muted'}`}>{label}</span>
      <span className={`text-[13px] num ${bold ? 'font-extrabold' : 'font-bold'} ${fargeKlasse}`}>{verdi}</span>
    </div>
  );
}

// Info/varsel-boks i nytt tokensystem.
function InfoBoks({ type = 'info', children }) {
  const styles = {
    info: 'bg-mint-soft border-mint-line text-ink-2',
    warn: 'bg-amber-soft border-amber-line text-ink-2',
    ok: 'bg-mint-soft border-mint-line text-ink-2',
    error: 'bg-danger/[0.06] border-danger/25 text-danger',
  };
  const icons = { info: Info, warn: AlertTriangle, ok: Check, error: AlertTriangle };
  const iconColor = { info: 'text-brand-ink', warn: 'text-amber', ok: 'text-brand-ink', error: 'text-danger' };
  const Icon = icons[type];
  return (
    <div className={`flex gap-2.5 p-3.5 rounded-[12px] border text-[12.5px] font-semibold leading-relaxed ${styles[type]}`}>
      <Icon size={15} className={`shrink-0 mt-0.5 ${iconColor[type]}`} />
      <span>{children}</span>
    </div>
  );
}

// ─── Stort, visuelt resultatpanel (sticky live-oversikt) ──────────────────────
// Kompakt kr-formattering til akser/tooltip (1,2 mill / 850 k).
function krKort(n) {
  if (!isFinite(n) || isNaN(n)) return '–';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.', ',')} mill`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)} k`;
  return `${Math.round(n)}`;
}

// Egen tooltip i prosjektets tokens.
function PrognoseTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-[12px] border border-line bg-surface px-3.5 py-2.5 shadow-card">
      <div className="text-[11px] font-extrabold tracking-[0.04em] uppercase text-faint mb-1.5">År {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-[12px]">
          <span className="flex items-center gap-1.5 font-semibold text-muted-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="num font-extrabold text-ink">{kr(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

function ResultatPanel({ t }) {
  if (!t.kjøpesum) {
    return (
      <div className="rounded-[24px] border border-line bg-surface p-8 text-center">
        <IconTile tone="mint" size={56} radius={18} className="mx-auto mb-4"><Calculator size={26} /></IconTile>
        <div className="text-base font-extrabold text-ink mb-1">Fyll inn tallene</div>
        <p className="text-[13px] font-medium text-muted-2">Resultatene oppdateres live mens du skriver — yield, kontantstrøm og 10-års prognose.</p>
      </div>
    );
  }

  const kontantPos = t.kontantstrømMnd >= 0;
  const stressMnd = t.stressKontantstrøm / 12;

  // Prognosedata til grafen — bygd direkte fra beregningen (t.prognose). År 0 = i dag.
  const data = [
    { år: 0, ekVerdi: t.egenkapital || (t.boligverdi - t.lånBeløp), boligverdi: t.boligverdi },
    ...t.prognose.map((p) => ({ år: p.år, ekVerdi: p.ekVerdi, boligverdi: p.eiendomsverdi })),
  ];

  const startEk = data[0].ekVerdi;
  const sluttEk = t.prognose[9]?.ekVerdi ?? startEk;
  const vekstEk = sluttEk - startEk;

  return (
    <div className="rounded-[24px] border border-line bg-surface overflow-hidden shadow-card">
      {/* Topp — hovednøkkeltall på mørk teal-flate */}
      <div className="bg-brand-deep px-[26px] pt-[22px] pb-[26px]">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={15} className="text-white/80" />
          <span className="text-[11px] font-extrabold tracking-[0.1em] uppercase text-white/80">Live-resultat</span>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <div className="text-[11.5px] font-bold text-white/70 mb-1">Netto yield</div>
            <div className="text-[34px] leading-none font-extrabold tracking-[-0.03em] text-white num">{pct(t.nettoYield)}</div>
            <div className="text-[10.5px] font-semibold text-white/55 mt-1.5">Brutto {pct(t.bruttoYield)}</div>
          </div>
          <div>
            <div className="text-[11.5px] font-bold text-white/70 mb-1">Kontantstrøm</div>
            <div className={`text-[34px] leading-none font-extrabold tracking-[-0.03em] num ${kontantPos ? 'text-white' : 'text-[#F5C95B]'}`}>
              {kr(t.kontantstrømMnd)}
            </div>
            <div className="text-[10.5px] font-semibold text-white/55 mt-1.5">per måned før skatt</div>
          </div>
        </div>
      </div>

      <div className="p-[22px] space-y-5">
        {/* Sekundære KPI-fliser */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[14px] bg-surface-2 border border-line px-4 py-3">
            <div className="text-[11px] font-bold text-faint mb-1">ROE (cash-on-cash)</div>
            <div className={`text-xl font-extrabold num ${t.roe >= 5 ? 'text-brand-ink' : t.roe >= 0 ? 'text-ink' : 'text-danger'}`}>{pct(t.roe)}</div>
          </div>
          <div className="rounded-[14px] bg-surface-2 border border-line px-4 py-3">
            <div className="text-[11px] font-bold text-faint mb-1">EK i boligen</div>
            <div className="text-xl font-extrabold num text-ink">{kr(t.egenkapital)}</div>
          </div>
        </div>

        {/* Graf — egenkapitalvekst over 10 år */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12.5px] font-extrabold text-ink">Formue bygges over 10 år</span>
            <span className="text-[11px] font-semibold text-brand-ink num">+ {kr(vekstEk)}</span>
          </div>
          <div className="rounded-[16px] border border-line bg-surface-2 px-2 pt-4 pb-1">
            <ResponsiveContainer width="100%" height={190}>
              <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradBolig" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradEk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-brand-ink)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-brand-ink)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                <XAxis
                  dataKey="år"
                  tickFormatter={(v) => (v === 0 ? 'I dag' : `${v} år`)}
                  tick={{ fontSize: 10.5, fill: 'var(--color-faint)', fontWeight: 600 }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd"
                />
                <YAxis
                  tickFormatter={krKort}
                  tick={{ fontSize: 10.5, fill: 'var(--color-faint)', fontWeight: 600 }}
                  axisLine={false} tickLine={false} width={48}
                />
                <Tooltip content={<PrognoseTooltip />} />
                <Area type="monotone" dataKey="boligverdi" name="Boligverdi" stroke="var(--color-brand)"
                  strokeWidth={1.5} fill="url(#gradBolig)" strokeDasharray="4 3" />
                <Area type="monotone" dataKey="ekVerdi" name="Egenkapital" stroke="var(--color-brand-ink)"
                  strokeWidth={2.5} fill="url(#gradEk)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 px-1">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-2">
              <span className="w-3 h-[3px] rounded-full bg-brand-ink" /> Egenkapital
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-2">
              <span className="w-3 h-[3px] rounded-full bg-brand" style={{ opacity: 0.7 }} /> Boligverdi
            </span>
          </div>
        </div>

        {/* Nøkkeltall-liste */}
        <div className="space-y-2 border-t border-line-soft pt-4">
          {[
            ['Lånebeløp', kr(t.lånBeløp)],
            ['Terminbeløp/mnd', kr(t.termMnd)],
            ['Netto leieinntekt/år', kr(t.nettoLeieÅr)],
            ['Estimert skatt/år', kr(t.estimertSkattÅr)],
            ['Kontantstrøm etter skatt/mnd', kr(t.kontantstrømEtterSkattÅr / 12)],
            ['Kontantstrøm v/stressrente', `${kr(stressMnd)}/mnd`],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between text-[12.5px]">
              <span className="font-semibold text-muted-2">{label}</span>
              <span className="num font-bold text-ink">{val}</span>
            </div>
          ))}
        </div>

        {/* Varsler */}
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
      </div>
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
        <IconTile tone="mint" size={56} radius={18} className="mx-auto mb-4"><BarChart3 size={26} /></IconTile>
        <div className="text-base font-extrabold text-ink mb-1">Ingen data å vise ennå</div>
        <div className="text-[13px] font-medium text-muted-2">Fyll inn kjøpesum og leie i kalkulatoren for å generere rapport</div>
      </div>
    );
  }

  const stressKontantstrømMnd = t.stressKontantstrøm / 12;

  return (
    <div className="space-y-4">

      {/* Nøkkeltall */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' }}>
        <KPIFlis dark label="Brutto yield" value={pct(t.bruttoYield)} sub="Leie / total investering" />
        <KPIFlis label="Netto yield" value={pct(t.nettoYield)} sub="Etter driftskostnader"
          color={t.nettoYield >= 3.5 ? 'text-brand-ink' : t.nettoYield >= 2 ? 'text-ink' : 'text-danger'} />
        <KPIFlis label="Kontantstrøm" value={kr(t.kontantstrømMnd)} sub="kr/mnd før skatt"
          color={t.kontantstrømMnd >= 0 ? 'text-brand-ink' : 'text-danger'} />
        <KPIFlis label="ROE" value={pct(t.roe)} sub="Kontantstrøm / EK"
          color={t.roe >= 5 ? 'text-brand-ink' : t.roe >= 0 ? 'text-ink' : 'text-danger'} />
      </div>

      {/* Månedlig budsjett */}
      <SectionCard tittel="Månedlig budsjett">
        <BudsjettRad label="Brutto leieinntekt" verdi={`+ ${kr(t.bruttoLeieMnd)}`} positive={true} bold />
        <BudsjettRad label={`Ledighetsvakanse (${100 - parseNum(inp.utleieandel || 95)} %)`} verdi={`− ${kr(t.ledighetMnd)}`} indent positive={false} border />
        <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 pt-3 pb-0.5">Driftskostnader</div>
        {t.felleskostnaderÅr > 0 && <BudsjettRad label="Felleskostnader" verdi={`− ${kr(t.felleskostnaderÅr / 12)}`} indent positive={false} />}
        {t.husforsikringÅr > 0 && <BudsjettRad label="Husforsikring" verdi={`− ${kr(t.husforsikringÅr / 12)}`} indent positive={false} />}
        {t.kommunaleÅr > 0 && <BudsjettRad label="Kommunale avgifter" verdi={`− ${kr(t.kommunaleÅr / 12)}`} indent positive={false} />}
        <BudsjettRad label={`Avsatt vedlikehold (${t.vedlikeholdPst} % av leie)`} verdi={`− ${kr(t.vedlikeholdMnd)}`} indent positive={false} />
        {(inp.tilleggskostnader || []).filter(tk => tk.navn && parseNum(tk.belop) > 0).map((tk) => (
          <BudsjettRad key={tk.id} label={tk.navn} verdi={`− ${kr(parseNum(tk.belop))}`} indent positive={false} />
        ))}
        <BudsjettRad label="Netto leieinntekt" verdi={kr(t.nettoLeieMnd)} bold positive={t.nettoLeieMnd >= 0} border />
        <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 pt-3 pb-0.5">Lånekostnader</div>
        <BudsjettRad label="Renter" verdi={`− ${kr(t.renterMnd)}`} indent positive={false} />
        <BudsjettRad label="Avdrag (bygger egenkapital)" verdi={`− ${kr(t.avdragMnd)}`} indent positive={false} />
        <BudsjettRad label="Kontantstrøm før skatt" verdi={kr(t.kontantstrømMnd)} bold positive={t.kontantstrømMnd >= 0} border />
        <BudsjettRad label="Estimert skatt (22 % av overskudd)" verdi={`− ${kr(t.estimertSkattÅr / 12)}`} indent positive={false} />
        <div className="flex items-center justify-between px-3.5 py-3 mt-1.5 rounded-[12px] bg-mint-soft border border-mint-line">
          <span className="text-[13.5px] font-extrabold text-ink">Kontantstrøm etter skatt</span>
          <span className="text-sm font-extrabold num text-brand-ink">{kr(t.kontantstrømEtterSkattÅr / 12)}/mnd</span>
        </div>
      </SectionCard>

      {/* Belåning og lånekapasitet */}
      <SectionCard tittel="Belåning & lånekapasitet">
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))' }}>
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 mb-2">Prosjektkalkyle</div>
            <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Kjøpesum</span><span className="num font-bold text-ink-2">{kr(t.kjøpesum)}</span></div>
            {t.oppussing > 0 && <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">+ Oppussing</span><span className="num font-bold text-ink-2">{kr(t.oppussing)}</span></div>}
            <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">+ Omkostninger</span><span className="num font-bold text-ink-2">{kr(t.totaleOmkostninger)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px] border-t border-line-soft mt-1"><span className="font-extrabold text-ink">= Total kostnad</span><span className="num font-extrabold text-ink">{kr(t.totalKostnad)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">− Sluttlån</span><span className="num font-bold text-amber">{kr(t.lånBeløp)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px] border-t border-line-soft">
              <span className={`font-extrabold ${t.cashInvestert >= 0 ? 'text-ink' : 'text-brand-ink'}`}>= Cash investert</span>
              <span className={`num font-extrabold ${t.cashInvestert >= 0 ? 'text-ink' : 'text-brand-ink'}`}>{t.cashInvestert >= 0 ? kr(t.cashInvestert) : `+ ${kr(Math.abs(t.cashInvestert))} ut`}</span>
            </div>
          </div>
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 mb-2">Etter ferdigstillelse</div>
            <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Boligverdi ({inp.nyTakst ? 'ny takst' : 'kjøpesum + oppussing'})</span><span className="num font-bold text-ink-2">{kr(t.boligverdi)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">− Sluttlån</span><span className="num font-bold text-amber">{kr(t.lånBeløp)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px] border-t border-line-soft mt-1"><span className="font-extrabold text-brand-ink">= EK i boligen</span><span className="num font-extrabold text-brand-ink">{kr(t.egenkapital)}</span></div>
            <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Belåningsgrad (LTV)</span><span className="num font-extrabold" style={{ color: t.ltv <= 90 ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>{pct(t.ltv)}</span></div>
            {t.nyTakst > 0 && <div className="flex justify-between py-1.5 text-[13px] border-t border-line-soft"><span className="font-bold text-brand-ink">Verdi skapt</span><span className="num font-extrabold text-brand-ink">{kr(t.verdiskapt)}</span></div>}
            <div className="flex justify-between py-1.5 text-[13px] border-t border-line-soft"><span className="font-semibold text-muted-2">EK-krav ved kjøp ({t.ekKravPst} %)</span><span className="num font-bold text-ink-2">{kr(t.ekKravMin)}</span></div>
          </div>
        </div>
        <div className="mt-4 border-t border-line-soft pt-3.5">
          <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 mb-2">5× gjeldsgradsregel</div>
          <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Leieinntekt (70 % bankvektet)</span><span className="num font-bold text-ink-2">{kr(t.bankAkseptertLeieÅr)}/år</span></div>
          <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Ekstra lånekapasitet fra leie</span><span className="num font-bold text-brand-ink">{kr(t.ekstraLånekapasitet)}</span></div>
          <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Nødvendig bruttoinntekt (jobb)</span><span className="num font-extrabold text-ink-2">{t.nødvendigBruttoInntekt > 0 ? kr(t.nødvendigBruttoInntekt) : '–'}</span></div>
          <div className="flex justify-between py-1.5 text-[13px]"><span className="font-semibold text-muted-2">Terminbeløp ved stressrente</span><span className="num font-bold text-ink-2">{kr(t.stressTermMnd)}/mnd</span></div>
          {t.harNokLånekapasitet === true && (
            <div className="mt-2.5"><InfoBoks type="ok">Leieinntekten dekker gjeldsgradskravet med god margin for dette lånet.</InfoBoks></div>
          )}
        </div>

        {t.lånBeløp > 0 && t.ltv > 90 && (
          <div className="mt-3"><InfoBoks type="error">
            LTV på {pct(t.ltv)} overskrider bankens grense på 90 % av boligverdi ({kr(t.boligverdi)}). Reduser lånet med {kr(t.lånBeløp - t.boligverdi * 0.9)} eller øk boligverdien.
          </InfoBoks></div>
        )}
        {t.lånBeløp > 0 && t.ltv <= 90 && (
          <div className="mt-3"><InfoBoks type="ok">
            LTV {pct(t.ltv)} — innenfor bankens krav på maks 90 % av boligverdi.
          </InfoBoks></div>
        )}
        {t.lånBeløp > t.kjøpesum && t.ltv <= 90 && (
          <div className="mt-3"><InfoBoks type="info">
            Sluttlånet ({kr(t.lånBeløp)}) er høyere enn kjøpesummen ({kr(t.kjøpesum)}). Dette er normalt ved refinansiering — banken låner mot ny takst ({kr(t.boligverdi)}) og LTV er kun {pct(t.ltv)}.
          </InfoBoks></div>
        )}
        {t.nødvendigBruttoInntekt > 0 && (
          <div className="mt-3"><InfoBoks type="info">
            Med en eksisterende gjeld på {kr(t.eksGjeld)} og leieinntektens ekstra kapasitet på {kr(t.ekstraLånekapasitet)}, trenger du minimum {kr(t.nødvendigBruttoInntekt)} i brutto lønnsinntekt per år for å oppfylle 5×-regelen.
          </InfoBoks></div>
        )}
      </SectionCard>

      {/* Prosjektstartanalyse */}
      {t.kjøpesum > 0 && (
        <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
          <div className="px-[22px] py-4 border-b border-line-soft">
            <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">Prosjektstartanalyse</h2>
            <p className="text-[12.5px] font-medium text-muted-2 mt-0.5">Hva du trenger for å gjennomføre dette prosjektet — fra kjøp til refinansiering</p>
          </div>

          <div className="p-[22px] space-y-6">

            {/* Steg 1 — Startkapital */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-full bg-mint text-brand-ink text-xs font-extrabold flex items-center justify-center">1</div>
                <span className="text-sm font-extrabold text-ink">Hva du må ha for å starte</span>
              </div>
              <div className="bg-surface-2 border border-line rounded-[14px] p-4 space-y-1 text-[13px]">
                <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">Kjøpesum</span><span className="num font-bold text-ink-2">{kr(t.kjøpesum)}</span></div>
                <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">+ Omkostninger (dok.avg. + tinglysing)</span><span className="num font-bold text-ink-2">{kr(t.totaleOmkostninger)}</span></div>
                <div className="flex justify-between py-1 border-t border-line-soft"><span className="font-semibold text-muted-2">= Kjøpskostnad</span><span className="num font-bold text-ink-2">{kr(t.kjøpesum + t.totaleOmkostninger)}</span></div>
                <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">Maks kjøpslån ({100 - t.ekKravPst} % av kjøpesum)</span><span className="num font-bold text-amber">− {kr(t.maxKjøpslån)}</span></div>
                <div className="flex justify-between py-1 border-t border-line-soft">
                  <span className="font-extrabold text-brand-ink">= Min. egenkapital du MÅ ha</span>
                  <span className="num font-extrabold text-brand-ink">{kr(t.minEKvedKjøp)}</span>
                </div>
                <p className="text-xs font-medium text-muted-2 pt-1.5 leading-relaxed">
                  Du trenger minimum {kr(t.minEKvedKjøp)} i egenkapital for å kjøpe eiendommen. Oppussingsbudsjettet på {kr(t.oppussing)} finansieres separat via byggelån eller egne midler underveis.
                </p>
              </div>
            </div>

            {/* Steg 2 — Krav til ny takst */}
            {t.lånBeløp > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-full bg-mint text-brand-ink text-xs font-extrabold flex items-center justify-center">2</div>
                  <span className="text-sm font-extrabold text-ink">Krav til ny takst for refinansiering</span>
                </div>
                <div className="bg-surface-2 border border-line rounded-[14px] p-4 space-y-3 text-[13px]">

                  {/* For sluttlånet */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2">For å refinansiere til sluttlånet ({kr(t.lånBeløp)})</div>
                    <div className="flex justify-between py-1">
                      <span className="font-semibold text-muted-2">Min. ny takst ({100 - t.ekKravPst} % LTV-krav)</span>
                      <span className="num font-bold text-ink-2">{kr(t.minNyTakstSluttlån)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="font-semibold text-muted-2">Din ny takst</span>
                      <span className="num font-bold" style={{ color: t.harNokTakstSluttlån ? 'var(--color-brand-ink)' : t.nyTakst > 0 ? 'var(--color-danger)' : 'var(--color-faint)' }}>
                        {t.nyTakst > 0 ? kr(t.boligverdi) : '– (ikke fylt inn)'}
                      </span>
                    </div>
                    {t.nyTakst > 0 && (
                      <div className="flex justify-between py-1 text-xs">
                        <span className="font-semibold text-faint">Buffer over minstekrav</span>
                        <span className="num font-bold" style={{ color: t.takstBufferSluttlån >= 0 ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>{kr(t.takstBufferSluttlån)}</span>
                      </div>
                    )}
                    {t.nyTakst > 0 && !t.harNokTakstSluttlån && (
                      <p className="text-xs font-semibold text-danger leading-relaxed">Ny takst er for lav. Du mangler {kr(t.minNyTakstSluttlån - t.boligverdi)} i verdi for å refinansiere til sluttlånet innenfor {t.ekKravPst} % EK-krav.</p>
                    )}
                    {t.nyTakst > 0 && t.harNokTakstSluttlån && (
                      <p className="text-xs font-semibold text-brand-ink leading-relaxed">Ny takst er høy nok. Banken vil refinansiere til sluttlånet innenfor {t.ekKravPst} % EK-krav.</p>
                    )}
                  </div>

                  {/* For full refinansiering */}
                  <div className="border-t border-line-soft pt-3 space-y-1">
                    <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2">For å hente tilbake ALL investert cash</div>
                    <div className="flex justify-between py-1">
                      <span className="font-semibold text-muted-2">Total kostnad ÷ {100 - t.ekKravPst} %</span>
                      <span className="num font-bold text-ink-2">{kr(t.minNyTakstFullRefin)}</span>
                    </div>
                    {t.nyTakst > 0 && (
                      <>
                        <div className="flex justify-between py-1">
                          <span className="font-semibold text-muted-2">Din ny takst</span>
                          <span className="num font-bold" style={{ color: t.harNokTakstFullRefin ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>{kr(t.boligverdi)}</span>
                        </div>
                        {t.harNokTakstFullRefin
                          ? <p className="text-xs font-semibold text-brand-ink leading-relaxed">Du henter ut {kr(Math.abs(t.cashInvestert))} mer enn du la inn — full refinansiering er mulig.</p>
                          : <p className="text-xs font-medium text-muted-2 leading-relaxed">Ny takst er ikke høy nok til full refinansiering. Du sitter igjen med {kr(t.cashInvestert)} investert.</p>
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
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-6 h-6 rounded-full bg-mint text-brand-ink text-xs font-extrabold flex items-center justify-center">3</div>
                  <span className="text-sm font-extrabold text-ink">Pengestrøm — hva går inn og hva kan du hente ut</span>
                </div>

                {/* Cash inn */}
                <div className="bg-surface-2 border border-line rounded-[14px] overflow-hidden mb-3">
                  <div className="px-4 py-2.5 border-b border-line-soft">
                    <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2">Cash inn — hva du legger inn</span>
                  </div>
                  <div className="px-4 py-3 space-y-1 text-[13px]">
                    <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">Egenkapital ved kjøp (min. {t.ekKravPst} %)</span><span className="num font-bold text-ink-2">{kr(t.minEKvedKjøp)}</span></div>
                    {t.oppussing > 0 && <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">Oppussing (eget eller byggelån)</span><span className="num font-bold text-ink-2">{kr(t.oppussing)}</span></div>}
                    <div className="flex justify-between py-1 text-xs"><span className="font-semibold text-faint">Omkostninger (dok.avg. + tinglysing)</span><span className="num font-bold text-faint">{kr(t.totaleOmkostninger)}</span></div>
                    <div className="flex justify-between py-1 border-t border-line-soft">
                      <span className="font-extrabold text-ink">Total cash lagt inn</span>
                      <span className="num font-extrabold text-ink">{kr(t.totalCashInn)}</span>
                    </div>
                  </div>
                </div>

                {/* Ditt sluttlån */}
                <div className="bg-surface-2 border border-line rounded-[14px] overflow-hidden mb-3">
                  <div className="px-4 py-2.5 border-b border-line-soft">
                    <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2">Ditt sluttlån ({pct(t.ltv)} LTV)</span>
                  </div>
                  <div className="px-4 py-3 space-y-1 text-[13px]">
                    <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">Total cash lagt inn</span><span className="num font-bold text-ink-2">{kr(t.totalCashInn)}</span></div>
                    <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">− Sluttlån dekker</span><span className="num font-bold text-brand-ink">− {kr(t.sluttlånDekkerKostnad)}</span></div>
                    <div className="flex justify-between py-1 border-t border-line-soft">
                      <span className={`font-extrabold ${t.cashInvestert <= 0 ? 'text-brand-ink' : 'text-ink'}`}>{t.cashInvestert <= 0 ? '= Cash ut (over investert beløp)' : '= Cash fortsatt investert'}</span>
                      <span className={`num font-extrabold ${t.cashInvestert <= 0 ? 'text-brand-ink' : 'text-ink'}`}>{t.cashInvestert <= 0 ? `+ ${kr(Math.abs(t.cashInvestert))}` : kr(t.cashInvestert)}</span>
                    </div>
                    {t.cashInvestert > 0 && (
                      <p className="text-xs font-medium text-muted-2 leading-relaxed">Sluttlånet dekker ikke hele investeringen. Du har fortsatt {kr(t.cashInvestert)} stående i prosjektet.</p>
                    )}
                    {t.cashInvestert <= 0 && (
                      <p className="text-xs font-semibold text-brand-ink leading-relaxed">Sluttlånet dekker hele investeringen. Du henter ut {kr(Math.abs(t.cashInvestert))} mer enn du la inn.</p>
                    )}
                  </div>
                </div>

                {/* Maks mulig uttak */}
                <div className="rounded-[14px] overflow-hidden bg-mint-soft border border-mint-line">
                  <div className="px-4 py-2.5 border-b border-mint-line">
                    <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-brand-ink">Maks mulig uttak ({pct(t.ekKravPst, 0)} EK-krav)</span>
                  </div>
                  <div className="px-4 py-3 space-y-1 text-[13px]">
                    <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">Ny takst</span><span className="num font-bold text-ink-2">{kr(t.boligverdi)}</span></div>
                    <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">× Maks LTV ({100 - t.ekKravPst} %)</span><span className="num font-bold text-ink-2">{kr(t.maxMuligSluttlån)}</span></div>
                    <div className="flex justify-between py-1"><span className="font-semibold text-muted-2">− Total cash lagt inn</span><span className="num font-bold text-ink-2">− {kr(t.totalCashInn)}</span></div>
                    <div className="flex justify-between py-1 border-t border-mint-line">
                      <span className="font-extrabold" style={{ color: t.maxCashUt >= 0 ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>{t.maxCashUt >= 0 ? '= Maks cash du kan hente ut' : '= Du mangler i takst for full refin.'}</span>
                      <span className="num font-extrabold" style={{ color: t.maxCashUt >= 0 ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>{t.maxCashUt >= 0 ? `+ ${kr(t.maxCashUt)}` : `− ${kr(Math.abs(t.maxCashUt))}`}</span>
                    </div>
                    {t.ekstraMedMaksLån > 0 && (
                      <div className="flex justify-between py-1 text-xs">
                        <span className="font-semibold text-faint">Ekstra du KAN låne utover ditt sluttlån</span>
                        <span className="num font-bold text-brand-ink">+ {kr(t.ekstraMedMaksLån)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Konklusjonstall */}
                <div className="mt-3 bg-surface-2 border border-line rounded-[14px] p-4">
                  <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 mb-3">Fasit</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Du la inn totalt', val: kr(t.totalCashInn), cls: 'text-ink' },
                      { label: 'Cash ut ved ditt sluttlån', val: t.cashInvestert <= 0 ? `+ ${kr(Math.abs(t.cashInvestert))}` : `− ${kr(t.cashInvestert)}`, cls: t.cashInvestert <= 0 ? 'text-brand-ink' : 'text-danger' },
                      { label: 'Maks cash ut (ved maks lån)', val: t.maxCashUt >= 0 ? `+ ${kr(t.maxCashUt)}` : `− ${kr(Math.abs(t.maxCashUt))}`, cls: t.maxCashUt >= 0 ? 'text-brand-ink' : 'text-danger' },
                      { label: 'EK i boligen', val: kr(t.egenkapital), cls: 'text-brand-ink' },
                    ].map(({ label, val, cls }) => (
                      <div key={label} className="bg-surface border border-line rounded-[12px] p-3">
                        <div className="text-[11px] font-bold text-faint mb-1">{label}</div>
                        <div className={`text-sm font-extrabold num ${cls}`}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      )}

      {/* Stresstest */}
      <div className="rounded-[20px] border border-amber-line bg-amber-soft p-[22px]">
        <div className="flex items-center gap-2.5 mb-3">
          <AlertTriangle size={16} className="text-amber" />
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-ink">Stresstest — rente {pct(t.stressRente, 1)}</h2>
        </div>
        <div className="flex gap-[18px] flex-wrap">
          <div>
            <div className="text-[11.5px] font-bold text-faint mb-1">Terminbeløp ved stressrente</div>
            <div className="text-[17px] font-extrabold num text-ink">{kr(t.stressTermMnd)}/mnd</div>
          </div>
          <div>
            <div className="text-[11.5px] font-bold text-faint mb-1">Kontantstrøm ved stressrente</div>
            <div className={`text-[17px] font-extrabold num ${stressKontantstrømMnd >= 0 ? 'text-brand-ink' : 'text-amber'}`}>{kr(stressKontantstrømMnd)}/mnd</div>
          </div>
        </div>
        <p className="mt-3 text-[12.5px] font-medium text-muted leading-relaxed">
          {stressKontantstrømMnd >= 0
            ? `Boligen tåler en renteoppgang til ${pct(t.stressRente, 1)} med fortsatt positiv kontantstrøm. Sørg likevel for en likviditetsbuffer på 3–4 måneders terminbeløp.`
            : `Ved en renteoppgang til ${pct(t.stressRente, 1)} blir kontantstrømmen negativ. Boligen tåler dagens nivå, men sørg for en likviditetsbuffer på 3–4 måneders terminbeløp.`}
        </p>
      </div>

      {/* 10-år prognose */}
      <SectionCard tittel="10-års prognose" action={<span className="text-[11.5px] font-semibold text-muted-2">3 % verdivekst · 2,5 % leievekst</span>}>
        <div className="border border-line rounded-[13px] overflow-hidden overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-sand text-faint">
                {['År', 'Boligverdi', 'Leieinntekt', 'Restgjeld', 'EK-verdi', 'Yield'].map((h, i) => (
                  <th key={h} className={`py-2.5 px-3.5 text-[11px] font-extrabold uppercase tracking-[0.03em] ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.prognose.map((r) => (
                <tr key={r.år} className="border-t border-line-soft">
                  <td className="py-2.5 px-3.5 font-bold text-muted-2">{r.år}</td>
                  <td className="py-2.5 px-3.5 text-right num font-bold text-ink-2">{kr(r.eiendomsverdi)}</td>
                  <td className="py-2.5 px-3.5 text-right num font-bold text-brand-ink">{kr(r.leieinntektÅr)}</td>
                  <td className="py-2.5 px-3.5 text-right num font-bold text-muted">{kr(r.gjeldRest)}</td>
                  <td className="py-2.5 px-3.5 text-right num font-extrabold text-brand-ink">{kr(r.ekVerdi)}</td>
                  <td className="py-2.5 px-3.5 text-right num font-bold text-muted-2">{pct(r.nYield)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-3 mt-3.5 rounded-[14px] bg-brand-deep px-[18px] py-[15px] flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <div className="text-[11.5px] font-bold text-white/75 mb-0.5">Egenkapitalverdi etter 10 år</div>
            <div className="text-xs font-medium text-white/80">Boligverdi {kr(t.prognose[9]?.eiendomsverdi)} − restgjeld {kr(t.prognose[9]?.gjeldRest)}</div>
          </div>
          <div className="text-[26px] font-extrabold tracking-[-0.02em] text-white num">{kr(t.prognose[9]?.ekVerdi)}</div>
        </div>
      </SectionCard>

      {/* AI Analyse */}
      <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-[22px] py-4 border-b border-line-soft">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-brand" />
            <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">AI-analyse</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => kopier(analysetekst, 'analyse')}>
            {kopiert === 'analyse' ? <><Check size={13} className="text-brand-ink" /> Kopiert</> : <><Copy size={13} /> Kopier</>}
          </Button>
        </div>
        <pre className="px-[22px] py-4 text-xs text-muted leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {analysetekst}
        </pre>
      </div>

      {/* Bankmelding */}
      <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-[22px] py-4 border-b border-line-soft bg-mint-soft">
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-brand" />
            <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">Bankmelding</h2>
            <span className="text-[12.5px] font-medium text-muted-2">— klar til å sende til din bank</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => kopier(bankmelding, 'bank')}>
            {kopiert === 'bank' ? <><Check size={13} className="text-brand-ink" /> Kopiert!</> : <><Copy size={13} /> Kopier melding</>}
          </Button>
        </div>
        <pre className="px-[22px] py-4 text-xs text-muted leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
          {bankmelding}
        </pre>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 bg-sand border border-line rounded-[14px] px-4 py-3.5">
        <Info size={15} className="text-faint shrink-0 mt-0.5" />
        <span className="text-[12.5px] font-medium text-muted-2 leading-relaxed">Beregningen er veiledende. Skatt er forenklet (22 % på leieoverskudd etter rentefradrag) og tar ikke høyde for formuesskatt, individuelle fradrag eller fremtidige renteendringer ut over stresstesten.</span>
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-brand" />
          <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">Sammenligning av {valgte.length} boliger</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onLukk}>← Tilbake til lagrede</Button>
      </div>

      {/* AI-evaluering */}
      {evaluering && (
        <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
          <div className="flex items-center gap-2 px-[22px] py-3.5 border-b border-line-soft">
            <Sparkles size={15} className="text-brand" />
            <span className="text-base font-extrabold tracking-[-0.01em] text-ink">AI-evaluering</span>
          </div>
          <div className="p-[22px] space-y-4">
            <div className="rounded-[14px] bg-mint-soft border border-mint-line p-4">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-brand-ink mb-1.5">Anbefaling</div>
              <p className="text-sm font-semibold text-ink-2 leading-relaxed">{evaluering.anbefaling}</p>
            </div>
            <div className="space-y-2">
              {evaluering.punkter.map((p, i) => (
                <div key={i} className="flex gap-2.5 text-[13.5px] font-medium text-muted leading-relaxed">
                  <Check size={15} className="text-brand shrink-0 mt-0.5" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
            {evaluering.advarsel && (
              <InfoBoks type="warn">{evaluering.advarsel}</InfoBoks>
            )}
          </div>
        </div>
      )}

      {/* Sammenligningstabell */}
      <div className="overflow-x-auto rounded-[20px] border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sand border-b border-line">
              <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-[0.03em] text-faint sticky left-0 bg-sand">Nøkkeltall</th>
              {valgte.map((r) => (
                <th key={r.id} className="px-4 py-3 text-right text-[12.5px] font-extrabold text-ink min-w-32">{navn(r)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SAMMENLIGN_RADER.map((rad) => {
              const best = besteId(rad.felt, rad.hoyBest);
              return (
                <tr key={rad.felt} className="border-t border-line-soft">
                  <td className="px-4 py-2.5 font-semibold text-muted-2 sticky left-0 bg-surface-2">{rad.label}</td>
                  {valgte.map((r) => {
                    const v = r.snapshot[rad.felt];
                    const erBest = best === r.id && rad.hoyBest !== undefined && valgte.length > 1;
                    return (
                      <td key={r.id} className={`px-4 py-2.5 text-right num ${erBest ? 'font-extrabold text-brand-ink' : 'font-bold text-ink-2'}`}>
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
      <InfoBoks type="info">
        <span className="text-brand-ink font-bold">Grønn</span> = beste verdi per nøkkeltall. AI-evalueringen vekter yield, kontantstrøm, avkastning på egenkapital, verdiskaping og robusthet mot renteoppgang.
      </InfoBoks>
    </div>
  );
}

// ─── Lagrede rapporter-oversikt ───────────────────────────────────────────────
function LagredeRapporter({ onLastInn }) {
  const [rapporter, setRapporter] = useState([]);
  const [valgt, setValgt] = useState([]); // ids
  const [visSammenligning, setVisSammenligning] = useState(false);

  useEffect(() => {
    let aktiv = true;
    analyseApi.list().then((r) => { if (aktiv) setRapporter(r); }).catch(() => {});
    return () => { aktiv = false; };
  }, []);

  async function slett(id) {
    setRapporter((prev) => prev.filter((r) => r.id !== id));
    setValgt((v) => v.filter((x) => x !== id));
    try { await analyseApi.slett(id); } catch { /* ignore */ }
  }
  function toggleValg(id) {
    setValgt((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]);
  }

  if (rapporter.length === 0) {
    return (
      <div className="text-center py-20">
        <IconTile tone="mint" size={56} radius={18} className="mx-auto mb-4"><FolderOpen size={26} /></IconTile>
        <div className="text-base font-extrabold text-ink mb-1">Ingen lagrede analyser</div>
        <div className="text-[13px] font-medium text-muted-2">Klikk «Generer full rapport» i kalkulatoren for å lagre en analyse</div>
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
      <div className="flex items-center justify-between bg-surface-2 border border-line rounded-[14px] px-4 py-3">
        <span className="text-[13px] font-semibold text-muted-2">
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
            className={`bg-surface border rounded-[18px] p-5 transition-colors ${erValgt ? 'border-brand' : 'border-line'}`}
          >
            <div className="flex items-start gap-4">
              {/* Avkrysning for sammenligning */}
              <button type="button" onClick={() => toggleValg(r.id)}
                className={`w-5 h-5 rounded-[6px] mt-0.5 shrink-0 flex items-center justify-center border transition-all cursor-pointer
                  ${erValgt ? 'bg-brand border-brand' : 'border-line-input hover:border-faint'}`}>
                {erValgt && <Check size={13} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-extrabold text-ink text-sm truncate">{adresse}</span>
                  <Pill tone="neutral">{r.inp.boligtype === 'borettslag' ? 'Borettslag' : 'Selveier'}</Pill>
                </div>
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted-2 mb-3">
                  <Clock size={12} />
                  <span>{datoStr} kl. {tidStr}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Kjøpesum', val: kr(parseNum(r.inp.kjøpesum)), cls: 'text-ink-2' },
                    { label: 'Netto yield', val: pct(s.nettoYield), cls: s.nettoYield >= 3 ? 'text-brand-ink' : s.nettoYield >= 1.5 ? 'text-ink' : 'text-danger' },
                    { label: 'Kontantstrøm', val: `${kr(s.kontantstrømMnd)}/mnd`, cls: s.kontantstrømMnd >= 0 ? 'text-brand-ink' : 'text-danger' },
                    { label: 'ROE', val: pct(s.roe), cls: s.roe >= 5 ? 'text-brand-ink' : s.roe >= 0 ? 'text-ink' : 'text-danger' },
                  ].map(({ label, val, cls }) => (
                    <div key={label}>
                      <div className="text-[11px] font-bold text-faint">{label}</div>
                      <div className={`text-sm font-extrabold num mt-0.5 ${cls}`}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button variant="secondary" size="sm" onClick={() => onLastInn(r.inp)}>
                  <FolderOpen size={12} /> Last inn
                </Button>
                <Button variant="danger" size="sm" onClick={() => slett(r.id)}>
                  <Trash2 size={12} /> Slett
                </Button>
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
  const [åpneSeksjoner, setÅpneSeksjoner] = useState(() => lesPref('analyseSeksjoner', ALLE_ÅPNE));
  const [visBekreftet, setVisBekreftet] = useState(false);

  const set = (felt) => (e) => setInp((f) => ({ ...f, [felt]: e.target.value }));
  const toggle = (n) => setÅpneSeksjoner((s) => {
    const neste = { ...s, [n]: !s[n] };
    settPref('analyseSeksjoner', neste);
    return neste;
  });

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

  const rentePst = t.termMnd > 0 ? Math.round((t.renterMnd / t.termMnd) * 100) : 0;

  return (
    <div className="animate-fade-up">
      <PageHeader
        tittel="Boliganalyse"
        undertittel="Full lønnsomhetsanalyse — yield, kontantstrøm, belåning, refinansiering og 10-års prognose"
      >
        {aktivTab === 'kalkulator' && t.kjøpesum > 0 && (
          <>
            <Button variant="secondary" onClick={håndterLagreKun}>
              {visBekreftet ? <><Check size={14} className="text-brand-ink" /> Lagret!</> : <><FolderOpen size={14} /> Lagre</>}
            </Button>
            <Button variant="primary" onClick={håndterGenererRapport}>
              <ArrowRight size={14} /> Generer rapport
            </Button>
          </>
        )}
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-7">
        {[['kalkulator', 'Kalkulator', Calculator], ['rapport', 'Rapport', BarChart3], ['lagrede', 'Lagrede', FolderOpen]].map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAktivTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer
              ${aktivTab === id ? 'bg-brand text-white shadow-brand' : 'text-muted hover:text-ink-2 hover:bg-line-soft'}`}
          >
            <Icon size={15} className="shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Kalkulator */}
      {aktivTab === 'kalkulator' && (
        <div className="grid gap-[18px] items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
          {/* Skjema */}
          <div className="space-y-3">

            <Seksjon nummer="1" tittel="Boligen" icon={Home} open={åpneSeksjoner[1]} onToggle={() => toggle(1)} ferdig={ferdig[1]}>
              <Input label="Adresse" value={inp.adresse} onChange={set('adresse')} placeholder="Bjørneveien 8, Oslo" />
              <div className="grid grid-cols-2 gap-3">
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
                <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-faint mb-2.5">Oppussing / rehabilitering</div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Total oppussingskostnad" value={inp.oppussing} onChange={set('oppussing')} placeholder="0" type="number" />
                  <Input label="Herav vedlikehold (fradragsberettiget)" value={inp.oppussingVedlikehold} onChange={set('oppussingVedlikehold')} placeholder="0" type="number" />
                </div>
                <Input label="Ny takst etter oppussing (valgfritt)" value={inp.nyTakst} onChange={set('nyTakst')} placeholder="Estimert verdi etter oppussing" type="number" className="mt-3" />
                {inp.nyTakst && parseNum(inp.nyTakst) > 0 && (
                  <p className="text-xs font-medium text-muted-2 mt-1.5">
                    Ny takst brukes som startverdi i 10-år prognose. Verdiøkning ved oppussing: <span className={`num font-bold ${t.verdiøkningOppussing >= 0 ? 'text-brand-ink' : 'text-danger'}`}>{kr(t.verdiøkningOppussing)}</span>
                  </p>
                )}
              </div>

              {inp.kjøpesum && (
                <div className="bg-surface-2 border border-line rounded-[14px] p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium text-muted-2"><span>Kjøpesum</span><span className="num font-bold">{kr(parseNum(inp.kjøpesum))}</span></div>
                  {t.oppussing > 0 && <div className="flex justify-between font-medium text-muted-2"><span>Oppussing</span><span className="num font-bold">{kr(t.oppussing)}</span></div>}
                  <div className="flex justify-between font-medium text-muted-2"><span>Dokumentavgift {inp.boligtype !== 'borettslag' ? '(2,5 %)' : '(0 %)'}</span><span className="num font-bold">{kr(t.dokAvgift)}</span></div>
                  <div className="flex justify-between font-medium text-muted-2"><span>Tinglysing m.m.</span><span className="num font-bold">{kr(t.tinglysing)}</span></div>
                  <div className="flex justify-between font-extrabold text-ink border-t border-line-soft pt-1.5 mt-1"><span>Total investering</span><span className="num">{kr(t.totalInvestering)}</span></div>
                  {t.startBoligverdi !== t.totalInvestering && (
                    <div className="flex justify-between font-semibold text-brand-ink"><span>Startverdi bolig (etter ombygging)</span><span className="num">{kr(t.startBoligverdi)}</span></div>
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
                    className={`px-4 py-2 text-sm font-bold rounded-xl border-[1.5px] transition-all cursor-pointer
                      ${inp.laanModus === m ? 'bg-mint text-brand-ink border-mint-line' : 'text-muted border-line-input hover:border-faint'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {inp.laanModus === 'manuell' ? (
                <Input label="Terminbeløp per mnd" value={inp.terminbelop} onChange={set('terminbelop')} placeholder="12 500" type="number" />
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Lånebeløp" value={inp.laanebelop} onChange={set('laanebelop')} placeholder="2 800 000" type="number" />
                  <Input label="Rentesats (%)" value={inp.rentesats} onChange={set('rentesats')} placeholder="5.5" type="number" step="0.1" />
                  <Input label="Løpetid (år)" value={inp.nedbetalingstid} onChange={set('nedbetalingstid')} placeholder="25" type="number" />
                </div>
              )}

              {t.termMnd > 0 && (
                <div className="bg-surface-2 border border-line rounded-[14px] overflow-hidden mt-1">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-line-soft">
                    <span className="text-sm font-semibold text-muted">Terminbeløp</span>
                    <span className="text-brand-ink font-extrabold num">{kr(t.termMnd)}/mnd</span>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2 mb-2">Fordeling første måned</div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand" />
                        <span className="text-xs font-semibold text-muted">Renter</span>
                      </div>
                      <span className="text-[13px] font-bold text-brand-ink num">{kr(t.renterMnd)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-mint-line" />
                        <span className="text-xs font-semibold text-muted">Avdrag</span>
                      </div>
                      <span className="text-[13px] font-bold text-ink-2 num">{kr(t.avdragMnd)}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-line-soft overflow-hidden flex">
                      <div className="h-full bg-brand transition-all duration-300" style={{ width: `${rentePst}%` }} />
                      <div className="h-full bg-mint-line flex-1" />
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-faint">
                      <span>Renter {rentePst}%</span>
                      <span>Avdrag {t.termMnd > 0 ? Math.round((t.avdragMnd / t.termMnd) * 100) : 0}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EK-krav ved kjøp */}
              <div className="pt-1">
                <div className="text-[12.5px] font-bold text-muted mb-1.5">EK-krav ved kjøp</div>
                <div className="flex items-center gap-2 bg-surface-2 border border-line-input rounded-xl px-3.5 py-2.5">
                  <input
                    type="number"
                    value={inp.ekKravProsent}
                    onChange={set('ekKravProsent')}
                    step="1"
                    className="w-10 bg-transparent text-ink text-sm font-bold outline-none num"
                  />
                  <span className="text-muted-2 text-sm font-semibold">% av kjøpesum + omkostninger</span>
                  <span className="ml-auto text-xs font-bold text-ink num">{kr(t.ekKravMin)}</span>
                </div>
                <p className="text-xs font-medium text-muted-2 mt-1.5">Dette er bankens krav til egenkapital ved kjøpstidspunktet — ikke din EK etter ferdigstillelse.</p>
              </div>

              {t.lånBeløp > 0 && t.boligverdi > 0 && (
                <div className="space-y-2 mt-1">
                  {/* Prosjektkalkyle */}
                  <div className="bg-surface-2 border border-line rounded-[14px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-line-soft">
                      <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2">Prosjektkalkyle</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-xs">
                      <div className="flex justify-between font-medium text-muted-2"><span>Kjøpesum</span><span className="num font-bold">{kr(t.kjøpesum)}</span></div>
                      {t.oppussing > 0 && <div className="flex justify-between font-medium text-muted-2"><span>+ Oppussing</span><span className="num font-bold">{kr(t.oppussing)}</span></div>}
                      <div className="flex justify-between font-medium text-muted-2"><span>+ Omkostninger</span><span className="num font-bold">{kr(t.totaleOmkostninger)}</span></div>
                      <div className="flex justify-between font-extrabold text-ink border-t border-line-soft pt-1.5"><span>= Total kostnad</span><span className="num">{kr(t.totalKostnad)}</span></div>
                      <div className="flex justify-between font-medium text-muted-2 pt-0.5"><span>− Sluttlån</span><span className="num font-bold text-amber">− {kr(t.lånBeløp)}</span></div>
                      <div className={`flex justify-between font-extrabold border-t border-line-soft pt-1.5 ${t.cashInvestert >= 0 ? 'text-ink' : 'text-brand-ink'}`}>
                        <span>= Cash investert av deg</span>
                        <span className="num">{t.cashInvestert >= 0 ? kr(t.cashInvestert) : `+ ${kr(Math.abs(t.cashInvestert))} ut`}</span>
                      </div>
                    </div>
                  </div>

                  {/* EK etter ferdigstillelse */}
                  <div className="bg-surface-2 border border-line rounded-[14px] overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-line-soft">
                      <span className="text-[11px] font-extrabold tracking-[0.05em] uppercase text-faint-2">Etter ferdigstillelse</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-xs">
                      <div className="flex justify-between font-medium text-muted-2"><span>Boligverdi ({inp.nyTakst ? 'ny takst' : 'kjøpesum + oppussing'})</span><span className="num font-bold">{kr(t.boligverdi)}</span></div>
                      <div className="flex justify-between font-medium text-muted-2"><span>− Sluttlån</span><span className="num font-bold text-amber">− {kr(t.lånBeløp)}</span></div>
                      <div className="flex justify-between font-extrabold text-brand-ink border-t border-line-soft pt-1.5"><span>= EK i boligen</span><span className="num">{kr(t.egenkapital)}</span></div>
                      <div className="flex justify-between font-medium text-muted-2"><span>LTV (lån / boligverdi)</span><span className="num font-bold" style={{ color: t.ltv <= 90 ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>{pct(t.ltv)}</span></div>
                      {t.nyTakst > 0 && (
                        <div className="flex justify-between font-semibold border-t border-line-soft pt-1.5" style={{ color: t.verdiskapt >= 0 ? 'var(--color-brand-ink)' : 'var(--color-danger)' }}>
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
                        className="pb-2.5 text-faint hover:text-danger transition-colors cursor-pointer shrink-0">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button"
                onClick={() => setInp((f) => ({ ...f, leieinntekter: [...(f.leieinntekter || []), { id: Date.now(), navn: '', belop: '' }] }))}
                className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-brand-ink transition-colors cursor-pointer mt-1">
                <span className="w-5 h-5 rounded-[7px] border border-line-input flex items-center justify-center text-lg leading-none">+</span>
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
                <p className="text-xs font-medium text-muted-2 mt-1.5">
                  Ledighetsvakanse: <span className="num font-bold text-ink">{kr(t.ledighetMnd)}/mnd</span> ({100 - parseNum(inp.utleieandel || 95)} % av brutto leie)
                </p>
              </div>

              {t.bruttoLeieMnd > 0 && (
                <div className="bg-surface-2 border border-line rounded-[14px] p-3.5 text-xs space-y-1.5">
                  <div className="flex justify-between font-medium text-muted-2"><span>Brutto leieinntekt</span><span className="num font-bold">{kr(t.bruttoLeieMnd)}/mnd · {kr(t.bruttoLeieÅr)}/år</span></div>
                  <div className="flex justify-between font-medium text-muted-2"><span>− Ledighetsvakanse</span><span className="num font-bold text-amber">− {kr(t.ledighetMnd)}/mnd</span></div>
                  <div className="flex justify-between font-extrabold text-ink border-t border-line-soft pt-1.5"><span>Effektiv leieinntekt</span><span className="num">{kr((t.bruttoLeieMnd - t.ledighetMnd))}/mnd · {kr(t.effektivLeieÅr)}/år</span></div>
                </div>
              )}
            </Seksjon>

            <Seksjon nummer="4" tittel="Driftskostnader" icon={FileText} open={åpneSeksjoner[4]} onToggle={() => toggle(4)} ferdig={ferdig[4]}>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Felleskostnader (kr/mnd)" value={inp.felleskostnader} onChange={set('felleskostnader')} placeholder="2 500" type="number" />
                <Input label="Husforsikring (kr/mnd)" value={inp.husforsikring} onChange={set('husforsikring')} placeholder="500" type="number" />
                <Input label="Kommunale avgifter (kr/år)" value={inp.kommunaleAvgifter} onChange={set('kommunaleAvgifter')} placeholder="8 000" type="number" />
              </div>

              {/* Avsatt vedlikehold — prosent av leie */}
              <div className="flex gap-3 items-end pt-1">
                <div className="flex-1">
                  <div className="text-[12.5px] font-bold text-muted mb-1.5">Avsatt vedlikehold</div>
                  <div className="flex items-center gap-2 bg-surface-2 border border-line-input rounded-xl px-3.5 py-2.5">
                    <input
                      type="number"
                      value={inp.vedlikeholdProsent}
                      onChange={set('vedlikeholdProsent')}
                      step="0.5"
                      className="w-12 bg-transparent text-ink text-sm font-bold outline-none num"
                    />
                    <span className="text-muted-2 text-sm font-semibold">% av brutto leie</span>
                    <span className="ml-auto text-xs font-bold text-brand-ink num">{kr(t.vedlikeholdMnd)}/mnd</span>
                  </div>
                </div>
              </div>

              {/* Tilleggskostnader — dynamiske rader */}
              {(inp.tilleggskostnader || []).length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-extrabold tracking-[0.08em] uppercase text-faint">Tilleggskostnader</div>
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
                        className="pb-2.5 text-faint hover:text-danger transition-colors cursor-pointer shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button"
                onClick={() => setInp((f) => ({ ...f, tilleggskostnader: [...(f.tilleggskostnader || []), { id: Date.now(), navn: '', belop: '' }] }))}
                className="flex items-center gap-1.5 text-[13px] font-bold text-muted hover:text-brand-ink transition-colors cursor-pointer mt-1">
                <span className="w-5 h-5 rounded-[7px] border border-line-input flex items-center justify-center text-lg leading-none">+</span>
                Legg til kostnad (alarm, internett m.m.)
              </button>

              <div className="flex justify-between text-xs font-semibold text-muted-2 pt-2 border-t border-line-soft">
                <span>Sum driftskostnader/år</span>
                <span className="num font-bold text-ink">{kr(t.totaleKostÅr)}</span>
              </div>
            </Seksjon>

            <Seksjon nummer="5" tittel="Din økonomi" icon={BarChart3} open={åpneSeksjoner[5]} onToggle={() => toggle(5)} ferdig={ferdig[5]}>
              <p className="text-xs font-medium text-muted-2">Brukes til å beregne om du tilfredsstiller 5×-gjeldsgradsregelen.</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Brutto årsinntekt (jobb)" value={inp.bruttoArsinntekt} onChange={set('bruttoArsinntekt')} placeholder="700 000" type="number" />
                <Input label="Eksisterende gjeld" value={inp.eksisterendeGjeld} onChange={set('eksisterendeGjeld')} placeholder="0" type="number" />
              </div>
              {inp.bruttoArsinntekt && inp.kjøpesum && (
                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between font-medium text-muted-2">
                    <span>Maks total gjeld (5× inntekt inkl. leie)</span>
                    <span className="num font-bold">{kr(t.maxGjeldMedLeie)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-muted-2">
                    <span>Din totale gjeld (eks. + ny)</span>
                    <span className={`num font-bold ${(t.lånBeløp + t.eksGjeld) <= t.maxGjeldMedLeie ? 'text-brand-ink' : 'text-danger'}`}>
                      {kr(t.lånBeløp + t.eksGjeld)}
                    </span>
                  </div>
                </div>
              )}
            </Seksjon>

            <Button variant="primary" className="w-full justify-center" onClick={håndterGenererRapport}>
              {visBekreftet ? <><Check size={14} /> Lagret og åpnet!</> : <><BarChart3 size={14} /> Oppdater analyse</>}
            </Button>
            <div className="flex items-center gap-2 mt-1 text-[11.5px] font-semibold text-faint">
              <FileText size={13} />
              Lagre som rapport · sammenlign flere boliger
            </div>
          </div>

          {/* Stort, visuelt resultatpanel — sticky på store skjermer */}
          <div className="lg:sticky lg:top-6">
            <ResultatPanel t={t} />
          </div>
        </div>
      )}

      {/* Rapport */}
      {aktivTab === 'rapport' && <Rapport inp={inp} t={{ ...t, stressKontantstrøm: t.nettoLeieÅr - t.stressTermMnd * 12 }} />}

      {/* Lagrede — betinget render monterer fersk hver gang fanen åpnes (henter fra /api) */}
      {aktivTab === 'lagrede' && <LagredeRapporter onLastInn={lastInnRapport} />}
    </div>
  );
}
