import { BarChart, Bar, Cell, XAxis, ResponsiveContainer, LabelList } from 'recharts';
import { Building2, TrendingUp, Percent, Landmark, MapPin, ArrowRight } from 'lucide-react';
import { Button } from './ui/Button';
import { Photo, Pill, IconTile, SectionCard, DataRow } from './ui/kit';
import { formatKr, formatPct } from '../utils/format';
import { DEMO_EIENDOM, DEMO_NOKKELTALL, DEMO_GRAFDATA, DEMO_KOSTNADER } from '../data/demoEiendom';

// Fargene matcher den eksisterende inntektsgrafen på dashbordet.
const FARGE_NETTO = '#0E9384';
const FARGE_NOYTRAL = '#C9DED9';

/**
 * Read-only DEMO-eiendom som vises til nye brukere FØR de legger inn egne data.
 * Helt selvstendig: forhåndsberegnede tall fra src/data/demoEiendom.js, ingen
 * skriving til DB/localStorage og ingen /api-kall.
 *
 * `onSkjul` (valgfri) lar brukeren skjule eksempelet og gå rett til sjekklisten.
 */
export default function DemoEiendom({ onStart, onSkjul }) {
  const k = DEMO_NOKKELTALL;

  return (
    <div className="rounded-[20px] border border-line bg-surface overflow-hidden">
      <div className="px-5 pt-5 pb-1.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Pill tone="mint">Eksempel</Pill>
          <span className="text-[13px] font-semibold text-muted-2">Slik ser en bolig ut i EiendomsPRO</span>
        </div>
        {onSkjul && (
          <button
            type="button"
            onClick={onSkjul}
            className="text-[12.5px] font-bold text-muted-2 hover:text-ink-2 transition-colors"
          >
            Skjul eksempel
          </button>
        )}
      </div>

      <div className="p-5 grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
        {/* Eiendomskort */}
        <div className="border border-line rounded-[18px] overflow-hidden">
          <Photo alt={DEMO_EIENDOM.adresse} className="aspect-[16/10]" icon={<Building2 size={28} strokeWidth={1.6} />}>
            <span className="absolute top-3 left-3 bg-white/95 text-[11.5px] font-extrabold text-ink-2 px-2.5 py-1 rounded-full">Fullt utleid</span>
          </Photo>
          <div className="px-[18px] pt-[17px] pb-[18px]">
            <div className="text-base font-extrabold tracking-[-0.01em] mb-0.5">{DEMO_EIENDOM.adresse}</div>
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 mb-3.5">
              <MapPin size={13} /> {DEMO_EIENDOM.poststed}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Pill tone="neutral">{DEMO_EIENDOM.type}</Pill>
              <Pill tone="neutral">{DEMO_EIENDOM.areal} m²</Pill>
              <Pill tone="mint">{formatKr(k.nettoMnd)}/mnd netto</Pill>
            </div>
          </div>
        </div>

        {/* Lønnsomhet: graf + nøkkeltall */}
        <SectionCard tittel="Lønnsomhet per måned" className="border-line">
          <div className="h-[148px] -mx-1.5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={DEMO_GRAFDATA} margin={{ top: 18, right: 8, bottom: 0, left: 8 }}>
                <XAxis
                  dataKey="navn"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#7C857E' }}
                />
                <Bar dataKey="belop" radius={[6, 6, 2, 2]} isAnimationActive={false}>
                  <LabelList
                    dataKey="belop"
                    position="top"
                    formatter={(v) => formatKr(v)}
                    style={{ fontSize: 11, fontWeight: 800, fill: '#3A413B' }}
                  />
                  {DEMO_GRAFDATA.map((d) => (
                    <Cell key={d.navn} fill={d.navn === 'Netto' ? FARGE_NETTO : FARGE_NOYTRAL} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3">
            <DataRow label="Brutto leie" value={`${formatKr(k.leieInntektMnd)}/mnd`} />
            <DataRow label="Faste kostnader" value={`− ${formatKr(k.fasteKostnaderMnd)}/mnd`} />
            <DataRow label="Netto kontantstrøm" value={`${formatKr(k.nettoMnd)}/mnd`} valueClass="text-brand-ink" last />
          </div>
        </SectionCard>
      </div>

      {/* Nøkkeltall + skatt */}
      <div className="px-5 pb-5 grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 215px), 1fr))' }}>
        <NokkeltallRute ikon={TrendingUp} label="Netto / år" value={formatKr(k.nettoAar)} sub="etter lån og kostnader" />
        <NokkeltallRute ikon={Percent} label="Brutto yield" value={formatPct(k.bruttoYield)} sub={`av ${formatKr(k.totalInvestering)} investert`} />
        <NokkeltallRute
          ikon={Landmark}
          label="Anslått skatt / år"
          value={formatKr(k.skattAar)}
          sub={`${formatPct(k.skattesats * 100, 0)} av netto · ${formatKr(k.nettoEtterSkattAar)} igjen`}
        />
      </div>

      {/* Spesifikasjon av kostnader */}
      <div className="px-5 pb-5">
        <div className="rounded-[14px] border border-line bg-sand px-4 py-1.5">
          {DEMO_KOSTNADER.map((d, i) => (
            <DataRow key={d.navn} label={d.navn} value={`${formatKr(d.belop)}/mnd`} last={i === DEMO_KOSTNADER.length - 1} />
          ))}
        </div>
      </div>

      {/* Overgang: «nå er det din tur» */}
      <div className="border-t border-line bg-mint-soft px-5 py-5 flex items-center gap-4 flex-wrap">
        <IconTile tone="mint" size={40}><TrendingUp size={18} /></IconTile>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[15px] font-extrabold tracking-[-0.01em] text-ink">Nå er det din tur</div>
          <div className="text-[13px] font-medium text-muted mt-0.5">Legg inn din første bolig, så regner vi ut lønnsomheten og skatten for deg.</div>
        </div>
        <Button size="md" onClick={onStart}>
          Legg inn min første bolig <ArrowRight size={15} strokeWidth={2.4} />
        </Button>
      </div>
    </div>
  );
}

function NokkeltallRute({ ikon: Ikon, label, value, sub }) {
  return (
    <div className="border border-line rounded-[16px] p-4">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12.5px] font-bold text-muted-2">{label}</span>
        <IconTile tone="mint" size={32} radius={10}><Ikon size={15} /></IconTile>
      </div>
      <div className="text-[22px] font-extrabold tracking-[-0.02em] text-ink num">{value}</div>
      {sub && <div className="text-[12px] font-semibold text-muted-2 mt-1">{sub}</div>}
    </div>
  );
}
