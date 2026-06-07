-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 006 — Ut av localStorage / inn i Neon
-- ════════════════════════════════════════════════════════════════════════════
-- - analyser: lagrede boliganalyse-rapporter (eier-scoped JSONB, generisk CRUD)
-- - integrasjoner: per-utleier integrasjons-config (blob; KUN lest server-side)
-- - bruker_profil: brukerens profil-felter (blob)
-- Neon krypterer data at-rest. Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists analyser (
  id         uuid primary key default gen_random_uuid(),
  eier_id    uuid not null references brukere(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  opprettet  timestamptz not null default now(),
  oppdatert  timestamptz not null default now()
);
create index if not exists idx_analyser_eier on analyser (eier_id);

create table if not exists integrasjoner (
  eier_id   uuid primary key references brukere(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);

create table if not exists bruker_profil (
  eier_id   uuid primary key references brukere(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);
