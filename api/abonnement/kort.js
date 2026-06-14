/**
 * POST /api/abonnement/kort — registrer betalingskort. Kreves for BankID-signering
 * (selv om abonnementsprøven er kortløs) — hindrer at noen tar gratis prøve, henter
 * en gratis kontrakt og melder seg ut. Stub-modus markerer kort som registrert direkte.
 */
import { medBruker } from '../_http.js';
import { appUrl } from '../_url.js';
import { opprettKortSetup } from '../_betaling/index.js';
import { oppdaterAbonnement, loggAbonnementHendelse } from '../_plan/db.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const base = appUrl(req);
    const r = await opprettKortSetup({
      brukerId: okt.bruker.id,
      suksessUrl: `${base}/innstillinger?kort=ok`,
      avbrytUrl: `${base}/innstillinger?kort=avbrutt`,
      kundeEpost: okt.bruker.epost,
    });
    if (r.stub) {
      await oppdaterAbonnement(okt.bruker.id, { har_kort: true });
      await loggAbonnementHendelse(okt.bruker.id, 'kort_lagt_til', { stub: true });
    }
    return res.status(200).json({ url: r.url, stub: !!r.stub });
  },
});
