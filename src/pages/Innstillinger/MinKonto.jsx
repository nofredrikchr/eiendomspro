import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Building2, User, Check, X, Settings, Users, Shield, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { Pill, IconTile, Avatar, PageHeader, SectionCard } from '../../components/ui/kit';
import { profilApi } from '../../services/entitetApi';

// ─── Utleier-skjema ────────────────────────────────────────────
const defaultUtleierForm = {
  type: 'foretak',
  navn: '',
  orgnummer: '',
  fodselsdato: '',
  epost: '',
  tlf: '',
  adresse: '',
  postnummer: '',
  poststed: '',
  kontonummer: '',
};

function UtleierSkjema({ initial, onLagre, onAvbryt }) {
  const [form, setForm] = useState(initial || defaultUtleierForm);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="bg-sand border border-line rounded-[18px] p-5 space-y-4">
      <div className="flex gap-2">
        {[['foretak', 'Foretak', Building2], ['privatperson', 'Privatperson', User]].map(([val, label, Icon]) => (
          <button key={val} type="button"
            onClick={() => setForm((f) => ({ ...f, type: val }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer
              ${form.type === val ? 'border-mint-line bg-mint text-brand-ink' : 'border-line text-muted hover:border-line-input'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label={form.type === 'foretak' ? 'Selskapsnavn' : 'Fullt navn'} value={form.navn}
          onChange={set('navn')} required placeholder={form.type === 'foretak' ? 'PTHD EIENDOM AS' : 'Ola Nordmann'} />
        {form.type === 'foretak'
          ? <Input label="Organisasjonsnummer" value={form.orgnummer} onChange={set('orgnummer')} placeholder="123456789" />
          : <Input label="Fødselsdato" type="date" value={form.fodselsdato} onChange={set('fodselsdato')} />
        }
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input label="E-post" type="email" value={form.epost} onChange={set('epost')} placeholder="post@selskap.no" />
        <Input label="Telefon" type="tel" value={form.tlf} onChange={set('tlf')} placeholder="+47 999 99 999" />
      </div>

      <Input label="Kontonummer (for leieinnbetaling)" value={form.kontonummer}
        onChange={set('kontonummer')} placeholder="1234.56.78901" />

      <div className="grid grid-cols-3 gap-4">
        <Input label="Gateadresse" value={form.adresse} onChange={set('adresse')} placeholder="Gateveien 1" className="col-span-1" />
        <Input label="Postnummer" value={form.postnummer} onChange={set('postnummer')} placeholder="1234" />
        <Input label="Poststed" value={form.poststed} onChange={set('poststed')} placeholder="Oslo" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="primary" onClick={() => { if (form.navn) onLagre(form); }}>
          <Check size={14} /> Lagre
        </Button>
        <Button type="button" variant="secondary" onClick={onAvbryt}>
          <X size={14} /> Avbryt
        </Button>
      </div>
    </div>
  );
}

function UtleierKort({ utleier, onRediger, onSlett }) {
  return (
    <div className="bg-surface border border-line rounded-[18px] p-4 flex items-center gap-4 group hover:border-line-input transition-colors">
      <Avatar navn={utleier.navn} tone={utleier.type === 'foretak' ? 'mint' : 'sand'} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-ink text-sm tracking-[-0.01em]">{utleier.navn}</span>
          <Pill tone="neutral">{utleier.type === 'foretak' ? 'Foretak' : 'Privatperson'}</Pill>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs font-medium text-muted-2">
          {utleier.orgnummer && <span>Org.nr: <span className="num">{utleier.orgnummer}</span></span>}
          {utleier.fodselsdato && <span>Fødselsdato: {utleier.fodselsdato}</span>}
          {utleier.epost && <span>{utleier.epost}</span>}
          {utleier.tlf && <span>{utleier.tlf}</span>}
          {utleier.kontonummer && <span>Konto: <span className="num">{utleier.kontonummer}</span></span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <button onClick={() => onRediger(utleier)} aria-label="Rediger utleier"
          className="p-1.5 text-muted-2 hover:text-ink hover:bg-line-soft rounded-lg transition-all cursor-pointer">
          <Pencil size={13} />
        </button>
        <button onClick={() => onSlett(utleier.id)} aria-label="Slett utleier"
          className="p-1.5 text-muted-2 hover:text-danger hover:bg-danger/[0.06] rounded-lg transition-all cursor-pointer">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Faner ────────────────────────────────────────────────────
const TABS = [
  { id: 'innstillinger', label: 'Innstillinger', icon: Settings },
  { id: 'utleiere', label: 'Utleiere', icon: Users },
  { id: 'tilgang', label: 'Tilgang', icon: Shield },
];

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer
        ${active ? 'bg-mint text-brand-ink' : 'text-muted hover:text-ink-2 hover:bg-line-soft'}`}>
      <Icon size={15} className="shrink-0" />
      {label}
    </button>
  );
}

// ─── Innstillinger-fane ───────────────────────────────────────
function InnstillingerTab() {
  const [form, setForm] = useState({});
  const [lagret, setLagret] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  // Profil ligger nå i Neon (eier-scoped), ikke localStorage.
  useEffect(() => {
    let aktiv = true;
    profilApi.hent().then((p) => { if (aktiv) setForm(p); }).catch(() => {});
    return () => { aktiv = false; };
  }, []);

  async function lagre(e) {
    e.preventDefault();
    try {
      await profilApi.lagre(form);
      setLagret(true);
      setTimeout(() => setLagret(false), 2000);
    } catch { /* behold skjema ved feil */ }
  }

  return (
    <form onSubmit={lagre} className="max-w-lg space-y-5">
      <SectionCard tittel="Kontaktinformasjon">
        <p className="text-[13px] font-medium text-muted-2 -mt-2 mb-4">Denne informasjonen vises ikke til leietakere.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fornavn" value={form.fornavn || ''} onChange={set('fornavn')} placeholder="Per Tomas" />
            <Input label="Etternavn" value={form.etternavn || ''} onChange={set('etternavn')} placeholder="Fjell" />
          </div>
          <Input label="E-post" type="email" value={form.epost || ''} onChange={set('epost')} placeholder="pt@ptfjell.no" />
          <Input label="Mobiltelefon" type="tel" value={form.tlf || ''} onChange={set('tlf')} placeholder="+47 912 22 226" />
        </div>
      </SectionCard>

      <SectionCard tittel="Preferanser">
        <div className="space-y-4">
          <Select
            label="Valuta"
            value={form.valuta || 'NOK'}
            onChange={set('valuta')}
            options={[{ value: 'NOK', label: 'NOK — Norske kroner' }]}
          />
          <Select
            label="Standardoppsigelsestid"
            value={form.oppsigelsestid || '3'}
            onChange={set('oppsigelsestid')}
            options={[
              { value: '1', label: '1 måned' },
              { value: '2', label: '2 måneder' },
              { value: '3', label: '3 måneder' },
              { value: '6', label: '6 måneder' },
            ]}
          />
        </div>
      </SectionCard>

      <Button type="submit" variant="primary">
        {lagret ? <><Check size={14} /> Lagret!</> : 'Lagre endringer'}
      </Button>
    </form>
  );
}

// ─── Utleiere-fane ────────────────────────────────────────────
function UtleiereTab() {
  const { utleiere, addUtleier, updateUtleier, deleteUtleier } = useApp();
  const [visNy, setVisNy] = useState(false);
  const [redigerer, setRedigerer] = useState(null);
  const [slettId, setSlettId] = useState(null);

  return (
    <div className="max-w-2xl">
      <BekreftModal
        åpen={!!slettId}
        tittel="Slette utleieren?"
        tekst="Utleieren fjernes fra kontoen. Eksisterende kontrakter beholder informasjonen som allerede er lagret."
        bekreftLabel="Slett utleier"
        onBekreft={async () => { await deleteUtleier(slettId); setSlettId(null); }}
        onAvbryt={() => setSlettId(null)}
      />
      <p className="text-[14.5px] font-medium text-muted mb-5">
        Utleiere brukes på leiekontrakter og i PDF-generering. Du kan ha én eller flere —
        f.eks. deg som privatperson og et AS.
      </p>

      <div className="space-y-3 mb-4">
        {utleiere.map((u) =>
          redigerer?.id === u.id ? (
            <UtleierSkjema key={u.id} initial={redigerer}
              onLagre={async (form) => { await updateUtleier(u.id, form); setRedigerer(null); }}
              onAvbryt={() => setRedigerer(null)} />
          ) : (
            <UtleierKort key={u.id} utleier={u} onRediger={setRedigerer}
              onSlett={(id) => setSlettId(id)} />
          )
        )}
        {utleiere.length === 0 && !visNy && (
          <div className="bg-surface border border-line rounded-[18px] p-8 text-center">
            <IconTile tone="sand" size={48} radius={14} className="mx-auto mb-3">
              <Building2 size={22} />
            </IconTile>
            <div className="text-sm font-extrabold text-ink mb-1">Ingen utleiere registrert</div>
            <div className="text-xs font-medium text-muted-2">Legg til en utleier for å bruke den på leiekontrakter</div>
          </div>
        )}
      </div>

      {visNy ? (
        <UtleierSkjema
          onLagre={async (form) => { await addUtleier(form); setVisNy(false); }}
          onAvbryt={() => setVisNy(false)} />
      ) : (
        <Button type="button" variant="secondary" onClick={() => setVisNy(true)}>
          <Plus size={14} /> Legg til utleier
        </Button>
      )}
    </div>
  );
}

// ─── Tilgang-fane ─────────────────────────────────────────────
function TilgangTab() {
  return (
    <div className="max-w-lg">
      <SectionCard>
        <div className="flex items-center gap-3 mb-4">
          <IconTile tone="mint" size={40} radius={12}>
            <Shield size={18} />
          </IconTile>
          <div>
            <div className="text-sm font-extrabold text-ink">Tilgangsstyring</div>
            <div className="text-xs font-medium text-muted-2 mt-0.5">Administrer hvem som har tilgang til kontoen</div>
          </div>
        </div>
        <div className="h-px bg-line-soft mb-4" />
        <p className="text-[14.5px] font-medium text-muted">
          Tilgangsstyring for flere brukere på samme konto kommer i en fremtidig versjon.
        </p>
      </SectionCard>
    </div>
  );
}

// ─── Hoved-komponent ──────────────────────────────────────────
export default function MinKonto() {
  const [aktiveTab, setAktiveTab] = useState('innstillinger');
  const { bruker, erDemo, loggUt } = useAuth();

  return (
    <div className="animate-fade-up">
      <PageHeader tittel="Min konto" undertittel="Kontoinformasjon og innstillinger">
        {!erDemo && bruker && (
          <div className="text-right">
            <div className="text-[12.5px] font-semibold text-muted-2">Logget inn som</div>
            <div className="text-sm font-bold text-ink">{bruker.epost || bruker.telefon || bruker.fulltNavn}</div>
            <button onClick={loggUt}
              className="flex items-center gap-1.5 text-xs font-bold text-muted hover:text-danger transition-colors cursor-pointer mt-1.5 ml-auto">
              <LogOut size={12} /> Logg ut
            </button>
          </div>
        )}
        {erDemo && <Pill tone="neutral">Demo-modus</Pill>}
      </PageHeader>

      {/* Tab-linje */}
      <div className="flex gap-1 mb-7 border-b border-line pb-2">
        {TABS.map((t) => (
          <TabBtn key={t.id} active={aktiveTab === t.id} onClick={() => setAktiveTab(t.id)}
            icon={t.icon} label={t.label} />
        ))}
      </div>

      {aktiveTab === 'innstillinger' && <InnstillingerTab />}
      {aktiveTab === 'utleiere' && <UtleiereTab />}
      {aktiveTab === 'tilgang' && <TilgangTab />}
    </div>
  );
}
