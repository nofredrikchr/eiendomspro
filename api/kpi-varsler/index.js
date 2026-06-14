/**
 * GET /api/kpi-varsler — KPI-reguleringsvarsler for innlogget utleier.
 * Historikk er ALLTID lesbar (bevares ved nedgradering). Feltet `aktiv` viser om
 * varsling er aktiv (kun betalende abonnenter — punkt G).
 */
import { medBruker } from '../_http.js';
import { hentVarsler } from '../_kpi/db.js';
import { hentAbonnement } from '../_plan/db.js';
import { canUse, effektivPlan } from '../../src/lib/planer.js';

export function trygtVarsel(v) {
  return {
    id: v.id,
    kontraktId: v.kontrakt_id,
    status: v.status,
    gjeldendeLeieOre: v.gjeldende_leie_ore,
    nyLeieOre: v.ny_leie_ore,
    kpiRef: v.kpi_ref,
    foreslattIkrafttredelse: v.foreslatt_ikrafttredelse,
    opprettet: v.opprettet,
    sendtTidspunkt: v.sendt_tidspunkt,
  };
}

export default medBruker({
  GET: async (req, res, okt) => {
    const plan = effektivPlan(await hentAbonnement(okt.bruker.id));
    const rader = await hentVarsler(okt.bruker.id);
    return res.status(200).json({
      aktiv: canUse('kpi_varsling', plan),
      varsler: rader.map(trygtVarsel),
    });
  },
});
