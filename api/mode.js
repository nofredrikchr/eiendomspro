/** POST /api/mode — bytt aktiv modus (utleier/leietaker). Lazy-provisjonerer rollen. */
import { medBruker } from './_http.js';
import { byttModus, offentligBruker } from './_auth/index.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const { modus } = req.body ?? {};
    const resultat = await byttModus(okt.bruker.id, modus);
    if (!resultat) return res.status(400).json({ feil: 'Ugyldig modus.' });
    return res.status(200).json({ bruker: offentligBruker(resultat.bruker, resultat.roller) });
  },
});
