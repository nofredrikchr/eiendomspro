import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, FileText, ClipboardList, MessageSquare,
  Phone, Mail, Home, Hash, Calendar, TrendingUp, Shield,
  Plus, Pencil, Trash2, Check, X, Download,
  StickyNote, Receipt,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Card';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { KpiReguleringModal } from '../../components/KpiReguleringModal';
import { formatKr } from '../../utils/format';
import { genererKontraktPDF } from '../../utils/kontraktPDF';
import { leietakerLenke } from '../../utils/leietakerToken';
import { alleFakturaerForKontrakt, fakturaSummer } from '../../utils/faktura';
import { nesteReguleringTekst } from '../../utils/kpi';

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
  if (k.kontraktstype === 'tidsubestemt' || !k.sluttdato) return { label: 'Aktiv', color: 'green' };
  const d = dagerTil(k.sluttdato);
  if (d < 0) return { label: 'Utløpt', color: 'red' };
  if (d < 30) return { label: `${d}d igjen`, color: 'red' };
  if (d < 90) return { label: `${d}d igjen`, color: 'yellow' };
  return { label: 'Aktiv', color: 'green' };
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-[#FFFFFF] border border-[#DCDAD2] rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-[#1A1B1E]">Nytt utlegg</h3>
          <button type="button" onClick={onLukk} className="text-[#7A7D83] hover:text-[#1A1B1E] cursor-pointer"><X size={16} /></button>
        </div>

        {/* Utleggstype */}
        <div>
          <div className="text-xs font-medium text-[#65696F] mb-2">Utleggstype</div>
          <div className="space-y-2">
            {[
              ['leietaker_betaler', 'Leietaker skal faktureres for utleiers utlegg'],
              ['utleier_refunderer', 'Utleier skal refundere leietakers utlegg'],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, utleggstype: v }))}
                className="flex items-center gap-2.5 w-full text-left cursor-pointer">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${form.utleggstype === v ? 'border-white' : 'border-[#AEB0B4]'}`}>
                  {form.utleggstype === v && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-sm text-[#1A1B1E]">{l}</span>
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
          <p className="text-xs text-[#7A7D83] mt-1">Beskrivelse vises på faktura</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Beløp (kr)" type="number" value={form.belop} onChange={set('belop')} placeholder="0" />
          <Input label="Forfallsdato" type="date" value={form.forfallsdato} onChange={set('forfallsdato')} />
        </div>

        {/* Faktureringsmetode */}
        <div>
          <div className="text-xs font-medium text-[#65696F] mb-2">Hvordan skal utlegget faktureres?</div>
          <div className="space-y-2">
            {[
              ['neste_faktura', 'Inkluder på neste leie-faktura'],
              ['egen_faktura', 'Fakturer på egen utleggsfaktura'],
            ].map(([v, l]) => (
              <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, faktureringsmetode: v }))}
                className="flex items-center gap-2.5 w-full text-left cursor-pointer">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${form.faktureringsmetode === v ? 'border-white' : 'border-[#AEB0B4]'}`}>
                  {form.faktureringsmetode === v && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <span className="text-sm text-[#1A1B1E]">{l}</span>
              </button>
            ))}
          </div>
          {form.faktureringsmetode === 'neste_faktura' && (
            <p className="text-xs text-[#7A7D83] mt-2">
              Utlegget vil bli inkludert på <strong className="text-[#1A1B1E]">neste leie-faktura</strong>, og bokført i regnskapet.
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
        <div className="text-sm text-[#7A7D83]">Kontrakt ikke funnet</div>
        <button onClick={() => navigate('/kontrakter')} className="text-xs text-[#65696F] hover:text-[#1A1B1E] mt-2 cursor-pointer">
          ← Tilbake til kontrakter
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

  return (
    <>
      {visUtleggModal && (
        <UtleggModal kontraktId={id} onLagre={lagreUtlegg} onLukk={() => setVisUtleggModal(false)} />
      )}
      {visKpiModal && (
        <KpiReguleringModal kontrakt={kontrakt} onLagre={utforKpiRegulering} onLukk={() => setVisKpiModal(false)} />
      )}
      <BekreftModal
        åpen={slettKontraktVis}
        tittel="Slette leiekontrakt?"
        tekst={`Kontrakten med ${kontrakt.leietakerNavn} vil bli permanent slettet.`}
        bekreftLabel="Slett kontrakt"
        onBekreft={() => { deleteKontrakt(id); navigate('/kontrakter'); }}
        onAvbryt={() => setSlettKontraktVis(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/kontrakter')}
            className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg transition-all cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">{kontrakt.leietakerNavn}</h1>
            <p className="text-sm text-[#65696F] mt-0.5">{adresse}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => navigate(`/meldinger/${id}`)}>
            <MessageSquare size={14} />
            Melding
            {ulesteMeldinger > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#2563EB] text-[#F6F6F4] text-xs font-bold flex items-center justify-center">
                {ulesteMeldinger}
              </span>
            )}
          </Button>
          <Button variant="secondary" onClick={() => kopier(leietakerLenke(id), 'portal')}>
            {kopiert === 'portal' ? <><Check size={14} className="text-[#15803D]" /> Lenke kopiert</> : <><Share2 size={14} /> Del portal</>}
          </Button>
          <Button variant="secondary" onClick={() => genererKontraktPDF({ kontrakt, leieobjekt: obj, bygg: b, utleier })}>
            <Download size={14} /> PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 mb-6 border-b border-[#E9E8E2] overflow-x-auto">
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
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap cursor-pointer
              ${aktivTab === tabId
                ? 'border-white text-[#1A1B1E]'
                : 'border-transparent text-[#7A7D83] hover:text-[#4B4E54]'
              }`}
          >
            <Ikon size={14} />
            {label}
            {ferdig && <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />}
          </button>
        ))}
      </div>

      {/* ══ OVERSIKT-TAB ══════════════════════════════════════════════════════ */}
      {aktivTab === 'oversikt' && (
        <div className="space-y-6">

          {/* Leietaker-kort */}
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-[#E9E8E2] flex items-center justify-center text-xl font-bold text-[#7A7D83] shrink-0">
                {(kontrakt.leietakerNavn || '?')[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-bold text-[#1A1B1E]">{kontrakt.leietakerNavn}</span>
                  <Badge color={status.color}>{status.label}</Badge>
                </div>

                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                  {kontrakt.maanedligLeie && (
                    <InfoRad ikon={TrendingUp} farge="#15803D">
                      <span className="text-[#15803D] font-semibold num">{formatKr(kontrakt.maanedligLeie)}</span>
                      <span className="text-[#7A7D83]"> / måned</span>
                    </InfoRad>
                  )}
                  {kontrakt.startdato && (
                    <InfoRad ikon={Calendar} farge="#65696F">
                      <span className="text-[#1A1B1E]">{datoFmt(kontrakt.startdato)}</span>
                      {kontrakt.sluttdato && <span className="text-[#7A7D83]"> — {datoFmt(kontrakt.sluttdato)}</span>}
                      {!kontrakt.sluttdato && <span className="text-[#7A7D83]"> — løpende</span>}
                    </InfoRad>
                  )}
                  {kontrakt.depositum && kontrakt.sikkerhetsType !== 'ingen' && (
                    <InfoRad ikon={Shield} farge="#2563EB">
                      <span className="text-[#1A1B1E]">Depositum: </span>
                      <span className="text-[#2563EB] num">{formatKr(kontrakt.depositum)}</span>
                    </InfoRad>
                  )}
                  {b && (
                    <InfoRad ikon={Home} farge="#65696F">
                      <span className="text-[#1A1B1E]">{adresse}</span>
                    </InfoRad>
                  )}
                  {obj?.betegnelse && (
                    <InfoRad ikon={Hash} farge="#65696F">
                      <span className="text-[#4B4E54]">{obj.betegnelse}</span>
                    </InfoRad>
                  )}
                  {kontrakt.leietakerTlf && (
                    <InfoRad ikon={Phone} farge="#65696F">
                      <a href={`tel:${kontrakt.leietakerTlf}`} className="text-[#1A1B1E] hover:text-[#2563EB] transition-colors">
                        {kontrakt.leietakerTlf}
                      </a>
                    </InfoRad>
                  )}
                  {kontrakt.leietakerEpost && (
                    <InfoRad ikon={Mail} farge="#65696F">
                      <a href={`mailto:${kontrakt.leietakerEpost}`} className="text-[#1A1B1E] hover:text-[#2563EB] transition-colors truncate">
                        {kontrakt.leietakerEpost}
                      </a>
                    </InfoRad>
                  )}
                  {kontrakt.indeksregulering && kontrakt.startdato && (
                    <InfoRad ikon={TrendingUp} farge="#9A7A24">
                      <button type="button" onClick={() => setVisKpiModal(true)}
                        className="text-[#9A7A24] hover:underline cursor-pointer text-left">
                        KPI-reguleres {nesteReguleringTekst(kontrakt)} →
                      </button>
                    </InfoRad>
                  )}
                </div>
              </div>

              {/* Handlinger */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button type="button" onClick={() => setAktivTab('leiekontrakt')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] transition-all cursor-pointer">
                  <Pencil size={12} /> Rediger
                </button>
                <button type="button" onClick={() => setSlettKontraktVis(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 transition-all cursor-pointer">
                  <Trash2 size={12} /> Slett
                </button>
              </div>
            </div>
          </div>

          {/* Notater */}
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9E8E2]">
              <div className="flex items-center gap-2">
                <StickyNote size={14} className="text-[#7A7D83]" />
                <span className="text-sm font-semibold text-[#1A1B1E]">Notater</span>
              </div>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Ny notat input */}
              <div className="flex gap-2">
                <textarea
                  value={nyttNotat}
                  onChange={(e) => setNyttNotat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) leggTilNotat(); }}
                  placeholder="Legg til notat om denne leietakeren... (⌘+Enter for å lagre)"
                  rows={2}
                  className="flex-1 bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl px-4 py-2.5 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] resize-none transition-colors"
                />
                <button type="button" onClick={leggTilNotat} disabled={!nyttNotat.trim()}
                  className="px-3 py-2 rounded-xl bg-black/[0.055] text-[#1A1B1E] hover:bg-black/[0.07] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer self-end">
                  <Plus size={14} />
                </button>
              </div>

              {mineNotater.length === 0 ? (
                <p className="text-sm text-[#AEB0B4] italic">Du har ikke opprettet notater på denne leietakeren</p>
              ) : (
                <div className="space-y-2">
                  {mineNotater.map((n) => (
                    <div key={n.id} className="group flex items-start gap-3 bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#1A1B1E] whitespace-pre-wrap">{n.tekst}</p>
                        <p className="text-xs text-[#AEB0B4] mt-1">{datoLang(n.opprettet)}</p>
                      </div>
                      <button type="button" onClick={() => deleteNotat(n.id)} aria-label="Slett notat"
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-[#7A7D83] hover:text-[#DC2626] transition-all cursor-pointer shrink-0 p-0.5">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fakturaer og utlegg */}
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E9E8E2]">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-[#7A7D83]" />
                <span className="text-sm font-semibold text-[#1A1B1E]">Fakturaer og utlegg</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setVisUtleggModal(true)}>
                <Plus size={12} /> Nytt utlegg
              </Button>
            </div>

            {/* Totaloversikt */}
            <div className="grid grid-cols-2 divide-x divide-[#E9E8E2] border-b border-[#E9E8E2]">
              <div className="px-5 py-3">
                <div className="text-xs text-[#7A7D83]">Fakturert totalt</div>
                <div className="text-base font-semibold text-[#1A1B1E] num">{formatKr(totalFakturert)}</div>
              </div>
              <div className="px-5 py-3">
                <div className="text-xs text-[#7A7D83]">Ubetalt</div>
                <div className={`text-base font-semibold num ${totalUbetalt > 0 ? 'text-[#DC2626]' : 'text-[#15803D]'}`}>
                  {formatKr(totalUbetalt)}
                </div>
              </div>
            </div>

            {/* Faktura-tabell */}
            {alleFakturaer.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-[#AEB0B4] italic">
                Ingen fakturaer ennå
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E9E8E2]">
                      {['Forfall', 'Beskrivelse', 'Beløp', 'Ubetalt', 'Status', ''].map((h) => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-medium text-[#7A7D83]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {alleFakturaer.map((f) => {
                      const forfalt = f.status === 'ubetalt' && new Date(f.forfall) < new Date();
                      const statusFarge = f.status === 'betalt' ? 'text-[#15803D]' : forfalt ? 'text-[#DC2626]' : 'text-[#B45309]';
                      const statusLabel = f.status === 'betalt' ? 'BETALT' : forfalt ? 'FORFALT' : 'UBETALT';
                      return (
                        <tr key={f.id} className="border-b border-[#E9E8E2]/50 hover:bg-black/[0.02] transition-colors">
                          <td className="px-5 py-3 text-[#65696F] num whitespace-nowrap">{datoFmt(f.forfall)}</td>
                          <td className="px-5 py-3 text-[#1A1B1E]">
                            <div>{f.beskrivelse}</div>
                            {f.kategori && <div className="text-xs text-[#7A7D83]">{f.kategori}</div>}
                          </td>
                          <td className="px-5 py-3 text-[#1A1B1E] num whitespace-nowrap">{formatKr(f.belop)}</td>
                          <td className="px-5 py-3 num whitespace-nowrap">
                            <span className={f.status === 'betalt' ? 'text-[#7A7D83]' : 'text-[#DC2626]'}>
                              {f.status === 'betalt' ? formatKr(0) : formatKr(f.belop)}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold ${statusFarge}`}>{statusLabel}</span>
                          </td>
                          <td className="px-5 py-3">
                            {f.type === 'utlegg' && (
                              <button type="button"
                                onClick={() => markerBetalt(f)}
                                className="text-xs text-[#7A7D83] hover:text-[#1A1B1E] border border-[#E9E8E2] hover:border-[#DCDAD2] px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap">
                                {f.status === 'betalt' ? 'Marker ubetalt' : 'Marker betalt'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {mineUtlegg.length > 0 && (
              <div className="px-5 py-3 border-t border-[#E9E8E2]">
                <p className="text-xs text-[#AEB0B4]">
                  Husleie-fakturaer er auto-genererte fra kontrakten. Utlegg kan markeres betalt manuelt.
                  Banktilkobling (Vipps/eFaktura) aktiveres under Integrasjoner.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ LEIEKONTRAKT-TAB ═══════════════════════════════════════════════════ */}
      {aktivTab === 'leiekontrakt' && (
        <div className="text-center py-12 space-y-3">
          <FileText size={28} className="text-[#AEB0B4] mx-auto" />
          <div className="text-sm font-medium text-[#1A1B1E]">Rediger kontraktsinnhold</div>
          <div className="text-xs text-[#7A7D83]">Åpner redigeringsskjemaet for denne kontrakten</div>
          <Button variant="primary" onClick={() => navigate(`/kontrakter/${id}/rediger`)}>
            <Pencil size={14} /> Åpne kontraktseditor
          </Button>
        </div>
      )}
    </>
  );
}

// ─── InfoRad helper ───────────────────────────────────────────────────────────
function InfoRad({ ikon: Ikon, farge, children }) {
  return (
    <div className="flex items-center gap-2">
      <Ikon size={13} style={{ color: farge }} className="shrink-0" />
      <span className="text-sm">{children}</span>
    </div>
  );
}

