import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bug, Lightbulb, MessageCircle, Send, Gift, Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Card';
import { PageHeader, IconTile, Pill } from '../../components/ui/kit';
import {
  hentSaker, hentSak, sendMelding, settStatus, giBelonning, markerLest, abonner,
  TYPE_INFO, STATUS_INFO,
} from '../../services/feedbackService';

function relativTid(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000), t = Math.floor(min / 60), d = Math.floor(t / 24);
  if (min < 1) return 'Nå';
  if (min < 60) return `${min}m`;
  if (t < 24) return `${t}t`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' });
}

const TYPE_IKON = { feil: Bug, onske: Lightbulb, sporsmal: MessageCircle };
// Knytt tjeneste-typene/-statusene til designsystemets piller (ingen rå hex).
const TYPE_TONE = { feil: 'amber', onske: 'mint', sporsmal: 'neutral' };
const TYPE_TILE = { feil: 'amber', onske: 'mint', sporsmal: 'sand' };
const STATUS_TONE = { ny: 'neutral', under_arbeid: 'amber', lost: 'mint', avvist: 'muted' };

// ─── Belønningsmodal ──────────────────────────────────────────────────────────
function BelonningModal({ open, onGi, onLukk }) {
  const [maaneder, setMaaneder] = useState(1);
  const valg = [1, 2, 3, 6, 12];
  return (
    <Modal open={open} onClose={onLukk} title="Gi gratis måneder" size="sm">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <IconTile tone="amber" size={36}><Gift size={16} /></IconTile>
          <p className="text-sm text-muted leading-relaxed m-0">
            Brukeren får en takkemelding i chatten, og belønningen registreres på saken.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {valg.map((m) => (
            <button key={m} onClick={() => setMaaneder(m)}
              className={`px-3.5 py-2 rounded-[10px] text-sm font-bold border-[1.5px] transition-all cursor-pointer
                ${maaneder === m
                  ? 'border-amber-line bg-amber-bg text-amber'
                  : 'border-line-input bg-surface text-muted hover:border-amber-line hover:text-amber'}`}>
              {m} mnd
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onLukk}>Avbryt</Button>
          <Button variant="amber" className="flex-1 justify-center"
            onClick={() => onGi({ maaneder, beskrivelse: `Du har fått ${maaneder} ${maaneder === 1 ? 'gratis måned' : 'gratis måneder'} på abonnementet som takk for tilbakemeldingen.` })}>
            Gi {maaneder} mnd
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Chat-panel ───────────────────────────────────────────────────────────────
function AdminChat({ sakId, onEndret }) {
  const [sak, setSak] = useState(null);
  const [tekst, setTekst] = useState('');
  const [visBelonning, setVisBelonning] = useState(false);
  const bunn = useRef(null);

  useEffect(() => {
    let aktiv = true;
    (async () => {
      await markerLest(sakId, 'admin');
      const s = await hentSak(sakId);
      if (aktiv) setSak(s);
      onEndret?.();
    })();
    const av = abonner(() => hentSak(sakId).then((s) => aktiv && setSak(s)));
    return () => { aktiv = false; av(); };
  }, [sakId, onEndret]);
  useEffect(() => { bunn.current?.scrollIntoView({ behavior: 'smooth' }); }, [sak?.meldinger.length]);

  if (!sak) return <div className="flex items-center justify-center h-full text-sm font-medium text-muted-2">Laster…</div>;

  function oppdater(ny) { setSak({ ...ny }); onEndret?.(); }
  async function send(e) {
    e?.preventDefault();
    if (!tekst.trim()) return;
    setTekst('');
    oppdater(await sendMelding(sakId, { avsender: 'admin', tekst: tekst.trim() }));
  }

  return (
    <div className="flex flex-col h-full">
      <BelonningModal open={visBelonning} onLukk={() => setVisBelonning(false)}
        onGi={async (b) => { oppdater(await giBelonning(sakId, b)); setVisBelonning(false); }} />

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-line bg-surface shrink-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-sm font-extrabold tracking-[-0.01em] text-ink">{sak.tittel}</span>
          <Pill tone={TYPE_TONE[sak.type] || 'neutral'}>{TYPE_INFO[sak.type].label}</Pill>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs font-medium text-muted">{sak.brukerNavn}{sak.brukerEpost ? ` · ${sak.brukerEpost}` : ''}</div>
          <div className="flex items-center gap-1.5">
            {/* Status-knapper */}
            {Object.entries(STATUS_INFO).map(([key, info]) => {
              const valgt = sak.status === key;
              return (
                <button key={key} onClick={async () => oppdater(await settStatus(sakId, key))}
                  className={`text-xs font-bold px-2.5 py-1 rounded-[10px] border-[1.5px] transition-all cursor-pointer
                    ${valgt
                      ? 'border-brand bg-mint text-brand-ink'
                      : 'border-line-input bg-surface text-muted hover:border-brand hover:text-brand-ink'}`}>
                  {info.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Meldinger */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-3">
        {sak.meldinger.map((m) => {
          const egen = m.avsender === 'admin';
          if (m.type === 'status') return <div key={m.id} className="text-center text-xs font-medium text-muted-2 py-1">{m.tekst}</div>;
          if (m.type === 'belonning') return (
            <div key={m.id} className="flex justify-center">
              <div className="rounded-xl border border-amber-line bg-amber-bg px-4 py-2 text-center">
                <span className="text-xs font-bold text-amber"><Gift size={12} className="inline mr-1" />{m.meta?.maaneder} gratis mnd gitt</span>
              </div>
            </div>
          );
          return (
            <div key={m.id} className={`flex ${egen ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {!egen && <div className="text-xs font-semibold text-muted-2 mb-1 px-1">{sak.brukerNavn}</div>}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${egen ? 'bg-brand text-white rounded-br-sm' : 'bg-line-soft text-ink rounded-bl-sm'}`}>
                  {m.tekst}
                </div>
                <div className={`text-xs text-faint mt-1 ${egen ? 'text-right' : 'text-left'}`}>{relativTid(m.tidspunkt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bunn} />
      </div>

      {/* Skriv + belønning */}
      <div className="shrink-0 px-5 pt-3 pb-4 border-t border-line bg-surface">
        <button onClick={() => setVisBelonning(true)}
          className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-[10px] text-xs font-bold border-[1.5px] border-amber-line text-amber bg-amber-soft hover:bg-amber-bg transition-all cursor-pointer">
          <Gift size={12} /> Gi gratis måneder
        </button>
        <form onSubmit={send} className="flex gap-2">
          <textarea value={tekst} onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Svar brukeren..." rows={2}
            className="flex-1 bg-surface-2 border-[1.5px] border-line-input rounded-xl px-4 py-3 text-sm text-ink placeholder:text-faint outline-none focus:border-brand focus:bg-surface resize-none transition-all" />
          <button type="submit" disabled={!tekst.trim()}
            className="w-10 h-10 self-end rounded-xl bg-brand text-white flex items-center justify-center shadow-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Hoved ────────────────────────────────────────────────────────────────────
export default function AdminFeedback() {
  const [saker, setSaker] = useState([]);
  const [aktiv, setAktiv] = useState(null);
  const [filterType, setFilterType] = useState('alle');
  const [filterStatus, setFilterStatus] = useState('alle');
  const [søk, setSøk] = useState('');

  const oppfrisk = useCallback(() => { hentSaker().then(setSaker); }, []);
  useEffect(() => {
    oppfrisk();
    const av = abonner(oppfrisk);
    return av;
  }, [oppfrisk]);

  const filtrert = saker.filter((s) => {
    if (filterType !== 'alle' && s.type !== filterType) return false;
    if (filterStatus !== 'alle' && s.status !== filterStatus) return false;
    if (søk && !`${s.tittel} ${s.brukerNavn} ${s.beskrivelse}`.toLowerCase().includes(søk.toLowerCase())) return false;
    return true;
  });

  const apne = saker.filter((s) => s.status === 'ny' || s.status === 'under_arbeid').length;
  const uleste = saker.reduce((sum, s) => sum + s.meldinger.filter((m) => m.avsender === 'bruker' && !m.lestAdmin).length, 0);

  const selectKlasse =
    'bg-surface-2 border-[1.5px] border-line-input rounded-xl px-3.5 py-[11px] text-sm font-bold text-ink outline-none focus:border-brand focus:bg-surface transition-all cursor-pointer';

  return (
    <div>
      <PageHeader
        tittel="Tilbakemeldinger"
        undertittel={`${apne} åpne saker${uleste > 0 ? ` · ${uleste} uleste svar` : ''}`}
      />

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
          <input value={søk} onChange={(e) => setSøk(e.target.value)} placeholder="Søk sak, bruker..."
            className="w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl pl-10 pr-4 py-[11px] text-sm font-bold text-ink placeholder:font-medium placeholder:text-faint outline-none focus:border-brand focus:bg-surface transition-all" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectKlasse}>
          <option value="alle">Alle typer</option>
          {Object.entries(TYPE_INFO).map(([k, i]) => <option key={k} value={k}>{i.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectKlasse}>
          <option value="alle">Alle statuser</option>
          {Object.entries(STATUS_INFO).map(([k, i]) => <option key={k} value={k}>{i.label}</option>)}
        </select>
      </div>

      {saker.length === 0 ? (
        <div className="text-center py-20 text-sm font-medium text-muted-2">Ingen tilbakemeldinger ennå.</div>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* Liste */}
          <div className="space-y-2 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
            {filtrert.map((s) => {
              const Ikon = TYPE_IKON[s.type];
              const uleste = s.meldinger.filter((m) => m.avsender === 'bruker' && !m.lestAdmin).length;
              const erAktiv = aktiv === s.id;
              return (
                <button key={s.id} onClick={() => setAktiv(s.id)}
                  className={`w-full flex items-start gap-3 px-3 py-3 rounded-[14px] border text-left transition-all cursor-pointer
                    ${erAktiv ? 'border-brand bg-mint-soft' : 'border-line bg-surface hover:border-line-input hover:bg-surface-2'}`}>
                  <IconTile tone={TYPE_TILE[s.type] || 'sand'} size={32}><Ikon size={14} /></IconTile>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm font-bold text-ink truncate flex-1">{s.tittel}</span>
                      {uleste > 0 && <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">{uleste}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Pill tone={STATUS_TONE[s.status] || 'neutral'} className="!px-1.5 !py-0.5 !text-[10.5px]">{STATUS_INFO[s.status].label}</Pill>
                      <span className="font-medium text-muted truncate">{s.brukerNavn}</span>
                      <span className="text-faint ml-auto shrink-0">{relativTid(s.oppdatert)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtrert.length === 0 && <div className="text-center py-8 text-xs font-medium text-muted-2">Ingen saker matcher filteret.</div>}
          </div>

          {/* Chat */}
          <div className="rounded-[20px] border border-line bg-sand h-[calc(100vh-15rem)] overflow-hidden">
            {aktiv ? <AdminChat sakId={aktiv} onEndret={oppfrisk} /> : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <IconTile tone="mint" size={56} radius={18} className="mb-4"><MessageCircle size={26} /></IconTile>
                <div className="text-base font-extrabold tracking-[-0.01em] text-ink mb-1">Velg en sak</div>
                <div className="text-sm font-medium text-muted">Klikk en sak i listen for å lese og svare.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
