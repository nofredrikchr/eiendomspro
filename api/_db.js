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

const url = process.env.DATABASE_URL;

if (!url) {
  // Kastes ved første spørring, ikke ved import, så health-sjekken kan
  // rapportere "ikke konfigurert" i stedet for å krasje hele funksjonen.
  console.warn('[db] DATABASE_URL er ikke satt — Neon-spørringer vil feile.');
}

export const sql = url ? neon(url) : null;

export function dbKonfigurert() {
  return !!url;
}
