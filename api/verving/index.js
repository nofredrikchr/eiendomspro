/**
 * GET /api/verving — brukerens personlige vervelenke, vervinger og opptjent kreditt
 * («Verv en venn»-siden). Vervekoden opprettes lazy hvis den mangler.
 */
import { medBruker } from '../_http.js';
import { appUrl } from '../_url.js';
import { hentEllerLagVervekode, hentKredittOre, hentAbonnement } from '../_plan/db.js';
import { hentVervinger } from '../_verving/db.js';
import { ververKredittOre, effektivPlan } from '../../src/lib/planer.js';

export default medBruker({
  GET: async (req, res, okt) => {
    const kode = await hentEllerLagVervekode(okt.bruker.id, okt.bruker.fullt_navn);
    const rader = await hentVervinger(okt.bruker.id);
    const kredittOre = await hentKredittOre(okt.bruker.id);
    const plan = effektivPlan(await hentAbonnement(okt.bruker.id));
    const innfridde = rader.filter((v) => v.status === 'innfridd').length;

    return res.status(200).json({
      kode,
      lenke: `${appUrl(req)}/register?ref=${encodeURIComponent(kode)}`,
      // belønning per innfridd verving (2 mnd av egen plan) — for «X venner = Y mnd gratis»
      belonningPerVervingOre: ververKredittOre(plan),
      kredittOre,
      antallInnfridde: innfridde,
      vervinger: rader.map((v) => ({
        id: v.id,
        navn: v.vervet_navn,
        status: v.status, // registrert | betalende | innfridd | annullert
        belonningOre: v.belonning_verver_ore,
        opprettet: v.opprettet,
      })),
    });
  },
});
