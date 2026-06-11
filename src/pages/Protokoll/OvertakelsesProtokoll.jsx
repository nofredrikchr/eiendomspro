import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, Download, Check,
  Camera, CheckCircle2, AlertCircle, ClipboardList,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Photo, IconTile, DataRow } from '../../components/ui/kit';
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
    <div className="flex flex-col gap-1.5">
      <div className="text-[12.5px] font-bold text-muted">{label}</div>
      <div className="flex items-center gap-2 bg-surface-2 border-[1.5px] border-line-input rounded-xl px-3.5 py-[11px] focus-within:border-brand focus-within:bg-surface transition-all">
        <span className="text-muted-2 text-sm font-semibold">kr</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={onChange}
          className="flex-1 bg-transparent text-sm font-bold text-ink outline-none num"
        />
      </div>
    </div>
  );
}

// ─── Seksjon ─────────────────────────────────────────────────────────────────
function Seksjon({ tittel, children, sub }) {
  return (
    <div className="bg-surface border border-line rounded-[20px] overflow-hidden">
      <div className="px-[22px] py-4 border-b border-line-soft bg-sand">
        <div className="text-base font-extrabold tracking-[-0.01em] text-ink">{tittel}</div>
        {sub && <div className="text-[12.5px] font-medium text-muted-2 mt-0.5">{sub}</div>}
      </div>
      <div className="px-[22px] py-5 space-y-4">{children}</div>
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

  async function lagre() {
    const data = { ...prot, kontraktId: prot.kontraktId || kontraktId, lagret: true };
    if (prot.id) { await updateProtokoll(prot.id, data); setProt(data); }
    else { const ny = await addProtokoll(data); setProt({ ...data, id: ny.id }); }
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
  const sjekketAntall = prot.sjekkliste.filter((s) => s.ok).length;
  const sjekkProsent = Math.round((sjekketAntall / prot.sjekkliste.length) * 100);

  const oppgjorKr = (n) => `kr ${n.toLocaleString('nb-NO', { minimumFractionDigits: 2 })}`;

  return (
    <div className="animate-fade-up">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap justify-between mb-6">
        <div className="flex items-start gap-3 min-w-[220px]">
          <button type="button" onClick={() => navigate(-1)} aria-label="Tilbake"
            className="p-1.5 text-muted hover:text-ink hover:bg-line-soft rounded-lg transition-all cursor-pointer mt-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="m-0 text-[clamp(22px,2.6vw,28px)] font-extrabold tracking-[-0.025em] text-ink">
              {erInn ? 'Innflyttingsprotokoll' : 'Utflyttingsprotokoll'}
            </h1>
            <p className="mt-1.5 mb-0 text-[14.5px] font-medium text-muted">
              {kontrakt
                ? `${kontrakt.leietakerNavn}${b ? ` — ${b.gatenavn} ${b.gatenummer}` : ''}`
                : 'Registrer tilstand ved overlevering'}
            </p>
          </div>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <Button variant="secondary" onClick={lagre}>
            {lagret ? <><Check size={14} className="text-brand-ink" /> Lagret!</> : 'Lagre utkast'}
          </Button>
          <Button variant="primary" onClick={lastNed} disabled={genererer}>
            <Download size={14} /> {genererer ? 'Genererer...' : 'Last ned PDF'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_270px] gap-6 items-start">
        <div className="space-y-4">

          {/* ── Parter ─────────────────────────────────────────────── */}
          <Seksjon tittel="Parter">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-[12.5px] font-bold text-muted-2 mb-1">Utleier</div>
                <div className="text-ink font-extrabold">{utleier?.navn || '—'}</div>
                {kontrakt?.opprettet && (
                  <div className="text-xs font-medium text-muted-2 mt-0.5">
                    Signert leiekontrakt {new Date(kontrakt.opprettet).toLocaleDateString('nb-NO')}
                  </div>
                )}
              </div>
              <div>
                <div className="text-[12.5px] font-bold text-muted-2 mb-1">Leietaker</div>
                <div className="text-ink font-extrabold">{kontrakt?.leietakerNavn || '—'}</div>
                {kontrakt?.opprettet && (
                  <div className="text-xs font-medium text-muted-2 mt-0.5">
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
                  <span className="text-muted-2 font-semibold">{e} </span>
                  <span className="text-ink font-bold">{v}</span>
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
            <Textarea
              label="Nøkler overlevert"
              value={prot.noklerOverlevert}
              onChange={set('noklerOverlevert')}
              placeholder="Oppgi hvilke og hvor mange nøkler som er overlevert. F.eks: 2 hovednøkler, 1 postkassenøkkel"
              rows={3}
            />
          </Seksjon>

          {/* ── Strøm- og vannavlesning ────────────────────────────── */}
          <Seksjon tittel="Strøm- og vannavlesning">
            {kontrakt?.inkludererStrom && (
              <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                <Check size={14} className="text-brand-ink" />
                Strøm og oppvarming er inkludert i leien
              </div>
            )}
            {kontrakt?.inkludererVann && (
              <div className="flex items-center gap-2 text-sm font-semibold text-muted">
                <Check size={14} className="text-brand-ink" />
                Vann- og avløpsavgifter er inkludert i leien
              </div>
            )}
            {!kontrakt?.inkludererStrom && !kontrakt?.inkludererVann && (
              <p className="text-[12.5px] font-medium text-muted-2">Strøm og vann faktureres separat. Registrer avlesning ved overtakelse.</p>
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
                  <button type="button" aria-label="Fjern måler"
                    onClick={() => setProt((p) => ({ ...p, malere: p.malere.filter((x) => x.id !== m.id) }))}
                    className="p-1.5 text-faint-2 hover:text-danger cursor-pointer self-end transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button"
              onClick={() => setProt((p) => ({ ...p, malere: [...p.malere, { id: genId(), type: 'Fjernvarme', malerNr: '', avlesning: '' }] }))}
              className="flex items-center gap-2 text-[12.5px] font-bold text-muted-2 hover:text-ink transition-colors cursor-pointer">
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
                <p className="text-[12.5px] font-medium text-muted-2 leading-relaxed">
                  Det foreligger mangel dersom utleieren har gitt uriktige opplysninger, eller dersom boligen er i vesentlig dårligere stand enn leieren hadde grunn til å forvente (husleieloven §§ 2-3, 2-4 og 2-5).
                </p>
                <div className="text-[12.5px] font-bold text-ink-2 mt-2 mb-1">Følgende bør sjekkes ved overtakelse:</div>
              </>
            )}

            <div className="space-y-2">
              {prot.sjekkliste.map((s) => (
                <div key={s.id} className="bg-surface-2 border border-line rounded-[14px] p-3 space-y-2">
                  <button type="button"
                    onClick={() => toggleSjekk(s.id)}
                    className="flex items-center gap-3 w-full text-left cursor-pointer">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors
                      ${s.ok ? 'bg-mint border border-mint-line' : 'border border-line-input'}`}>
                      {s.ok && <Check size={12} className="text-brand-ink" />}
                    </div>
                    <span className={`text-sm font-semibold ${s.ok ? 'text-muted' : 'text-ink'}`}>{s.tekst}</span>
                  </button>
                  {s.bemerkning !== undefined && (
                    <input
                      type="text"
                      value={s.bemerkning}
                      onChange={(e) => setSjekkBemerkning(s.id, e.target.value)}
                      placeholder="Legg til merknad (valgfritt)..."
                      className="w-full bg-transparent border-b border-line pb-1 text-xs font-medium text-muted placeholder:text-faint outline-none focus:border-brand transition-colors pl-8"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Ekstra bemerkninger */}
            {prot.bemerkninger.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="text-[11px] font-extrabold text-muted-2 uppercase tracking-wider">Bemerkninger</div>
                {prot.bemerkninger.map((bm) => (
                  <div key={bm.id} className="bg-danger/[0.05] border border-danger/20 rounded-[14px] p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={13} className="text-danger shrink-0 mt-1" />
                      <textarea
                        value={bm.tekst}
                        onChange={(e) => oppdaterBemerkning(bm.id, 'tekst', e.target.value)}
                        placeholder="Beskriv feil eller mangel..."
                        rows={2}
                        className="flex-1 bg-transparent text-sm font-semibold text-ink placeholder:font-medium placeholder:text-faint outline-none resize-none"
                      />
                      <button type="button" onClick={() => fjernBemerkning(bm.id)} aria-label="Fjern bemerkning"
                        className="text-muted-2 hover:text-danger cursor-pointer shrink-0 transition-colors">
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
              className="flex items-center gap-2 text-[12.5px] font-bold text-muted-2 hover:text-ink border border-line hover:border-line-input rounded-xl px-3 py-2 transition-all cursor-pointer">
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
                    <div className="flex flex-col gap-1.5">
                      {i === 0 && <div className="text-[12.5px] font-bold text-muted">Antall</div>}
                      <input type="number" min="1" value={inv.antall}
                        onChange={(e) => oppdaterInventar(inv.id, 'antall', e.target.value)}
                        className="w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl px-3 py-[11px] text-sm font-bold text-ink outline-none focus:border-brand focus:bg-surface transition-all num" />
                    </div>
                    <Input label={i === 0 ? 'Merknad / tilstand' : ''} value={inv.merknad}
                      onChange={(e) => oppdaterInventar(inv.id, 'merknad', e.target.value)}
                      placeholder="f.eks. Fungerer, liten bulk" />
                    <button type="button" onClick={() => fjernInventar(inv.id)} aria-label="Fjern gjenstand"
                      className="p-1.5 text-faint-2 hover:text-danger cursor-pointer self-end transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button type="button" onClick={leggTilInventar}
              className="flex items-center gap-2 text-[12.5px] font-bold text-muted-2 hover:text-ink border border-line hover:border-line-input rounded-xl px-3 py-2 transition-all cursor-pointer">
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
                  <div className="w-full bg-amber-soft border border-amber-line rounded-xl px-3.5 py-[11px]">
                    <div className="text-[11px] font-bold text-amber mb-1 uppercase tracking-wide">Totalt</div>
                    <div className="text-sm font-extrabold text-ink num">
                      {oppgjorKr(totaltOppgjor)}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-[12.5px] font-bold text-muted mb-2">Er partene enige om oppgjøret?</div>
                <div className="flex gap-3">
                  {[['true', 'Ja'], ['false', 'Nei']].map(([val, label]) => {
                    const aktiv = String(prot.oppgjor?.parteneEnige) === val;
                    const aktivKlasse = val === 'true'
                      ? 'border-mint-line bg-mint text-brand-ink'
                      : 'border-danger/30 bg-danger/[0.08] text-danger';
                    return (
                      <button key={val} type="button"
                        onClick={() => setProt((p) => ({ ...p, oppgjor: { ...p.oppgjor, parteneEnige: val === 'true' } }))}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer
                          ${aktiv ? aktivKlasse : 'border-line text-muted hover:border-line-input'}`}>
                        {label}
                      </button>
                    );
                  })}
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
            <Photo className="aspect-[16/7] rounded-[14px] border border-dashed border-line-input" icon={<Camera size={26} strokeWidth={1.6} />}>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
                <span className="text-sm font-bold text-muted">Bilde-opplasting kommer snart</span>
                <span className="text-xs font-medium text-muted-2">Lagre bilder som vedlegg til PDF inntil videre</span>
              </div>
            </Photo>
          </Seksjon>

        </div>

        {/* ── Høyre sidebar ─────────────────────────────────────────── */}
        <div className="sticky top-6 space-y-4">
          <div className="bg-surface border border-line rounded-[20px] p-[22px]">
            <div className="flex items-center gap-2 mb-4">
              <IconTile tone="mint" size={28} radius={9}><ClipboardList size={14} /></IconTile>
              <div className="text-[11px] font-extrabold text-muted-2 uppercase tracking-widest">Status</div>
            </div>

            <div>
              <DataRow label="Type" value={erInn ? 'Innflytting' : 'Utflytting'} />
              <DataRow label="Dato" value={prot.dato || '—'} />
              <DataRow label="Sjekkliste" value={`${sjekketAntall} / ${prot.sjekkliste.length}`}
                valueClass={ukjekket > 0 ? 'text-amber' : 'text-brand-ink'} />
              <DataRow label="Bemerkninger" value={prot.bemerkninger.length}
                valueClass={prot.bemerkninger.length > 0 ? 'text-danger' : 'text-ink'} />
              <DataRow label="Inventar" value={`${prot.inventar.length} gjenstander`}
                last={!(!erInn && totaltOppgjor > 0)} />
              {!erInn && totaltOppgjor > 0 && (
                <DataRow label="Totalt krav" value={oppgjorKr(totaltOppgjor)} valueClass="text-amber" last />
              )}
            </div>

            <div className="h-px bg-line-soft my-4" />

            {/* Sjekkliste-progress */}
            <div>
              <div className="flex justify-between text-[12.5px] font-bold text-muted-2 mb-2">
                <span>Sjekkliste fullført</span>
                <span className="num">{sjekkProsent}%</span>
              </div>
              <div className="h-1.5 bg-line-soft rounded-full overflow-hidden">
                <div className="h-full bg-brand rounded-full transition-all duration-300"
                  style={{ width: `${sjekkProsent}%` }} />
              </div>
            </div>

            <div className="h-px bg-line-soft my-4" />

            <div className="space-y-2">
              <Button variant="secondary" className="w-full justify-center" onClick={lagre}>
                {lagret ? <><CheckCircle2 size={14} className="text-brand-ink" /> Lagret!</> : 'Lagre utkast'}
              </Button>
              <Button variant="primary" className="w-full justify-center" onClick={lastNed} disabled={genererer}>
                <Download size={14} /> {genererer ? 'Genererer...' : 'Last ned PDF'}
              </Button>
            </div>
          </div>

          {prot.bemerkninger.length > 0 && (
            <div className="bg-danger/[0.05] border border-danger/20 rounded-[18px] p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={14} className="text-danger shrink-0" />
                <div className="text-[12.5px] font-extrabold text-danger">
                  {prot.bemerkninger.length} bemerkning{prot.bemerkninger.length > 1 ? 'er' : ''} registrert
                </div>
              </div>
              <div className="text-xs font-medium text-danger/70 pl-6">
                Bemerkninger dokumenterer feil og mangler — viktig ved depositumtvister.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
