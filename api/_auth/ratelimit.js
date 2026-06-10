import { sql } from '../_db.js';

/**
 * Enkel DB-basert rate limiter. Returnerer true hvis forsøket er TILLATT
 * (under grensen i tidsvinduet), false hvis det skal blokkeres.
 * Vinduet nullstilles når det er utløpt.
 *
 * Fail-open ved DB-feil (tilgjengelighet > blokkering), men feilen logges.
 * Opportunistisk opprydding: ved hver sjekk slettes utløpte rader med samme
 * nøkkel-prefiks (delen før første ':'), så tabellen holder seg liten uten
 * egen cron-jobb.
 */
export async function sjekkRate(nokkel, maks, vinduSek) {
  try {
    // Billig opprydding: fjern utløpte vinduer i samme kategori (f.eks. 'login:%').
    const prefiks = `${String(nokkel).split(':')[0]}:%`;
    await sql`delete from rate_limit where nokkel like ${prefiks} and vindu_utloper < now()`;

    const rader = await sql`
      insert into rate_limit (nokkel, teller, vindu_utloper)
      values (${nokkel}, 1, now() + (${vinduSek} || ' seconds')::interval)
      on conflict (nokkel) do update set
        teller = case when rate_limit.vindu_utloper < now() then 1 else rate_limit.teller + 1 end,
        vindu_utloper = case when rate_limit.vindu_utloper < now()
                             then now() + (${vinduSek} || ' seconds')::interval
                             else rate_limit.vindu_utloper end
      returning teller`;
    return (rader[0]?.teller ?? 1) <= maks;
  } catch (feil) {
    console.error('[ratelimit] sjekk feilet — slipper gjennom (fail-open):', feil);
    return true; // ved DB-feil: ikke lås brukeren ute
  }
}
