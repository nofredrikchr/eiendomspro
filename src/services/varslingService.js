/**
 * Varsling (e-post + SMS) for leieregulering.
 *
 * ⚠️ STUB: Faktisk utsending krever en backend — API-nøkler til e-post/SMS kan
 * ikke ligge i nettleseren. Når backend er på plass, bytt ut simuleringen under
 * med et kall til ditt eget endepunkt (f.eks. POST /api/varsel), som igjen bruker:
 *   - E-post: Resend / Postmark / SendGrid
 *   - SMS:    Sveve / LINK Mobility / Twilio
 *
 * Funksjonen er trygg å kalle nå — den simulerer utsending og returnerer hva som
 * VILLE blitt sendt, slik at resten av flyten (logging, utleiers oversikt) virker.
 */

export async function sendKpiVarsel({ leietaker = {}, gammelLeie, nyLeie, gjelderFra, elektroniskSamtykke = true }) {
  const kanaler = [];
  if (leietaker.epost) kanaler.push('epost');
  if (elektroniskSamtykke && leietaker.tlf) kanaler.push('sms');

  // ── SIMULERT utsending (ingen faktisk e-post/SMS sendes ennå) ──
  await new Promise((r) => setTimeout(r, 600));

  return {
    ok: true,
    simulert: true,
    sendtTidspunkt: new Date().toISOString(),
    kanaler,
    leietakerVarslet: !!leietaker.epost,
    utleierBekreftet: true,
    detaljer: { gammelLeie, nyLeie, gjelderFra },
  };
}

/** Første dag i måneden som er minst én hel måned frem i tid (lovkrav: ≥ 1 mnd varsel). */
export function tidligsteIkrafttredelse(fraDato = new Date()) {
  const d = new Date(fraDato);
  d.setDate(1);
  d.setMonth(d.getMonth() + 2); // konservativt: alltid ≥ 1 full måned varsel
  return d;
}
