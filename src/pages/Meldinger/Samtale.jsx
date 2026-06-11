import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Wrench, MessageSquare,
  CheckCheck, ChevronDown, ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Avatar, Pill } from '../../components/ui/kit';

const VEDLIKEHOLD_STATUS = {
  apent:            { label: 'Åpent',            tone: 'amber' },
  under_behandling: { label: 'Under behandling', tone: 'amber' },
  losst:            { label: 'Løst',             tone: 'mint' },
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
        <Avatar navn={melding.avsenderNavn || '?'} tone="sand" size={30} className="mr-2 self-end" />
      )}

      <div className="max-w-[75%] space-y-1">
        {/* Avsendernavn */}
        {!erEgen && (
          <div className="text-xs font-semibold text-muted-2 px-1">{melding.avsenderNavn}</div>
        )}

        {/* Boble */}
        <div className={`rounded-[18px] px-4 py-3 text-[14px] leading-relaxed font-medium
          ${erEgen
            ? 'bg-brand text-white rounded-br-md'
            : er
              ? 'bg-amber-soft border border-amber-line text-ink-2 rounded-bl-md'
              : 'bg-surface-2 border border-line text-ink-2 rounded-bl-md'
          }`}
        >
          {/* Vedlikehold-header */}
          {er && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-amber-line">
              <Wrench size={12} className="text-amber" />
              <span className="text-xs font-extrabold text-amber">Vedlikeholdsmelding</span>
            </div>
          )}

          {melding.tekst}

          {/* Vedlikehold-status */}
          {er && erUtleier && (
            <div className="mt-3 pt-2.5 border-t border-amber-line">
              <div className="text-xs font-semibold text-muted-2 mb-2">Oppdater status:</div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.entries(VEDLIKEHOLD_STATUS).map(([key, { label, tone }]) => {
                  const aktiv = melding.vedlikeholdStatus === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onOppdaterStatus(melding.id, key)}
                      className="cursor-pointer transition-all"
                    >
                      <Pill tone={aktiv ? tone : 'muted'} className={aktiv ? '' : 'opacity-70'}>{label}</Pill>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Status-badge (leietaker ser) */}
          {er && !erUtleier && melding.vedlikeholdStatus && (
            <div className="mt-2.5 pt-2 border-t border-amber-line">
              <Pill tone={VEDLIKEHOLD_STATUS[melding.vedlikeholdStatus]?.tone}>
                Status: {VEDLIKEHOLD_STATUS[melding.vedlikeholdStatus]?.label}
              </Pill>
            </div>
          )}
        </div>

        {/* Tidsstempel + lest */}
        <div className={`flex items-center gap-1 text-[11px] font-semibold text-faint px-1 ${erEgen ? 'justify-end' : 'justify-start'}`}>
          <span>{datoFmt(melding.opprettet)}</span>
          {erEgen && melding.lest && <CheckCheck size={12} className="text-brand" />}
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
      <div className="text-center py-20 text-sm font-medium text-muted">Kontrakt ikke funnet</div>
    );
  }

  const adresse = b
    ? `${b.gatenavn} ${b.gatenummer}${obj?.betegnelse ? ' · ' + obj.betegnelse : ''}`
    : '—';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-up">

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-line shrink-0">
        <button type="button" onClick={() => navigate(-1)}
          className="p-1.5 text-muted hover:text-ink hover:bg-line-soft rounded-[10px] transition-all cursor-pointer">
          <ArrowLeft size={18} />
        </button>
        <Avatar navn={kontrakt.leietakerNavn || '?'} tone="mint" size={38} />
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-extrabold tracking-[-0.01em] text-ink">{kontrakt.leietakerNavn}</div>
          <div className="text-[12.5px] font-semibold text-muted-2 truncate">{adresse}</div>
        </div>
        <button type="button"
          onClick={() => navigate(`/kontrakter/${kontraktId}`)}
          className="flex items-center gap-1.5 text-[12.5px] font-bold text-muted-2 hover:text-brand-ink transition-colors cursor-pointer">
          <ExternalLink size={13} />
          Kontrakt
        </button>
      </div>

      {/* Meldingsliste */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {tråd.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-[18px] bg-mint flex items-center justify-center text-brand mb-5">
              <MessageSquare size={26} />
            </div>
            <div className="text-base font-extrabold tracking-[-0.01em] text-ink mb-1.5">Start samtalen</div>
            <div className="text-sm font-medium text-muted max-w-xs leading-relaxed">
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
      <div className="shrink-0 pt-4 border-t border-line">
        {/* Type-velger */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setVisTypeValg(!visTypeValg)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12.5px] font-bold transition-all cursor-pointer border-[1.5px]
                ${meldType === 'vedlikehold'
                  ? 'bg-amber-bg border-amber-line text-amber'
                  : 'bg-surface-2 border-line-input text-muted-2 hover:text-ink-2'}`}
            >
              {meldType === 'vedlikehold'
                ? <span className="flex items-center gap-1.5"><Wrench size={12} /> Vedlikehold</span>
                : <span className="flex items-center gap-1.5"><MessageSquare size={12} /> Melding</span>}
              <ChevronDown size={11} />
            </button>
            {visTypeValg && (
              <div className="absolute bottom-full mb-1.5 left-0 bg-surface border border-line rounded-xl shadow-soft p-1 z-10 min-w-44">
                {[
                  { value: 'melding', label: 'Vanlig melding', ikon: MessageSquare },
                  { value: 'vedlikehold', label: 'Vedlikeholdsmelding', ikon: Wrench },
                ].map(({ value, label, ikon: Ikon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setMeldType(value); setVisTypeValg(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-[9px] text-[13px] font-bold text-left hover:bg-line-soft transition-colors cursor-pointer ${meldType === value ? 'text-brand-ink' : 'text-ink-2'}`}
                  >
                    <Ikon size={13} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-[12px] font-medium text-muted-2">
            {meldType === 'vedlikehold' ? 'Leietaker ser meldingen som en vedlikeholdsak med status' : ''}
          </span>
        </div>

        {/* Input */}
        <form onSubmit={send} className="flex gap-2.5">
          <textarea
            ref={inputRef}
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={`Skriv en melding til ${kontrakt.leietakerNavn}...`}
            rows={2}
            className="flex-1 bg-surface-2 border-[1.5px] border-line-input rounded-xl px-4 py-3 text-sm font-medium text-ink placeholder:text-faint outline-none focus:border-brand focus:bg-surface resize-none transition-all leading-relaxed"
          />
          <Button type="submit" disabled={!tekst.trim()} size="lg" className="self-end w-12 px-0">
            <Send size={16} />
          </Button>
        </form>
        <p className="text-[12px] font-medium text-faint mt-2">Enter for å sende · Shift+Enter for ny linje</p>
      </div>
    </div>
  );
}
