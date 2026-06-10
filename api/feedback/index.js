/** /api/feedback — GET (egne saker, eller alle for admin) · POST (opprett sak). */
import { medBruker } from '../_http.js';
import { listSaker, opprettSak } from '../_feedback/db.js';

const MAKS_TITTEL = 200;
const MAKS_BESKRIVELSE = 5000;

export default medBruker({
  GET: async (req, res, okt) => {
    const erAdmin = okt.bruker.niva === 3;
    return res.status(200).json({ saker: await listSaker({ brukerId: okt.bruker.id, erAdmin }) });
  },
  POST: async (req, res, okt) => {
    const { type, tittel, beskrivelse } = req.body ?? {};
    if (!type || !tittel || !beskrivelse) return res.status(400).json({ feil: 'type, tittel og beskrivelse kreves.' });
    if (String(tittel).length > MAKS_TITTEL) return res.status(400).json({ feil: `Tittel kan være maks ${MAKS_TITTEL} tegn.` });
    if (String(beskrivelse).length > MAKS_BESKRIVELSE) return res.status(400).json({ feil: `Beskrivelse kan være maks ${MAKS_BESKRIVELSE} tegn.` });
    const sak = await opprettSak({
      brukerId: okt.bruker.id,
      brukerNavn: okt.bruker.fullt_navn,
      brukerEpost: okt.bruker.epost ?? null,
      type, tittel, beskrivelse,
    });
    return res.status(201).json({ sak });
  },
});
