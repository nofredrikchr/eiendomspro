# AUTHPLAN — Autentisering, roller, admin, abonnement & referral

Plan for innlogging og rollesystem i EiendomsPRO (React 19 SPA + Vercel
serverless `/api` + Neon Postgres). Skrevet 2026-06-07.

> Status før denne planen: appen kjører i demo-modus (localStorage), `AuthContext`
> returnerer en fast `DEMO_BRUKER`, `Login.jsx`/route-vakt finnes som stubs, og
> `feedback_saker`/`admin_brukere` ligger allerede i Neon (`db/schema.sql`).

> **Fremdrift — Fase 0 implementert** (branch `feature/auth-phase0`):
> - Pure auth-kjerne TDD-et: `api/_auth/{telefon,token,passord,validering,cookie,roller,bruker}.js` — **42 enhetstester grønne**.
> - Migrasjon `db/migrations/001_auth.sql` (brukere, bruker_roller, rolle_profiler, sesjoner, oauth_kontoer, engangs_tokens).
> - DB-lag `api/_auth/index.js` + endepunkter `api/auth/{register,login,logout,me}.js` (argon2id, opake cookie-sesjoner).
> - Frontend: `AuthContext` koblet til `/api/auth/*`, `Login.jsx` (e-post/telefon + passord + primærrolle-valg).
> - Bygg grønt, Fase 0-filer lint-rene. **Gjenstår før prod:** kjøre migrasjonen i Neon + integrasjonstester mot test-DB + manuell røyktest mot preview (kap. 9). Google-OAuth/verifisering er Fase 1.

---

## 1. Mål

1. **Airbnb-stil dobbeltrolle:** Én konto er *både* utleier og leietaker og kan
   switche modus fritt. Primærrolle velges ved registrering, men låser ingenting.
2. **Tre brukernivåer:** `niva` 1 = utleier, 2 = leietaker, 3 = admin.
3. **Admin-panel:** Kun for `niva=3`. Tilgang *bare* til admin-flater
   (tilbakemeldinger, statistikk, abonnementsstatus, gratis-måneder, referral/agent).
4. **Abonnement:** Datamodell + admin-styring nå, ekte betaling i senere fase.
5. **Referral:** Vervekoder (bruker→bruker) **og** agent/partner-program med provisjon.

---

## 2. Avklarte beslutninger (fra brainstorm)

| Tema | Beslutning |
| --- | --- |
| Rollemodell | **Modus + separat admin.** To akser: (a) modus `utleier`/`leietaker` (begge kan provisjoneres, fritt switchbar), (b) admin som ortogonal, *tildelt* staff-rettighet. `niva` 1/2 = vanlig bruker (valgt primærmodus), 3 = admin-staff. |
| Innlogging | **E-post *eller* telefon + passord**, samt **Google** (OAuth/OIDC) som alternativ. |
| Abonnement | **Datamodell + admin-styring nå**, betaling (Stripe/Vipps) senere. |
| Referral | **Begge:** vervekoder for alle + eget agent/partner-program med provisjonssporing. |

### 2.1 Forening av «3 nivåer» og «Airbnb-switching» (kjernen)
De to kravene lever på **ulike akser**, og det er nettopp det som gjør at de ikke
kolliderer:

- **`niva` (smallint)** er kontoens *klasse*: `1`=utleier-bruker, `2`=leietaker-bruker,
  `3`=admin. Den er kun «1 vs 2» for å speile brukerens **primærrolle**; den styrer
  ikke hva en vanlig bruker får lov til (begge moduser er tilgjengelige).
- **`primary_rolle` + `aktiv_modus` + `bruker_roller`** styrer Airbnb-switchingen.
  En `niva=1`-bruker har `primary_rolle='utleier'`, men kan provisjonere
  `leietaker`-rollen og switche når som helst.
- **`niva=3` (admin)** er staff. Admins har **ingen** utleier/leietaker-flater —
  de sendes til admin-panelet og stoppes server-side fra app-API-et.

Dette gir deg «3 user levels» som etterspurt, samtidig som vanlige brukere får ekte
Airbnb-dobbeltrolle.

---

## 3. Datamodell (Neon / PostgreSQL)

Norske identifikatorer for å matche eksisterende skjema (`feedback_saker`,
`bruker_id`, `admin_brukere`). Leveres som nummererte migrasjoner i `db/migrations/`.

### 3.1 Identitet, roller, sesjoner (Fase 0–1)
```sql
create extension if not exists citext;

create type app_rolle as enum ('utleier', 'leietaker');

-- Én identitet / én innlogging per person
create table brukere (
  id              uuid primary key default gen_random_uuid(),
  epost           citext unique,                    -- minst én av epost/telefon kreves
  telefon         text unique,                      -- normalisert (+47…) i app-laget
  passord_hash    text,                             -- null hvis kun OAuth
  fullt_navn      text not null,
  niva            smallint not null default 1 check (niva in (1,2,3)),  -- 1 utleier, 2 leietaker, 3 admin
  primary_rolle   app_rolle,                        -- valgt ved registrering (null for admin)
  aktiv_modus     app_rolle,                        -- sist brukte modus; følger bruker på tvers av enheter
  epost_verifisert    boolean not null default false,
  telefon_verifisert  boolean not null default false,
  status          text not null default 'aktiv' check (status in ('aktiv','suspendert','slettet')),
  opprettet       timestamptz not null default now(),
  oppdatert       timestamptz not null default now(),
  constraint epost_eller_telefon check (epost is not null or telefon is not null)
);

-- Roller provisjoneres LAZILY: rad finnes kun når brukeren har tatt i bruk rollen
create table bruker_roller (
  bruker_id     uuid not null references brukere(id) on delete cascade,
  rolle         app_rolle not null,
  status        text not null default 'aktiv' check (status in ('aktiv','onboarding','suspendert')),
  onboardet     timestamptz,
  opprettet     timestamptz not null default now(),
  primary key (bruker_id, rolle)
);

-- Rolle-scoped offentlig profil (Airbnb «Profile»-konsept: ulik per rolle)
create table rolle_profiler (
  bruker_id    uuid not null references brukere(id) on delete cascade,
  rolle        app_rolle not null,
  visningsnavn text,
  bio          text,
  avatar_url   text,
  primary key (bruker_id, rolle),
  foreign key (bruker_id, rolle) references bruker_roller(bruker_id, rolle) on delete cascade
);

-- Opake sesjoner (revokerbare, gir «logg ut overalt» + admin-impersonering)
create table sesjoner (
  id            uuid primary key default gen_random_uuid(),
  bruker_id     uuid not null references brukere(id) on delete cascade,
  token_hash    text not null unique,               -- SHA-256 av cookie-token (aldri lagre token i klartekst)
  utloper       timestamptz not null,
  ip            text,
  user_agent    text,
  -- impersonering: satt når en admin er logget inn SOM denne brukeren
  impersonert_av uuid references brukere(id),
  opprettet     timestamptz not null default now(),
  sist_brukt    timestamptz not null default now()
);
create index on sesjoner (bruker_id);
create index on sesjoner (utloper);

-- Føderert innlogging (Google m.fl.)
create table oauth_kontoer (
  bruker_id    uuid not null references brukere(id) on delete cascade,
  leverandor   text not null,                       -- 'google'
  ekstern_id   text not null,                       -- 'sub' fra OIDC
  epost        citext,
  opprettet    timestamptz not null default now(),
  primary key (leverandor, ekstern_id)
);

-- Engangs-tokens (e-post/telefon-verifisering, passord-reset, magisk lenke senere)
create table engangs_tokens (
  id           uuid primary key default gen_random_uuid(),
  bruker_id    uuid references brukere(id) on delete cascade,
  type         text not null check (type in ('epost_verifisering','telefon_verifisering','passord_reset')),
  token_hash   text not null,
  utloper      timestamptz not null,
  brukt        timestamptz,
  opprettet    timestamptz not null default now()
);
```

**`admin_brukere` (eksisterende)** beholdes/erstattes: admin uttrykkes som `niva=3`
på `brukere`. Migrasjon flytter evt. eksisterende `admin_brukere`-rader til `niva=3`,
og `er_admin()`-bruk i `feedback`-API-et erstattes av en `niva=3`-sjekk server-side.

### 3.2 Abonnement (Fase 4 — data + admin nå, betaling senere)
```sql
create table planer (
  id           text primary key,                    -- 'gratis','pro','portefolje'
  navn         text not null,
  pris_mnd_ore integer not null default 0,
  aktiv        boolean not null default true
);

create table abonnement (
  id             uuid primary key default gen_random_uuid(),
  bruker_id      uuid not null references brukere(id) on delete cascade,
  plan_id        text not null references planer(id),
  status         text not null check (status in ('prove','aktiv','forfalt','kansellert','komp')),
  gjeldende_slutt timestamptz,                       -- når inneværende periode utløper
  gratis_til     timestamptz,                        -- gratis-måneder forskyver dette
  opprettet      timestamptz not null default now(),
  oppdatert      timestamptz not null default now()
);
create index on abonnement (bruker_id);
create index on abonnement (status);

-- Hendelseslogg/«ledger» for fakturering, gratis-måneder, komp osv.
create table abonnement_hendelser (
  id            uuid primary key default gen_random_uuid(),
  abonnement_id uuid not null references abonnement(id) on delete cascade,
  type          text not null,                       -- 'opprettet','gratis_maaned','komp','status_endret','betalt'
  detaljer      jsonb,
  utfort_av     uuid references brukere(id),         -- admin som ga gratis-måned, e.l.
  tidspunkt     timestamptz not null default now()
);
```

### 3.3 Referral + agent (Fase 5)
```sql
create table vervekoder (
  kode         text primary key,                     -- f.eks. 'FREDRIK-7K3Q'
  bruker_id    uuid not null references brukere(id) on delete cascade,
  opprettet    timestamptz not null default now()
);

create table verving (
  id            uuid primary key default gen_random_uuid(),
  kode          text not null references vervekoder(kode),
  verver_id     uuid not null references brukere(id),
  vervet_id     uuid not null references brukere(id) unique,  -- en bruker kan kun verves én gang
  belonning_verver_mnd  integer not null default 1,
  belonning_vervet_mnd  integer not null default 1,
  status        text not null default 'ventende' check (status in ('ventende','innfridd','annullert')),
  opprettet     timestamptz not null default now()
);

create table agenter (
  id            uuid primary key default gen_random_uuid(),
  bruker_id     uuid references brukere(id),          -- valgfri kobling til en konto
  navn          text not null,
  epost         citext,
  provisjon_pct numeric(5,2) not null default 0,
  agentkode     text unique not null,
  status        text not null default 'aktiv' check (status in ('aktiv','inaktiv')),
  opprettet     timestamptz not null default now()
);

create table agent_provisjoner (
  id            uuid primary key default gen_random_uuid(),
  agent_id      uuid not null references agenter(id) on delete cascade,
  bruker_id     uuid references brukere(id),          -- onboardet kunde
  belop_ore     integer not null default 0,
  status        text not null check (status in ('opptjent','utbetalt','annullert')),
  periode       date,
  opprettet     timestamptz not null default now()
);
```

### 3.4 Revisjonslogg (Fase 3 — admin)
```sql
create table admin_logg (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references brukere(id),
  handling    text not null,                          -- 'gi_gratis_maaned','endre_niva','impersonering_start','slett_bruker'…
  mal_bruker  uuid references brukere(id),
  detaljer    jsonb,
  tidspunkt   timestamptz not null default now()
);
create index on admin_logg (admin_id);
create index on admin_logg (mal_bruker);
```

> **Domeneobjekter (bygg, leieobjekter, kontrakter, annonser …)** scopes til
> `eier_id uuid references brukere(id)` (utleier-siden) og kontrakter knytter
> `utleier_id`/`leietaker_id`. Dette gjøres som del av den separate
> **datamigreringen** (localStorage→Neon) og forutsetter denne auth-planen.

---

## 4. Autentisering & sikkerhet

- **Identifikator:** e-post *eller* telefon. App-laget normaliserer telefon til E.164
  (+47…) før oppslag. Minst én av dem kreves (DB-constraint).
- **Passord:** hashes med **argon2id** (`argon2` npm), aldri i klartekst, aldri
  returnert i API-svar. Minstekrav (lengde/zxcvbn-styrke) håndheves server-side.
- **Sesjon:** opakt token (32 tilfeldige bytes) i **httpOnly + Secure + SameSite=Lax**
  cookie. Kun SHA-256-hash lagres i `sesjoner`. Hvert `/api`-kall slår opp sesjonen i
  Neon (revokerbart; gir «logg ut overalt» og impersonering). Utløp + glidende
  forlengelse av `sist_brukt`.
- **CSRF:** SameSite=Lax dekker de fleste tilfeller; for muterende kall legges et
  dobbel-innsendt CSRF-token (cookie + header) på toppen.
- **Google OAuth (OIDC):** Authorization Code-flyt via en `/api/auth/google/*`-rute
  (server-side token-veksling; client_secret server-side). Kobler `sub`→`oauth_kontoer`;
  matcher på verifisert e-post for å koble til eksisterende konto.
- **Rate limiting:** på `login`, `register`, `passord_reset` (per IP + per
  identifikator). Enkel teller i Neon eller Vercel KV.
- **Verifisering:** e-post/telefon-verifisering via `engangs_tokens` (e-post: Resend/
  Postmark; SMS: senere via Nets/LINK). Innlogging tillates, men visse handlinger
  kan kreve verifisert kontakt.
- **Admin:** `niva=3` settes **kun** av en annen admin (eller manuelt i DB for første
  admin) — aldri via registrering. Alle admin-muterende handlinger logges i `admin_logg`.
- **Server-side håndheving:** rolle/nivå sjekkes i hvert `/api`-endepunkt (delt
  `krevBruker()`/`krevAdmin()`/`krevModus()`-hjelper). Klient-vakter er kun UX.

---

## 5. API-flate (`/api`)

Delt kode i `api/_auth.js` (sesjonsoppslag, `krevBruker`, `krevAdmin`, cookie-hjelpere)
+ `api/_db.js` (finnes).

| Endepunkt | Metode | Funksjon |
| --- | --- | --- |
| `/api/auth/register` | POST | Opprett konto (epost/telefon + passord + primærrolle) |
| `/api/auth/login` | POST | Logg inn, sett sesjons-cookie |
| `/api/auth/logout` | POST | Revoker gjeldende sesjon |
| `/api/auth/me` | GET | Gjeldende bruker + roller + aktiv_modus (driver `AuthContext`) |
| `/api/auth/google/start` · `/callback` | GET | Google OIDC |
| `/api/auth/verify` · `/request-reset` · `/reset` | POST | Verifisering & passord-reset |
| `/api/mode` | POST | Bytt `aktiv_modus`; lazy-provisjoner rolle ved behov |
| `/api/roller/aktiver` | POST | «Bli utleier» / «Finn bolig» (provisjoner rolle + onboarding) |
| `/api/admin/feedback*` | GET/POST | Tilbakemeldinger (gjenbruker `feedback_saker`) |
| `/api/admin/stats` | GET | Nøkkeltall (registreringer, MAU, konvertering, churn …) |
| `/api/admin/brukere*` | GET/POST | Søk/se/endre nivå/suspender, GDPR-eksport/slett |
| `/api/admin/abonnement*` | GET/POST | Status, gi gratis-måneder, komp |
| `/api/admin/referral*` · `/api/admin/agenter*` | GET/POST | Verving + agent/provisjon |
| `/api/admin/impersonering` | POST | Start/stopp «logg inn som bruker» (logges) |

Alle `/api/admin/*` starter med `krevAdmin(req)` → 403 hvis ikke `niva=3`.

---

## 6. Frontend

- **`AuthContext` (omskrives):** henter `/api/auth/me`, eksponerer `bruker`,
  `innlogget`, `laster`, `niva`, `roller`, `aktivModus`, `byttModus()`,
  `aktiverRolle()`, `loggInn/registrer/loggUt`. Erstatter dagens `DEMO_BRUKER`.
- **`Login.jsx` / `Register`:** e-post *eller* telefon + passord, Google-knapp, og
  ved registrering ett lavfriksjons-valg: «Jeg vil **leie ut**» vs «Jeg vil **leie**»
  → setter `primary_rolle` + `aktiv_modus`.
- **Rute-vakt (`App.jsx`):** redirect til `/login` når ikke innlogget; `niva=3`
  sendes til `/admin` og stoppes fra app-ruter; app-brukere stoppes fra `/admin`.
- **Modus-veksler:** i konto-menyen øverst til høyre på *hver* skjerm. Etikett =
  destinasjon («Bytt til utleier»/«Bytt til leietaker»). Har brukeren kun én rolle,
  vis lazy-CTA («Bli utleier»/«Finn bolig å leie») i stedet. `role="switch"` +
  `aria-checked`, tydelig nåværende modus (tekst + farge, ikke farge alene).
- **Rolle-spesifikke dashboards:** hele navigasjonen/landingssiden byttes ved
  modusskifte (ikke bare filtrering av ett delt layout — den #1-dokumenterte
  markedsplass-UX-feilen). Utleier ser bygg/kontrakter/annonser; leietaker ser
  leieforhold/betaling/meldinger.
- **`active_mode` server-persistert:** følger bruker på tvers av enheter (slår
  Airbnb/Fiverr som ikke husker sist brukte modus).
- **Admin-app:** egen layout (`/admin/*`), ingen utleier/leietaker-chrome.
- **Leietakerportal-bro:** dagens token-lenke (`/leietaker/:token`) beholdes for
  lettvekts-leietakere, men tilbyr «opprett konto» som kobler token→ny `brukere`-rad
  med `leietaker`-rolle.

---

## 7. Admin-panel — omfang

**Med i planen (fase 3 om ikke annet):**
1. **Tilbakemeldinger** — gjenbruker `feedback_saker`/`feedback_meldinger`; triage,
   status, og **belønning→gratis-måneder** (kobler `belonning`-kolonnen til abonnement).
2. **Statistikk** — registreringer over tid, aktive brukere (DAU/MAU), konvertering
   gratis→betalt, churn, antall bygg/kontrakter/annonser, KPI-bruk.
3. **Abonnementsstatus** — liste + filtrering på status, gi gratis-måneder/komp.
4. **Brukeradministrasjon** — søk, se konto, endre `niva`, suspendere, tvungen reset.
5. **Impersonering** («logg inn som bruker») — med banner og full `admin_logg`-spor.
6. **Revisjonslogg** — alle admin-handlinger.
7. **Referral/agent** — vervinger, agent-provisjoner, utbetalingsstatus, leaderboard.
8. **GDPR-verktøy** — eksport + sletting av brukerdata.

**Foreslått, men markert valgfritt (YAGNI til behov melder seg):**
- Innholdsmoderering av annonser før publisering.
- Kringkasting/systembanner + feature-flags.
- Varsel-/e-postlogg.
- Admin-underroller (super-admin vs read-only support).

---

## 8. Implementeringsfaser

Hver fase er selvstendig deploybar og avsluttes med verifisering (kap. 9).

| Fase | Innhold | Avhenger av |
| --- | --- | --- |
| **0 — Fundament** | Migrasjoner (`brukere`, `bruker_roller`, `rolle_profiler`, `sesjoner`); `api/_auth.js`; `/api/auth/register|login|logout|me`; argon2; cookie-sesjon; `AuthContext` omskrevet; rute-vakt; Login/Register med e-post/telefon+passord | — |
| **1 — Føderering & kontosikkerhet** | Google OIDC; e-post/telefon-verifisering; passord-reset; rate limiting; CSRF | Fase 0 |
| **2 — Dobbeltrolle (Airbnb)** | `aktiv_modus` + lazy `bruker_roller`; `/api/mode`, `/api/roller/aktiver`; modus-veksler; rolle-spesifikke dashboards/nav | Fase 0 |
| **3 — Admin-panel** | `niva=3`-gating; admin-layout; feedback (gjenbruk); statistikk; brukeradmin; impersonering + `admin_logg`; GDPR | Fase 0 |
| **4 — Abonnement (data+admin)** | `planer`, `abonnement`, `abonnement_hendelser`; admin-visning/styring; gratis-måneder koblet til feedback-belønning | Fase 3 |
| **5 — Referral & agent** | `vervekoder`, `verving`, `agenter`, `agent_provisjoner`; vervekode-UI for brukere; admin-oppfølging/utbetaling | Fase 3, 4 |
| **(senere) — Betaling** | Stripe/Vipps abonnementsbetaling + webhooks | Fase 4 |

---

## 9. Verifiseringsrutiner

Innfør **Vitest** (prosjektet har ingen tester i dag). Hver fase har: automatiske
tester, manuell røyktest mot preview-deploy, og en eksplisitt sikkerhets-sjekkliste.
Ingen fase regnes som ferdig før alle tre er grønne.

### 9.1 Felles oppsett
- `npm i -D vitest supertest` + `npm run test`-skript.
- Test-DB: egen Neon-branch (`test`) via `DATABASE_URL` i CI; migrasjoner kjøres før test.
- CI: GitHub Actions kjører `npm run lint && npm test && npm run build` på PR mot `dev`.

### 9.2 Automatiske tester (per fase)
**Fase 0**
- Enhet: argon2 hash/verify; sesjons-token generering + SHA-256-oppslag; `krevBruker`.
- API: `register` (suksess; duplikat epost→409; mangler epost+telefon→400);
  `login` (riktig/feil passord); `me` (med/uten cookie); `logout` revokerer sesjon.
- Sikkerhet: respons inneholder **aldri** `passord_hash`; cookie er `HttpOnly`+`Secure`.

**Fase 1**
- Google-callback oppretter/kobler `oauth_kontoer`; verifiseringstoken
  engangsbruk + utløp; reset-flyt; rate limiter blokkerer etter N forsøk.

**Fase 2**
- `/api/mode` setter `aktiv_modus`; bytte til uprovisjonert rolle oppretter
  `bruker_roller`-rad (`onboarding`); `me` reflekterer ny modus.
- Datascoping: utleier-modus ser kun egne utleier-objekter; leietaker-modus ser ikke
  utleier-objekter.

**Fase 3**
- `krevAdmin`: `niva<3`→403 på alle `/api/admin/*`. Impersonering skriver `admin_logg`
  og setter `impersonert_av`. GDPR-eksport returnerer brukerens data; sletting
  anonymiserer/sletter.

**Fase 4–5**
- Gratis-måned forskyver `gratis_til` og skriver `abonnement_hendelser`.
- Verving: dobbel verving av samme bruker avvises (unik `vervet_id`); belønning
  utløses; agent-provisjon beregnes korrekt.

### 9.3 Manuell røyktest (mot preview-URL)
```bash
BASE=https://<preview>.vercel.app
# Registrer + logg inn (cookie-jar)
curl -c jar.txt -X POST $BASE/api/auth/register -H 'content-type: application/json' \
  -d '{"epost":"test@x.no","passord":"…","fulltNavn":"Test","primaryRolle":"utleier"}'
curl -b jar.txt $BASE/api/auth/me                      # → bruker + niva + aktivModus
curl -b jar.txt -X POST $BASE/api/mode -d '{"modus":"leietaker"}'
curl -b jar.txt $BASE/api/me                           # → aktivModus=leietaker
curl $BASE/api/admin/stats                             # → 401/403 uten admin-cookie
```
+ I nettleser: registrer, switch modus (nav/dashboard skifter helt), reload (modus
  huskes), logg ut (beskyttede ruter redirecter).

### 9.4 Sikkerhets-sjekkliste (gate før merge til main)
- [ ] Ingen hemmeligheter i klienten (ingen `VITE_`-secrets); alle nøkler server-side.
- [ ] `passord_hash` aldri i noe API-svar; passord aldri logget.
- [ ] Alle `/api/admin/*` håndhever `niva=3` server-side (verifisert med 403-test).
- [ ] App-API håndhever eierskap (bruker A når ikke bruker B sine objekter).
- [ ] Cookies: `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF-token på muterende kall.
- [ ] Rate limiting aktiv på login/register/reset.
- [ ] Admin tildeles aldri via registrering; alle admin-handlinger i `admin_logg`.
- [ ] `npm run build` grønt; `/api/health` fortsatt `db.tilkoblet=true`.

---

## 10. Åpne spørsmål / risiko

1. **E-postutsending** (verifisering/reset) krever en leverandør (Resend/Postmark).
   Hvilken? Påvirker fase 1. SMS-verifisering kan utsettes til Nets/LINK er på plass.
2. **Google OAuth-credentials** må opprettes i Google Cloud Console (server-side
   `GOOGLE_CLIENT_ID/SECRET` i Vercel) — en manuell dashboard-jobb.
3. **Eksisterende `LeietakerPortal`-token** vs ekte kontoer — planen foreslår å
   beholde begge; bekreft at det er ønsket.
4. **Datamigrering avhenger av dette:** å scope bygg/kontrakter til `eier_id` er en
   egen jobb som bør tas rett etter fase 0–2.
5. **Rekkefølge fase 2 vs 3:** begge avhenger kun av fase 0 og kan tas parallelt.

---

## 11. Utenfor scope (bevisst utelatt nå)

- Ekte abonnementsbetaling (kort/Vipps) — egen senere fase.
- BankID/Signicat som innloggingsmetode — kommer med signerings-integrasjonen.
- 2FA/TOTP, SSO for bedrifter, admin-underroller — legges til ved behov (YAGNI).
