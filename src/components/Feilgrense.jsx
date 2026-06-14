import { Component } from 'react';

/**
 * Feilgrense (React error boundary). Fanger kjøretidsfeil i en underside slik at
 * EN side-feil aldri svartlegger hele appen (uten dette unmountes hele treet og
 * brukeren får en blank skjerm). Viser en vennlig melding + «Last på nytt», og
 * logger feilen til konsollen for feilsøking.
 */
export class Feilgrense extends Component {
  constructor(props) {
    super(props);
    this.state = { feil: null };
  }

  static getDerivedStateFromError(feil) {
    return { feil };
  }

  componentDidCatch(feil, info) {
    console.error('[Feilgrense]', feil, info?.componentStack);
  }

  render() {
    if (this.state.feil) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl border border-line bg-surface p-6 text-center">
            <div className="text-lg font-extrabold text-ink mb-1.5">Noe gikk galt på denne siden</div>
            <p className="text-sm text-muted leading-relaxed mb-4">
              Vi klarte ikke å vise innholdet. Prøv å laste siden på nytt — resten av appen fungerer fortsatt.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-xl bg-brand text-white px-5 py-2.5 text-sm font-bold hover:bg-brand-hover cursor-pointer"
            >
              Last siden på nytt
            </button>
            {this.state.feil?.message && (
              <details className="mt-4 text-left">
                <summary className="text-xs font-semibold text-faint cursor-pointer">Tekniske detaljer</summary>
                <pre className="mt-2 text-[11px] text-muted whitespace-pre-wrap break-words">{String(this.state.feil.message)}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
