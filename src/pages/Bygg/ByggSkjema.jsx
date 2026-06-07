import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Info, FileText, Home, ChevronRight, Receipt, Pencil, Check } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatKr, formatPct, calcTerminbelop, calcYield, postnummerTilPoststed } from '../../utils/format';
import { exportExcel, exportPDF, exportByggelaanExcel, exportByggelaanPDF } from '../../utils/export';
import AIAnalyse from '../../components/AIAnalyse';

const BYGNINGSTYPER = [
  { value: 'enebolig', label: 'Enebolig' },
  { value: 'tomannsbolig', label: 'Tomannsbolig' },
  { value: 'leilighetsbygg', label: 'Leilighetsbygg' },
  { value: 'naering', label: 'Næring' },
];

const MANEDER = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

function TabBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer
        ${active
          ? 'bg-black/[0.055] text-[#1A1B1E]'
          : 'text-[#65696F] hover:text-[#2A2D33] hover:bg-black/[0.03]'
        }`}
    >
      {children}
    </button>
  );
}

function SeksjonHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4 mt-7">
      <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-[#E9E8E2]" />
    </div>
  );
}

function OppsummeringsRad({ label, value, color = 'default', large = false }) {
  const colors = { default: 'text-[#1A1B1E]', green: 'text-[#15803D]', red: 'text-[#DC2626]', yellow: 'text-[#B45309]' };
  return (
    <div className={`flex justify-between items-center ${large ? 'py-3' : 'py-2'}`}>
      <span className={`text-sm ${large ? 'font-medium text-[#1A1B1E]' : 'text-[#4B4E54]'}`}>{label}</span>
      <span className={`font-medium num ${large ? 'text-lg' : 'text-sm'} ${colors[color]}`}>{value}</span>
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
const STATUS_FARGE = { planlagt: '#65696F', paagaaende: '#B45309', fullfort: '#15803D' };
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
  const budsjett = Number(form.oppussingsbudsjett || 0);
  const sumBudsjettert = poster.reduce((s, p) => s + Number(p.budsjettert || 0), 0);
  const sumFaktisk = poster.reduce((s, p) => s + Number(p.faktisk || 0), 0);
  const ref = budsjett > 0 ? budsjett : sumBudsjettert;
  const bruktPst = ref > 0 ? (sumFaktisk / ref) * 100 : 0;
  const barFarge = bruktPst > 100 ? '#DC2626' : bruktPst >= 75 ? '#B45309' : '#15803D';
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
  const bFarge = bPst > 100 ? '#DC2626' : bPst >= 75 ? '#B45309' : '#15803D';

  const adresse = `${form.gatenavn || ''} ${form.gatenummer || ''}, ${form.poststed || ''}`.trim();

  return (
    <div className="space-y-4">
      {/* Sammendrag — alltid synlig */}
      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest">Byggelånsbudsjett</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => exportByggelaanExcel(form, adresse)}
              className="px-3 py-1.5 text-xs font-medium text-[#15803D] border border-[#15803D]/20 bg-[#15803D]/5 rounded-lg hover:bg-[#15803D]/15 transition-all cursor-pointer">↓ Excel</button>
            <button type="button" onClick={() => exportByggelaanPDF(form, adresse)}
              className="px-3 py-1.5 text-xs font-medium text-[#B45309] border border-[#B45309]/20 bg-[#B45309]/5 rounded-lg hover:bg-[#B45309]/15 transition-all cursor-pointer">↓ PDF for banken</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
          {/* Venstre: budsjett-oppbygging */}
          <div className="space-y-0.5">
            <OppsummeringsRad label="Kostnadslinjer" value={formatKr(sumBudsjettert)} />
            <OppsummeringsRad label={`Uforutsett (${bb.ufProsent} %)`} value={formatKr(bb.uforutsett)} />
            {bb.brukBL && <OppsummeringsRad label={`Byggelånsrenter (${bb.blMnd} mnd)`} value={formatKr(bb.byggelaanRenter)} />}
            {bb.brukBL && bb.etableringsgebyr > 0 && <OppsummeringsRad label="Etableringsgebyr" value={formatKr(bb.etableringsgebyr)} />}
            <div className="border-t border-[#E9E8E2] mt-1 pt-1">
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
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#65696F]">Brukt av totalbudsjett</span>
              <span className="num" style={{ color: bFarge }}>{formatPct(bPst)}</span>
            </div>
            <div className="h-2.5 bg-[#E9E8E2] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, bPst)}%`, background: bFarge }} />
            </div>
            {bPst > 100 && <p className="text-xs text-[#DC2626] mt-1.5">Totalbudsjettet er overskredet med {formatKr(sumFaktisk - totalBudsjett)}.</p>}
          </div>
        )}
      </Card>

      {/* Under-faner */}
      <div className="flex gap-2">
        <TabBtn active={undertab === 'kostnader'} onClick={() => setUndertab('kostnader')}>Kostnadslinjer</TabBtn>
        <TabBtn active={undertab === 'oversikt'} onClick={() => setUndertab('oversikt')}>Oversikt</TabBtn>
      </div>

      {/* ── Kostnadslinjer ── */}
      {undertab === 'kostnader' && (
        <Card>
          <datalist id="rom-forslag">{ROM_FORSLAG.map((r) => <option key={r} value={r} />)}</datalist>
          <datalist id="lev-forslag">{leverandorListe.map((r) => <option key={r} value={r} />)}</datalist>

          {/* Legg til kostnad */}
          <div className="rounded-xl border border-[#E9E8E2] bg-[#F1F1ED] p-4">
            <div className="text-xs font-semibold text-[#7A7D83] uppercase tracking-wider mb-3">Legg til kostnad</div>
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
                <Button type="button" onClick={leggTil} className="justify-center"><Plus size={15} /> Legg til</Button>
              </div>
            </div>
          </div>

          {/* Registrerte kostnader */}
          {poster.length === 0 ? (
            <p className="text-[#65696F] text-sm mt-4">Ingen kostnader ennå. Legg til den første over.</p>
          ) : (
            <div className="mt-5">
              <div className="text-xs font-semibold text-[#7A7D83] uppercase tracking-wider mb-2">Registrerte kostnader · {poster.length}</div>
              <div className="space-y-2">
                {poster.map((p, i) => {
                  const erRed = redigerer === p.id;
                  const fak = Number(p.faktisk || 0); const bud = Number(p.budsjettert || 0);
                  const pOver = fak > bud && bud > 0;
                  if (erRed) {
                    return (
                      <div key={p.id} className="rounded-lg border border-[#16284A]/30 bg-[#F1F1ED] p-4 space-y-3">
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
                            className="text-xs text-[#DC2626] hover:underline flex items-center gap-1 cursor-pointer"><Trash2 size={13} /> Slett kostnad</button>
                          <Button type="button" variant="secondary" onClick={() => setRedigerer(null)}><Check size={14} /> Ferdig</Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E9E8E2] bg-white px-3 py-2.5 hover:border-[#DCDAD2] transition-colors">
                      <div className="min-w-0 flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: STATUS_FARGE[p.status] || '#AEB0B4' }}
                          title={OPPUSSING_STATUS.find((s) => s.value === p.status)?.label} />
                        <div className="min-w-0">
                          <div className="text-sm text-[#1A1B1E] font-medium truncate">{p.beskrivelse || 'Uten navn'}</div>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {p.rom && <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#F1F1ED] text-[#65696F] border border-[#E9E8E2]">{p.rom}</span>}
                            {p.leverandor && <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#F1F1ED] text-[#65696F] border border-[#E9E8E2]">{p.leverandor}</span>}
                            <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: p.type === 'vedlikehold' ? 'rgba(21,128,61,0.10)' : '#F1F1ED', color: p.type === 'vedlikehold' ? '#15803D' : '#65696F' }}>{TYPE_LABEL[p.type] || p.type}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="text-right num text-xs mr-1">
                          <div style={{ color: pOver ? '#DC2626' : '#1A1B1E' }}>{formatKr(fak)}</div>
                          <div className="text-[#7A7D83]">av {formatKr(bud)}</div>
                        </div>
                        <button type="button" onClick={() => setRedigerer(p.id)} title="Rediger"
                          className="p-2 text-[#7A7D83] hover:text-[#16284A] hover:bg-black/[0.04] rounded-md transition-all cursor-pointer"><Pencil size={14} /></button>
                        <button type="button" onClick={() => oppdater('remove', i)} title="Slett"
                          className="p-2 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Uforutsett + byggelån */}
          <div className="mt-6 pt-5 border-t border-[#E9E8E2] space-y-5">
            <div>
              <SeksjonHeader>Uforutsett</SeksjonHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <Input label="Uforutsett buffer (% av budsjetterte linjer)" type="number" value={form.uforutsettProsent}
                  onChange={set('uforutsettProsent')} placeholder="15" suffix="%" />
                <div className="bg-[#F1F1ED] border border-[#E9E8E2] rounded-lg px-4 py-2.5">
                  <span className="text-xs text-[#65696F]">Uforutsett beløp</span>
                  <div className="text-sm font-medium num text-[#1A1B1E]">{formatKr(bb.uforutsett)}</div>
                </div>
              </div>
              <p className="text-xs text-[#7A7D83] mt-2">Banken forventer en buffer for uforutsette kostnader. 10–15 % er vanlig.</p>
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
                  <div className="bg-[#F1F1ED] border border-[#E9E8E2] rounded-lg px-4 py-2.5">
                    <span className="text-xs text-[#65696F]">Estimerte byggelånsrenter</span>
                    <div className="text-sm font-medium num text-[#1A1B1E]">{formatKr(bb.byggelaanRenter)}</div>
                  </div>
                </div>
              )}
              {form.brukByggelaan && (
                <p className="text-xs text-[#7A7D83] mt-2">
                  Byggelånsrenter beregnes med snitt 50 % opptrekk over byggeperioden (bransjestandard). Etableringsgebyret er bankens oppstartskostnad — en fast sum, vanligvis 8 000–15 000 kr.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Oversikt ── */}
      {undertab === 'oversikt' && (
        <div className="space-y-4">
          {poster.length === 0 ? (
            <Card><p className="text-[#65696F] text-sm">Legg inn kostnadslinjer for å se fordelingen her.</p></Card>
          ) : (
            <>
              <Card>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest">Fordeling</span>
                  <div className="flex gap-1 bg-[#F1F1ED] border border-[#E9E8E2] rounded-lg p-1">
                    {Object.keys(GRUPPE_LABEL).map((k) => (
                      <button key={k} type="button" onClick={() => { setGrupperEtter(k); setApenGruppe(null); }}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer
                          ${grupperEtter === k ? 'bg-black/[0.055] text-[#1A1B1E]' : 'text-[#7A7D83] hover:text-[#4B4E54]'}`}>
                        {GRUPPE_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {grupper_.map((g) => {
                    const over = g.faktisk > g.budsjettert && g.budsjettert > 0;
                    const apen = apenGruppe === g.navn;
                    return (
                      <div key={g.navn} className="rounded-lg border border-[#E9E8E2] overflow-hidden">
                        {/* Gruppe-header (klikkbar) */}
                        <button type="button" onClick={() => setApenGruppe(apen ? null : g.navn)}
                          className="w-full text-left px-3 py-2.5 hover:bg-black/[0.02] transition-colors cursor-pointer">
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="flex items-center gap-1.5 text-[#1A1B1E] font-medium">
                              <ChevronRight size={13} className={`text-[#7A7D83] transition-transform ${apen ? 'rotate-90' : ''}`} />
                              {g.navn} <span className="text-[#7A7D83] font-normal">· {g.antall} {g.antall === 1 ? 'post' : 'poster'}</span>
                            </span>
                            <span className="num text-xs">
                              <span className="text-[#4B4E54]">{formatKr(g.faktisk)}</span>
                              <span className="text-[#7A7D83]"> / {formatKr(g.budsjettert)}</span>
                            </span>
                          </div>
                          <div className="relative h-2 bg-[#E9E8E2] rounded-full overflow-hidden ml-[18px]">
                            <div className="absolute inset-y-0 left-0 rounded-full bg-[#AEB0B4]" style={{ width: `${(g.budsjettert / maxFak) * 100}%` }} />
                            <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(g.faktisk / maxFak) * 100}%`, background: over ? '#DC2626' : '#15803D' }} />
                          </div>
                        </button>

                        {/* Drilldown — alle kostnader i gruppen */}
                        {apen && (
                          <div className="border-t border-[#E9E8E2] divide-y divide-[#E9E8E2]/60 bg-[#F1F1ED]">
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
                                      <span className="text-sm text-[#1A1B1E] truncate">{p.beskrivelse || 'Uten beskrivelse'}</span>
                                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: STATUS_FARGE[p.status] }} title={OPPUSSING_STATUS.find((s) => s.value === p.status)?.label} />
                                    </div>
                                    {meta && <div className="text-xs text-[#7A7D83] mt-0.5">{meta}</div>}
                                  </div>
                                  <div className="text-right shrink-0 num text-xs">
                                    <div style={{ color: pOver ? '#DC2626' : '#4B4E54' }}>{formatKr(Number(p.faktisk || 0))}</div>
                                    <div className="text-[#7A7D83]">av {formatKr(Number(p.budsjettert || 0))}</div>
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
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#E9E8E2] text-xs text-[#7A7D83]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#15803D]" /> Faktisk</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#AEB0B4]" /> Budsjettert</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" /> Over budsjett</span>
                </div>
              </Card>

              {/* Skattemessig fordeling — budsjettert + faktisk */}
              <Card>
                <SeksjonHeader>Skattemessig fordeling</SeksjonHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-[#15803D]/20 bg-[#15803D]/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#1A1B1E]">Vedlikehold</span>
                      <span className="text-xs text-[#15803D] bg-[#15803D]/10 px-2 py-0.5 rounded-full">Fradragsberettiget</span>
                    </div>
                    <div className="flex justify-between text-sm"><span className="text-[#65696F]">Budsjettert</span><span className="num text-[#4B4E54]">{formatKr(vedlBud)}</span></div>
                    <div className="flex justify-between text-sm mt-1"><span className="text-[#65696F]">Faktisk</span><span className="num text-[#15803D] font-semibold">{formatKr(vedlFak)}</span></div>
                    <p className="text-xs text-[#65696F] mt-2">Reduserer skatten med ca. {formatKr(vedlFak * 0.22)} (22 %).</p>
                  </div>
                  <div className="rounded-lg border border-[#E9E8E2] bg-[#F1F1ED] p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[#1A1B1E]">Påkostning</span>
                      <span className="text-xs text-[#65696F] bg-[#E9E8E2] px-2 py-0.5 rounded-full">Ikke fradragsberettiget</span>
                    </div>
                    <div className="flex justify-between text-sm"><span className="text-[#65696F]">Budsjettert</span><span className="num text-[#4B4E54]">{formatKr(paaBud)}</span></div>
                    <div className="flex justify-between text-sm mt-1"><span className="text-[#65696F]">Faktisk</span><span className="num text-[#4B4E54] font-semibold">{formatKr(paaFak)}</span></div>
                    <p className="text-xs text-[#65696F] mt-2">Øker boligens inngangsverdi og reduserer gevinstskatt ved salg.</p>
                  </div>
                </div>
                <div className="flex gap-2.5 p-3 mt-3 rounded-lg border border-blue-500/20 bg-blue-500/5 text-xs text-blue-300 leading-relaxed">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  <span>Faktiske vedlikeholdskostnader brukes automatisk som fradrag i skatterapporten. Påkostning aktiveres på kostprisen.</span>
                </div>
              </Card>
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

function PrognoseTabell({ form, totalLeie, totalKostnader, terminbelop, faste, vedlikeholdKr }) {
  const YEARS = 10;
  const laan = Number(form.laanebelop || 0);
  const rentesats = Number(form.rentesats || 0);
  const nedbet = Number(form.nedbetalingstid || 0);
  const loanSchedule = form.laanModus === 'kalkulert'
    ? calcLoanSchedule(laan, rentesats, nedbet, YEARS)
    : Array.from({ length: YEARS }, () => ({ renter: 0, avdrag: 0, balance: laan }));

  const kjoepesumP = Number(form.kjoepesum || 0);
  const oppussingP = Number(form.oppussing || 0);
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

    let skatt = 0;
    let rentefradrag = 0;
    let vedlikeholdFradragBrukt = 0;
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
            <th className="text-left py-2 px-3 text-[#65696F] font-medium w-44 sticky left-0 bg-[#F6F6F4]">Nøkkeltall</th>
            {yearNums.map((y) => (
              <th key={y} className="text-right py-2 px-3 text-[#65696F] font-medium">År {y}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {radDef.map((rad) => {
            if (rad.divider) return (
              <tr key={rad.key}>
                <td colSpan={YEARS + 1} className="py-0">
                  <div className="h-px bg-[#E9E8E2] my-1" />
                </td>
              </tr>
            );
            if (rad.show && !rad.show()) return null;

            return (
              <tr key={rad.key} className="hover:bg-[#E9E8E2]/30 transition-colors">
                <td className={`py-1.5 px-3 sticky left-0 bg-[#F6F6F4] ${rad.bold ? 'font-medium text-[#1A1B1E]' : 'text-[#4B4E54]'}`}>
                  {rad.label}
                </td>
                {rows.map((row, i) => {
                  const val = row[rad.key];
                  let cls = 'text-[#1A1B1E]';
                  if (rad.isLtv) {
                    const pct = Math.round(val);
                    cls = pct > 80 ? 'text-[#DC2626]' : pct > 60 ? 'text-[#B45309]' : 'text-[#15803D]';
                  } else if (rad.color === 'green') cls = 'text-[#15803D]';
                  else if (rad.color === 'yellow') cls = 'text-[#B45309]';
                  else if (rad.color === 'dynamic') cls = val >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]';
                  else if (rad.color === 'dynamic-sub') cls = val >= 0 ? 'text-[#15803D]/70' : 'text-[#DC2626]/70';
                  else if (rad.negative) cls = 'text-[#4B4E54]';

                  const display = rad.isLtv
                    ? `${Math.round(val)} %`
                    : fmtT(val);

                  return (
                    <td key={i} className={`py-1.5 px-3 text-right font-mono ${rad.bold ? 'font-medium' : ''} ${cls}`}>
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
    if (k.kontraktstype === 'tidsubestemt') return { label: 'Aktiv', color: 'text-[#15803D]' };
    if (!k.sluttdato) return { label: 'Aktiv', color: 'text-[#15803D]' };
    const slutt = new Date(k.sluttdato);
    const nå = new Date();
    if (slutt < nå) return { label: 'Utløpt', color: 'text-[#DC2626]' };
    const dager = Math.round((slutt - nå) / 86400000);
    if (dager < 90) return { label: `Utløper om ${dager}d`, color: 'text-[#B45309]' };
    return { label: 'Aktiv', color: 'text-[#15803D]' };
  }

  function lagreFaktura(e) {
    e.preventDefault();
    addFaktura({ ...fakturaForm, byggId, belop: Number(fakturaForm.belop) });
    setFakturaForm({ dato: new Date().toISOString().slice(0, 10), mottaker: '', beskrivelse: '', belop: '', status: 'sendt' });
    setVisFakturaForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl w-fit">
        {[['leieforhold', 'Leieforhold'], ['fakturaer', 'Fakturaer']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setOversiktTab(key)}
            className={`px-4 py-1.5 text-sm rounded-lg font-medium transition-all cursor-pointer
              ${oversiktTab === key ? 'bg-black/[0.055] text-[#1A1B1E]' : 'text-[#65696F] hover:text-[#2A2D33]'}`}>
            {label}
          </button>
        ))}
      </div>

      {oversiktTab === 'leieforhold' && (
        <div>
          {byggKontrakter.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-10 text-center">
              <FileText size={28} className="text-[#AEB0B4] mx-auto mb-3" />
              <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen leieforhold registrert</div>
              <div className="text-xs text-[#7A7D83]">Gå til Kontrakter for å legge inn leieforhold</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {byggKontrakter.map((k) => {
                const obj = byggLeieobjekter.find((l) => l.id === k.leieobjektId);
                const { label, color } = kontraktStatus(k);
                return (
                  <div key={k.id} className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-4 flex items-center gap-4 hover:border-[#DCDAD2] transition-colors cursor-pointer group"
                    onClick={() => navigate('/kontrakter')}>
                    <div className="w-9 h-9 bg-[#E9E8E2] rounded-lg flex items-center justify-center shrink-0">
                      <Home size={15} className="text-[#AEB0B4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-[#1A1B1E]">{k.leietakerNavn || '—'}</div>
                          <div className="text-xs text-[#7A7D83] mt-0.5">{obj?.navn || obj?.type || 'Leieobjekt'}</div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <div className="text-sm font-medium text-[#1A1B1E] num">{k.manedsleie ? `${Number(k.manedsleie).toLocaleString('no')} kr` : '—'}</div>
                            <div className={`text-xs mt-0.5 ${color}`}>{label}</div>
                          </div>
                          <ChevronRight size={15} className="text-[#AEB0B4] group-hover:text-[#65696F]" />
                        </div>
                      </div>
                      {(k.startdato || k.sluttdato) && (
                        <div className="text-xs text-[#7A7D83] mt-2 num">
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
            <div className="text-xs text-[#7A7D83]">{byggFakturaer.length} faktura{byggFakturaer.length !== 1 ? 'er' : ''}</div>
            <Button type="button" variant="secondary" size="sm" onClick={() => setVisFakturaForm((v) => !v)}>
              <Plus size={13} /> Ny faktura
            </Button>
          </div>

          {visFakturaForm && (
            <form onSubmit={lagreFaktura} className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-4 mb-3 space-y-3">
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
            <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-10 text-center">
              <Receipt size={28} className="text-[#AEB0B4] mx-auto mb-3" />
              <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen fakturaer ennå</div>
              <div className="text-xs text-[#7A7D83]">Logg fakturaer du har sendt ut for dette bygget</div>
            </div>
          ) : (
            <div className="grid gap-2">
              {byggFakturaer.map((f) => {
                const statusColor = { sendt: 'text-[#65696F] bg-[#E9E8E2]', betalt: 'text-[#15803D] bg-[#15803D]/10', forfalt: 'text-[#DC2626] bg-[#DC2626]/10' };
                const statusLabel = { sendt: 'Sendt', betalt: 'Betalt', forfalt: 'Forfalt' };
                return (
                  <div key={f.id} className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-4 flex items-center gap-4 hover:border-[#DCDAD2] transition-colors group">
                    <div className="w-9 h-9 bg-[#E9E8E2] rounded-lg flex items-center justify-center shrink-0">
                      <Receipt size={15} className="text-[#AEB0B4]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-[#1A1B1E]">{f.mottaker}</div>
                          <div className="text-xs text-[#7A7D83] mt-0.5">{f.beskrivelse || '—'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-[#1A1B1E] num">{Number(f.belop).toLocaleString('no')} kr</div>
                            <div className="text-xs text-[#7A7D83] num mt-0.5">{f.dato}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[f.status] || statusColor.sendt}`}>
                            {statusLabel[f.status] || f.status}
                          </span>
                          <button type="button" onClick={() => deleteFaktura(f.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer">
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
  const { bygg, leieobjekter, kontrakter, addBygg, updateBygg, faktiskeTall, setFaktiskeTall, fakturaer, addFaktura, deleteFaktura } = useApp();

  const existing = id ? bygg.find((b) => b.id === id) : null;
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState(() => existing ? { ...defaultByggData, ...existing } : defaultByggData);
  const [valgtMaaned, setValgtMaaned] = useState(null);
  const [faktiskInput, setFaktiskInput] = useState({ inntekt: '', kostnad: '' });
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

  useEffect(() => {
    if (form.postnummer?.length === 4) {
      const sted = postnummerTilPoststed(form.postnummer);
      if (sted) setForm((f) => ({ ...f, poststed: sted }));
    }
  }, [form.postnummer]);

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

  const aar = new Date().getFullYear();
  const maanedKey = (mndIdx) => `${id || 'ny'}_${aar}_${mndIdx}`;
  const getFaktisk = (mndIdx) => faktiskeTall[maanedKey(mndIdx)] || { inntekt: '', kostnad: '' };

  const chartData = MANEDER.map((m, i) => {
    const f = getFaktisk(i);
    return {
      name: m,
      Budsjettert: Math.round(netto),
      Faktisk: f.inntekt !== '' || f.kostnad !== ''
        ? Math.round(Number(f.inntekt || leieinntekt) - Number(f.kostnad || totalKostnader))
        : null,
    };
  });

  const akkumulert = [];
  let sum = 0;
  MANEDER.forEach((m, i) => {
    const f = getFaktisk(i);
    const faktiskNetto = f.inntekt !== '' || f.kostnad !== ''
      ? Number(f.inntekt || leieinntekt) - Number(f.kostnad || totalKostnader)
      : 0;
    sum += faktiskNetto;
    akkumulert.push({ name: m, Akkumulert: Math.round(sum) });
  });

  const apneValgtMaaned = (mndIdx) => {
    setValgtMaaned(mndIdx);
    const f = getFaktisk(mndIdx);
    setFaktiskInput({ inntekt: f.inntekt || '', kostnad: f.kostnad || '' });
  };

  const lagreFaktisk = () => {
    if (valgtMaaned === null) return;
    setFaktiskeTall((prev) => ({
      ...prev,
      [maanedKey(valgtMaaned)]: { inntekt: faktiskInput.inntekt, kostnad: faktiskInput.kostnad },
    }));
    setValgtMaaned(null);
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
    <form onSubmit={handleSubmit} className="space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => navigate('/bygg')}
            className="text-[#65696F] hover:text-[#1A1B1E] transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-medium text-[#1A1B1E]">
              {existing ? 'Rediger bygg' : 'Nytt bygg'}
            </h1>
            {existing && (
              <p className="text-sm text-[#65696F]">{existing.gatenavn} {existing.gatenummer}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lagrefeil && <span className="text-xs text-[#DC2626]">{lagrefeil}</span>}
          <Button type="button" variant="secondary" onClick={() => navigate('/bygg')}>Avbryt</Button>
          <Button type="submit" variant="primary" disabled={lagrer}>
            {lagrer ? 'Lagrer…' : existing ? 'Lagre endringer' : 'Opprett bygg'}
          </Button>
        </div>
      </div>

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
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Input label="Gatenavn" value={form.gatenavn} onChange={set('gatenavn')} required placeholder="Kongens gate" />
            <Input label="Gatenummer" value={form.gatenummer} onChange={set('gatenummer')} required placeholder="12" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Postnummer" value={form.postnummer} onChange={set('postnummer')} required placeholder="0150" />
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
            <label className="text-xs text-[#4B4E54] uppercase tracking-wider block mb-2">Bilde</label>
            <div className="flex items-start gap-4">
              {form.bilde && (
                <img src={form.bilde} alt="Bygg" className="w-24 h-24 object-cover rounded-lg border border-[#E9E8E2]" />
              )}
              <label className="flex flex-col items-center justify-center w-32 h-24 border-2 border-dashed border-[#E9E8E2] rounded-lg cursor-pointer hover:border-[#15803D]/50 transition-colors">
                <span className="text-xs text-[#65696F]">Last opp bilde</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleBilde} />
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: Økonomi */}
      {tab === 'oekonomi' && (
        <div className="space-y-4">

          {/* Leieinntekter per leieobjekt */}
          <Card>
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
                      className="pb-2 text-[#DC2626] hover:text-[#DC2626]/70 transition-colors cursor-pointer shrink-0">
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
            <div className="mt-4 pt-4 border-t border-[#E9E8E2]">
              <div className="flex items-end justify-between">
                <span className="text-sm text-[#4B4E54]">Total leieinntekt</span>
                <div className="text-right">
                  <div className="text-2xl font-medium text-[#15803D]">{formatKr(totalLeie)}<span className="text-sm text-[#65696F]">/mnd</span></div>
                  <div className="text-xs text-[#65696F] mt-0.5">{formatKr(totalLeieAarlig)} per år</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Lån */}
          <Card>
            <SeksjonHeader>Terminbeløp (lån)</SeksjonHeader>
            <div className="flex gap-3 mb-4">
              {['manuell', 'kalkulert'].map((m) => (
                <button key={m} type="button"
                  onClick={() => setForm((f) => ({ ...f, laanModus: m }))}
                  className={`px-4 py-2 text-sm rounded-lg border transition-all cursor-pointer capitalize
                    ${form.laanModus === m ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30' : 'text-[#65696F] border-[#E9E8E2] hover:border-[#DCDAD2]'}`}>
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
                  <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#E9E8E2]">
                      <span className="text-sm text-[#4B4E54]">Terminbeløp</span>
                      <span className="text-[#15803D] font-medium">{formatKr(terminbelop, 0)}/mnd</span>
                    </div>
                    {/* Fordeling avdrag/renter første mnd */}
                    <div className="px-4 py-3 space-y-2">
                      <div className="text-xs text-[#65696F] mb-2 uppercase tracking-wider">Fordeling første måned</div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#2563EB]" />
                          <span className="text-xs text-[#4B4E54]">Renter</span>
                        </div>
                        <span className="text-sm text-[#2563EB]">{formatKr(maanedligRente, 0)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#15803D]" />
                          <span className="text-xs text-[#4B4E54]">Avdrag</span>
                        </div>
                        <span className="text-sm text-[#15803D]">{formatKr(maanedligAvdrag, 0)}</span>
                      </div>
                      {/* Visuell bar */}
                      {terminbelop > 0 && (
                        <div className="mt-2 h-2 rounded-full bg-[#E9E8E2] overflow-hidden flex">
                          <div
                            className="h-full bg-[#2563EB] transition-all duration-300"
                            style={{ width: `${Math.round((maanedligRente / terminbelop) * 100)}%` }}
                          />
                          <div className="h-full bg-[#15803D] flex-1" />
                        </div>
                      )}
                      <div className="flex justify-between text-xs text-[#65696F]">
                        <span>Renter {Math.round((maanedligRente / terminbelop) * 100)}%</span>
                        <span>Avdrag {Math.round((maanedligAvdrag / terminbelop) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Faste kostnader */}
          <Card>
            <SeksjonHeader>Faste kostnader per mnd</SeksjonHeader>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Kommunale avgifter" type="number" value={form.kommunaleAvgifter} onChange={set('kommunaleAvgifter')} suffix="kr" />
              <Input label="Internett" type="number" value={form.internett} onChange={set('internett')} suffix="kr" />
              <Input label="Husforsikring" type="number" value={form.husforsikring} onChange={set('husforsikring')} suffix="kr" />
              <Input label="Alarm" type="number" value={form.alarm} onChange={set('alarm')} suffix="kr" />
            </div>

            {/* Strøm */}
            <div className="mt-4 pt-4 border-t border-[#E9E8E2]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#4B4E54] uppercase tracking-wider">Strøm (variabel)</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-[#65696F]">Leien inkluderer strøm</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.leieInkludererStrom || false}
                      onChange={(e) => setForm((f) => ({ ...f, leieInkludererStrom: e.target.checked }))}
                      className="sr-only"
                    />
                    <div className={`w-9 h-5 rounded-full transition-colors duration-200 ${form.leieInkludererStrom ? 'bg-[#15803D]' : 'bg-[#E9E8E2]'}`} />
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${form.leieInkludererStrom ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </label>
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
                  <div className="text-xs text-[#65696F] bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-3 py-2">
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
              <div className="mt-3 space-y-2 pt-3 border-t border-[#E9E8E2]">
                <div className="text-xs text-[#65696F] uppercase tracking-wider mb-2">Andre kostnader</div>
                {form.tilleggskostnader.map((t, i) => (
                  <div key={t.id} className="flex gap-2 items-end">
                    <Input className="flex-1" label={i === 0 ? 'Navn' : ''} value={t.navn}
                      onChange={(e) => handleTillegg('edit', i, 'navn', e.target.value)} placeholder="Kostnadsnavn" />
                    <Input className="w-36" label={i === 0 ? 'Beløp' : ''} type="number" value={t.belop}
                      onChange={(e) => handleTillegg('edit', i, 'belop', e.target.value)} suffix="kr" />
                    <button type="button" onClick={() => handleTillegg('remove', i)}
                      className="pb-2 text-[#DC2626] hover:text-[#DC2626]/70 transition-colors cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => handleTillegg('add')} className="mt-3">
              <Plus size={14} /> Legg til kostnad
            </Button>
          </Card>

          {/* Vedlikehold */}
          <Card>
            <SeksjonHeader>Vedlikeholdskostnad</SeksjonHeader>
            <div className="flex items-center gap-4">
              <Input className="w-32" label="Prosentsats" type="number" step="0.1"
                value={form.vedlikeholdProsent} onChange={set('vedlikeholdProsent')} suffix="%" />
              <div className="flex-1 bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-4 py-3">
                <span className="text-sm text-[#4B4E54]">
                  {form.vedlikeholdProsent || 3}% av leieinntekt ={' '}
                  <span className="text-[#1A1B1E] font-medium">{formatKr(vedlikeholdKr, 0)}/mnd</span>
                </span>
              </div>
            </div>
          </Card>

          {/* Investeringsdata */}
          <Card>
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
                  <div className={`text-xs px-1 ${verdiøkning >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                    {verdiøkning >= 0 ? '+' : ''}{formatKr(verdiøkning)} verdiøkning
                  </div>
                )}
              </div>
            </div>
            {totalInvestering > 0 && (
              <div className="mt-3 space-y-1">
                <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-sm text-[#4B4E54]">Total investering (kjøpesum + oppussing)</span>
                  <span className="text-[#1A1B1E] font-medium">{formatKr(totalInvestering)}</span>
                </div>
                {nyTakst > 0 && (
                  <div className="bg-[#F6F6F4] border border-[#B45309]/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-[#4B4E54]">Startverdi bolig (ny takst)</span>
                    <span className="text-[#B45309] font-medium">{formatKr(nyTakst)}</span>
                  </div>
                )}
                {oppussingVedlikehold > 0 && (
                  <div className="bg-[#F6F6F4] border border-[#15803D]/20 rounded-lg px-4 py-2.5 flex items-center justify-between">
                    <span className="text-sm text-[#4B4E54]">Skattefradrag vedlikehold (22%)</span>
                    <span className="text-[#15803D] font-medium">{formatKr(oppussingVedlikehold * 0.22)}</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Prognoseparametere */}
          <Card>
            <SeksjonHeader>Prognoseparametere</SeksjonHeader>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Årlig prisstigning leie" type="number" step="0.1" value={form.pristigningLeie} onChange={set('pristigningLeie')} suffix="%" />
              <Input label="Årlig prisstigning kostnader" type="number" step="0.1" value={form.pristigningKostnader} onChange={set('pristigningKostnader')} suffix="%" />
              <Input label="Forventet årlig verdistigning bolig" type="number" step="0.1" value={form.verdistigning} onChange={set('verdistigning')} suffix="%" />
              <Input label="Utleiegrad (leieinntekt ift. full kapasitet)" type="number" step="0.5" value={form.utleiegrad} onChange={set('utleiegrad')} suffix="%" />
            </div>
          </Card>

        </div>
      )}

      {/* Tab: Budsjett */}
      {tab === 'budsjett' && (
        <div className="space-y-6">

          {totalLeie === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4 opacity-30">📊</div>
              <p className="text-[#65696F] text-sm">Fyll inn leieinntekter under «Inntekt og kostnader» for å se budsjettet.</p>
            </div>
          )}

          {totalLeie > 0 && (<>

          {/* Månedlig oppsummering */}
          <Card className="border-[#15803D]/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-[#1A1B1E]">Månedlig budsjett</h2>
              {/* Skattemodus-toggle */}
              <div className="flex gap-2">
                {['privat', 'selskap'].map((m) => (
                  <button key={m} type="button"
                    onClick={() => setForm((f) => ({ ...f, skattemodus: m }))}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all cursor-pointer
                      ${form.skattemodus === m ? 'bg-[#15803D]/10 text-[#15803D] border-[#15803D]/30' : 'text-[#65696F] border-[#E9E8E2] hover:border-[#DCDAD2]'}`}>
                    {m === 'privat' ? 'Privat' : 'Selskap (AS)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Header */}
            <div className="grid grid-cols-3 gap-2 pb-2">
              <div />
              <div className="text-xs text-[#65696F] uppercase tracking-wider text-right">Per mnd</div>
              <div className="text-xs text-[#65696F] uppercase tracking-wider text-right">Per år</div>
            </div>

            {/* Inntekter */}
            <div className="space-y-0.5 pb-3">
              {leieinntekter.map((l) => l.belop && (
                <div key={l.id} className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-[#E9E8E2]/30 transition-colors">
                  <span className="text-sm text-[#4B4E54] truncate">{l.navn || 'Leieobjekt'}</span>
                  <span className="text-sm text-[#1A1B1E] text-right">{formatKr(Number(l.belop))}</span>
                  <span className="text-sm text-[#65696F] text-right">{formatKr(Number(l.belop) * 12)}</span>
                </div>
              ))}
              <div className="grid grid-cols-3 gap-2 pt-2 mt-1 border-t border-[#E9E8E2] px-2">
                <span className="text-sm font-medium text-[#1A1B1E]">Total leieinntekt</span>
                <span className="text-sm font-medium text-[#15803D] text-right">{formatKr(totalLeie)}</span>
                <span className="text-sm font-medium text-[#15803D] text-right">{formatKr(totalLeieAarlig)}</span>
              </div>
            </div>

            {/* Kostnader */}
            <div className="border-t border-[#E9E8E2] pt-3 space-y-0.5 pb-3">
              {terminbelop > 0 && (
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-[#E9E8E2]/30 transition-colors">
                  <span className="text-sm text-[#4B4E54]">Terminbeløp (lån)</span>
                  <span className="text-sm text-[#1A1B1E] text-right">{formatKr(terminbelop, 0)}</span>
                  <span className="text-sm text-[#65696F] text-right">{formatKr(terminbelop * 12, 0)}</span>
                </div>
              )}
              {faste > 0 && (
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-[#E9E8E2]/30 transition-colors">
                  <span className="text-sm text-[#4B4E54]">Driftskostnader</span>
                  <span className="text-sm text-[#1A1B1E] text-right">{formatKr(faste, 0)}</span>
                  <span className="text-sm text-[#65696F] text-right">{formatKr(faste * 12, 0)}</span>
                </div>
              )}
              {vedlikeholdKr > 0 && (
                <div className="grid grid-cols-3 gap-2 py-1.5 px-2 rounded hover:bg-[#E9E8E2]/30 transition-colors">
                  <span className="text-sm text-[#4B4E54]">Vedlikehold ({form.vedlikeholdProsent || 3}%)</span>
                  <span className="text-sm text-[#1A1B1E] text-right">{formatKr(vedlikeholdKr, 0)}</span>
                  <span className="text-sm text-[#65696F] text-right">{formatKr(vedlikeholdKr * 12, 0)}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-2 mt-1 border-t border-[#E9E8E2] px-2">
                <span className="text-sm font-medium text-[#1A1B1E]">Total kostnader</span>
                <span className="text-sm font-medium text-[#DC2626] text-right">{formatKr(totalKostnader, 0)}</span>
                <span className="text-sm font-medium text-[#DC2626] text-right">{formatKr(totalKostnader * 12, 0)}</span>
              </div>
            </div>

            {/* Netto */}
            <div className="border-t-2 border-[#DCDAD2] pt-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 items-center px-2">
                <span className="text-base font-medium text-[#1A1B1E]">Netto kontantstrøm</span>
                <span className={`text-xl font-medium text-right ${netto >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                  {formatKr(netto, 0)}
                </span>
                <span className={`text-sm font-medium text-right ${netto >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                  {formatKr(netto * 12, 0)}
                </span>
              </div>

              {/* Skatt-info */}
              <div className="bg-[#F6F6F4] border border-[#E9E8E2] rounded-xl p-4 space-y-2">
                {form.skattemodus === 'privat' ? (
                  <>
                    <div className="text-xs text-[#65696F] uppercase tracking-wider mb-3">Skatteberegning — Privat utleie</div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-[#65696F] pb-1">
                      <span />
                      <span className="text-right">Per mnd</span>
                      <span className="text-right">Per år</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">Leieinntekt</span>
                      <span className="text-right text-[#1A1B1E]">{formatKr(totalLeie, 0)}</span>
                      <span className="text-right text-[#65696F]">{formatKr(totalLeie * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">− Drift og vedlikehold</span>
                      <span className="text-right text-[#1A1B1E]">-{formatKr(driftPrivat, 0)}</span>
                      <span className="text-right text-[#65696F]">-{formatKr(driftPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-[#E9E8E2] pt-2">
                      <span className="text-[#4B4E54]">Skattepliktig inntekt</span>
                      <span className="text-right text-[#1A1B1E]">{formatKr(skattepliktigPrivat, 0)}</span>
                      <span className="text-right text-[#65696F]">{formatKr(skattepliktigPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">Skatt 22%</span>
                      <span className="text-right text-[#DC2626]">-{formatKr(skattPrivat, 0)}</span>
                      <span className="text-right text-[#DC2626]/60">-{formatKr(skattPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-[#E9E8E2] pt-2 mt-1">
                      <span className="text-[#4B4E54]">Rentekostnad</span>
                      <span className="text-right text-[#1A1B1E]">{formatKr(rentekostnad, 0)}</span>
                      <span className="text-right text-[#65696F]">{formatKr(rentekostnad * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">+ Rentefradrag 22%</span>
                      <span className="text-right text-[#15803D]">+{formatKr(rentefradragPrivat, 0)}</span>
                      <span className="text-right text-[#15803D]/60">+{formatKr(rentefradragPrivat * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t-2 border-[#DCDAD2] mt-1">
                      <span className="text-[#1A1B1E] font-medium">Netto etter skatt</span>
                      <span className={`text-right font-medium ${nettoEtterSkattPrivat >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>{formatKr(nettoEtterSkattPrivat, 0)}</span>
                      <span className={`text-right ${nettoEtterSkattPrivat >= 0 ? 'text-[#15803D]/70' : 'text-[#DC2626]/70'}`}>{formatKr(nettoEtterSkattPrivat * 12, 0)}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-xs text-[#65696F] uppercase tracking-wider mb-3">Skatteberegning — Selskap (AS)</div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-[#65696F] pb-1">
                      <span />
                      <span className="text-right">Per mnd</span>
                      <span className="text-right">Per år</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">Leieinntekt</span>
                      <span className="text-right text-[#1A1B1E]">{formatKr(totalLeie, 0)}</span>
                      <span className="text-right text-[#65696F]">{formatKr(totalLeie * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">− Drift og vedlikehold</span>
                      <span className="text-right text-[#1A1B1E]">-{formatKr(faste + vedlikeholdKr, 0)}</span>
                      <span className="text-right text-[#65696F]">-{formatKr((faste + vedlikeholdKr) * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">− Rentekostnader (fradragsberettiget)</span>
                      <span className="text-right text-[#1A1B1E]">-{formatKr(rentekostnad, 0)}</span>
                      <span className="text-right text-[#65696F]">-{formatKr(rentekostnad * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm border-t border-[#E9E8E2] pt-2">
                      <span className="text-[#4B4E54]">Skattepliktig inntekt</span>
                      <span className="text-right text-[#1A1B1E]">{formatKr(skattepliktigSelskap, 0)}</span>
                      <span className="text-right text-[#65696F]">{formatKr(skattepliktigSelskap * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <span className="text-[#4B4E54]">Selskapsskatt 22%</span>
                      <span className="text-right text-[#DC2626]">-{formatKr(skattSelskap, 0)}</span>
                      <span className="text-right text-[#DC2626]/60">-{formatKr(skattSelskap * 12, 0)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm pt-3 border-t-2 border-[#DCDAD2] mt-1">
                      <span className="text-[#1A1B1E] font-medium">Netto etter selskapsskatt</span>
                      <span className={`text-right font-medium ${nettoEtterSkattSelskap >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>{formatKr(nettoEtterSkattSelskap, 0)}</span>
                      <span className={`text-right ${nettoEtterSkattSelskap >= 0 ? 'text-[#15803D]/70' : 'text-[#DC2626]/70'}`}>{formatKr(nettoEtterSkattSelskap * 12, 0)}</span>
                    </div>
                    {utbyttegrunnlag > 0 && (
                      <>
                        <div className="text-xs text-[#65696F] mt-4 mb-2 pt-2 border-t border-[#E9E8E2]">Ved uttak som utbytte (aksjonærmodellen)</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <span className="text-[#4B4E54]">Utbytteskatt 37.84%</span>
                          <span className="text-right text-[#DC2626]">-{formatKr(utbytteskatt, 0)}</span>
                          <span className="text-right text-[#DC2626]/60">-{formatKr(utbytteskatt * 12, 0)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <span className="text-[#4B4E54]">Netto etter utbytte (effektiv ~51.5%)</span>
                          <span className={`text-right ${nettoEtterUtbytte >= 0 ? 'text-[#15803D]/70' : 'text-[#DC2626]/70'}`}>{formatKr(nettoEtterUtbytte, 0)}</span>
                          <span className={`text-right ${nettoEtterUtbytte >= 0 ? 'text-[#15803D]/50' : 'text-[#DC2626]/50'}`}>{formatKr(nettoEtterUtbytte * 12, 0)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Yield */}
              {yieldBase > 0 && (
                <div className="bg-[#F6F6F4] border border-[#B45309]/20 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#65696F] uppercase tracking-wider mb-0.5">Yield</div>
                    <div className="text-xs text-[#65696F]">
                      {formatKr(totalLeieAarlig)} / {formatKr(yieldBase)}
                    </div>
                  </div>
                  <div className="text-2xl font-medium text-[#B45309]">{formatPct(yieldPct)}</div>
                </div>
              )}
            </div>
          </Card>

          {/* 10-års prognose */}
          <Card className="border-[#B45309]/10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-medium text-[#1A1B1E]">10-års prognose</h2>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => exportExcel({ form, totalLeie, faste, vedlikeholdKr, terminbelop, netto, totalKostnader })}
                  className="px-3 py-1.5 text-xs font-medium text-[#15803D] border border-[#15803D]/20 bg-[#15803D]/5 rounded-lg hover:bg-[#15803D]/15 transition-all cursor-pointer">
                  ↓ Excel
                </button>
                <button type="button"
                  onClick={() => exportPDF({ form, totalLeie, faste, vedlikeholdKr, terminbelop, netto, totalKostnader })}
                  className="px-3 py-1.5 text-xs font-medium text-[#B45309] border border-[#B45309]/20 bg-[#B45309]/5 rounded-lg hover:bg-[#B45309]/15 transition-all cursor-pointer">
                  ↓ PDF
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#65696F]">
              <span>Verdistigning: <span className="text-[#B45309]">{form.verdistigning || 4}%/år</span></span>
              <span>Utleiegrad: <span className="text-[#15803D]">{form.utleiegrad || 95}%</span></span>
              <span>Leiestigning: <span className="text-[#4B4E54]">{form.pristigningLeie || 1.5}%/år</span></span>
              <span>Kostnadsstigning: <span className="text-[#4B4E54]">{form.pristigningKostnader || 1.5}%/år</span></span>
              <span>Modus: <span className="text-[#4B4E54]">{form.skattemodus === 'selskap' ? 'Selskap (AS)' : 'Privat'}</span></span>
            </div>
            <PrognoseTabell
              form={form}
              totalLeie={totalLeie}
              totalKostnader={totalKostnader}
              terminbelop={terminbelop}
              faste={faste}
              vedlikeholdKr={vedlikeholdKr}
            />
          </Card>

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
