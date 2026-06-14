import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Home, Search, Square, BedDouble, Megaphone } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Card';
import { Select } from '../../components/ui/Input';
import { Photo, Pill, Avatar, PageHeader } from '../../components/ui/kit';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { OppgraderingsModal } from '../../components/plan/OppgraderingsModal';
import { usePlan } from '../../hooks/usePlan';
import { formatKr } from '../../utils/format';

const STATUS_LABEL = { utleid: 'Utleid', ledig: 'Ledig', delvis: 'Delvis utleid' };
const STATUS_TONE = { utleid: 'mint', ledig: 'amber', delvis: 'amber' };
const TYPE_LABEL = {
  hybel: 'Hybel', leilighet: 'Leilighet', sokkelleilighet: 'Sokkelleilighet',
  enebolig: 'Enebolig', naering: 'Næringslokale',
};

export default function LeieobjektListe() {
  const navigate = useNavigate();
  const { leieobjekter, bygg, kontrakter = [], lasterEiendom, deleteLeieobjekt } = useApp();
  const { objektgrense, plan, skrivebeskyttet } = usePlan();
  const [filterBygg, setFilterBygg] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [søk, setSøk] = useState('');
  const [slettId, setSlettId] = useState(null);
  const [visGrense, setVisGrense] = useState(false);

  // Objektgrense (punkt C): ved grensen — oppgraderingsmodal, ikke hard feil.
  function nyttObjekt() {
    if (skrivebeskyttet || leieobjekter.length >= objektgrense) setVisGrense(true);
    else navigate('/leieobjekter/ny');
  }
  const oppgraderTil = plan === 'privat' ? 'Pro' : 'Privat eller Pro';

  const byggOptions = bygg.map((b) => ({ value: b.id, label: `${b.gatenavn} ${b.gatenummer}` }));

  const getBygg = (byggId) => bygg.find((b) => b.id === byggId);

  // Aktiv leietaker fra koblet, aktiv kontrakt (samme logikk som Dashboard).
  const getLeietaker = (objektId) => {
    const k = kontrakter.find((kk) => {
      if (kk.leieobjektId !== objektId) return false;
      if (kk.kontraktstype === 'tidsubestemt' || !kk.sluttdato) return true;
      return new Date(kk.sluttdato) >= new Date();
    });
    return k?.leietakerNavn || null;
  };

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

  const antallUtleid = leieobjekter.filter((l) => l.status === 'utleid').length;
  const antallLedig = leieobjekter.filter((l) => l.status === 'ledig').length;
  const antallBygg = new Set(leieobjekter.map((l) => l.byggId).filter(Boolean)).size;

  const slettObjekt = leieobjekter.find((l) => l.id === slettId);

  const statusPiller = [
    { verdi: '', label: 'Alle', antall: leieobjekter.length },
    { verdi: 'utleid', label: 'Utleid', antall: antallUtleid },
    { verdi: 'ledig', label: 'Ledig', antall: antallLedig },
  ];

  return (
    <div className="animate-fade-up">
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette leieobjektet?"
        tekst={`${slettObjekt?.betegnelse || 'Leieobjektet'} blir permanent slettet.`}
        bekreftLabel="Slett leieobjekt"
        onBekreft={async () => { await deleteLeieobjekt(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />

      <OppgraderingsModal
        apen={visGrense}
        lukk={() => setVisGrense(false)}
        tittel={skrivebeskyttet ? 'Kontoen er over grensen' : 'Du har nådd grensen for planen din'}
        beskrivelse={skrivebeskyttet
          ? 'Du har flere leieobjekter enn planen tillater. Alt er bevart, men du må oppgradere til Pro for å legge til nye.'
          : `Planen din inkluderer ${objektgrense} ${objektgrense === 1 ? 'leieobjekt' : 'leieobjekter'}. Oppgrader for å legge til flere.`}
        punkter={['Privat: inntil 5 leieobjekter', 'Pro: ubegrenset antall leieobjekter']}
        plan={oppgraderTil}
      />

      <PageHeader
        tittel="Leieobjekter"
        undertittel={`${leieobjekter.length} ${leieobjekter.length === 1 ? 'enhet' : 'enheter'} fordelt på ${antallBygg} ${antallBygg === 1 ? 'bygg' : 'bygg'}`}
      >
        <Button onClick={nyttObjekt} variant="primary">
          <Plus size={15} strokeWidth={2.4} /> Nytt leieobjekt
        </Button>
      </PageHeader>

      {leieobjekter.length > 0 && (
        <>
          {/* Status-piller */}
          <div className="flex gap-2 flex-wrap mb-5">
            {statusPiller.map((p) => {
              const aktiv = filterStatus === p.verdi;
              return (
                <button
                  key={p.verdi || 'alle'}
                  type="button"
                  onClick={() => setFilterStatus(p.verdi)}
                  className={`px-4 py-2 rounded-full text-[13px] font-bold transition-colors cursor-pointer border
                    ${aktiv
                      ? 'bg-ink-2 text-white border-ink-2'
                      : 'bg-surface text-ink-2 border-line-input hover:border-brand hover:text-brand-ink'}`}
                >
                  {p.label} · {p.antall}
                </button>
              );
            })}
          </div>

          {/* Søk + bygg-filter */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-48 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-2" />
              <input
                value={søk}
                onChange={(e) => setSøk(e.target.value)}
                placeholder="Søk leieobjekt, adresse…"
                className="w-full bg-surface border border-line-input rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-ink placeholder-faint outline-none focus:border-brand transition-colors"
              />
            </div>
            <Select
              value={filterBygg}
              onChange={(e) => setFilterBygg(e.target.value)}
              options={byggOptions}
              placeholder="Alle bygg"
              className="w-52"
            />
          </div>
        </>
      )}

      {lasterEiendom ? (
        <div className="text-center py-16 text-muted text-sm font-medium">Laster leieobjekter…</div>
      ) : leieobjekter.length === 0 ? (
        <EmptyState
          icon={<Home size={24} />}
          title="Ingen leieobjekter registrert"
          description="Legg til ditt første leieobjekt. Du må ha minst ett bygg registrert først."
          action={
            <Button onClick={nyttObjekt} variant="primary">
              <Plus size={15} strokeWidth={2.4} /> Legg til leieobjekt
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted text-sm font-medium">
          Ingen leieobjekter matcher filteret.
        </div>
      ) : (
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 252px), 1fr))' }}>
          {filtered.map((l) => {
            const byggInfo = getBygg(l.byggId);
            const tittel = `${TYPE_LABEL[l.type] || 'Leieobjekt'}${l.betegnelse ? ` · ${l.betegnelse}` : ''}`;
            const adresse = byggInfo
              ? [`${byggInfo.gatenavn} ${byggInfo.gatenummer}`, byggInfo.poststed].filter(Boolean).join(', ')
              : null;
            const leietaker = l.status === 'utleid' ? getLeietaker(l.id) : null;

            return (
              <div
                key={l.id}
                onClick={() => navigate(`/leieobjekter/${l.id}`)}
                className="bg-surface border border-line rounded-[20px] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-card-lg flex flex-col"
              >
                <Photo src={l.bilde} alt={tittel} className="aspect-[4/3]">
                  <span className="absolute top-3 left-3">
                    <Pill tone={STATUS_TONE[l.status] || 'neutral'}>
                      {STATUS_LABEL[l.status] || l.status}
                    </Pill>
                  </span>
                </Photo>

                <div className="px-4 pt-[15px] pb-4 flex flex-col flex-1">
                  <div className="text-[15px] font-extrabold tracking-[-0.01em] text-ink mb-0.5">{tittel}</div>
                  {adresse && (
                    <div className="text-[12.5px] font-semibold text-muted-2 mb-3">{adresse}</div>
                  )}

                  {/* Nøkkeltall */}
                  <div className="flex gap-3.5 flex-wrap mb-3">
                    {l.areal && (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                        <Square size={13} /> <span className="num">{l.areal}</span> m²
                      </span>
                    )}
                    {(l.antallSoverom || l.antallRom) && (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-muted">
                        <BedDouble size={13} />
                        {l.antallSoverom
                          ? <><span className="num">{l.antallSoverom}</span> soverom</>
                          : <><span className="num">{l.antallRom}</span> rom</>}
                      </span>
                    )}
                  </div>

                  {/* Leie + leietaker / annonse */}
                  <div className="flex items-center justify-between gap-2.5 border-t border-line-soft pt-3 mt-auto">
                    <span className="text-[15px] font-extrabold text-ink num">
                      {formatKr(l.forventetLeie || 0)}
                      <span className="text-xs font-semibold text-faint num"> /mnd</span>
                    </span>
                    {l.status === 'ledig' ? (
                      <Button
                        variant="amber"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/leieobjekter/${l.id}`); }}
                      >
                        <Megaphone size={13} /> Lag annonse
                      </Button>
                    ) : leietaker ? (
                      <span className="inline-flex items-center gap-2 text-xs font-bold text-muted min-w-0">
                        <Avatar navn={leietaker} size={22} />
                        <span className="truncate">{leietaker}</span>
                      </span>
                    ) : null}
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
