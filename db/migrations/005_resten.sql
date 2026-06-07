-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 005 — Resten av entitetene til Neon (eier-scoped, JSONB)
-- ════════════════════════════════════════════════════════════════════════════
-- Samme mønster som bygg/leieobjekter: domeneobjektet i `data` (jsonb), eid av
-- eier_id. Referanser mellom entiteter (f.eks. kontrakt.leieobjektId) ligger
-- løst inne i data, ikke som kolonne-FK (som i appen). Idempotent.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array['kontrakter','fakturaer','annonser','meldinger','protokoller','notater','utlegg','utleiere']
  loop
    execute format($f$
      create table if not exists %I (
        id         uuid primary key default gen_random_uuid(),
        eier_id    uuid not null references brukere(id) on delete cascade,
        data       jsonb not null default '{}'::jsonb,
        opprettet  timestamptz not null default now(),
        oppdatert  timestamptz not null default now()
      )$f$, t);
    execute format('create index if not exists idx_%s_eier on %I (eier_id)', t, t);
  end loop;
end $$;

-- faktiskeTall: én blob per bruker (nøkkel→{inntekt,kostnad}).
create table if not exists faktiske_tall (
  eier_id   uuid primary key references brukere(id) on delete cascade,
  data      jsonb not null default '{}'::jsonb,
  oppdatert timestamptz not null default now()
);
