/**
 * GET/POST /api/cron/kpi — daglig jobb (Vercel Cron) som finner leiekontrakter der
 * det er minst ~12 mnd siden siste regulering/start, henter KPI fra SSB og lager
 * varselutkast «i god tid». Kun for betalende abonnenter (punkt G).
 *
 * SIKKERHET: kalles av Vercel Cron, ikke en bruker. Beskyttes med CRON_SECRET
 * (Authorization: Bearer … eller ?secret=). Uten konfigurert secret tillates kjøring
 * i dev/preview. Jobben er idempotent (unik delvis-indeks hindrer doble utkast).
 */
import { sql } from '../_db.js';
import { erBetalende } from '../../src/lib/planer.js';
import { nesteReguleringsdato, dagerTilRegulering } from '../../src/utils/kpi.js';
import { hentKpiSerie, indeksFor, tilSsbMaaned, ssbMaanedTilTekst } from '../_kpi/ssb.js';
import { opprettUtkast } from '../_kpi/db.js';

const VARSEL_VINDU_DAGER = 60; // lag utkast når regulering er ≤ 60 dager unna (i god tid)

function autorisert(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev/preview uten secret
  const auth = req.headers?.authorization || '';
  return auth === `Bearer ${secret}` || req.query?.secret === secret;
}

/** Første dag i måneden, minst én hel kalendermåned frem (husleieloven § 4-2). */
function foreslattIkrafttredelse(naa = new Date()) {
  return new Date(Date.UTC(naa.getUTCFullYear(), naa.getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (!autorisert(req)) return res.status(401).json({ feil: 'Ikke autorisert.' });

  let serieData;
  try {
    serieData = await hentKpiSerie();
  } catch (e) {
    console.error('[cron/kpi] SSB feilet', e);
    return res.status(502).json({ feil: 'Kunne ikke hente KPI fra SSB.' });
  }
  const { serie, sisteMaaned } = serieData;

  // Alle kontrakter + eiers abonnement (eier-scopingen ligger i raden selv: eier_id).
  const rader = await sql`
    select k.id as kontrakt_id, k.eier_id, k.data, row_to_json(a) as ab
    from kontrakter k
    left join abonnement a on a.bruker_id = k.eier_id`;

  let opprettet = 0;
  let vurdert = 0;
  for (const rad of rader) {
    const k = rad.data || {};
    if (!k.indeksregulering) continue;            // kontrakten reguleres ikke etter KPI
    if (!erBetalende(rad.ab)) continue;           // KPI-varsling kun for betalende
    const neste = nesteReguleringsdato(k);
    if (!neste) continue;
    const dager = dagerTilRegulering(k);
    if (dager == null || dager > VARSEL_VINDU_DAGER) continue; // ikke nær nok ennå
    vurdert += 1;

    const fraSsb = tilSsbMaaned(k.sisteRegulering || k.startdato);
    const fraIndeks = fraSsb ? indeksFor(serie, fraSsb) : null;
    const tilIndeks = indeksFor(serie, sisteMaaned);
    if (!fraIndeks || !tilIndeks) continue;

    const gjeldendeLeie = Number(k.maanedligLeie) || 0;
    const nyLeie = Math.round((gjeldendeLeie * tilIndeks) / fraIndeks / 10) * 10;
    const endringPst = ((tilIndeks / fraIndeks) - 1) * 100;
    const kpiRef = `KPI ${ssbMaanedTilTekst(fraSsb)} → ${ssbMaanedTilTekst(sisteMaaned)}: ${endringPst >= 0 ? '+' : ''}${endringPst.toFixed(1).replace('.', ',')} %`;

    const ny = await opprettUtkast(rad.eier_id, {
      kontraktId: rad.kontrakt_id,
      gjeldendeLeieOre: Math.round(gjeldendeLeie * 100),
      nyLeieOre: Math.round(nyLeie * 100),
      kpiRef,
      foreslattIkrafttredelse: foreslattIkrafttredelse(),
    });
    if (ny) opprettet += 1;
  }

  return res.status(200).json({ ok: true, vurdert, opprettet });
}
