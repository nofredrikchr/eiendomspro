/** /api/feedback — GET (egne saker, eller alle for admin) · POST (opprett sak). */
import { dbKonfigurert } from '../_db.js';
import { krevBruker } from '../_auth/index.js';
import { listSaker, opprettSak } from '../_feedback/db.js';

export default async function handler(req, res) {
  if (!dbKonfigurert()) return res.status(503).json({ feil: 'Database ikke konfigurert.' });
  const okt = await krevBruker(req);
  if (!okt) return res.status(401).json({ feil: 'Ikke innlogget.' });
  const erAdmin = okt.bruker.niva === 3;
  try {
    if (req.method === 'GET') {
      return res.status(200).json({ saker: await listSaker({ brukerId: okt.bruker.id, erAdmin }) });
    }
    if (req.method === 'POST') {
      const { type, tittel, beskrivelse } = req.body ?? {};
      if (!type || !tittel || !beskrivelse) return res.status(400).json({ feil: 'type, tittel og beskrivelse kreves.' });
      const sak = await opprettSak({
        brukerId: okt.bruker.id,
        brukerNavn: okt.bruker.fullt_navn,
        brukerEpost: okt.bruker.epost ?? null,
        type, tittel, beskrivelse,
      });
      return res.status(201).json({ sak });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  } catch (e) {
    return res.status(500).json({ feil: e.message });
  }
}
