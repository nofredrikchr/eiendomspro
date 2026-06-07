import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Home, Pencil, Trash2, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState, Badge } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { formatKr } from '../../utils/format';

const STATUS_FARGER = { utleid: 'green', ledig: 'red', delvis: 'yellow' };
const STATUS_LABEL = { utleid: 'Utleid', ledig: 'Ledig', delvis: 'Delvis utleid' };
const TYPE_LABEL = {
  hybel: 'Hybel', leilighet: 'Leilighet', sokkelleilighet: 'Sokkelleilighet',
  enebolig: 'Enebolig', naering: 'Næringslokale',
};

export default function LeieobjektListe() {
  const navigate = useNavigate();
  const { leieobjekter, bygg, deleteLeieobjekt } = useApp();
  const [filterBygg, setFilterBygg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [søk, setSøk] = useState('');
  const [slettId, setSlettId] = useState(null);

  const byggOptions = bygg.map((b) => ({ value: b.id, label: `${b.gatenavn} ${b.gatenummer}` }));

  const getBygg = (byggId) => bygg.find((b) => b.id === byggId);

  const filtered = leieobjekter.filter((l) => {
    if (filterBygg && l.byggId !== filterBygg) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (søk) {
      const b = getBygg(l.byggId);
      const tekst = `${l.betegnelse || ''} ${TYPE_LABEL[l.type] || ''} ${b ? `${b.gatenavn} ${b.gatenummer} ${b.poststed}` : ''}`.toLowerCase();
      if (!tekst.includes(søk.toLowerCase())) return false;
    }
    return true;
  });

  const slettObjekt = leieobjekter.find((l) => l.id === slettId);

  return (
    <div>
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette leieobjektet?"
        tekst={`${slettObjekt?.betegnelse || 'Leieobjektet'} blir permanent slettet.`}
        bekreftLabel="Slett leieobjekt"
        onBekreft={() => { deleteLeieobjekt(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Leieobjekter</h1>
          <p className="text-sm text-[#65696F] mt-1">{leieobjekter.length} leieobjekter totalt</p>
        </div>
        <Button onClick={() => navigate('/leieobjekter/ny')} variant="primary">
          <Plus size={14} /> Nytt leieobjekt
        </Button>
      </div>

      {leieobjekter.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83]" />
            <input value={søk} onChange={(e) => setSøk(e.target.value)} placeholder="Søk leieobjekt, adresse..."
              className="w-full bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-4 py-2 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] transition-colors" />
          </div>
          <Select value={filterBygg} onChange={(e) => setFilterBygg(e.target.value)}
            options={byggOptions} placeholder="Alle bygg" className="w-52" />
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            options={[
              { value: 'utleid', label: 'Utleid' },
              { value: 'ledig', label: 'Ledig' },
              { value: 'delvis', label: 'Delvis utleid' },
            ]}
            placeholder="Alle statuser" className="w-48" />
        </div>
      )}

      {leieobjekter.length === 0 ? (
        <EmptyState
          icon="🏠"
          title="Ingen leieobjekter registrert"
          description="Legg til ditt første leieobjekt. Du må ha minst ett bygg registrert først."
          action={
            <Button onClick={() => navigate('/leieobjekter/ny')} variant="primary">
              <Plus size={14} /> Legg til leieobjekt
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#7A7D83] text-sm">
          Ingen leieobjekter matcher filteret.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const byggInfo = getBygg(l.byggId);
            return (
              <div
                key={l.id}
                onClick={() => navigate(`/leieobjekter/${l.id}`)}
                className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden hover:border-[#DCDAD2] hover:bg-[#FAF9F6] transition-all duration-150 cursor-pointer group flex flex-col"
              >
                {/* Bilde / placeholder */}
                {l.bilde ? (
                  <img src={l.bilde} alt={l.betegnelse} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-[#F1F1ED] flex items-center justify-center">
                    <Home size={28} className="text-[#DCDAD2]" />
                  </div>
                )}

                <div className="p-4 flex flex-col gap-3 flex-1">
                  {/* Status + type */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge color={STATUS_FARGER[l.status] || 'default'}>
                      {STATUS_LABEL[l.status] || l.status}
                    </Badge>
                    {l.type && (
                      <span className="text-xs text-[#7A7D83]">{TYPE_LABEL[l.type] || l.type}</span>
                    )}
                  </div>

                  {/* Navn og adresse */}
                  <div>
                    <div className="font-medium text-[#1A1B1E] text-sm">
                      {l.betegnelse || TYPE_LABEL[l.type] || 'Leieobjekt'}
                    </div>
                    {byggInfo && (
                      <div className="text-xs text-[#7A7D83] mt-0.5">
                        {byggInfo.gatenavn} {byggInfo.gatenummer}, {byggInfo.poststed}
                      </div>
                    )}
                  </div>

                  {/* Egenskaper */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#65696F] border-t border-[#E9E8E2] pt-3">
                    {l.areal && <span><span className="text-[#7A7D83]">Areal</span> <span className="text-[#1A1B1E] num">{l.areal} m²</span></span>}
                    {l.antallRom && <span><span className="text-[#7A7D83]">Rom</span> <span className="text-[#1A1B1E] num">{l.antallRom}</span></span>}
                    {l.antallSoverom && <span><span className="text-[#7A7D83]">Soverom</span> <span className="text-[#1A1B1E] num">{l.antallSoverom}</span></span>}
                  </div>

                  {/* Leie + actions */}
                  <div className="flex items-center justify-between mt-auto">
                    <div>
                      <div className="text-xs text-[#7A7D83]">Forventet leie/mnd</div>
                      <div className="text-sm font-medium text-[#15803D] num mt-0.5">{formatKr(l.forventetLeie || 0)}</div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/leieobjekter/${l.id}`); }}
                        className="p-1.5 text-[#7A7D83] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-md transition-all cursor-pointer"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSlettId(l.id); }}
                        className="p-1.5 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
