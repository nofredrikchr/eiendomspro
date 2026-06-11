import { useNavigate } from 'react-router-dom';
import {
  Plus, Building2, TrendingUp, Home, FileText,
  AlertTriangle, Clock, MessageSquare, ChevronRight, CheckCircle2,
  FileSignature, Receipt, CreditCard, Bell, Landmark, Megaphone, Sparkles,
  MapPin, Percent,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { StatCard } from '../components/ui/Card';
import { Photo, Pill, IconTile, PageHeader, SectionCard } from '../components/ui/kit';
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
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} className="text-brand" />
        <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">På vei</h2>
      </div>
      <p className="text-[13px] font-medium text-muted-2 mb-4">Funksjoner vi bygger nå — kommer i kommende oppdateringer.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {PAA_VEI.map(({ ikon: Ikon, tittel, tekst }) => (
          <div key={tittel} className="rounded-[18px] border border-line bg-sand p-4">
            <div className="flex items-center gap-2 mb-2.5">
              <IconTile tone="sand" size={28} radius={9}><Ikon size={14} /></IconTile>
              <span className="text-[10px] font-bold text-faint bg-line-soft px-2 py-0.5 rounded-full">Kommer</span>
            </div>
            <div className="text-[13.5px] font-bold text-ink-2 mb-1">{tittel}</div>
            <div className="text-xs font-medium text-muted-2 leading-relaxed">{tekst}</div>
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

const dagerTil = (dato) => Math.round((new Date(dato) - new Date()) / 86400000);
const datoKort = (d) => new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' });

function hilsen() {
  const t = new Date().getHours();
  if (t < 6) return 'God natt';
  if (t < 11) return 'God morgen';
  if (t < 18) return 'God dag';
  return 'God kveld';
}
function datoLang() {
  const s = new Date().toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Oppfølgingsrad ───────────────────────────────────────────────────────────
function OppfolgingRad({ tittel, sub, tone = 'amber', ikon: Ikon, onClick }) {
  const styles = tone === 'mint'
    ? 'border-mint-line bg-mint-soft hover:border-[#9DD4C9]'
    : 'border-amber-line bg-amber-soft hover:border-amber-line-strong';
  return (
    <div onClick={onClick}
      className={`flex items-center gap-3.5 px-3.5 py-3.5 rounded-[13px] border cursor-pointer transition-all hover:translate-x-0.5 ${styles}`}>
      <IconTile tone={tone === 'mint' ? 'mint' : 'amber'} size={36}><Ikon size={16} /></IconTile>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-bold text-ink truncate">{tittel}</div>
        <div className="text-[12.5px] font-medium text-muted-2 mt-0.5">{sub}</div>
      </div>
      <ChevronRight size={15} className="text-faint-2 shrink-0" />
    </div>
  );
}

// ─── Onboarding-sjekkliste ────────────────────────────────────────────────────
function Onboarding({ steg, navigate, kompakt }) {
  const ferdige = steg.filter((s) => s.ferdig).length;
  const neste = steg.find((s) => !s.ferdig);
  const prosent = Math.round((ferdige / steg.length) * 100);

  return (
    <div className="rounded-[20px] border border-mint-line bg-mint-soft overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand" />
            <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink">{kompakt ? 'Fullfør oppsettet' : 'Velkommen til Eiendomspro'}</h2>
          </div>
          <span className="text-xs font-bold text-brand-ink num">{ferdige}/{steg.length} fullført</span>
        </div>
        {!kompakt && (
          <p className="text-sm font-medium text-muted mb-4">Tre raske steg så har du full oversikt og lønnsomhetsanalyse over utleien din.</p>
        )}

        <div className="h-1.5 bg-mint rounded-full overflow-hidden mb-4">
          <div className="h-full bg-brand rounded-full transition-all duration-500" style={{ width: `${prosent}%` }} />
        </div>

        <div className="space-y-2">
          {steg.map((s, i) => {
            const erNeste = neste && s.label === neste.label;
            return (
              <div key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[13px] border transition-all
                  ${erNeste ? 'border-mint-line bg-surface' : 'border-line bg-surface/60'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${s.ferdig ? 'bg-mint' : 'bg-line-soft'}`}>
                  {s.ferdig ? <CheckCircle2 size={13} className="text-brand-ink" /> : <span className="text-xs font-bold text-muted num">{i + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-bold ${s.ferdig ? 'text-faint line-through' : 'text-ink'}`}>{s.label}</div>
                  {!s.ferdig && <div className="text-xs font-medium text-muted-2 mt-0.5">{s.tekst}</div>}
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
  const { bruker } = useAuth();
  const fornavn = (bruker?.navn || '').split(' ')[0];

  const byggMedNetto = bygg.map((b) => ({
    ...b,
    ...calcByggNetto(b, leieobjekter),
    antallObj: leieobjekter.filter((l) => l.byggId === b.id).length,
  }));

  const totalNetto = byggMedNetto.reduce((s, b) => s + b.netto, 0);
  const brutto = byggMedNetto.reduce((s, b) => s + b.leieinntekt, 0);
  const aktiveKontrakter = kontrakter.filter((k) => {
    if (k.kontraktstype === 'tidsubestemt' || !k.sluttdato) return true;
    return new Date(k.sluttdato) >= new Date();
  });
  const ledigeLeieobjekter = leieobjekter.filter((l) => l.status === 'ledig');
  const byggMedInvestering = byggMedNetto.filter((b) => b.totalInvestering > 0);
  const snittYield = byggMedInvestering.length > 0
    ? byggMedInvestering.reduce((s, b) => s + b.yieldPct, 0) / byggMedInvestering.length
    : 0;

  const utloperSnart = kontrakter.filter((k) => {
    if (!k.sluttdato || k.kontraktstype === 'tidsubestemt') return false;
    const d = dagerTil(k.sluttdato);
    return d >= 0 && d <= 90;
  }).sort((a, b) => new Date(a.sluttdato) - new Date(b.sluttdato));

  const ulisteMeldinger = meldinger.filter((m) => !m.lest && m.avsender === 'leietaker');

  const steg = [
    { label: 'Legg til ditt første bygg', tekst: 'Adresse, leieinntekter, lån og kostnader.', cta: 'Legg til bygg', lenke: '/bygg/ny', ferdig: bygg.length > 0 },
    { label: 'Registrer et leieobjekt', tekst: 'Koble en utleieenhet til bygget.', cta: 'Legg til', lenke: '/leieobjekter/ny', ferdig: leieobjekter.length > 0 },
    { label: 'Opprett en leiekontrakt', tekst: 'Generer en ferdig leiekontrakt som PDF.', cta: 'Opprett', lenke: '/kontrakter/ny', ferdig: kontrakter.length > 0 },
  ];
  const onboardingFerdig = steg.every((s) => s.ferdig);

  // Tom-stat — vis onboarding som hovedinnhold
  if (bygg.length === 0) {
    return (
      <div className="space-y-7 animate-fade-up">
        <PageHeader tittel={`${hilsen()}${fornavn ? `, ${fornavn}` : ''}`} undertittel="Velkommen til Eiendomspro — la oss komme i gang." />
        <Onboarding steg={steg} navigate={navigate} />
        <PaaVei />
      </div>
    );
  }

  const harOppfolging = utloperSnart.length > 0 || ledigeLeieobjekter.length > 0 || ulisteMeldinger.length > 0;
  const antallOppfolging = utloperSnart.length + ledigeLeieobjekter.length + (ulisteMeldinger.length > 0 ? 1 : 0);
  const bars = [0.96, 0.94, 0.97, 0.95, 0.9, 0.9]; // illustrativ 6-mnd profil (stabil leie)
  const mndNavn = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun'];

  return (
    <div className="space-y-7 animate-fade-up">
      <PageHeader tittel={`${hilsen()}${fornavn ? `, ${fornavn}` : ''}`} undertittel={`Her er status for porteføljen din — ${datoLang()}`}>
        <Button onClick={() => navigate('/bygg/ny')}>
          <Plus size={15} strokeWidth={2.4} /> Nytt bygg
        </Button>
      </PageHeader>

      {!onboardingFerdig && <Onboarding steg={steg} navigate={navigate} kompakt />}

      {/* Nøkkeltall */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 215px), 1fr))' }}>
        <StatCard label="Nettoinntekt / mnd" value={formatKr(totalNetto)}
          color={totalNetto >= 0 ? 'green' : 'red'} sub={`${bygg.length} bygg totalt`} icon={<TrendingUp size={16} />} />
        <StatCard label="Aktive leieforhold" value={aktiveKontrakter.length}
          color="ink" sub={`av ${kontrakter.length} kontrakter totalt`} icon={<FileText size={16} />} />
        <StatCard label="Ledige objekter" value={ledigeLeieobjekter.length}
          color={ledigeLeieobjekter.length > 0 ? 'amber' : 'green'}
          sub={`av ${leieobjekter.length} totalt`} icon={<Home size={16} />} />
        <StatCard label="Snitt yield" value={snittYield > 0 ? formatPct(snittYield) : '—'}
          color="green" sub={byggMedInvestering.length > 0 ? `${byggMedInvestering.length} bygg med data` : 'Legg inn kjøpesum'}
          icon={<Percent size={16} />} />
      </div>

      {/* Oppfølging + inntekter */}
      <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 330px), 1fr))' }}>
        <SectionCard
          tittel={
            <span className="flex items-center gap-2.5">
              Krever oppfølging
              {harOppfolging && <Pill tone="amber">{antallOppfolging}</Pill>}
            </span>
          }>
          {harOppfolging ? (
            <div className="flex flex-col gap-2.5">
              {ulisteMeldinger.length > 0 && (
                <OppfolgingRad tone="mint" ikon={MessageSquare}
                  tittel={`${ulisteMeldinger.length} ulest${ulisteMeldinger.length > 1 ? 'e' : ''} melding${ulisteMeldinger.length > 1 ? 'er' : ''} fra leietaker`}
                  sub="Gå til innboks for å svare" onClick={() => navigate('/meldinger')} />
              )}
              {utloperSnart.map((k) => {
                const obj = leieobjekter.find((l) => l.id === k.leieobjektId);
                const b = obj ? bygg.find((bb) => bb.id === obj.byggId) : null;
                return (
                  <OppfolgingRad key={k.id} tone="amber" ikon={Clock}
                    tittel={`Kontrakten til ${k.leietakerNavn} utløper om ${dagerTil(k.sluttdato)} dager`}
                    sub={`${b ? `${b.gatenavn} ${b.gatenummer}` : ''}${obj?.betegnelse ? ` · ${obj.betegnelse}` : ''} · ${datoKort(k.sluttdato)}`}
                    onClick={() => navigate(`/kontrakter/${k.id}`)} />
                );
              })}
              {ledigeLeieobjekter.map((l) => {
                const b = bygg.find((bb) => bb.id === l.byggId);
                return (
                  <OppfolgingRad key={l.id} tone="amber" ikon={AlertTriangle}
                    tittel={`${b ? `${b.gatenavn} ${b.gatenummer}` : 'Enhet'}${l.betegnelse ? ` · ${l.betegnelse}` : ''} står ledig`}
                    sub={`${l.type || 'Leieobjekt'}${l.forventetLeie ? ` · Forventet leie ${formatKr(l.forventetLeie)}/mnd` : ''}`}
                    onClick={() => navigate(`/leieobjekter/${l.id}`)} />
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-4 py-3.5 rounded-[13px] border border-mint-line bg-mint-soft">
              <CheckCircle2 size={16} className="text-brand-ink shrink-0" />
              <span className="text-[13.5px] font-semibold text-ink-2">Alt ser bra ut — ingenting utløper snart, og alle enheter er utleid.</span>
            </div>
          )}
        </SectionCard>

        <div className="bg-surface border border-line rounded-[20px] p-[22px] flex flex-col">
          <div className="flex items-baseline justify-between gap-2.5 mb-1">
            <h2 className="m-0 text-base font-extrabold tracking-[-0.01em] text-ink">Leieinntekter</h2>
            <span className="text-[12.5px] font-semibold text-muted-2">Brutto · per måned</span>
          </div>
          <div className="text-[22px] font-extrabold tracking-[-0.02em] mb-[18px] num">{formatKr(brutto)} <span className="text-[13px] font-semibold text-muted-2">i {mndNavn[5].toLowerCase()}</span></div>
          <div className="flex-1 flex items-end gap-2.5 min-h-[130px]">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-[7px]">
                <div className="w-full rounded-t-lg rounded-b" style={{ height: `${h * 116}px`, background: i === 5 ? '#0E9384' : '#E3F3F0' }} />
                <span className={`text-[11px] font-bold ${i === 5 ? 'text-brand-ink' : 'text-faint'}`}>{mndNavn[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portefølje */}
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h2 className="m-0 text-lg font-extrabold tracking-[-0.015em] text-ink">Porteføljen din</h2>
        <span onClick={() => navigate('/bygg')} className="text-[13.5px] font-bold text-brand-ink cursor-pointer hover:underline">Se alle bygg</span>
      </div>
      <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 270px), 1fr))' }}>
        {byggMedNetto.map((b) => {
          const ledigCount = leieobjekter.filter((l) => l.byggId === b.id && l.status === 'ledig').length;
          const utleid = b.antallObj - ledigCount;
          const statusTekst = b.antallObj === 0 ? 'Ingen enheter' : ledigCount === 0 ? 'Fullt utleid' : `${utleid} av ${b.antallObj} utleid`;
          return (
            <div key={b.id} onClick={() => navigate(`/bygg/${b.id}`)}
              className="bg-surface border border-line rounded-[20px] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lift">
              <Photo src={b.bilde} alt={b.gatenavn} className="aspect-[16/10]" icon={<Building2 size={28} strokeWidth={1.6} />}>
                <span className="absolute top-3 left-3 bg-white/95 text-[11.5px] font-extrabold text-ink-2 px-2.5 py-1 rounded-full">{statusTekst}</span>
              </Photo>
              <div className="px-[18px] pt-[17px] pb-[18px]">
                <div className="text-base font-extrabold tracking-[-0.01em] mb-0.5">{b.gatenavn} {b.gatenummer}</div>
                <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 mb-3.5">
                  <MapPin size={13} /> {[b.postnummer, b.poststed].filter(Boolean).join(' ') || '—'}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Pill tone="neutral">{b.antallObj} leieobjekt{b.antallObj !== 1 ? 'er' : ''}</Pill>
                  <Pill tone="mint">{formatKr(b.netto)}/mnd netto</Pill>
                  {b.yieldPct > 0 && <Pill tone="neutral">Yield {formatPct(b.yieldPct)}</Pill>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PaaVei />
    </div>
  );
}
