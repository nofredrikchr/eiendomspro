import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Home, CreditCard, MessageSquare, FileText, Wrench,
  Calendar, Copy, Check, Download, Send, ClipboardList,
  MapPin, AlertCircle, ChevronRight, ShieldCheck, Phone, Mail,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Logo } from '../../components/Logo';
import { Photo, Pill, IconTile, Avatar } from '../../components/ui/kit';
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
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={24} className="text-danger" />
        </div>
        <h1 className="text-lg font-extrabold tracking-[-0.01em] text-ink mb-2">Ugyldig lenke</h1>
        <p className="text-sm font-medium text-muted leading-relaxed">
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
  const heroBilde = obj?.bilde || b?.bilde || null;
  const fornavn = kontrakt.leietakerNavn?.split(' ')[0] || 'leietaker';

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
    <div className="min-h-screen bg-canvas">
      {/* Topbar */}
      <header className="border-b border-line sticky top-0 bg-canvas/95 backdrop-blur-sm z-20">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <Logo variant="light" height={24} />
          <div className="text-xs font-semibold text-muted-2 hidden sm:block">Leietakerportal</div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6 pb-24">
        {/* Hero — velkommen hjem */}
        <div className="relative overflow-hidden rounded-[24px] min-h-[200px] flex items-end mb-6">
          <Photo src={heroBilde} alt={adresse} className="absolute inset-0 w-full h-full" icon={<Home size={32} strokeWidth={1.5} />} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,26,23,0.74) 0%, rgba(18,26,23,0.18) 55%, rgba(18,26,23,0) 100%)' }} />
          <div className="relative w-full p-[clamp(20px,4vw,28px)]">
            <h1 className="m-0 mb-1.5 text-[clamp(22px,4vw,30px)] font-extrabold tracking-[-0.025em] text-white">
              Velkommen hjem, {fornavn}
            </h1>
            <div className="flex items-center gap-1.5 text-[13.5px] font-semibold text-white/85">
              <MapPin size={14} className="shrink-0" />
              <span>{adresse}{obj?.betegnelse ? ` · ${obj.betegnelse}` : ''}</span>
            </div>
          </div>
        </div>

        {/* ══ HJEM ══════════════════════════════════════════════════════ */}
        {tab === 'hjem' && (
          <div className="space-y-4">
            {/* Neste betaling */}
            {neste ? (
              <div className="bg-surface border border-line rounded-[20px] p-6">
                <div className="flex items-center justify-between gap-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-brand" />
                    <h2 className="m-0 text-base font-extrabold tracking-[-0.01em] text-ink">Neste betaling</h2>
                  </div>
                  <Pill tone="amber">Forfaller {datoLang(neste.forfall)}</Pill>
                </div>
                <div className="text-[clamp(28px,5vw,36px)] font-extrabold tracking-[-0.03em] text-ink num">{formatKr(neste.belop)}</div>
                <div className="text-[13.5px] font-semibold text-muted-2 mb-4">{neste.beskrivelse}</div>

                {/* Betalingsinfo */}
                <div className="space-y-0 pt-1 border-t border-line-soft">
                  {kontonr && (
                    <BetalRad label="Kontonummer" verdi={kontonr} onKopier={() => kopier(kontonr.replace(/\D/g, ''), 'konto')} kopiert={kopiert === 'konto'} />
                  )}
                  <BetalRad label="KID-nummer" verdi={formaterKID(neste.kid)} onKopier={() => kopier(neste.kid, 'kid')} kopiert={kopiert === 'kid'} />
                  <BetalRad label="Beløp" verdi={formatKr(neste.belop)} onKopier={() => kopier(String(neste.belop), 'belop')} kopiert={kopiert === 'belop'} last />
                </div>
              </div>
            ) : (
              <div className="rounded-[20px] p-5 border border-mint-line bg-mint-soft flex items-center gap-3">
                <IconTile tone="mint" size={36}><Check size={16} /></IconTile>
                <span className="text-[13.5px] font-semibold text-ink-2">Du har ingen utestående betalinger. Alt er betalt.</span>
              </div>
            )}

            {/* Hva trenger du? — hurtighandlinger */}
            <div className="bg-surface border border-line rounded-[20px] p-5">
              <h2 className="m-0 mb-3 text-base font-extrabold tracking-[-0.01em] text-ink">Hva trenger du?</h2>
              <div className="flex flex-col gap-2.5">
                <HandlingRad ikon={Wrench} tittel="Meld inn et problem" sub="Noe som lekker, knirker eller ikke virker"
                  onClick={() => { setTab('meldinger'); setTimeout(() => window.dispatchEvent(new CustomEvent('meld-vedlikehold')), 50); }} />
                <HandlingRad ikon={MessageSquare} tittel="Kontakt utleier" sub="Still et spørsmål eller gi beskjed"
                  onClick={() => setTab('meldinger')} />
                <HandlingRad ikon={FileText} tittel="Dokumentene dine" sub="Kontrakt, protokoll og kvitteringer"
                  onClick={() => setTab('dokumenter')} />
              </div>
            </div>

            {/* Leieforhold-info */}
            <div className="bg-surface border border-line rounded-[20px] p-5">
              <h2 className="m-0 mb-3 text-base font-extrabold tracking-[-0.01em] text-ink">Ditt leieforhold</h2>
              <div className="space-y-0">
                <InfoLinje label="Månedlig leie" verdi={formatKr(kontrakt.maanedligLeie)} />
                <InfoLinje label="Leieperiode" verdi={kontrakt.sluttdato ? `${datoFmt(kontrakt.startdato)} – ${datoFmt(kontrakt.sluttdato)}` : `Fra ${datoFmt(kontrakt.startdato)} (løpende)`} />
                {kontrakt.depositum && kontrakt.sikkerhetsType !== 'ingen' && (
                  <InfoLinje label="Depositum" verdi={formatKr(kontrakt.depositum)} />
                )}
                <InfoLinje label="Oppsigelsestid" verdi={`${kontrakt.oppsigelsestid || 3} måneder`} />
                {utleier && <InfoLinje label="Utleier" verdi={utleier.navn} last />}
              </div>
            </div>

            {/* Din utleier */}
            {utleier && (
              <div className="bg-surface border border-line rounded-[20px] p-5">
                <h2 className="m-0 mb-3 text-base font-extrabold tracking-[-0.01em] text-ink">Din utleier</h2>
                <div className="flex items-center gap-3 mb-3">
                  <Avatar navn={utleier.navn} size={44} />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-ink">{utleier.navn}</div>
                    {utleier.svartid && <div className="text-[12.5px] font-semibold text-muted-2">{utleier.svartid}</div>}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {utleier.telefon && <KontaktLinje ikon={Phone} verdi={utleier.telefon} />}
                  {utleier.epost && <KontaktLinje ikon={Mail} verdi={utleier.epost} />}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ BETALINGER ════════════════════════════════════════════════ */}
        {tab === 'betalinger' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface border border-line rounded-[18px] p-4">
                <div className="text-[12.5px] font-semibold text-muted-2">Betalt totalt</div>
                <div className="text-lg font-extrabold text-ink num mt-0.5">{formatKr(totalt - ubetalt)}</div>
              </div>
              <div className="bg-surface border border-line rounded-[18px] p-4">
                <div className="text-[12.5px] font-semibold text-muted-2">Utestående</div>
                <div className={`text-lg font-extrabold num mt-0.5 ${ubetalt > 0 ? 'text-danger' : 'text-brand-ink'}`}>{formatKr(ubetalt)}</div>
              </div>
            </div>

            <div className="bg-surface border border-line rounded-[20px] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line-soft text-base font-extrabold tracking-[-0.01em] text-ink">Betalingshistorikk</div>
              {fakturaer.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm font-medium text-faint italic">Ingen fakturaer ennå</div>
              ) : (
                <div>
                  {fakturaer.map((f, i) => {
                    const forfalt = f.status !== 'betalt' && new Date(f.forfall) < new Date();
                    const tone = f.status === 'betalt' ? 'mint' : forfalt ? 'amber' : 'muted';
                    const label = f.status === 'betalt' ? 'Betalt' : forfalt ? 'Forfalt' : 'Ubetalt';
                    return (
                      <div key={f.id} className={`px-5 py-3.5 flex items-center gap-3 ${i < fakturaer.length - 1 ? 'border-b border-line-soft' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-bold text-ink">{f.beskrivelse}</div>
                          <div className="text-xs font-semibold text-muted-2">Forfall {datoFmt(f.forfall)}</div>
                        </div>
                        <span className="text-[13.5px] font-extrabold text-ink num shrink-0">{formatKr(f.belop)}</span>
                        <Pill tone={tone}>{label}</Pill>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Depositum-notis */}
            {kontrakt.depositum && kontrakt.sikkerhetsType !== 'ingen' && (
              <div className="flex items-center gap-3 bg-sand border border-line rounded-[13px] px-4 py-3">
                <ShieldCheck size={16} className="text-brand shrink-0" />
                <span className="text-[12.5px] font-semibold text-muted">
                  Depositumet ditt på {formatKr(kontrakt.depositum)} står trygt på egen depositumskonto.
                </span>
              </div>
            )}
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
              <p className="text-xs font-semibold text-muted-2 px-1">Ingen protokoller er delt ennå.</p>
            )}
          </div>
        )}
      </div>

      {/* Bunn-navigasjon (mobil-stil) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-canvas/95 backdrop-blur-sm border-t border-line z-20">
        <div className="max-w-2xl mx-auto grid grid-cols-4">
          {tabs.map(({ id, label, ikon: Ikon }) => {
            const aktiv = tab === id;
            const uleste = id === 'meldinger'
              ? meldinger.filter((m) => m.kontraktId === kontrakt.id && !m.lest && m.avsender === 'utleier').length
              : 0;
            return (
              <button key={id} onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-1 py-3 transition-colors cursor-pointer relative
                  ${aktiv ? 'text-brand-ink' : 'text-muted-2 hover:text-ink-2'}`}>
                <div className="relative">
                  <Ikon size={18} />
                  {uleste > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-brand text-white text-[10px] font-extrabold flex items-center justify-center num">
                      {uleste}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ─── Underkomponenter ──────────────────────────────────────────────────────────
function BetalRad({ label, verdi, onKopier, kopiert, last = false }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b border-line-soft'}`}>
      <span className="text-[13px] font-semibold text-muted-2">{label}</span>
      <button onClick={onKopier} className="flex items-center gap-2 text-[13.5px] font-extrabold text-ink hover:text-brand-ink transition-colors cursor-pointer group">
        <span className="num">{verdi}</span>
        {kopiert ? <Check size={13} className="text-brand" /> : <Copy size={13} className="text-faint group-hover:text-brand-ink" />}
      </button>
    </div>
  );
}

function InfoLinje({ label, verdi, last = false }) {
  return (
    <div className={`flex items-center justify-between py-2.5 ${last ? '' : 'border-b border-line-soft'}`}>
      <span className="text-[13px] font-semibold text-muted-2">{label}</span>
      <span className="text-[13.5px] font-extrabold text-ink num">{verdi}</span>
    </div>
  );
}

function KontaktLinje({ ikon: Ikon, verdi }) {
  return (
    <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-2">
      <Ikon size={15} className="text-muted-2 shrink-0" />
      {verdi}
    </div>
  );
}

function HandlingRad({ ikon: Ikon, tittel, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-[13px] border border-line-soft bg-surface-2 hover:border-mint-line hover:translate-x-0.5 transition-all cursor-pointer text-left">
      <IconTile tone="mint" size={38} radius={12}><Ikon size={17} /></IconTile>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-ink">{tittel}</div>
        <div className="text-xs font-semibold text-muted-2 mt-0.5">{sub}</div>
      </div>
      <ChevronRight size={15} className="text-faint-2 shrink-0" />
    </button>
  );
}

function DokumentRad({ ikon: Ikon, tittel, sub, onClick }) {
  return (
    <button onClick={onClick}
      className="w-full flex items-center gap-3.5 p-4 rounded-[16px] bg-surface border border-line hover:border-mint-line hover:translate-x-0.5 transition-all cursor-pointer text-left">
      <IconTile tone="mint" size={38} radius={12}><Ikon size={17} /></IconTile>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-ink">{tittel}</div>
        <div className="text-xs font-semibold text-muted-2">{sub}</div>
      </div>
      <Download size={16} className="text-muted-2 shrink-0" />
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
            <IconTile tone="mint" size={48} radius={16} className="mb-3"><MessageSquare size={22} /></IconTile>
            <div className="text-sm font-extrabold text-ink mb-1">Ingen meldinger ennå</div>
            <div className="text-xs font-semibold text-muted-2">Send en melding til din utleier, eller meld inn en feil.</div>
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
                      ${egen ? 'bg-brand-deep text-white rounded-br-sm'
                        : erVedl ? 'bg-amber-soft border border-amber-line text-ink rounded-bl-sm'
                          : 'bg-surface border border-line text-ink rounded-bl-sm'}`}>
                      {erVedl && (
                        <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-amber-line">
                          <Wrench size={11} className="text-amber" />
                          <span className="text-xs font-extrabold text-amber">Vedlikeholdssak</span>
                          {m.vedlikeholdStatus && (
                            <span className="text-xs font-semibold text-muted-2 ml-auto">
                              {m.vedlikeholdStatus === 'apent' ? 'Åpen' : m.vedlikeholdStatus === 'under_behandling' ? 'Under behandling' : 'Løst'}
                            </span>
                          )}
                        </div>
                      )}
                      {m.tekst}
                    </div>
                    <div className={`text-xs font-semibold text-faint mt-1 ${egen ? 'text-right' : 'text-left'}`}>
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

      <div className="shrink-0 pt-3 border-t border-line">
        <button type="button" onClick={() => setErVedlikehold((v) => !v)}
          className={`inline-flex items-center gap-1.5 mb-2 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer
            ${erVedlikehold ? 'bg-amber-bg text-amber border-amber-line' : 'bg-transparent text-muted-2 border-line-input hover:text-ink-2'}`}>
          <Wrench size={11} /> {erVedlikehold ? 'Vedlikeholdssak' : 'Marker som vedlikeholdssak'}
        </button>
        <form onSubmit={send} className="flex gap-2">
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Skriv en melding…"
            rows={2}
            className="flex-1 bg-surface border border-line-input rounded-xl px-4 py-3 text-sm text-ink placeholder-faint outline-none focus:border-brand resize-none transition-colors"
          />
          <button type="submit" disabled={!tekst.trim()}
            className="w-10 h-10 self-end rounded-xl bg-brand text-white shadow-brand flex items-center justify-center hover:bg-brand-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0">
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
