import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Pencil, Trash2, ChevronRight, Download, Search, MessageSquare } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { Avatar, Pill, PageHeader } from '../../components/ui/kit';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { formatKr } from '../../utils/format';
import { genererKontraktPDF } from '../../utils/kontraktPDF';

const dagerTil = (dato) => Math.round((new Date(dato) - new Date()) / 86400000);
const datoKort = (d) =>
  d ? new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

// Status + tone fra ekte utløpslogikk.
//  tone: 'green' = Aktiv (mint), 'yellow' = Utløper snart (amber),
//        'red'   = Avsluttet/utløpt (neutral, faded rad).
function kontraktStatus(k) {
  if (k.kontraktstype === 'tidsubestemt' || !k.sluttdato) {
    return { label: 'Aktiv', tone: 'green' };
  }
  const slutt = new Date(k.sluttdato);
  const now = new Date();
  if (slutt < now) return { label: 'Avsluttet', tone: 'red' };
  const dager = dagerTil(k.sluttdato);
  if (dager < 90) return { label: `Utløper om ${dager} dager`, tone: 'yellow' };
  return { label: 'Aktiv', tone: 'green' };
}

const pillTone = (tone) => (tone === 'green' ? 'mint' : tone === 'yellow' ? 'amber' : 'neutral');

export default function KontraktListe() {
  const navigate = useNavigate();
  const { kontrakter, leieobjekter, bygg, utleiere, meldinger = [], deleteKontrakt } = useApp();
  const [filterStatus, setFilterStatus] = useState('');
  const [søk, setSøk] = useState('');
  const [slettId, setSlettId] = useState(null);

  const getInfo = (leieobjektId) => {
    const obj = leieobjekter.find((l) => l.id === leieobjektId);
    if (!obj) return null;
    const b = bygg.find((b) => b.id === obj.byggId);
    return { obj, b };
  };

  const filtered = kontrakter.filter((k) => {
    const s = kontraktStatus(k);
    if (filterStatus === 'aktiv' && s.tone !== 'green') return false;
    if (filterStatus === 'utloeper' && s.tone !== 'yellow') return false;
    if (filterStatus === 'utlopt' && s.tone !== 'red') return false;
    if (søk) {
      const q = søk.toLowerCase();
      const info = getInfo(k.leieobjektId);
      const adresse = info?.b ? `${info.b.gatenavn} ${info.b.gatenummer}` : '';
      if (
        !k.leietakerNavn?.toLowerCase().includes(q) &&
        !adresse.toLowerCase().includes(q) &&
        !k.leietakerEpost?.toLowerCase().includes(q)
      ) return false;
    }
    return true;
  });

  const antallAktive = kontrakter.filter((k) => kontraktStatus(k).tone !== 'red').length;
  const antallAvsluttet = kontrakter.length - antallAktive;

  const slettKontrakt = kontrakter.find((k) => k.id === slettId);

  return (
    <>
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette leiekontrakt?"
        tekst={`Kontrakten med ${slettKontrakt?.leietakerNavn || 'leietaker'} vil bli permanent slettet. Dette kan ikke angres.`}
        bekreftLabel="Slett kontrakt"
        onBekreft={() => { deleteKontrakt(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />

      <div className="animate-fade-up">
        <PageHeader
          tittel="Leiekontrakter"
          undertittel={`${antallAktive} aktive · ${antallAvsluttet} avsluttet`}
        >
          <Button onClick={() => navigate('/kontrakter/ny')} variant="primary">
            <Plus size={15} strokeWidth={2.4} /> Ny kontrakt
          </Button>
        </PageHeader>

        {kontrakter.length > 0 && (
          <div className="flex gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint-2" />
              <input
                value={søk}
                onChange={(e) => setSøk(e.target.value)}
                placeholder="Søk leietaker, adresse…"
                className="w-full bg-surface border border-line-input rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-ink placeholder-faint outline-none focus:border-brand transition-colors"
              />
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              options={[
                { value: 'aktiv', label: 'Aktive' },
                { value: 'utloeper', label: 'Utløper snart' },
                { value: 'utlopt', label: 'Avsluttet' },
              ]}
              placeholder="Alle kontrakter"
              className="w-44"
            />
          </div>
        )}

        {kontrakter.length === 0 ? (
          <EmptyState
            icon={<FileText size={26} strokeWidth={1.75} />}
            title="Ingen leiekontrakter ennå"
            description="Registrer en leiekontrakt for å holde oversikt over leieforhold og leietakere."
            action={
              <Button onClick={() => navigate('/kontrakter/ny')} variant="primary">
                <Plus size={15} strokeWidth={2.4} /> Ny kontrakt
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted text-sm font-medium">Ingen kontrakter matcher søket.</div>
        ) : (
          <div className="bg-surface border border-line rounded-[20px] overflow-hidden">
            {filtered.map((k, i) => {
              const info = getInfo(k.leieobjektId);
              const status = kontraktStatus(k);
              const tone = status.tone;
              const avsluttet = tone === 'red';
              const uleste = meldinger.filter((m) => m.kontraktId === k.id && !m.lest && m.avsender === 'leietaker').length;

              const meta = [
                info?.b ? `${info.b.gatenavn} ${info.b.gatenummer}` : null,
                info?.obj?.betegnelse,
                info?.obj?.type,
              ].filter(Boolean).join(' · ');

              const tidstype = k.kontraktstype === 'tidsubestemt' ? 'Tidsubestemt' : 'Tidsbestemt';
              let datolinje;
              if (avsluttet) datolinje = `Avsluttet ${datoKort(k.sluttdato)}`;
              else if (k.sluttdato) datolinje = `${datoKort(k.startdato) || ''} – ${datoKort(k.sluttdato)}`;
              else datolinje = k.startdato ? `Fra ${datoKort(k.startdato)}` : 'Løpende';

              return (
                <div
                  key={k.id}
                  onClick={() => navigate(`/kontrakter/${k.id}`)}
                  className={`group flex items-center gap-3.5 px-5 py-4 flex-wrap cursor-pointer transition-colors
                    ${i < filtered.length - 1 ? 'border-b border-line-soft' : ''}
                    ${tone === 'yellow' ? 'bg-amber-soft hover:bg-[#FBF5E6]' : 'hover:bg-surface-2'}
                    ${avsluttet ? 'opacity-60' : ''}`}
                >
                  <Avatar navn={k.leietakerNavn} tone={tone === 'yellow' ? 'amber' : avsluttet ? 'sand' : 'mint'} size={42} />

                  <div className="flex-1 min-w-[170px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14.5px] font-extrabold text-ink truncate">{k.leietakerNavn || '—'}</span>
                      {uleste > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-ink">
                          <MessageSquare size={11} /> {uleste} ulest{uleste > 1 ? 'e' : ''}
                        </span>
                      )}
                    </div>
                    {meta && <div className="text-[12.5px] font-semibold text-muted-2 mt-0.5 truncate">{meta}</div>}
                  </div>

                  <div className="min-w-[150px]">
                    <div className="text-[13px] font-bold text-ink-2">{tidstype}</div>
                    <div className="text-xs font-semibold text-muted-2">{datolinje}</div>
                  </div>

                  <div className="text-sm font-extrabold text-ink num min-w-[92px]">{formatKr(k.maanedligLeie)}</div>

                  <Pill tone={pillTone(tone)}>{status.label}</Pill>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/meldinger/${k.id}`); }}
                        title="Meldinger" aria-label="Meldinger"
                        className="p-1.5 text-muted-2 hover:text-brand-ink hover:bg-mint rounded-md transition-all cursor-pointer"
                      >
                        <MessageSquare size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const utleier = utleiere.find((u) => u.id === k.utleierNavn);
                          genererKontraktPDF({ kontrakt: k, leieobjekt: info?.obj, bygg: info?.b, utleier });
                        }}
                        title="Last ned PDF" aria-label="Last ned PDF"
                        className="p-1.5 text-muted-2 hover:text-brand-ink hover:bg-mint rounded-md transition-all cursor-pointer"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/kontrakter/${k.id}/rediger`); }}
                        title="Rediger" aria-label="Rediger kontrakt"
                        className="p-1.5 text-muted-2 hover:text-ink-2 hover:bg-line-soft rounded-md transition-all cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSlettId(k.id); }}
                        title="Slett" aria-label="Slett kontrakt"
                        className="p-1.5 text-muted-2 hover:text-danger hover:bg-danger/[0.06] rounded-md transition-all cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <ChevronRight size={15} className="text-faint-2 group-hover:text-muted shrink-0" />
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
