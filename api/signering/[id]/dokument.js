/**
 * GET /api/signering/:id/dokument — last ned ferdig signert kontrakt.
 *
 * VIKTIG (F): en juridisk signert kontrakt skal ALLTID være tilgjengelig, uavhengig
 * av abonnementsstatus. Derfor er dette kun eier-scopet (ingen plan-gating).
 * I stub-modus serveres en plassholder; ekte Signicat returnerer den signerte PDF-en.
 */
import { medBruker } from '../../_http.js';
import { hentSignering } from '../../_signering/db.js';
import { hentSignertDokument, erStub } from '../../_signering/index.js';

export default medBruker({
  GET: async (req, res, okt) => {
    const id = req.query?.id || req.url.split('/').slice(-2, -1)[0];
    const sig = await hentSignering(okt.bruker.id, id);
    if (!sig) return res.status(404).json({ feil: 'Fant ikke signeringen.' });
    if (sig.status !== 'signert') return res.status(409).json({ feil: 'Kontrakten er ikke ferdig signert ennå.' });

    if (erStub()) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="signert-kontrakt-${id}.txt"`);
      return res.status(200).send(
        `SIGNERT LEIEKONTRAKT (stub)\n`
        + `Signering-ID: ${id}\n`
        + `Signert: ${sig.signert_tidspunkt}\n`
        + `Referanse: ${sig.signering_ref}\n\n`
        + `Dette er et plassholderdokument i stub-modus. Når Signicat/BankID er koblet på, `
        + `lastes den ekte, BankID-signerte PDF-en ned her.`,
      );
    }

    const dok = await hentSignertDokument(sig.signering_ref);
    if (!dok?.innhold) return res.status(404).json({ feil: 'Dokumentet er ikke tilgjengelig.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="signert-kontrakt-${id}.pdf"`);
    return res.status(200).send(dok.innhold);
  },
});
