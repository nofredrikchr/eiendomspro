import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Wrench, MessageSquare,
  CheckCheck, ChevronDown, ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const VEDLIKEHOLD_STATUS = {
  apent:            { label: 'Åpent',             farge: '#DC2626' },
  under_behandling: { label: 'Under behandling',   farge: '#B45309' },
  losst:            { label: 'Løst',               farge: '#15803D' },
};

function datoFmt(iso) {
  return new Date(iso).toLocaleString('nb-NO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function MeldingBoble({ melding, erUtleier, onOppdaterStatus }) {
  const erEgen = melding.avsender === 'utleier';
  const er = melding.type === 'vedlikehold';

  return (
    <div className={`flex ${erEgen ? 'justify-end' : 'justify-start'} mb-3`}>
      {/* Avatar (leietaker) */}
      {!erEgen && (
        <div className="w-7 h-7 rounded-full bg-[#E9E8E2] flex items-center justify-center text-xs font-semibold text-[#65696F] mr-2 shrink-0 self-end">
          {(melding.avsenderNavn || '?')[0].toUpperCase()}
        </div>
      )}

      <div className={`max-w-[75%] space-y-1`}>
        {/* Avsendernavn */}
        {!erEgen && (
          <div className="text-xs text-[#7A7D83] px-1">{melding.avsenderNavn}</div>
        )}

        {/* Boble */}
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${erEgen
            ? 'bg-[#16284A] text-white rounded-br-sm'
            : er
              ? 'bg-[#B45309]/10 border border-[#B45309]/25 text-[#1A1B1E] rounded-bl-sm'
              : 'bg-[#E9E8E2] text-[#1A1B1E] rounded-bl-sm'
          }`}
        >
          {/* Vedlikehold-header */}
          {er && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[#B45309]/20">
              <Wrench size={12} className="text-[#B45309]" />
              <span className="text-xs font-semibold text-[#B45309]">Vedlikeholdsmelding</span>
            </div>
          )}

          {melding.tekst}

          {/* Vedlikehold-status */}
          {er && erUtleier && (
            <div className="mt-3 pt-2 border-t border-[#B45309]/20">
              <div className="text-xs text-[#65696F] mb-1.5">Oppdater status:</div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(VEDLIKEHOLD_STATUS).map(([key, { label, farge }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onOppdaterStatus(melding.id, key)}
                    className="px-2 py-0.5 rounded-full text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: melding.vedlikeholdStatus === key ? `${farge}25` : 'transparent',
                      color: melding.vedlikeholdStatus === key ? farge : '#65696F',
                      border: `1px solid ${melding.vedlikeholdStatus === key ? farge + '40' : '#DCDAD2'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Status-badge (leietaker ser) */}
          {er && !erUtleier && melding.vedlikeholdStatus && (
            <div className="mt-2 pt-2 border-t border-[#B45309]/20">
              <span className="text-xs" style={{ color: VEDLIKEHOLD_STATUS[melding.vedlikeholdStatus]?.farge }}>
                Status: {VEDLIKEHOLD_STATUS[melding.vedlikeholdStatus]?.label}
              </span>
            </div>
          )}
        </div>

        {/* Tidsstempel + lest */}
        <div className={`flex items-center gap-1 text-xs text-[#AEB0B4] px-1 ${erEgen ? 'justify-end' : 'justify-start'}`}>
          <span>{datoFmt(melding.opprettet)}</span>
          {erEgen && melding.lest && <CheckCheck size={12} className="text-[#2563EB]" />}
        </div>
      </div>
    </div>
  );
}

export default function Samtale() {
  const { kontraktId } = useParams();
  const navigate = useNavigate();
  const {
    kontrakter, leieobjekter, bygg, utleiere,
    meldinger, sendMelding, markerLest, oppdaterVedlikeholdStatus,
  } = useApp();

  const [tekst, setTekst] = useState('');
  const [meldType, setMeldType] = useState('melding');
  const [visTypeValg, setVisTypeValg] = useState(false);
  const bunnenRef = useRef(null);
  const inputRef = useRef(null);

  const kontrakt = kontrakter.find((k) => k.id === kontraktId);
  const obj = kontrakt ? leieobjekter.find((l) => l.id === kontrakt.leieobjektId) : null;
  const b = obj ? bygg.find((b) => b.id === obj.byggId) : null;
  const utleier = kontrakt ? utleiere.find((u) => u.id === kontrakt.utleierNavn) : null;

  const tråd = meldinger
    .filter((m) => m.kontraktId === kontraktId)
    .sort((a, b) => new Date(a.opprettet) - new Date(b.opprettet));

  // Marker alle leietaker-meldinger som lest
  useEffect(() => {
    if (kontraktId) markerLest(kontraktId);
    // markerLest bevisst utelatt fra deps — kjøres kun ved bytte av samtale
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kontraktId]);

  // Scroll til bunn
  useEffect(() => {
    bunnenRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tråd.length]);

  function send(e) {
    e?.preventDefault();
    if (!tekst.trim() || !kontraktId) return;
    sendMelding({
      kontraktId,
      avsender: 'utleier',
      avsenderNavn: utleier?.navn || 'Utleier',
      tekst: tekst.trim(),
      type: meldType,
      vedlikeholdStatus: meldType === 'vedlikehold' ? 'apent' : null,
    });
    setTekst('');
    setMeldType('melding');
    setVisTypeValg(false);
    inputRef.current?.focus();
  }

  if (!kontrakt) {
    return (
      <div className="text-center py-20">
        <div className="text-sm text-[#7A7D83]">Kontrakt ikke funnet</div>
      </div>
    );
  }

  const adresse = b
    ? `${b.gatenavn} ${b.gatenummer}${obj?.betegnelse ? ' · ' + obj.betegnelse : ''}`
    : '—';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E9E8E2] shrink-0">
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg transition-all cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#E9E8E2] flex items-center justify-center text-sm font-semibold text-[#65696F] shrink-0">
          {(kontrakt.leietakerNavn || '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-[#1A1B1E]">{kontrakt.leietakerNavn}</div>
          <div className="text-xs text-[#7A7D83] truncate">{adresse}</div>
        </div>
        <button type="button"
          onClick={() => navigate(`/kontrakter/${kontraktId}`)}
          className="flex items-center gap-1.5 text-xs text-[#7A7D83] hover:text-[#1A1B1E] transition-colors cursor-pointer">
          <ExternalLink size={12} />
          Kontrakt
        </button>
      </div>

      {/* Meldingsliste */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {tråd.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare size={28} className="text-[#AEB0B4] mb-3" />
            <div className="text-sm font-medium text-[#1A1B1E] mb-1">Start samtalen</div>
            <div className="text-xs text-[#7A7D83] max-w-xs">
              Send en melding til {kontrakt.leietakerNavn}. Leietaker vil motta en e-post med lenke til samtalen.
            </div>
          </div>
        ) : (
          <div className="py-2">
            {tråd.map((m) => (
              <MeldingBoble
                key={m.id}
                melding={m}
                erUtleier={true}
                onOppdaterStatus={oppdaterVedlikeholdStatus}
              />
            ))}
            <div ref={bunnenRef} />
          </div>
        )}
      </div>

      {/* Skriv melding */}
      <div className="shrink-0 pt-4 border-t border-[#E9E8E2]">
        {/* Type-velger */}
        <div className="flex items-center gap-2 mb-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setVisTypeValg(!visTypeValg)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border"
              style={{
                background: meldType === 'vedlikehold' ? '#B4530915' : 'transparent',
                color: meldType === 'vedlikehold' ? '#B45309' : '#7A7D83',
                borderColor: meldType === 'vedlikehold' ? '#B4530930' : '#DCDAD2',
              }}
            >
              {meldType === 'vedlikehold' ? <Wrench size={11} /> : <MessageSquare size={11} />}
              {meldType === 'vedlikehold' ? 'Vedlikehold' : 'Melding'}
              <ChevronDown size={10} />
            </button>
            {visTypeValg && (
              <div className="absolute bottom-full mb-1 left-0 bg-[#E9E8E2] border border-[#DCDAD2] rounded-xl p-1 z-10 min-w-40">
                {[
                  { value: 'melding', label: 'Vanlig melding', ikon: MessageSquare },
                  { value: 'vedlikehold', label: 'Vedlikeholdsmelding', ikon: Wrench },
                ].map(({ value, label, ikon: Ikon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setMeldType(value); setVisTypeValg(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left hover:bg-black/[0.045] transition-colors cursor-pointer"
                    style={{ color: meldType === value ? 'white' : '#65696F' }}
                  >
                    <Ikon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-[#AEB0B4]">
            {meldType === 'vedlikehold' ? 'Leietaker ser meldingen som en vedlikeholdsak med status' : ''}
          </span>
        </div>

        {/* Input */}
        <form onSubmit={send} className="flex gap-2">
          <textarea
            ref={inputRef}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={`Skriv en melding til ${kontrakt.leietakerNavn}...`}
            rows={2}
            className="flex-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] resize-none transition-colors"
          />
          <button
            type="submit"
            disabled={!tekst.trim()}
            className="w-10 h-10 self-end rounded-xl bg-[#16284A] text-white flex items-center justify-center hover:bg-[#1E3A5F] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
          >
            <Send size={14} />
          </button>
        </form>
        <p className="text-xs text-[#AEB0B4] mt-1.5">Enter for å sende · Shift+Enter for ny linje</p>
      </div>
    </div>
  );
}
