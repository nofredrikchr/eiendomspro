import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Send, Check, Lock, Copy } from 'lucide-react';
import { kpiVarslerApi } from '../../services/abonnementApi';
import { usePlan } from '../../hooks/usePlan';
import { formaterKr } from '../../lib/planer';

/**
 * Viser automatisk genererte KPI-reguleringsvarsler (utkast fra daglig cron) og lar
 * utleier sende korrekt formulert varsel til leietaker (husleieloven § 4-2).
 * KPI-varsling er kun aktiv for betalende abonnenter (punkt G); historikk vises uansett.
 */
export default function KpiVarslerPanel() {
  const navigate = useNavigate();
  const { canUse } = usePlan();
  const [varsler, setVarsler] = useState([]);
  const [aktiv, setAktiv] = useState(true);
  const [lastet, setLastet] = useState(false);
  const [valgt, setValgt] = useState(null); // { id, tekst }
  const [sender, setSender] = useState(null);
  const [kopiert, setKopiert] = useState(false);

  useEffect(() => {
    let på = true;
    kpiVarslerApi.hent()
      .then((d) => { if (på) { setVarsler(d.varsler || []); setAktiv(d.aktiv); } })
      .catch(() => {})
      .finally(() => { if (på) setLastet(true); });
    return () => { på = false; };
  }, []);

  async function send(id) {
    setSender(id);
    try {
      const d = await kpiVarslerApi.send(id);
      setValgt({ id, tekst: d.tekst });
      setVarsler((prev) => prev.map((v) => (v.id === id ? { ...v, status: 'sendt' } : v)));
    } catch (e) {
      if (e.status === 402) navigate('/priser');
    } finally {
      setSender(null);
    }
  }

  if (!lastet) return null;

  // Ikke betalende: vis et lite låst kort som forklarer funksjonen.
  if (!canUse('kpi_varsling') && !aktiv) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-5 mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <Lock size={15} className="text-brand" />
          <h2 className="text-[15px] font-extrabold text-ink">Automatisk KPI-varsling</h2>
        </div>
        <p className="text-[13px] text-muted leading-relaxed mb-3">
          Med Privat eller Pro varsler vi deg automatisk når en leiekontrakt kan reguleres, og lager
          et ferdig formulert varsel til leietaker etter husleieloven § 4-2.
        </p>
        <button onClick={() => navigate('/priser')}
          className="text-[13px] font-extrabold text-brand-ink hover:underline cursor-pointer">Lås opp med Privat eller Pro →</button>
      </div>
    );
  }

  if (varsler.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <BellRing size={16} className="text-brand" />
        <h2 className="text-[15px] font-extrabold text-ink">KPI-varsler</h2>
        <span className="text-[12.5px] font-medium text-muted-2">— kontrakter klare for regulering</span>
      </div>

      <div className="divide-y divide-line-soft">
        {varsler.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-ink-2">
                {formaterKr(v.gjeldendeLeieOre)} → {formaterKr(v.nyLeieOre)} /mnd
              </div>
              <div className="text-xs text-faint truncate">{v.kpiRef} · gjelder fra {v.foreslattIkrafttredelse}</div>
            </div>
            {v.status === 'sendt' ? (
              <span className="inline-flex items-center gap-1 text-[12px] font-extrabold text-brand-ink shrink-0"><Check size={13} /> Sendt</span>
            ) : (
              <button onClick={() => send(v.id)} disabled={sender === v.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand text-white px-3 py-2 text-[13px] font-bold hover:bg-brand-hover cursor-pointer disabled:opacity-50 shrink-0">
                <Send size={13} /> {sender === v.id ? 'Sender…' : 'Send varsel til leietaker'}
              </button>
            )}
          </div>
        ))}
      </div>

      {valgt && (
        <div className="mt-4 rounded-xl border border-line bg-sand p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-faint">Generert varsel</span>
            <button onClick={() => { navigator.clipboard?.writeText(valgt.tekst); setKopiert(true); setTimeout(() => setKopiert(false), 1500); }}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-brand-ink hover:underline cursor-pointer">
              {kopiert ? <><Check size={12} /> Kopiert</> : <><Copy size={12} /> Kopier</>}
            </button>
          </div>
          <pre className="text-xs text-muted leading-relaxed whitespace-pre-wrap font-mono">{valgt.tekst}</pre>
        </div>
      )}
    </div>
  );
}
