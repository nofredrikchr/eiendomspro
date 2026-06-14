/**
 * POST /api/webhooks/stripe — Stripe Billing webhooks.
 *
 * SIKKERHET: Dette er det ene unntaket fra «krevBruker på hvert endepunkt»-regelen.
 * Webhooks kalles av Stripe (ikke en innlogget bruker), så det finnes ingen sesjon.
 * I stedet verifiseres ektheten kryptografisk: ekte Stripe-signatur (HMAC mot
 * STRIPE_WEBHOOK_SECRET), eller i stub-modus en delt hemmelighet (STUB_WEBHOOK_SECRET).
 * Uverifiserte kall avvises med 400. Vi muterer kun abonnementet til brukeren som
 * eventet gjelder (eier-scopet via metadata.brukerId / stripe_customer_id).
 *
 * Håndterer: invoice.paid, invoice.payment_failed, customer.subscription.deleted,
 * charge.refunded (punkt H/K/I).
 */
import { verifiserWebhook } from '../_betaling/index.js';
import {
  handterBetaltFaktura, handterMislyktBetaling, handterKansellering, handterRefusjon,
} from '../_plan/livssyklus.js';
import { finnBrukerViaStripeCustomer, oppdaterAbonnement, startTrial } from '../_plan/db.js';

// Vi trenger rå body for å verifisere Stripe-signaturen.
export const config = { api: { bodyParser: false } };

async function lesRaw(req) {
  const deler = [];
  for await (const del of req) deler.push(del);
  return Buffer.concat(deler).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ feil: 'Metode ikke tillatt.' });
  }

  const raw = await lesRaw(req);
  req.rawBody = raw;
  try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }

  const event = await verifiserWebhook(req);
  if (!event) return res.status(400).json({ feil: 'Ugyldig eller uverifisert webhook.' });

  const type = event.type;
  const obj = event.data?.object ?? event; // stub sender flatt objekt

  // Metadata kan ligge på objektet selv (Checkout Session), på subscription_details
  // (Invoice), eller mangle helt — fall tilbake til kunde-ID-oppslag.
  const meta = obj.metadata || obj.subscription_details?.metadata || {};
  const brukerId = meta.brukerId || obj.client_reference_id || obj.brukerId
    || (await finnBrukerViaStripeCustomer(obj.customer));
  if (!brukerId) return res.status(200).json({ ok: true, ignorert: true });

  const planId = meta.planId || obj.planId || 'pro';
  const intervall = meta.intervall || obj.intervall || 'mnd';

  try {
    switch (type) {
      // Kanonisk event etter fullført Checkout — bærer kunde + abonnement + metadata.
      case 'checkout.session.completed':
        await oppdaterAbonnement(brukerId, {
          stripe_customer_id: obj.customer || null,
          stripe_subscription_id: obj.subscription || null,
        });
        if (obj.mode === 'setup') {
          // Kortregistrering (for BankID) — ikke abonnement.
          await oppdaterAbonnement(brukerId, { har_kort: true });
        } else if (meta.trial) {
          // Prøveperiode startet med kort — trekkes først ved trial-slutt.
          await startTrial(brukerId, {
            planId, intervall, trialDager: Number(meta.trial) || 14,
            stripeCustomerId: obj.customer || null, stripeSubscriptionId: obj.subscription || null,
          });
        } else {
          await handterBetaltFaktura(brukerId, { planId, intervall, bruttoOre: obj.amount_total ?? null });
        }
        break;
      case 'invoice.paid': // fornyelser (renewals)
        await handterBetaltFaktura(brukerId, {
          planId,
          intervall,
          bruttoOre: obj.amount_paid ?? obj.bruttoOre ?? null,
        });
        break;
      case 'invoice.payment_failed':
        await handterMislyktBetaling(brukerId);
        break;
      case 'customer.subscription.deleted':
        await handterKansellering(brukerId);
        break;
      case 'charge.refunded':
      case 'refund':
        await handterRefusjon(brukerId);
        break;
      default:
        break; // ukjente eventtyper ignoreres trygt
    }
  } catch (e) {
    console.error('[webhook/stripe]', e);
    return res.status(500).json({ feil: 'Webhook-behandling feilet.' });
  }
  return res.status(200).json({ ok: true });
}
