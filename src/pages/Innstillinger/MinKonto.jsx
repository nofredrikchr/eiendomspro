import { useState } from 'react';
import { Plus, Pencil, Trash2, Building2, User, Check, X, Settings, Users, Shield, LogOut } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BekreftModal } from '../../components/ui/BekreftModal';

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
    <div className="bg-[#F1F1ED] border border-[#DCDAD2] rounded-xl p-5 space-y-4">
      <div className="flex gap-2">
        {[['foretak', 'Foretak', Building2], ['privatperson', 'Privatperson', User]].map(([val, label, Icon]) => (
          <button key={val} type="button"
            onClick={() => setForm((f) => ({ ...f, type: val }))}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer
              ${form.type === val ? 'border-black/[0.10] bg-black/[0.055] text-[#1A1B1E]' : 'border-[#E9E8E2] text-[#65696F] hover:border-[#DCDAD2]'}`}>
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
    <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-4 flex items-center gap-4 group hover:border-[#DCDAD2] transition-colors">
      <div className="w-10 h-10 bg-[#E9E8E2] rounded-lg flex items-center justify-center shrink-0">
        {utleier.type === 'foretak' ? <Building2 size={16} className="text-[#7A7D83]" /> : <User size={16} className="text-[#7A7D83]" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[#1A1B1E] text-sm">{utleier.navn}</span>
          <span className="text-xs text-[#7A7D83] bg-[#E9E8E2] px-2 py-0.5 rounded-full">
            {utleier.type === 'foretak' ? 'Foretak' : 'Privatperson'}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-[#7A7D83]">
          {utleier.orgnummer && <span>Org.nr: <span className="num">{utleier.orgnummer}</span></span>}
          {utleier.fodselsdato && <span>Fødselsdato: {utleier.fodselsdato}</span>}
          {utleier.epost && <span>{utleier.epost}</span>}
          {utleier.tlf && <span>{utleier.tlf}</span>}
          {utleier.kontonummer && <span>Konto: <span className="num">{utleier.kontonummer}</span></span>}
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onRediger(utleier)}
          className="p-1.5 text-[#7A7D83] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-md transition-all cursor-pointer">
          <Pencil size={13} />
        </button>
        <button onClick={() => onSlett(utleier.id)}
          className="p-1.5 text-[#7A7D83] hover:text-[#DC2626] hover:bg-[#DC2626]/8 rounded-md transition-all cursor-pointer">
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
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all cursor-pointer
        ${active ? 'bg-black/[0.055] text-[#1A1B1E]' : 'text-[#65696F] hover:text-[#2A2D33] hover:bg-black/[0.03]'}`}>
      <Icon size={15} className="shrink-0" />
      {label}
    </button>
  );
}

// ─── Innstillinger-fane ───────────────────────────────────────
const PROFIL_KEY = 'eiendomspro_profil';
function loadProfil() {
  try { return JSON.parse(localStorage.getItem(PROFIL_KEY) || '{}'); } catch { return {}; }
}

function InnstillingerTab() {
  const [form, setForm] = useState(() => loadProfil());
  const [lagret, setLagret] = useState(false);
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  function lagre(e) {
    e.preventDefault();
    localStorage.setItem(PROFIL_KEY, JSON.stringify(form));
    setLagret(true);
    setTimeout(() => setLagret(false), 2000);
  }

  return (
    <form onSubmit={lagre} className="max-w-lg space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-[#1A1B1E] mb-1">Kontaktinformasjon</h2>
        <p className="text-xs text-[#7A7D83] mb-5">Denne informasjonen vises ikke til leietakere.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Fornavn" value={form.fornavn || ''} onChange={set('fornavn')} placeholder="Per Tomas" />
            <Input label="Etternavn" value={form.etternavn || ''} onChange={set('etternavn')} placeholder="Fjell" />
          </div>
          <Input label="E-post" type="email" value={form.epost || ''} onChange={set('epost')} placeholder="pt@ptfjell.no" />
          <Input label="Mobiltelefon" type="tel" value={form.tlf || ''} onChange={set('tlf')} placeholder="+47 912 22 226" />
        </div>
      </div>

      <div className="h-px bg-[#E9E8E2]" />

      <div>
        <h2 className="text-sm font-semibold text-[#1A1B1E] mb-5">Preferanser</h2>
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
      </div>

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
      <p className="text-sm text-[#65696F] mb-5">
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
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-8 text-center">
            <Building2 size={24} className="text-[#AEB0B4] mx-auto mb-3" />
            <div className="text-sm font-medium text-[#1A1B1E] mb-1">Ingen utleiere registrert</div>
            <div className="text-xs text-[#7A7D83]">Legg til en utleier for å bruke den på leiekontrakter</div>
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
      <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#E9E8E2] rounded-lg flex items-center justify-center">
            <Shield size={16} className="text-[#7A7D83]" />
          </div>
          <div>
            <div className="text-sm font-medium text-[#1A1B1E]">Tilgangsstyring</div>
            <div className="text-xs text-[#7A7D83] mt-0.5">Administrer hvem som har tilgang til kontoen</div>
          </div>
        </div>
        <div className="h-px bg-[#E9E8E2]" />
        <p className="text-sm text-[#7A7D83]">
          Tilgangsstyring for flere brukere på samme konto kommer i en fremtidig versjon.
        </p>
      </div>
    </div>
  );
}

// ─── Hoved-komponent ──────────────────────────────────────────
export default function MinKonto() {
  const [aktiveTab, setAktiveTab] = useState('innstillinger');
  const { bruker, erDemo, loggUt } = useAuth();

  return (
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#1A1B1E]">Min konto</h1>
          <p className="text-sm text-[#65696F] mt-1">Kontoinformasjon og innstillinger</p>
        </div>
        {!erDemo && bruker && (
          <div className="text-right">
            <div className="text-xs text-[#7A7D83]">Logget inn som</div>
            <div className="text-sm text-[#1A1B1E]">{bruker.epost || bruker.telefon || bruker.fulltNavn}</div>
            <button onClick={loggUt}
              className="flex items-center gap-1.5 text-xs text-[#65696F] hover:text-[#DC2626] transition-colors cursor-pointer mt-1.5 ml-auto">
              <LogOut size={12} /> Logg ut
            </button>
          </div>
        )}
        {erDemo && (
          <span className="text-xs text-[#7A7D83] bg-[#E9E8E2] px-2.5 py-1 rounded-full">Demo-modus</span>
        )}
      </div>

      {/* Tab-linje */}
      <div className="flex gap-1 mb-8 border-b border-[#E9E8E2] pb-1">
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
