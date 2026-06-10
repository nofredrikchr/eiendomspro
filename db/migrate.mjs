#!/usr/bin/env node
/**
 * Migreringskjører for Neon. Kjører db/migrations/*.sql i filnavnsrekkefølge
 * mot DATABASE_URL og registrerer hver kjørte fil i schema_migrations, slik at
 * samme fil aldri kjøres to ganger. Hver fil kjøres i sin egen transaksjon.
 *
 * Bruk:  npm run migrate          (DATABASE_URL må være satt, f.eks. fra .env)
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@neondatabase/serverless';

const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  null;

if (!url) {
  console.error('[migrate] DATABASE_URL er ikke satt — avbryter.');
  process.exit(1);
}

const katalog = join(dirname(fileURLToPath(import.meta.url)), 'migrations');
const filer = (await readdir(katalog)).filter((f) => f.endsWith('.sql')).sort();

// Client (WebSocket) i stedet for neon() (HTTP): simple query-protokollen lar
// oss kjøre hele .sql-filer med flere statements (inkl. do $$-blokker) i ett kall.
const klient = new Client({ connectionString: url });
await klient.connect();

try {
  // Idempotent bokføringstabell — opprettes før første migrering.
  await klient.query(`
    create table if not exists schema_migrations (
      navn  text primary key,
      kjort timestamptz not null default now()
    )`);

  for (const fil of filer) {
    const { rows } = await klient.query('select 1 from schema_migrations where navn = $1', [fil]);
    if (rows.length) {
      console.log(`[migrate] ${fil} — allerede kjørt, hopper over`);
      continue;
    }
    const innhold = await readFile(join(katalog, fil), 'utf8');
    console.log(`[migrate] ${fil} — kjører ...`);
    await klient.query('begin');
    try {
      await klient.query(innhold); // hele filen (uten parametre → simple query)
      await klient.query('insert into schema_migrations (navn) values ($1)', [fil]);
      await klient.query('commit');
    } catch (e) {
      await klient.query('rollback');
      console.error(`[migrate] ${fil} FEILET — rullet tilbake.`);
      throw e;
    }
  }
  console.log('[migrate] ferdig — databasen er à jour.');
} finally {
  await klient.end();
}
