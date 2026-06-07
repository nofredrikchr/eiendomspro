import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Home, CreditCard, MessageSquare, FileText, Wrench,
  Calendar, Copy, Check, Download, Send, ClipboardList,
  Building2, AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../../components/Logo';
import { finnKontraktFraToken } from '../../utils/leietakerToken';
import { alleFakturaerForKontrakt, nesteForfall, fakturaSummer } from '../../utils/faktura';
import { formaterKID } from '../../utils/kid';
import { genererKontraktPDF } from '../../utils/kontraktPDF';
import { genererProtokollPDF } from '../../utils/protokollPDF';
import { formatKr } from '../../utils/format';

function datoFmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function datoLang(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}
function relativTid(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000), t = Math.floor(min / 60), d = Math.floor(t / 24);
  if (min < 1) return 'Nå nettopp';
  if (min < 60) return `${min}m siden`;
  if (t < 24) return `${t}t siden`;
  if (d < 7) return `${d}d siden`;
  return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' });
}

// ─── Ugyldig lenke ─────────────────────────────────────────────────────────────
function UgyldigLenke() {
  return (
    <div className="min-h-screen bg-[#F6F6F4] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-[#DC2626]/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-[#DC2626]" />
        </div>
        <h1 className="text-lg font-semibold text-[#1A1B1E] mb-2">Ugyldig lenke</h1>
        <p className="text-sm text-[#65696F]">
          Denne lenken er ikke gyldig, eller leieforholdet er avsluttet. Ta kontakt med din utleier
          for en ny lenke.
        </p>
      </div>
    </div>
  );
}

// ─── Hoved ─────────────────────────────────────────────────────────────────────
export default function LeietakerPortal() {
  const { token } = useParams();
  const {
    kontrakter, leieobjekter, bygg, utleiere,
    meldinger = [], sendMelding, protokoller = [], utlegg = [],
  } = useApp();

  const [tab, setTab] = useState('hjem');
  const [kopiert, setKopiert] = useState('');

  const kontrakt = finnKontraktFraToken(token, kontrakter);
  const obj = kontrakt ? leieobjekter.find((l) => l.id === kontrakt.leieobjektId) : null;
  const b = obj ? bygg.find((bb) => bb.id === obj.byggId) : null;
  const utleier = kontrakt ? utleiere.find((u) => u.id === kontrakt.utleierNavn) : null;

  if (!kontrakt) return <UgyldigLenke />;

  const adresse = b ? `${b.gatenavn} ${b.gatenummer}, ${b.postnummer} ${b.poststed}` : 'Din bolig';
  const fakturaer = alleFakturaerForKontrakt(kontrakt, utlegg);
  const neste = nesteForfall(kontrakt, utlegg);
  const { totalt, ubetalt } = fakturaSummer(fakturaer);
  const kontonr = utleier?.kontonummer || kontrakt.kontonummer || '';
  const mineProtokoller = protokoller.filter((p) => p.kontraktId === kontrakt.id);

  function kopier(tekst, id) {
    navigator.clipboard.writeText(tekst).then(() => {
      setKopiert(id);
      setTimeout(() => setKopiert(''), 2000);
    });
  }

  const tabs = [
    { id: 'hjem', label: 'Hjem', ikon: Home },
    { id: 'betalinger', label: 'Betalinger', ikon: CreditCard },
    { id: 'meldinger', label: 'Meldinger', ikon: MessageSquare },
    { id: 'dokumenter', label: 'Dokumenter', ikon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#F6F6F4]">
      {/* Topbar */}
      <header className="border-b border-[#E9E8E2] sticky top-0 bg-[#F6F6F4]/95 backdrop-blur-sm z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo variant="light" height={24} />
          <div className="text-xs text-[#7A7D83] hidden sm:block">Leietakerportal</div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 pb-24">
        {/* Hilsen */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Hei, {kontrakt.leietakerNavn?.split(' ')[0] || 'leietaker'} 👋</h1>
          <p className="text-sm text-[#65696F] mt-1 flex items-center gap-1.5">
            <Building2 size={13} /> {adresse}{obj?.betegnelse ? ` · ${obj.betegnelse}` : ''}
          </p>
        </div>

        {/* ══ HJEM ══════════════════════════════════════════════════════ */}
        {tab === 'hjem' && (
          <div className="space-y-4">
            {/* Neste betaling — hero */}
            {neste ? (
              <div className="rounded-2xl p-5 border" style={{ borderColor: 'rgba(201,168,76,0.25)', background: 'linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={14} className="text-[#9A7A24]" />
                  <span className="text-xs font-medium text-[#9A7A24] uppercase tracking-wider">Neste betaling</span>
                </div>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <div className="text-3xl font-bold text-[#1A1B1E] num">{formatKr(neste.belop)}</div>
                    <div className="text-sm text-[#4B4E54] mt-1">{neste.beskrivelse}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#7A7D83]">Forfaller</div>
                    <div className="text-sm font-medium text-[#1A1B1E]">{datoLang(neste.forfall)}</div>
                  </div>
                </div>

                {/* Betalingsinfo */}
                <div className="space-y-2 pt-3 border-t border-[#9A7A24]/15">
                  {kontonr && (
                    <BetalRad label="Kontonummer" verdi={kontonr} onKopier={() => kopier(kontonr.replace(/\D/g, ''), 'konto')} kopiert={kopiert === 'konto'} />
                  )}
                  <BetalRad label="KID-nummer" verdi={formaterKID(neste.kid)} onKopier={() => kopier(neste.kid, 'kid')} kopiert={kopiert === 'kid'} />
                  <BetalRad label="Beløp" verdi={formatKr(neste.belop)} onKopier={() => kopier(String(neste.belop), 'belop')} kopiert={kopiert === 'belop'} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-5 border border-[#15803D]/20 bg-[#15803D]/5 flex items-center gap-3">
                <Check size={18} className="text-[#15803D]" />
                <span className="text-sm text-[#15803D]">Du har ingen utestående betalinger. Alt er betalt!</span>
              </div>
            )}

            {/* Hurtighandlinger */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setTab('meldinger')}
                className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] hover:border-[#DCDAD2] transition-all cursor-pointer text-left">
                <MessageSquare size={18} className="text-[#2563EB]" />
                <span className="text-sm font-medium text-[#1A1B1E]">Send melding</span>
                <span className="text-xs text-[#7A7D83]">Kontakt utleier</span>
              </button>
              <button onClick={() => { setTab('meldinger'); setTimeout(() => window.dispatchEvent(new CustomEvent('meld-vedlikehold')), 50); }}
                className="flex flex-col items-start gap-2 p-4 rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] hover:border-[#DCDAD2] transition-all cursor-pointer text-left">
                <Wrench size={18} className="text-[#B45309]" />
                <span className="text-sm font-medium text-[#1A1B1E]">Meld feil</span>
                <span className="text-xs text-[#7A7D83]">Vedlikeholdssak</span>
              </button>
            </div>

            {/* Leieforhold-info */}
            <div className="rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] p-5 space-y-3">
              <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Ditt leieforhold</div>
              <InfoLinje label="Månedlig leie" verdi={formatKr(kontrakt.maanedligLeie)} />
              <InfoLinje label="Leieperiode" verdi={kontrakt.sluttdato ? `${datoFmt(kontrakt.startdato)} – ${datoFmt(kontrakt.sluttdato)}` : `Fra ${datoFmt(kontrakt.startdato)} (løpende)`} />
              {kontrakt.depositum && kontrakt.sikkerhetsType !== 'ingen' && (
                <InfoLinje label="Depositum" verdi={formatKr(kontrakt.depositum)} />
              )}
              <InfoLinje label="Oppsigelsestid" verdi={`${kontrakt.oppsigelsestid || 3} måneder`} />
              {utleier && <InfoLinje label="Utleier" verdi={utleier.navn} />}
            </div>
          </div>
        )}

        {/* ══ BETALINGER ════════════════════════════════════════════════ */}
        {tab === 'betalinger' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] p-4">
                <div className="text-xs text-[#7A7D83]">Betalt totalt</div>
                <div className="text-lg font-semibold text-[#1A1B1E] num mt-0.5">{formatKr(totalt - ubetalt)}</div>
              </div>
              <div className="rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] p-4">
                <div className="text-xs text-[#7A7D83]">Utestående</div>
                <div className={`text-lg font-semibold num mt-0.5 ${ubetalt > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>{formatKr(ubetalt)}</div>
              </div>
            </div>

            <div className="rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] overflow-hidden">
              <div className="px-5 py-3 border-b border-[#E9E8E2] text-sm font-semibold text-[#1A1B1E]">Betalingshistorikk</div>
              {fakturaer.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#AEB0B4] italic">Ingen fakturaer ennå</div>
              ) : (
                <div className="divide-y divide-[#E9E8E2]">
                  {fakturaer.map((f) => {
                    const forfalt = f.status !== 'betalt' && new Date(f.forfall) < new Date();
                    const farge = f.status === 'betalt' ? '#15803D' : forfalt ? '#DC2626' : '#B45309';
                    const label = f.status === 'betalt' ? 'Betalt' : forfalt ? 'Forfalt' : 'Ubetalt';
                    return (
                      <div key={f.id} className="px-5 py-3 flex items-center justify-between">
                        <div className="min-w-0">
                          <div className="text-sm text-[#1A1B1E]">{f.beskrivelse}</div>
                          <div className="text-xs text-[#7A7D83]">Forfall {datoFmt(f.forfall)}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-medium text-[#1A1B1E] num">{formatKr(f.belop)}</div>
                          <div className="text-xs font-medium" style={{ color: farge }}>{label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ MELDINGER ═════════════════════════════════════════════════ */}
        {tab === 'meldinger' && (
          <LeietakerChat
            kontrakt={kontrakt}
            meldinger={meldinger.filter((m) => m.kontraktId === kontrakt.id)}
            sendMelding={sendMelding}
          />
        )}

        {/* ══ DOKUMENTER ════════════════════════════════════════════════ */}
        {tab === 'dokumenter' && (
          <div className="space-y-3">
            <DokumentRad
              ikon={FileText}
              tittel="Leiekontrakt"
              sub={`Signert ${kontrakt.opprettet ? datoFmt(kontrakt.opprettet) : '—'}`}
              onClick={() => genererKontraktPDF({ kontrakt, leieobjekt: obj, bygg: b, utleier })}
            />
            {mineProtokoller.map((p) => (
              <DokumentRad
                key={p.id}
                ikon={ClipboardList}
                tittel={p.type === 'innflytting' ? 'Innflyttingsprotokoll' : 'Utflyttingsprotokoll'}
                sub={datoLang(p.dato)}
                onClick={() => genererProtokollPDF({ protokoll: p, kontrakt, leieobjekt: obj, bygg: b, utleier })}
              />
            ))}
            {mineProtokoller.length === 0 && (
              <p className="text-xs text-[#7A7D83] px-1">Ingen protokoller er delt ennå.</p>
            )}
          </div>
        )}
      </div>

      {/* Bunn-navigasjon (mobil-stil) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#F6F6F4]/95 backdrop-blur-sm border-t border-[#E9E8E2] z-20">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map(({ id, label, ikon: Ikon }) => {
            const aktiv = tab === id;
            const uleste = id === 'meldinger'
              ? meldinger.filter((m) => m.kontraktId === kontrakt.id && !m.lest && m.avsender === 'utleier').length
              : 0;
            return (
              <button key={id} onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-3 transition-colors cursor-pointer relative
                  ${aktiv ? 'text-[#1A1B1E]' : 'text-[#7A7D83] hover:text-[#4B4E54]'}`}>
                <div className="relative">
                  <Ikon size={18} />
                  {uleste > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-[#2563EB] text-[#F6F6F4] text-[10px] font-bold flex items-center justify-center">
                      {uleste}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ─── Underkomponenter ──────────────────────────────────────────────────────────
function BetalRad({ label, verdi, onKopier, kopiert }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#65696F]">{label}</span>
      <button onClick={onKopier} className="flex items-center gap-2 text-sm text-[#1A1B1E] hover:text-[#9A7A24] transition-colors cursor-pointer group">
        <span className="num">{verdi}</span>
        {kopiert ? <Check size={12} className="text-[#15803D]" /> : <Copy size={12} className="text-[#7A7D83] group-hover:text-[#9A7A24]" />}
      </button>
    </div>
  );
}

function InfoLinje({ label, verdi }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#65696F]">{label}</span>
      <span className="text-[#1A1B1E] num">{verdi}</span>
    </div>
  );
}

function DokumentRad({ ikon: Ikon, tittel, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3 p-4 rounded-xl bg-[#FFFFFF] border border-[#E9E8E2] hover:border-[#DCDAD2] transition-all cursor-pointer text-left">
      <div className="w-9 h-9 rounded-lg bg-[#E9E8E2] flex items-center justify-center shrink-0">
        <Ikon size={16} className="text-[#65696F]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1A1B1E]">{tittel}</div>
        <div className="text-xs text-[#7A7D83]">{sub}</div>
      </div>
      <Download size={15} className="text-[#7A7D83] shrink-0" />
    </button>
  );
}

// ─── Chat ──────────────────────────────────────────────────────────────────────
function LeietakerChat({ kontrakt, meldinger, sendMelding }) {
  const [tekst, setTekst] = useState('');
  const [erVedlikehold, setErVedlikehold] = useState(false);
  const bunn = useRef(null);

  const sortert = [...meldinger].sort((a, b) => new Date(a.opprettet) - new Date(b.opprettet));

  useEffect(() => { bunn.current?.scrollIntoView({ behavior: 'smooth' }); }, [sortert.length]);
  useEffect(() => {
    const h = () => setErVedlikehold(true);
    window.addEventListener('meld-vedlikehold', h);
    return () => window.removeEventListener('meld-vedlikehold', h);
  }, []);

  function send(e) {
    e?.preventDefault();
    if (!tekst.trim()) return;
    sendMelding({
      kontraktId: kontrakt.id,
      avsender: 'leietaker',
      avsenderNavn: kontrakt.leietakerNavn || 'Leietaker',
      tekst: tekst.trim(),
      type: erVedlikehold ? 'vedlikehold' : 'melding',
      vedlikeholdStatus: erVedlikehold ? 'apent' : null,
    });
    setTekst('');
    setErVedlikehold(false);
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 13rem)' }}>
      <div className="flex-1 overflow-y-auto min-h-0">
        {sortert.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <MessageSquare size={28} className="text-[#AEB0B4] mb-3" />
            <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen meldinger ennå</div>
            <div className="text-xs text-[#7A7D83]">Send en melding til din utleier, eller meld inn en feil.</div>
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {sortert.map((m) => {
              const egen = m.avsender === 'leietaker';
              const erVedl = m.type === 'vedlikehold';
              return (
                <div key={m.id} className={`flex ${egen ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed
                      ${egen ? 'bg-[#16284A] text-white rounded-br-sm'
                        : erVedl ? 'bg-[#B45309]/10 border border-[#B45309]/25 text-[#1A1B1E] rounded-bl-sm'
                          : 'bg-[#E9E8E2] text-[#1A1B1E] rounded-bl-sm'}`}>
                      {erVedl && (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-[#B45309]/20">
                          <Wrench size={11} className="text-[#B45309]" />
                          <span className="text-xs font-semibold text-[#B45309]">Vedlikeholdssak</span>
                          {m.vedlikeholdStatus && (
                            <span className="text-xs text-[#65696F] ml-auto">
                              {m.vedlikeholdStatus === 'apent' ? 'Åpen' : m.vedlikeholdStatus === 'under_behandling' ? 'Under behandling' : 'Løst'}
                            </span>
                          )}
                        </div>
                      )}
                      {m.tekst}
                    </div>
                    <div className={`text-xs text-[#AEB0B4] mt-1 ${egen ? 'text-right' : 'text-left'}`}>
                      {!egen && `${m.avsenderNavn} · `}{relativTid(m.opprettet)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bunn} />
          </div>
        )}
      </div>

      <div className="shrink-0 pt-3 border-t border-[#E9E8E2]">
        <button type="button" onClick={() => setErVedlikehold((v) => !v)}
          className="flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg text-xs border transition-all cursor-pointer"
          style={{
            background: erVedlikehold ? 'rgba(245,158,11,0.1)' : 'transparent',
            color: erVedlikehold ? '#B45309' : '#7A7D83',
            borderColor: erVedlikehold ? 'rgba(245,158,11,0.3)' : '#DCDAD2',
          }}>
          <Wrench size={11} /> {erVedlikehold ? 'Vedlikeholdssak' : 'Marker som vedlikeholdssak'}
        </button>
        <form onSubmit={send} className="flex gap-2">
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Skriv en melding..."
            rows={2}
            className="flex-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] resize-none transition-colors"
          />
          <button type="submit" disabled={!tekst.trim()}
            className="w-10 h-10 self-end rounded-xl bg-[#16284A] text-white flex items-center justify-center hover:bg-[#1E3A5F] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
