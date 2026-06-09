# EiendomsPRO — arbeidsregler

Utleie-SaaS. **Vite + React 19 (JavaScript/JSX, ikke TypeScript)** som SPA, med
backend som **Vercel serverless functions i `/api`** mot **Neon (Postgres)**.
Hosting: Vercel. Database: Neon. Språk i kode og UI: **norsk**.

## Arbeidsflyt (viktig)

- Jobb ALLTID på `dev`-branchen. Push aldri direkte til `main` — `main` er prod.
- Når noe er ferdig og testet i preview: lag en Pull Request fra `dev` til `main`
  og be om godkjenning. Det er Fredrik som merger til prod.
- Commit i små, beskrivende steg på norsk.

## Sikkerhetsregler (BRYT ALDRI)

Disse er ufravikelige. Brytes en av dem, blir PR-en ikke merget.

1. **Innlogging på hvert endepunkt.** Hver fil i `/api` (som er et endepunkt) MÅ
   kalle `krevBruker(req)` og returnere `401` hvis bruker ikke er innlogget.
   Mønster: se f.eks. `api/leieobjekter/index.js`.

2. **Eier-scoping på ALL data.** Hver databasespørring MÅ filtrere på `eier_id`
   (`okt.bruker.id`). En bruker skal aldri kunne se/endre/slette andres rader via
   `id` alene. `update`/`delete` skal alltid ha `where id = ${id} and eier_id = ${eierId}`.

3. **Parametriserte spørringer.** Bruk Neon tagged templates: ``sql`... ${verdi}` ``.
   ALDRI bygg SQL ved å lime sammen strenger med brukerinput. Tabellnavn kommer kun
   fra whitelist-settene i `api/_eiendom/db.js` — aldri fra brukerinput.

4. **Hemmeligheter kun server-side.** Database-URL, API-nøkler osv. leses kun i `/api`.
   Gi ALDRI en hemmelighet `VITE_`-prefiks — `VITE_`-variabler bakes inn i
   nettleser-bundelen og blir offentlige. Se `.env.example`.

5. **Aldri lekk sensitive brukerfelter.** Bruker-objekter som sendes til klienten MÅ
   gå gjennom `offentligBruker()` (`api/_auth/bruker.js`). Send aldri `passord_hash`
   eller andre sensitive kolonner.

## Strukturregler

- **Følg eksisterende mønstre.** Nye entiteter bruker de generiske, eier-scopede
  CRUD-handlerne i `api/_eiendom/handler.js` + `db.js`. Kopier mønsteret fra en
  eksisterende entitet i stedet for å finne opp noe nytt.
- **Norsk navngiving** i koden: `feil`, `okt`, `bruker`, `eier`, `leieobjekt` osv.
- **Ingen localStorage for ekte data.** All vedvarende data ligger i Neon via `/api`.
  localStorage er kun til rene UI-preferanser (om noe).
- **Tester:** vitest, lagt ved siden av koden som `*.test.js` (se `api/_auth/*.test.js`).
  Ny `/api`-logikk bør ha tester der det er rimelig.

## Sjekk før du lager PR

Kjør lokalt og rett opp før du ber om godkjenning:

```bash
npm run lint
npm test
npm run build
```

Alle tre må være grønne. De kjøres uansett automatisk på PR-en (GitHub Actions),
og i tillegg leser Opus 4.8 gjennom diffen og kommenterer. Begge må se bra ut før
Fredrik merger til prod.
