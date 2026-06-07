/**
 * FINN.no — publisering av utleieannonser
 *
 * Dokumentasjon: https://www.finn.no/api/  ·  https://www.finn.no/api/doc/ad
 *
 * Slik fungerer det (samme modell som Hybel):
 * 1. Du oppretter annonsen i EiendomsPRO
 * 2. Ved publisering sendes annonsen til FINN via deres API
 * 3. Alle henvendelser fra interessenter kommer tilbake INN i EiendomsPRO
 *    (du slipper å administrere to plattformer)
 * 4. Annonsen kan oppdateres/arkiveres herfra
 *
 * Tilgang krever en API-partneravtale med FINN:
 * - Du signerer en API-avtale og får orgID + hemmelig API-nøkkel
 * - Nøkkelen sendes i en egen header på hvert kall
 * - Annonser publiseres kun mot din egen FINN-spesifikke orgID
 *
 * VIKTIG: FINN gir ikke åpen tilgang — søk om partneravtale via finn.no/api.
 * Inntil avtalen er på plass returnerer denne tjenesten mock-data slik at
 * resten av appen kan bygges og testes.
 */

// Hemmeligheter ligger IKKE i nettleseren. Når FINN-avtalen er på plass flyttes
// dette kallet til en serverless function i /api som leser FINN_*-secrets fra
// Vercel-miljøet. Inntil da er tjenesten en stub.
function getConfig() {
  return { apiKey: null, orgId: null, baseUrl: 'https://cache.api.finn.no/iad' };
}

export function finnKonfigurert() {
  const c = getConfig();
  return !!(c.apiKey && c.orgId);
}

// ─── Publiser annonse til FINN ────────────────────────────────────────────────
/**
 * @param {object} annonse  - annonse-objektet fra appen
 * @returns {Promise<{ finnKode, url, status }>}
 */
export async function publiserTilFinn(annonse) {
  if (!finnKonfigurert()) {
    console.info('[FINN STUB] Ikke konfigurert — returnerer mock FINN-kode');
    // Simuler en FINN-kode (9 siffer som ekte FINN-koder)
    const mockKode = String(300000000 + Math.floor(Math.random() * 99999999));
    return {
      finnKode: mockKode,
      url: `https://www.finn.no/realestate/lettings/ad.html?finnkode=${mockKode}`,
      status: 'stub',
      melding: 'FINN-integrasjon er ikke aktivert ennå. Annonsen er klar til publisering når API-avtalen er på plass.',
    };
  }

  const c = getConfig();
  const body = byggFinnPayload(annonse);

  const resp = await fetch(`${c.baseUrl}/ad`, {
    method: 'POST',
    headers: {
      'FINN-APIKEY': c.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`FINN publiseringsfeil: ${resp.status} ${await resp.text()}`);
  const data = await resp.json();
  return {
    finnKode: data.finnkode,
    url: `https://www.finn.no/realestate/lettings/ad.html?finnkode=${data.finnkode}`,
    status: 'publisert',
  };
}

// ─── Oppdater eksisterende annonse ────────────────────────────────────────────
export async function oppdaterFinnAnnonse(finnKode, annonse) {
  if (!finnKonfigurert() || !finnKode) {
    return { status: 'stub' };
  }
  const c = getConfig();
  const resp = await fetch(`${c.baseUrl}/ad/${finnKode}`, {
    method: 'PUT',
    headers: { 'FINN-APIKEY': c.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(byggFinnPayload(annonse)),
  });
  if (!resp.ok) throw new Error(`FINN oppdateringsfeil: ${resp.status}`);
  return { status: 'oppdatert' };
}

// ─── Avpubliser / arkiver annonse ─────────────────────────────────────────────
export async function avpubliserFinn(finnKode) {
  if (!finnKonfigurert() || !finnKode) return { status: 'stub' };
  const c = getConfig();
  const resp = await fetch(`${c.baseUrl}/ad/${finnKode}`, {
    method: 'DELETE',
    headers: { 'FINN-APIKEY': c.apiKey },
  });
  if (!resp.ok) throw new Error(`FINN avpubliseringsfeil: ${resp.status}`);
  return { status: 'avpublisert' };
}

// ─── Hent henvendelser fra interessenter ──────────────────────────────────────
export async function hentInteressenter(finnKode) {
  if (!finnKonfigurert() || !finnKode) return [];
  const c = getConfig();
  const resp = await fetch(`${c.baseUrl}/ad/${finnKode}/messages`, {
    headers: { 'FINN-APIKEY': c.apiKey },
  });
  if (!resp.ok) return [];
  return resp.json();
}

// ─── Bygg FINN-payload fra appens annonse-format ──────────────────────────────
function byggFinnPayload(a) {
  return {
    type: 'REALESTATE_LETTING',
    title: a.tittel,
    description: a.beskrivelse,
    price: { amount: Number(a.maanedligLeie), currency: 'NOK' },
    deposit: Number(a.depositum) || 0,
    property: {
      size: Number(a.areal) || 0,
      bedrooms: Number(a.antallRom) || 0,
      floor: a.etasje || '',
      type: a.boligtype || 'leilighet',
    },
    available_from: a.tilgjengeligFra || null,
    facilities: [
      a.inkluderer?.strom && 'electricity_included',
      a.inkluderer?.internett && 'internet',
      a.inkluderer?.parkering && 'parking',
      a.dyrTillatt && 'pets_allowed',
    ].filter(Boolean),
    images: (a.bilder || []).map((b) => ({ url: b })),
    contact: { name: a.kontaktNavn || '', phone: a.kontaktTlf || '', email: a.kontaktEpost || '' },
  };
}
