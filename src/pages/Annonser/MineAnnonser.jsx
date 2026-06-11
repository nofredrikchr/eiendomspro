import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, ChevronRight, Search,
  Eye, ExternalLink, Image as ImageIcon, Users, Megaphone, MapPin,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Card';
import { Photo, Pill, PageHeader } from '../../components/ui/kit';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { formatKr } from '../../utils/format';

const STATUS = {
  kladd:    { label: 'Kladd',     tone: 'muted' },
  aktiv:    { label: 'Publisert', tone: 'mint' },
  arkivert: { label: 'Arkivert',  tone: 'amber' },
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

      <div className="animate-fade-up">
        <PageHeader
          tittel="Mine annonser"
          undertittel={`${annonser.length} annonse${annonser.length !== 1 ? 'r' : ''} · Publiser til FINN.no med ett klikk`}
        >
          <Button onClick={() => navigate('/annonser/ny')}>
            <Plus size={15} strokeWidth={2.4} /> Ny annonse
          </Button>
        </PageHeader>

        {annonser.length > 0 && (
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint-2" />
              <input value={søk} onChange={(e) => setSøk(e.target.value)} placeholder="Søk i annonser..."
                className="w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl pl-10 pr-4 py-[11px] text-sm font-bold text-ink placeholder:font-medium placeholder:text-faint outline-none focus:border-brand focus:bg-surface transition-all" />
            </div>
            <div className="flex gap-1 bg-surface border border-line rounded-xl p-1">
              {[['', 'Alle'], ['kladd', 'Kladd'], ['aktiv', 'Publisert'], ['arkivert', 'Arkivert']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)}
                  className={`px-3.5 py-1.5 rounded-lg text-[13px] font-bold transition-all cursor-pointer
                    ${filter === v ? 'bg-mint text-brand-ink' : 'text-muted-2 hover:text-ink-2'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        )}

        {annonser.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={26} />}
            title="Ingen annonser ennå"
            description="Lag en annonse for et ledig leieobjekt og publiser den til FINN.no for å nå flest mulig leietakere."
            action={<Button onClick={() => navigate('/annonser/ny')}><Plus size={15} strokeWidth={2.4} /> Lag din første annonse</Button>}
          />
        ) : filtrert.length === 0 ? (
          <div className="text-center py-16 text-muted-2 text-sm font-semibold">Ingen annonser matcher søket.</div>
        ) : (
          <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>
            {filtrert.map((a) => {
              const st = STATUS[a.status || 'kladd'];
              const bilde = a.bilder?.[0];
              return (
                <div key={a.id} onClick={() => navigate(`/annonser/${a.id}`)}
                  className="group bg-surface border border-line rounded-[20px] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lift">
                  <Photo src={bilde} alt={a.tittel} className="aspect-[16/10]" icon={<ImageIcon size={28} strokeWidth={1.6} />}>
                    <span className="absolute top-3 left-3"><Pill tone={st.tone}>{st.label}</Pill></span>
                    {a.finnKode && (
                      <span className="absolute top-3 right-3 inline-flex items-center gap-1 bg-white/95 text-[11px] font-extrabold text-brand-ink px-2.5 py-1 rounded-full">
                        FINN <ExternalLink size={10} />
                      </span>
                    )}
                  </Photo>

                  <div className="px-[18px] pt-4 pb-[18px]">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-extrabold tracking-[-0.01em] text-ink truncate min-w-0">{a.tittel || 'Uten tittel'}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/annonser/${a.id}`); }} aria-label="Rediger annonse"
                            className="p-1.5 text-muted-2 hover:text-ink hover:bg-line-soft rounded-lg transition-all cursor-pointer">
                            <Pencil size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setSlettId(a.id); }} aria-label="Slett annonse"
                            className="p-1.5 text-muted-2 hover:text-danger hover:bg-danger/[0.06] rounded-lg transition-all cursor-pointer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <ChevronRight size={16} className="text-faint-2 group-hover:text-muted" />
                      </div>
                    </div>

                    {a.adresse && (
                      <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 mt-1">
                        <MapPin size={13} /> <span className="truncate">{a.adresse}</span>
                      </div>
                    )}
                    <p className="text-[13px] font-medium text-muted line-clamp-1 mt-2">{a.beskrivelse || 'Ingen beskrivelse'}</p>

                    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 mt-3.5">
                      {a.maanedligLeie && <span className="text-sm font-extrabold text-brand-ink num">{formatKr(a.maanedligLeie)}/mnd</span>}
                      {a.areal && <span className="text-[13px] font-semibold text-muted-2 num">{a.areal} m²</span>}
                      {a.antallRom && <span className="text-[13px] font-semibold text-muted-2 num">{a.antallRom} rom</span>}
                      {a.status === 'aktiv' && (
                        <span className="flex items-center gap-1 text-[13px] font-semibold text-muted-2"><Eye size={12} /> {a.visninger || 0} visninger</span>
                      )}
                      {(a.interessenter?.length > 0) && (
                        <span className="flex items-center gap-1 text-[13px] font-semibold text-amber"><Users size={12} /> {a.interessenter.length} interessenter</span>
                      )}
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
