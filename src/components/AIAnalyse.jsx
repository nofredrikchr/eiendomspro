import { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { aiApi } from '../services/entitetApi';
import { Button } from './ui/Button';
import { IconTile } from './ui/kit';

function buildPrompt({ form, totalLeie, faste, vedlikeholdKr, terminbelop, netto, totalKostnader, nettoEtterSkatt, skatt, totalInvestering, startBoligverdi }) {
  const adresse = `${form.gatenavn || ''} ${form.gatenummer || ''}, ${form.poststed || ''}`.trim();
  const skattemodus = form.skattemodus === 'selskap' ? 'Selskap (AS)' : 'Privat';
  const leieListe = (form.leieinntekter || []).filter(l => l.belop).map(l => `  - ${l.navn || 'Leieobjekt'}: ${Number(l.belop).toLocaleString('nb-NO')} kr/mnd`).join('\n');
  const yieldPct = totalInvestering > 0 ? ((totalLeie * 12) / totalInvestering * 100).toFixed(2) : 0;

  return `Du er en erfaren norsk eiendomsinvestor og finansrådgiver med 20+ års erfaring fra det norske utleiemarkedet. Du skal lage en profesjonell investeringsanalyse for bankpresentasjon. Skriv på norsk, bruk faglig tone, og strukturer analysen tydelig.

EIENDOMSDATA:
- Adresse: ${adresse || 'Ikke oppgitt'}
- Bygningstype: ${form.bygningstype || 'Ikke oppgitt'}
- Kjøpesum: ${Number(form.kjoepesum || 0).toLocaleString('nb-NO')} kr
- Oppussing: ${Number(form.oppussing || 0).toLocaleString('nb-NO')} kr
- Total investering: ${totalInvestering.toLocaleString('nb-NO')} kr
- Markedsverdi (takst): ${startBoligverdi.toLocaleString('nb-NO')} kr
- Eierform: ${skattemodus}

LEIEINNTEKTER (månedlig):
${leieListe || '  Ikke oppgitt'}
- Total leieinntekt: ${Math.round(totalLeie).toLocaleString('nb-NO')} kr/mnd

MÅNEDLIGE KOSTNADER:
- Terminbeløp lån: ${Math.round(terminbelop).toLocaleString('nb-NO')} kr/mnd
- Faste driftskostnader: ${Math.round(faste).toLocaleString('nb-NO')} kr/mnd
- Vedlikehold (${form.vedlikeholdProsent || 3}%): ${Math.round(vedlikeholdKr).toLocaleString('nb-NO')} kr/mnd
- Total kostnader: ${Math.round(totalKostnader).toLocaleString('nb-NO')} kr/mnd

NØKKELTALL:
- Netto kontantstrøm før skatt: ${Math.round(netto).toLocaleString('nb-NO')} kr/mnd
- Skattekostnad: ${Math.round(skatt).toLocaleString('nb-NO')} kr/mnd
- Netto etter skatt: ${Math.round(nettoEtterSkatt).toLocaleString('nb-NO')} kr/mnd
- Brutto yield: ${yieldPct}%
- Lånebeløp: ${Number(form.laanebelop || 0).toLocaleString('nb-NO')} kr
- Rente: ${form.rentesats || 0}%
- Nedbetalingstid: ${form.nedbetalingstid || 0} år
- Forventet verdistigning: ${form.verdistigning || 4}%/år
- Utleiegrad: ${form.utleiegrad || 95}%

Lag en strukturert analyse med disse seksjonene:

## Investeringsoversikt
Kort sammendrag av eiendommen og investeringens overordnede karakter.

## Finansiell analyse
Vurder lønnsomheten, yield, kontantstrøm og skattemessig optimalisering. Sammenlign med typiske markedsstandarder for norsk utleieeiendom.

## Risikovurdering
Identifiser de 3-5 viktigste risikoene ved dette investeringscase og vurder deres sannsynlighet og konsekvens.

## Bankens perspektiv
Vurder investeringen sett fra en banks ståsted — betjeningsevne, sikkerhetsverdi, LTV og hvilke forhold banken typisk vil fokusere på.

## Anbefaling og konklusjon
En klar, faglig anbefaling. Er dette et godt investeringscase? Hva bør optimaliseres?

Vær konkret, bruk tallene fra datagrunnlaget, og skriv slik at en bankrådgiver oppfatter dette som en seriøs og gjennomarbeidet analyse.`;
}

const DEMO_ANALYSE = `## Investeringsoversikt
Bjørneveien 8 i Grålum er en tomannsbolig med 3 etasjer og 5 separate leieinntektskilder. Eiendommen genererer en samlet brutto leieinntekt på 47 100 kr per måned, noe som tilsvarer 565 200 kr årlig. Med et månedlig terminbeløp på 18 789 kr (lån 3 500 000 kr, 5% rente, 30 år) og drifts- og vedlikeholdskostnader på 6 228 kr/mnd, sitter investor igjen med en netto kontantstrøm på 22 083 kr per måned — et solid driftsresultat for denne type eiendom.

## Finansiell analyse
Kontantstrømmen på 22 083 kr/mnd (264 996 kr/år) er sterk og gir god betjeningsevne. Leieinntektene er godt diversifisert over fem enheter, som reduserer konsentrasjonsrisikoen betraktelig sammenlignet med en enkelt leietaker.

Skattemessig er privat utleiemodell valgt. Skattepliktig inntekt beregnes som leieinntekt minus drift og vedlikehold (6 228 kr/mnd), noe som gir en skattepliktig inntekt på ca. 40 872 kr/mnd. Rentekostnaden på ca. 14 583 kr/mnd gir et separat rentefradrag på 22%, tilsvarende 3 208 kr/mnd i skattereduksjon. Netto etter skatt estimeres til rundt 16 290 kr/mnd.

Yield er ikke kalkulerbar uten kjøpesum, men leienivået på 47 100 kr/mnd for en tomannsbolig i Grålum-området er konkurransedyktig og indikerer høy utnyttelsesgrad.

## Risikovurdering
- **Tomgangsrisiko (lav–middels):** Med fem leieenheter vil én tom enhet kun redusere inntekten med 12–32%. Utleiegrad på 95% er realistisk i dette markedet.
- **Renterisiko (middels):** Lånet på 3 500 000 kr med 5% rente er priset inn. Øker renten til 7%, øker terminbeløpet til ca. 23 300 kr/mnd — fortsatt positiv kontantstrøm, men marginen reduseres vesentlig.
- **Vedlikeholdsrisiko (lav):** Avsetning på 3% av leieinntekt (1 413 kr/mnd) er konservativt for en eldre tomannsbolig. Større tak-, rør- eller fasadearbeider kan komme i tillegg.
- **Regulatorisk risiko (lav):** Ingen indikasjoner på reguleringsendringer som påvirker utleiemarkedet i Grålum-området.
- **Leietakerrisiko (lav):** Diversifisering over fem enheter demper effekten av mislighold fra én leietaker.

## Bankens perspektiv
Banken vil primært vurdere betjeningsevnen opp mot stresset rente (typisk +2–3 pp). Ved 8% rente vil terminbeløpet øke til ca. 25 700 kr/mnd. Netto kontantstrøm vil fortsatt være positiv (ca. 14 200 kr/mnd), noe som er positivt.

Uten oppgitt kjøpesum og takst kan LTV ikke beregnes — dette er normalt et krav fra banken. Det anbefales å legge inn kjøpesum og eventuell ny takst for å få en komplett analyse. Banken vil typisk kreve LTV under 75–80% for investeringseiendom.

Leieinntektene bør dokumenteres med signerte leiekontrakter for alle fem enheter. Banken vil normalt godta 70–80% av dokumenterte leieinntekter i betjeningsevneberegningen.

## Anbefaling og konklusjon
Bjørneveien 8 fremstår som et attraktivt investeringscase med sterk og diversifisert kontantstrøm. Fem leieenheter i en tomannsbolig gir god risikospredning, og driftsnettoen er solid selv ved renteøkning.

**Viktigste forbedringsområder før bankpresentasjon:**
- Legg inn kjøpesum og takst for å beregne yield og LTV
- Dokumenter alle leiekontrakter
- Vurder om selskapsstruktur (AS) kan gi skattefordeler på sikt

Samlet sett er dette et case en bank vil se positivt på, forutsatt at LTV er innenfor akseptable rammer.`;

export default function AIAnalyse({ form, totalLeie, faste, vedlikeholdKr, terminbelop, netto, totalKostnader, nettoEtterSkatt, skatt, totalInvestering, startBoligverdi }) {
  const [analyse, setAnalyse] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const visibleAnalyse = analyse || (showDemo ? DEMO_ANALYSE : '');

  async function genererAnalyse() {
    setLoading(true);
    setError('');
    setAnalyse('');
    try {
      const prompt = buildPrompt({ form, totalLeie, faste, vedlikeholdKr, terminbelop, netto, totalKostnader, nettoEtterSkatt, skatt, totalInvestering, startBoligverdi });
      // AI kalles via server-side proxy (/api/ai) — ingen nøkkel i nettleseren.
      const tekst = await aiApi.generer(prompt);
      setAnalyse(tekst);
      setExpanded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function kopier() {
    await navigator.clipboard.writeText(visibleAnalyse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderAnalyse(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-sm font-extrabold tracking-[-0.01em] text-brand-ink mt-5 mb-2">{line.slice(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-base font-extrabold tracking-[-0.01em] text-ink mt-4 mb-2">{line.slice(2)}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="text-sm font-medium text-muted leading-relaxed ml-4 list-disc">{line.slice(2)}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm font-medium text-muted leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="bg-surface border border-mint-line rounded-[20px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-5 border-b border-line bg-mint-soft">
        <div className="flex items-center gap-3 min-w-0">
          <IconTile tone="mint" size={36}><Sparkles size={17} /></IconTile>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold tracking-[-0.01em] text-ink">AI-analyse for bankpresentasjon</h3>
            <p className="text-xs font-semibold text-muted-2">Generert av Claude — norsk eiendomsekspert</p>
          </div>
        </div>
        {visibleAnalyse && (
          <button onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'Skjul analyse' : 'Vis analyse'}
            className="p-2 text-muted-2 hover:text-ink hover:bg-line-soft rounded-[10px] transition-colors cursor-pointer shrink-0">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        {!visibleAnalyse && !loading && (
          <div className="text-center py-6">
            <p className="text-sm font-medium text-muted mb-5">
              Klikk for å generere en profesjonell investeringsanalyse basert på dine tall.
            </p>
            <div className="flex items-center justify-center gap-2.5 flex-wrap">
              <Button variant="primary" onClick={genererAnalyse} disabled={loading}>
                <Sparkles size={15} /> Generer bankanalyse
              </Button>
              <Button variant="secondary" onClick={() => { setShowDemo(true); setExpanded(true); }}>
                Vis eksempel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-danger/[0.06] border border-danger/25 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-danger">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 border-2 border-mint-line border-t-brand rounded-full animate-spin" />
            <span className="text-sm font-semibold text-muted">Analyserer investeringscase...</span>
          </div>
        )}

        {visibleAnalyse && expanded && (
          <div>
            {showDemo && !analyse && (
              <div className="mb-4 px-3.5 py-2.5 bg-mint-soft border border-mint-line rounded-xl">
                <p className="text-xs font-medium text-muted">Dette er et eksempel. Klikk «Generer bankanalyse» for å lage en basert på dine faktiske tall.</p>
              </div>
            )}
            <div className="max-w-none">
              {renderAnalyse(visibleAnalyse)}
            </div>
            <div className="flex gap-2.5 mt-6 pt-4 border-t border-line">
              <Button variant="secondary" size="sm" onClick={kopier}>
                {copied ? <Check size={14} className="text-brand-ink" /> : <Copy size={14} />}
                {copied ? 'Kopiert!' : 'Kopier tekst'}
              </Button>
              <Button variant="secondary" size="sm" onClick={genererAnalyse} disabled={loading}>
                <Sparkles size={14} /> Regenerer
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
