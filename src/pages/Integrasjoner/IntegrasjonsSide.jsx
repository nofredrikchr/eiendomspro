import { useState, useEffect } from 'react';
import { Check, ExternalLink, AlertCircle, Zap, FileSignature, CreditCard, BookOpen, ChevronDown, ChevronUp, Megaphone } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { PageHeader, IconTile, Pill } from '../../components/ui/kit';
import { integrasjonApi } from '../../services/entitetApi';

// ─── Status-pille ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    konfigurert:      { label: 'Konfigurert',  tone: 'mint' },
    ikke_konfigurert: { label: 'Ikke satt opp', tone: 'muted' },
    kommer:           { label: 'Kommer',        tone: 'amber' },
  };
  const c = config[status] || config.ikke_konfigurert;
  return <Pill tone={c.tone}>{c.label}</Pill>;
}

// ─── Integrasjons-kort ────────────────────────────────────────────────────────
function IntegrasjonKort({ ikon: Ikon, tone = 'mint', tittel, beskrivelse, status, lenke, children }) {
  const [åpen, setÅpen] = useState(false);
  const kommer = status === 'kommer';

  return (
    <div className={`border rounded-[18px] overflow-hidden transition-all ${kommer ? 'border-line bg-sand' : 'bg-surface border-line'}`}>
      <button
        type="button"
        onClick={() => setÅpen(!åpen)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-2 transition-colors cursor-pointer text-left"
      >
        <IconTile tone={tone} size={42} radius={13}><Ikon size={18} /></IconTile>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[14.5px] font-extrabold tracking-[-0.01em] ${kommer ? 'text-muted' : 'text-ink'}`}>{tittel}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-[12.5px] font-medium text-muted-2 truncate">{beskrivelse}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lenke && (
            <a href={lenke} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-faint hover:text-brand-ink transition-colors p-1">
              <ExternalLink size={14} />
            </a>
          )}
          {åpen ? <ChevronUp size={16} className="text-muted-2" /> : <ChevronDown size={16} className="text-muted-2" />}
        </div>
      </button>

      {åpen && children && (
        <div className="px-5 pb-5 pt-4 border-t border-line-soft space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

function InfoBoks({ children }) {
  return (
    <div className="flex gap-2.5 p-3.5 rounded-[13px] border border-mint-line bg-mint-soft text-[12.5px] font-medium text-brand-ink leading-relaxed">
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

function VarselBoks({ children }) {
  return (
    <div className="flex gap-2.5 p-3.5 rounded-[13px] border border-amber-line bg-amber-soft text-[12.5px] font-medium text-amber leading-relaxed">
      <AlertCircle size={14} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

// ─── Hoved-komponent ──────────────────────────────────────────────────────────
export default function IntegrasjonssSide() {
  const [config, setConfig] = useState({});
  const [lagret, setLagret] = useState('');

  // Integrasjons-config ligger nå eier-scopet i Neon (kun din egen), ikke localStorage.
  useEffect(() => {
    let aktiv = true;
    integrasjonApi.hent().then((c) => { if (aktiv) setConfig(c); }).catch(() => {});
    return () => { aktiv = false; };
  }, []);

  function set(felt) {
    return (e) => {
      const ny = { ...config, [felt]: e.target.value };
      setConfig(ny);
    };
  }

  async function lagreConfig() {
    try {
      await integrasjonApi.lagre(config);
      setLagret('ok');
      setTimeout(() => setLagret(''), 2000);
    } catch { /* behold skjema ved feil */ }
  }

  const signicatOk = !!(config.signicatClientId && config.signicatClientSecret);
  const vippsOk    = !!(config.vippsClientId && config.vippsSubscriptionKey);
  const netsOk     = !!(config.netsApiKey && config.netsKundeNr);
  const fikenOk    = !!(config.fikenOrgnr && config.fikenToken);
  const finnOk     = !!(config.finnApiKey && config.finnOrgId);

  return (
    <div className="animate-fade-up">
      <PageHeader
        tittel="Integrasjoner"
        undertittel="Koble EiendomsPRO til betalingstjenester, e-signering og regnskap"
      />

      {/* Betalingsmodell-forklaring */}
      <div className="bg-mint-soft border border-mint-line rounded-[20px] p-5 mb-6">
        <div className="flex items-start gap-3.5">
          <IconTile tone="mint" size={36}><Zap size={16} /></IconTile>
          <div>
            <div className="text-[14.5px] font-extrabold tracking-[-0.01em] text-ink mb-2">Hvordan betalingsflyten fungerer</div>
            <p className="text-[13px] font-medium text-muted leading-relaxed mb-3.5">
              EiendomsPRO berører <strong className="font-extrabold text-ink-2">aldri</strong> leiebetalingene.
              Plattformen genererer faktura med KID-nummer og sender den til leietaker via Vipps eller eFaktura.
              Pengene går <strong className="font-extrabold text-ink-2">direkte fra leietakers konto til utleiers bankkonto</strong> —
              EiendomsPRO er kun teknisk tilrettelegger, ikke et betalingsforetak.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                'Leietaker betaler via Vipps eller nettbank',
                'KID-nummer matcher innbetaling til riktig kontrakt',
                'Penger → direkte til utleiers konto',
                'EiendomsPRO mottar kun bekreftelse via webhook',
              ].map((s, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-surface border border-mint-line px-2.5 py-1 rounded-full text-[11.5px] font-bold text-ink-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">

        {/* ─── SIGNICAT — BankID e-signering ─── */}
        <IntegrasjonKort
          ikon={FileSignature}
          tone="mint"
          tittel="Signicat — BankID e-signering"
          beskrivelse="Leiekontrakter signeres digitalt av begge parter med norsk BankID. Gir juridisk bindende kvalifisert elektronisk signatur (QES)."
          status={signicatOk ? 'konfigurert' : 'ikke_konfigurert'}
          lenke="https://developer.signicat.com/"
        >
          <InfoBoks>
            Signicat er Norges ledende leverandør av e-signering med BankID.
            Registrer deg på signicat.com og velg "Express"-planen for oppstart.
            Merk: BankID bytter til ny PAdES-standard via Stø AS — Signicat håndterer dette automatisk.
          </InfoBoks>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Client ID"
              value={config.signicatClientId || ''}
              onChange={set('signicatClientId')}
              placeholder="ep_xxxxxxxxxxxxxxxx"
              type="password"
            />
            <Input
              label="Client Secret"
              value={config.signicatClientSecret || ''}
              onChange={set('signicatClientSecret')}
              placeholder="••••••••••••••••"
              type="password"
            />
          </div>
          <Input
            label="Account ID (fra Signicat-dashboardet)"
            value={config.signicatAccountId || ''}
            onChange={set('signicatAccountId')}
            placeholder="your-account-id"
          />
          <div className="text-[12.5px] font-medium text-muted-2 space-y-1">
            <div>• Sandkasse-URL: <code className="font-semibold text-ink-2">https://api.test.signicat.com</code></div>
            <div>• Produksjons-URL: <code className="font-semibold text-ink-2">https://api.signicat.com</code></div>
            <div>• Webhook-URL å registrere i Signicat: <code className="font-semibold text-ink-2">{window.location.origin}/api/webhooks/signicat</code></div>
          </div>
        </IntegrasjonKort>

        {/* ─── VIPPS FAKTURA ─── */}
        <IntegrasjonKort
          ikon={CreditCard}
          tone="amber"
          tittel="Vipps Faktura"
          beskrivelse="Send husleie-faktura direkte til leietakers Vipps-app. Leietaker betaler med ett trykk — penger går rett til utleiers konto."
          status={vippsOk ? 'konfigurert' : 'ikke_konfigurert'}
          lenke="https://vippsmobilepay.com/merchant-solutions/invoice/"
        >
          <InfoBoks>
            For å sende fakturaer via Vipps må utleier ha en Vipps-bedriftsavtale som inkluderer fakturering (MSN — Merchant Serial Number).
            Denne inngås via utleierens bank. EiendomsPRO registreres som teknisk partner.
          </InfoBoks>
          <VarselBoks>
            Vipps Faktura krever at du er registrert som Vipps-partner.
            Søk på: vippsmobilepay.com/merchant-solutions/partner/
          </VarselBoks>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Client ID"
              value={config.vippsClientId || ''}
              onChange={set('vippsClientId')}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
              type="password"
            />
            <Input
              label="Client Secret"
              value={config.vippsClientSecret || ''}
              onChange={set('vippsClientSecret')}
              placeholder="••••••••••••••••"
              type="password"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Subscription Key (Ocp-Apim)"
              value={config.vippsSubscriptionKey || ''}
              onChange={set('vippsSubscriptionKey')}
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              type="password"
            />
            <Input
              label="Merchant Serial Number (MSN)"
              value={config.vippsMsn || ''}
              onChange={set('vippsMsn')}
              placeholder="123456"
            />
          </div>
        </IntegrasjonKort>

        {/* ─── NETS eFaktura / AvtaleGiro ─── */}
        <IntegrasjonKort
          ikon={CreditCard}
          tone="mint"
          tittel="Nets — eFaktura & AvtaleGiro"
          beskrivelse="eFaktura: faktura i nettbanken. AvtaleGiro: automatisk månedstrekk — leietaker setter opp én gang, betaling skjer automatisk."
          status={netsOk ? 'konfigurert' : 'ikke_konfigurert'}
          lenke="https://www.nets.eu/no-nb/losninger/innkreving/"
        >
          <InfoBoks>
            AvtaleGiro er ideelt for husleie — leietaker inngår avtale med BankID én gang,
            og leien trekkes automatisk hver måned på forfallsdato.
            Krever bankavtale med AvtaleGiro-tilgang (de fleste norske banker støtter dette).
          </InfoBoks>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="AvtaleGiro kundenummer (fra din bank)"
              value={config.netsKundeNr || ''}
              onChange={set('netsKundeNr')}
              placeholder="000000000"
            />
            <Input
              label="Nets API-nøkkel"
              value={config.netsApiKey || ''}
              onChange={set('netsApiKey')}
              placeholder="••••••••••••••••"
              type="password"
            />
          </div>
          <div className="text-[12.5px] font-medium text-muted-2 space-y-1">
            <div>• Testmiljø: <code className="font-semibold text-ink-2">https://test.api.nets.eu</code></div>
            <div>• Produksjon: <code className="font-semibold text-ink-2">https://api.nets.eu</code></div>
          </div>
        </IntegrasjonKort>

        {/* ─── FIKEN ─── */}
        <IntegrasjonKort
          ikon={BookOpen}
          tone="mint"
          tittel="Fiken — regnskap"
          beskrivelse="Automatisk bokføring av husleie-fakturaer og innbetalinger. Fakturaer opprettes i Fiken og sendes til leietaker via eFaktura."
          status={fikenOk ? 'konfigurert' : 'ikke_konfigurert'}
          lenke="https://fiken.no/api/"
        >
          <InfoBoks>
            Fiken har et åpent REST API. Fakturaer opprettet i EiendomsPRO kan automatisk overføres til Fiken
            for bokføring. Alternativt kan Tripletex brukes (samme struktur).
          </InfoBoks>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Organisasjonsnummer"
              value={config.fikenOrgnr || ''}
              onChange={set('fikenOrgnr')}
              placeholder="123456789"
            />
            <Input
              label="API-token (fra Fiken → Innstillinger → API)"
              value={config.fikenToken || ''}
              onChange={set('fikenToken')}
              placeholder="••••••••••••••••"
              type="password"
            />
          </div>
        </IntegrasjonKort>

        {/* ─── FINN.no ─── */}
        <IntegrasjonKort
          ikon={Megaphone}
          tone="mint"
          tittel="FINN.no — annonsering"
          beskrivelse="Publiser utleieannonser til FINN.no direkte fra EiendomsPRO. Henvendelser fra interessenter kommer tilbake inn i appen."
          status={finnOk ? 'konfigurert' : 'ikke_konfigurert'}
          lenke="https://www.finn.no/api/"
        >
          <InfoBoks>
            FINN.no krever en API-partneravtale. Du signerer en avtale og får en orgID + hemmelig
            API-nøkkel. Annonser publiseres mot din egen FINN-spesifikke orgID, og alle henvendelser
            samles i EiendomsPRO — du slipper å administrere to plattformer.
          </InfoBoks>
          <VarselBoks>
            Søk om API-partneravtale via finn.no/api. Inntil avtalen er på plass kjører publisering i
            testmodus — annonser lagres og er klare til å sendes.
          </VarselBoks>
          <div className="grid grid-cols-2 gap-4">
            <Input label="FINN orgID" value={config.finnOrgId || ''} onChange={set('finnOrgId')} placeholder="din-org-id" />
            <Input label="API-nøkkel (FINN-APIKEY)" value={config.finnApiKey || ''} onChange={set('finnApiKey')} placeholder="••••••••••••••••" type="password" />
          </div>
        </IntegrasjonKort>

        {/* ─── Kredittsjekk (kommer) ─── */}
        <IntegrasjonKort
          ikon={AlertCircle}
          tone="amber"
          tittel="Kredittsjekk av leietaker"
          beskrivelse="Sjekk leietakers betalingsevne og betalingshistorikk direkte i EiendomsPRO. Integrasjon med Creditsafe eller Experian."
          status="kommer"
          lenke="https://www.creditsafe.com/no/"
        >
          <VarselBoks>
            Kredittsjekk-integrasjon er under planlegging. Følgende leverandører er aktuelle:
            Creditsafe Norge, Experian, Bisnode. Vil kreve samtykke fra leietaker (GDPR).
          </VarselBoks>
        </IntegrasjonKort>

      </div>

      {/* Lagre-knapp */}
      <div className="mt-6 flex items-center gap-3 flex-wrap">
        <Button variant="primary" onClick={lagreConfig}>
          {lagret === 'ok' ? <><Check size={15} /> Lagret!</> : 'Lagre innstillinger'}
        </Button>
        <p className="text-[12.5px] font-medium text-muted-2">
          API-nøkler lagres eier-scopet i Neon — aldri i nettleseren.
        </p>
      </div>

      {/* Status-oversikt */}
      <div className="mt-8 bg-surface border border-line rounded-[20px] p-[22px]">
        <div className="text-xs font-extrabold text-muted-2 uppercase tracking-[0.12em] mb-4">Hva som er klart for integrering</div>
        <div className="space-y-0.5">
          {[
            { label: 'KID-nummer-generator (MOD10/MOD11)', ferdig: true, info: 'Klar — src/utils/kid.js' },
            { label: 'Signicat BankID e-signering', ferdig: false, info: 'Stub klar — legg inn API-nøkler' },
            { label: 'Vipps Faktura', ferdig: false, info: 'Stub klar — legg inn MSN + API-nøkler' },
            { label: 'Nets AvtaleGiro / eFaktura', ferdig: false, info: 'Stub klar — krever bankavtale' },
            { label: 'Fiken regnskap-API', ferdig: false, info: 'Stub klar — legg inn API-token' },
            { label: 'FINN.no annonsering', ferdig: false, info: 'Stub klar — krever API-partneravtale' },
            { label: 'Mine annonser (opprett/publiser)', ferdig: true, info: 'Klar — full annonseflyt på plass' },
            { label: 'Signeringsstatus på kontrakter', ferdig: true, info: 'Klar — vises i kontraktlisten' },
            { label: 'Betalingssporing per kontrakt', ferdig: true, info: 'Klar — datamodell og UI på plass' },
            { label: 'Webhook-mottak (backend)', ferdig: false, info: 'Krever en backend/serverless API' },
          ].map(({ label, ferdig, info }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-line-soft last:border-0">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ferdig ? 'bg-mint text-brand-ink' : 'bg-line-soft'}`}>
                {ferdig ? <Check size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-faint-2" />}
              </div>
              <span className={`text-[13.5px] font-bold ${ferdig ? 'text-ink' : 'text-muted'}`}>{label}</span>
              <span className="text-[12px] font-medium text-faint ml-auto text-right">{info}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
