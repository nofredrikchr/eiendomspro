import { useState, useEffect } from 'react';
import { X, TrendingUp, ArrowRight, Check, Send, Loader2, AlertTriangle, FileDown } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { IconTile } from './ui/kit';
import { beregnNyLeie, nesteReguleringTekst, kanReguleresNaa } from '../utils/kpi';
import { beregnKpiJustering, ssbMaanedTilTekst } from '../services/ssbKpi';
import { sendKpiVarsel, tidligsteIkrafttredelse } from '../services/varslingService';
import { genererKpiVarselPDF } from '../utils/kpiVarselPDF';
import { formatKr } from '../utils/format';

/**
 * Modal for KPI-regulering av husleie.
 * - Henter KPI-endringen automatisk fra SSB (siste publiserte tall), basert på
 *   når leien sist ble fastsatt. Kan overstyres manuelt.
 * - Sender varsel til leietaker (e-post/SMS) og gir utleier bekreftelse.
 * onLagre(nyLeie) oppdaterer kontraktens leie og setter sisteRegulering = i dag.
 */
export function KpiReguleringModal({ kontrakt, utleier, adresse, onLagre, onLukk }) {
  const [kpi, setKpi] = useState('');
  const [auto, setAuto] = useState('laster'); // laster | ok | feil
  const [kilde, setKilde] = useState('');
  const [varsling, setVarsling] = useState('klar'); // klar | sender | sendt
  const [resultat, setResultat] = useState(null);

  const gjeldende = Number(kontrakt.maanedligLeie) || 0;
  const nyLeie = beregnNyLeie(gjeldende, kpi || 0);
  const okning = nyLeie - gjeldende;
  const kanNaa = kanReguleresNaa(kontrakt);
  const nesteDato = nesteReguleringTekst(kontrakt);
  const gjelderFra = tidligsteIkrafttredelse();
  const gjelderFraTekst = gjelderFra.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  const samtykke = kontrakt.elektroniskKommunikasjon !== false;

  // Hent KPI automatisk fra SSB. Mangler basisdato, går vi rett til fallback via
  // en resolvet promise (ingen synkron setState i effekten → ingen cascading render).
  useEffect(() => {
    let aktiv = true;
    const basis = kontrakt.sisteRegulering || kontrakt.startdato;
    const basisMnd = basis ? String(basis).slice(0, 7) : null; // 'YYYY-MM'
    const hent = basisMnd
      ? beregnKpiJustering(gjeldende || 10000, basisMnd)
      : Promise.resolve({ ok: false });
    hent.then((r) => {
      if (!aktiv) return;
      if (r.ok) {
        setKpi(r.endringPst.toFixed(1));
        setKilde(`KPI fra ${ssbMaanedTilTekst(r.fraMaaned)} til ${ssbMaanedTilTekst(r.tilMaaned)} (SSB)`);
        setAuto('ok');
      } else { setAuto('feil'); setKpi('3.5'); }
    }).catch(() => { if (aktiv) { setAuto('feil'); setKpi('3.5'); } });
    return () => { aktiv = false; };
  }, [kontrakt, gjeldende]);

  async function sendVarsel() {
    setVarsling('sender');
    const r = await sendKpiVarsel({
      leietaker: { navn: kontrakt.leietakerNavn, epost: kontrakt.leietakerEpost, tlf: kontrakt.leietakerTlf },
      gammelLeie: gjeldende, nyLeie, gjelderFra: gjelderFra.toISOString(), elektroniskSamtykke: samtykke,
    });
    setResultat(r); setVarsling('sendt');
  }

  function lastNedVarsel() {
    genererKpiVarselPDF({
      utleier: utleier || { navn: kontrakt.utleierNavn },
      leietaker: { navn: kontrakt.leietakerNavn, epost: kontrakt.leietakerEpost, tlf: kontrakt.leietakerTlf },
      adresse: adresse || '',
      gjeldendeLeie: gjeldende,
      nyLeie,
      kpiProsent: Number(kpi) || 0,
      kpiKilde: kilde,
      gjelderFra,
    });
  }

  const kanalTekst = resultat?.kanaler?.map((k) => (k === 'epost' ? 'e-post' : 'SMS')).join(' og ') || 'e-post';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onLukk}>
      <div className="absolute inset-0 bg-[#141A17]/45 backdrop-blur-sm" />
      <div
        className="relative bg-surface border border-line rounded-3xl w-full max-w-md shadow-soft max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-line shrink-0">
          <div className="flex items-center gap-2.5">
            <IconTile tone="mint" size={34}><TrendingUp size={16} /></IconTile>
            <h3 className="m-0 text-base font-extrabold tracking-[-0.01em] text-ink">KPI-regulering av leie</h3>
          </div>
          <button type="button" onClick={onLukk} aria-label="Lukk" className="text-muted-2 hover:text-ink transition-colors cursor-pointer w-8 h-8 flex items-center justify-center rounded-[10px] hover:bg-line-soft">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {!kanNaa && nesteDato && (
            <div className="bg-amber-soft border border-amber-line rounded-xl p-3 text-[12.5px] font-medium text-amber leading-relaxed">
              Leien kan tidligst reguleres {nesteDato} (ett år etter forrige fastsettelse, jf. husleieloven § 4-2). Du kan likevel forberede reguleringen nå.
            </div>
          )}

          {/* KPI-input — auto fra SSB, kan overstyres */}
          <div>
            <Input
              label="KPI-endring (%)" type="number" step="0.1" value={kpi}
              onChange={(e) => { setKpi(e.target.value); setAuto('ok'); }}
              placeholder="3.5"
            />
            <div className="mt-1.5 text-[12px] font-medium flex items-center gap-1.5">
              {auto === 'laster' && <span className="flex items-center gap-1.5 text-muted-2"><Loader2 size={11} className="animate-spin text-brand" /> Henter KPI fra SSB …</span>}
              {auto === 'ok' && kilde && <span className="flex items-center gap-1.5 text-brand-ink"><Check size={12} /> Hentet automatisk: {kilde}</span>}
              {auto === 'feil' && <span className="text-muted-2">Fant ikke automatisk KPI — fyll inn manuelt (se ssb.no/kpi).</span>}
            </div>
          </div>

          {/* Beregning */}
          <div className="bg-sand border border-line rounded-[14px] p-4">
            <div className="flex items-center gap-3.5">
              <div className="flex-1 text-center">
                <div className="text-[11.5px] font-bold text-faint mb-1">Gjeldende leie</div>
                <div className="num text-lg font-extrabold text-ink">{formatKr(gjeldende)}</div>
              </div>
              <ArrowRight size={18} strokeWidth={2.2} className="text-brand shrink-0" />
              <div className="flex-1 text-center">
                <div className="text-[11.5px] font-bold text-faint mb-1">Ny leie</div>
                <div className="num text-lg font-extrabold text-brand-ink">{formatKr(nyLeie)}</div>
              </div>
            </div>
            <div className="mt-3.5 pt-3 border-t border-line text-center text-[13px] font-semibold text-muted">
              Økning <span className="num font-extrabold text-brand-ink">+{formatKr(okning)}/mnd</span>
              <span> ({formatKr(okning * 12)}/år)</span>
            </div>
          </div>

          {/* Varsling */}
          {varsling !== 'sendt' ? (
            <div className="rounded-[14px] border border-line p-4">
              <div className="text-sm font-bold text-ink mb-1">Varsle leietaker</div>
              <p className="text-[12.5px] font-medium text-muted leading-relaxed mb-3">
                {kontrakt.leietakerNavn || 'Leietaker'} får skriftlig varsel på {kontrakt.leietakerEpost ? 'e-post' : '—'}{samtykke && kontrakt.leietakerTlf ? ' og SMS' : ''}. Ny leie <strong className="font-bold text-ink">{formatKr(nyLeie)}</strong> foreslås gjeldende fra <strong className="font-bold text-ink">{gjelderFraTekst}</strong> (minst én måned frem).
              </p>
              {!kontrakt.leietakerEpost && (
                <p className="text-[12px] font-medium text-amber mb-3 flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Mangler leietakers e-post på kontrakten.</p>
              )}
              <Button variant="primary" className="w-full justify-center" disabled={varsling === 'sender' || !kontrakt.leietakerEpost} onClick={sendVarsel}>
                {varsling === 'sender' ? <><Loader2 size={14} className="animate-spin" /> Sender varsel …</> : <><Send size={14} /> Send varsel til leietaker</>}
              </Button>
              <Button variant="secondary" className="w-full justify-center mt-2.5" onClick={lastNedVarsel}>
                <FileDown size={14} /> Last ned varselbrev (PDF)
              </Button>
            </div>
          ) : (
            <div className="rounded-[14px] border border-mint-line bg-mint-soft p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-mint flex items-center justify-center shrink-0"><Check size={14} className="text-brand-ink" /></span>
                <span className="text-sm font-bold text-ink">Leietaker varslet</span>
              </div>
              <div className="text-[12.5px] font-medium text-muted leading-relaxed space-y-1">
                <div>Sendt på <strong className="font-bold text-ink">{kanalTekst}</strong> {new Date(resultat.sendtTidspunkt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.</div>
                <div>Ny leie <strong className="font-bold text-ink">{formatKr(nyLeie)}</strong> gjelder fra <strong className="font-bold text-ink">{gjelderFraTekst}</strong>.</div>
                <div className="text-muted-2">Du har fått bekreftelse som utleier.</div>
                {resultat.simulert && <div className="text-amber mt-1">Demo: faktisk utsending aktiveres når e-post/SMS-tjeneste er koblet på.</div>}
              </div>
              <Button variant="secondary" className="w-full justify-center mt-3" onClick={lastNedVarsel}>
                <FileDown size={14} /> Last ned varselbrev (PDF)
              </Button>
            </div>
          )}

          <div className="flex gap-2.5">
            <Button variant="secondary" className="flex-1 justify-center" onClick={onLukk}>Avbryt</Button>
            <Button variant="primary" className="flex-1 justify-center" onClick={() => onLagre(nyLeie)}>
              Oppdater leie til {formatKr(nyLeie)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
