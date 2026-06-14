/** DB-lag for KPI-reguleringsvarsler (eier-scopet). Historikk bevares ved nedgradering (punkt G/L). */
import { sql } from '../_db.js';

/** Opprett et varselutkast. Unik delvis-indeks hindrer dobbelt utkast per kontrakt. */
export async function opprettUtkast(eierId, {
  kontraktId, gjeldendeLeieOre, nyLeieOre, kpiRef, foreslattIkrafttredelse,
}) {
  const r = await sql`
    insert into kpi_varsler (eier_id, kontrakt_id, status, gjeldende_leie_ore, ny_leie_ore, kpi_ref, foreslatt_ikrafttredelse)
    values (${eierId}, ${kontraktId}, 'utkast', ${gjeldendeLeieOre}, ${nyLeieOre}, ${kpiRef}, ${foreslattIkrafttredelse})
    on conflict (kontrakt_id) where (status = 'utkast') do nothing
    returning *`;
  return r[0] || null;
}

export async function hentVarsler(eierId) {
  return sql`select * from kpi_varsler where eier_id = ${eierId} order by opprettet desc`;
}

export async function hentVarsel(eierId, id) {
  const r = await sql`select * from kpi_varsler where id = ${id} and eier_id = ${eierId} limit 1`;
  return r[0] || null;
}

export async function markerSendt(eierId, id) {
  const r = await sql`
    update kpi_varsler set status = 'sendt', sendt_tidspunkt = now()
    where id = ${id} and eier_id = ${eierId} and status = 'utkast'
    returning *`;
  return r[0] || null;
}
