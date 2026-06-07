import { useState, useEffect } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Key, Copy, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { formatKr, formatPct } from '../utils/format';

const API_KEY_STORAGE = 'utleier_pro_ai_key';

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
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [analyse, setAnalyse] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const hasKey = !!apiKey;
  const visibleAnalyse = analyse || (showDemo ? DEMO_ANALYSE : '');

  async function genererAnalyse() {
    if (!apiKey) { setShowKeyInput(true); return; }
    setLoading(true);
    setError('');
    setAnalyse('');
    try {
      const prompt = buildPrompt({ form, totalLeie, faste, vedlikeholdKr, terminbelop, netto, totalKostnader, nettoEtterSkatt, skatt, totalInvestering, startBoligverdi });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-7',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `API-feil: ${res.status}`);
      }
      const data = await res.json();
      setAnalyse(data.content?.[0]?.text || '');
      setExpanded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function lagreNokkel() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    localStorage.setItem(API_KEY_STORAGE, trimmed);
    setApiKey(trimmed);
    setShowKeyInput(false);
    setKeyInput('');
  }

  async function kopier() {
    await navigator.clipboard.writeText(visibleAnalyse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function renderAnalyse(text) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h3 key={i} className="text-sm font-semibold text-[#15803D] mt-5 mb-2">{line.slice(3)}</h3>;
      }
      if (line.startsWith('# ')) {
        return <h2 key={i} className="text-base font-semibold text-[#e2e8f0] mt-4 mb-2">{line.slice(2)}</h2>;
      }
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return <li key={i} className="text-sm text-[#cbd5e1] ml-4 list-disc">{line.slice(2)}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      return <p key={i} className="text-sm text-[#cbd5e1] leading-relaxed">{line}</p>;
    });
  }

  return (
    <div className="bg-[#FFFFFF] border border-[#4D7C0F]/20 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-[#E9E8E2]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#4D7C0F]/10 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-[#4D7C0F]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#e2e8f0]">AI-analyse for bankpresentasjon</h3>
            <p className="text-xs text-[#64748b]">Generert av Claude — norsk eiendomsekspert</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {visibleAnalyse && (
            <button onClick={() => setExpanded(e => !e)} className="p-2 text-[#64748b] hover:text-[#e2e8f0] transition-colors cursor-pointer">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button
            onClick={() => { setShowKeyInput(s => !s); setKeyInput(''); }}
            className="p-2 text-[#64748b] hover:text-[#4D7C0F] transition-colors cursor-pointer"
            title="API-nøkkel"
          >
            <Key size={15} />
          </button>
        </div>
      </div>

      {/* API-nøkkel input */}
      {showKeyInput && (
        <div className="p-4 bg-[#F6F6F4] border-b border-[#E9E8E2]">
          <p className="text-xs text-[#64748b] mb-2">
            Lim inn din Anthropic API-nøkkel. Den lagres kun lokalt i nettleseren.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lagreNokkel()}
              placeholder="sk-ant-..."
              className="flex-1 bg-[#FFFFFF] border border-[#E9E8E2] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#DCDAD2] focus:outline-none focus:border-[#4D7C0F]/40"
            />
            <button onClick={lagreNokkel} className="px-4 py-2 bg-[#4D7C0F]/10 text-[#4D7C0F] border border-[#4D7C0F]/20 rounded-lg text-sm hover:bg-[#4D7C0F]/20 transition-colors cursor-pointer">
              Lagre
            </button>
            {apiKey && (
              <button onClick={() => { localStorage.removeItem(API_KEY_STORAGE); setApiKey(''); setShowKeyInput(false); }}
                className="px-3 py-2 text-[#DC2626] border border-[#DC2626]/20 rounded-lg text-sm hover:bg-[#DC2626]/10 transition-colors cursor-pointer">
                Slett
              </button>
            )}
          </div>
          {apiKey && <p className="text-xs text-[#15803D] mt-2">✓ API-nøkkel er lagret</p>}
        </div>
      )}

      {/* Body */}
      <div className="p-5">
        {!visibleAnalyse && !loading && (
          <div className="text-center py-6">
            <p className="text-sm text-[#64748b] mb-4">
              {hasKey
                ? 'Klikk for å generere en profesjonell investeringsanalyse basert på dine tall.'
                : 'Legg inn en Anthropic API-nøkkel for å aktivere AI-analyse.'}
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={hasKey ? genererAnalyse : () => setShowKeyInput(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4D7C0F]/10 text-[#4D7C0F] border border-[#4D7C0F]/20 rounded-xl text-sm font-medium hover:bg-[#4D7C0F]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles size={15} />
                {hasKey ? 'Generer bankanalyse' : 'Sett opp API-nøkkel'}
              </button>
              {!hasKey && (
                <button
                  type="button"
                  onClick={() => { setShowDemo(true); setExpanded(true); }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#E9E8E2] text-[#94a3b8] border border-[#DCDAD2] rounded-xl text-sm font-medium hover:text-[#e2e8f0] hover:border-[#3a3a5a] transition-all cursor-pointer"
                >
                  Vis eksempel
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-[#DC2626]/10 border border-[#DC2626]/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-[#DC2626]">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-8 justify-center">
            <div className="w-5 h-5 border-2 border-[#4D7C0F]/30 border-t-[#4D7C0F] rounded-full animate-spin" />
            <span className="text-sm text-[#64748b]">Analyserer investeringscase...</span>
          </div>
        )}

        {visibleAnalyse && expanded && (
          <div>
            {showDemo && !analyse && (
              <div className="mb-4 px-3 py-2 bg-[#4D7C0F]/5 border border-[#4D7C0F]/10 rounded-lg">
                <p className="text-xs text-[#64748b]">Dette er et eksempel på en analyse. <button type="button" onClick={() => setShowKeyInput(true)} className="text-[#4D7C0F] underline cursor-pointer">Sett opp API-nøkkel</button> for å generere en basert på dine faktiske tall.</p>
              </div>
            )}
            <div className="prose prose-invert max-w-none">
              {renderAnalyse(visibleAnalyse)}
            </div>
            <div className="flex gap-2 mt-6 pt-4 border-t border-[#E9E8E2]">
              <button
                onClick={kopier}
                className="flex items-center gap-2 px-3 py-2 text-xs text-[#64748b] border border-[#E9E8E2] rounded-lg hover:text-[#e2e8f0] hover:border-[#DCDAD2] transition-all cursor-pointer"
              >
                {copied ? <Check size={13} className="text-[#15803D]" /> : <Copy size={13} />}
                {copied ? 'Kopiert!' : 'Kopier tekst'}
              </button>
              {hasKey && (
                <button
                  type="button"
                  onClick={genererAnalyse}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-[#4D7C0F] border border-[#4D7C0F]/20 rounded-lg hover:bg-[#4D7C0F]/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles size={13} />
                  Regenerer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
