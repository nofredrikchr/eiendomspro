# EiendomsPRO

SaaS-verktøy for norske utleiere/eiendomsforvaltere: bygg, leieobjekter,
leiekontrakter, husleiefakturering med KID, boliganalyse, overtakelsesprotokoll,
KPI-regulering, annonser, meldinger og leietakerportal.

- **Frontend:** React 19 + Vite + React Router + Tailwind
- **Backend:** Vercel serverless functions (`/api`) mot **Neon** (PostgreSQL)
- **Hosting:** Vercel

> Status: appen kjører i dag i lokal modus (localStorage). Neon-backend og
> innlogging kobles på trinnvis — fundamentet ligger klart i `/api` og `/db`.

## Kom i gang lokalt

```bash
npm install
cp .env.example .env   # fyll inn DATABASE_URL (valgfritt i lokal modus)
npm run dev
```

Appen kjører på http://localhost:5173. Uten `.env` fungerer alt mot
localStorage; `/api`-endepunktene krever en Neon-database (se under).

## Miljøvariabler

Alle hemmeligheter er **server-side** og ligger i `.env` (git-ignorert).
Ingen er prefikset `VITE_` — det er bevisst, så de aldri havner i
nettleser-bundelen. Se [.env.example](.env.example) for full liste.

| Variabel | Brukes av | Påkrevd |
| --- | --- | --- |
| `DATABASE_URL` | `/api` (Neon) | for backend-funksjoner |
| `SIGNICAT_*`, `VIPPS_*`, `NETS_*`, `FINN_*` | kommende integrasjoner | nei (stub) |

## Neon (database)

1. Opprett prosjekt på https://neon.tech (region: Europe).
2. Kjør skjemaet: `psql "$DATABASE_URL" -f db/schema.sql` (eller lim inn
   [db/schema.sql](db/schema.sql) i Neon SQL Editor).
3. Kopier "Connection string" (pooled) til `DATABASE_URL` i `.env` og i
   Vercel → Project → Settings → Environment Variables.

## Backend (`/api`)

Serverless functions kjøres av Vercel. Filer som starter med `_` er delt kode,
ikke egne endepunkter.

- `api/_db.js` — Neon-klient (`sql`-tag)
- `api/health.js` — `GET /api/health` (verifiserer at DB svarer)
- `api/feedback.js` — eksempel-CRUD som viser mønsteret for videre migrering

Verifiser etter deploy:

```bash
curl https://<ditt-domene>/api/health
```

## Deploy (Vercel)

Prosjektet er konfigurert i [vercel.json](vercel.json) (Vite-bygg + SPA-rewrite
som lar `/api/*` gå til serverless functions). Push til `main` deployer
produksjon; `dev`-branchen gir preview-deploys.

## Git-flyt

- `main` — produksjon (beskyttet)
- `dev` — felles utviklingsbranch

Vi er to på prosjektet: jobb på feature-brancher fra `dev`, slå sammen til
`dev`, og `dev → main` når noe skal i produksjon.

## Skripter

| Kommando | Hva |
| --- | --- |
| `npm run dev` | Utviklingsserver |
| `npm run build` | Produksjonsbygg til `dist/` |
| `npm run preview` | Forhåndsvis produksjonsbygg |
| `npm run lint` | ESLint |
