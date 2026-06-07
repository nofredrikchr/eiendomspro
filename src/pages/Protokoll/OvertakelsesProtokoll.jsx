import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Download, Check,
  Camera, FileText, CheckCircle2, Circle, AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { genererProtokollPDF } from '../../utils/protokollPDF';

// ─── Sjekkliste (fra Husleieloven og bransjestandard) ─────────────────────────
const INNFLYTTING_SJEKKLISTE = [
  'Boligen er ryddet og rengjort',
  'Boligen med tilbehør er i vanlig god stand',
  'Boligen er i samsvar med kontrakten og opplysninger gitt på forhånd',
  'Eventuelle hvitevarer er rengjorte og fungerer',
  'Nøkler og låser fungerer',
  'Kraner og vannførsel fungerer',
  'Lyspærer, lysbrytere, stikkontakter og varmeovner fungerer',
  'Boligen er forskriftsmessig brannsikret',
];

function genId() { return `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

function defaultProtokoll(type) {
  return {
    id: genId(),
    type,
    kontraktId: '',
    dato: new Date().toISOString().slice(0, 10),
    noklerOverlevert: '',
    malere: [
      { id: genId(), type: 'Strøm', malerNr: '', avlesning: '' },
      { id: genId(), type: 'Vann', malerNr: '', avlesning: '' },
    ],
    sjekkliste: INNFLYTTING_SJEKKLISTE.map((tekst) => ({
      id: genId(), tekst, ok: false, bemerkning: '',
    })),
    bemerkninger: [],         // { id, tekst, utbedreFrist? }
    inventar: [],             // { id, navn, antall, tilstand, merknad }
    // Kun utflytting:
    oppgjor: {
      ubetaltLeie: '0',
      restStrom: '0',
      restVann: '0',
      utbedringskostnader: '0',
      annetTap: '0',
      parteneEnige: true,
      dekkesAvDepositum: '0',
      leietakerBetaler: '0',
    },
    merknader: '',
    lagret: false,
  };
}

// ─── Tall-input ───────────────────────────────────────────────────────────────
function KrInput({ label, value, onChange }) {
  return (
    <div>
      <div className="text-xs text-[#65696F] mb-1.5">{label}</div>
      <div className="flex items-center gap-2 bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-3 py-2.5">
        <span className="text-[#7A7D83] text-sm">kr</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent text-sm text-[#1A1B1E] outline-none num"
        />
      </div>
    </div>
  );
}

// ─── Seksjon ─────────────────────────────────────────────────────────────────
function Seksjon({ tittel, children, sub }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E9E8E2] bg-[#F1F1ED]">
        <div className="text-sm font-semibold text-[#1A1B1E]">{tittel}</div>
        {sub && <div className="text-xs text-[#7A7D83] mt-0.5">{sub}</div>}
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

// ─── Hoved ───────────────────────────────────────────────────────────────────
export default function OvertakelsesProtokoll() {
  const { protokollId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { kontrakter, leieobjekter, bygg, utleiere, protokoller = [], addProtokoll, updateProtokoll } = useApp();

  const kontraktId = searchParams.get('kontraktId');
  const typeParam = searchParams.get('type') || 'innflytting';

  const eksisterende = protokollId ? protokoller.find((p) => p.id === protokollId) : null;
  const [prot, setProt] = useState(() => {
    if (eksisterende) return eksisterende;
    const ny = defaultProtokoll(typeParam);
    if (kontraktId) ny.kontraktId = kontraktId;
    return ny;
  });
  const [genererer, setGenererer] = useState(false);
  const [lagret, setLagret] = useState(false);

  const kontrakt = kontrakter.find((k) => k.id === (prot.kontraktId || kontraktId));
  const obj = kontrakt ? leieobjekter.find((l) => l.id === kontrakt.leieobjektId) : null;
  const b = obj ? bygg.find((b) => b.id === obj.byggId) : null;
  const utleier = kontrakt ? utleiere.find((u) => u.id === kontrakt.utleierNavn) : null;

  const erInn = prot.type === 'innflytting';

  // ── Helpers ─────────────────────────────────────────────────────
  const set = (felt) => (e) => setProt((p) => ({ ...p, [felt]: e.target.value }));
  const setOppgjor = (felt) => (e) => setProt((p) => ({ ...p, oppgjor: { ...p.oppgjor, [felt]: e.target.value } }));

  function toggleSjekk(id) {
    setProt((p) => ({ ...p, sjekkliste: p.sjekkliste.map((s) => s.id === id ? { ...s, ok: !s.ok } : s) }));
  }
  function setSjekkBemerkning(id, val) {
    setProt((p) => ({ ...p, sjekkliste: p.sjekkliste.map((s) => s.id === id ? { ...s, bemerkning: val } : s) }));
  }

  function leggTilBemerkning() {
    setProt((p) => ({ ...p, bemerkninger: [...p.bemerkninger, { id: genId(), tekst: '', utbedreFrist: '' }] }));
  }
  function oppdaterBemerkning(id, felt, val) {
    setProt((p) => ({ ...p, bemerkninger: p.bemerkninger.map((b) => b.id === id ? { ...b, [felt]: val } : b) }));
  }
  function fjernBemerkning(id) {
    setProt((p) => ({ ...p, bemerkninger: p.bemerkninger.filter((b) => b.id !== id) }));
  }

  function leggTilInventar() {
    setProt((p) => ({ ...p, inventar: [...p.inventar, { id: genId(), navn: '', antall: 1, tilstand: '', merknad: '' }] }));
  }
  function oppdaterInventar(id, felt, val) {
    setProt((p) => ({ ...p, inventar: p.inventar.map((i) => i.id === id ? { ...i, [felt]: val } : i) }));
  }
  function fjernInventar(id) {
    setProt((p) => ({ ...p, inventar: p.inventar.filter((i) => i.id !== id) }));
  }

  function oppdaterMaaler(id, felt, val) {
    setProt((p) => ({ ...p, malere: p.malere.map((m) => m.id === id ? { ...m, [felt]: val } : m) }));
  }

  // Beregn totalt oppgjør
  const totaltOppgjor = ['ubetaltLeie', 'restStrom', 'restVann', 'utbedringskostnader', 'annetTap']
    .reduce((s, k) => s + (parseFloat(prot.oppgjor?.[k]) || 0), 0);

  function lagre() {
    const data = { ...prot, kontraktId: prot.kontraktId || kontraktId, lagret: true };
    if (eksisterende) updateProtokoll(prot.id, data);
    else addProtokoll(data);
    setProt(data);
    setLagret(true);
    setTimeout(() => setLagret(false), 2500);
  }

  async function lastNed() {
    setGenererer(true);
    try {
      await genererProtokollPDF({ protokoll: prot, kontrakt, leieobjekt: obj, bygg: b, utleier });
    } finally {
      setGenererer(false);
    }
  }

  const ukjekket = prot.sjekkliste.filter((s) => !s.ok).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)}
            className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg transition-all cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">
              {erInn ? 'Innflyttingsprotokoll' : 'Utflyttingsprotokoll'}
            </h1>
            <p className="text-sm text-[#65696F] mt-0.5">
              {kontrakt
                ? `${kontrakt.leietakerNavn}${b ? ` — ${b.gatenavn} ${b.gatenummer}` : ''}`
                : 'Registrer tilstand ved overlevering'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={lagre}>
            {lagret ? <><Check size={14} className="text-[#15803D]" /> Lagret!</> : 'Lagre utkast'}
          </Button>
          <Button variant="primary" onClick={lastNed} disabled={genererer}>
            <Download size={14} /> {genererer ? 'Genererer...' : 'Last ned PDF'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        <div className="space-y-4">

          {/* ── Parter ─────────────────────────────────────────────── */}
          <Seksjon tittel="Parter">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-[#7A7D83] mb-1">Utleier</div>
                <div className="text-[#1A1B1E] font-medium">{utleier?.navn || '—'}</div>
                {kontrakt?.opprettet && (
                  <div className="text-xs text-[#7A7D83] mt-0.5">
                    Signert leiekontrakt {new Date(kontrakt.opprettet).toLocaleDateString('nb-NO')}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-[#7A7D83] mb-1">Leietaker</div>
                <div className="text-[#1A1B1E] font-medium">{kontrakt?.leietakerNavn || '—'}</div>
                {kontrakt?.opprettet && (
                  <div className="text-xs text-[#7A7D83] mt-0.5">
                    Signert leiekontrakt {new Date(kontrakt.opprettet).toLocaleDateString('nb-NO')}
                  </div>
                )}
              </div>
            </div>
          </Seksjon>

          {/* ── Eiendom ────────────────────────────────────────────── */}
          <Seksjon tittel="Eiendom">
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {[
                ['Adresse', b ? `${b.gatenavn} ${b.gatenummer}, ${b.postnummer} ${b.poststed}` : '—'],
                ['Eget nr. / betegnelse', obj?.betegnelse || '—'],
                ['Kommune', b?.poststed || '—'],
                ['Gnr.', b?.gardsnummer || '—'],
                ['Bnr.', b?.bruksnummer || '—'],
              ].map(([e, v]) => (
                <div key={e}>
                  <span className="text-[#7A7D83]">{e} </span>
                  <span className="text-[#1A1B1E]">{v}</span>
                </div>
              ))}
            </div>
          </Seksjon>

          {/* ── Overtakelse ────────────────────────────────────────── */}
          <Seksjon tittel="Overtakelse">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Overtakelsesdato" type="date" value={prot.dato} onChange={set('dato')} />
              <div />
            </div>
            <div>
              <div className="text-xs text-[#65696F] mb-1.5">Nøkler overlevert</div>
              <textarea
                value={prot.noklerOverlevert}
                onChange={set('noklerOverlevert')}
                placeholder="Oppgi hvilke og hvor mange nøkler som er overlevert. F.eks: 2 hovednøkler, 1 postkassenøkkel"
                rows={3}
                className="w-full bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl px-4 py-3 text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] resize-none transition-colors"
              />
            </div>
          </Seksjon>

          {/* ── Strøm- og vannavlesning ────────────────────────────── */}
          <Seksjon tittel="Strøm- og vannavlesning">
            {kontrakt?.inkludererStrom && (
              <div className="flex items-center gap-2 text-sm text-[#7A7D83]">
                <Check size={14} className="text-[#15803D]" />
                Strøm og oppvarming er inkludert i leien
              </div>
            )}
            {kontrakt?.inkludererVann && (
              <div className="flex items-center gap-2 text-sm text-[#7A7D83]">
                <Check size={14} className="text-[#15803D]" />
                Vann- og avløpsavgifter er inkludert i leien
              </div>
            )}
            {!kontrakt?.inkludererStrom && !kontrakt?.inkludererVann && (
              <p className="text-xs text-[#7A7D83]">Strøm og vann faktureres separat. Registrer avlesning ved overtakelse.</p>
            )}
            <div className="space-y-3">
              {prot.malere.map((m, i) => (
                <div key={m.id} className="grid grid-cols-[2fr_2fr_2fr_32px] gap-2 items-end">
                  <Input label={i === 0 ? 'Type' : ''} value={m.type}
                    onChange={(e) => oppdaterMaaler(m.id, 'type', e.target.value)} />
                  <Input label={i === 0 ? 'Målernummer' : ''} value={m.malerNr}
                    onChange={(e) => oppdaterMaaler(m.id, 'malerNr', e.target.value)} placeholder="123456" />
                  <Input label={i === 0 ? 'Avlesning' : ''} value={m.avlesning}
                    onChange={(e) => oppdaterMaaler(m.id, 'avlesning', e.target.value)} placeholder="12345 kWh" />
                  <button type="button"
                    onClick={() => setProt((p) => ({ ...p, malere: p.malere.filter((x) => x.id !== m.id) }))}
                    className={`p-1.5 text-[#AEB0B4] hover:text-[#DC2626] cursor-pointer self-end ${i === 0 ? '' : ''}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button"
              onClick={() => setProt((p) => ({ ...p, malere: [...p.malere, { id: genId(), type: 'Fjernvarme', malerNr: '', avlesning: '' }] }))}
              className="flex items-center gap-2 text-xs text-[#7A7D83] hover:text-[#1A1B1E] transition-colors cursor-pointer">
              <Plus size={13} /> Legg til måler
            </button>
          </Seksjon>

          {/* ── Leieobjektets tilstand ─────────────────────────────── */}
          <Seksjon
            tittel="Leieobjektets tilstand"
            sub={erInn ? 'Med mindre annet er avtalt, skal boligen være ryddet, rengjort og i vanlig god stand (husleieloven § 2-2).' : 'Legg til bemerkninger dersom det oppdages feil eller mangler.'}
          >
            {erInn && (
              <>
                <p className="text-xs text-[#7A7D83] leading-relaxed">
                  Det foreligger mangel dersom utleieren har gitt uriktige opplysninger, eller dersom boligen er i vesentlig dårligere stand enn leieren hadde grunn til å forvente (husleieloven §§ 2-3, 2-4 og 2-5).
                </p>
                <div className="text-xs font-semibold text-[#4B4E54] mt-2 mb-1">Følgende bør sjekkes ved overtakelse:</div>
              </>
            )}

            <div className="space-y-2">
              {prot.sjekkliste.map((s) => (
                <div key={s.id} className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-3 space-y-2">
                  <button type="button"
                    onClick={() => toggleSjekk(s.id)}
                    className="flex items-center gap-3 w-full text-left cursor-pointer">
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors
                      ${s.ok ? 'bg-[#15803D]/15 border border-[#15803D]/40' : 'border border-[#DCDAD2]'}`}>
                      {s.ok && <Check size={12} className="text-[#15803D]" />}
                    </div>
                    <span className={`text-sm ${s.ok ? 'text-[#4B4E54]' : 'text-[#1A1B1E]'}`}>{s.tekst}</span>
                  </button>
                  {s.bemerkning !== undefined && (
                    <input
                      type="text"
                      value={s.bemerkning}
                      onChange={(e) => setSjekkBemerkning(s.id, e.target.value)}
                      placeholder="Legg til merknad (valgfritt)..."
                      className="w-full bg-transparent border-b border-[#E9E8E2] pb-1 text-xs text-[#65696F] placeholder-[#AEB0B4] outline-none focus:border-[#DCDAD2] transition-colors pl-8"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Ekstra bemerkninger */}
            {prot.bemerkninger.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold text-[#7A7D83] uppercase tracking-wider">Bemerkninger</div>
                {prot.bemerkninger.map((bm) => (
                  <div key={bm.id} className="bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={13} className="text-[#DC2626] shrink-0 mt-0.5" />
                      <textarea
                        value={bm.tekst}
                        onChange={(e) => oppdaterBemerkning(bm.id, 'tekst', e.target.value)}
                        placeholder="Beskriv feil eller mangel..."
                        rows={2}
                        className="flex-1 bg-transparent text-sm text-[#1A1B1E] placeholder-[#AEB0B4] outline-none resize-none"
                      />
                      <button type="button" onClick={() => fjernBemerkning(bm.id)}
                        className="text-[#7A7D83] hover:text-[#DC2626] cursor-pointer shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <Input
                      label="Frist for utbedring (valgfritt)"
                      type="date"
                      value={bm.utbedreFrist}
                      onChange={(e) => oppdaterBemerkning(bm.id, 'utbedreFrist', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={leggTilBemerkning}
              className="flex items-center gap-2 text-xs text-[#7A7D83] hover:text-[#1A1B1E] border border-[#E9E8E2] hover:border-[#DCDAD2] rounded-lg px-3 py-2 transition-all cursor-pointer">
              <Plus size={13} /> Legg til bemerkning
            </button>
          </Seksjon>

          {/* ── Inventarliste ──────────────────────────────────────── */}
          <Seksjon tittel="Inventarliste"
            sub="Angi alt inventar som følger med leieobjektet.">
            {prot.inventar.length > 0 && (
              <div className="space-y-2">
                {prot.inventar.map((inv, i) => (
                  <div key={inv.id} className="grid grid-cols-[2fr_60px_2fr_32px] gap-2 items-end">
                    <Input label={i === 0 ? 'Gjenstand' : ''} value={inv.navn}
                      onChange={(e) => oppdaterInventar(inv.id, 'navn', e.target.value)}
                      placeholder="f.eks. Kjøleskap, Vaskemaksin" />
                    <div>
                      {i === 0 && <div className="text-xs text-[#4B4E54] mb-1.5">Antall</div>}
                      <input type="number" min="1" value={inv.antall}
                        onChange={(e) => oppdaterInventar(inv.id, 'antall', e.target.value)}
                        className="w-full bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-3 py-2.5 text-sm text-[#1A1B1E] outline-none" />
                    </div>
                    <Input label={i === 0 ? 'Merknad / tilstand' : ''} value={inv.merknad}
                      onChange={(e) => oppdaterInventar(inv.id, 'merknad', e.target.value)}
                      placeholder="f.eks. Fungerer, liten bulk" />
                    <button type="button" onClick={() => fjernInventar(inv.id)}
                      className="p-1.5 text-[#AEB0B4] hover:text-[#DC2626] cursor-pointer self-end">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={leggTilInventar}
              className="flex items-center gap-2 text-xs text-[#7A7D83] hover:text-[#1A1B1E] border border-[#E9E8E2] hover:border-[#DCDAD2] rounded-lg px-3 py-2 transition-all cursor-pointer">
              <Plus size={13} /> Legg til gjenstand
            </button>
          </Seksjon>

          {/* ── Oppgjør (kun utflytting) ───────────────────────────── */}
          {!erInn && (
            <Seksjon tittel="Oppgjør"
              sub="Beregn eventuelle krav mot depositumet ved utflytting.">
              <div className="grid grid-cols-2 gap-4">
                <KrInput label="Ubetalt leie (inkl. inkasso- og fravikelseskostnader)"
                  value={prot.oppgjor?.ubetaltLeie || '0'} onChange={setOppgjor('ubetaltLeie')} />
                <KrInput label="Restbeløp strøm og oppvarming"
                  value={prot.oppgjor?.restStrom || '0'} onChange={setOppgjor('restStrom')} />
                <KrInput label="Restbeløp vann og avløp"
                  value={prot.oppgjor?.restVann || '0'} onChange={setOppgjor('restVann')} />
                <KrInput label="Kostnader til nødvendige utbedringer"
                  value={prot.oppgjor?.utbedringskostnader || '0'} onChange={setOppgjor('utbedringskostnader')} />
                <KrInput label="Annet tap grunnet leiers mislighold"
                  value={prot.oppgjor?.annetTap || '0'} onChange={setOppgjor('annetTap')} />
                <div className="flex items-end">
                  <div className="w-full bg-[#F6F6F4] border border-[#9A7A24]/30 rounded-lg px-3 py-2.5">
                    <div className="text-xs text-[#9A7A24] mb-1">Totalt</div>
                    <div className="text-sm font-semibold text-[#1A1B1E] num">
                      kr {totaltOppgjor.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-[#65696F] mb-2">Er partene enige om oppgjøret?</div>
                <div className="flex gap-3">
                  {[['true', 'Ja'], ['false', 'Nei']].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setProt((p) => ({ ...p, oppgjor: { ...p.oppgjor, parteneEnige: val === 'true' } }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all cursor-pointer
                        ${String(prot.oppgjor?.parteneEnige) === val
                          ? val === 'true' ? 'border-[#15803D]/30 bg-[#15803D]/10 text-[#15803D]' : 'border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]'
                          : 'border-[#E9E8E2] text-[#65696F] hover:border-[#DCDAD2]'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <KrInput label="Følgende beløp dekkes av depositum/garanti"
                  value={prot.oppgjor?.dekkesAvDepositum || '0'} onChange={setOppgjor('dekkesAvDepositum')} />
                <KrInput label="Leietaker overfører til utleiers konto"
                  value={prot.oppgjor?.leietakerBetaler || '0'} onChange={setOppgjor('leietakerBetaler')} />
              </div>
            </Seksjon>
          )}

          {/* ── Merknader ──────────────────────────────────────────── */}
          <Seksjon tittel="Generelle merknader">
            <Textarea value={prot.merknader} onChange={set('merknader')}
              placeholder="Andre forhold som bør dokumenteres..." rows={3} label="" />
          </Seksjon>

          {/* ── Bilder (placeholder) ────────────────────────────────── */}
          <Seksjon tittel="Bilder"
            sub="Dokumenter leieobjektets tilstand med bilder. Kommer i neste versjon med full bilde-opplasting.">
            <div className="border-2 border-dashed border-[#E9E8E2] rounded-xl p-8 text-center">
              <Camera size={24} className="text-[#AEB0B4] mx-auto mb-2" />
              <div className="text-sm text-[#7A7D83]">Bilde-opplasting kommer snart</div>
              <div className="text-xs text-[#AEB0B4] mt-1">Lagre bilder som vedlegg til PDF inntil videre</div>
            </div>
          </Seksjon>

        </div>

        {/* ── Høyre sidebar ─────────────────────────────────────────── */}
        <div className="sticky top-6 space-y-4">
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 space-y-4">
            <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest">Status</div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#7A7D83]">Type</span>
                <span className="text-[#1A1B1E]">{erInn ? 'Innflytting' : 'Utflytting'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A7D83]">Dato</span>
                <span className="text-[#1A1B1E]">{prot.dato || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A7D83]">Sjekkliste</span>
                <span className={ukjekket > 0 ? 'text-[#B45309]' : 'text-[#15803D]'}>
                  {prot.sjekkliste.filter(s => s.ok).length} / {prot.sjekkliste.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A7D83]">Bemerkninger</span>
                <span className={prot.bemerkninger.length > 0 ? 'text-[#DC2626]' : 'text-[#7A7D83]'}>
                  {prot.bemerkninger.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#7A7D83]">Inventar</span>
                <span className="text-[#1A1B1E]">{prot.inventar.length} gjenstander</span>
              </div>
              {!erInn && totaltOppgjor > 0 && (
                <div className="flex justify-between border-t border-[#E9E8E2] pt-2">
                  <span className="text-[#7A7D83]">Totalt krav</span>
                  <span className="text-[#9A7A24] font-semibold num">
                    kr {totaltOppgjor.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="h-px bg-[#E9E8E2]" />

            {/* Sjekkliste-progress */}
            <div>
              <div className="flex justify-between text-xs text-[#7A7D83] mb-2">
                <span>Sjekkliste fullført</span>
                <span>{Math.round((prot.sjekkliste.filter(s => s.ok).length / prot.sjekkliste.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-[#E9E8E2] rounded-full overflow-hidden">
                <div className="h-full bg-[#15803D] rounded-full transition-all duration-300"
                  style={{ width: `${(prot.sjekkliste.filter(s => s.ok).length / prot.sjekkliste.length) * 100}%` }} />
              </div>
            </div>

            <div className="h-px bg-[#E9E8E2]" />

            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-center" onClick={lagre}>
                {lagret ? <><CheckCircle2 size={14} className="text-[#15803D]" /> Lagret!</> : 'Lagre utkast'}
              </Button>
              <Button variant="primary" className="w-full justify-center" onClick={lastNed} disabled={genererer}>
                <Download size={14} /> {genererer ? 'Genererer...' : 'Last ned PDF'}
              </Button>
            </div>
          </div>

          {prot.bemerkninger.length > 0 && (
            <div className="bg-[#DC2626]/5 border border-[#DC2626]/20 rounded-xl p-4">
              <div className="text-xs font-semibold text-[#DC2626] mb-1">
                {prot.bemerkninger.length} bemerkning{prot.bemerkninger.length > 1 ? 'er' : ''} registrert
              </div>
              <div className="text-xs text-[#DC2626]/70">
                Bemerkninger dokumenterer feil og mangler — viktig ved depositumtvister.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
