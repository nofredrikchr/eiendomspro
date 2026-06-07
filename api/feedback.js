/**
 * /api/feedback — eksempel-endepunkt mot Neon.
 *
 * Dette er MØNSTERET resten av datamigreringen følger: frontend kaller
 * /api/<entitet>, serverless-funksjonen snakker med Neon via `sql`, og
 * tilgangskontroll legges på her (server-side) når Neon-auth er på plass.
 *
 *   GET  /api/feedback          → liste over saker (nyeste først)
 *   POST /api/feedback          → opprett ny sak  { type, tittel, beskrivelse }
 *
 * Krever at db/schema.sql er kjørt i Neon og at DATABASE_URL er satt.
 */
import { sql, dbKonfigurert } from './_db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) {
    return res.status(503).json({ feil: 'DATABASE_URL er ikke satt. Sett opp Neon (se README).' });
  }

  try {
    if (req.method === 'GET') {
      const saker = await sql`
        select id, bruker_navn, bruker_epost, type, tittel, beskrivelse,
               status, belonning, opprettet, oppdatert
        from feedback_saker
        order by oppdatert desc
        limit 200`;
      return res.status(200).json({ saker });
    }

    if (req.method === 'POST') {
      const { type, tittel, beskrivelse } = req.body ?? {};
      if (!type || !tittel || !beskrivelse) {
        return res.status(400).json({ feil: 'type, tittel og beskrivelse er påkrevd.' });
      }
      const [sak] = await sql`
        insert into feedback_saker (type, tittel, beskrivelse, status)
        values (${type}, ${tittel}, ${beskrivelse}, 'ny')
        returning id, type, tittel, beskrivelse, status, opprettet, oppdatert`;
      await sql`
        insert into feedback_meldinger (sak_id, avsender, type, tekst, lest_bruker)
        values (${sak.id}, 'bruker', 'melding', ${beskrivelse}, true)`;
      return res.status(201).json({ sak });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
