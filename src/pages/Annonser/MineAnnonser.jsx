import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ChevronRight, Search,
  Eye, ExternalLink, Image as ImageIcon, Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState, Badge } from '../../components/ui/Card';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { formatKr } from '../../utils/format';

const STATUS = {
  kladd:    { label: 'Kladd',    color: 'default' },
  aktiv:    { label: 'Publisert', color: 'green' },
  arkivert: { label: 'Arkivert', color: 'red' },
};

export default function MineAnnonser() {
  const navigate = useNavigate();
  const { annonser, deleteAnnonse } = useApp();
  const [søk, setSøk] = useState('');
  const [filter, setFilter] = useState('');
  const [slettId, setSlettId] = useState(null);

  const filtrert = annonser.filter((a) => {
    if (filter && (a.status || 'kladd') !== filter) return false;
    if (søk && !`${a.tittel} ${a.beskrivelse}`.toLowerCase().includes(søk.toLowerCase())) return false;
    return true;
  });

  const slett = annonser.find((a) => a.id === slettId);

  return (
    <>
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette annonsen?"
        tekst={`«${slett?.tittel || 'Annonsen'}» blir permanent slettet.${slett?.finnKode ? ' Husk å avpublisere fra FINN først.' : ''}`}
        bekreftLabel="Slett annonse"
        onBekreft={() => { deleteAnnonse(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />

      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">Mine annonser</h1>
            <p className="text-sm text-[#65696F] mt-1">
              {annonser.length} annonse{annonser.length !== 1 ? 'r' : ''} · Publiser til FINN.no med ett klikk
            </p>
          </div>
          <Button onClick={() => navigate('/annonser/ny')} variant="primary">
            <Plus size={14} /> Ny annonse
          </Button>
        </div>

        {annonser.length > 0 && (
          <div className="flex gap-3 mb-5">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83]" />
              <input value={søk} onChange={(e) => setSøk(e.target.value)} placeholder="Søk i annonser..."
                className="w-full bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-4 py-2 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] transition-colors" />
            </div>
            <div className="flex gap-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-1">
              {[['', 'Alle'], ['kladd', 'Kladd'], ['aktiv', 'Publisert'], ['arkivert', 'Arkivert']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer
                    ${filter === v ? 'bg-black/[0.055] text-[#1A1B1E]' : 'text-[#7A7D83] hover:text-[#4B4E54]'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {annonser.length === 0 ? (
          <EmptyState
            icon="📢"
            title="Ingen annonser ennå"
            description="Lag en annonse for et ledig leieobjekt og publiser den til FINN.no for å nå flest mulig leietakere."
            action={<Button onClick={() => navigate('/annonser/ny')} variant="primary"><Plus size={14} /> Lag din første annonse</Button>}
          />
        ) : filtrert.length === 0 ? (
          <div className="text-center py-12 text-[#7A7D83] text-sm">Ingen annonser matcher søket.</div>
        ) : (
          <div className="grid gap-3">
            {filtrert.map((a) => {
              const st = STATUS[a.status || 'kladd'];
              const bilde = a.bilder?.[0];
              return (
                <div key={a.id} onClick={() => navigate(`/annonser/${a.id}`)}
                  className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden hover:border-[#DCDAD2] transition-all cursor-pointer group flex">
                  {/* Bilde */}
                  <div className="w-40 shrink-0 bg-[#F6F6F4] flex items-center justify-center overflow-hidden">
                    {bilde ? (
                      <img src={bilde} alt={a.tittel} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={24} className="text-[#DCDAD2]" />
                    )}
                  </div>

                  {/* Innhold */}
                  <div className="flex-1 min-w-0 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-[#1A1B1E] text-sm truncate">{a.tittel || 'Uten tittel'}</h3>
                          <Badge color={st.color}>{st.label}</Badge>
                          {a.finnKode && (
                            <span className="flex items-center gap-1 text-xs text-[#2563EB]">
                              FINN <ExternalLink size={10} />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#7A7D83] line-clamp-1">{a.beskrivelse || 'Ingen beskrivelse'}</p>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs">
                          {a.maanedligLeie && <span className="text-[#15803D] num font-medium">{formatKr(a.maanedligLeie)}/mnd</span>}
                          {a.areal && <span className="text-[#65696F] num">{a.areal} m²</span>}
                          {a.antallRom && <span className="text-[#65696F] num">{a.antallRom} rom</span>}
                          {a.status === 'aktiv' && (
                            <span className="flex items-center gap-1 text-[#7A7D83]"><Eye size={11} /> {a.visninger || 0} visninger</span>
                          )}
                          {(a.interessenter?.length > 0) && (
                            <span className="flex items-center gap-1 text-[#9A7A24]"><Users size={11} /> {a.interessenter.length} interessenter</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/annonser/${a.id}`); }} aria-label="Rediger annonse"
                            className="p-1.5 text-[#7A7D83] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-md transition-all cursor-pointer">
                            <Pencil size={13} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSlettId(a.id); }} aria-label="Slett annonse"
                            className="p-1.5 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <ChevronRight size={15} className="text-[#AEB0B4] group-hover:text-[#65696F]" />
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
