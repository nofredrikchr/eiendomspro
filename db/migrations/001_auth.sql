-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 001 — Autentisering (Fase 0)
-- ════════════════════════════════════════════════════════════════════════════
-- Kjør i Neon → SQL Editor, eller:  psql "$DATABASE_URL" -f db/migrations/001_auth.sql
-- Idempotent (create if not exists). Tilgangskontroll håndheves i /api, ikke RLS.
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists citext;

do $$ begin
  create type app_rolle as enum ('utleier', 'leietaker');
exception when duplicate_object then null; end $$;

-- ── Brukere: én identitet / én innlogging per person ─────────────────────────
create table if not exists brukere (
  id                 uuid primary key default gen_random_uuid(),
  epost              citext unique,
  telefon            text unique,
  passord_hash       text,                       -- null hvis kun OAuth
  fullt_navn         text not null,
  niva               smallint not null default 1 check (niva in (1,2,3)),  -- 1 utleier, 2 leietaker, 3 admin
  primary_rolle      app_rolle,                  -- valgt ved registrering (null for admin)
  aktiv_modus        app_rolle,                  -- sist brukte modus; følger bruker på tvers av enheter
  epost_verifisert   boolean not null default false,
  telefon_verifisert boolean not null default false,
  status             text not null default 'aktiv' check (status in ('aktiv','suspendert','slettet')),
  opprettet          timestamptz not null default now(),
  oppdatert          timestamptz not null default now(),
  constraint epost_eller_telefon check (epost is not null or telefon is not null)
);

-- ── Roller (lazy-provisjonert: rad finnes kun når rollen er tatt i bruk) ──────
create table if not exists bruker_roller (
  bruker_id   uuid not null references brukere(id) on delete cascade,
  rolle       app_rolle not null,
  status      text not null default 'aktiv' check (status in ('aktiv','onboarding','suspendert')),
  onboardet   timestamptz,
  opprettet   timestamptz not null default now(),
  primary key (bruker_id, rolle)
);

-- ── Rolle-scoped offentlig profil ────────────────────────────────────────────
create table if not exists rolle_profiler (
  bruker_id    uuid not null references brukere(id) on delete cascade,
  rolle        app_rolle not null,
  visningsnavn text,
  bio          text,
  avatar_url   text,
  primary key (bruker_id, rolle),
  foreign key (bruker_id, rolle) references bruker_roller(bruker_id, rolle) on delete cascade
);

-- ── Sesjoner (opake, revokerbare; gir «logg ut overalt» + impersonering) ─────
create table if not exists sesjoner (
  id             uuid primary key default gen_random_uuid(),
  bruker_id      uuid not null references brukere(id) on delete cascade,
  token_hash     text not null unique,           -- SHA-256 av cookie-token (aldri klartekst)
  utloper        timestamptz not null,
  ip             text,
  user_agent     text,
  impersonert_av uuid references brukere(id),
  opprettet      timestamptz not null default now(),
  sist_brukt     timestamptz not null default now()
);
create index if not exists idx_sesjoner_bruker on sesjoner (bruker_id);
create index if not exists idx_sesjoner_utloper on sesjoner (utloper);

-- ── Føderert innlogging (Google m.fl.) — fylles i Fase 1 ─────────────────────
create table if not exists oauth_kontoer (
  bruker_id   uuid not null references brukere(id) on delete cascade,
  leverandor  text not null,                     -- 'google'
  ekstern_id  text not null,                     -- 'sub' fra OIDC
  epost       citext,
  opprettet   timestamptz not null default now(),
  primary key (leverandor, ekstern_id)
);

-- ── Engangs-tokens (verifisering / passord-reset) — brukes i Fase 1 ──────────
create table if not exists engangs_tokens (
  id          uuid primary key default gen_random_uuid(),
  bruker_id   uuid references brukere(id) on delete cascade,
  type        text not null check (type in ('epost_verifisering','telefon_verifisering','passord_reset')),
  token_hash  text not null,
  utloper     timestamptz not null,
  brukt       timestamptz,
  opprettet   timestamptz not null default now()
);
create index if not exists idx_engangs_bruker on engangs_tokens (bruker_id);
