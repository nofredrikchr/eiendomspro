# STATUS — EiendomsPRO

Sist oppdatert: 2026-06-09

Levende statusdokument: hva som er gjort, hva som kjører nå, og hva som gjenstår.
Se også [AUTHPLAN.md](AUTHPLAN.md) for den detaljerte auth-planen og [README.md](README.md) for oppsett.

---

## TL;DR

- **Live i prod:** https://eiendomspro.vercel.app (Vercel + Neon).
- **Stack:** React 19 + Vite (SPA) · Vercel serverless `/api` · Neon PostgreSQL.
- **Innlogging kreves nå i prod** (Neon er koblet → ingen demo-modus). `brukere`-tabellen er tom — registrer deg for å komme inn.
- **Ferdig og verifisert i prod:** Fase 0 (auth), Fase 1 (Google/verifisering/reset/rate-limit), Fase 2 (modusbytte), Fase 3 (admin-panel + feedback→DB), og **steg e — ALLE entiteter migrert til Neon**.
- **Gjenstår:** admin-script (bootstrap første admin), Fase 4 (abonnement) + 5 (referral), og leietaker-auth for den token-baserte LeietakerPortal.
- **Fase 1 aktivering:** Google-innlogging og e-post (verifisering/reset) er deployet, men **dormant** til du legger nøkler i Vercel — se **SETUP-FASE1.md** (Google Cloud OAuth + Resend). Rate limiting virker uansett.
- **Admin-tilgang:** 0 admins finnes. Admin-panelet er bygget og gated, men for å logge inn må FØRSTE admin settes: `update brukere set niva=3 where epost='din@epost.no';`. NB: en admin-konto (niva=3) ser KUN admin-panelet.
- **ALT er ute av localStorage** (steg f): app-data, profil, integrasjons-config og boliganalyse-rapporter ligger nå i Neon (eier-scoped). AI-analyse går via server-proxy `/api/ai` (plattform-nøkkel `ANTHROPIC_API_KEY` i Vercel — dormant til satt). Eneste gjenværende nettleserlagring: `ssbKpi.js` cacher SSBs *offentlige* KPI-indeks i sessionStorage (offentlig referansedata, ikke app-data). Bilder lagres som base64 i DB (JSONB) — Vercel Blob er mulig forbedring.

---

## Infrastruktur

| Område | Status | Detaljer |
| --- | --- | --- |
| Hosting | ✅ | Vercel-prosjekt `eiendomspro` (scope: Fredrik's projects) |
| Git | ✅ | https://github.com/nofredrikchr/eiendomspro · `main`=prod, `dev`=preview |
| Auto-deploy | ✅ | Push til `main` → prod. Andre brancher → preview-URL. |
| Database | ✅ | Neon (Postgres) koblet via Vercel. `DATABASE_URL` server-side. |
| Backend | ✅ | Serverless functions i `/api`. Helsesjekk: `/api/health`. |
| Hemmeligheter | ✅ | Alle server-side. **Ingen `VITE_`-secrets** (de lekker til nettleseren). |

---

## Hva er gjort

### 1. Prosjektoppsett & opprydding
- Hentet prosjektet fra nedlasting, identifisert som norsk utleie/eiendoms-SaaS.
- Fikset Windows-inkompatible `node_modules` (var bygget på macOS) med ren `npm install`.

### 2. Flyttet til Vercel + Neon (vekk fra Supabase)
- Fjernet Supabase helt (klient, avhengighet, schema).
- Droppet alle `VITE_`-hemmeligheter; integrasjonstjenester (Signicat/Vipps/Nets/FINN) er stubber til de kobles server-side via `/api`.
- La til Neon-backend-fundament: `api/_db.js` (klient med fallback-kjede for DB-URL), `api/health.js`, `api/feedback.js` (eksempel-CRUD), `db/schema.sql`.
- `vercel.json` (Vite-bygg + SPA-rewrite som bevarer `/api`), oppdatert `.env.example`, `.gitignore`, `README.md`.
- Pinnet Node til 22.x i `package.json`.

### 3. Deploy & verifisering
- Opprettet Vercel-prosjektet via CLI, koblet GitHub-repoet, første prod-deploy.
- Neon lagt til via Vercel-dashbordet; `db/schema.sql` kjørt.
- Verifisert i prod: frontend (200), SPA deep-links, `/api/health` → `db.tilkoblet=true`, `/api/feedback` spørrbar.

### 4. Auth — Fase 0 (LIVE)
- **Datamodell** (`db/migrations/001_auth.sql`, kjørt i Neon): `brukere`, `bruker_roller`, `rolle_profiler`, `sesjoner`, `oauth_kontoer`, `engangs_tokens`.
- **Pure kjerne (TDD, 42 enhetstester):** `api/_auth/{telefon,token,passord,validering,cookie,roller,bruker}.js` — argon2id-hashing, opake SHA-256-sesjonstokens, e-post/telefon-validering, sikre cookies, og en test som garanterer at `passord_hash` aldri lekker.
- **API:** `api/auth/{register,login,logout,me}.js` + DB-lag `api/_auth/index.js` (opake, revokerbare cookie-sesjoner; `krevBruker`/`krevAdmin`).
- **Frontend:** `AuthContext` koblet til `/api/auth/*`; registreringsside med e-post *eller* telefon + passord + bekreft + primærrolle-valg (utleier/leietaker).
- **Verifisert ende-til-ende i prod:** register (201) → me → logout → login (200) → me → duplikat (409). Cookie er HttpOnly/Secure/SameSite=Lax.

### 5. Bygg & utleieenheter → Neon (LIVE)
- **Datamodell** (`db/migrations/002_eiendom.sql`, kjørt i Neon): `bygg` og `leieobjekter` — hvert domeneobjekt som JSONB i `data`, eid av `eier_id`, med `bygg_id` + `ON DELETE CASCADE` (sletting av bygg fjerner dets leieobjekter).
- **API:** `api/bygg` + `api/leieobjekter` (GET/POST/PUT/DELETE), eier-scopet via innlogget sesjon (`krevBruker`) — en bruker ser/endrer kun egne data.
- **Pure helper (TDD):** `api/_eiendom/form.js` `radTilObjekt` (rad-id/tid overstyrer data, lekker ikke `eier_id`/`bygg_id`).
- **Frontend:** `src/services/eiendomApi.js` + `AppContext` laster bygg/leieobjekter fra `/api` (async CRUD). Ingen seed/localStorage for disse — **nyregistrerte ser tom side**. Skjema og lister har lagrer-/feil- og loading-tilstand.
- **Verifisert i prod:** ny bruker → tom liste → opprett bygg (lagret i DB) → opprett leieobjekt → slett bygg → leieobjekt kaskadert bort.

### 6. Fase 1 / 2 / 3 / steg e (LIVE)
- **Fase 2 — modusbytte:** `/api/mode` (lazy rolle-provisjonering), `byttModus`, modus-veksler + modus-avhengig nav, `LeietakerHjem`.
- **Fase 3 — admin-panel:** `db/migrations/003_admin.sql`, `/api/admin/{stats,brukere,brukere/[id],logg}` (gated `niva=3`), AdminLayout/Dashboard/Brukere/Logg, gating i `App.jsx`. **3b:** feedback flyttet til Neon (`/api/feedback*`, admin-ser-alle/bruker-ser-egne).
- **Fase 1 — kontosikkerhet:** `004_rate_limit.sql`; rate limiting på login/register; passord-reset + e-postverifisering (Resend, dormant); Google-OAuth (`/api/auth/google/*`, dormant); `/reset`, `/verifiser`, verifiserings-banner.
- **Steg e — resten av entitetene:** `db/migrations/005_resten.sql` (kontrakter, fakturaer, annonser, meldinger, protokoller, notater, utlegg, utleiere + faktiske_tall-blob). Generisk `lagCrud`-fabrikk + 16 endepunkter + `entitetApi.js`. AppContext laster ALT fra `/api`. **Verifisert i prod:** kontrakter full CRUD, faktiske-tall-blob, meldinger, utleiere.
- NB: token-basert `LeietakerPortal` venter på leietaker-auth (egen jobb) — innloggede leietakere er ennå ikke koblet til kontrakter.

---

## Rollemodell (kort)

To akser som ikke kolliderer:
- **`niva`** (kontoklasse): `1`=utleier, `2`=leietaker, `3`=admin.
- **Modus** (Airbnb-stil): `primary_rolle` + `aktiv_modus` + lazy `bruker_roller` — vanlige brukere får begge moduser og bytter fritt (Fase 2, live).
- **Admin** er ortogonal staff-rettighet (`niva=3`), tildeles aldri ved registrering.

### Bli admin
Registrer konto, så i Neon SQL Editor:
```sql
update brukere set niva = 3 where epost = 'din@epost.no';
```
(Admin-panel + gating er live — Fase 3.)

---

## Gjenstår

### Auth-faser (se AUTHPLAN.md)
- ✅ **Fase 1, 2, 3** ferdige og verifisert i prod (se «Hva er gjort»).
- **Fase 4:** Abonnement (datamodell + admin-styring; betaling senere).
- **Fase 5:** Referral (vervekoder) + agent/partner-program med provisjon.
- Valgfrie Fase 3-utvidelser ikke bygget ennå: impersonering, GDPR-verktøy, abonnementsstatus i admin (kommer med Fase 4 / ved behov).
- **Admin-script** (steg d): `sett-admin.mjs` for å bootstrappe første admin uten manuell SQL.

### Andre større jobber
- ✅ **Datamigrering localStorage → Neon er FULLFØRT** — alle entiteter er nå eier-scopet i Neon (steg e). localStorage brukes ikke lenger for app-data (kun `storageExt` for integrasjons-config + `utleier_pro_ai_key` for AI-nøkkel i boliganalyse).
- **Leietaker-auth:** den token-baserte `LeietakerPortal` må knyttes til ekte leietaker-kontoer/datatilgang (innloggede leietakere ↔ kontrakter). Egen jobb.
- **Integrasjoner** Signicat/BankID, Vipps Faktura, Nets AvtaleGiro/eFaktura, FINN — server-side via `/api`.

### Kjente små hull
- Ugyldig JSON i en request gir tom 400 (nettleseren sender alltid gyldig JSON, så UI uberørt) — lett å herde.
- Store komponentfiler uten TypeScript/tester (fra opprinnelig kodebase). ByggSkjema/BoliganalyseKalkulator er fortsatt store.
- `eiendomspro.no`-domenet er ennå ikke koblet i Vercel → canonical/OG/Plausible i `index.html` er dormant til det gjøres.

---

## Hardening & opprydding (2026-06-10)

Full sikkerhets-/kvalitetsrevisjon (parallelle agenter) + opprydding. Lint er nå **helt ren** (var 71 feil), 80 tester grønne, og bundelen er kodesplittet (hovedchunk 1,53 MB → 267 kB; jspdf/xlsx/recharts lastes on-demand).

**Sikkerhet**
- **Google-OAuth kontoovertakelse tettet:** kobler ikke lenger Google-identitet til eksisterende konto via e-post uten `email_verified=true` (avviste tidligere ikke uverifisert e-post).
- Passord-reset **revokerer alle sesjoner**; rate limiting lagt på `/api/auth/reset` og `/verify` + per-mottaker-grense på request-reset; login bruker dummy-argon2 mot **timing-enumerering**.
- **Host-header-injeksjon** fjernet: reset-/verifiseringslenker og OAuth redirect_uri bruker `APP_URL` (fallback til host).
- **AI-proxy** (`/api/ai`): promptgrense (8000 tegn), per-bruker rate limit (20/t), eksplisitt `max_tokens`.
- **Security headers** i `vercel.json` (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS).
- 500-svar lekker ikke lenger `e.message`; `/api/health` lekker ikke DB-feil. Body-størrelsesvakt (413) mot JSONB-DoS.
- `npm audit --audit-level=critical` + Dependabot lagt til.

**Refaktor / robusthet**
- Felles HTTP-wrapper `api/_http.js` (`medBruker`/`medAdmin`): db-sjekk + metode + auth + størrelse + try/catch på ett sted. Alle endepunkter bruker den; responsformer uendret. `tpl()`-SQL-hacket erstattet med konvensjonelle `$1/$2`-kall (whitelist på tabellnavn beholdt). `hentSesjonsBruker` 3 → 1 DB-rundtur.
- Migrasjonsregister: `db/migrate.mjs` (+ `npm run migrate`) og `007_indekser.sql` (bl.a. `engangs_tokens.token_hash`).
- **AppContext:** fail-fast `Promise.all` → `allSettled` med per-entitet fallback, `lastefeil` + «Prøv igjen» (banner i Layout). Datataps-lås: lagrer ikke `faktiske_tall` hvis lastingen feilet.
- Code-splitting via `React.lazy` på alle ruter + dynamiske `import()` av PDF/Excel. Mørk laste-blink fjernet, catch-all-rute lagt til, fonter flyttet til `<link>` i head.
- A11y: `label`↔`input` via `useId`, aria-labels på ikon-knapper, fokus-synlige hover-knapper.
- Død kode slettet: `signicat.js`, `vippsFaktura.js`, `efaktura.js`, `App.css`, ubrukte assets. FINN-stub fabrikkerer ikke lenger falske koder (lagrer ærlig som kladd).
- Latent bug fikset: `stressKontantstrøm` manglet i Boliganalyse-returobjektet (stress-sjekk var alltid usann).

---

## Sandkasse for medarbeider (oppsett)

Mål: en ikke-teknisk medarbeider jobber via Claude Code på `dev`-branchen, tester i
Vercel-preview mot en isolert Neon-kopi, og åpner PR → Fredrik godkjenner → prod.
Fire kvalitetslag på hver PR: (1) CI lint/test/build, (2) automatisk Opus 4.8-review,
(3) Fredriks manuelle godkjenning, (4) `CLAUDE.md`-regler som forebygging.

### ✅ Gjort
- `CLAUDE.md` med bindende sikkerhets-/strukturregler (i repo-rot).
- `.github/workflows/ci.yml` — jobb `build-test-lint` (lint + vitest + build) på PR mot `main` og push til `dev`.
- `.github/workflows/claude-review.yml` — jobb `opus-review` (Opus 4.8 leser diffen, kommenterer) på PR mot `main`.
- `dev`-branch synket til `main` (= dagens prod).
- Repoet gjort **offentlig** (skannet rent for hemmeligheter først) → rulesets håndheves nå gratis.
- **Steg 3 — branch protection:** ruleset «Beskytt prod (main)», Active: krever PR + 1 approval + status-checks `build-test-lint` og `opus-review`.

### ⬜ Steg 4 — Gi medarbeider tilgang til repoet
GitHub → repo → **Settings → Collaborators → Add people** → hans GitHub-bruker →
rolle **Write**. Han må akseptere e-postinvitasjonen. Write lar ham pushe til `dev`
og åpne PR-er; branch protection hindrer merge til `main`.

### ⬜ Steg 5 — Sandkasse-database + nøkler
- **5a Neon:** konsoll → prosjekt → **Branches → Create branch** `dev` (kopierer prod-data). Kopier connection string (pooled).
- **5b Vercel:** prosjekt → **Settings → Environment Variables** → sett `DATABASE_URL` for **Preview** = `dev`-strengen fra 5a. La **Production** beholde prod-strengen. Da bruker alle previews/PR-er dev-databasen; prod røres aldri fra sandkassen.
- **5c GitHub-secret:** repo → **Settings → Secrets and variables → Actions → New repository secret** → navn `ANTHROPIC_API_KEY`, verdi Anthropic-nøkkel. Uten denne kjører ikke `opus-review`.

### ⬜ Steg 6 — Medarbeiderens maskin (gjøres sammen via skjermdeling)
Installer Git, Node 22, Claude Code. Logg inn i Git mot GitHub (evt. GitHub Desktop).
`git clone` → `git checkout dev`. Lag `.env` (kopi av `.env.example`) med **dev**-`DATABASE_URL`.
Daglig flyt: snakk med Claude Code → den pusher til `dev` → test preview-URL → be om PR til Fredrik.

### Verifisering (anbefalt etter steg 5)
Åpne en liten test-PR fra `dev` → main for å se at `build-test-lint` + `opus-review`
kjører og at sperren krever din godkjenning.

---

## Nyttige kommandoer

```bash
npm run dev        # lokal utvikling
npm test           # vitest (auth-kjernen)
npm run build      # produksjonsbygg
# Deploy skjer automatisk ved push til main; manuelt:
vercel --prod --yes --scope fredriks-projects-bb04e476
```
