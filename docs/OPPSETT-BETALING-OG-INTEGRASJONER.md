# Oppsett: betaling, BankID, e-post og cron

Hele abonnements-, betalings- og vervemodellen kjører i **stub-modus** uten nøkler,
så alt kan testes i preview. Denne guiden viser hvordan du kobler på de ekte
tjenestene. Alle hemmeligheter settes som **Environment Variables i Vercel**
(Project → Settings → Environment Variables) — aldri med `VITE_`-prefiks, og aldri
committet til git.

> Etter at du har lagt inn nøkler: redeploy prosjektet slik at funksjonene plukker
> dem opp. Verifiser med en testbruker før du skrur det på i prod.

---

## 0. Kjør databasemigrasjonen

Den nye modellen krever migrasjon `db/migrations/008_abonnement.sql`.

```bash
# DATABASE_URL må peke på riktig Neon-database
npm run migrate
```

Dette oppretter tabellene `planer`, `abonnement`, `kontrakt_signeringer`, `vervekoder`,
`verving`, `partnere`, `partner_verving`, `partner_provisjon_ledger`, `konto_kreditt`,
`kreditt_hendelser`, `kpi_varsler` og seeder de tre planene.

---

## 1. Stripe Billing (abonnement) + Vipps

EiendomsPRO bruker **Stripe Billing** for gjentakende abonnement, med **Vipps** som
betalingsmetode i tillegg til kort. Vi lagrer aldri kortdata selv.

### 1.1 Opprett konto og produkter
1. Lag konto på <https://dashboard.stripe.com> (norsk selskap, NOK).
2. **Products → Add product** — opprett to produkter: «Privat» og «Pro».
3. For hvert produkt, lag to **Prices** (recurring):
   - Privat: 99 kr/mnd og 990 kr/år
   - Pro: 199 kr/mnd og 1 990 kr/år
   - Valuta NOK, inkl. mva håndteres via Stripe Tax eller egne mva-innstillinger.
4. Noter `price_…`-IDene.

### 1.2 Aktiver Vipps
- **Settings → Payment methods** → aktiver **Vipps** (krever Vipps-avtale; følg
  Stripe sin veiledning). Vipps vises da automatisk i Checkout.

### 1.3 Installer pakken og sett nøkler
```bash
npm i stripe
```
Vercel env:
```
STRIPE_SECRET_KEY=sk_live_…           # (sk_test_… i preview)
STRIPE_WEBHOOK_SECRET=whsec_…         # fra steg 1.4
STRIPE_PRICE_PRIVAT_MND=price_…
STRIPE_PRICE_PRIVAT_AAR=price_…
STRIPE_PRICE_PRO_MND=price_…
STRIPE_PRICE_PRO_AAR=price_…
APP_URL=https://eiendomspro.vercel.app
```
> Så snart `STRIPE_SECRET_KEY` finnes, slås stub-modus av automatisk og ekte
> Checkout/Portal brukes.

### 1.4 Webhook
1. **Developers → Webhooks → Add endpoint**: `https://<din-app>/api/webhooks/stripe`
2. Velg events: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.deleted`, `charge.refunded`.
3. Kopier «Signing secret» → `STRIPE_WEBHOOK_SECRET`.

### 1.5 Customer Portal
- **Settings → Billing → Customer portal** → aktiver. Da virker «Administrer i
  kundeportal» (oppdatere kort, gjenforsøk, si opp).

### 1.6 CSP / headers (viktig)
I `vercel.json` må Stripe tillates når betaling skrus på:
- `connect-src` + `frame-src`: legg til `https://*.stripe.com https://*.stripe.network`
- `script-src`: legg til `https://js.stripe.com`
- `Permissions-Policy`: endre `payment=()` → `payment=(self "https://js.stripe.com")`

---

## 2. BankID-signering (Signicat)

Engangssignering av leiekontrakt. Stub signerer «umiddelbart»; ekte bruk krever Signicat.

1. Opprett avtale på <https://www.signicat.com> (BankID for norske kontrakter).
2. Sett env:
   ```
   SIGNICAT_CLIENT_ID=…
   SIGNICAT_CLIENT_SECRET=…
   SIGNICAT_BASE_URL=…
   ```
3. Implementer de to TODO-kallene i `api/_signering/index.js` (`startSignering`,
   `hentSignertDokument`) mot Signicat sitt signerings-API. Resten (pris 49/199 kr,
   kortkrav, Pro-inkludert-lås, marginlogging ~30 kr) er allerede på plass.
4. Faktisk leverandørkostnad logges i `kontrakt_signeringer.leverandor_kostnad_ore`
   for marginrapport — juster `BANKID_LEVERANDOR_KOSTNAD_ORE` i `src/lib/planer.js`
   til reell pris.

> Merk: BankID-signering krever et registrert kort (Stripe). Kortløse brukere blir
> bedt om å registrere kort først — dette virker så snart Stripe (steg 1) er på plass.

---

## 3. E-post (Resend) — trial-varsler m.m.

Brukes til verifiserings-e-post og prøveperiode-e-postene (dag 7/12/14).

1. Opprett konto på <https://resend.com>, verifiser avsenderdomenet.
2. Env:
   ```
   RESEND_API_KEY=re_…
   EPOST_FRA=EiendomsPRO <noreply@dittdomene.no>
   ```
> Uten nøkkel logges e-postene kun server-side (ingenting sendes), resten av flyten
> virker.

---

## 4. Cron-jobber (Vercel Cron)

`vercel.json` definerer to daglige jobber:
- `/api/cron/kpi` kl. 06:00 UTC — lager KPI-varselutkast for betalende.
- `/api/cron/trial-epost` kl. 07:00 UTC — sender prøveperiode-e-poster.

Sikre dem med en hemmelighet:
```
CRON_SECRET=<lang tilfeldig streng>
```
Vercel sender automatisk `Authorization: Bearer $CRON_SECRET` med cron-kallene, og
endepunktene avviser kall uten riktig secret. (Uten `CRON_SECRET` kjører de åpent —
greit i preview, men sett den i prod.)

Du kan teste manuelt:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<din-app>/api/cron/kpi
```

---

## 5. Partnere (Eiendomsmalen o.l.)

Partnere opprettes av admin:
```
POST /api/admin/partnere   { "navn": "Eiendomsmalen", "epost": "…" }
```
Systemet genererer en unik `referral_code`. Del lenken
`https://<din-app>/register?partner=<KODE>` med partneren. Kunder som registrerer seg
med koden får 20 % rabatt i 3 mnd, og partneren tjener 25 % provisjon (eks. mva) så
lenge kunden betaler. Rapport: `GET /api/admin/provisjon-rapport?periode=YYYY-MM-DD`.

---

## 6. Hurtig-sjekkliste for prod

- [ ] `npm run migrate` kjørt mot prod-Neon
- [ ] Stripe-nøkler + price-IDer + webhook satt, `npm i stripe` kjørt
- [ ] Vipps aktivert i Stripe
- [ ] CSP/Permissions-Policy oppdatert for Stripe
- [ ] Signicat-nøkler satt og adapter-TODO implementert (hvis BankID skal live)
- [ ] Resend-nøkkel + avsenderdomene
- [ ] `CRON_SECRET` satt
- [ ] `APP_URL` satt til prod-URL
- [ ] Testbruker gjennom hele flyten (prøve → betal → verv → si opp → meld inn igjen)
