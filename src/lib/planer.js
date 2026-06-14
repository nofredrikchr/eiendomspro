/**
 * Sentral plan-, pris- og feature-konfig for EiendomsPRO.
 *
 * ÉN kilde til sannhet for både klient (Vite-bundel) og server (/api). Ren
 * JavaScript uten React, DOM eller hemmeligheter — priser er offentlige og skal
 * kunne ligge i nettleser-bundelen. Alle beløp i ØRE (heltall). 1 kr = 100 øre.
 *
 * Server håndhever; klient gråtoner/viser modaler. canUse()/objectLimit() er rene
 * funksjoner og enhetstestes i planer.test.js.
 */

export const PLAN_GRATIS = 'gratis';
export const PLAN_PRIVAT = 'privat';
export const PLAN_PRO = 'pro';

export const MVA_SATS = 0.25; // norsk merverdiavgift; viste priser er inkl. mva

// Årspris = 10 × månedspris («2 måneder gratis»). Objektgrense: Gratis 1, Privat 5,
// Pro ubegrenset (Infinity).
export const PLANER = {
  gratis: {
    id: 'gratis',
    navn: 'Gratis',
    prisMndOre: 0,
    prisAarOre: 0,
    objektgrense: 1,
    tagline: 'Kom i gang uten kort',
  },
  privat: {
    id: 'privat',
    navn: 'Utleier',
    prisMndOre: 9900, // 99 kr
    prisAarOre: 99000, // 990 kr (= 10 × 99)
    objektgrense: 5,
    tagline: 'Alle analyser låst opp',
  },
  pro: {
    id: 'pro',
    navn: 'Pro',
    prisMndOre: 19900, // 199 kr
    prisAarOre: 199000, // 1 990 kr (= 10 × 199)
    objektgrense: Infinity,
    tagline: 'Ubegrenset, AS-modus og alle rapporter',
  },
};

export const PLAN_IDER = [PLAN_GRATIS, PLAN_PRIVAT, PLAN_PRO];

// Rangering for «minst denne planen»-sjekker.
const RANG = { gratis: 0, privat: 1, pro: 2 };

/**
 * Hvilken plan en feature krever som minimum. kontantstrom/yield er 'gratis'
 * (alltid tilgjengelig). De øvrige er låst for gratisbrukere; as_modus krever Pro.
 * bankid_signering håndteres IKKE her (tilgjengelig for alle, men med differensiert
 * pris + kortkrav — se bankidPrisOre / kortKrevesForSignering).
 */
export const FEATURES = {
  kontantstrom: 'gratis',
  yield: 'gratis',
  prognose: 'privat',
  investeringsanalyse: 'privat',
  budsjett_vs_faktisk: 'privat',
  sammenligning: 'privat',
  bankrapport: 'privat',
  kpi_varsling: 'privat',
  as_modus: 'pro',
};

/** Kan en plan bruke en feature? Ukjent feature → false (fail-safe lukket). */
export function canUse(feature, plan) {
  const krav = FEATURES[feature];
  if (krav === undefined) return false;
  const harRang = RANG[plan];
  if (harRang === undefined) return false;
  return harRang >= RANG[krav];
}

/** Maks antall leieobjekter for en plan (1 / 5 / Infinity). */
export function objectLimit(plan) {
  return PLANER[plan]?.objektgrense ?? PLANER.gratis.objektgrense;
}

/** Kan brukeren opprette ett nytt objekt gitt nåværende antall? */
export function kanOppretteObjekt(plan, antallNa) {
  return antallNa < objectLimit(plan);
}

// ─── Pris ──────────────────────────────────────────────────────────────────────
export function prisOre(planId, intervall = 'mnd') {
  const p = PLANER[planId];
  if (!p) return 0;
  return intervall === 'aar' ? p.prisAarOre : p.prisMndOre;
}

/** Besparelse ved årsbetaling = 12 mnd − årspris (= 2 månedspriser). */
export function besparelseAarOre(planId) {
  const p = PLANER[planId];
  if (!p) return 0;
  return p.prisMndOre * 12 - p.prisAarOre;
}

/** Beløp eks. mva fra et beløp inkl. mva (avrundet til øre). */
export function eksMvaOre(inklOre) {
  return Math.round(inklOre / (1 + MVA_SATS));
}

/** Formater øre som norsk kronebeløp, f.eks. 199000 → "1 990 kr" (med hardt mellomrom). */
export function formaterKr(ore) {
  const kr = ore / 100;
  const s = Number.isInteger(kr) ? String(kr) : kr.toFixed(2).replace('.', ',');
  return `${s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`;
}

// ─── BankID-kontraktsignering (engangskjøp) ─────────────────────────────────────
export const BANKID_PRIS_GRATIS_ORE = 19900; // 199 kr for gratisbrukere
export const BANKID_PRIS_BETALENDE_ORE = 4900; // 49 kr for betalende (privat/pro)
export const BANKID_LEVERANDOR_KOSTNAD_ORE = 3000; // ~30 kr intern margin-logging
export const PRO_INKLUDERTE_KONTRAKTER = 2;

/** Pris for én BankID-signering: betalende abonnent 49 kr, ellers 199 kr. */
export function bankidPrisOre(erBetalende) {
  return erBetalende ? BANKID_PRIS_BETALENDE_ORE : BANKID_PRIS_GRATIS_ORE;
}

// ─── Verving kunde-til-kunde (I2) ───────────────────────────────────────────────
/** Verver får 2 måneder gratis (kreditt = 2 × egen planpris/mnd). */
export function ververKredittOre(planId) {
  return 2 * (PLANER[planId]?.prisMndOre ?? 0);
}
/** Den vervede får 1 måned gratis på sitt første abonnement. */
export function vervetKredittOre(planId) {
  return 1 * (PLANER[planId]?.prisMndOre ?? 0);
}

// ─── Partner-/agentverving (I1) ─────────────────────────────────────────────────
export const PARTNER_PROVISJON_PCT = 25; // av faktisk betalt eks. mva
export const PARTNER_RABATT_PCT = 20; // kunde-rabatt
export const PARTNER_RABATT_MND = 3; // i 3 måneder

/** Pris etter partner-rabatt (20 %). */
export function medPartnerRabattOre(ore) {
  return Math.round(ore * (1 - PARTNER_RABATT_PCT / 100));
}
/** Provisjon = 25 % av faktisk betalt beløp EKS. mva. */
export function partnerProvisjonOre(inklBetaltOre) {
  return Math.round(eksMvaOre(inklBetaltOre) * (PARTNER_PROVISJON_PCT / 100));
}

// ─── Abonnementsstatus → effektiv tilgang ───────────────────────────────────────
// Statuser: 'prøve' | 'aktiv' | 'betalingsproblem' | 'forfalt' | 'kansellert' | 'over_grensen'
//  - prøve:           prøveperiode på plan_id (privat/pro) til trial_ends_at, deretter gratis
//  - aktiv:           betalt plan
//  - betalingsproblem: beholder tilgang under gjenforsøk (punkt K)
//  - forfalt:         alle trekk feilet → gratis
//  - kansellert:      tilgang ut gjeldende_slutt, deretter gratis
//  - over_grensen:    Pro→Privat med >5 objekter: leser som plan_id, men ikke nye objekter

function tid(v) {
  if (!v) return 0;
  const t = new Date(v).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Plan brukeren faktisk har tilgang til akkurat nå. */
export function effektivPlan(abonnement, naa = Date.now()) {
  if (!abonnement) return PLAN_GRATIS;
  const { status, plan_id: planId, trial_ends_at: trialSlutt, gjeldende_slutt: slutt } = abonnement;
  switch (status) {
    case 'prøve':
      return tid(trialSlutt) > naa ? (planId || PLAN_GRATIS) : PLAN_GRATIS;
    case 'aktiv':
    case 'betalingsproblem':
    case 'over_grensen':
      return planId || PLAN_GRATIS;
    case 'kansellert':
      return tid(slutt) > naa ? (planId || PLAN_GRATIS) : PLAN_GRATIS;
    case 'forfalt':
    default:
      return PLAN_GRATIS;
  }
}

/** Er kontoen i skrivebeskyttet «over grensen»-modus (les, men ikke opprett nytt)? */
export function erSkrivebeskyttet(abonnement) {
  return abonnement?.status === 'over_grensen';
}

/** Antall hele dager igjen av Pro-prøven (0 hvis ikke i prøve / utløpt). */
export function trialDagerIgjen(abonnement, naa = Date.now()) {
  if (!abonnement || abonnement.status !== 'prøve') return 0;
  const ms = tid(abonnement.trial_ends_at) - naa;
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

/** Er brukeren en betalende abonnent (gir BankID-rabatt m.m.)? */
export function erBetalende(abonnement, naa = Date.now()) {
  const p = effektivPlan(abonnement, naa);
  return p === PLAN_PRIVAT || p === PLAN_PRO;
}

/**
 * Er Pro-ens 2 inkluderte BankID-kontrakter tilgjengelige? Misbrukssikring (F):
 * IKKE i prøveperioden — først når første ordinære betaling er gjennomført.
 */
export function inkluderteKontrakterTilgjengelig(abonnement) {
  return effektivPlan(abonnement) === PLAN_PRO && abonnement?.betalt_forste_gang === true;
}

// ─── Fakturering / livssyklus (rene hjelpere) ──────────────────────────────────
export const MAKS_BETALINGSFORSOK = 3; // gjenforsøk før degradering (punkt K)

/**
 * Ny status etter et mislykket trekk, gitt antall feilede forsøk SÅ LANGT
 * (inkl. dette). Beholder tilgang under gjenforsøk; degraderer først når alle
 * forsøk er brukt opp.
 */
export function statusEtterBetalingsfeil(feiledeTrekk) {
  return feiledeTrekk >= MAKS_BETALINGSFORSOK ? 'forfalt' : 'betalingsproblem';
}

/** Slutt på neste betalte periode (ISO) fra et starttidspunkt. */
export function nyPeriodeSlutt(intervall, fraMs = Date.now()) {
  const dager = intervall === 'aar' ? 365 : 30;
  return new Date(fraMs + dager * 86_400_000).toISOString();
}

/**
 * Beregn netto å betale etter at kontokreditt er trukket fra, og hvor mye kreditt
 * som faktisk brukes. Bruker maks fakturabeløpet (kreditt går aldri tapt).
 */
export function bruktKreditt(fakturaOre, kredittSaldoOre) {
  const brukt = Math.max(0, Math.min(fakturaOre, kredittSaldoOre));
  return { brukt, nettoOre: fakturaOre - brukt };
}

/**
 * Status ved nedgradering til en lavere plan: hvis antall objekter overstiger den
 * nye planens grense, settes 'over_grensen' (les, men ikke opprett nytt) —
 * ingenting slettes (punkt L). Ellers 'aktiv'.
 */
export function statusVedNedgradering(nyPlan, antallObjekter) {
  return antallObjekter > objectLimit(nyPlan) ? 'over_grensen' : 'aktiv';
}

// ─── Skjulte funksjoner (punkt J — alle av, helt skjult i UI) ───────────────────
export const SKJULTE_FUNKSJONER = {
  auto_faktura_kid: false,
  avtalegiro: false,
  purringer: false,
  depositumskonto: false,
  depositumsgaranti: false,
  flytteprotokoll_signering: false,
  finn_publisering: false,
};

/** Er en skjult funksjon påslått? (Standard false → skjult overalt.) */
export function funksjonPa(navn) {
  return SKJULTE_FUNKSJONER[navn] === true;
}
