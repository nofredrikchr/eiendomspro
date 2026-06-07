-- ════════════════════════════════════════════════════════════════════════════
-- EiendomsPRO — databaseskjema (Neon / PostgreSQL)
-- ════════════════════════════════════════════════════════════════════════════
-- Kjør i Neon → SQL Editor, eller:
--   psql "$DATABASE_URL" -f db/schema.sql
--
-- Merk: Tilgangskontroll håndteres i serverlaget (/api), ikke med Postgres RLS.
-- Kolonnen bruker_id kobles til ekte brukere når Neon-auth er på plass.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Feedback / support-saker ────────────────────────────────────────────────
create table if not exists feedback_saker (
  id            uuid primary key default gen_random_uuid(),
  bruker_id     uuid,
  bruker_navn   text,
  bruker_epost  text,
  type          text not null check (type in ('feil','onske','sporsmal')),
  tittel        text not null,
  beskrivelse   text not null,
  status        text not null default 'ny' check (status in ('ny','under_arbeid','lost','avvist')),
  belonning     jsonb,                      -- { beskrivelse, maaneder, gitt }
  opprettet     timestamptz not null default now(),
  oppdatert     timestamptz not null default now()
);

-- ── Meldinger (chat-tråd per sak) ───────────────────────────────────────────
create table if not exists feedback_meldinger (
  id           uuid primary key default gen_random_uuid(),
  sak_id       uuid not null references feedback_saker (id) on delete cascade,
  avsender     text not null check (avsender in ('bruker','admin')),
  type         text not null default 'melding' check (type in ('melding','status','belonning')),
  tekst        text,
  meta         jsonb,
  lest_bruker  boolean not null default false,
  lest_admin   boolean not null default false,
  tidspunkt    timestamptz not null default now()
);

create index if not exists idx_meldinger_sak on feedback_meldinger (sak_id);
create index if not exists idx_saker_bruker on feedback_saker (bruker_id);

-- ── Admin-brukere ───────────────────────────────────────────────────────────
create table if not exists admin_brukere (
  bruker_id uuid primary key
);

-- ── Hold "oppdatert" fersk på saken når ny melding kommer ────────────────────
create or replace function touch_sak() returns trigger as $$
begin
  update feedback_saker set oppdatert = now() where id = new.sak_id;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_touch_sak on feedback_meldinger;
create trigger trg_touch_sak after insert on feedback_meldinger
  for each row execute function touch_sak();
