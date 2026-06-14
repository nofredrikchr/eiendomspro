/** /api/leieobjekter — GET (egne) · POST (opprett). Eier = innlogget bruker. */
import { medBruker } from '../_http.js';
import { listLeieobjekter, opprettLeieobjekt } from '../_eiendom/db.js';
import { hentAbonnement } from '../_plan/db.js';
import { effektivPlan, objectLimit, erSkrivebeskyttet } from '../../src/lib/planer.js';

export default medBruker({
  GET: async (req, res, okt) => res.status(200).json({ leieobjekter: await listLeieobjekter(okt.bruker.id) }),

  POST: async (req, res, okt) => {
    // Server-side håndheving av objektgrensen (klient-gating er kun UX).
    const abonnement = await hentAbonnement(okt.bruker.id);
    const plan = effektivPlan(abonnement);
    const grense = objectLimit(plan);
    const antall = (await listLeieobjekter(okt.bruker.id)).length;
    if (erSkrivebeskyttet(abonnement) || antall >= grense) {
      return res.status(402).json({
        feil: 'Du har nådd grensen for antall leieobjekter på planen din.',
        krever: 'oppgradering',
        grense,
      });
    }
    return res.status(201).json({ leieobjekt: await opprettLeieobjekt(okt.bruker.id, req.body ?? {}) });
  },
});
