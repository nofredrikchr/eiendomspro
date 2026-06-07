-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 004 — Rate limiting
-- ════════════════════════════════════════════════════════════════════════════
-- Enkel teller per nøkkel (f.eks. "login:ip" eller "reset:epost") i et tidsvindu.
-- engangs_tokens (verifisering/reset) finnes alt fra migrasjon 001.
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists rate_limit (
  nokkel        text primary key,
  teller        integer not null default 0,
  vindu_utloper timestamptz not null
);
create index if not exists idx_rate_limit_utloper on rate_limit (vindu_utloper);
