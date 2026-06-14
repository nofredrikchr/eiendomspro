import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft, FileText, ClipboardList, MessageSquare,
  Phone, Mail, Home, TrendingUp, Shield,
  Plus, Pencil, Trash2, Check, X, Download,
  StickyNote, Receipt, ChevronRight, Share2, Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { KpiReguleringModal } from '../../components/KpiReguleringModal';
import { Photo, Avatar, Pill, IconTile, SectionCard, DataRow } from '../../components/ui/kit';
import { formatKr } from '../../utils/format';
import { genererKontraktPDF } from '../../utils/kontraktPDF';
import { leietakerLenke } from '../../utils/leietakerToken';
import { alleFakturaerForKontrakt, fakturaSummer } from '../../utils/faktura';
import { nesteReguleringTekst, kanReguleresNaa, beregnNyLeie } from '../../utils/kpi';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function datoFmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function datoLang(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
}
function dagerTil(dato) {
  return Math.round((new Date(dato) - new Date()) / 86400000);
}
function kontraktStatus(k) {
  if (k.kontraktstype === 'tidsubestemt' || !k.sluttdato) return { label: 'Aktiv', tone: 'mint' };
  const d = dagerTil(k.sluttdato);
  if (d < 0) return { label: 'Utløpt', tone: 'amber' };
  if (d < 90) return { label: `${d}d igjen`, tone: 'amber' };
  return { label: 'Aktiv', tone: 'mint' };
}

const UTLEGG_KATEGORIER = [
  'Strøm', 'Vann og avløp', 'Internett', 'Parkering', 'Rengjøring',
  'Reparasjon / utbedring', 'Vaktmester', 'Forsikring', 'Andre utlegg',
];

// ─── Utlegg-modal ─────────────────────────────────────────────────────────────
function UtleggModal({ kontraktId, onLagre, onLukk }) {
  // Lazy initialisering: forfallsdato (i dag + 14 dager) beregnes kun ved montering,
  // ikke ved hver render (unngår urent Date.now()-kall i render-fasen).
  const [form, setForm] = useState(() => ({
    kontraktId,
    utleggstype: 'leietaker_betaler',
    kategori: '',
    beskrivelse: '',
    belop: '',
    faktureringsmetode: 'neste_faktura',
    status: 'ubetalt',
    forfallsdato: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
  }));
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onLukk}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-surface border border-line rounded-[20px] p-6 w-full max-w-md shadow-soft space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold tracking-[-0.01em] text-ink">Nytt utlegg</h3>
          <button type="button" onClick={onLukk} className="text-muted-2 hover:text-ink cursor-pointer"><X size={16} /></button>
        </div>

        {/* Utleggstype */}
        <div>
          <div className="text-xs font-semibold text-muted mb-2">Utleggstype</div>
          <div className="space-y-2">
            {[
              ['leietaker_betaler', 'Leietaker skal faktureres for utleiers utlegg'],
              ['utleier_refunderer', 'Utleier skal refundere leietakers utlegg'],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, utleggstype: v }))}
                className="flex items-center gap-2.5 w-full text-left cursor-pointer">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${form.utleggstype === v ? 'border-brand' : 'border-line-input'}`}>
                  {form.utleggstype === v && <div className="w-2 h-2 rounded-full bg-brand" />}
                </div>
                <span className="text-sm text-ink">{l}</span>
              </button>
            ))}
          </div>
        </div>

        <Select label="Kategori" value={form.kategori} onChange={set('kategori')}
          options={UTLEGG_KATEGORIER.map((k) => ({ value: k, label: k }))}
          placeholder="Velg kategori..." />

        <div>
          <Input label="Beskrivelse" value={form.beskrivelse} onChange={set('beskrivelse')}
            placeholder="Beskrivelse vises på faktura" />
          <p className="text-xs text-muted-2 mt-1">Beskrivelse vises på faktura</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Beløp (kr)" type="number" value={form.belop} onChange={set('belop')} placeholder="0" />
          <Input label="Forfallsdato" type="date" value={form.forfallsdato} onChange={set('forfallsdato')} />
        </div>

        {/* Faktureringsmetode */}
        <div>
          <div className="text-xs font-semibold text-muted mb-2">Hvordan skal utlegget faktureres?</div>
          <div className="space-y-2">
            {[
              ['neste_faktura', 'Inkluder på neste leie-faktura'],
              ['egen_faktura', 'Fakturer på egen utleggsfaktura'],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, faktureringsmetode: v }))}
                className="flex items-center gap-2.5 w-full text-left cursor-pointer">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${form.faktureringsmetode === v ? 'border-brand' : 'border-line-input'}`}>
                  {form.faktureringsmetode === v && <div className="w-2 h-2 rounded-full bg-brand" />}
                </div>
                <span className="text-sm text-ink">{l}</span>
              </button>
            ))}
          </div>
          {form.faktureringsmetode === 'neste_faktura' && (
            <p className="text-xs text-muted-2 mt-2">
              Utlegget vil bli inkludert på <strong className="text-ink">neste leie-faktura</strong>, og bokført i regnskapet.
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onLukk}>Avbryt</Button>
          <Button variant="primary" className="flex-1 justify-center"
            onClick={() => { if (form.beskrivelse && form.belop) { onLagre(form); onLukk(); } }}>
            Lagre utlegg
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Hoved ───────────────────────────────────────────────────────────────────
export default function LeieforholdDetalj() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    kontrakter, leieobjekter, bygg, utleiere,
    protokoller = [], meldinger = [],
    notater, addNotat, deleteNotat,
    utlegg, addUtlegg, updateUtlegg,
    deleteKontrakt, updateKontrakt, sendMelding,
  } = useApp();

  const [aktivTab, setAktivTab] = useState('oversikt');
  const [visUtleggModal, setVisUtleggModal] = useState(false);
  const [nyttNotat, setNyttNotat] = useState('');
  const [slettKontraktVis, setSlettKontraktVis] = useState(false);
  const [visKpiModal, setVisKpiModal] = useState(false);
  const [kopiert, setKopiert] = useState('');

  function kopier(tekst, merke) {
    navigator.clipboard.writeText(tekst).then(() => {
      setKopiert(merke);
      setTimeout(() => setKopiert(''), 2000);
    });
  }

  const kontrakt = kontrakter.find((k) => k.id === id);
  const obj = kontrakt ? leieobjekter.find((l) => l.id === kontrakt.leieobjektId) : null;
  const b = obj ? bygg.find((b) => b.id === obj.byggId) : null;
  const utleier = kontrakt ? utleiere.find((u) => u.id === kontrakt.utleierNavn) : null;

  if (!kontrakt) {
    return (
      <div className="text-center py-20">
        <div className="text-sm text-muted">Kontrakt ikke funnet</div>
        <button onClick={() => navigate('/kontrakter')} className="text-xs font-semibold text-brand-ink hover:underline mt-2 cursor-pointer">
          Tilbake til kontrakter
        </button>
      </div>
    );
  }

  const status = kontraktStatus(kontrakt);
  const innProtokoll = protokoller.find((p) => p.kontraktId === id && p.type === 'innflytting');
  const utProtokoll = protokoller.find((p) => p.kontraktId === id && p.type === 'utflytting');
  const mineNotater = notater.filter((n) => n.kontraktId === id).sort((a, b) => new Date(b.opprettet) - new Date(a.opprettet));
  const mineUtlegg = utlegg.filter((u) => u.kontraktId === id);
  const ulesteMeldinger = meldinger.filter((m) => m.kontraktId === id && !m.lest && m.avsender === 'leietaker').length;

  // Felles faktura-util (samme tall som leietakerportalen)
  const alleFakturaer = alleFakturaerForKontrakt(kontrakt, utlegg);
  const { totalt: totalFakturert, ubetalt: totalUbetalt } = fakturaSummer(alleFakturaer);

  function lagreUtlegg(data) {
    addUtlegg({ ...data, kontraktId: id });
  }

  function utforKpiRegulering(nyLeie) {
    const gammel = Number(kontrakt.maanedligLeie) || 0;
    updateKontrakt(id, {
      maanedligLeie: String(nyLeie),
      sisteRegulering: new Date().toISOString().slice(0, 10),
    });
    // Logg som systemmelding i leieforholdets tråd
    sendMelding({
      kontraktId: id,
      avsender: 'utleier',
      avsenderNavn: utleier?.navn || 'Utleier',
      type: 'system',
      tekst: `Leien er KPI-regulert fra ${formatKr(gammel)} til ${formatKr(nyLeie)} per måned.`,
    });
    setVisKpiModal(false);
  }

  function leggTilNotat() {
    if (!nyttNotat.trim()) return;
    addNotat({ kontraktId: id, tekst: nyttNotat.trim() });
    setNyttNotat('');
  }

  function markerBetalt(faktura) {
    if (faktura.type === 'utlegg') {
      updateUtlegg(faktura.id, { status: faktura.status === 'betalt' ? 'ubetalt' : 'betalt' });
    }
    // Husleie-fakturaer er ikke redigerbare (de er auto-genererte)
  }

  const tabs = [
    { id: 'oversikt', label: 'Oversikt', ikon: Home },
    { id: 'leiekontrakt', label: 'Leiekontrakt', ikon: FileText },
    { id: 'innflytting', label: 'Innflytting', ikon: ClipboardList, ferdig: !!innProtokoll },
    { id: 'utflytting', label: 'Utflytting', ikon: ClipboardList, ferdig: !!utProtokoll },
  ];

  const adresse = b ? `${b.gatenavn} ${b.gatenummer}, ${b.postnummer} ${b.poststed}` : '—';
  const kontraktstypeLabel = (kontrakt.kontraktstype === 'tidsubestemt' || !kontrakt.sluttdato)
    ? 'Tidsubestemt' : 'Tidsbestemt';
  const metaDeler = [
    b ? `${b.gatenavn} ${b.gatenummer}` : null,
    obj?.betegnelse || null,
    obj?.type || null,
    kontrakt.startdato ? `Leietaker siden ${datoLang(kontrakt.startdato)}` : null,
  ].filter(Boolean);

  // KPI-callout (kun for KPI-regulerte kontrakter)
  const kanKpi = kontrakt.indeksregulering && kontrakt.startdato && kanReguleresNaa(kontrakt);
  const nyKpiLeie = kanKpi ? beregnNyLeie(kontrakt.maanedligLeie, 3.1) : null;

  return (
    <div className="animate-fade-up">
      {visUtleggModal && (
        <UtleggModal kontraktId={id} onLagre={lagreUtlegg} onLukk={() => setVisUtleggModal(false)} />
      )}
      {visKpiModal && (
        <KpiReguleringModal kontrakt={kontrakt} utleier={utleier} adresse={b ? adresse : ''} onLagre={utforKpiRegulering} onLukk={() => setVisKpiModal(false)} />
      )}
      <BekreftModal
        åpen={slettKontraktVis}
        tittel="Slette leiekontrakt?"
        tekst={`Kontrakten med ${kontrakt.leietakerNavn} vil bli permanent slettet.`}
        bekreftLabel="Slett kontrakt"
        onBekreft={() => { deleteKontrakt(id); navigate('/kontrakter'); }}
        onAvbryt={() => setSlettKontraktVis(false)}
      />

      {/* Tilbake-lenke */}
      <button type="button" onClick={() => navigate('/kontrakter')}
        className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-muted hover:text-brand-ink mb-[18px] cursor-pointer transition-colors">
        <ChevronLeft size={15} /> Alle leiekontrakter
      </button>

      {/* Header-kort */}
      <div className="bg-surface border border-line rounded-[22px] p-[22px] flex items-center gap-[18px] flex-wrap mb-5">
        <Photo src={obj?.bilde} alt={kontrakt.leietakerNavn}
          className="w-24 h-[84px] rounded-[15px] shrink-0"
          icon={<Building2 size={24} strokeWidth={1.6} />} />
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <h1 className="m-0 text-[clamp(20px,2.6vw,26px)] font-extrabold tracking-[-0.02em] text-ink">{kontrakt.leietakerNavn}</h1>
            <Pill tone={status.tone}>{status.label}</Pill>
            <Pill tone="neutral">{kontraktstypeLabel}</Pill>
          </div>
          <div className="text-sm font-semibold text-muted-2">{metaDeler.join(' · ') || '—'}</div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Button variant="secondary" onClick={() => navigate(`/meldinger/${id}`)}>
            <MessageSquare size={15} /> Send melding
            {ulesteMeldinger > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand text-white text-[10px] font-extrabold flex items-center justify-center num">
                {ulesteMeldinger}
              </span>
            )}
          </Button>
          <Button variant="secondary" onClick={() => kopier(leietakerLenke(id), 'portal')}>
            {kopiert === 'portal'
              ? <><Check size={15} className="text-brand" /> Lenke kopiert</>
              : <><Share2 size={15} /> Del portal</>}
          </Button>
          <Button variant="primary" onClick={() => genererKontraktPDF({ kontrakt, leieobjekt: obj, bygg: b, utleier })}>
            <Download size={15} /> Last ned kontrakt
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-line overflow-x-auto">
        {tabs.map(({ id: tabId, label, ikon: Ikon, ferdig }) => (
          <button key={tabId} type="button" onClick={() => {
            if (tabId === 'innflytting') {
              innProtokoll ? navigate(`/protokoll/${innProtokoll.id}`) : navigate(`/protokoll/ny?kontraktId=${id}&type=innflytting`);
            } else if (tabId === 'utflytting') {
              utProtokoll ? navigate(`/protokoll/${utProtokoll.id}`) : navigate(`/protokoll/ny?kontraktId=${id}&type=utflytting`);
            } else {
              setAktivTab(tabId);
            }
          }}
            className={`flex items-center gap-2 px-4 py-3 text-[13.5px] font-bold border-b-2 -mb-px transition-all whitespace-nowrap cursor-pointer
              ${aktivTab === tabId
                ? 'border-brand text-ink'
                : 'border-transparent text-muted-2 hover:text-ink-2'
              }`}
          >
            <Ikon size={14} />
            {label}
            {ferdig && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
          </button>
        ))}
      </div>

      {/* ══ OVERSIKT-TAB ══════════════════════════════════════════════════════ */}
      {aktivTab === 'oversikt' && (
        <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))' }}>

          {/* ── Venstre kolonne ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-[18px]">

            {/* Betalinger */}
            <SectionCard
              tittel={
                <span className="flex items-center gap-2.5">
                  Betalinger
                  {totalUbetalt === 0
                    ? <Pill tone="mint">Alt betalt</Pill>
                    : <Pill tone="amber">{formatKr(totalUbetalt)} utestående</Pill>}
                </span>
              }
              action={
                <Button variant="secondary" size="sm" onClick={() => setVisUtleggModal(true)}>
                  <Plus size={13} /> Nytt utlegg
                </Button>
              }
            >
              {/* Totaloversikt */}
              <div className="flex gap-3 mb-3">
                <div className="flex-1 rounded-[13px] border border-line-soft bg-surface-2 px-4 py-3">
                  <div className="text-[12px] font-semibold text-muted-2">Fakturert totalt</div>
                  <div className="text-base font-extrabold text-ink num mt-0.5">{formatKr(totalFakturert)}</div>
                </div>
                <div className="flex-1 rounded-[13px] border border-line-soft bg-surface-2 px-4 py-3">
                  <div className="text-[12px] font-semibold text-muted-2">Ubetalt</div>
                  <div className={`text-base font-extrabold num mt-0.5 ${totalUbetalt > 0 ? 'text-amber' : 'text-brand-ink'}`}>
                    {formatKr(totalUbetalt)}
                  </div>
                </div>
              </div>

              {alleFakturaer.length === 0 ? (
                <p className="text-sm text-muted-2 italic py-2">Ingen fakturaer ennå</p>
              ) : (
                <div className="flex flex-col">
                  {alleFakturaer.map((f, i) => {
                    const forfalt = f.status === 'ubetalt' && new Date(f.forfall) < new Date();
                    const betalt = f.status === 'betalt';
                    return (
                      <div key={f.id}
                        className={`flex items-center gap-3 py-3 ${i === alleFakturaer.length - 1 ? '' : 'border-b border-line-soft'}`}>
                        <IconTile tone={betalt ? 'mint' : forfalt ? 'amber' : 'sand'} size={34}>
                          {betalt ? <Check size={15} strokeWidth={2.4} /> : <Receipt size={15} />}
                        </IconTile>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13.5px] font-bold text-ink truncate">{f.beskrivelse}</div>
                          <div className="text-[12px] font-semibold text-muted-2 mt-0.5">
                            {betalt ? 'Betalt' : forfalt ? 'Forfalt' : 'Forfaller'} {datoFmt(f.forfall)}
                            {f.kategori ? ` · ${f.kategori}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          {f.type === 'utlegg' && (
                            <button type="button" onClick={() => markerBetalt(f)}
                              className="text-[11.5px] font-bold text-muted-2 hover:text-brand-ink border border-line hover:border-mint-line px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap">
                              {betalt ? 'Marker ubetalt' : 'Marker betalt'}
                            </button>
                          )}
                          <span className="text-[13.5px] font-extrabold text-ink num">{formatKr(f.belop)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {mineUtlegg.length > 0 && (
                <p className="text-xs text-muted-2 mt-3 pt-3 border-t border-line-soft">
                  Husleie-fakturaer er auto-genererte fra kontrakten. Utlegg kan markeres betalt manuelt.
                  Banktilkobling (Vipps/eFaktura) aktiveres under Integrasjoner.
                </p>
              )}
            </SectionCard>

            {/* Dokumenter */}
            <SectionCard tittel="Dokumenter">
              <div className="flex flex-col gap-2.5">
                <button type="button"
                  onClick={() => genererKontraktPDF({ kontrakt, leieobjekt: obj, bygg: b, utleier })}
                  className="flex items-center gap-3.5 px-3.5 py-3 rounded-[13px] border border-line-soft bg-surface-2 hover:border-mint-line transition-all cursor-pointer text-left">
                  <IconTile tone="mint" size={36}><FileText size={16} /></IconTile>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-bold text-ink">Leiekontrakt.pdf</div>
                    <div className="text-[12px] font-semibold text-muted-2">
                      {kontrakt.startdato ? `Gjelder fra ${datoLang(kontrakt.startdato)}` : 'Leiekontrakt'}
                    </div>
                  </div>
                  <Download size={16} className="text-muted-2 shrink-0" />
                </button>

                {innProtokoll && (
                  <button type="button" onClick={() => navigate(`/protokoll/${innProtokoll.id}`)}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-[13px] border border-line-soft bg-surface-2 hover:border-mint-line transition-all cursor-pointer text-left">
                    <IconTile tone="mint" size={36}><ClipboardList size={16} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-ink">Innflyttingsprotokoll</div>
                      <div className="text-[12px] font-semibold text-muted-2">Registrert {datoLang(innProtokoll.opprettet || kontrakt.startdato)}</div>
                    </div>
                    <ChevronRight size={16} className="text-muted-2 shrink-0" />
                  </button>
                )}

                {utProtokoll && (
                  <button type="button" onClick={() => navigate(`/protokoll/${utProtokoll.id}`)}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-[13px] border border-line-soft bg-surface-2 hover:border-mint-line transition-all cursor-pointer text-left">
                    <IconTile tone="mint" size={36}><ClipboardList size={16} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-ink">Utflyttingsprotokoll</div>
                      <div className="text-[12px] font-semibold text-muted-2">Registrert {datoLang(utProtokoll.opprettet)}</div>
                    </div>
                    <ChevronRight size={16} className="text-muted-2 shrink-0" />
                  </button>
                )}

                {!innProtokoll && (
                  <button type="button" onClick={() => navigate(`/protokoll/ny?kontraktId=${id}&type=innflytting`)}
                    className="flex items-center gap-3.5 px-3.5 py-3 rounded-[13px] border border-dashed border-line-input hover:border-brand transition-all cursor-pointer text-left">
                    <IconTile tone="sand" size={36}><Plus size={16} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-bold text-ink-2">Lag innflyttingsprotokoll</div>
                      <div className="text-[12px] font-semibold text-muted-2">Dokumenter boligens tilstand ved innflytting</div>
                    </div>
                    <ChevronRight size={16} className="text-muted-2 shrink-0" />
                  </button>
                )}
              </div>
            </SectionCard>

            {/* Notater */}
            <SectionCard tittel={<span className="flex items-center gap-2"><StickyNote size={15} className="text-muted-2" /> Notater</span>}>
              <div className="flex gap-2 mb-3">
                <textarea
                  value={nyttNotat}
                  onChange={(e) => setNyttNotat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) leggTilNotat(); }}
                  placeholder="Legg til notat om denne leietakeren… (⌘+Enter for å lagre)"
                  rows={2}
                  className="flex-1 bg-surface-2 border border-line-input rounded-xl px-4 py-2.5 text-sm text-ink placeholder-faint outline-none focus:border-brand resize-none transition-colors"
                />
                <button type="button" onClick={leggTilNotat} disabled={!nyttNotat.trim()}
                  className="px-3 py-2 rounded-xl bg-mint text-brand-ink hover:bg-mint-line disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer self-end">
                  <Plus size={15} />
                </button>
              </div>

              {mineNotater.length === 0 ? (
                <p className="text-sm text-muted-2 italic">Du har ikke opprettet notater på denne leietakeren</p>
              ) : (
                <div className="space-y-2">
                  {mineNotater.map((n) => (
                    <div key={n.id} className="group flex items-start gap-3 bg-surface-2 border border-line-soft rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ink whitespace-pre-wrap">{n.tekst}</p>
                        <p className="text-xs text-muted-2 mt-1">{datoLang(n.opprettet)}</p>
                      </div>
                      <button type="button" onClick={() => deleteNotat(n.id)} aria-label="Slett notat"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-muted-2 hover:text-danger transition-all cursor-pointer shrink-0 p-0.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Høyre kolonne ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-[18px]">

            {/* Leiedetaljer */}
            <SectionCard tittel="Leiedetaljer">
              <div className="flex flex-col">
                {kontrakt.maanedligLeie && (
                  <DataRow label="Månedsleie" value={formatKr(kontrakt.maanedligLeie)} />
                )}
                {kontrakt.depositum && kontrakt.sikkerhetsType !== 'ingen' && (
                  <DataRow label="Depositum" value={formatKr(kontrakt.depositum)} />
                )}
                {kontrakt.startdato && (
                  <DataRow label="Innflytting" value={datoLang(kontrakt.startdato)} />
                )}
                <DataRow label="Kontraktstype" value={kontraktstypeLabel} />
                {kontrakt.sluttdato && (
                  <DataRow label="Utløper" value={datoLang(kontrakt.sluttdato)} />
                )}
                {kontrakt.oppsigelsestid && (
                  <DataRow label="Oppsigelsestid" value={`${kontrakt.oppsigelsestid} måneder`} />
                )}
                {b && <DataRow label="Adresse" value={adresse} valueClass="text-right" />}
                {(kontrakt.sisteRegulering || kontrakt.startdato) && (
                  <DataRow label="Sist KPI-regulert" value={datoLang(kontrakt.sisteRegulering || kontrakt.startdato)} last />
                )}
              </div>

              {/* KPI-callout */}
              {kontrakt.indeksregulering && kontrakt.startdato && (
                <div className="mt-3 border border-mint-line bg-mint-soft rounded-[14px] p-3.5">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={15} className="text-brand" />
                    <span className="text-[13px] font-extrabold text-brand-ink">
                      {kanKpi ? 'Kan KPI-justeres' : 'KPI-regulering'}
                    </span>
                  </div>
                  <div className="text-[12.5px] font-semibold text-muted mb-2.5">
                    {kanKpi && nyKpiLeie
                      ? `KPI +3,1 % → ny leie ${formatKr(nyKpiLeie)}`
                      : `Neste regulering ${nesteReguleringTekst(kontrakt) || 'ikke fastsatt'}`}
                  </div>
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setVisKpiModal(true)}>
                    Start regulering
                  </Button>
                </div>
              )}
            </SectionCard>

            {/* Kontakt */}
            <SectionCard tittel="Kontakt">
              <div className="flex items-center gap-3 mb-3.5">
                <Avatar navn={kontrakt.leietakerNavn || '?'} size={44} />
                <div>
                  <div className="text-sm font-extrabold text-ink">{kontrakt.leietakerNavn}</div>
                  <div className="text-[12.5px] font-semibold text-muted-2">
                    {kontrakt.startdato ? `Leietaker siden ${new Date(kontrakt.startdato).getFullYear()}` : 'Leietaker'}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {kontrakt.leietakerTlf && (
                  <a href={`tel:${kontrakt.leietakerTlf}`}
                    className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-2 hover:text-brand-ink transition-colors">
                    <Phone size={15} className="text-muted-2 shrink-0" /> {kontrakt.leietakerTlf}
                  </a>
                )}
                {kontrakt.leietakerEpost && (
                  <a href={`mailto:${kontrakt.leietakerEpost}`}
                    className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink-2 hover:text-brand-ink transition-colors truncate">
                    <Mail size={15} className="text-muted-2 shrink-0" /> {kontrakt.leietakerEpost}
                  </a>
                )}
                {!kontrakt.leietakerTlf && !kontrakt.leietakerEpost && (
                  <p className="text-[13px] font-medium text-muted-2 italic">Ingen kontaktinfo registrert</p>
                )}
              </div>
              {kontrakt.depositum && kontrakt.sikkerhetsType !== 'ingen' && (
                <div className="flex items-center gap-2.5 mt-3.5 pt-3.5 border-t border-line-soft text-[12.5px] font-semibold text-muted-2">
                  <Shield size={14} className="text-brand shrink-0" />
                  Depositum {formatKr(kontrakt.depositum)} sikret
                </div>
              )}
            </SectionCard>

            {/* Handlinger */}
            <SectionCard tittel="Administrer">
              <div className="flex flex-col gap-2.5">
                <Button variant="secondary" className="w-full justify-start" onClick={() => navigate(`/kontrakter/${id}/rediger`)}>
                  <Pencil size={15} /> Rediger kontrakt
                </Button>
                <Button variant="danger" className="w-full justify-start" onClick={() => setSlettKontraktVis(true)}>
                  <Trash2 size={15} /> Slett kontrakt
                </Button>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ══ LEIEKONTRAKT-TAB ═══════════════════════════════════════════════════ */}
      {aktivTab === 'leiekontrakt' && (
        <SectionCard className="text-center py-12">
          <FileText size={28} className="text-faint-2 mx-auto mb-3" />
          <div className="text-sm font-bold text-ink mb-1">Rediger kontraktsinnhold</div>
          <div className="text-xs font-medium text-muted-2 mb-4">Åpner redigeringsskjemaet for denne kontrakten</div>
          <Button variant="primary" onClick={() => navigate(`/kontrakter/${id}/rediger`)}>
            <Pencil size={15} /> Åpne kontraktseditor
          </Button>
        </SectionCard>
      )}
    </div>
  );
}
