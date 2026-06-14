/**
 * GET  /api/signering — mine BankID-signeringer (alltid tilgjengelige for nedlasting).
 * POST /api/signering — start ny BankID-signering av en leiekontrakt (engangskjøp).
 *
 * Pris (F): betalende abonnent 49 kr, gratisbruker 199 kr. Pro-ens 2 inkluderte
 * kontrakter er gratis — men IKKE i prøveperioden (kun etter første betaling).
 * Kortkrav: signering krever registrert kort (selv om prøven er kortløs) — uten
 * kort svarer vi 402 { krever: 'kort' } så klienten ber om kort først.
 */
import { medBruker } from '../_http.js';
import { appUrl } from '../_url.js';
import { hentAbonnement } from '../_plan/db.js';
import {
  erBetalende, bankidPrisOre, inkluderteKontrakterTilgjengelig,
  PRO_INKLUDERTE_KONTRAKTER, BANKID_LEVERANDOR_KOSTNAD_ORE,
} from '../../src/lib/planer.js';
import { startSignering } from '../_signering/index.js';
import { opprettSignering, hentSigneringer, antallInkludertBrukt, markerSignert } from '../_signering/db.js';

export function trygtSignering(s) {
  if (!s) return null;
  return {
    id: s.id,
    kontraktId: s.kontrakt_id ?? null,
    status: s.status,
    prisOre: s.pris_ore,
    inkludert: !!s.inkludert,
    signertDokumentUrl: s.signert_dokument_url ?? null,
    signertTidspunkt: s.signert_tidspunkt ?? null,
    opprettet: s.opprettet,
  };
}

export default medBruker({
  GET: async (req, res, okt) => {
    const rader = await hentSigneringer(okt.bruker.id);
    return res.status(200).json({ signeringer: rader.map(trygtSignering) });
  },

  POST: async (req, res, okt) => {
    const ab = await hentAbonnement(okt.bruker.id);
    // Kortkrav: hindrer gratis-prøve → gratis kontrakt → utmelding.
    if (!ab?.har_kort) {
      return res.status(402).json({ feil: 'Du må registrere et betalingskort før BankID-signering.', krever: 'kort' });
    }

    const betalende = erBetalende(ab);
    const inkludertTilgjengelig = inkluderteKontrakterTilgjengelig(ab); // false i prøve (misbrukssikring)
    const brukt = await antallInkludertBrukt(okt.bruker.id);
    const brukInkludert = inkludertTilgjengelig && brukt < PRO_INKLUDERTE_KONTRAKTER;
    const prisOre = brukInkludert ? 0 : bankidPrisOre(betalende);

    const sig = await opprettSignering(okt.bruker.id, {
      kontraktId: req.body?.kontraktId || null,
      prisOre,
      inkludert: brukInkludert,
      leverandorKostnadOre: BANKID_LEVERANDOR_KOSTNAD_ORE,
      status: prisOre > 0 ? 'venter_betaling' : 'venter_signering',
    });

    // (Ekte: trekk prisOre via Stripe her når pris > 0. Stub hopper over og signerer.)
    const r = await startSignering({
      signeringId: sig.id,
      signerendeNavn: req.body?.signerendeNavn || okt.bruker.fullt_navn,
      suksessUrl: `${appUrl(req)}/kontrakter`,
    });

    let oppdatert = sig;
    if (r.ferdigSignert) {
      oppdatert = await markerSignert(okt.bruker.id, sig.id, {
        signeringRef: r.signeringRef,
        signertDokumentUrl: r.signertDokumentUrl,
      });
    }
    return res.status(201).json({ signering: trygtSignering(oppdatert), prisOre, url: r.url || null });
  },
});
