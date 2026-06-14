import { describe, it, expect } from 'vitest';
import {
  PLANER, canUse, objectLimit, kanOppretteObjekt, prisOre, besparelseAarOre,
  eksMvaOre, formaterKr, bankidPrisOre, ververKredittOre, vervetKredittOre,
  medPartnerRabattOre, partnerProvisjonOre, effektivPlan, trialDagerIgjen,
  erBetalende, erSkrivebeskyttet, inkluderteKontrakterTilgjengelig, funksjonPa,
  statusEtterBetalingsfeil, bruktKreditt, statusVedNedgradering,
} from './planer.js';

describe('priser og grenser', () => {
  it('årspris er nøyaktig 10 × månedspris', () => {
    expect(PLANER.privat.prisAarOre).toBe(PLANER.privat.prisMndOre * 10);
    expect(PLANER.pro.prisAarOre).toBe(PLANER.pro.prisMndOre * 10);
  });
  it('priser i øre stemmer med spec', () => {
    expect(PLANER.privat.prisMndOre).toBe(9900);
    expect(PLANER.privat.prisAarOre).toBe(99000);
    expect(PLANER.pro.prisMndOre).toBe(19900);
    expect(PLANER.pro.prisAarOre).toBe(199000);
    expect(PLANER.gratis.prisMndOre).toBe(0);
  });
  it('objektgrense: 1 / 5 / ubegrenset', () => {
    expect(objectLimit('gratis')).toBe(1);
    expect(objectLimit('privat')).toBe(5);
    expect(objectLimit('pro')).toBe(Infinity);
    expect(objectLimit('ukjent')).toBe(1); // fail-safe
  });
  it('kanOppretteObjekt respekterer grensen', () => {
    expect(kanOppretteObjekt('gratis', 0)).toBe(true);
    expect(kanOppretteObjekt('gratis', 1)).toBe(false);
    expect(kanOppretteObjekt('privat', 4)).toBe(true);
    expect(kanOppretteObjekt('privat', 5)).toBe(false);
    expect(kanOppretteObjekt('pro', 9999)).toBe(true);
  });
  it('besparelse ved år = 2 månedspriser', () => {
    expect(besparelseAarOre('privat')).toBe(PLANER.privat.prisMndOre * 2);
    expect(besparelseAarOre('pro')).toBe(PLANER.pro.prisMndOre * 2);
  });
  it('prisOre henter riktig intervall', () => {
    expect(prisOre('pro', 'mnd')).toBe(19900);
    expect(prisOre('pro', 'aar')).toBe(199000);
  });
});

describe('canUse-gating', () => {
  it('gratis ser kun kontantstrøm og yield', () => {
    expect(canUse('kontantstrom', 'gratis')).toBe(true);
    expect(canUse('yield', 'gratis')).toBe(true);
    expect(canUse('prognose', 'gratis')).toBe(false);
    expect(canUse('investeringsanalyse', 'gratis')).toBe(false);
    expect(canUse('budsjett_vs_faktisk', 'gratis')).toBe(false);
    expect(canUse('sammenligning', 'gratis')).toBe(false);
    expect(canUse('bankrapport', 'gratis')).toBe(false);
    expect(canUse('as_modus', 'gratis')).toBe(false);
  });
  it('privat låser opp alle analyser unntatt AS-modus', () => {
    expect(canUse('prognose', 'privat')).toBe(true);
    expect(canUse('bankrapport', 'privat')).toBe(true);
    expect(canUse('kpi_varsling', 'privat')).toBe(true);
    expect(canUse('as_modus', 'privat')).toBe(false);
  });
  it('pro har alt inkludert AS-modus', () => {
    expect(canUse('as_modus', 'pro')).toBe(true);
    expect(canUse('prognose', 'pro')).toBe(true);
  });
  it('ukjent feature eller plan er stengt', () => {
    expect(canUse('finnesikke', 'pro')).toBe(false);
    expect(canUse('prognose', 'tull')).toBe(false);
  });
});

describe('formatering og mva', () => {
  it('formaterer kronebeløp med tusenskille', () => {
    expect(formaterKr(99000)).toBe('990 kr');
    expect(formaterKr(199000)).toBe('1 990 kr');
    expect(formaterKr(0)).toBe('0 kr');
    expect(formaterKr(9900)).toBe('99 kr');
  });
  it('eks. mva trekker ut 25 %', () => {
    expect(eksMvaOre(12500)).toBe(10000);
  });
});

describe('BankID-pris', () => {
  it('betalende 49 kr, gratis 199 kr', () => {
    expect(bankidPrisOre(true)).toBe(4900);
    expect(bankidPrisOre(false)).toBe(19900);
  });
});

describe('vervekreditt', () => {
  it('verver får 2 mnd, vervet får 1 mnd', () => {
    expect(ververKredittOre('privat')).toBe(2 * 9900);
    expect(vervetKredittOre('privat')).toBe(9900);
    expect(ververKredittOre('pro')).toBe(2 * 19900);
  });
});

describe('partner', () => {
  it('20 % rabatt', () => {
    expect(medPartnerRabattOre(10000)).toBe(8000);
  });
  it('provisjon = 25 % av betalt eks. mva', () => {
    // 9900 inkl mva → 7920 eks mva → 25 % = 1980
    expect(partnerProvisjonOre(9900)).toBe(1980);
  });
});

describe('effektivPlan / trial', () => {
  const naa = new Date('2026-06-14T12:00:00Z').getTime();
  const om = (dager) => new Date(naa + dager * 86_400_000).toISOString();

  it('prøve gir plan_id-planen mens den varer, gratis etterpå', () => {
    expect(effektivPlan({ status: 'prøve', plan_id: 'pro', trial_ends_at: om(5) }, naa)).toBe('pro');
    expect(effektivPlan({ status: 'prøve', plan_id: 'privat', trial_ends_at: om(5) }, naa)).toBe('privat');
    expect(effektivPlan({ status: 'prøve', plan_id: 'pro', trial_ends_at: om(-1) }, naa)).toBe('gratis');
  });
  it('aktiv gir den betalte planen', () => {
    expect(effektivPlan({ status: 'aktiv', plan_id: 'privat' }, naa)).toBe('privat');
  });
  it('betalingsproblem beholder tilgang, forfalt degraderer', () => {
    expect(effektivPlan({ status: 'betalingsproblem', plan_id: 'pro' }, naa)).toBe('pro');
    expect(effektivPlan({ status: 'forfalt', plan_id: 'pro' }, naa)).toBe('gratis');
  });
  it('kansellert beholder tilgang ut perioden', () => {
    expect(effektivPlan({ status: 'kansellert', plan_id: 'pro', gjeldende_slutt: om(3) }, naa)).toBe('pro');
    expect(effektivPlan({ status: 'kansellert', plan_id: 'pro', gjeldende_slutt: om(-3) }, naa)).toBe('gratis');
  });
  it('over_grensen leser som planen, men er skrivebeskyttet', () => {
    const ab = { status: 'over_grensen', plan_id: 'privat' };
    expect(effektivPlan(ab, naa)).toBe('privat');
    expect(erSkrivebeskyttet(ab)).toBe(true);
  });
  it('ingen abonnement → gratis', () => {
    expect(effektivPlan(null, naa)).toBe('gratis');
  });
  it('trialDagerIgjen runder opp og bunner i 0', () => {
    expect(trialDagerIgjen({ status: 'prøve', trial_ends_at: om(13.2) }, naa)).toBe(14);
    expect(trialDagerIgjen({ status: 'prøve', trial_ends_at: om(-1) }, naa)).toBe(0);
    expect(trialDagerIgjen({ status: 'aktiv' }, naa)).toBe(0);
  });
  it('erBetalende kun for privat/pro-tilgang', () => {
    expect(erBetalende({ status: 'aktiv', plan_id: 'privat' }, naa)).toBe(true);
    expect(erBetalende({ status: 'prøve', plan_id: 'privat', trial_ends_at: om(5) }, naa)).toBe(true);
    expect(erBetalende({ status: 'forfalt', plan_id: 'pro' }, naa)).toBe(false);
  });
});

describe('Pro inkluderte kontrakter (misbrukssikring)', () => {
  it('IKKE tilgjengelig i prøve, kun etter første betaling', () => {
    expect(inkluderteKontrakterTilgjengelig({ status: 'prøve', plan_id: 'gratis', trial_ends_at: new Date(Date.now() + 86_400_000).toISOString(), betalt_forste_gang: false })).toBe(false);
    expect(inkluderteKontrakterTilgjengelig({ status: 'aktiv', plan_id: 'pro', betalt_forste_gang: true })).toBe(true);
    expect(inkluderteKontrakterTilgjengelig({ status: 'aktiv', plan_id: 'privat', betalt_forste_gang: true })).toBe(false);
  });
});

describe('fakturering / livssyklus', () => {
  it('betalingsfeil: beholder tilgang til 3 forsøk er brukt opp', () => {
    expect(statusEtterBetalingsfeil(1)).toBe('betalingsproblem');
    expect(statusEtterBetalingsfeil(2)).toBe('betalingsproblem');
    expect(statusEtterBetalingsfeil(3)).toBe('forfalt');
  });
  it('kreditt trekkes maks fakturabeløpet', () => {
    expect(bruktKreditt(9900, 5000)).toEqual({ brukt: 5000, nettoOre: 4900 });
    expect(bruktKreditt(9900, 20000)).toEqual({ brukt: 9900, nettoOre: 0 });
    expect(bruktKreditt(9900, 0)).toEqual({ brukt: 0, nettoOre: 9900 });
  });
  it('nedgradering over grensen → over_grensen, ellers aktiv', () => {
    expect(statusVedNedgradering('privat', 7)).toBe('over_grensen');
    expect(statusVedNedgradering('privat', 5)).toBe('aktiv');
    expect(statusVedNedgradering('pro', 9999)).toBe('aktiv'); // ubegrenset
  });
});

describe('skjulte funksjoner', () => {
  it('alle skjulte funksjoner er av', () => {
    expect(funksjonPa('depositumskonto')).toBe(false);
    expect(funksjonPa('finn_publisering')).toBe(false);
    expect(funksjonPa('avtalegiro')).toBe(false);
    expect(funksjonPa('finnesikke')).toBe(false);
  });
});
