import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, TrendingUp, AlertTriangle, MessageSquare, Home, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { byggVarsler } from '../../utils/varsler';
import { PageHeader, IconTile, Pill } from '../../components/ui/kit';

const TYPE_CONFIG = {
  kontrakt_utlop:   { ikon: Clock,         tone: 'amber', etikett: 'Kontraktsutløp' },
  kpi_regulering:   { ikon: TrendingUp,    tone: 'mint',  etikett: 'KPI-regulering' },
  forfalt_betaling: { ikon: AlertTriangle, tone: 'amber', etikett: 'Forfalt betaling' },
  ulest_melding:    { ikon: MessageSquare, tone: 'mint',  etikett: 'Melding' },
  ledig_enhet:      { ikon: Home,          tone: 'amber', etikett: 'Ledig enhet' },
};

// Korttone per alvor — flate + kant
const ALVOR_KORT = {
  hoy:     'border-amber-line bg-amber-soft hover:border-amber-line-strong',
  middels: 'border-amber-line bg-amber-soft hover:border-amber-line-strong',
  lav:     'border-mint-line bg-mint-soft hover:border-[#9DD4C9]',
};

export default function Varsler() {
  const navigate = useNavigate();
  const { kontrakter, leieobjekter, bygg, meldinger = [], utlegg = [] } = useApp();

  const varsler = useMemo(
    () => byggVarsler({ kontrakter, leieobjekter, bygg, meldinger, utlegg }),
    [kontrakter, leieobjekter, bygg, meldinger, utlegg],
  );

  // Grupper etter alvor
  const grupper = [
    { alvor: 'hoy', tittel: 'Krever handling', varsler: varsler.filter((v) => v.alvor === 'hoy') },
    { alvor: 'middels', tittel: 'Bør følges opp', varsler: varsler.filter((v) => v.alvor === 'middels') },
    { alvor: 'lav', tittel: 'Til informasjon', varsler: varsler.filter((v) => v.alvor === 'lav') },
  ].filter((g) => g.varsler.length > 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        tittel="Varsler"
        undertittel={varsler.length > 0 ? `${varsler.length} ting krever oppmerksomhet` : 'Alt er à jour'}
      />

      {varsler.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-[18px] bg-mint flex items-center justify-center text-brand-ink mb-5">
            <CheckCircle2 size={26} />
          </div>
          <h2 className="text-lg font-extrabold tracking-[-0.02em] text-ink mb-2">Ingen varsler</h2>
          <p className="text-sm font-medium text-muted max-w-sm leading-relaxed">
            Ingen kontrakter utløper snart, alle betalinger er à jour og alle enheter er utleid.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grupper.map((g) => (
            <div key={g.alvor}>
              <h2 className="text-xs font-extrabold text-muted-2 uppercase tracking-[0.12em] mb-3">
                {g.tittel} <span className="text-faint num">({g.varsler.length})</span>
              </h2>
              <div className="space-y-2.5">
                {g.varsler.map((v) => {
                  const cfg = TYPE_CONFIG[v.type];
                  const Ikon = cfg.ikon;
                  return (
                    <button key={v.id} type="button" onClick={() => navigate(v.lenke)}
                      className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] border transition-all cursor-pointer hover:translate-x-0.5 text-left ${ALVOR_KORT[g.alvor]}`}>
                      <IconTile tone={cfg.tone} size={38}><Ikon size={16} /></IconTile>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13.5px] font-bold text-ink truncate">{v.tittel}</span>
                          <Pill tone={cfg.tone}>{cfg.etikett}</Pill>
                        </div>
                        <div className="text-[12.5px] font-medium text-muted-2 mt-0.5 truncate">{v.detalj}</div>
                      </div>
                      <ChevronRight size={15} className="text-faint-2 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
