-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 003 — Admin (revisjonslogg)
-- ════════════════════════════════════════════════════════════════════════════
-- Kjør i Neon. Idempotent. Admin = niva 3 på brukere (fra migrasjon 001).
-- Alle muterende admin-handlinger logges her for sporbarhet.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists admin_logg (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references brukere(id) on delete cascade,
  handling    text not null,              -- 'endre_niva', 'endre_status', 'gi_gratis_maaned', ...
  mal_bruker  uuid references brukere(id) on delete set null,
  detaljer    jsonb,
  tidspunkt   timestamptz not null default now()
);
create index if not exists idx_admin_logg_admin on admin_logg (admin_id);
create index if not exists idx_admin_logg_mal on admin_logg (mal_bruker);
create index if not exists idx_admin_logg_tid on admin_logg (tidspunkt desc);
