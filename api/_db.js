/**
 * Neon-databaseklient for serverless functions (Vercel /api).
 *
 * Bruker @neondatabase/serverless sin HTTP-driver — laget for serverless/edge,
 * uten persistente connection pools. Tilkoblingsstrengen ligger i miljøvariabelen
 * DATABASE_URL (server-side only — ALDRI prefikset VITE_, så den når aldri
 * nettleseren). Sett den i Vercel → Project → Settings → Environment Variables,
 * og lokalt i en .env-fil (se .env.example).
 *
 * Bruk:
 *   import { sql } from './_db.js';
 *   const rader = await sql`select * from feedback_saker where id = ${id}`;
 *
 * Filer i /api som starter med _ blir IKKE egne endepunkter (kun delt kode).
 */
import { neon } from '@neondatabase/serverless';

// Neon-integrasjonen i Vercel setter DATABASE_URL (pooled). Fallback-kjeden gjør
// koden robust mot ulike varianter integrasjonen kan provisjonere. neon()-driveren
// kjører over HTTPS uansett, så pooled vs unpooled er funksjonelt likegyldig.
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  null;

if (!url) {
  // Kastes ved første spørring, ikke ved import, så health-sjekken kan
  // rapportere "ikke konfigurert" i stedet for å krasje hele funksjonen.
  console.warn('[db] DATABASE_URL er ikke satt — Neon-spørringer vil feile.');
}

export const sql = url ? neon(url) : null;

export function dbKonfigurert() {
  return !!url;
}
