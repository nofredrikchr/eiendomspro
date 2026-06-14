/**
 * BankID-signeringsadapter (Signicat). Engangssignering av leiekontrakt.
 *
 * Standard er STUB-modus: uten SIGNICAT_CLIENT_ID simuleres en ferdig signert
 * kontrakt slik at flyten kan demonstreres i preview. Når Signicat-nøkler er på
 * plass (se oppsettsguiden) brukes ekte BankID.
 *
 * Faktisk leverandørkostnad (~30 kr) logges internt per signering for marginrapport
 * (kontrakt_signeringer.leverandor_kostnad_ore).
 */
const SIGNICAT_CLIENT_ID = process.env.SIGNICAT_CLIENT_ID || null;

export function erStub() {
  return !SIGNICAT_CLIENT_ID;
}

/**
 * Start en BankID-signeringsordre. Stub: returnerer umiddelbart en «signert»
 * referanse + dokument-URL (simulert). Ekte: oppretter Signicat-ordre og gir
 * redirect-URL der signereren autentiserer med BankID.
 */
export async function startSignering({ signeringId, signerendeNavn, suksessUrl }) {
  void signerendeNavn; // brukes av ekte Signicat-kall (under), ikke i stub
  if (erStub()) {
    return {
      stub: true,
      ferdigSignert: true, // simulert: signeres «umiddelbart» i stub
      signeringRef: `stub_${signeringId}`,
      signertDokumentUrl: `/api/signering/${signeringId}/dokument`,
      url: suksessUrl,
    };
  }
  // ── Ekte Signicat (aktiveres når nøkler finnes) ──
  // const ordre = await signicat.createSignatureOrder({ ... signerendeNavn ... });
  // return { stub:false, ferdigSignert:false, signeringRef: ordre.id, url: ordre.signUrl };
  throw Object.assign(new Error('Signicat ikke konfigurert'), { status: 500, feil: 'BankID-signering ikke ferdig konfigurert.' });
}

/** Hent ferdig signert PDF (fra Signicat). Stub: en plassholder. */
export async function hentSignertDokument(signeringRef) {
  void signeringRef; // brukes av ekte Signicat-kall (under), ikke i stub
  if (erStub()) return { stub: true, innhold: null };
  // return await signicat.getSignedDocument(signeringRef);
  return { stub: false, innhold: null };
}
