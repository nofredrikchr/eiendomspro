import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Plus, Send, Bug, Lightbulb, MessageCircle, Gift, ChevronRight, LifeBuoy,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';
import {
  hentSaker, hentSak, opprettSak, sendMelding, markerLest, abonner,
  TYPE_INFO, STATUS_INFO,
} from '../../services/feedbackService';

function relativTid(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000), t = Math.floor(min / 60), d = Math.floor(t / 24);
  if (min < 1) return 'Nå nettopp';
  if (min < 60) return `${min}m siden`;
  if (t < 24) return `${t}t siden`;
  if (d < 7) return `${d}d siden`;
  return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' });
}

const TYPE_IKON = { feil: Bug, onske: Lightbulb, sporsmal: MessageCircle };

// ─── Statusbrikke ─────────────────────────────────────────────────────────────
function StatusBrikke({ status }) {
  const s = STATUS_INFO[status] || STATUS_INFO.ny;
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${s.farge}18`, color: s.farge }}>
      {s.label}
    </span>
  );
}

// ─── Ny sak-skjema ────────────────────────────────────────────────────────────
function NySak({ onLagret, onAvbryt }) {
  const [type, setType] = useState('feil');
  const [tittel, setTittel] = useState('');
  const [beskrivelse, setBeskrivelse] = useState('');

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <div className="text-xs font-medium text-[#65696F] mb-2">Hva gjelder det?</div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TYPE_INFO).map(([key, info]) => {
            const Ikon = TYPE_IKON[key];
            const valgt = type === key;
            return (
              <button key={key} type="button" onClick={() => setType(key)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm transition-all cursor-pointer"
                style={{
                  borderColor: valgt ? info.farge + '60' : '#E9E8E2',
                  background: valgt ? info.farge + '12' : 'transparent',
                  color: valgt ? '#fff' : '#65696F',
                }}>
                <Ikon size={18} style={{ color: valgt ? info.farge : '#7A7D83' }} />
                {info.label}
              </button>
            );
          })}
        </div>
      </div>

      <Input label="Tittel" value={tittel} onChange={(e) => setTittel(e.target.value)}
        placeholder={type === 'feil' ? 'Kort beskrivelse av feilen' : type === 'onske' ? 'Hva ønsker du deg?' : 'Hva lurer du på?'} />
      <Textarea label="Beskrivelse" value={beskrivelse} onChange={(e) => setBeskrivelse(e.target.value)} rows={5}
        placeholder={type === 'feil'
          ? 'Hva skjedde? Hva forventet du? Hvilken side var du på?'
          : 'Beskriv så detaljert du kan — det hjelper oss å hjelpe deg raskt.'} />

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onAvbryt}>Avbryt</Button>
        <Button variant="primary" disabled={!tittel.trim() || !beskrivelse.trim()}
          onClick={async () => { await opprettSak({ type, tittel: tittel.trim(), beskrivelse: beskrivelse.trim() }); onLagret(); }}>
          Send inn
        </Button>
      </div>
    </div>
  );
}

// ─── Chat-visning ─────────────────────────────────────────────────────────────
function SakChat({ sakId, onTilbake, onEndret }) {
  const [sak, setSak] = useState(null);
  const [tekst, setTekst] = useState('');
  const bunn = useRef(null);

  async function lastSak() { setSak(await hentSak(sakId)); }

  useEffect(() => {
    let aktiv = true;
    (async () => {
      await markerLest(sakId, 'bruker');
      const s = await hentSak(sakId);
      if (aktiv) setSak(s);
      onEndret?.();
    })();
    const av = abonner(() => hentSak(sakId).then((s) => aktiv && setSak(s)));
    return () => { aktiv = false; av(); };
  }, [sakId]);
  useEffect(() => { bunn.current?.scrollIntoView({ behavior: 'smooth' }); }, [sak?.meldinger.length]);

  if (!sak) return null;
  const TInfo = TYPE_INFO[sak.type];

  async function send(e) {
    e?.preventDefault();
    if (!tekst.trim()) return;
    setTekst('');
    const oppdatert = await sendMelding(sakId, { avsender: 'bruker', tekst: tekst.trim() });
    setSak({ ...oppdatert });
    onEndret?.();
  }

  return (
    <div className="flex flex-col h-[calc(100vh-9rem)]">
      {/* Header */}
      <div className="flex items-start gap-3 pb-4 border-b border-[#E9E8E2] shrink-0">
        <button onClick={onTilbake} className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg transition-all cursor-pointer mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#1A1B1E]">{sak.tittel}</span>
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${TInfo.farge}18`, color: TInfo.farge }}>{TInfo.label}</span>
            <StatusBrikke status={sak.status} />
          </div>
          <div className="text-xs text-[#7A7D83] mt-0.5">Opprettet {relativTid(sak.opprettet)}</div>
        </div>
      </div>

      {/* Meldinger */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-3">
        {sak.meldinger.map((m) => {
          const egen = m.avsender === 'bruker';
          if (m.type === 'status') {
            return <div key={m.id} className="text-center text-xs text-[#7A7D83] py-1">{m.tekst}</div>;
          }
          if (m.type === 'belonning') {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="rounded-xl border border-[#9A7A24]/30 bg-[#9A7A24]/8 px-4 py-3 text-center max-w-sm">
                  <Gift size={18} className="text-[#9A7A24] mx-auto mb-1.5" />
                  <div className="text-sm font-semibold text-[#9A7A24]">Takk for hjelpen! 🎉</div>
                  <div className="text-xs text-[#e4d9b8] mt-1">{m.tekst}</div>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${egen ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[80%]">
                {!egen && <div className="text-xs text-[#7A7D83] mb-1 px-1">EiendomsPRO-teamet</div>}
                <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                  ${egen ? 'bg-[#16284A] text-white rounded-br-sm' : 'bg-[#E9E8E2] text-[#1A1B1E] rounded-bl-sm'}`}>
                  {m.tekst}
                </div>
                <div className={`text-xs text-[#AEB0B4] mt-1 ${egen ? 'text-right' : 'text-left'}`}>{relativTid(m.tidspunkt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bunn} />
      </div>

      {/* Skriv */}
      {sak.status === 'lost' || sak.status === 'avvist' ? (
        <div className="shrink-0 pt-3 border-t border-[#E9E8E2] text-center text-xs text-[#7A7D83] py-3">
          Saken er {STATUS_INFO[sak.status].label.toLowerCase()}. Skriv en ny melding for å gjenåpne dialogen.
          <form onSubmit={send} className="flex gap-2 mt-3">
            <input value={tekst} onChange={(e) => setTekst(e.target.value)} placeholder="Skriv en melding..."
              className="flex-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-4 py-2.5 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2]" />
            <button type="submit" disabled={!tekst.trim()} className="w-10 h-10 rounded-xl bg-[#16284A] text-white flex items-center justify-center disabled:opacity-30 cursor-pointer"><Send size={14} /></button>
          </form>
        </div>
      ) : (
        <form onSubmit={send} className="shrink-0 pt-3 border-t border-[#E9E8E2] flex gap-2">
          <textarea value={tekst} onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Skriv en melding til oss..." rows={2}
            className="flex-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] resize-none" />
          <button type="submit" disabled={!tekst.trim()}
            className="w-10 h-10 self-end rounded-xl bg-[#16284A] text-white flex items-center justify-center hover:bg-[#1E3A5F] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
            <Send size={14} />
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Hoved ────────────────────────────────────────────────────────────────────
export default function Feedback() {
  const [visning, setVisning] = useState('liste'); // 'liste' | 'ny' | 'chat'
  const [aktivSak, setAktivSak] = useState(null);
  const [saker, setSaker] = useState([]);

  function oppfrisk() { hentSaker().then(setSaker); }
  useEffect(() => { oppfrisk(); }, []);

  if (visning === 'ny') {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setVisning('liste')} className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg cursor-pointer"><ArrowLeft size={18} /></button>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Ny tilbakemelding</h1>
        </div>
        <NySak onAvbryt={() => setVisning('liste')} onLagret={() => { oppfrisk(); setVisning('liste'); }} />
      </div>
    );
  }

  if (visning === 'chat' && aktivSak) {
    return <SakChat sakId={aktivSak} onTilbake={() => { setVisning('liste'); oppfrisk(); }} onEndret={oppfrisk} />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Tilbakemelding</h1>
          <p className="text-sm text-[#65696F] mt-1">Meld fra om feil, foreslå forbedringer, eller still spørsmål — vi svarer deg her.</p>
        </div>
        <Button variant="primary" onClick={() => setVisning('ny')}><Plus size={14} /> Ny sak</Button>
      </div>

      {saker.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 rounded-full bg-[#E9E8E2] flex items-center justify-center mx-auto mb-4">
            <LifeBuoy size={24} className="text-[#7A7D83]" />
          </div>
          <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen saker ennå</div>
          <div className="text-xs text-[#7A7D83] mb-5 max-w-sm mx-auto">Fant du en feil eller har et ønske? Vi vil gjerne høre fra deg — og du får ofte svar samme dag.</div>
          <Button variant="primary" onClick={() => setVisning('ny')}><Plus size={14} /> Send din første tilbakemelding</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {saker.map((s) => {
            const TInfo = TYPE_INFO[s.type];
            const Ikon = TYPE_IKON[s.type];
            const uleste = s.meldinger.filter((m) => m.avsender === 'admin' && !m.lestBruker).length;
            const sisteMelding = s.meldinger[s.meldinger.length - 1];
            return (
              <button key={s.id} onClick={() => { setAktivSak(s.id); setVisning('chat'); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-xl border border-[#E9E8E2] bg-[#FFFFFF] hover:border-[#DCDAD2] hover:bg-[#FAF9F6] transition-all text-left group">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${TInfo.farge}15` }}>
                  <Ikon size={16} style={{ color: TInfo.farge }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[#1A1B1E] truncate">{s.tittel}</span>
                    <StatusBrikke status={s.status} />
                    {uleste > 0 && <span className="w-5 h-5 rounded-full bg-[#2563EB] text-[#F6F6F4] text-xs font-bold flex items-center justify-center shrink-0">{uleste}</span>}
                  </div>
                  <div className="text-xs text-[#7A7D83] truncate">
                    {sisteMelding?.type === 'belonning' ? '🎁 Du fikk en belønning' : sisteMelding?.avsender === 'admin' ? `Svar: ${sisteMelding.tekst}` : sisteMelding?.tekst}
                  </div>
                </div>
                <div className="text-xs text-[#AEB0B4] shrink-0">{relativTid(s.oppdatert)}</div>
                <ChevronRight size={15} className="text-[#AEB0B4] group-hover:text-[#65696F] shrink-0" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
