# Abonnement, pris, betaling & verving — design

Skrevet 2026-06-14. Bygger videre på `AUTHPLAN.md` (Fase 4–5), men erstatter
plan-navn/priser og verve-mekanikk med den nye, mer detaljerte spesifikasjonen.

> **Besluttet med Fredrik:** Én samlet leveranse (én stor PR med alt A–M).
> Eksterne integrasjoner (Stripe, Vipps, Signicat/BankID, Resend, cron) bygges bak
> et rent adapter-grensesnitt med **stub/mock** bak feature-flagg, slik at alt virker
> i preview uten live nøkler. Når Fredrik er klar leveres en **detaljert
> oppsettsguide** for å koble på ekte nøkler.

## 1. Prinsipper

- **Server er sannhet, klient er UX.** All gating håndheves server-side i `/api`.
  Klient-gating (gråtoning/modaler) er kun for opplevelsen.
- **Data slettes aldri ved nedgradering.** Alt er allerede eier-scopet JSONB i Neon.
  Degradering = lås UI-funksjoner. Gjenopptakelse = øyeblikkelig full tilgang (punkt L).
- **Én kilde til pris/feature-sannhet:** `src/lib/planer.js` (ren, uten React/secrets;
  priser er offentlige). Importeres både av klient og av `/api`.
- **Alle priser i NOK inkl. mva**, lagres i **øre** (heltall) i DB og konfig.

## 2. Planer (sentral konfig — `src/lib/planer.js`)

| Plan | Mnd | År | Objektgrense | Innhold |
| --- | --- | --- | --- | --- |
| `gratis` | 0 | 0 | 1 | Kun netto kontantstrøm + brutto/netto yield |
| `privat` | 99 kr | 990 kr | 5 | Alle analyser låst opp |
| `pro` | 199 kr | 1 990 kr | ∞ | Alt i Privat + AS-modus, alle rapporter, prioritert support |

Årspris i konfig = `10 × månedspris` (990/1990). Markedsføres som «2 måneder gratis».
Besparelse = `2 × månedspris`.

**Features (gates):** `prognose`, `investeringsanalyse`, `budsjett_vs_faktisk`,
`sammenligning`, `bankrapport`, `as_modus`, `kpi_varsling`, `bankid_signering`.

`canUse(feature, plan)` → bool. `objectLimit(plan)` → 1 | 5 | Infinity.
Gratis får `kontantstrom` + `yield` (alltid true).

**Skjulte feature-flagg (punkt J, alle `false`, helt skjult i UI):**
`auto_faktura_kid`, `avtalegiro`, `purringer`, `depositumskonto`,
`depositumsgaranti`, `flytteprotokoll_signering`, `finn_publisering`.

## 3. Datamodell — migrasjon `db/migrations/008_abonnement.sql`

- `planer` (id, navn, pris_mnd_ore, pris_aar_ore, objektgrense, aktiv) + seed 3 rader.
- `abonnement` (bruker_id, plan_id, status `prøve|aktiv|forfalt|kansellert|over_grensen`,
  faktureringsintervall `mnd|aar`, `gjeldende_slutt`, `trial_ends_at`,
  `stripe_customer_id`, `stripe_subscription_id`, betalt_forste_gang bool).
- `abonnement_hendelser` (ledger: opprettet/trial_start/betalt/status_endret/degradert/…).
- `kontrakt_signeringer` (engangskjøp: bruker_id, kontrakt_id, status, pris_ore,
  leverandor_kostnad_ore, signert_dokument_url, signert_tidspunkt) — egen fra abonnement,
  alltid nedlastbar.
- `vervekoder` (kode pk, bruker_id) — kunde-til-kunde.
- `verving` (kode, verver_id, vervet_id unik, status `registrert|betalende|innfridd`,
  belonning_verver_ore, belonning_vervet_ore).
- `partnere` (navn, epost, referral_code unik, provisjon_pct=25, rabatt_pct=20,
  rabatt_mnd=3, status).
- `partner_verving` (partner_id, bruker_id unik, rabatt_til).
- `partner_provisjon_ledger` (partner_id, bruker_id, periode, brutto_betalt_ore,
  provisjon_ore, status `opptjent|utbetalt|reversert`).
- `konto_kreditt` (bruker_id pk, saldo_ore) + `kreditt_hendelser` (ledger; verving,
  bruk-mot-faktura). Kreditt forsvinner aldri (punkt I2/L).
- `kpi_varsler` (kontrakt_id, bruker_id, status, gjeldende_leie_ore, kpi_ref,
  foreslatt_ikrafttredelse, sendt_tidspunkt).

Kontrakt-felter for KPI lagres i kontraktens JSONB: `contract_start_date`,
`last_rent_adjustment_date`.

## 4. Trial & livssyklus (punkt D, E, K, L)

- **Registrering:** opprett `abonnement` plan=`gratis`, status=`prøve`,
  `trial_ends_at = now()+14d`. Ingen kort. Bruker får full Pro-tilgang i prøveperioden.
- **Effektiv plan** beregnes server-side: `prøve` (ikke utløpt) → Pro-tilgang;
  `aktiv` → betalt plan; ellers (`forfalt`/utløpt prøve/`kansellert` etter periode) →
  `gratis`. `over_grensen` → lese Privat-tilgang, men ikke opprette nye objekter.
- **Degradering** (utløpt prøve / kansellert ut periode / 3 feilede trekk): sett
  status, behold ALL data. UI gråtones med «Lås opp igjen».
- **Pro→Privat med >5 objekter:** status `over_grensen` — lese alt, ikke opprette nytt.
- **Gjenopptakelse:** ny/gjenopptatt betaling → status `aktiv` → alt umiddelbart åpent.
- **Trial-e-poster:** dag 7, 12, 14 (siste tilbyr årlig «2 måneder gratis»). Via cron +
  Resend-adapter (stub uten nøkkel).

## 5. Betaling (punkt H) — adapter + stub

- `api/_betaling/` med `betalingsAdapter` (Stripe Billing + Vipps som metode).
  Operasjoner: `opprettCheckout`, `kundeportalUrl`, `kanseller`, `verifiserWebhook`.
- **Stub-adapter** (default, ingen nøkkel): simulerer checkout (redirect til en
  intern «betalt»-callback i preview), så hele flyten kan demonstreres.
- Webhooks `api/webhooks/stripe.js`: `invoice.paid` (aktiver, lås opp Pro-kontrakter,
  utløs verve-/partnerbelønning, trekk kreditt), `invoice.payment_failed`
  (status `forfalt`, 3 gjenforsøk, varsle), `customer.subscription.deleted`
  (degrader ut periode). HMAC/signatur verifiseres.
- Lagrer aldri kortdata selv.

## 6. BankID-kontraktsignering (punkt F) — adapter + stub

- Pris: gratisbruker 199 kr, betalende (privat/pro) 49 kr.
- **Misbrukssikring:** de 2 «inkluderte» Pro-kontraktene låses i prøveperioden —
  først tilgjengelig etter `betalt_forste_gang=true`. I prøve koster signering 49 kr.
- **Kortkrav:** signering krever registrert kort selv om abonnementsprøven er kortløs.
  Mangler kort → be om kort (Stripe SetupIntent, stub) før signering.
- `signeringsAdapter` (Signicat) stub. Logger `leverandor_kostnad_ore≈3000` for margin.
- Signerte kontrakter alltid nedlastbare, uavhengig av abonnementsstatus.

## 7. Verving

**I1 Partner:** registrering med gyldig `referral_code` → 20 % rabatt i 3 mnd +
permanent `referred_by_partner_id`. 25 % provisjon av faktisk betalt (eks. mva, etter
rabatt) løpende mens kunden betaler. Ledger + månedlig utbetalingsrapport.
Reversering ved refusjon. Partner-dashboard.

**I2 Kunde-til-kunde:** hver betalende bruker får personlig vervelenke. Verver får 2 mnd
gratis (kreditt = 2× plan-pris) når vervet blir betalende og første faktura klarert;
vervet får 1 mnd gratis på første abonnement. Belønning utløses ved første betalte
faktura. Ingen øvre grense. Egen «Verv en venn»-side (lenke, kopier, del e-post/SMS/
Facebook, teller, status per verving). Oppfordring i meny + etter verdiøyeblikk
(bankrapport/lønnsomhetsanalyse). Kreditt trekkes automatisk fra neste faktura(er) og
forsvinner aldri.

## 8. KPI-varsling (punkt G, inkludert i Privat + Pro)

Daglig cron finner kontrakter der ≥12 mnd siden siste regulering/start, henter KPI fra
SSB, lager varselutkast i god tid. «Send varsel til leietaker» genererer korrekt varsel
(dagens leie, KPI-ref, ikrafttredelse ≥1 kalendermåned frem, husleieloven § 4-2) og
logger sending. Kun betalende; pauses ved nedgradering, historikk bevares.

## 9. Frontend

- `PlanContext` (eller utvid `AuthContext`): eksponer `plan`, `effektivPlan`,
  `trialDagerIgjen`, `canUse()`, `objektgrense`, `kreditt`.
- `<LåstFunksjon feature>`: viser barn gråtonet med overlay «Lås opp med Privat/Pro» +
  knapp til `/priser`. Synlig, ikke skjult.
- `<OppgraderingsModal>`: ved objektgrense og andre gates.
- Trial-teller-banner «X dager igjen av Pro-prøven».
- `/priser`-side (punkt M). Nav-lenker til `/priser`, `/verv`, evt. `/partner`.
- Bruk i `BoliganalyseKalkulator` (prognose, investering, budsjett-vs-faktisk,
  sammenligning, bankrapport, AS-modus) + objektgrense ved oppretting av leieobjekt.

## 10. Sikkerhet (CLAUDE.md-regler)

Hvert nytt `/api`-endepunkt: `krevBruker`/`medBruker` (401), eier-scoping på all data,
parametriserte spørringer/whitelist, ingen `VITE_`-secrets, `offentligBruker` for
brukerdata. Webhook-endepunkter har ingen sesjon men verifiserer leverandør-signatur.

## 11. Rekkefølge (commits i én PR)

1. plans-konfig + tester → 2. migrasjon 008 → 3. server abonnement-lag + trial + sesjon
→ 4. betalings-/BankID-adapter (stub) + webhooks → 5. frontend plan-context → 6. gating-UI
+ Boliganalyse + objektgrense → 7. /priser → 8. verving (kunde) → 9. partner → 10. KPI
→ 11. BankID-signering UI → 12. cron + skjulte flagg → 13. oppsettsguide → 14. lint/test/build.
