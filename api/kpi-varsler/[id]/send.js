/**
 * POST /api/kpi-varsler/:id/send — generer korrekt formulert KPI-varsel (husleieloven
 * § 4-2) og marker som sendt med tidsstempel. Kun betalende abonnenter (punkt G).
 * Returnerer varselteksten klienten kan sende/laste ned.
 */
import { medBruker } from '../../_http.js';
import { hentVarsel, markerSendt } from '../../_kpi/db.js';
import { byggVarselTekst } from '../../_kpi/varsel.js';
import { hentAbonnement } from '../../_plan/db.js';
import { sql } from '../../_db.js';
import { canUse, effektivPlan } from '../../../src/lib/planer.js';

export default medBruker({
  POST: async (req, res, okt) => {
    const plan = effektivPlan(await hentAbonnement(okt.bruker.id));
    if (!canUse('kpi_varsling', plan)) {
      return res.status(402).json({ feil: 'KPI-varsling krever Privat eller Pro.', krever: 'oppgradering' });
    }
    const id = req.query?.id;
    const v = await hentVarsel(okt.bruker.id, id);
    if (!v) return res.status(404).json({ feil: 'Fant ikke varselet.' });

    // Hent kontrakt + leietakerinfo (eier-scopet).
    const kr = await sql`select data from kontrakter where id = ${v.kontrakt_id} and eier_id = ${okt.bruker.id} limit 1`;
    const k = kr[0]?.data ?? {};

    const tekst = byggVarselTekst({
      utleierNavn: okt.bruker.fullt_navn,
      leietakerNavn: k.leietakerNavn || '',
      adresse: k.adresse || '',
      gjeldendeLeieOre: v.gjeldende_leie_ore,
      nyLeieOre: v.ny_leie_ore,
      kpiRef: v.kpi_ref,
      ikrafttredelse: v.foreslatt_ikrafttredelse,
    });

    const oppdatert = await markerSendt(okt.bruker.id, id);
    return res.status(200).json({ varsel: oppdatert ? { id: oppdatert.id, status: oppdatert.status, sendtTidspunkt: oppdatert.sendt_tidspunkt } : null, tekst });
  },
});
