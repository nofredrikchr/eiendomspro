/**
 * Vipps Faktura — send husleie-faktura direkte til leietakers Vipps-app
 *
 * Dokumentasjon: https://developer.vippsmobilepay.com/docs/APIs/invoice-api/
 *
 * Flyt:
 * 1. Utleier har Vipps-faktura-avtale med sin bank (krever org.nr + bankavtale)
 * 2. Plattformen kaller Invoice API for å sende faktura med KID
 * 3. Faktura dukker opp i leietakers Vipps-app ("Faktura"-fanen)
 * 4. Leietaker betaler — penger går DIREKTE til utleiers konto (KID-matched)
 * 5. Webhook bekrefter betaling til plattformen
 *
 * Viktig: Vipps Faktura krever at avsender (utleier) har MSN (Merchant Serial Number)
 * Dette settes opp via utleierens bank — EiendomsPRO er teknisk tilrettelegger,
 * aldri part i pengeflyten. Vi berører IKKE midlene.
 *
 * Alternativ: Vipps eFaktura (privatpersoner) vs Vipps Næringslivsfaktura (bedrifter)
 *
 * TODO: Registrer som Vipps-partner på https://vippsmobilepay.com/merchant-solutions/partner/
 */

const BASE_URL = 'https://api.vippsmobilepay.com/invoice/v1';

// Hemmeligheter ligger IKKE i nettleseren. Når Vipps aktiveres flyttes dette
// kallet til en serverless function i /api som leser VIPPS_*-secrets fra
// Vercel-miljøet. Inntil da er tjenesten en stub.
function getConfig() {
  return { clientId: null, clientSecret: null, subscriptionKey: null, merchantSerialNumber: null };
}

export function vippsKonfigurert() {
  const c = getConfig();
  return !!(c.clientId && c.subscriptionKey);
}

async function hentVippsToken() {
  const c = getConfig();
  const resp = await fetch('https://api.vippsmobilepay.com/accesstoken/get', {
    method: 'POST',
    headers: {
      'client_id':        c.clientId,
      'client_secret':    c.clientSecret,
      'Ocp-Apim-Subscription-Key': c.subscriptionKey,
    },
  });
  if (!resp.ok) throw new Error(`Vipps token-feil: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

// ─── Send husleie-faktura via Vipps ──────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.kontraktId
 * @param {string} params.kidNummer        - generert av kid.js
 * @param {number} params.belop            - beløp i øre (kr 10 000 = 1000000)
 * @param {string} params.forfallsdato     - ISO-dato
 * @param {string} params.leietakerTelefon - norsk mobilnummer (+47...)
 * @param {string} params.utleierNavn
 * @param {string} params.utleierKonto     - kontonummer for innbetaling
 * @param {string} params.beskrivelse      - f.eks. "Husleie januar 2026"
 */
export async function sendVippsFaktura({
  kontraktId, kidNummer, belop, forfallsdato,
  leietakerTelefon, utleierNavn, utleierKonto, beskrivelse,
}) {
  if (!vippsKonfigurert()) {
    console.info('[Vipps STUB] Ikke konfigurert — returnerer mock');
    return {
      invoiceId: `mock_vipps_${Date.now()}`,
      status: 'stub',
      melding: 'Vipps Faktura er ikke konfigurert ennå',
    };
  }

  const token = await hentVippsToken();
  const c = getConfig();

  const body = {
    recipientToken: leietakerTelefon.replace(/\D/g, ''),
    invoice: {
      type: 'invoice',
      invoiceId: `ep_${kontraktId}_${Date.now()}`,
      paymentInformation: {
        type: 'kid',
        value: kidNummer,
        account: utleierKonto.replace(/\./g, ''),
      },
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: forfallsdato,
      amount: belop,
      currency: 'NOK',
      issuerName: utleierNavn,
      subject: beskrivelse,
      minimumAmount: belop,
    },
  };

  const resp = await fetch(`${BASE_URL}/recipients/phones/${leietakerTelefon.replace(/\D/g, '')}/invoices/${body.invoice.invoiceId}`, {
    method: 'PUT',
    headers: {
      Authorization:               `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': c.subscriptionKey,
      'Merchant-Serial-Number':    c.merchantSerialNumber,
      'Content-Type':              'application/json',
    },
    body: JSON.stringify(body.invoice),
  });

  if (!resp.ok) throw new Error(`Vipps faktura-feil: ${resp.status} ${await resp.text()}`);
  return { invoiceId: body.invoice.invoiceId, status: 'sendt' };
}

// ─── Hent faktura-status ──────────────────────────────────────────────────────
export async function hentVippsFakturaStatus(invoiceId) {
  if (!vippsKonfigurert() || invoiceId?.startsWith('mock_')) return { state: 'stub' };
  const token = await hentVippsToken();
  const c = getConfig();
  const resp = await fetch(`${BASE_URL}/invoices/${invoiceId}`, {
    headers: {
      Authorization:               `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': c.subscriptionKey,
    },
  });
  if (!resp.ok) throw new Error(`Vipps status-feil: ${resp.status}`);
  return resp.json();
}
