/**
 * GET/POST /api/cron/trial-epost — daglig jobb som sender prøveperiode-e-poster på
 * dag 7, dag 12 og dag 14 (siste dag tilbyr årlig «2 måneder gratis», med ekstra
 * trykk). Hver milepæl sendes maks én gang (sporet i abonnement_hendelser).
 * Dormant uten RESEND_API_KEY (e-post logges kun) — se oppsettsguiden.
 *
 * SIKKERHET: cron-jobb (ikke bruker). Beskyttes med CRON_SECRET som /api/cron/kpi.
 */
import { appUrl } from '../_url.js';
import { sendEpost } from '../_auth/epost.js';
import { hentTrialAbonnement, harHendelse, loggAbonnementHendelse } from '../_plan/db.js';
import { trialDagerIgjen } from '../../src/lib/planer.js';

function autorisert(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers?.authorization || '';
  return auth === `Bearer ${secret}` || req.query?.secret === secret;
}

function mal(milepael, navn, base) {
  const priser = `${base}/priser`;
  const fornavn = (navn || '').split(/\s+/)[0] || 'der';
  if (milepael === 'trial_epost_dag7') {
    return {
      emne: 'Du er halvveis i Pro-prøven – slik utnytter du den',
      html: `<p>Hei ${fornavn}!</p><p>Du har 7 dager igjen av den gratis Pro-prøven. `
        + `Prøv 10-års prognosen, oppussingsanalysen og bankrapporten mens du har full tilgang.</p>`
        + `<p><a href="${priser}">Se planer og priser</a></p>`,
    };
  }
  if (milepael === 'trial_epost_dag12') {
    return {
      emne: 'To dager igjen av Pro-prøven',
      html: `<p>Hei ${fornavn}!</p><p>Det er bare 2 dager igjen av Pro-prøven. `
        + `Velg en plan nå, så beholder du alle analysene uten avbrudd. Dataene dine blir uansett bevart.</p>`
        + `<p><a href="${priser}">Velg plan</a></p>`,
    };
  }
  // dag 14 — siste dag, ekstra trykk + årlig tilbud
  return {
    emne: 'Siste dag med Pro – få 2 måneder gratis med årlig',
    html: `<p>Hei ${fornavn}!</p><p>I dag er siste dag av Pro-prøven. Velger du <strong>årlig</strong> `
      + `betaling får du <strong>2 måneder gratis</strong>. Ingen binding – og alt du har lagt inn er trygt lagret `
      + `og klart hvis du melder deg inn igjen senere.</p>`
      + `<p><a href="${priser}">Fortsett med Pro – 2 måneder gratis på årlig</a></p>`,
  };
}

export default async function handler(req, res) {
  if (!autorisert(req)) return res.status(401).json({ feil: 'Ikke autorisert.' });
  const base = appUrl(req);
  const rader = await hentTrialAbonnement();

  let sendt = 0;
  for (const rad of rader) {
    const dager = trialDagerIgjen({ status: 'prøve', trial_ends_at: rad.trial_ends_at });
    let milepael = null;
    if (dager <= 0) milepael = 'trial_epost_dag14';
    else if (dager <= 2) milepael = 'trial_epost_dag12';
    else if (dager <= 7) milepael = 'trial_epost_dag7';
    if (!milepael) continue;
    if (await harHendelse(rad.bruker_id, milepael)) continue;

    const { emne, html } = mal(milepael, rad.fullt_navn, base);
    const r = await sendEpost({ til: rad.epost, emne, html });
    await loggAbonnementHendelse(rad.bruker_id, milepael, { dagerIgjen: dager, sendt: r.sendt });
    if (r.sendt) sendt += 1;
  }
  return res.status(200).json({ ok: true, vurdert: rader.length, sendt });
}
