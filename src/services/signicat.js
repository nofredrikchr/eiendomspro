/**
 * Signicat — BankID e-signering av leiekontrakter
 *
 * Dokumentasjon: https://developer.signicat.com/
 * Signing API v2: https://developer.signicat.com/docs/electronic-signing/sign-api-v2/
 *
 * Flyt:
 * 1. Last opp PDF-kontrakt til Signicat (createDocument)
 * 2. Opprett signeringsøkt med utleier + leietaker som underskrivere (createSigningSession)
 * 3. Brukeren sendes til signeringsURL (eller iframe)
 * 4. Signicat kaller webhook når begge har signert
 * 5. Last ned signert PDF med embedded BankID-kvalifisert signatur (PAdES-format)
 *
 * Teknisk endring 2025-2026:
 * - BankID bytter til ny PAdES-standard via Stø AS (effektivt mai 2026)
 * - Signicat håndterer denne migrasjonen automatisk for kunder
 * - Bruk alltid signingFlow: 'PKISIGNING' + vendor: 'NBID' for norsk BankID
 *
 * TODO: Legg inn ekte credentials i .env og fjern stub-guards
 */

const BASE_URL = 'https://api.signicat.com/signing/v2';

// Hemmeligheter ligger IKKE i nettleseren. Når Signicat aktiveres flyttes
// dette kallet til en serverless function i /api som leser SIGNICAT_*-secrets
// fra Vercel-miljøet. Inntil da er tjenesten en stub.
function getConfig() {
  return { clientId: null, clientSecret: null, accountId: null };
}

function isKonfigurert() {
  const c = getConfig();
  return !!(c.clientId && c.clientSecret);
}

// ─── Hent access token (OAuth2 client_credentials) ───────────────────────────
async function hentToken() {
  const c = getConfig();
  const resp = await fetch('https://api.signicat.com/auth/open/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     c.clientId,
      client_secret: c.clientSecret,
      scope:         'sign',
    }),
  });
  if (!resp.ok) throw new Error(`Signicat token-feil: ${resp.status}`);
  const data = await resp.json();
  return data.access_token;
}

// ─── Opprett signeringsøkt ────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.kontraktId
 * @param {string} params.pdfBase64       - PDF som base64-streng
 * @param {object} params.utleier         - { navn, epost }
 * @param {object} params.leietaker       - { navn, epost }
 * @param {string} params.redirectUrl     - URL etter signering
 * @returns {Promise<{ sessionId, signeringsUrl, utleierUrl, leietakerUrl }>}
 */
export async function opprettSigneringsøkt({ kontraktId, pdfBase64, utleier, leietaker, redirectUrl }) {
  if (!isKonfigurert()) {
    // ── STUB: returner mock-data når ikke konfigurert ──
    console.info('[Signicat STUB] Integrasjon ikke konfigurert — returnerer mock-data');
    return {
      sessionId:     `mock_session_${Date.now()}`,
      signeringsUrl: `https://preprod.signicat.com/std/docaction/demo?sessionId=mock`,
      utleierUrl:    `https://preprod.signicat.com/sign/utleier_mock`,
      leietakerUrl:  `https://preprod.signicat.com/sign/leietaker_mock`,
      status:        'stub',
    };
  }

  const token = await hentToken();

  const body = {
    title: `Leiekontrakt — ${leietaker.navn}`,
    description: 'Leiekontrakt som krever signering fra begge parter med BankID',
    externalId: kontraktId,
    contactDetails: { email: utleier.epost },
    documents: [{
      title: 'Leiekontrakt',
      description: 'Les nøye gjennom kontrakten før du signerer.',
      action: 'SIGN',
      source: 'BASE64',
      mimeType: 'application/pdf',
      content: pdfBase64,
    }],
    signers: [
      {
        externalSignerId: `utleier_${kontraktId}`,
        redirectSettings: { redirectMode: 'redirect', success: redirectUrl, abort: redirectUrl, error: redirectUrl },
        signatureType: { mechanism: 'pkisignature', signingMethods: [{ signingMethod: 'no_bankid' }] },
        ui: { dialogs: { before: { useCheckBox: true, title: 'Bekreft', message: 'Jeg bekrefter at jeg er utleier og godtar vilkårene.' } } },
        notifications: [{ signerName: utleier.navn, email: { address: utleier.epost, language: 'NO' } }],
      },
      {
        externalSignerId: `leietaker_${kontraktId}`,
        redirectSettings: { redirectMode: 'redirect', success: redirectUrl, abort: redirectUrl, error: redirectUrl },
        signatureType: { mechanism: 'pkisignature', signingMethods: [{ signingMethod: 'no_bankid' }] },
        notifications: [{ signerName: leietaker.navn, email: { address: leietaker.epost, language: 'NO' } }],
      },
    ],
  };

  const resp = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Signicat session-feil: ${resp.status} ${await resp.text()}`);

  const data = await resp.json();
  return {
    sessionId:     data.id,
    signeringsUrl: data.signers?.[0]?.url,
    utleierUrl:    data.signers?.find(s => s.externalSignerId?.startsWith('utleier'))?.url,
    leietakerUrl:  data.signers?.find(s => s.externalSignerId?.startsWith('leietaker'))?.url,
    status:        'pending',
  };
}

// ─── Hent status for signeringsøkt ───────────────────────────────────────────
export async function hentSigneringsStatus(sessionId) {
  if (!isKonfigurert() || sessionId?.startsWith('mock_')) {
    return { status: 'stub', signers: [] };
  }
  const token = await hentToken();
  const resp = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Signicat status-feil: ${resp.status}`);
  return resp.json();
}

// ─── Last ned signert PDF ─────────────────────────────────────────────────────
export async function lastNedSignertPDF(sessionId, documentId) {
  if (!isKonfigurert() || sessionId?.startsWith('mock_')) return null;
  const token = await hentToken();
  const resp = await fetch(`${BASE_URL}/sessions/${sessionId}/documents/${documentId}/files`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Signicat PDF-feil: ${resp.status}`);
  return resp.blob();
}

export { isKonfigurert as signicatKonfigurert };
