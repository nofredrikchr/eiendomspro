/**
 * E-postutsending via Resend. Dormant til RESEND_API_KEY er satt i Vercel.
 * Uten nøkkel logges e-posten server-side og { sendt:false } returneres —
 * resten av flyten (token-generering) virker, men lenken når ikke brukeren før
 * Resend er konfigurert (se SETUP-FASE1.md).
 */
const RESEND_KEY = process.env.RESEND_API_KEY;
const FRA = process.env.EPOST_FRA || 'EiendomsPRO <onboarding@resend.dev>';

export function epostKonfigurert() {
  return !!RESEND_KEY;
}

export async function sendEpost({ til, emne, html }) {
  if (!RESEND_KEY) {
    console.info(`[epost] RESEND_API_KEY mangler — ikke sendt. Til=${til} Emne=${emne}`);
    return { sendt: false, grunn: 'ikke_konfigurert' };
  }
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: FRA, to: [til], subject: emne, html }),
    });
    if (!resp.ok) {
      console.error('[epost] Resend-feil', resp.status, await resp.text().catch(() => ''));
      return { sendt: false, grunn: 'resend_feil' };
    }
    return { sendt: true };
  } catch (e) {
    console.error('[epost] unntak', e.message);
    return { sendt: false, grunn: 'unntak' };
  }
}

// ─── Enkle e-postmaler ──────────────────────────────────────────────────────────
export function malVerifisering(lenke) {
  return {
    emne: 'Bekreft e-postadressen din – EiendomsPRO',
    html: `<p>Velkommen til EiendomsPRO!</p><p>Bekreft e-postadressen din ved å klikke lenken under:</p>
           <p><a href="${lenke}">Bekreft e-post</a></p><p>Lenken er gyldig i 24 timer.</p>`,
  };
}
export function malReset(lenke) {
  return {
    emne: 'Tilbakestill passord – EiendomsPRO',
    html: `<p>Du (eller noen) har bedt om å tilbakestille passordet ditt.</p>
           <p><a href="${lenke}">Velg nytt passord</a></p>
           <p>Lenken er gyldig i 1 time. Ignorer denne e-posten hvis det ikke var deg.</p>`,
  };
}
