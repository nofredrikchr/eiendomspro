/**
 * Genererer korrekt formulert varsel om leieregulering etter KPI (husleieloven § 4-2):
 * dagens leie, KPI-referanse, ny leie, ikrafttredelsesdato og lovhenvisning.
 * Ren funksjon (testbar).
 */
function kr(ore) {
  const n = Math.round((ore || 0) / 100);
  return `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} kr`;
}

function datoNo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('nb-NO', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function byggVarselTekst({
  utleierNavn = '', leietakerNavn = '', adresse = '',
  gjeldendeLeieOre, nyLeieOre, kpiRef, ikrafttredelse,
}) {
  const okning = (nyLeieOre || 0) - (gjeldendeLeieOre || 0);
  return [
    `VARSEL OM ENDRING AV LEIE (KPI-REGULERING)`,
    ``,
    leietakerNavn ? `Til: ${leietakerNavn}` : `Til: leietaker`,
    adresse ? `Leieobjekt: ${adresse}` : null,
    ``,
    `Med hjemmel i husleieloven § 4-2 varsles det herved om at leien reguleres i`,
    `takt med endringen i konsumprisindeksen (KPI) fra Statistisk sentralbyrå.`,
    ``,
    `Dagens leie: ${kr(gjeldendeLeieOre)} per måned`,
    `Ny leie: ${kr(nyLeieOre)} per måned (økning på ${kr(okning)})`,
    kpiRef ? `Grunnlag: ${kpiRef}` : null,
    ``,
    `Ny leie gjelder fra og med ${datoNo(ikrafttredelse)}.`,
    ``,
    `Endringen er varslet med minst én måneds frist, slik husleieloven § 4-2 krever.`,
    `Reguleringen skjer tidligst ett år etter forrige leiefastsettelse.`,
    ``,
    utleierNavn ? `Med vennlig hilsen` : null,
    utleierNavn || null,
  ].filter((l) => l !== null).join('\n');
}
