-- ════════════════════════════════════════════════════════════════════════════
-- Migrasjon 008 — Abonnement, betaling, BankID-signering, verving & KPI-varsling
-- ════════════════════════════════════════════════════════════════════════════
-- Bygger på AUTHPLAN Fase 4–5, men med oppdatert plan-/pris-/vervemodell.
-- Alle beløp lagres i ØRE (heltall). Eier-scoping via bruker_id/eier_id på alt.
-- Idempotent (create table if not exists / on conflict).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Planer (sentral pris-tabell; speiles av src/lib/planer.js) ─────────────────
create table if not exists planer (
  id            text primary key,                 -- 'gratis' | 'privat' | 'pro'
  navn          text not null,
  pris_mnd_ore  integer not null default 0,
  pris_aar_ore  integer not null default 0,
  objektgrense  integer,                          -- null = ubegrenset (Pro)
  aktiv         boolean not null default true
);

insert into planer (id, navn, pris_mnd_ore, pris_aar_ore, objektgrense) values
  ('gratis', 'Gratis', 0, 0, 1),
  ('privat', 'Privat', 9900, 99000, 5),
  ('pro',    'Pro',    19900, 199000, null)
on conflict (id) do update
  set navn = excluded.navn,
      pris_mnd_ore = excluded.pris_mnd_ore,
      pris_aar_ore = excluded.pris_aar_ore,
      objektgrense = excluded.objektgrense;

-- ─── Abonnement (én rad per bruker) ─────────────────────────────────────────────
create table if not exists abonnement (
  id                     uuid primary key default gen_random_uuid(),
  bruker_id              uuid not null unique references brukere(id) on delete cascade,
  plan_id                text not null references planer(id) default 'gratis',
  status                 text not null default 'prøve'
                           check (status in ('prøve','aktiv','betalingsproblem','forfalt','kansellert','over_grensen')),
  faktureringsintervall  text not null default 'mnd' check (faktureringsintervall in ('mnd','aar')),
  trial_ends_at          timestamptz,             -- reverse trial (14 dager Pro)
  gjeldende_slutt        timestamptz,             -- når betalt periode utløper
  betalt_forste_gang     boolean not null default false,  -- låser opp Pro-inkluderte kontrakter (F)
  feilede_trekk          smallint not null default 0,     -- gjenforsøk ved betalingsproblem (K)
  stripe_customer_id     text,
  stripe_subscription_id text,
  har_kort               boolean not null default false,  -- kort registrert (kreves for BankID)
  opprettet              timestamptz not null default now(),
  oppdatert              timestamptz not null default now()
);
create index if not exists idx_abonnement_status on abonnement (status);
create index if not exists idx_abonnement_trial on abonnement (trial_ends_at);

-- Hendelseslogg / ledger for abonnementet (revisjon + feilsøking)
create table if not exists abonnement_hendelser (
  id            uuid primary key default gen_random_uuid(),
  bruker_id     uuid not null references brukere(id) on delete cascade,
  type          text not null,   -- 'opprettet','trial_start','betalt','status_endret','degradert','oppgradert','kort_lagt_til',...
  detaljer      jsonb,
  utfort_av     uuid references brukere(id),  -- admin ved manuell handling
  tidspunkt     timestamptz not null default now()
);
create index if not exists idx_abonnement_hendelser_bruker on abonnement_hendelser (bruker_id);

-- ─── BankID-kontraktsignering (engangskjøp, separat fra abonnement) ──────────────
create table if not exists kontrakt_signeringer (
  id                     uuid primary key default gen_random_uuid(),
  eier_id                uuid not null references brukere(id) on delete cascade,
  kontrakt_id            uuid references kontrakter(id) on delete set null,
  status                 text not null default 'opprettet'
                           check (status in ('opprettet','venter_betaling','venter_signering','signert','avbrutt')),
  pris_ore               integer not null default 0,        -- 49 eller 199 kr (eller 0 hvis Pro-inkludert)
  inkludert              boolean not null default false,     -- brukte en av Pro-ens 2 inkluderte
  leverandor_kostnad_ore integer not null default 0,         -- ~30 kr (intern marginrapport)
  betaling_ref           text,
  signering_ref          text,                               -- Signicat-referanse
  signert_dokument_url   text,                               -- alltid nedlastbar etterpå
  signert_tidspunkt      timestamptz,
  opprettet              timestamptz not null default now(),
  oppdatert              timestamptz not null default now()
);
create index if not exists idx_signeringer_eier on kontrakt_signeringer (eier_id);

-- ─── Verving kunde-til-kunde (I2) ───────────────────────────────────────────────
create table if not exists vervekoder (
  kode       text primary key,                    -- f.eks. 'FREDRIK-7K3Q'
  bruker_id  uuid not null unique references brukere(id) on delete cascade,
  opprettet  timestamptz not null default now()
);

create table if not exists verving (
  id                   uuid primary key default gen_random_uuid(),
  kode                 text not null references vervekoder(kode),
  verver_id            uuid not null references brukere(id) on delete cascade,
  vervet_id            uuid not null unique references brukere(id) on delete cascade,  -- kun vervet én gang
  status               text not null default 'registrert'
                         check (status in ('registrert','betalende','innfridd','annullert')),
  belonning_verver_ore integer not null default 0,  -- 2 mnd (settes ved innfrielse)
  belonning_vervet_ore integer not null default 0,  -- 1 mnd
  opprettet            timestamptz not null default now(),
  innfridd_tidspunkt   timestamptz,
  check (verver_id <> vervet_id)
);
create index if not exists idx_verving_verver on verving (verver_id);

-- ─── Partner-/agentverving (I1 — Eiendomsmalen o.l.) ────────────────────────────
create table if not exists partnere (
  id            uuid primary key default gen_random_uuid(),
  navn          text not null,
  epost         citext,
  bruker_id     uuid references brukere(id),       -- valgfri kobling til en konto
  referral_code text not null unique,
  provisjon_pct numeric(5,2) not null default 25,
  rabatt_pct    numeric(5,2) not null default 20,
  rabatt_mnd    smallint not null default 3,
  status        text not null default 'aktiv' check (status in ('aktiv','inaktiv')),
  opprettet     timestamptz not null default now()
);

create table if not exists partner_verving (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partnere(id) on delete cascade,
  bruker_id   uuid not null unique references brukere(id) on delete cascade,  -- permanent merking
  rabatt_til  timestamptz,                          -- 20 % rabatt i 3 mnd
  opprettet   timestamptz not null default now()
);
create index if not exists idx_partner_verving_partner on partner_verving (partner_id);

create table if not exists partner_provisjon_ledger (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references partnere(id) on delete cascade,
  bruker_id         uuid references brukere(id),     -- kunden provisjonen gjelder
  periode           date,
  brutto_betalt_ore integer not null default 0,      -- faktisk betalt (inkl. mva, etter rabatt)
  provisjon_ore     integer not null default 0,      -- 25 % av betalt eks. mva
  status            text not null default 'opptjent' check (status in ('opptjent','utbetalt','reversert')),
  opprettet         timestamptz not null default now()
);
create index if not exists idx_provisjon_partner on partner_provisjon_ledger (partner_id);

-- ─── Kontokreditt (vervebelønning; forsvinner ALDRI — I2/L) ─────────────────────
create table if not exists konto_kreditt (
  bruker_id  uuid primary key references brukere(id) on delete cascade,
  saldo_ore  integer not null default 0,
  oppdatert  timestamptz not null default now()
);

create table if not exists kreditt_hendelser (
  id          uuid primary key default gen_random_uuid(),
  bruker_id   uuid not null references brukere(id) on delete cascade,
  endring_ore integer not null,                      -- positiv = opptjent, negativ = brukt mot faktura
  arsak       text not null,                         -- 'verving_verver','verving_vervet','brukt_faktura',...
  detaljer    jsonb,
  tidspunkt   timestamptz not null default now()
);
create index if not exists idx_kreditt_hendelser_bruker on kreditt_hendelser (bruker_id);

-- ─── KPI-varsling (G — leieregulering) ──────────────────────────────────────────
create table if not exists kpi_varsler (
  id                     uuid primary key default gen_random_uuid(),
  eier_id                uuid not null references brukere(id) on delete cascade,
  kontrakt_id            uuid not null references kontrakter(id) on delete cascade,
  status                 text not null default 'utkast' check (status in ('utkast','sendt','avvist')),
  gjeldende_leie_ore     integer,
  ny_leie_ore            integer,
  kpi_ref                text,                       -- f.eks. 'KPI mai 2025 → mai 2026: +3,1 %'
  foreslatt_ikrafttredelse date,                     -- ≥ 1 kalendermåned frem (husleieloven §4-2)
  opprettet              timestamptz not null default now(),
  sendt_tidspunkt        timestamptz
);
create index if not exists idx_kpi_varsler_eier on kpi_varsler (eier_id);
create unique index if not exists uq_kpi_varsel_aktiv
  on kpi_varsler (kontrakt_id) where status = 'utkast';
