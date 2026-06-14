/**
 * Betalingsadapter — Stripe Billing (med Vipps som betalingsmetode) for abonnement.
 *
 * Standard er STUB-modus: uten STRIPE_SECRET_KEY simuleres checkout/portal/kort slik
 * at hele flyten kan demonstreres i preview uten live nøkler. Når nøklene er på plass
 * (se docs/OPPSETT-BETALING-OG-INTEGRASJONER.md) aktiveres ekte Stripe automatisk.
 *
 * Vi lagrer ALDRI kortdata selv (PCI) — alt kort-/betalingsarbeid skjer hos Stripe.
 * Hemmeligheter leses kun her server-side (aldri VITE_-prefiks).
 */
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || null;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || null;

export function erStub() {
  return !STRIPE_KEY;
}

// Lazy-import av stripe-pakken først når en ekte nøkkel finnes (pakken er valgfri
// til betaling skrus på — da: `npm i stripe`).
async function stripe() {
  const { default: Stripe } = await import('stripe');
  return new Stripe(STRIPE_KEY);
}

/**
 * Start abonnementskjøp. Stub: signaliserer at kallstedet skal fullføre direkte
 * (simulert betaling). Ekte: oppretter en Stripe Checkout-sesjon og gir redirect-URL.
 */
export async function opprettCheckout({ brukerId, planId, intervall, suksessUrl, avbrytUrl, kundeEpost }) {
  if (erStub()) return { stub: true, url: suksessUrl };
  const s = await stripe();
  const prisId = prisIdFor(planId, intervall);
  const sesjon = await s.checkout.sessions.create({
    mode: 'subscription',
    // Betalingsmetoder (kort, Vipps) styres fra Stripe Dashboard → vises automatisk.
    line_items: [{ price: prisId, quantity: 1 }],
    success_url: suksessUrl,
    cancel_url: avbrytUrl,
    customer_email: kundeEpost || undefined,
    client_reference_id: brukerId,
    metadata: { brukerId, planId, intervall },
    // Metadata på abonnementet → følger med på fremtidige fakturaer (renewals).
    subscription_data: { metadata: { brukerId, planId, intervall } },
  });
  return { stub: false, url: sesjon.url, sesjonId: sesjon.id };
}

/** Registrer/oppdater kort (kreves for BankID-signering). Stub: fullføres direkte. */
export async function opprettKortSetup({ brukerId, suksessUrl, avbrytUrl, kundeEpost }) {
  if (erStub()) return { stub: true, url: suksessUrl };
  const s = await stripe();
  const sesjon = await s.checkout.sessions.create({
    mode: 'setup',
    payment_method_types: ['card'],
    success_url: suksessUrl,
    cancel_url: avbrytUrl,
    customer_email: kundeEpost || undefined,
    client_reference_id: brukerId,
    metadata: { brukerId, formaal: 'kort' },
  });
  return { stub: false, url: sesjon.url };
}

/** Kundeportal (administrer kort/abonnement). Stub: ingen ekstern portal. */
export async function kundeportalUrl({ stripeCustomerId, returUrl }) {
  if (erStub() || !stripeCustomerId) return { stub: true, url: null };
  const s = await stripe();
  const portal = await s.billingPortal.sessions.create({ customer: stripeCustomerId, return_url: returUrl });
  return { stub: false, url: portal.url };
}

/** Verifiser og parse en innkommende webhook. Returnerer event eller null. */
export async function verifiserWebhook(req) {
  if (erStub()) {
    // I stub-modus aksepteres webhooks kun med en delt hemmelighet (for testing).
    const delt = process.env.STUB_WEBHOOK_SECRET;
    if (!delt || req.headers['x-stub-secret'] !== delt) return null;
    return typeof req.body === 'object' ? req.body : null;
  }
  if (!WEBHOOK_SECRET) return null;
  const s = await stripe();
  const sig = req.headers['stripe-signature'];
  const raw = req.rawBody || JSON.stringify(req.body ?? {});
  try {
    return s.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
  } catch {
    return null;
  }
}

// Stripe Price-IDer settes som env når betaling skrus på (se oppsettsguiden).
function prisIdFor(planId, intervall) {
  const nokkel = `STRIPE_PRICE_${planId}_${intervall}`.toUpperCase();
  const id = process.env[nokkel];
  if (!id) throw Object.assign(new Error(`Mangler ${nokkel}`), { status: 500, feil: 'Betaling ikke ferdig konfigurert.' });
  return id;
}
