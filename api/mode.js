/** POST /api/mode — bytt aktiv modus (utleier/leietaker). Lazy-provisjonerer rollen. */
import { medBruker } from './_http.js';
import { byttModus, offentligBruker } from './_auth/index.js';
import { hentAbonnement, hentKredittOre } from './_plan/db.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const { modus } = req.body ?? {};
    const resultat = await byttModus(okt.bruker.id, modus);
    if (!resultat) return res.status(400).json({ feil: 'Ugyldig modus.' });
    const ekstra = resultat.bruker.niva === 3
      ? {}
      : { abonnement: await hentAbonnement(okt.bruker.id), kredittOre: await hentKredittOre(okt.bruker.id) };
    return res.status(200).json({ bruker: offentligBruker(resultat.bruker, resultat.roller, ekstra) });
  },
});
