import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Clock, TrendingUp, AlertTriangle, MessageSquare, Home, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { byggVarsler } from '../../utils/varsler';

const TYPE_CONFIG = {
  kontrakt_utlop:   { ikon: Clock, farge: '#B45309', etikett: 'Kontraktsutløp' },
  kpi_regulering:   { ikon: TrendingUp, farge: '#9A7A24', etikett: 'KPI-regulering' },
  forfalt_betaling: { ikon: AlertTriangle, farge: '#DC2626', etikett: 'Forfalt betaling' },
  ulest_melding:    { ikon: MessageSquare, farge: '#2563EB', etikett: 'Melding' },
  ledig_enhet:      { ikon: Home, farge: '#DC2626', etikett: 'Ledig enhet' },
};

const ALVOR_LABEL = { hoy: 'Høy', middels: 'Middels', lav: 'Lav' };

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Varsler</h1>
          <p className="text-sm text-[#65696F] mt-1">
            {varsler.length > 0 ? `${varsler.length} ting krever oppmerksomhet` : 'Alt er à jour'}
          </p>
        </div>
      </div>

      {varsler.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-full bg-[#15803D]/10 flex items-center justify-center mb-4">
            <CheckCircle2 size={26} className="text-[#15803D]" />
          </div>
          <h2 className="text-base font-medium text-[#1A1B1E] mb-1">Ingen varsler</h2>
          <p className="text-sm text-[#7A7D83] max-w-sm">
            Ingen kontrakter utløper snart, alle betalinger er à jour og alle enheter er utleid.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grupper.map((g) => (
            <div key={g.alvor}>
              <h2 className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest mb-3">
                {g.tittel} <span className="text-[#AEB0B4]">({g.varsler.length})</span>
              </h2>
              <div className="space-y-2">
                {g.varsler.map((v) => {
                  const cfg = TYPE_CONFIG[v.type];
                  const Ikon = cfg.ikon;
                  return (
                    <button key={v.id} type="button" onClick={() => navigate(v.lenke)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all cursor-pointer hover:bg-black/[0.02] text-left"
                      style={{ borderColor: `${cfg.farge}22`, background: `${cfg.farge}06` }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${cfg.farge}15` }}>
                        <Ikon size={15} style={{ color: cfg.farge }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#1A1B1E] truncate">{v.tittel}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${cfg.farge}15`, color: cfg.farge }}>
                            {cfg.etikett}
                          </span>
                        </div>
                        <div className="text-xs text-[#7A7D83] mt-0.5 truncate">{v.detalj}</div>
                      </div>
                      <ChevronRight size={15} className="text-[#AEB0B4] shrink-0" />
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
