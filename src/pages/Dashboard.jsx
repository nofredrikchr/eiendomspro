import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, TrendingUp, Home, FileText,
  AlertTriangle, Clock, MessageSquare, ChevronRight, CheckCircle2,
  FileSignature, Receipt, CreditCard, Bell, Landmark, Megaphone, Sparkles,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/Card';
import { formatKr, formatPct, calcTerminbelop } from '../utils/format';

// ─── Kommende funksjoner ("På vei") ───────────────────────────────────────────
const PAA_VEI = [
  { ikon: FileSignature, tittel: 'BankID-signering', tekst: 'Send kontrakten til signering med BankID rett i appen.' },
  { ikon: Receipt, tittel: 'Automatisk fakturering', tekst: 'Generer husleiefaktura med KID og send til leietaker.' },
  { ikon: CreditCard, tittel: 'AvtaleGiro & innkreving', tekst: 'Automatisk månedstrekk — leien betales av seg selv.' },
  { ikon: Bell, tittel: 'Purringer & varsler', tekst: 'Automatiske påminnelser ved forfall og utløp.' },
  { ikon: TrendingUp, tittel: 'KPI-regulering', tekst: 'Juster leien etter konsumprisindeksen med ett klikk.' },
  { ikon: Landmark, tittel: 'Depositumskonto', tekst: 'Opprett depositumskonto og garanti digitalt.' },
  { ikon: Megaphone, tittel: 'Finn.no-publisering', tekst: 'Publiser utleieannonser rett til Finn.no.' },
  { ikon: MessageSquare, tittel: 'Meldinger med leietaker', tekst: 'Chat og vedlikeholdssaker direkte i appen.' },
];

function PaaVei() {
  return (
    <div className="pt-2">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} className="text-[#9A7A24]" />
        <h2 className="text-sm font-semibold text-[#1A1B1E]">På vei</h2>
      </div>
      <p className="text-xs text-[#7A7D83] mb-4">Funksjoner vi bygger nå — kommer i kommende oppdateringer.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PAA_VEI.map(({ ikon: Ikon, tittel, tekst }) => (
          <div key={tittel} className="rounded-xl border border-[#E9E8E2] bg-[#F1F1ED] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#E9E8E2] flex items-center justify-center shrink-0">
                <Ikon size={14} className="text-[#7A7D83]" />
              </div>
              <span className="text-[10px] font-medium text-[#7A7D83] bg-[#E9E8E2] px-1.5 py-0.5 rounded-full">Kommer snart</span>
            </div>
            <div className="text-sm font-medium text-[#4B4E54] mb-1">{tittel}</div>
            <div className="text-xs text-[#7A7D83] leading-relaxed">{tekst}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Beregning (gjenbruk fra ByggSkjema) ─────────────────────────────────────
function calcByggNetto(b, leieobjekter) {
  const leieObjListe = leieobjekter.filter((l) => l.byggId === b.id);
  const leieinntekter = b.leieinntekter || [];
  const leieinntekt = leieinntekter.length > 0
    ? leieinntekter.reduce((s, l) => s + Number(l.belop || 0), 0)
    : leieObjListe.reduce((s, l) => s + Number(l.forventetLeie || 0), 0);
  const terminbelop = b.laanModus === 'kalkulert'
    ? calcTerminbelop(Number(b.laanebelop), Number(b.rentesats), Number(b.nedbetalingstid))
    : Number(b.terminbelop || 0);
  const stromKostnad = b.leieInkludererStrom ? Number(b.forventetStromMnd || 0) : Number(b.strom || 0);
  const faste = Number(b.kommunaleAvgifter || 0) + Number(b.internett || 0) +
    Number(b.husforsikring || 0) + Number(b.alarm || 0) + stromKostnad +
    (b.tilleggskostnader || []).reduce((s, t) => s + Number(t.belop || 0), 0);
  const vedlikeholdKr = leieinntekt * (Number(b.vedlikeholdProsent || 3) / 100);
  const netto = leieinntekt - terminbelop - faste - vedlikeholdKr;
  const totalInvestering = Number(b.kjoepesum || 0) + Number(b.oppussing || 0);
  const yieldPct = totalInvestering > 0 ? (leieinntekt * 12 / totalInvestering) * 100 : 0;
  return { netto, leieinntekt, yieldPct, totalInvestering };
}

// ─── Hjelp: dager til dato ───────────────────────────────────────────────────
function dagerTil(dato) {
  return Math.round((new Date(dato) - new Date()) / 86400000);
}
function datoKort(d) {
  return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Varsel-kort ─────────────────────────────────────────────────────────────
function VarselRad({ tittel, sub, farge, ikon: Ikon, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer hover:bg-black/[0.02]"
      style={{ borderColor: `${farge}25`, background: `${farge}06` }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${farge}15` }}>
        <Ikon size={14} style={{ color: farge }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1A1B1E] truncate">{tittel}</div>
        <div className="text-xs text-[#7A7D83] mt-0.5">{sub}</div>
      </div>
      <ChevronRight size={14} className="text-[#AEB0B4] shrink-0" />
    </div>
  );
}

// ─── Onboarding-sjekkliste ────────────────────────────────────────────────────
function Onboarding({ steg, navigate, kompakt }) {
  const ferdige = steg.filter((s) => s.ferdig).length;
  const neste = steg.find((s) => !s.ferdig);
  const prosent = Math.round((ferdige / steg.length) * 100);

  return (
    <div className="rounded-2xl border border-[#9A7A24]/25 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(201,168,76,0.01))' }}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#9A7A24]" />
            <h2 className="text-sm font-semibold text-[#1A1B1E]">{kompakt ? 'Fullfør oppsettet' : 'Velkommen til EiendomsPRO 👋'}</h2>
          </div>
          <span className="text-xs text-[#9A7A24] num">{ferdige}/{steg.length} fullført</span>
        </div>
        {!kompakt && (
          <p className="text-sm text-[#65696F] mb-4">Tre raske steg så har du full oversikt og lønnsomhetsanalyse over utleien din.</p>
        )}

        {/* Fremdriftslinje */}
        <div className="h-1.5 bg-[#E9E8E2] rounded-full overflow-hidden mb-4">
          <div className="h-full bg-[#9A7A24] rounded-full transition-all duration-500" style={{ width: `${prosent}%` }} />
        </div>

        <div className="space-y-2">
          {steg.map((s, i) => {
            const erNeste = neste && s.label === neste.label;
            return (
              <div key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
                  ${s.ferdig ? 'border-[#E9E8E2] bg-[#F1F1ED]' : erNeste ? 'border-[#9A7A24]/30 bg-[#9A7A24]/5' : 'border-[#E9E8E2] bg-[#F1F1ED]'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0
                  ${s.ferdig ? 'bg-[#15803D]/15' : 'bg-[#E9E8E2]'}`}>
                  {s.ferdig ? <CheckCircle2 size={13} className="text-[#15803D]" /> : <span className="text-xs text-[#65696F] num">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${s.ferdig ? 'text-[#7A7D83] line-through' : 'text-[#1A1B1E]'}`}>{s.label}</div>
                  {!s.ferdig && <div className="text-xs text-[#7A7D83] mt-0.5">{s.tekst}</div>}
                </div>
                {!s.ferdig && erNeste && (
                  <Button variant="primary" size="sm" onClick={() => navigate(s.lenke)}>
                    {s.cta} <ChevronRight size={13} />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Hoved ───────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { bygg, leieobjekter, kontrakter, meldinger = [] } = useApp();

  const byggMedNetto = bygg.map((b) => ({
    ...b,
    ...calcByggNetto(b, leieobjekter),
    antallObj: leieobjekter.filter((l) => l.byggId === b.id).length,
  }));

  const totalNetto = byggMedNetto.reduce((s, b) => s + b.netto, 0);
  const aktiveKontrakter = kontrakter.filter((k) => {
    if (k.kontraktstype === 'tidsubestemt' || !k.sluttdato) return true;
    return new Date(k.sluttdato) >= new Date();
  });
  const ledigeLeieobjekter = leieobjekter.filter((l) => l.status === 'ledig');
  const byggMedInvestering = byggMedNetto.filter((b) => b.totalInvestering > 0);
  const snittYield = byggMedInvestering.length > 0
    ? byggMedInvestering.reduce((s, b) => s + b.yieldPct, 0) / byggMedInvestering.length
    : 0;

  // Kontrakter som utløper innen 90 dager
  const utloperSnart = kontrakter.filter((k) => {
    if (!k.sluttdato || k.kontraktstype === 'tidsubestemt') return false;
    const d = dagerTil(k.sluttdato);
    return d >= 0 && d <= 90;
  }).sort((a, b) => new Date(a.sluttdato) - new Date(b.sluttdato));

  // Uleste meldinger
  const ulisteMeldinger = meldinger.filter((m) => !m.lest && m.avsender === 'leietaker');

  // Onboarding-steg
  const steg = [
    { label: 'Legg til ditt første bygg', tekst: 'Adresse, leieinntekter, lån og kostnader.', cta: 'Legg til bygg', lenke: '/bygg/ny', ferdig: bygg.length > 0 },
    { label: 'Registrer et leieobjekt', tekst: 'Koble en utleieenhet til bygget.', cta: 'Legg til', lenke: '/leieobjekter/ny', ferdig: leieobjekter.length > 0 },
    { label: 'Opprett en leiekontrakt', tekst: 'Generer en ferdig leiekontrakt som PDF.', cta: 'Opprett', lenke: '/kontrakter/ny', ferdig: kontrakter.length > 0 },
  ];
  const onboardingFerdig = steg.every((s) => s.ferdig);

  // Tom-stat — vis onboarding som hovedinnhold
  if (bygg.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Oversikt</h1>
          <p className="text-sm text-[#65696F] mt-1">Velkommen til EiendomsPRO</p>
        </div>
        <Onboarding steg={steg} navigate={navigate} />
        <PaaVei />
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Oversikt</h1>
          <p className="text-sm text-[#65696F] mt-1">Din eiendomsportefølje</p>
        </div>
        <Button onClick={() => navigate('/bygg/ny')} variant="secondary" size="sm">
          <Plus size={13} /> Nytt bygg
        </Button>
      </div>

      {/* Onboarding-banner når oppsettet ikke er fullført */}
      {!onboardingFerdig && <Onboarding steg={steg} navigate={navigate} kompakt />}

      {/* KPI-kort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Nettoinntekt/mnd" value={formatKr(totalNetto)}
          color={totalNetto >= 0 ? 'green' : 'red'}
          sub={`${bygg.length} bygg totalt`} icon={<TrendingUp size={16} />} />
        <StatCard label="Aktive leieforhold" value={aktiveKontrakter.length}
          color="blue" sub={`av ${kontrakter.length} kontrakter`} icon={<FileText size={16} />} />
        <StatCard label="Ledige objekter" value={ledigeLeieobjekter.length}
          color={ledigeLeieobjekter.length > 0 ? 'red' : 'green'}
          sub={`av ${leieobjekter.length} totalt`} icon={<Home size={16} />} />
        <StatCard label="Snitt yield" value={snittYield > 0 ? formatPct(snittYield) : '—'}
          color="yellow"
          sub={byggMedInvestering.length > 0 ? `${byggMedInvestering.length} bygg med data` : 'Legg inn kjøpesum'}
          icon={<Building2 size={16} />} />
      </div>

      {/* Varsler */}
      {(utloperSnart.length > 0 || ledigeLeieobjekter.length > 0 || ulisteMeldinger.length > 0) && (
        <div>
          <h2 className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest mb-3">Krever oppfølging</h2>
          <div className="space-y-2">

            {ulisteMeldinger.length > 0 && (
              <VarselRad
                ikon={MessageSquare}
                farge="#2563EB"
                tittel={`${ulisteMeldinger.length} ulest${ulisteMeldinger.length > 1 ? 'e' : ''} melding${ulisteMeldinger.length > 1 ? 'er' : ''} fra leietaker`}
                sub="Gå til innboks for å svare"
                onClick={() => navigate('/meldinger')}
              />
            )}

            {utloperSnart.map((k) => {
              const dager = dagerTil(k.sluttdato);
              const farge = dager < 30 ? '#DC2626' : '#B45309';
              const obj = leieobjekter.find((l) => l.id === k.leieobjektId);
              const b = obj ? bygg.find((b) => b.id === obj.byggId) : null;
              return (
                <VarselRad
                  key={k.id}
                  ikon={Clock}
                  farge={farge}
                  tittel={`${k.leietakerNavn} — kontrakt utløper om ${dager} dager`}
                  sub={`${b ? `${b.gatenavn} ${b.gatenummer}` : ''}${obj?.betegnelse ? ` · ${obj.betegnelse}` : ''} · ${datoKort(k.sluttdato)}`}
                  onClick={() => navigate(`/kontrakter/${k.id}`)}
                />
              );
            })}

            {ledigeLeieobjekter.map((l) => {
              const b = bygg.find((b) => b.id === l.byggId);
              return (
                <VarselRad
                  key={l.id}
                  ikon={AlertTriangle}
                  farge="#DC2626"
                  tittel={`Ledig enhet: ${l.betegnelse || l.type || 'Ukjent'}`}
                  sub={b ? `${b.gatenavn} ${b.gatenummer}` : 'Ukjent bygg'}
                  onClick={() => navigate(`/leieobjekter/${l.id}`)}
                />
              );
            })}

          </div>
        </div>
      )}

      {/* Alt OK — ingen varsler */}
      {utloperSnart.length === 0 && ledigeLeieobjekter.length === 0 && ulisteMeldinger.length === 0 && aktiveKontrakter.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#15803D]/20 bg-[#15803D]/5">
          <CheckCircle2 size={16} className="text-[#15803D] shrink-0" />
          <span className="text-sm text-[#15803D]">Alt ser bra ut — ingen kontrakter utløper snart og alle enheter er utleid.</span>
        </div>
      )}

      {/* Bygg-liste */}
      <div>
        <h2 className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest mb-3">Alle bygg</h2>
        <div className="grid gap-2">
          {byggMedNetto.map((b) => {
            const ledigCount = leieobjekter.filter((l) => l.byggId === b.id && l.status === 'ledig').length;
            return (
              <div key={b.id} onClick={() => navigate(`/bygg/${b.id}`)}
                className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 cursor-pointer hover:border-[#DCDAD2] hover:bg-[#FAF9F6] transition-all duration-150 group">
                <div className="flex items-center gap-4">
                  {b.bilde ? (
                    <img src={b.bilde} alt={b.gatenavn} className="w-10 h-10 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-10 h-10 bg-[#E9E8E2] rounded-lg flex items-center justify-center shrink-0">
                      <Building2 size={16} className="text-[#AEB0B4]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-[#1A1B1E] text-sm">{b.gatenavn} {b.gatenummer}</div>
                        <div className="text-xs text-[#7A7D83] mt-0.5">
                          {b.postnummer} {b.poststed} · {b.antallObj} enhet{b.antallObj !== 1 ? 'er' : ''}
                          {ledigCount > 0 && (
                            <span className="ml-2 text-[#DC2626]">· {ledigCount} ledig{ledigCount > 1 ? 'e' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold num ${b.netto >= 0 ? 'text-[#15803D]' : 'text-[#DC2626]'}`}>
                          {formatKr(b.netto)}/mnd
                        </div>
                        {b.yieldPct > 0 && (
                          <div className="text-xs text-[#B45309] num mt-0.5">{formatPct(b.yieldPct)} yield</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={15} className="text-[#AEB0B4] group-hover:text-[#65696F] shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Siste kontrakter */}
      {aktiveKontrakter.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest">Aktive leieforhold</h2>
            <button onClick={() => navigate('/kontrakter')}
              className="text-xs text-[#7A7D83] hover:text-[#1A1B1E] transition-colors cursor-pointer">
              Se alle →
            </button>
          </div>
          <div className="grid gap-2">
            {aktiveKontrakter.slice(0, 5).map((k) => {
              const obj = leieobjekter.find((l) => l.id === k.leieobjektId);
              const b = obj ? bygg.find((b) => b.id === obj.byggId) : null;
              const utloperOm = k.sluttdato ? dagerTil(k.sluttdato) : null;
              return (
                <div key={k.id} onClick={() => navigate(`/kontrakter/${k.id}`)}
                  className="flex items-center gap-4 bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl px-4 py-3 hover:border-[#DCDAD2] transition-all cursor-pointer group">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#1A1B1E]">{k.leietakerNavn}</div>
                    <div className="text-xs text-[#7A7D83] mt-0.5">
                      {b ? `${b.gatenavn} ${b.gatenummer}` : '—'}{obj?.betegnelse ? ` · ${obj.betegnelse}` : ''}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-[#15803D] font-medium num">{formatKr(k.maanedligLeie)}/mnd</div>
                    {utloperOm !== null && (
                      <div className={`text-xs num mt-0.5 ${utloperOm < 30 ? 'text-[#DC2626]' : utloperOm < 90 ? 'text-[#B45309]' : 'text-[#7A7D83]'}`}>
                        {utloperOm < 0 ? 'Utløpt' : `${utloperOm}d igjen`}
                      </div>
                    )}
                    {utloperOm === null && <div className="text-xs text-[#7A7D83] mt-0.5">Løpende</div>}
                  </div>
                  <ChevronRight size={14} className="text-[#AEB0B4] group-hover:text-[#65696F] shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* På vei — kommende funksjoner */}
      <PaaVei />

    </div>
  );
}
