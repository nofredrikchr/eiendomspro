/**
 * GET /api/health
 *
 * Helsesjekk for plattformen. Bekrefter at serverless-laget kjører og at
 * Neon-databasen svarer. Brukes for å verifisere Vercel + Neon-oppsettet
 * etter deploy:  curl https://<ditt-domene>/api/health
 */
import { sql, dbKonfigurert } from './_db.js';

export default async function handler(req, res) {
  const svar = {
    ok: true,
    tjeneste: 'eiendomspro-api',
    tid: new Date().toISOString(),
    db: { konfigurert: dbKonfigurert(), tilkoblet: false },
  };

  if (dbKonfigurert()) {
    try {
      const rader = await sql`select now() as tid`;
      svar.db.tilkoblet = true;
      svar.db.servertid = rader[0]?.tid ?? null;
    } catch (e) {
      svar.ok = false;
      svar.db.feil = e.message;
    }
  }

  res.status(svar.ok ? 200 : 503).json(svar);
}
