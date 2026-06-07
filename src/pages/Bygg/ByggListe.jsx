import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, ChevronRight, Pencil, Trash2, Search, ArrowUpDown } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Card';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { byggOkonomi } from '../../utils/byggRapport';
import { formatKr, formatPct } from '../../utils/format';

const SORTERINGER = [
  { value: 'navn', label: 'Adresse (A–Å)', sort: (a, b) => a.navn.localeCompare(b.navn) },
  { value: 'yield_hoy', label: 'Yield: høy → lav', sort: (a, b) => b.nettoYield - a.nettoYield },
  { value: 'yield_lav', label: 'Yield: lav → høy', sort: (a, b) => a.nettoYield - b.nettoYield },
  { value: 'kontant_hoy', label: 'Kontantstrøm: høy → lav', sort: (a, b) => b.kontantstromMnd - a.kontantstromMnd },
  { value: 'kontant_lav', label: 'Kontantstrøm: lav → høy', sort: (a, b) => a.kontantstromMnd - b.kontantstromMnd },
  { value: 'verdi_hoy', label: 'Verdi: høyest først', sort: (a, b) => b.verdi - a.verdi },
  { value: 'ek_hoy', label: 'Egenkapital: høyest først', sort: (a, b) => b.egenkapital - a.egenkapital },
  { value: 'ltv_lav', label: 'LTV: lav → høy', sort: (a, b) => a.ltv - b.ltv },
  { value: 'ltv_hoy', label: 'LTV: høy → lav', sort: (a, b) => b.ltv - a.ltv },
];

export default function ByggListe() {
  const navigate = useNavigate();
  const { bygg, leieobjekter, deleteBygg } = useApp();
  const [søk, setSøk] = useState('');
  const [sortering, setSortering] = useState('navn');
  const [slettId, setSlettId] = useState(null);

  const rader = useMemo(() => {
    const beriket = bygg.map((b) => ({
      bygg: b,
      ...byggOkonomi(b, leieobjekter),
      antallObj: leieobjekter.filter((l) => l.byggId === b.id).length,
    }));
    const filtrert = beriket.filter((r) => {
      if (!søk) return true;
      const q = søk.toLowerCase();
      return `${r.bygg.gatenavn} ${r.bygg.gatenummer} ${r.bygg.poststed}`.toLowerCase().includes(q);
    });
    const s = SORTERINGER.find((x) => x.value === sortering) || SORTERINGER[0];
    return [...filtrert].sort(s.sort);
  }, [bygg, leieobjekter, søk, sortering]);

  const slettBygg = bygg.find((b) => b.id === slettId);

  return (
    <>
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette bygget?"
        tekst={`${slettBygg ? `${slettBygg.gatenavn} ${slettBygg.gatenummer}` : 'Bygget'} og alle tilhørende leieobjekter vil bli permanent slettet.`}
        bekreftLabel="Slett bygg"
        onBekreft={() => { deleteBygg(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">Mine Bygg</h1>
            <p className="text-sm text-[#65696F] mt-1">{bygg.length} bygg registrert</p>
          </div>
          <Button onClick={() => navigate('/bygg/ny')} variant="primary">
            <Plus size={14} /> Nytt bygg
          </Button>
        </div>

        {bygg.length > 1 && (
          <div className="flex flex-wrap gap-3 mb-5">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83]" />
              <input value={søk} onChange={(e) => setSøk(e.target.value)}
                placeholder="Søk etter adresse, poststed..."
                className="w-full bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-4 py-2 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] transition-colors" />
            </div>
            <div className="relative">
              <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83] pointer-events-none" />
              <select value={sortering} onChange={(e) => setSortering(e.target.value)}
                className="appearance-none bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-9 py-2 text-sm text-[#1A1B1E] outline-none focus:border-[#DCDAD2] cursor-pointer">
                {SORTERINGER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronRight size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7A7D83] pointer-events-none rotate-90" />
            </div>
          </div>
        )}

        {bygg.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="Ingen bygg registrert ennå"
            description="Registrer ditt første bygg for å komme i gang."
            action={
              <Button onClick={() => navigate('/bygg/ny')} variant="primary">
                <Plus size={14} /> Legg til ditt første bygg
              </Button>
            }
          />
        ) : rader.length === 0 ? (
          <div className="text-center py-12 text-[#7A7D83] text-sm">Ingen bygg matcher søket.</div>
        ) : (
          <div className="grid gap-2">
            {rader.map((r) => {
              const b = r.bygg;
              return (
                <div key={b.id}
                  className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 hover:border-[#DCDAD2] hover:bg-[#FAF9F6] transition-all duration-150 cursor-pointer group"
                  onClick={() => navigate(`/bygg/${b.id}`)}>
                  <div className="flex items-center gap-4">
                    {b.bilde ? (
                      <img src={b.bilde} alt={b.gatenavn} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                    ) : (
                      <div className="w-12 h-12 bg-[#E9E8E2] rounded-lg flex items-center justify-center shrink-0">
                        <Building2 size={18} className="text-[#AEB0B4]" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-[#1A1B1E] text-sm">{b.gatenavn} {b.gatenummer}</h3>
                          <p className="text-xs text-[#7A7D83] mt-0.5">
                            {b.postnummer} {b.poststed}
                            {b.bygningstype && <span className="ml-2 capitalize">· {b.bygningstype}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); navigate(`/bygg/${b.id}`); }}
                              className="p-1.5 text-[#7A7D83] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-md transition-all cursor-pointer">
                              <Pencil size={13} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setSlettId(b.id); }}
                              className="p-1.5 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer">
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <ChevronRight size={16} className="text-[#AEB0B4] group-hover:text-[#65696F] transition-colors" />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 pt-3 border-t border-[#E9E8E2]">
                        <Nokkel label="Enheter" verdi={String(r.antallObj)} />
                        <Nokkel label="Leie/mnd" verdi={formatKr(r.bruttoMnd)} farge="#15803D" />
                        <Nokkel label="Kontantstrøm/mnd" verdi={formatKr(r.kontantstromMnd)} farge={r.kontantstromMnd >= 0 ? '#15803D' : '#DC2626'} />
                        {r.nettoYield > 0 && <Nokkel label="Netto yield" verdi={formatPct(r.nettoYield)} farge="#B45309" />}
                        {r.verdi > 0 && <Nokkel label="Verdi" verdi={formatKr(r.verdi)} />}
                        {r.egenkapital !== 0 && <Nokkel label="Egenkapital" verdi={formatKr(r.egenkapital)} farge="#4D7C0F" />}
                        {r.gjeld > 0 && <Nokkel label="LTV" verdi={formatPct(r.ltv)} farge={r.ltv <= 75 ? '#15803D' : r.ltv <= 85 ? '#B45309' : '#DC2626'} />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Nokkel({ label, verdi, farge = '#ffffff' }) {
  return (
    <div>
      <div className="text-xs text-[#7A7D83]">{label}</div>
      <div className="text-sm font-medium num mt-0.5" style={{ color: farge }}>{verdi}</div>
    </div>
  );
}
