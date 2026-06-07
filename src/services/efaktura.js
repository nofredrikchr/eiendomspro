/**
 * eFaktura / AvtaleGiro — Nets B2C-betalingstjenester for husleie
 *
 * Dokumentasjon: https://www.nets.eu/no-nb/losninger/innkreving/
 * AvtaleGiro: https://developer.nets.eu/avtalegiro
 *
 * To separate tjenester som gjerne kombineres:
 *
 * eFaktura:
 * - Digital faktura som dukker opp i leietakers nettbank
 * - Leietaker godkjenner/avviser — betaler selv
 * - Krever at mottaker har aktivert eFaktura i sin bank
 *
 * AvtaleGiro:
 * - Automatisk trekk fra leietakers konto på forfallsdato
 * - Leietaker inngår avtale én gang (med BankID via Nets)
 * - Etter det trekkes husleien automatisk hver måned
 * - IDEELL for faste månedlige leiebetalinger
 *
 * Pengeflyten:
 * - Penger går fra leietakers konto → direkte til utleiers konto
 * - EiendomsPRO er aldri involvert i selve pengeflyten
 * - Vi sender kun instruksjoner til Nets via API
 *
 * Krav for å komme i gang:
 * 1. Utleier må ha bankavtale som inkluderer AvtaleGiro/eFaktura (de fleste norske banker)
 * 2. Utleier får et Avtalegirokunde-nr fra banken
 * 3. EiendomsPRO integrerer som teknisk tjenesteleverandør
 *
 * TODO: Inngå avtale med Nets som teknisk tjenesteleverandør
 * Kontakt: nets.eu/no-nb/kontakt
 */

// Hemmeligheter ligger IKKE i nettleseren. Når Nets aktiveres flyttes dette
// kallet til en serverless function i /api som leser NETS_*-secrets fra
// Vercel-miljøet. Inntil da er tjenesten en stub.
function getConfig() {
  return { avtalegiroKundeNr: null, apiKey: null, baseUrl: 'https://test.api.nets.eu' };
}

export function netsKonfigurert() {
  const c = getConfig();
  return !!(c.avtalegiroKundeNr && c.apiKey);
}

// ─── Send eFaktura ────────────────────────────────────────────────────────────
/**
 * @param {object} params
 * @param {string} params.kidNummer
 * @param {number} params.belop           - i øre
 * @param {string} params.forfallsdato    - YYYY-MM-DD
 * @param {string} params.leietakerFnr    - fødselsnummer (kreves av eFaktura B2C)
 * @param {string} params.utleierKonto    - 11-sifret kontonummer uten punktum
 * @param {string} params.tekstmelding    - vises i nettbanken
 */
export async function sendEfaktura({ kidNummer, belop, forfallsdato, leietakerFnr, utleierKonto, tekstmelding }) {
  if (!netsKonfigurert()) {
    console.info('[Nets eFaktura STUB] Ikke konfigurert');
    return { fakturaId: `mock_efaktura_${Date.now()}`, status: 'stub' };
  }
  // TODO: implementer Nets eFaktura B2C API-kall her
  throw new Error('Nets eFaktura API ikke implementert ennå');
}

// ─── Opprett AvtaleGiro-avtale for leietaker ──────────────────────────────────
/**
 * Sender SMS/epost til leietaker med link for å godta AvtaleGiro
 * Leietaker signerer med BankID via Nets — etter det trekkes leie automatisk
 *
 * @param {object} params
 * @param {string} params.kontraktId
 * @param {string} params.kidNummer
 * @param {number} params.belopKroner     - månedlig leie i kroner
 * @param {number} params.trekkdag        - dag i måneden (1, 15, etc.)
 * @param {string} params.leietakerEpost
 * @param {string} params.utleierKonto
 */
export async function opprettAvtalegiro({ kontraktId, kidNummer, belopKroner, trekkdag, leietakerEpost, utleierKonto }) {
  if (!netsKonfigurert()) {
    console.info('[AvtaleGiro STUB] Ikke konfigurert');
    return {
      avtaleId:   `mock_ag_${Date.now()}`,
      avtaleUrl:  'https://test.betalingstjenester.nets.eu/avtalegiro/demo',
      status:     'stub',
      melding:    'AvtaleGiro er ikke konfigurert ennå. Leietaker vil motta en link for å sette opp automatisk betaling.',
    };
  }
  // TODO: implementer Nets AvtaleGiro API
  throw new Error('AvtaleGiro API ikke implementert ennå');
}

// ─── Statuser ─────────────────────────────────────────────────────────────────
export const AVTALEGIRO_STATUS = {
  IKKE_OPPRETTET: 'ikke_opprettet',
  INVITERT:       'invitert',       // leietaker sendt link
  AKTIV:          'aktiv',          // avtale godtatt, trekk aktivt
  STOPPET:        'stoppet',        // avtale avsluttet
  FEILET:         'feilet',
};
