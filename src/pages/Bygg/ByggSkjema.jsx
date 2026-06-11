import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Plus, Trash2, ArrowLeft, Info, FileText, Home, ChevronRight, Receipt,
  Pencil, Check, BarChart3, Download, ImagePlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Pill, PageHeader, SectionCard, IconTile } from '../../components/ui/kit';
import { formatKr, formatPct, calcTerminbelop, postnummerTilPoststed } from '../../utils/format';
import { exportExcel, exportPDF, exportByggelaanExcel, exportByggelaanPDF } from '../../utils/export';
import AIAnalyse from '../../components/AIAnalyse';

const BYGNINGSTYPER = [
  { value: 'enebolig', label: 'Enebolig' },
  { value: 'tomannsbolig', label: 'Tomannsbolig' },
  { value: 'leilighetsbygg', label: 'Leilighetsbygg' },
  { value: 'naering', label: 'Næring' },
];

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-bold rounded-xl transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-mint text-brand-ink'
          : 'text-muted hover:text-ink-2 hover:bg-line-soft'
        }`}
    >
      {children}
    </button>
  );
}

function SeksjonHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-7 first:mt-0">
      <span className="text-[11px] font-bold text-muted-2 uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}

function OppsummeringsRad({ label, value, color = 'default', large = false }) {
  const colors = { default: 'text-ink', green: 'text-brand-ink', red: 'text-danger', yellow: 'text-amber' };
  return (
    <div className={`flex justify-between items-center ${large ? 'py-3' : 'py-2'}`}>
      <span className={`text-sm ${large ? 'font-bold text-ink' : 'font-medium text-muted'}`}>{label}</span>
      <span className={`font-extrabold num ${large ? 'text-lg' : 'text-sm'} ${colors[color]}`}>{value}</span>
    </div>
  );
}

// Liten ramme rundt en utregnet verdi (erstatter de gamle grå info-boksene)
function VerdiBoks({ label, value, tone = 'sand' }) {
  const tones = {
    sand: 'border-line bg-sand text-ink',
    amber: 'border-amber-line bg-amber-soft text-amber',
    mint: 'border-mint-line bg-mint-soft text-brand-ink',
  };
  return (
    <div className={`border rounded-xl px-4 py-2.5 ${tones[tone]}`}>
      <span className="text-xs font-semibold text-muted-2">{label}</span>
      <div className="text-sm font-extrabold num">{value}</div>
    </div>
  );
}

const defaultByggData = {
  gatenavn: '', gatenummer: '', postnummer: '', poststed: '',
  gardsnummer: '', bruksnummer: '', byggeaar: '', bygningstype: '',
  antallEtasjer: '', beskrivelse: '', bilde: '',
  leieinntekter: [{ id: 1, navn: '', belop: '' }],
  laanModus: 'manuell',
  terminbelop: '',
  laanebelop: '', rentesats: '', nedbetalingstid: '',
  kommunaleAvgifter: '', internett: '', husforsikring: '', alarm: '',
  strom: '', leieInkludererStrom: false, forventetStromMnd: '',
  tilleggskostnader: [],
  vedlikeholdProsent: '3',
  kjoepesum: '', oppussing: '', oppussingVedlikehold: '', nyTakst: '',
  pristigningLeie: '1.5', pristigningKostnader: '1.5',
  verdistigning: '4', utleiegrad: '95',
  skattemodus: 'privat',
  regnskapsforer: '', styrehonorar: '',
  oppussingsbudsjett: '',
  oppussingsposter: [],
  uforutsettProsent: '15',
  brukByggelaan: false,
  byggelaanMnd: '',
  byggelaanRente: '6',
  byggelaanEtablering: '10000',
};

// Felles beregning av byggelånsbudsjett — brukes både i UI og eksport
// eslint-disable-next-line react-refresh/only-export-components -- ren beregningsfunksjon som hører naturlig sammen med skjemaet
export function beregnByggelaanBudsjett(form) {
  const poster = form.oppussingsposter || [];
  const sumBudsjettert = poster.reduce((s, p) => s + Number(p.budsjettert || 0), 0);
  const sumFaktisk = poster.reduce((s, p) => s + Number(p.faktisk || 0), 0);
  const ufProsent = Number(form.uforutsettProsent || 0);
  const uforutsett = sumBudsjettert * ufProsent / 100;
  const grunnlag = sumBudsjettert + uforutsett;
  const brukBL = !!form.brukByggelaan;
  const blMnd = Number(form.byggelaanMnd || 0);
  const blRente = Number(form.byggelaanRente || 0);
  // Byggelånsrenter: snitt 50 % opptrekk over byggeperioden (bransjestandard for budsjett)
  const byggelaanRenter = brukBL ? grunnlag * (blRente / 100) * (blMnd / 12) * 0.5 : 0;
  // Etableringsgebyr: bankens oppstartskostnad for byggelånet (fast sum)
  const etableringsgebyr = brukBL ? Number(form.byggelaanEtablering || 0) : 0;
  const totalBudsjett = sumBudsjettert + uforutsett + byggelaanRenter + etableringsgebyr;
  return { sumBudsjettert, sumFaktisk, ufProsent, uforutsett, grunnlag, brukBL, blMnd, blRente, byggelaanRenter, etableringsgebyr, totalBudsjett };
}

const OPPUSSING_TYPER = [
  { value: 'vedlikehold', label: 'Vedlikehold' },
  { value: 'paakostning', label: 'Påkostning' },
];
const OPPUSSING_STATUS = [
  { value: 'planlagt', label: 'Planlagt' },
  { value: 'paagaaende', label: 'Pågående' },
  { value: 'fullfort', label: 'Fullført' },
];
// Statusfarger fra tokens: planlagt = dempet, pågående = amber, fullført = teal
const STATUS_FARGE = { planlagt: '#8A938D', paagaaende: '#B97D10', fullfort: '#0E9384' };
const ROM_FORSLAG = ['Bad', 'Kjøkken', 'Stue', 'Soverom', 'Gang / entré', 'Vaskerom', 'Bod', 'Fasade', 'Tak', 'Vinduer', 'Elektro', 'Rør / VVS', 'Gulv', 'Maling', 'Utomhus', 'Generelt'];
const LEVERANDOR_FORSLAG = ['Rørlegger', 'Elektriker', 'Snekker / tømrer', 'Maler', 'Murer', 'Flislegger', 'Byggmester', 'Taktekker', 'Gulvlegger', 'Anleggsgartner', 'Eget arbeid', 'Annet'];

// ─── Oppussing-fane ───────────────────────────────────────────────────────────
function OppussingTab({ form, set, oppdater }) {
  const [undertab, setUndertab] = useState('kostnader'); // 'kostnader' | 'oversikt'
  const [grupperEtter, setGrupperEtter] = useState('rom');
  const [apenGruppe, setApenGruppe] = useState(null);
  const TOM_NY = { beskrivelse: '', rom: '', leverandor: '', type: 'vedlikehold', status: 'planlagt', budsjettert: '', faktisk: '', dato: '' };
  const [ny, setNy] = useState(TOM_NY);
  const [redigerer, setRedigerer] = useState(null);

  const poster = form.oppussingsposter || [];
  const leverandorListe = [...new Set([...LEVERANDOR_FORSLAG, ...poster.map((p) => (p.leverandor || '').trim()).filter(Boolean)])];
  const settNy = (felt) => (e) => setNy((s) => ({ ...s, [felt]: e.target.value }));
  function leggTil() {
    if (!ny.beskrivelse.trim() && !ny.budsjettert && !ny.faktisk) return;
    oppdater('add', null, null, { ...ny, id: Date.now() });
    setNy(TOM_NY);
  }
  const sumBudsjettert = poster.reduce((s, p) => s + Number(p.budsjettert || 0), 0);
  const sumFaktisk = poster.reduce((s, p) => s + Number(p.faktisk || 0), 0);
  const avvik = sumFaktisk - sumBudsjettert;

  // Skattefordeling
  const vedlBud = poster.filter((p) => p.type === 'vedlikehold').reduce((s, p) => s + Number(p.budsjettert || 0), 0);
  const vedlFak = poster.filter((p) => p.type === 'vedlikehold').reduce((s, p) => s + Number(p.faktisk || 0), 0);
  const paaBud = poster.filter((p) => p.type === 'paakostning').reduce((s, p) => s + Number(p.budsjettert || 0), 0);
  const paaFak = poster.filter((p) => p.type === 'paakostning').reduce((s, p) => s + Number(p.faktisk || 0), 0);

  // Gruppering for oversikt
  const GRUPPE_FELT = { rom: 'rom', leverandor: 'leverandor', type: 'type' };
  const GRUPPE_LABEL = { rom: 'Rom', leverandor: 'Leverandør', type: 'Type' };
  const TYPE_LABEL = { vedlikehold: 'Vedlikehold', paakostning: 'Påkostning' };
  function grupper() {
    const felt = GRUPPE_FELT[grupperEtter];
    const map = {};
    poster.forEach((p) => {
      let navn = (p[felt] || '').toString().trim();
      if (felt === 'type') navn = TYPE_LABEL[p.type] || p.type;
      if (!navn) navn = `Uten ${GRUPPE_LABEL[grupperEtter].toLowerCase()}`;
      map[navn] ||= { navn, budsjettert: 0, faktisk: 0, antall: 0, poster: [] };
      map[navn].budsjettert += Number(p.budsjettert || 0);
      map[navn].faktisk += Number(p.faktisk || 0);
      map[navn].antall += 1;
      map[navn].poster.push(p);
    });
    return Object.values(map).sort((a, b) => b.faktisk - a.faktisk || b.budsjettert - a.budsjettert);
  }
  const grupper_ = grupper();
  const maxFak = Math.max(1, ...grupper_.map((g) => Math.max(g.faktisk, g.budsjettert)));

  // Komplett byggelånsbudsjett (linjer + uforutsett + byggelånsrenter)
  const bb = beregnByggelaanBudsjett(form);
  const totalBudsjett = bb.totalBudsjett;
  const bPst = totalBudsjett > 0 ? (sumFaktisk / totalBudsjett) * 100 : 0;
  // Fremdriftsfarge: over budsjett = danger, nær = amber, ellers teal
  const bFarge = bPst > 100 ? '#C2410C' : bPst >= 75 ? '#B97D10' : '#0E9384';

  const adresse = `${form.gatenavn || ''} ${form.gatenummer || ''}, ${form.poststed || ''}`.trim();

  return (
    <div className="space-y-4">
      {/* Sammendrag — alltid synlig */}
      <SectionCard
        tittel="Byggelånsbudsjett"
        action={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => exportByggelaanExcel(form, adresse)}>
              <Download size={13} /> Excel
            </Button>
            <Button type="button" variant="amber" size="sm" onClick={() => exportByggelaanPDF(form, adresse)}>
              <Download size={13} /> PDF for banken
            </Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {/* Venstre: budsjett-oppbygging */}
          <div className="space-y-0.5">
            <OppsummeringsRad label="Kostnadslinjer" value={formatKr(sumBudsjettert)} />
            <OppsummeringsRad label={`Uforutsett (${bb.ufProsent} %)`} value={formatKr(bb.uforutsett)} />
            {bb.brukBL && <OppsummeringsRad label={`Byggelånsrenter (${bb.blMnd} mnd)`} value={formatKr(bb.byggelaanRenter)} />}
            {bb.brukBL && bb.etableringsgebyr > 0 && <OppsummeringsRad label="Etableringsgebyr" value={formatKr(bb.etableringsgebyr)} />}
            <div className="border-t border-line mt-1 pt-1">
              <OppsummeringsRad label="Totalbudsjett" value={formatKr(totalBudsjett)} large />
            </div>
          </div>
          {/* Høyre: faktisk-status */}
          <div className="space-y-0.5">
            <OppsummeringsRad label="Faktisk brukt" value={formatKr(sumFaktisk)} color={sumFaktisk > totalBudsjett && totalBudsjett > 0 ? 'red' : 'default'} />
            <OppsummeringsRad label="Gjenstår av budsjett" value={formatKr(totalBudsjett - sumFaktisk)} color={totalBudsjett - sumFaktisk < 0 ? 'red' : 'green'} />
            <OppsummeringsRad label="Avvik linjer (faktisk − budsj.)" value={formatKr(avvik)} color={avvik > 0 ? 'red' : avvik < 0 ? 'green' : 'default'} />
          </div>
        </div>
        {totalBudsjett > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-muted">Brukt av totalbudsjett</span>
              <span className="num" style={{ color: bFarge }}>{formatPct(bPst)}</span>
            </div>
            <div className="h-2.5 bg-line rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, bPst)}%`, background: bFarge }} />
            </div>
            {bPst > 100 && <p className="text-xs font-semibold text-danger mt-1.5">Totalbudsjettet er overskredet med {formatKr(sumFaktisk - totalBudsjett)}.</p>}
          </div>
        )}
      </SectionCard>

      {/* Under-faner */}
      <div className="flex gap-2">
        <TabBtn active={undertab === 'kostnader'} onClick={() => setUndertab('kostnader')}>Kostnadslinjer</TabBtn>
        <TabBtn active={undertab === 'oversikt'} onClick={() => setUndertab('oversikt')}>Oversikt</TabBtn>
      </div>

      {/* ── Kostnadslinjer ── */}
      {undertab === 'kostnader' && (
        <SectionCard>
          <datalist id="rom-forslag">{ROM_FORSLAG.map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id="lev-forslag">{leverandorListe.map((r) => <option key={r} value={r} />)}</datalist>

          {/* Legg til kostnad */}
          <div className="rounded-[14px] border border-line bg-sand p-4">
            <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider mb-3">Legg til kostnad</div>
            <div className="space-y-3">
              <Input label="Hva gjelder kostnaden?" value={ny.beskrivelse} onChange={settNy('beskrivelse')}
                placeholder="f.eks. Oppsett rør på bad og varmtvannstank" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input label="Rom" value={ny.rom} onChange={settNy('rom')} list="rom-forslag" placeholder="Bad" />
                <Input label="Leverandør" value={ny.leverandor} onChange={settNy('leverandor')} list="lev-forslag" placeholder="Rørlegger" />
                <Select label="Type" value={ny.type} onChange={settNy('type')} options={OPPUSSING_TYPER} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                <Input label="Budsjettert" type="number" value={ny.budsjettert} onChange={settNy('budsjettert')} placeholder="0" suffix="kr" />
                <Input label="Faktisk" type="number" value={ny.faktisk} onChange={settNy('faktisk')} placeholder="0" suffix="kr" />
                <Button type="button" onClick={leggTil}><Plus size={15} /> Legg til</Button>
              </div>
            </div>
          </div>

          {/* Registrerte kostnader */}
          {poster.length === 0 ? (
            <p className="text-muted text-sm font-medium mt-4">Ingen kostnader ennå. Legg til den første over.</p>
          ) : (
            <div className="mt-5">
              <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider mb-2">Registrerte kostnader · {poster.length}</div>
              <div className="space-y-2">
                {poster.map((p, i) => {
                  const erRed = redigerer === p.id;
                  const fak = Number(p.faktisk || 0); const bud = Number(p.budsjettert || 0);
                  const pOver = fak > bud && bud > 0;
                  if (erRed) {
                    return (
                      <div key={p.id} className="rounded-[14px] border border-brand/30 bg-sand p-4 space-y-3">
                        <Input label="Hva gjelder kostnaden?" value={p.beskrivelse} onChange={(e) => oppdater('edit', i, 'beskrivelse', e.target.value)} placeholder="Forklaring" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <Input label="Rom" value={p.rom} onChange={(e) => oppdater('edit', i, 'rom', e.target.value)} list="rom-forslag" placeholder="Bad" />
                          <Input label="Leverandør" value={p.leverandor} onChange={(e) => oppdater('edit', i, 'leverandor', e.target.value)} list="lev-forslag" placeholder="Rørlegger" />
                          <Select label="Type" value={p.type} onChange={(e) => oppdater('edit', i, 'type', e.target.value)} options={OPPUSSING_TYPER} />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <Input label="Budsjettert" type="number" value={p.budsjettert} onChange={(e) => oppdater('edit', i, 'budsjettert', e.target.value)} placeholder="0" suffix="kr" />
                          <Input label="Faktisk" type="number" value={p.faktisk} onChange={(e) => oppdater('edit', i, 'faktisk', e.target.value)} placeholder="0" suffix="kr" />
                          <Select label="Status" value={p.status} onChange={(e) => oppdater('edit', i, 'status', e.target.value)} options={OPPUSSING_STATUS} />
                          <Input label="Dato" type="date" value={p.dato} onChange={(e) => oppdater('edit', i, 'dato', e.target.value)} />
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <button type="button" onClick={() => { oppdater('remove', i); setRedigerer(null); }}
                            className="text-xs font-bold text-danger hover:underline flex items-center gap-1 cursor-pointer"><Trash2 size={13} /> Slett kostnad</button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setRedigerer(null)}><Check size={14} /> Ferdig</Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-[13px] border border-line bg-surface px-3 py-2.5 hover:border-line-input transition-colors">
                      <div className="min-w-0 flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: STATUS_FARGE[p.status] || '#B5BCB6' }}
                          title={OPPUSSING_STATUS.find((s) => s.value === p.status)?.label} />
                        <div className="min-w-0">
                          <div className="text-sm text-ink font-bold truncate">{p.beskrivelse || 'Uten navn'}</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {p.rom && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-line-soft text-muted border border-line">{p.rom}</span>}
                            {p.leverandor && <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-line-soft text-muted border border-line">{p.leverandor}</span>}
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${p.type === 'vedlikehold' ? 'bg-mint text-brand-ink' : 'bg-line-soft text-muted'}`}>{TYPE_LABEL[p.type] || p.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="text-right num text-xs mr-1">
                          <div className={`font-bold ${pOver ? 'text-danger' : 'text-ink'}`}>{formatKr(fak)}</div>
                          <div className="text-muted-2">av {formatKr(bud)}</div>
                        </div>
                        <button type="button" onClick={() => setRedigerer(p.id)} title="Rediger"
                          className="p-2 text-muted-2 hover:text-brand-ink hover:bg-line-soft rounded-md transition-all cursor-pointer"><Pencil size={14} /></button>
                        <button type="button" onClick={() => oppdater('remove', i)} title="Slett"
                          className="p-2 text-muted-2 hover:text-danger hover:bg-danger/[0.08] rounded-md transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uforutsett + byggelån */}
          <div className="mt-6 pt-5 border-t border-line space-y-5">
            <div>
              <SeksjonHeader>Uforutsett</SeksjonHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <Input label="Uforutsett buffer (% av budsjetterte linjer)" type="number" value={form.uforutsettProsent}
                  onChange={set('uforutsettProsent')} placeholder="15" suffix="%" />
                <VerdiBoks label="Uforutsett beløp" value={formatKr(bb.uforutsett)} />
              </div>
              <p className="text-xs font-medium text-muted-2 mt-2">Banken forventer en buffer for uforutsette kostnader. 10–15 % er vanlig.</p>
            </div>

            <div>
              <SeksjonHeader>Byggelån</SeksjonHeader>
              <Toggle checked={!!form.brukByggelaan} onChange={(e) => set('brukByggelaan')({ target: { value: e.target.checked } })} label="Prosjektet finansieres med byggelån" />
              {form.brukByggelaan && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 items-center">
                  <Input label="Byggeperiode (måneder)" type="number" value={form.byggelaanMnd}
                    onChange={set('byggelaanMnd')} placeholder="6" suffix="mnd" />
                  <Input label="Byggelånsrente" type="number" value={form.byggelaanRente}
                    onChange={set('byggelaanRente')} placeholder="6" suffix="%" />
                  <Input label="Etableringsgebyr (fast sum)" type="number" value={form.byggelaanEtablering}
                    onChange={set('byggelaanEtablering')} placeholder="10000" suffix="kr" />
                  <VerdiBoks label="Estimerte byggelånsrenter" value={formatKr(bb.byggelaanRenter)} />
                </div>
              )}
              {form.brukByggelaan && (
                <p className="text-xs font-medium text-muted-2 mt-2">
                  Byggelånsrenter beregnes med snitt 50 % opptrekk over byggeperioden (bransjestandard). Etableringsgebyret er bankens oppstartskostnad — en fast sum, vanligvis 8 000–15 000 kr.
                </p>
              )}
            </div>
          </div>
        </SectionCard>
      )}

      {/* ── Oversikt ── */}
      {undertab === 'oversikt' && (
        <div className="space-y-4">
          {poster.length === 0 ? (
            <SectionCard><p className="text-muted text-sm font-medium">Legg inn kostnadslinjer for å se fordelingen her.</p></SectionCard>
          ) : (
            <>
              <SectionCard
                tittel="Fordeling"
                action={
                  <div className="flex gap-1 bg-sand border border-line rounded-xl p-1">
                    {Object.keys(GRUPPE_LABEL).map((k) => (
                      <button key={k} type="button" onClick={() => { setGrupperEtter(k); setApenGruppe(null); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer
                          ${grupperEtter === k ? 'bg-mint text-brand-ink' : 'text-muted-2 hover:text-ink-2'}`}>
                        {GRUPPE_LABEL[k]}
                      </button>
                    ))}
                  </div>
                }
              >
                <div className="space-y-2">
                  {grupper_.map((g) => {
                    const over = g.faktisk > g.budsjettert && g.budsjettert > 0;
                    const apen = apenGruppe === g.navn;
                    return (
                      <div key={g.navn} className="rounded-[13px] border border-line overflow-hidden">
                        {/* Gruppe-header (klikkbar) */}
                        <button type="button" onClick={() => setApenGruppe(apen ? null : g.navn)}
                          className="w-full text-left px-3 py-2.5 hover:bg-line-soft transition-colors cursor-pointer">
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="flex items-center gap-1.5 text-ink font-bold">
                              <ChevronRight size={13} className={`text-muted-2 transition-transform ${apen ? 'rotate-90' : ''}`} />
                              {g.navn} <span className="text-muted-2 font-medium">· {g.antall} {g.antall === 1 ? 'post' : 'poster'}</span>
                            </span>
                            <span className="num text-xs font-bold">
                              <span className="text-ink-2">{formatKr(g.faktisk)}</span>
                              <span className="text-muted-2 font-medium"> / {formatKr(g.budsjettert)}</span>
                            </span>
                          </div>
                          <div className="relative h-2 bg-line rounded-full overflow-hidden ml-[18px]">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-faint-2" style={{ width: `${(g.budsjettert / maxFak) * 100}%` }} />
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(g.faktisk / maxFak) * 100}%`, background: over ? '#C2410C' : '#0E9384' }} />
                          </div>
                        </button>

                        {/* Drilldown — alle kostnader i gruppen */}
                        {apen && (
                          <div className="border-t border-line divide-y divide-line-soft bg-sand">
                            {g.poster.map((p) => {
                              // Vis komplementære detaljer (ikke den vi grupperer på)
                              const meta = [
                                grupperEtter !== 'rom' && p.rom,
                                grupperEtter !== 'leverandor' && p.leverandor,
                                grupperEtter !== 'type' && (TYPE_LABEL[p.type] || p.type),
                              ].filter(Boolean).join(' · ');
                              const pOver = Number(p.faktisk || 0) > Number(p.budsjettert || 0) && Number(p.budsjettert || 0) > 0;
                              return (
                                <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5 pl-[30px]">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-ink truncate">{p.beskrivelse || 'Uten beskrivelse'}</span>
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_FARGE[p.status] }} title={OPPUSSING_STATUS.find((s) => s.value === p.status)?.label} />
                                    </div>
                                    {meta && <div className="text-xs font-medium text-muted-2 mt-0.5">{meta}</div>}
                                  </div>
                                  <div className="text-right shrink-0 num text-xs">
                                    <div className={`font-bold ${pOver ? 'text-danger' : 'text-ink-2'}`}>{formatKr(Number(p.faktisk || 0))}</div>
                                    <div className="text-muted-2">av {formatKr(Number(p.budsjettert || 0))}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-line text-xs font-semibold text-muted-2">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-brand" /> Faktisk</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-faint-2" /> Budsjettert</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-danger" /> Over budsjett</span>
                </div>
              </SectionCard>

              {/* Skattemessig fordeling — budsjettert + faktisk */}
              <SectionCard tittel="Skattemessig fordeling">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-[14px] border border-mint-line bg-mint-soft p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-ink">Vedlikehold</span>
                      <Pill tone="mint">Fradragsberettiget</Pill>
                    </div>
                    <div className="flex justify-between text-sm"><span className="font-medium text-muted">Budsjettert</span><span className="num font-bold text-ink-2">{formatKr(vedlBud)}</span></div>
                    <div className="flex justify-between text-sm mt-1"><span className="font-medium text-muted">Faktisk</span><span className="num text-brand-ink font-extrabold">{formatKr(vedlFak)}</span></div>
                    <p className="text-xs font-medium text-muted mt-2">Reduserer skatten med ca. {formatKr(vedlFak * 0.22)} (22 %).</p>
                  </div>
                  <div className="rounded-[14px] border border-line bg-sand p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-ink">Påkostning</span>
                      <Pill tone="muted">Ikke fradragsberettiget</Pill>
                    </div>
                    <div className="flex justify-between text-sm"><span className="font-medium text-muted">Budsjettert</span><span className="num font-bold text-ink-2">{formatKr(paaBud)}</span></div>
                    <div className="flex justify-between text-sm mt-1"><span className="font-medium text-muted">Faktisk</span><span className="num text-ink-2 font-extrabold">{formatKr(paaFak)}</span></div>
                    <p className="text-xs font-medium text-muted mt-2">Øker boligens inngangsverdi og reduserer gevinstskatt ved salg.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 p-3 mt-3 rounded-[13px] border border-mint-line bg-mint-soft text-xs font-medium text-brand-ink leading-relaxed">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>Faktiske vedlikeholdskostnader brukes automatisk som fradrag i skatterapporten. Påkostning aktiveres på kostprisen.</span>
                </div>
              </SectionCard>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Beregn full låneplan år for år
function calcLoanSchedule(laan, rentesats, aar, years = 10) {
  if (!laan || !rentesats || !aar || laan <= 0 || rentesats <= 0 || aar <= 0) {
    return Array.from({ length: years }, () => ({ renter: 0, avdrag: 0, balance: Number(laan || 0) }));
  }
  const r = rentesats / 100 / 12;
  const terminbelop = calcTerminbelop(laan, rentesats, aar);
  const schedule = [];
  let balance = laan;
  for (let y = 0; y < years; y++) {
    let aarligRenter = 0;
    let aarligAvdrag = 0;
    for (let m = 0; m < 12; m++) {
      if (balance <= 0) break;
      const mRenter = balance * r;
      const mAvdrag = Math.min(terminbelop - mRenter, balance);
      aarligRenter += mRenter;
      aarligAvdrag += mAvdrag;
      balance -= mAvdrag;
    }
    schedule.push({ renter: Math.round(aarligRenter), avdrag: Math.round(aarligAvdrag), balance: Math.max(0, Math.round(balance)) });
  }
  return schedule;
}

// Formater tall kompakt for tabell
function fmtT(v) {
  if (v === null || v === undefined || isNaN(v)) return '—';
  const abs = Math.abs(Math.round(v));
  const formatted = abs.toLocaleString('nb-NO');
  return (v < 0 ? '-' : '') + formatted;
}

function PrognoseTabell({ form, totalLeie, faste, vedlikeholdKr }) {
  const YEARS = 10;
  const laan = Number(form.laanebelop || 0);
  const rentesats = Number(form.rentesats || 0);
  const nedbet = Number(form.nedbetalingstid || 0);
  const loanSchedule = form.laanModus === 'kalkulert'
    ? calcLoanSchedule(laan, rentesats, nedbet, YEARS)
    : Array.from({ length: YEARS }, () => ({ renter: 0, avdrag: 0, balance: laan }));

  const kjoepesumP = Number(form.kjoepesum || 0);
  const nyTakstP = Number(form.nyTakst || 0);
  // Startverdi = ny takst hvis fylt inn, ellers kjøpesum
  const startVerdi = nyTakstP > 0 ? nyTakstP : kjoepesumP;
  const verdistigning = Number(form.verdistigning || 4) / 100;
  const utleiegrad = Number(form.utleiegrad || 95) / 100;
  const pristigningLeie = Number(form.pristigningLeie || 1.5) / 100;
  const pristigningKostn = Number(form.pristigningKostnader || 1.5) / 100;
  const skattemodus = form.skattemodus || 'privat';

  const rows = [];
  let bruttoLeie = totalLeie * 12;
  let akkKontantstrøm = 0;
  // Vedlikeholdsfradrag fra oppussing – brukes opp mot skattepliktig inntekt år for år
  let gjenværendeVedlikehold = Number(form.oppussingVedlikehold || 0);

  for (let y = 0; y < YEARS; y++) {
    if (y > 0) bruttoLeie *= (1 + pristigningLeie);

    const ledighet = bruttoLeie * (1 - utleiegrad);
    const nettoLeieInntekt = bruttoLeie - ledighet;
    const driftskostnader = (faste - vedlikeholdKr) * 12 * Math.pow(1 + pristigningKostn, y);
    const avsetningVedlikehold = vedlikeholdKr * 12 * Math.pow(1 + pristigningKostn, y);
    const nettoLeieinntekt = nettoLeieInntekt - driftskostnader - avsetningVedlikehold;

    const { renter, avdrag, balance } = loanSchedule[y];

    let skatt;
    let rentefradrag = 0;
    let vedlikeholdFradragBrukt;
    if (skattemodus === 'privat') {
      const bruttoskattepliktig = Math.max(0, nettoLeieinntekt);
      vedlikeholdFradragBrukt = Math.min(gjenværendeVedlikehold, bruttoskattepliktig);
      gjenværendeVedlikehold -= vedlikeholdFradragBrukt;
      skatt = Math.max(0, bruttoskattepliktig - vedlikeholdFradragBrukt) * 0.22;
      rentefradrag = renter * 0.22;
    } else {
      const bruttoskattepliktig = Math.max(0, nettoLeieinntekt - renter);
      vedlikeholdFradragBrukt = Math.min(gjenværendeVedlikehold, bruttoskattepliktig);
      gjenværendeVedlikehold -= vedlikeholdFradragBrukt;
      skatt = Math.max(0, bruttoskattepliktig - vedlikeholdFradragBrukt) * 0.22;
    }

    const kontantstrøm = nettoLeieinntekt - renter - avdrag - skatt + rentefradrag;
    const kontantstroemUtenSkatt = nettoLeieinntekt - renter - avdrag;
    akkKontantstrøm += kontantstrøm;

    const boligverdi = startVerdi > 0 ? startVerdi * Math.pow(1 + verdistigning, y + 1) : 0;
    const boliglaan = balance;
    const ltv = boligverdi > 0 ? (boliglaan / boligverdi) * 100 : 0;
    const ekIEiendom = boligverdi - boliglaan;

    // Verdiskapning fra prisvekst (urealisert)
    const prisøkning = boligverdi > 0 ? boligverdi - startVerdi : 0;
    // Gjeld betalt ned siden start
    const avdragBetalt = laan - boliglaan;

    // Antatt opptjent EK: prisvekst + gjeldsnedbygging + akkumulert kontantstrøm
    const antattOpptjentEK = prisøkning + avdragBetalt + akkKontantstrøm;
    // Faktisk tjent: kun gjeldsnedbygging + akkumulert kontantstrøm (ingen urealisert verdistigning)
    const faktiskTjent = avdragBetalt + akkKontantstrøm;

    rows.push({
      bruttoLeie: Math.round(bruttoLeie),
      ledighet: Math.round(ledighet),
      driftskostnader: Math.round(driftskostnader),
      avsetningVedlikehold: Math.round(avsetningVedlikehold),
      nettoLeieinntekt: Math.round(nettoLeieinntekt),
      renter: Math.round(renter),
      avdrag: Math.round(avdrag),
      skatt: Math.round(skatt),
      rentefradrag: Math.round(rentefradrag),
      vedlikeholdFradrag: Math.round(vedlikeholdFradragBrukt),
      kontantstrøm: Math.round(kontantstrøm),
      kontantstroemUtenSkatt: Math.round(kontantstroemUtenSkatt),
      boligverdi: Math.round(boligverdi),
      boliglaan,
      ltv,
      ekIEiendom: Math.round(ekIEiendom),
      antattOpptjentEK: Math.round(antattOpptjentEK),
      faktiskTjent: Math.round(faktiskTjent),
    });
  }

  const radDef = [
    { key: 'bruttoLeie', label: 'Brutto leieinntekter', bold: false, color: null },
    { key: 'ledighet', label: 'Ledighet/vakanse', bold: false, color: null, negative: true },
    { key: 'driftskostnader', label: 'Driftskostnader', bold: false, color: null, negative: true },
    { key: 'avsetningVedlikehold', label: 'Avsetning vedlikehold', bold: false, color: null, negative: true },
    { key: 'nettoLeieinntekt', label: 'Netto leieinntekt', bold: true, color: 'green' },
    { key: 'divider1', divider: true },
    { key: 'renter', label: 'Rentekostnad', bold: false, color: null, negative: true },
    { key: 'avdrag', label: 'Avdrag', bold: false, color: null, negative: true },
    { key: 'vedlikeholdFradrag', label: 'Vedlikehold fradrag', bold: false, color: 'green', show: () => Number(form.oppussingVedlikehold || 0) > 0 },
    { key: 'skatt', label: 'Skatt', bold: false, color: null, negative: true },
    { key: 'rentefradrag', label: 'Rentefradrag', bold: false, color: 'green', show: () => skattemodus === 'privat' },
    { key: 'divider2', divider: true },
    { key: 'kontantstrøm', label: 'Kontantstrøm', bold: true, color: 'dynamic' },
    { key: 'kontantstroemUtenSkatt', label: 'Kontantstrøm u/skatt', bold: false, color: 'dynamic-sub' },
    { key: 'divider3', divider: true },
    { key: 'boligverdi', label: 'Forventet boligverdi', bold: true, color: 'yellow', show: () => kjoepesumP > 0 },
    { key: 'boliglaan', label: 'Boliglån (restgjeld)', bold: false, color: null, show: () => laan > 0 },
    { key: 'ltv', label: 'LTV', bold: false, color: null, isLtv: true, show: () => kjoepesumP > 0 && laan > 0 },
    { key: 'ekIEiendom', label: 'EK i eiendom', bold: false, color: null, show: () => kjoepesumP > 0 },
    { key: 'divider4', divider: true },
    { key: 'antattOpptjentEK', label: 'Antatt opptjent EK', bold: true, color: 'green', show: () => kjoepesumP > 0 },
    { key: 'faktiskTjent', label: 'Faktisk tjent', bold: true, color: 'dynamic' },
  ];

  const yearNums = Array.from({ length: YEARS }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-muted font-bold w-44 sticky left-0 bg-surface">Nøkkeltall</th>
            {yearNums.map((y) => (
              <th key={y} className="text-right py-2 px-3 text-muted font-bold">År {y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {radDef.map((rad) => {
            if (rad.divider) return (
              <tr key={rad.key}>
                <td colSpan={YEARS + 1} className="py-0">
                  <div className="h-px bg-line my-1" />
                </td>
              </tr>
            );
            if (rad.show && !rad.show()) return null;

            return (
              <tr key={rad.key} className="hover:bg-line-soft transition-colors">
                <td className={`py-1.5 px-3 sticky left-0 bg-surface ${rad.bold ? 'font-bold text-ink' : 'font-medium text-ink-2'}`}>
                  {rad.label}
                </td>
                {rows.map((row, i) => {
                  const val = row[rad.key];
                  let cls = 'text-ink';
                  if (rad.isLtv) {
                    const pct = Math.round(val);
                    cls = pct > 80 ? 'text-danger' : pct > 60 ? 'text-amber' : 'text-brand-ink';
                  } else if (rad.color === 'green') cls = 'text-brand-ink';
                  else if (rad.color === 'yellow') cls = 'text-amber';
                  else if (rad.color === 'dynamic') cls = val >= 0 ? 'text-brand-ink' : 'text-danger';
                  else if (rad.color === 'dynamic-sub') cls = val >= 0 ? 'text-brand-ink/70' : 'text-danger/70';
                  else if (rad.negative) cls = 'text-ink-2';

                  const display = rad.isLtv
                    ? `${Math.round(val)} %`
                    : fmtT(val);

                  return (
                    <td key={i} className={`py-1.5 px-3 text-right num ${rad.bold ? 'font-bold' : 'font-medium'} ${cls}`}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OversiktTab({ byggId, leieobjekter, kontrakter, fakturaer, addFaktura, deleteFaktura, navigate }) {
  const byggLeieobjekter = leieobjekter.filter((l) => l.byggId === byggId);
  const byggObjIds = new Set(byggLeieobjekter.map((l) => l.id));
  const byggKontrakter = kontrakter.filter((k) => byggObjIds.has(k.leieobjektId));
  const byggFakturaer = fakturaer.filter((f) => f.byggId === byggId).sort((a, b) => b.dato.localeCompare(a.dato));

  const [oversiktTab, setOversiktTab] = useState('leieforhold');
  const [visFakturaForm, setVisFakturaForm] = useState(false);
  const [fakturaForm, setFakturaForm] = useState({ dato: new Date().toISOString().slice(0, 10), mottaker: '', beskrivelse: '', belop: '', status: 'sendt' });

  function kontraktStatus(k) {
    if (k.kontraktstype === 'tidsubestemt') return { label: 'Aktiv', tone: 'mint' };
    if (!k.sluttdato) return { label: 'Aktiv', tone: 'mint' };
    const slutt = new Date(k.sluttdato);
    const nå = new Date();
    if (slutt < nå) return { label: 'Utløpt', tone: 'danger' };
    const dager = Math.round((slutt - nå) / 86400000);
    if (dager < 90) return { label: `Utløper om ${dager}d`, tone: 'amber' };
    return { label: 'Aktiv', tone: 'mint' };
  }

  function lagreFaktura(e) {
    e.preventDefault();
    addFaktura({ ...fakturaForm, byggId, belop: Number(fakturaForm.belop) });
    setFakturaForm({ dato: new Date().toISOString().slice(0, 10), mottaker: '', beskrivelse: '', belop: '', status: 'sendt' });
    setVisFakturaForm(false);
  }

  // Mappe statustone -> tekstfarge for små statuslinjer
  const toneTekst = { mint: 'text-brand-ink', amber: 'text-amber', danger: 'text-danger' };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-surface border border-line rounded-xl w-fit">
        {[['leieforhold', 'Leieforhold'], ['fakturaer', 'Fakturaer']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setOversiktTab(key)}
            className={`px-4 py-1.5 text-sm rounded-lg font-bold transition-all cursor-pointer
              ${oversiktTab === key ? 'bg-mint text-brand-ink' : 'text-muted hover:text-ink-2'}`}>
            {label}
          </button>
        ))}
      </div>

      {oversiktTab === 'leieforhold' && (
        <div>
          {byggKontrakter.length === 0 ? (
            <div className="bg-surface border border-line rounded-[18px] p-10 text-center">
              <IconTile tone="sand" size={48} radius={14} className="mx-auto mb-3"><FileText size={20} /></IconTile>
              <div className="text-sm font-bold text-ink mb-1">Ingen leieforhold registrert</div>
              <div className="text-xs font-medium text-muted-2">Gå til Kontrakter for å legge inn leieforhold</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {byggKontrakter.map((k) => {
                const obj = byggLeieobjekter.find((l) => l.id === k.leieobjektId);
                const { label, tone } = kontraktStatus(k);
                return (
                  <div key={k.id} className="bg-surface border border-line rounded-[18px] p-4 flex items-center gap-4 hover:border-line-input transition-colors cursor-pointer group"
                    onClick={() => navigate('/kontrakter')}>
                    <IconTile tone="mint" size={36}><Home size={15} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-ink">{k.leietakerNavn || '—'}</div>
                          <div className="text-xs font-medium text-muted-2 mt-0.5">{obj?.navn || obj?.type || 'Leieobjekt'}</div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="text-sm font-extrabold text-ink num">{k.manedsleie ? `${Number(k.manedsleie).toLocaleString('nb-NO')} kr` : '—'}</div>
                            <div className={`text-xs font-bold mt-0.5 ${toneTekst[tone]}`}>{label}</div>
                          </div>
                          <ChevronRight size={15} className="text-faint-2 group-hover:text-muted" />
                        </div>
                      </div>
                      {(k.startdato || k.sluttdato) && (
                        <div className="text-xs font-medium text-muted-2 mt-2 num">
                          {k.startdato && <span>{k.startdato}</span>}
                          {k.startdato && k.sluttdato && <span className="mx-1">→</span>}
                          {k.sluttdato ? <span>{k.sluttdato}</span> : <span>Løpende</span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {oversiktTab === 'fakturaer' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-muted-2">{byggFakturaer.length} faktura{byggFakturaer.length !== 1 ? 'er' : ''}</div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setVisFakturaForm((v) => !v)}>
              <Plus size={13} /> Ny faktura
            </Button>
          </div>

          {visFakturaForm && (
            <form onSubmit={lagreFaktura} className="bg-surface border border-line rounded-[18px] p-4 mb-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Dato" type="date" value={fakturaForm.dato} onChange={(e) => setFakturaForm((f) => ({ ...f, dato: e.target.value }))} required />
                <Input label="Mottaker" value={fakturaForm.mottaker} onChange={(e) => setFakturaForm((f) => ({ ...f, mottaker: e.target.value }))} placeholder="Navn på leietaker" required />
              </div>
              <Input label="Beskrivelse" value={fakturaForm.beskrivelse} onChange={(e) => setFakturaForm((f) => ({ ...f, beskrivelse: e.target.value }))} placeholder="Husleie januar 2026..." />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Beløp" type="number" value={fakturaForm.belop} onChange={(e) => setFakturaForm((f) => ({ ...f, belop: e.target.value }))} suffix="kr" required />
                <Select label="Status" value={fakturaForm.status} onChange={(e) => setFakturaForm((f) => ({ ...f, status: e.target.value }))}
                  options={[{ value: 'sendt', label: 'Sendt' }, { value: 'betalt', label: 'Betalt' }, { value: 'forfalt', label: 'Forfalt' }]} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" size="sm">Lagre faktura</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => setVisFakturaForm(false)}>Avbryt</Button>
              </div>
            </form>
          )}

          {byggFakturaer.length === 0 && !visFakturaForm ? (
            <div className="bg-surface border border-line rounded-[18px] p-10 text-center">
              <IconTile tone="sand" size={48} radius={14} className="mx-auto mb-3"><Receipt size={20} /></IconTile>
              <div className="text-sm font-bold text-ink mb-1">Ingen fakturaer ennå</div>
              <div className="text-xs font-medium text-muted-2">Logg fakturaer du har sendt ut for dette bygget</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {byggFakturaer.map((f) => {
                const statusTone = { sendt: 'muted', betalt: 'mint', forfalt: 'danger' };
                const statusLabel = { sendt: 'Sendt', betalt: 'Betalt', forfalt: 'Forfalt' };
                const tone = statusTone[f.status] || 'muted';
                return (
                  <div key={f.id} className="bg-surface border border-line rounded-[18px] p-4 flex items-center gap-4 hover:border-line-input transition-colors group">
                    <IconTile tone="sand" size={36}><Receipt size={15} /></IconTile>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-ink">{f.mottaker}</div>
                          <div className="text-xs font-medium text-muted-2 mt-0.5">{f.beskrivelse || '—'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-extrabold text-ink num">{Number(f.belop).toLocaleString('nb-NO')} kr</div>
                            <div className="text-xs font-medium text-muted-2 num mt-0.5">{f.dato}</div>
                          </div>
                          {tone === 'danger'
                            ? <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11.5px] font-extrabold bg-danger/10 text-danger">{statusLabel[f.status] || f.status}</span>
                            : <Pill tone={tone}>{statusLabel[f.status] || f.status}</Pill>}
                          <button type="button" onClick={() => deleteFaktura(f.id)} aria-label="Slett faktura"
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-2 hover:text-danger hover:bg-danger/[0.08] rounded-md transition-all cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ByggSkjema() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bygg, leieobjekter, kontrakter, addBygg, updateBygg, fakturaer, addFaktura, deleteFaktura } = useApp();

  const existing = id ? bygg.find((b) => b.id === id) : null;
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState(() => existing ? { ...defaultByggData, ...existing } : defaultByggData);
  const [lagrer, setLagrer] = useState(false);
  const [lagrefeil, setLagrefeil] = useState('');

  // Leieinntekter
  const leieinntekter = form.leieinntekter || [{ id: 1, navn: '', belop: '' }];
  const totalLeie = leieinntekter.reduce((s, l) => s + Number(l.belop || 0), 0);
  const totalLeieAarlig = totalLeie * 12;

  // Lån
  const terminbelop = form.laanModus === 'kalkulert'
    ? calcTerminbelop(Number(form.laanebelop), Number(form.rentesats), Number(form.nedbetalingstid))
    : Number(form.terminbelop || 0);

  // Første måneds renter og avdrag (annuitet)
  const maanedligRente = Number(form.laanebelop || 0) * (Number(form.rentesats || 0) / 100 / 12);
  const maanedligAvdrag = terminbelop > 0 ? terminbelop - maanedligRente : 0;

  // Strøm: om leien inkluderer strøm telles forventet strøm som kostnad, ellers er strom en separat kostnad
  const stromKostnad = form.leieInkludererStrom
    ? Number(form.forventetStromMnd || 0)
    : Number(form.strom || 0);

  const faste = Number(form.kommunaleAvgifter || 0) + Number(form.internett || 0) +
    Number(form.husforsikring || 0) + Number(form.alarm || 0) + stromKostnad +
    (form.tilleggskostnader || []).reduce((s, t) => s + Number(t.belop || 0), 0);

  const vedlikeholdPst = Number(form.vedlikeholdProsent || 3) / 100;
  const vedlikeholdKr = totalLeie * vedlikeholdPst;
  const totalKostnader = terminbelop + faste + vedlikeholdKr +
    Number(form.regnskapsforer || 0) + Number(form.styrehonorar || 0);
  const netto = totalLeie - totalKostnader;

  // Investering: kjøpesum + oppussing (ny takst er IKKE kostnad, men verdimåler)
  const kjoepesum = Number(form.kjoepesum || 0);
  const oppussing = Number(form.oppussing || 0);
  const oppussingVedlikehold = Number(form.oppussingVedlikehold || 0); // fradragsberettiget del
  const nyTakst = Number(form.nyTakst || 0);
  const totalInvestering = kjoepesum + oppussing; // ny takst er ikke kostnad
  // Startverdi på boligen: ny takst hvis fylt inn, ellers kjøpesum
  const startBoligverdi = nyTakst > 0 ? nyTakst : kjoepesum;
  const verdiøkning = nyTakst > 0 ? nyTakst - kjoepesum : 0;

  // Yield: leieinntekt per år / total investering
  const yieldBase = totalInvestering;
  const yieldPct = yieldBase > 0 ? (totalLeieAarlig / yieldBase) * 100 : 0;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Postnummer-oppslag i selve handleren (ikke effect) — unngår ekstra render-runde
  const setPostnummer = (e) => {
    const postnummer = e.target.value;
    const sted = postnummer?.length === 4 ? postnummerTilPoststed(postnummer) : null;
    setForm((f) => ({ ...f, postnummer, ...(sted ? { poststed: sted } : {}) }));
  };

  const handleLeie = (action, idx, field, val) => {
    setForm((f) => {
      const list = [...(f.leieinntekter || [])];
      if (action === 'add') list.push({ id: Date.now(), navn: '', belop: '' });
      if (action === 'remove') list.splice(idx, 1);
      if (action === 'edit') list[idx] = { ...list[idx], [field]: val };
      return { ...f, leieinntekter: list };
    });
  };

  const handleTillegg = (action, idx, field, val) => {
    setForm((f) => {
      const list = [...(f.tilleggskostnader || [])];
      if (action === 'add') list.push({ id: Date.now(), navn: '', belop: '' });
      if (action === 'remove') list.splice(idx, 1);
      if (action === 'edit') list[idx] = { ...list[idx], [field]: val };
      return { ...f, tilleggskostnader: list };
    });
  };

  const handleOppussingspost = (action, idx, field, val) => {
    setForm((f) => {
      const list = [...(f.oppussingsposter || [])];
      if (action === 'add') {
        const grunn = { id: Date.now(), beskrivelse: '', rom: '', type: 'vedlikehold', budsjettert: '', faktisk: '', dato: '', leverandor: '', status: 'planlagt' };
        list.push(val && typeof val === 'object' ? { ...grunn, ...val } : grunn);
      }
      if (action === 'remove') list.splice(idx, 1);
      if (action === 'edit') list[idx] = { ...list[idx], [field]: val };
      return { ...f, oppussingsposter: list };
    });
  };

  const handleBilde = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, bilde: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLagrefeil('');
    setLagrer(true);
    try {
      if (existing) await updateBygg(id, form);
      else await addBygg(form);
      navigate('/bygg');
    } catch (err) {
      setLagrefeil(err.message || 'Kunne ikke lagre bygget. Prøv igjen.');
      setLagrer(false);
    }
  };

  const rentekostnad = form.laanModus === 'kalkulert'
    ? maanedligRente
    : terminbelop * 0.4;

  // ---- PRIVAT SKATT ----
  // Skattepliktig = Leieinntekt - Driftskostnader - Vedlikehold
  // Renter er IKKE del av utleieinntektsbeskatningen,
  // men gir et SEPARAT rentefradrag på 22% mot total kapitalinntekt
  const driftPrivat = faste + vedlikeholdKr; // fradragsberettigede kostnader for leie
  const skattepliktigPrivat = Math.max(0, totalLeie - driftPrivat);
  const skattPrivat = skattepliktigPrivat * 0.22;
  const rentefradragPrivat = rentekostnad * 0.22; // 22% fradrag på rentekostnader
  const nettoEtterSkattPrivat = netto - skattPrivat + rentefradragPrivat;

  // ---- SELSKAP (AS) SKATT ----
  // Renter er fradragsberettiget som driftskostnad i AS
  // Skattepliktig = Leieinntekt - Alle kostnader (inkl. renter)
  // Ingen personlig rentefradrag
  // Utbytte beskattes med 37.84% (aksjonærmodellen) etter selskapsskatt
  // Effektiv total ved utbytte: 1-(1-0.22)*(1-0.3784) ≈ 51.5%
  const driftSelskap = faste + vedlikeholdKr + rentekostnad
    + Number(form.regnskapsforer || 0) + Number(form.styrehonorar || 0);
  const skattepliktigSelskap = Math.max(0, totalLeie - driftSelskap);
  const skattSelskap = skattepliktigSelskap * 0.22;
  const nettoEtterSkattSelskap = netto - skattSelskap;
  // Utbytte-skatt: om man tar ut overskudd som utbytte
  const utbyttegrunnlag = Math.max(0, nettoEtterSkattSelskap);
  const utbytteskatt = utbyttegrunnlag * 0.3784;
  const nettoEtterUtbytte = utbyttegrunnlag - utbytteskatt;

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up">
      {/* Header */}
      <PageHeader
        tittel={existing ? 'Rediger bygg' : 'Nytt bygg'}
        undertittel={existing ? `${existing.gatenavn} ${existing.gatenummer}` : 'Registrer adresse, økonomi og lønnsomhetsanalyse.'}
      >
        <Button type="button" variant="ghost" onClick={() => navigate('/bygg')}>
          <ArrowLeft size={15} /> Tilbake
        </Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/bygg')}>Avbryt</Button>
        <Button type="submit" variant="primary" disabled={lagrer}>
          <Check size={15} strokeWidth={2.4} /> {lagrer ? 'Lagrer…' : existing ? 'Lagre endringer' : 'Opprett bygg'}
        </Button>
      </PageHeader>

      {lagrefeil && (
        <div className="mb-5 flex items-center gap-2.5 px-4 py-3 rounded-[13px] border border-danger/25 bg-danger/[0.06] text-sm font-semibold text-danger">
          <Info size={15} className="shrink-0" /> {lagrefeil}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <TabBtn active={tab === 'info'} onClick={() => setTab('info')}>Bygginformasjon</TabBtn>
        <TabBtn active={tab === 'oekonomi'} onClick={() => setTab('oekonomi')}>Inntekt og kostnader</TabBtn>
        <TabBtn active={tab === 'budsjett'} onClick={() => setTab('budsjett')}>Budsjett</TabBtn>
        {existing && <TabBtn active={tab === 'oppussing'} onClick={() => setTab('oppussing')}>Oppussing</TabBtn>}
        {existing && <TabBtn active={tab === 'oversikt'} onClick={() => setTab('oversikt')}>Oversikt</TabBtn>}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <SectionCard tittel="Bygginformasjon">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Gatenavn" value={form.gatenavn} onChange={set('gatenavn')} required placeholder="Kongens gate" />
            <Input label="Gatenummer" value={form.gatenummer} onChange={set('gatenummer')} required placeholder="12" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Postnummer" value={form.postnummer} onChange={setPostnummer} required placeholder="0150" />
              <Input label="Poststed" value={form.poststed} onChange={set('poststed')} required placeholder="Oslo" />
            </div>
            <Input label="Gårdsnummer" value={form.gardsnummer} onChange={set('gardsnummer')} placeholder="123" />
            <Input label="Bruksnummer" value={form.bruksnummer} onChange={set('bruksnummer')} placeholder="456" />
            <Input label="Byggeår" type="number" value={form.byggeaar} onChange={set('byggeaar')} placeholder="1985" />
            <Select
              label="Bygningstype"
              value={form.bygningstype}
              onChange={set('bygningstype')}
              options={BYGNINGSTYPER}
            />
            <Input label="Antall etasjer" type="number" value={form.antallEtasjer} onChange={set('antallEtasjer')} placeholder="3" />
          </div>

          <div className="mt-4">
            <Textarea label="Beskrivelse" value={form.beskrivelse} onChange={set('beskrivelse')} placeholder="Beskriv bygget..." rows={3} />
          </div>

          <div className="mt-4">
            <label className="text-[12.5px] font-bold text-muted block mb-2">Bilde</label>
            <div className="flex items-start gap-4">
              {form.bilde && (
                <img src={form.bilde} alt="Bygg" className="w-24 h-24 object-cover rounded-[14px] border border-line" />
              )}
              <label className="flex flex-col items-center justify-center gap-1.5 w-32 h-24 border-2 border-dashed border-line-input rounded-[14px] cursor-pointer hover:border-brand text-muted-2 hover:text-brand-ink transition-colors">
                <ImagePlus size={18} />
                <span className="text-xs font-semibold">Last opp bilde</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleBilde} />
              </label>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Tab: Økonomi */}
      {tab === 'oekonomi' && (
        <div className="space-y-4">

          {/* Leieinntekter per leieobjekt */}
          <SectionCard>
            <SeksjonHeader>Leieinntekter per leieobjekt</SeksjonHeader>
            <div className="space-y-2">
              {leieinntekter.map((l, i) => (
                <div key={l.id} className="flex gap-2 items-end">
                  <Input
                    className="flex-1"
                    label={i === 0 ? 'Leieobjekt / betegnelse' : ''}
                    value={l.navn}
                    onChange={(e) => handleLeie('edit', i, 'navn', e.target.value)}
                    placeholder={`Leieobjekt ${i + 1}`}
                  />
                  <Input
                    className="w-44"
                    label={i === 0 ? 'Månedlig leie' : ''}
                    type="number"
                    value={l.belop}
                    onChange={(e) => handleLeie('edit', i, 'belop', e.target.value)}
                    suffix="kr"
                  />
                  {leieinntekter.length > 1 && (
                    <button type="button" onClick={() => handleLeie('remove', i)}
                      className="pb-2.5 text-danger hover:opacity-70 transition-opacity cursor-pointer shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => handleLeie('add')} className="mt-3">
              <Plus size={14} /> Legg til leieobjekt
            </Button>

            {/* Totalsum */}
            <div className="mt-4 pt-4 border-t border-line">
              <div className="flex items-end justify-between">
                <span className="text-sm font-semibold text-muted">Total leieinntekt</span>
                <div className="text-right">
                  <div className="text-2xl font-extrabold text-brand-ink num">{formatKr(totalLeie)}<span className="text-sm font-bold text-muted-2">/mnd</span></div>
                  <div className="text-xs font-semibold text-muted-2 mt-0.5 num">{formatKr(totalLeieAarlig)} per år</div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Lån */}
          <SectionCard>
            <SeksjonHeader>Terminbeløp (lån)</SeksjonHeader>
            <div className="flex gap-3 mb-4">
              {['manuell', 'kalkulert'].map((m) => (
                <button key={m} type="button"
                  onClick={() => setForm((f) => ({ ...f, laanModus: m }))}
                  className={`px-4 py-2 text-sm font-bold rounded-xl border-[1.5px] transition-all cursor-pointer
                    ${form.laanModus === m ? 'bg-mint text-brand-ink border-mint-line' : 'text-muted border-line-input hover:border-line-input'}`}>
                  {m === 'manuell' ? 'Manuell' : 'Kalkulert'}
                </button>
              ))}
            </div>

            {form.laanModus === 'manuell' ? (
              <Input label="Terminbeløp per mnd" type="number" value={form.terminbelop} onChange={set('terminbelop')} suffix="kr" />
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Lånebeløp" type="number" value={form.laanebelop} onChange={set('laanebelop')} suffix="kr" />
                  <Input label="Rentesats" type="number" step="0.01" value={form.rentesats} onChange={set('rentesats')} suffix="%" />
                  <Input label="Nedbetalingstid" type="number" value={form.nedbetalingstid} onChange={set('nedbetalingstid')} suffix="år" />
                </div>
                {terminbelop > 0 && (
                  <div className="bg-sand border border-line rounded-[14px] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                      <span className="text-sm font-semibold text-muted">Terminbeløp</span>
                      <span className="text-brand-ink font-extrabold num">{formatKr(terminbelop, 0)}/mnd</span>
                    </div>
                    {/* Fordeling avdrag/renter første mnd */}
                    <div className="px-4 py-3 space-y-2">
                      <div className="text-[11px] font-bold text-muted-2 mb-2 uppercase tracking-wider">Fordeling første måned</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber" />
                          <span className="text-xs font-semibold text-muted">Renter</span>
                        </div>
                        <span className="text-sm font-bold text-amber num">{formatKr(maanedligRente, 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-brand" />
                          <span className="text-xs font-semibold text-muted">Avdrag</span>
                        </div>
                        <span className="text-sm font-bold text-brand-ink num">{formatKr(maanedligAvdrag, 0)}</span>
                      </div>
                      {/* Visuell bar */}
                      {terminbelop > 0 && (
                        <div className="mt-2 h-2 rounded-full bg-line overflow-hidden flex">
                          <div
                            className="h-full bg-amber transition-all duration-300"
                            style={{ width: `${Math.round((maanedligRente / terminbelop) * 100)}%` }}
                          />
                          <div className="h-full bg-brand flex-1" />
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-semibold text-muted-2">
                        <span>Renter {Math.round((maanedligRente / terminbelop) * 100)}%</span>
                        <span>Avdrag {Math.round((maanedligAvdrag / terminbelop) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Faste kostnader */}
          <SectionCard>
            <SeksjonHeader>Faste kostnader per mnd</SeksjonHeader>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kommunale avgifter" type="number" value={form.kommunaleAvgifter} onChange={set('kommunaleAvgifter')} suffix="kr" />
              <Input label="Internett" type="number" value={form.internett} onChange={set('internett')} suffix="kr" />
              <Input label="Husforsikring" type="number" value={form.husforsikring} onChange={set('husforsikring')} suffix="kr" />
              <Input label="Alarm" type="number" value={form.alarm} onChange={set('alarm')} suffix="kr" />
            </div>

            {/* Strøm */}
            <div className="mt-4 pt-4 border-t border-line">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <span className="text-[11px] font-bold text-muted-2 uppercase tracking-wider">Strøm (variabel)</span>
                <Toggle
                  checked={form.leieInkludererStrom || false}
                  onChange={(e) => setForm((f) => ({ ...f, leieInkludererStrom: e.target.checked }))}
                  label="Leien inkluderer strøm"
                />
              </div>

              {form.leieInkludererStrom ? (
                <div className="space-y-2">
                  <Input
                    label="Forventet strømkostnad/mnd"
                    type="number"
                    value={form.forventetStromMnd}
                    onChange={set('forventetStromMnd')}
                    suffix="kr"
                    placeholder="Estimert strøm du dekker"
                  />
                  <div className="text-xs font-medium text-muted bg-sand border border-line rounded-xl px-3 py-2">
                    Strøm er inkludert i leien — forventet kostnad føres som utgift i kalkylen.
                  </div>
                </div>
              ) : (
                <Input
                  label="Strøm (betales av utleier)"
                  type="number"
                  value={form.strom}
                  onChange={set('strom')}
                  suffix="kr"
                  placeholder="0 hvis leietaker betaler selv"
                />
              )}
            </div>

            {/* Tilleggskostnader */}
            {(form.tilleggskostnader || []).length > 0 && (
              <div className="mt-3 space-y-2 pt-3 border-t border-line">
                <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider mb-2">Andre kostnader</div>
                {form.tilleggskostnader.map((t, i) => (
                  <div key={t.id} className="flex gap-2 items-end">
                    <Input className="flex-1" label={i === 0 ? 'Navn' : ''} value={t.navn}
                      onChange={(e) => handleTillegg('edit', i, 'navn', e.target.value)} placeholder="Kostnadsnavn" />
                    <Input className="w-36" label={i === 0 ? 'Beløp' : ''} type="number" value={t.belop}
                      onChange={(e) => handleTillegg('edit', i, 'belop', e.target.value)} suffix="kr" />
                    <button type="button" onClick={() => handleTillegg('remove', i)}
                      className="pb-2.5 text-danger hover:opacity-70 transition-opacity cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTillegg('add')} className="mt-3">
              <Plus size={14} /> Legg til kostnad
            </Button>
          </SectionCard>

          {/* Vedlikehold */}
          <SectionCard>
            <SeksjonHeader>Vedlikeholdskostnad</SeksjonHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <Input className="w-32" label="Prosentsats" type="number" step="0.1"
                value={form.vedlikeholdProsent} onChange={set('vedlikeholdProsent')} suffix="%" />
              <div className="flex-1 min-w-[200px] bg-sand border border-line rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-muted">
                  {form.vedlikeholdProsent || 3}% av leieinntekt ={' '}
                  <span className="text-ink font-extrabold num">{formatKr(vedlikeholdKr, 0)}/mnd</span>
                </span>
              </div>
            </div>
          </SectionCard>

          {/* Investeringsdata */}
          <SectionCard>
            <SeksjonHeader>Investeringsdata</SeksjonHeader>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kjøpesum inkl. omkostninger" type="number" value={form.kjoepesum} onChange={set('kjoepesum')} suffix="kr" />
              <Input label="Oppussing totalt" type="number" value={form.oppussing} onChange={set('oppussing')} suffix="kr" />
              <Input
                label="Herav vedlikehold (fradragsberettiget)"
                type="number"
                value={form.oppussingVedlikehold}
                onChange={set('oppussingVedlikehold')}
                suffix="kr"
              />
              <div className="flex flex-col gap-1">
                <Input label="Ny takst etter oppussing" type="number" value={form.nyTakst} onChange={set('nyTakst')} suffix="kr" />
                {nyTakst > 0 && kjoepesum > 0 && (
                  <div className={`text-xs font-bold px-1 num ${verdiøkning >= 0 ? 'text-brand-ink' : 'text-danger'}`}>
                    {verdiøkning >= 0 ? '+' : ''}{formatKr(verdiøkning)} verdiøkning
                  </div>
                )}
              </div>
            </div>
            {totalInvestering > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="bg-sand border border-line rounded-xl px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted">Total investering (kjøpesum + oppussing)</span>
                  <span className="text-ink font-extrabold num">{formatKr(totalInvestering)}</span>
                </div>
                {nyTakst > 0 && (
                  <div className="bg-amber-soft border border-amber-line rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted">Startverdi bolig (ny takst)</span>
                    <span className="text-amber font-extrabold num">{formatKr(nyTakst)}</span>
                  </div>
                )}
                {oppussingVedlikehold > 0 && (
                  <div className="bg-mint-soft border border-mint-line rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted">Skattefradrag vedlikehold (22%)</span>
                    <span className="text-brand-ink font-extrabold num">{formatKr(oppussingVedlikehold * 0.22)}</span>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* Prognoseparametere */}
          <SectionCard>
            <SeksjonHeader>Prognoseparametere</SeksjonHeader>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Årlig prisstigning leie" type="number" step="0.1" value={form.pristigningLeie} onChange={set('pristigningLeie')} suffix="%" />
              <Input label="Årlig prisstigning kostnader" type="number" step="0.1" value={form.pristigningKostnader} onChange={set('pristigningKostnader')} suffix="%" />
              <Input label="Forventet årlig verdistigning bolig" type="number" step="0.1" value={form.verdistigning} onChange={set('verdistigning')} suffix="%" />
              <Input label="Utleiegrad (leieinntekt ift. full kapasitet)" type="number" step="0.5" value={form.utleiegrad} onChange={set('utleiegrad')} suffix="%" />
            </div>
          </SectionCard>

        </div>
      )}

      {/* Tab: Budsjett */}
      {tab === 'budsjett' && (
        <div className="space-y-6">

          {totalLeie === 0 && (
            <div className="bg-surface border border-line rounded-[20px] py-16 text-center">
              <IconTile tone="mint" size={56} radius={18} className="mx-auto mb-4"><BarChart3 size={24} /></IconTile>
              <p className="text-muted text-sm font-medium max-w-xs mx-auto">Fyll inn leieinntekter under «Inntekt og kostnader» for å se budsjettet.</p>
            </div>
          )}

          {totalLeie > 0 && (<>

          {/* Månedlig oppsummering */}
          <SectionCard
            tittel="Månedlig budsjett"
            action={
              <div className="flex gap-2">
                {['privat', 'selskap'].map((m) => (
                  <button key={m} type="button"
                    onClick={() => setForm((f) => ({ ...f, skattemodus: m }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border-[1.5px] transition-all cursor-pointer
                      ${form.skattemodus === m ? 'bg-mint text-brand-ink border-mint-line' : 'text-muted border-line-input hover:border-line-input'}`}>
                    {m === 'privat' ? 'Privat' : 'Selskap (AS)'}
                  </button>
                ))}
              </div>
            }
          >
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 pb-2">
              <div />
              <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider text-right">Per mnd</div>
              <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider text-right">Per år</div>
            </div>

            {/* Inntekter */}
            <div className="space-y-0.5 pb-3">
              {leieinntekter.map((l) => l.belop && (
                <div key={l.id} className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-line-soft transition-colors">
                  <span className="text-sm font-medium text-muted truncate">{l.navn || 'Leieobjekt'}</span>
                  <span className="text-sm font-bold text-ink text-right num">{formatKr(Number(l.belop))}</span>
                  <span className="text-sm font-medium text-muted-2 text-right num">{formatKr(Number(l.belop) * 12)}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-2 mt-1 border-t border-line px-2">
                <span className="text-sm font-bold text-ink">Total leieinntekt</span>
                <span className="text-sm font-extrabold text-brand-ink text-right num">{formatKr(totalLeie)}</span>
                <span className="text-sm font-extrabold text-brand-ink text-right num">{formatKr(totalLeieAarlig)}</span>
              </div>
            </div>

            {/* Kostnader */}
            <div className="border-t border-line pt-3 space-y-0.5 pb-3">
              {terminbelop > 0 && (
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-line-soft transition-colors">
                  <span className="text-sm font-medium text-muted">Terminbeløp (lån)</span>
                  <span className="text-sm font-bold text-ink text-right num">{formatKr(terminbelop, 0)}</span>
                  <span className="text-sm font-medium text-muted-2 text-right num">{formatKr(terminbelop * 12, 0)}</span>
                </div>
              )}
              {faste > 0 && (
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-line-soft transition-colors">
                  <span className="text-sm font-medium text-muted">Driftskostnader</span>
                  <span className="text-sm font-bold text-ink text-right num">{formatKr(faste, 0)}</span>
                  <span className="text-sm font-medium text-muted-2 text-right num">{formatKr(faste * 12, 0)}</span>
                </div>
              )}
              {vedlikeholdKr > 0 && (
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-line-soft transition-colors">
                  <span className="text-sm font-medium text-muted">Vedlikehold ({form.vedlikeholdProsent || 3}%)</span>
                  <span className="text-sm font-bold text-ink text-right num">{formatKr(vedlikeholdKr, 0)}</span>
                  <span className="text-sm font-medium text-muted-2 text-right num">{formatKr(vedlikeholdKr * 12, 0)}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-2 mt-1 border-t border-line px-2">
                <span className="text-sm font-bold text-ink">Total kostnader</span>
                <span className="text-sm font-extrabold text-danger text-right num">{formatKr(totalKostnader, 0)}</span>
                <span className="text-sm font-extrabold text-danger text-right num">{formatKr(totalKostnader * 12, 0)}</span>
              </div>
            </div>

            {/* Netto */}
            <div className="border-t-2 border-line-input pt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 items-center px-2">
                <span className="text-base font-bold text-ink">Netto kontantstrøm</span>
                <span className={`text-xl font-extrabold text-right num ${netto >= 0 ? 'text-brand-ink' : 'text-danger'}`}>
                  {formatKr(netto, 0)}
                </span>
                <span className={`text-sm font-bold text-right num ${netto >= 0 ? 'text-brand-ink' : 'text-danger'}`}>
                  {formatKr(netto * 12, 0)}
                </span>
              </div>

              {/* Skatt-info */}
              <div className="bg-sand border border-line rounded-[14px] p-4 space-y-2">
                {form.skattemodus === 'privat' ? (
                  <>
                    <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider mb-3">Skatteberegning — Privat utleie</div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-muted-2 pb-1">
                      <span />
                      <span className="text-right">Per mnd</span>
                      <span className="text-right">Per år</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">Leieinntekt</span>
                      <span className="text-right font-bold text-ink num">{formatKr(totalLeie, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">{formatKr(totalLeie * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">− Drift og vedlikehold</span>
                      <span className="text-right font-bold text-ink num">-{formatKr(driftPrivat, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">-{formatKr(driftPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-line pt-2">
                      <span className="font-medium text-muted">Skattepliktig inntekt</span>
                      <span className="text-right font-bold text-ink num">{formatKr(skattepliktigPrivat, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">{formatKr(skattepliktigPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">Skatt 22%</span>
                      <span className="text-right font-bold text-danger num">-{formatKr(skattPrivat, 0)}</span>
                      <span className="text-right font-medium text-danger/60 num">-{formatKr(skattPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-line pt-2 mt-1">
                      <span className="font-medium text-muted">Rentekostnad</span>
                      <span className="text-right font-bold text-ink num">{formatKr(rentekostnad, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">{formatKr(rentekostnad * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">+ Rentefradrag 22%</span>
                      <span className="text-right font-bold text-brand-ink num">+{formatKr(rentefradragPrivat, 0)}</span>
                      <span className="text-right font-medium text-brand-ink/60 num">+{formatKr(rentefradragPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t-2 border-line-input mt-1">
                      <span className="text-ink font-bold">Netto etter skatt</span>
                      <span className={`text-right font-extrabold num ${nettoEtterSkattPrivat >= 0 ? 'text-brand-ink' : 'text-danger'}`}>{formatKr(nettoEtterSkattPrivat, 0)}</span>
                      <span className={`text-right font-bold num ${nettoEtterSkattPrivat >= 0 ? 'text-brand-ink/70' : 'text-danger/70'}`}>{formatKr(nettoEtterSkattPrivat * 12, 0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider mb-3">Skatteberegning — Selskap (AS)</div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-muted-2 pb-1">
                      <span />
                      <span className="text-right">Per mnd</span>
                      <span className="text-right">Per år</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">Leieinntekt</span>
                      <span className="text-right font-bold text-ink num">{formatKr(totalLeie, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">{formatKr(totalLeie * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">− Drift og vedlikehold</span>
                      <span className="text-right font-bold text-ink num">-{formatKr(faste + vedlikeholdKr, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">-{formatKr((faste + vedlikeholdKr) * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">− Rentekostnader (fradragsberettiget)</span>
                      <span className="text-right font-bold text-ink num">-{formatKr(rentekostnad, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">-{formatKr(rentekostnad * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-line pt-2">
                      <span className="font-medium text-muted">Skattepliktig inntekt</span>
                      <span className="text-right font-bold text-ink num">{formatKr(skattepliktigSelskap, 0)}</span>
                      <span className="text-right font-medium text-muted-2 num">{formatKr(skattepliktigSelskap * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="font-medium text-muted">Selskapsskatt 22%</span>
                      <span className="text-right font-bold text-danger num">-{formatKr(skattSelskap, 0)}</span>
                      <span className="text-right font-medium text-danger/60 num">-{formatKr(skattSelskap * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t-2 border-line-input mt-1">
                      <span className="text-ink font-bold">Netto etter selskapsskatt</span>
                      <span className={`text-right font-extrabold num ${nettoEtterSkattSelskap >= 0 ? 'text-brand-ink' : 'text-danger'}`}>{formatKr(nettoEtterSkattSelskap, 0)}</span>
                      <span className={`text-right font-bold num ${nettoEtterSkattSelskap >= 0 ? 'text-brand-ink/70' : 'text-danger/70'}`}>{formatKr(nettoEtterSkattSelskap * 12, 0)}</span>
                    </div>
                    {utbyttegrunnlag > 0 && (
                      <>
                        <div className="text-[11px] font-bold text-muted-2 mt-4 mb-2 pt-2 border-t border-line">Ved uttak som utbytte (aksjonærmodellen)</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <span className="font-medium text-muted">Utbytteskatt 37.84%</span>
                          <span className="text-right font-bold text-danger num">-{formatKr(utbytteskatt, 0)}</span>
                          <span className="text-right font-medium text-danger/60 num">-{formatKr(utbytteskatt * 12, 0)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <span className="font-medium text-muted">Netto etter utbytte (effektiv ~51.5%)</span>
                          <span className={`text-right font-bold num ${nettoEtterUtbytte >= 0 ? 'text-brand-ink/70' : 'text-danger/70'}`}>{formatKr(nettoEtterUtbytte, 0)}</span>
                          <span className={`text-right font-medium num ${nettoEtterUtbytte >= 0 ? 'text-brand-ink/50' : 'text-danger/50'}`}>{formatKr(nettoEtterUtbytte * 12, 0)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Yield */}
              {yieldBase > 0 && (
                <div className="bg-amber-soft border border-amber-line rounded-[14px] px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-muted-2 uppercase tracking-wider mb-0.5">Yield</div>
                    <div className="text-xs font-medium text-muted-2 num">
                      {formatKr(totalLeieAarlig)} / {formatKr(yieldBase)}
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-amber num">{formatPct(yieldPct)}</div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* 10-års prognose */}
          <SectionCard
            tittel="10-års prognose"
            action={
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm"
                  onClick={() => exportExcel({ form, totalLeie, faste, vedlikeholdKr, netto, totalKostnader })}>
                  <Download size={13} /> Excel
                </Button>
                <Button type="button" variant="amber" size="sm"
                  onClick={() => exportPDF({ form, totalLeie, faste, vedlikeholdKr, netto, totalKostnader })}>
                  <Download size={13} /> PDF
                </Button>
              </div>
            }
          >
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-muted-2">
              <span>Verdistigning: <span className="text-amber">{form.verdistigning || 4}%/år</span></span>
              <span>Utleiegrad: <span className="text-brand-ink">{form.utleiegrad || 95}%</span></span>
              <span>Leiestigning: <span className="text-ink-2">{form.pristigningLeie || 1.5}%/år</span></span>
              <span>Kostnadsstigning: <span className="text-ink-2">{form.pristigningKostnader || 1.5}%/år</span></span>
              <span>Modus: <span className="text-ink-2">{form.skattemodus === 'selskap' ? 'Selskap (AS)' : 'Privat'}</span></span>
            </div>
            <PrognoseTabell
              form={form}
              totalLeie={totalLeie}
              faste={faste}
              vedlikeholdKr={vedlikeholdKr}
            />
          </SectionCard>

          {/* AI-analyse */}
          <AIAnalyse
            form={form}
            totalLeie={totalLeie}
            faste={faste}
            vedlikeholdKr={vedlikeholdKr}
            terminbelop={terminbelop}
            netto={netto}
            totalKostnader={totalKostnader}
            nettoEtterSkatt={form.skattemodus === 'selskap' ? nettoEtterSkattSelskap : nettoEtterSkattPrivat}
            skatt={form.skattemodus === 'selskap' ? skattSelskap : skattPrivat}
            totalInvestering={totalInvestering}
            startBoligverdi={startBoligverdi}
          />

          </>)}
        </div>
      )}

      {/* Tab: Oppussing */}
      {tab === 'oppussing' && existing && (
        <OppussingTab form={form} set={set} oppdater={handleOppussingspost} />
      )}

      {/* Tab: Oversikt */}
      {tab === 'oversikt' && existing && (
        <OversiktTab byggId={id} leieobjekter={leieobjekter} kontrakter={kontrakter} fakturaer={fakturaer} addFaktura={addFaktura} deleteFaktura={deleteFaktura} navigate={navigate} />
      )}
    </form>
  );
}
