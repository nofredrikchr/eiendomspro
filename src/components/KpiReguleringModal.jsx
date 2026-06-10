import { useState, useEffect } from 'react';
import { X, TrendingUp, ArrowRight, Check, Send, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { beregnNyLeie, nesteReguleringTekst, kanReguleresNaa } from '../utils/kpi';
import { beregnKpiJustering, ssbMaanedTilTekst } from '../services/ssbKpi';
import { sendKpiVarsel, tidligsteIkrafttredelse } from '../services/varslingService';
import { formatKr } from '../utils/format';

/**
 * Modal for KPI-regulering av husleie.
 * - Henter KPI-endringen automatisk fra SSB (siste publiserte tall), basert på
 *   når leien sist ble fastsatt. Kan overstyres manuelt.
 * - Sender varsel til leietaker (e-post/SMS) og gir utleier bekreftelse.
 * onLagre(nyLeie) oppdaterer kontraktens leie og setter sisteRegulering = i dag.
 */
export function KpiReguleringModal({ kontrakt, onLagre, onLukk }) {
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

  const kanalTekst = resultat?.kanaler?.map((k) => (k === 'epost' ? 'e-post' : 'SMS')).join(' og ') || 'e-post';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onLukk}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#FFFFFF] border border-[#E9E8E2] rounded-2xl p-6 w-full max-w-md shadow-soft space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#9A7A24]/15 flex items-center justify-center">
              <TrendingUp size={15} className="text-[#9A7A24]" />
            </div>
            <h3 className="text-base font-semibold text-[#1A1B1E]">KPI-regulering av leie</h3>
          </div>
          <button type="button" onClick={onLukk} className="text-[#7A7D83] hover:text-[#1A1B1E] cursor-pointer"><X size={16} /></button>
        </div>

        {!kanNaa && nesteDato && (
          <div className="bg-[#B45309]/5 border border-[#B45309]/20 rounded-lg p-3 text-xs text-[#B45309] leading-relaxed">
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
          <div className="mt-1.5 text-xs flex items-center gap-1.5">
            {auto === 'laster' && <span className="flex items-center gap-1 text-[#7A7D83]"><Loader2 size={11} className="animate-spin" /> Henter KPI fra SSB …</span>}
            {auto === 'ok' && kilde && <span className="text-[#15803D]">✓ Hentet automatisk: {kilde}</span>}
            {auto === 'feil' && <span className="text-[#7A7D83]">Fant ikke automatisk KPI — fyll inn manuelt (se ssb.no/kpi).</span>}
          </div>
        </div>

        {/* Beregning */}
        <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-xs text-[#7A7D83] mb-1">Gjeldende leie</div>
              <div className="text-lg font-bold text-[#1A1B1E] num">{formatKr(gjeldende)}</div>
            </div>
            <ArrowRight size={18} className="text-[#7A7D83] mx-3" />
            <div className="text-center flex-1">
              <div className="text-xs text-[#7A7D83] mb-1">Ny leie</div>
              <div className="text-lg font-bold text-[#15803D] num">{formatKr(nyLeie)}</div>
            </div>
          </div>
          <div className="text-center mt-3 pt-3 border-t border-[#E9E8E2]">
            <span className="text-xs text-[#7A7D83]">Økning: </span>
            <span className="text-sm font-medium text-[#9A7A24] num">+ {formatKr(okning)}/mnd</span>
            <span className="text-xs text-[#7A7D83]"> ({formatKr(okning * 12)}/år)</span>
          </div>
        </div>

        {/* Varsling */}
        {varsling !== 'sendt' ? (
          <div className="rounded-xl border border-[#E9E8E2] p-4">
            <div className="text-sm font-medium text-[#1A1B1E] mb-1">Varsle leietaker</div>
            <p className="text-xs text-[#65696F] leading-relaxed mb-3">
              {kontrakt.leietakerNavn || 'Leietaker'} får skriftlig varsel på {kontrakt.leietakerEpost ? 'e-post' : '—'}{samtykke && kontrakt.leietakerTlf ? ' og SMS' : ''}. Ny leie <strong className="text-[#1A1B1E]">{formatKr(nyLeie)}</strong> foreslås gjeldende fra <strong className="text-[#1A1B1E]">{gjelderFraTekst}</strong> (minst én måned frem).
            </p>
            {!kontrakt.leietakerEpost && (
              <p className="text-xs text-[#B45309] mb-3 flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> Mangler leietakers e-post på kontrakten.</p>
            )}
            <Button variant="primary" className="w-full justify-center" disabled={varsling === 'sender' || !kontrakt.leietakerEpost}
              onClick={sendVarsel}>
              {varsling === 'sender' ? <><Loader2 size={14} className="animate-spin" /> Sender varsel …</> : <><Send size={14} /> Send varsel til leietaker</>}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-[#15803D]/25 bg-[#15803D]/5 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#15803D]/15 flex items-center justify-center"><Check size={14} className="text-[#15803D]" /></div>
              <span className="text-sm font-medium text-[#1A1B1E]">Leietaker varslet</span>
            </div>
            <div className="text-xs text-[#65696F] leading-relaxed space-y-1">
              <div>Sendt på <strong className="text-[#1A1B1E]">{kanalTekst}</strong> {new Date(resultat.sendtTidspunkt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}.</div>
              <div>Ny leie <strong className="text-[#1A1B1E]">{formatKr(nyLeie)}</strong> gjelder fra <strong className="text-[#1A1B1E]">{gjelderFraTekst}</strong>.</div>
              <div className="text-[#7A7D83]">Du har fått bekreftelse som utleier.</div>
              {resultat.simulert && <div className="text-[#B45309] mt-1">Demo: faktisk utsending aktiveres når e-post/SMS-tjeneste er koblet på.</div>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onLukk}>Avbryt</Button>
          <Button variant="primary" className="flex-1 justify-center" onClick={() => onLagre(nyLeie)}>
            Oppdater leie til {formatKr(nyLeie)}
          </Button>
        </div>
      </div>
    </div>
  );
}
