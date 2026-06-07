# Oppsett — Fase 1 (Google-innlogging + e-post)

Koden for Google-innlogging, e-postverifisering og passord-reset er deployet, men
**dormant** til du legger inn nøklene under i Vercel. Rate limiting virker uansett.

Etter at du har lagt inn nøkler: **Vercel → Project → Settings → Environment Variables**
(velg Production + Preview + Development), så **redeploy** (push til main, eller
`vercel --prod`). Miljøvariabler slår ikke inn før en ny deploy.

---

## 1. Google-innlogging (OAuth)

1. Gå til **https://console.cloud.google.com/** → opprett et prosjekt (eller velg et).
2. **APIs & Services → OAuth consent screen**: velg «External», fyll inn appnavn
   (EiendomsPRO), support-e-post og utviklerkontakt. Legg til scopes `openid`,
   `email`, `profile`. Legg deg selv til som testbruker (eller publiser appen).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** — legg til nøyaktig:
     - `https://eiendomspro.vercel.app/api/auth/google/callback`
     - (valgfritt for lokal test: `http://localhost:5173/...` virker ikke direkte
       siden /api kjører på Vercel — test Google i prod/preview)
   - For preview-deploys: legg til preview-domenet samme sted ved behov.
4. Kopier **Client ID** og **Client secret**.
5. Sett i Vercel:
   - `GOOGLE_CLIENT_ID` = client id-en
   - `GOOGLE_CLIENT_SECRET` = client secret-en
6. Redeploy. «Fortsett med Google» på innloggingssiden virker nå.

**Flyt:** `/api/auth/google/start` → Google-samtykke → `/api/auth/google/callback`
→ oppretter/kobler konto (matcher på verifisert e-post) → setter sesjon → `/app`.
state lagres i en kortlevd httpOnly-cookie og verifiseres i callback (CSRF-vern).

---

## 2. E-post (Resend) — verifisering + passord-reset

1. Opprett konto på **https://resend.com**.
2. **API Keys → Create API Key** → kopier nøkkelen.
3. (Anbefalt) **Domains** → legg til og verifiser ditt eget domene, så du kan sende
   fra f.eks. `noreply@dittdomene.no`. Uten eget domene kan du teste med Resends
   `onboarding@resend.dev` (begrenset).
4. Sett i Vercel:
   - `RESEND_API_KEY` = API-nøkkelen
   - `EPOST_FRA` = `EiendomsPRO <noreply@dittdomene.no>` (må matche verifisert avsender)
5. Redeploy. Nå sendes:
   - **verifiserings-e-post** ved registrering (og «Send på nytt» fra banneret i appen),
   - **passord-reset-lenke** fra «Glemt passord?».

Uten `RESEND_API_KEY` logges e-postene server-side (Vercel-logger) i stedet for å
sendes — resten av flyten virker, men brukeren får ikke lenken før Resend er koblet på.

---

## Verifisering etter oppsett

- Google: åpne innlogging → «Fortsett med Google» → skal lande i appen innlogget.
- Reset: «Glemt passord?» → skriv e-post → sjekk innboks → følg lenke → sett nytt passord.
- E-postbekreftelse: registrer ny konto → sjekk innboks → klikk lenke → banneret forsvinner.
- Rate limiting: mange feilede innlogginger fra samme IP → `429` (uten config også).
