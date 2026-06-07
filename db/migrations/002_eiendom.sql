-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 002 — Bygg & utleieenheter (eier-scoped, JSONB)
-- ════════════════════════════════════════════════════════════════════════════
-- Kjør i Neon → SQL Editor, eller via skript mot DATABASE_URL. Idempotent.
-- Flytter bygg + leieobjekter fra nettleserens localStorage til Neon.
-- Hver rad eies av en bruker (eier_id). Selve domeneobjektet ligger som JSONB
-- i `data` (bevarer dagens objektform eksakt og tåler skjemaendringer).
-- Tilgangskontroll håndheves i /api (eier_id = innlogget bruker).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists bygg (
  id         uuid primary key default gen_random_uuid(),
  eier_id    uuid not null references brukere(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  opprettet  timestamptz not null default now(),
  oppdatert  timestamptz not null default now()
);
create index if not exists idx_bygg_eier on bygg (eier_id);

create table if not exists leieobjekter (
  id         uuid primary key default gen_random_uuid(),
  eier_id    uuid not null references brukere(id) on delete cascade,
  -- Sletting av et bygg fjerner automatisk dets leieobjekter (som i dagens app).
  bygg_id    uuid references bygg(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  opprettet  timestamptz not null default now(),
  oppdatert  timestamptz not null default now()
);
create index if not exists idx_leieobjekter_eier on leieobjekter (eier_id);
create index if not exists idx_leieobjekter_bygg on leieobjekter (bygg_id);
