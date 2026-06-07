import { useState, useEffect, useRef } from 'react';
import {
  Bug, Lightbulb, MessageCircle, Send, Gift, Check, X, Shield, Search, ArrowLeft,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
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

// ─── Belønningsmodal ──────────────────────────────────────────────────────────
function BelonningModal({ onGi, onLukk }) {
  const [maaneder, setMaaneder] = useState(1);
  const valg = [1, 2, 3, 6, 12];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onLukk}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#FFFFFF] border border-[#DCDAD2] rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#9A7A24]/15 flex items-center justify-center"><Gift size={15} className="text-[#9A7A24]" /></div>
            <h3 className="text-base font-semibold text-[#1A1B1E]">Gi gratis måneder</h3>
          </div>
          <button onClick={onLukk} className="text-[#7A7D83] hover:text-[#1A1B1E] cursor-pointer"><X size={16} /></button>
        </div>
        <p className="text-xs text-[#65696F]">Brukeren får en takkemelding i chatten, og belønningen registreres på saken.</p>
        <div className="flex gap-2 flex-wrap">
          {valg.map((m) => (
            <button key={m} onClick={() => setMaaneder(m)}
              className="px-3 py-2 rounded-lg border text-sm transition-all cursor-pointer"
              style={{ borderColor: maaneder === m ? '#9A7A2460' : '#E9E8E2', background: maaneder === m ? '#9A7A2412' : 'transparent', color: maaneder === m ? '#9A7A24' : '#65696F' }}>
              {m} mnd
            </button>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onLukk}>Avbryt</Button>
          <Button variant="primary" className="flex-1 justify-center"
            onClick={() => onGi({ maaneder, beskrivelse: `Du har fått ${maaneder} ${maaneder === 1 ? 'gratis måned' : 'gratis måneder'} på abonnementet som takk for tilbakemeldingen.` })}>
            Gi {maaneder} mnd
          </Button>
        </div>
      </div>
    </div>
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
  }, [sakId]);
  useEffect(() => { bunn.current?.scrollIntoView({ behavior: 'smooth' }); }, [sak?.meldinger.length]);

  if (!sak) return <div className="flex items-center justify-center h-full text-sm text-[#7A7D83]">Laster…</div>;
  const TInfo = TYPE_INFO[sak.type];

  function oppdater(ny) { setSak({ ...ny }); onEndret?.(); }
  async function send(e) {
    e?.preventDefault();
    if (!tekst.trim()) return;
    setTekst('');
    oppdater(await sendMelding(sakId, { avsender: 'admin', tekst: tekst.trim() }));
  }

  return (
    <div className="flex flex-col h-full">
      {visBelonning && <BelonningModal onLukk={() => setVisBelonning(false)} onGi={async (b) => { oppdater(await giBelonning(sakId, b)); setVisBelonning(false); }} />}

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-[#E9E8E2] shrink-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-sm font-semibold text-[#1A1B1E]">{sak.tittel}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${TInfo.farge}18`, color: TInfo.farge }}>{TInfo.label}</span>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-[#7A7D83]">{sak.brukerNavn}{sak.brukerEpost ? ` · ${sak.brukerEpost}` : ''}</div>
          <div className="flex items-center gap-1.5">
            {/* Status-knapper */}
            {Object.entries(STATUS_INFO).map(([key, info]) => (
              <button key={key} onClick={async () => oppdater(await settStatus(sakId, key))}
                className="text-xs px-2 py-1 rounded-lg border transition-all cursor-pointer"
                style={{
                  borderColor: sak.status === key ? info.farge + '50' : '#E9E8E2',
                  background: sak.status === key ? info.farge + '15' : 'transparent',
                  color: sak.status === key ? info.farge : '#7A7D83',
                }}>
                {info.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Meldinger */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4 space-y-3">
        {sak.meldinger.map((m) => {
          const egen = m.avsender === 'admin';
          if (m.type === 'status') return <div key={m.id} className="text-center text-xs text-[#7A7D83] py-1">{m.tekst}</div>;
          if (m.type === 'belonning') return (
            <div key={m.id} className="flex justify-center">
              <div className="rounded-xl border border-[#9A7A24]/30 bg-[#9A7A24]/8 px-4 py-2 text-center">
                <span className="text-xs text-[#9A7A24]"><Gift size={12} className="inline mr-1" />{m.meta?.maaneder} gratis mnd gitt</span>
              </div>
            </div>
          );
          return (
            <div key={m.id} className={`flex ${egen ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {!egen && <div className="text-xs text-[#7A7D83] mb-1 px-1">{sak.brukerNavn}</div>}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${egen ? 'bg-[#15803D] text-[#F6F6F4] rounded-br-sm' : 'bg-[#E9E8E2] text-[#1A1B1E] rounded-bl-sm'}`}>
                  {m.tekst}
                </div>
                <div className={`text-xs text-[#AEB0B4] mt-1 ${egen ? 'text-right' : 'text-left'}`}>{relativTid(m.tidspunkt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bunn} />
      </div>

      {/* Skriv + belønning */}
      <div className="shrink-0 px-5 pt-3 pb-4 border-t border-[#E9E8E2]">
        <button onClick={() => setVisBelonning(true)}
          className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg text-xs border border-[#9A7A24]/30 text-[#9A7A24] hover:bg-[#9A7A24]/10 transition-all cursor-pointer">
          <Gift size={12} /> Gi gratis måneder
        </button>
        <form onSubmit={send} className="flex gap-2">
          <textarea value={tekst} onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Svar brukeren..." rows={2}
            className="flex-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] resize-none" />
          <button type="submit" disabled={!tekst.trim()}
            className="w-10 h-10 self-end rounded-xl bg-[#15803D] text-[#F6F6F4] flex items-center justify-center hover:bg-[#166534] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
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

  function oppfrisk() { hentSaker().then(setSaker); }
  useEffect(() => {
    oppfrisk();
    const av = abonner(oppfrisk);
    return av;
  }, []);

  const filtrert = saker.filter((s) => {
    if (filterType !== 'alle' && s.type !== filterType) return false;
    if (filterStatus !== 'alle' && s.status !== filterStatus) return false;
    if (søk && !`${s.tittel} ${s.brukerNavn} ${s.beskrivelse}`.toLowerCase().includes(søk.toLowerCase())) return false;
    return true;
  });

  const apne = saker.filter((s) => s.status === 'ny' || s.status === 'under_arbeid').length;
  const uleste = saker.reduce((sum, s) => sum + s.meldinger.filter((m) => m.avsender === 'bruker' && !m.lestAdmin).length, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#DC2626]/10 flex items-center justify-center"><Shield size={17} className="text-[#DC2626]" /></div>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">Admin · Tilbakemeldinger</h1>
            <p className="text-sm text-[#65696F] mt-0.5">{apne} åpne saker{uleste > 0 ? ` · ${uleste} uleste svar` : ''}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-44 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7D83]" />
          <input value={søk} onChange={(e) => setSøk(e.target.value)} placeholder="Søk sak, bruker..."
            className="w-full bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl pl-9 pr-4 py-2 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2]" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none cursor-pointer">
          <option value="alle">Alle typer</option>
          {Object.entries(TYPE_INFO).map(([k, i]) => <option key={k} value={k}>{i.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-3 py-2 text-sm text-[#1A1B1E] outline-none cursor-pointer">
          <option value="alle">Alle statuser</option>
          {Object.entries(STATUS_INFO).map(([k, i]) => <option key={k} value={k}>{i.label}</option>)}
        </select>
      </div>

      {saker.length === 0 ? (
        <div className="text-center py-20 text-sm text-[#7A7D83]">Ingen tilbakemeldinger ennå.</div>
      ) : (
        <div className="grid lg:grid-cols-[340px_1fr] gap-4 items-start">
          {/* Liste */}
          <div className="space-y-2 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
            {filtrert.map((s) => {
              const TInfo = TYPE_INFO[s.type];
              const Ikon = TYPE_IKON[s.type];
              const sInfo = STATUS_INFO[s.status];
              const uleste = s.meldinger.filter((m) => m.avsender === 'bruker' && !m.lestAdmin).length;
              const erAktiv = aktiv === s.id;
              return (
                <button key={s.id} onClick={() => setAktiv(s.id)}
                  className="w-full flex items-start gap-3 px-3 py-3 rounded-xl border text-left transition-all cursor-pointer"
                  style={{ borderColor: erAktiv ? '#AEB0B4' : '#E9E8E2', background: erAktiv ? '#FAF9F6' : '#FFFFFF' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${TInfo.farge}15` }}>
                    <Ikon size={14} style={{ color: TInfo.farge }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-medium text-[#1A1B1E] truncate flex-1">{s.tittel}</span>
                      {uleste > 0 && <span className="w-4 h-4 rounded-full bg-[#2563EB] text-[#F6F6F4] text-[10px] font-bold flex items-center justify-center shrink-0">{uleste}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-1.5 py-0.5 rounded-full" style={{ background: `${sInfo.farge}18`, color: sInfo.farge }}>{sInfo.label}</span>
                      <span className="text-[#7A7D83] truncate">{s.brukerNavn}</span>
                      <span className="text-[#AEB0B4] ml-auto shrink-0">{relativTid(s.oppdatert)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
            {filtrert.length === 0 && <div className="text-center py-8 text-xs text-[#7A7D83]">Ingen saker matcher filteret.</div>}
          </div>

          {/* Chat */}
          <div className="rounded-xl border border-[#E9E8E2] bg-[#F1F1ED] h-[calc(100vh-15rem)] overflow-hidden">
            {aktiv ? <AdminChat sakId={aktiv} onEndret={oppfrisk} /> : (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <MessageCircle size={28} className="text-[#AEB0B4] mb-3" />
                <div className="text-sm font-medium text-[#1A1B1E] mb-1">Velg en sak</div>
                <div className="text-xs text-[#7A7D83]">Klikk en sak i listen for å lese og svare.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
