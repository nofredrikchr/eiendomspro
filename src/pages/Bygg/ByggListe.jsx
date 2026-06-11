import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, ChevronDown, Pencil, Trash2, Search, ArrowUpDown, MapPin } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Card';
import { Photo, Pill, PageHeader } from '../../components/ui/kit';
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
  const { bygg, leieobjekter, lasterEiendom, deleteBygg } = useApp();
  const [søk, setSøk] = useState('');
  const [sortering, setSortering] = useState('navn');
  const [slettId, setSlettId] = useState(null);

  const rader = useMemo(() => {
    const beriket = bygg.map((b) => {
      const objListe = leieobjekter.filter((l) => l.byggId === b.id);
      const ledige = objListe.filter((l) => l.status === 'ledig').length;
      return {
        bygg: b,
        ...byggOkonomi(b, leieobjekter),
        antallObj: objListe.length,
        ledige,
      };
    });
    const filtrert = beriket.filter((r) => {
      if (!søk) return true;
      const q = søk.toLowerCase();
      return `${r.bygg.gatenavn} ${r.bygg.gatenummer} ${r.bygg.poststed}`.toLowerCase().includes(q);
    });
    const s = SORTERINGER.find((x) => x.value === sortering) || SORTERINGER[0];
    return [...filtrert].sort(s.sort);
  }, [bygg, leieobjekter, søk, sortering]);

  const slettBygg = bygg.find((b) => b.id === slettId);

  // Reelle teller til undertittelen
  const totalNetto = rader.reduce((s, r) => s + r.kontantstromMnd, 0);
  const undertittel = `${bygg.length} bygg · ${leieobjekter.length} leieobjekter · ${formatKr(totalNetto)} netto per måned`;

  return (
    <>
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette bygget?"
        tekst={`${slettBygg ? `${slettBygg.gatenavn} ${slettBygg.gatenummer}` : 'Bygget'} og alle tilhørende leieobjekter vil bli permanent slettet.`}
        bekreftLabel="Slett bygg"
        onBekreft={async () => { await deleteBygg(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />
      <div className="animate-fade-up">
        <PageHeader tittel="Mine Bygg" undertittel={undertittel}>
          <Button onClick={() => navigate('/bygg/ny')} variant="primary">
            <Plus size={15} strokeWidth={2.4} /> Nytt bygg
          </Button>
        </PageHeader>

        {bygg.length > 1 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
              <input value={søk} onChange={(e) => setSøk(e.target.value)}
                placeholder="Søk etter adresse, poststed…"
                className="w-full bg-surface border border-line-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-ink placeholder-faint outline-none focus:border-brand transition-colors" />
            </div>
            <div className="relative">
              <ArrowUpDown size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2 pointer-events-none" />
              <select value={sortering} onChange={(e) => setSortering(e.target.value)}
                className="appearance-none bg-surface border border-line-input rounded-xl pl-10 pr-10 py-2.5 text-sm text-ink outline-none focus:border-brand cursor-pointer">
                {SORTERINGER.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-2 pointer-events-none" />
            </div>
          </div>
        )}

        {lasterEiendom ? (
          <div className="text-center py-16 text-muted text-sm">Laster bygg…</div>
        ) : bygg.length === 0 ? (
          <EmptyState
            icon={<Building2 size={24} />}
            title="Ingen bygg registrert ennå"
            description="Registrer ditt første bygg for å komme i gang."
            action={
              <Button onClick={() => navigate('/bygg/ny')} variant="primary">
                <Plus size={15} strokeWidth={2.4} /> Legg til ditt første bygg
              </Button>
            }
          />
        ) : rader.length === 0 ? (
          <div className="text-center py-12 text-muted text-sm">Ingen bygg matcher søket.</div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
            {rader.map((r) => {
              const b = r.bygg;
              const fulltUtleid = r.antallObj > 0 && r.ledige === 0;
              const adresse = [`${b.postnummer || ''} ${b.poststed || ''}`.trim(), b.kommune || b.bydel]
                .filter(Boolean).join(' · ');
              return (
                <div key={b.id}
                  onClick={() => navigate(`/bygg/${b.id}`)}
                  className="group bg-surface border border-line rounded-[22px] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-lg">
                  <Photo src={b.bilde} alt={`${b.gatenavn} ${b.gatenummer}`} className="aspect-[16/9]"
                    icon={<Building2 size={28} strokeWidth={1.6} />}>
                    {b.bygningstype && (
                      <span className="absolute top-3.5 left-3.5 bg-white/95 text-[11.5px] font-extrabold text-ink-2 px-2.5 py-1 rounded-full capitalize">
                        {b.bygningstype}
                      </span>
                    )}
                    <span className="absolute top-3.5 right-3.5">
                      {fulltUtleid
                        ? <Pill tone="mint">Fullt utleid</Pill>
                        : <Pill tone="amber">{r.ledige} ledig</Pill>}
                    </span>
                    {/* Rediger/slett — kun ved hover */}
                    <div className="absolute bottom-3.5 right-3.5 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/bygg/${b.id}`); }} aria-label="Rediger bygg"
                        className="p-2 text-ink-2 bg-white/95 hover:bg-white rounded-lg shadow-card transition-colors cursor-pointer">
                        <Pencil size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setSlettId(b.id); }} aria-label="Slett bygg"
                        className="p-2 text-danger bg-white/95 hover:bg-white rounded-lg shadow-card transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Photo>

                  <div className="px-5 pt-[19px] pb-5">
                    <div className="text-[17px] font-extrabold tracking-[-0.01em] text-ink mb-1">{b.gatenavn} {b.gatenummer}</div>
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 mb-4">
                      <MapPin size={13} className="shrink-0" />
                      <span className="truncate">{adresse || '—'}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 border-t border-line-soft pt-3.5">
                      <Nokkel label="Leieobjekter" verdi={String(r.antallObj)} />
                      <Nokkel label="Netto / mnd" verdi={formatKr(r.kontantstromMnd)}
                        klasse={r.kontantstromMnd >= 0 ? 'text-brand-ink' : 'text-danger'} />
                      <Nokkel label="Yield" verdi={r.nettoYield > 0 ? formatPct(r.nettoYield) : '—'} />
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

function Nokkel({ label, verdi, klasse = 'text-ink' }) {
  return (
    <div>
      <div className="text-[11.5px] font-bold text-faint mb-1">{label}</div>
      <div className={`text-[15px] font-extrabold num ${klasse}`}>{verdi}</div>
    </div>
  );
}
