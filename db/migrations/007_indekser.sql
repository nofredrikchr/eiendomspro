-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 007 — Manglende indekser for oppslagsmønstrene i /api
-- ════════════════════════════════════════════════════════════════════════════
-- Idempotent (create index if not exists).
-- ════════════════════════════════════════════════════════════════════════════

-- brukEngangsToken slår opp på token_hash (api/_auth/tokens.js) — uten indeks
-- blir det full tabellskann for hver verifisering/passord-reset.
create index if not exists engangs_tokens_token_hash_idx on engangs_tokens (token_hash);

-- Feedback-indeksene ble historisk opprettet via db/schema.sql; tas med her
-- slik at migrations/ alene gir komplett skjema (no-op der de alt finnes).
-- listSaker filtrerer på bruker_id og sorterer på oppdatert (api/_feedback/db.js).
create index if not exists idx_saker_bruker on feedback_saker (bruker_id);
create index if not exists idx_meldinger_sak on feedback_meldinger (sak_id);
create index if not exists feedback_saker_oppdatert_idx on feedback_saker (oppdatert desc);

-- hentStatistikk teller nye brukere per 7/30 dager (api/_admin/db.js), og
-- admin-brukerlisten sorterer på opprettet (api/_admin/db.js listBrukere).
create index if not exists brukere_opprettet_idx on brukere (opprettet desc);
