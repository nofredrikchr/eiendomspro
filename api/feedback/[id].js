/** /api/feedback/:id — GET (eier/admin) · PATCH status|belonning (admin) · DELETE (eier/admin). */
import { medBruker } from '../_http.js';
import { hentSak, sakEier, settStatus, giBelonning, slettSak } from '../_feedback/db.js';

/** Felles tilgangssjekk: 404 hvis saken ikke finnes, 403 hvis hverken eier eller admin. */
async function sjekkTilgang(req, res, okt) {
  const erAdmin = okt.bruker.niva === 3;
  const eier = await sakEier(req.query.id);
  if (eier === undefined) { res.status(404).json({ feil: 'Ikke funnet.' }); return null; }
  if (!erAdmin && eier !== okt.bruker.id) { res.status(403).json({ feil: 'Ingen tilgang.' }); return null; }
  return { erAdmin };
}

export default medBruker({
  GET: async (req, res, okt) => {
    if (!(await sjekkTilgang(req, res, okt))) return;
    return res.status(200).json({ sak: await hentSak(req.query.id) });
  },
  PATCH: async (req, res, okt) => {
    const tilgang = await sjekkTilgang(req, res, okt);
    if (!tilgang) return;
    if (!tilgang.erAdmin) return res.status(403).json({ feil: 'Krever admin.' });
    const { status, belonning } = req.body ?? {};
    let sak = null;
    if (status) sak = await settStatus(req.query.id, status);
    if (belonning) sak = await giBelonning(req.query.id, belonning);
    if (!sak) return res.status(400).json({ feil: 'Oppgi status eller belonning.' });
    return res.status(200).json({ sak });
  },
  DELETE: async (req, res, okt) => {
    if (!(await sjekkTilgang(req, res, okt))) return;
    await slettSak(req.query.id);
    return res.status(200).json({ ok: true });
  },
});
