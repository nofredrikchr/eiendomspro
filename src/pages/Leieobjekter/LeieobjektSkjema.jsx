import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const TYPER = [
  { value: 'hybel', label: 'Hybel' },
  { value: 'leilighet', label: 'Leilighet' },
  { value: 'sokkelleilighet', label: 'Sokkelleilighet' },
  { value: 'enebolig', label: 'Enebolig' },
  { value: 'naering', label: 'Næringslokale' },
];

const STATUSER = [
  { value: 'ledig', label: 'Ledig' },
  { value: 'utleid', label: 'Utleid' },
  { value: 'delvis', label: 'Delvis utleid' },
];

const defaultForm = {
  byggId: '', type: '', betegnelse: '', areal: '', antallRom: '',
  antallSoverom: '', forventetLeie: '', status: 'ledig', beskrivelse: '',
  bilde: '', malernummer: '', malepunktId: '', flereRomEnkeltvis: false,
};

function SeksjonHeader({ children }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-widest whitespace-nowrap">{children}</span>
      <div className="flex-1 h-px bg-[#E9E8E2]" />
    </div>
  );
}

export default function LeieobjektSkjema() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { leieobjekter, bygg, addLeieobjekt, updateLeieobjekt } = useApp();

  const existing = id ? leieobjekter.find((l) => l.id === id) : null;
  const [form, setForm] = useState(() => existing ? { ...defaultForm, ...existing } : defaultForm);
  const [feil, setFeil] = useState('');
  const [lagrer, setLagrer] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => () => setForm((f) => ({ ...f, [field]: !f[field] }));

  const byggOptions = bygg.map((b) => ({
    value: b.id,
    label: `${b.gatenavn} ${b.gatenummer}, ${b.poststed}`,
  }));

  const handleBilde = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm((f) => ({ ...f, bilde: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.byggId) { setFeil('Du må velge hvilket bygg leieobjektet tilhører.'); return; }
    setFeil('');
    setLagrer(true);
    try {
      if (existing) await updateLeieobjekt(id, form);
      else await addLeieobjekt(form);
      navigate('/leieobjekter');
    } catch (err) {
      setFeil(err.message || 'Kunne ikke lagre. Prøv igjen.');
      setLagrer(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/leieobjekter')}
            className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg transition-all cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">
              {existing ? 'Rediger leieobjekt' : 'Nytt leieobjekt'}
            </h1>
            <p className="text-sm text-[#65696F] mt-0.5">
              {existing ? form.betegnelse || 'Uten navn' : 'Fyll inn informasjon om leieobjektet'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate('/leieobjekter')}>Avbryt</Button>
          <Button type="submit" variant="primary" disabled={lagrer}>
            {lagrer ? 'Lagrer…' : existing ? 'Lagre endringer' : 'Opprett leieobjekt'}
          </Button>
        </div>
      </div>

      {feil && (
        <div className="flex items-center gap-2 text-sm text-[#DC2626] bg-[#DC2626]/8 border border-[#DC2626]/20 rounded-lg px-4 py-2.5 mb-4">
          {feil}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Venstre: Obligatorisk */}
        <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-6">
          <SeksjonHeader>Obligatorisk informasjon</SeksjonHeader>
          <div className="space-y-4">
            <Select
              label="Tilhørende bygg"
              value={form.byggId}
              onChange={set('byggId')}
              options={byggOptions}
              required
              placeholder="Velg bygg..."
            />

            <Select
              label="Type leieobjekt"
              value={form.type}
              onChange={set('type')}
              options={TYPER}
              required
              placeholder="Velg type..."
            />

            <Select
              label="Status"
              value={form.status}
              onChange={set('status')}
              options={STATUSER}
            />

            <Input
              label="Betegnelse / eget nummer"
              value={form.betegnelse}
              onChange={set('betegnelse')}
              placeholder="2etg, Leilighet A, Hybel 1..."
            />
            <p className="text-xs text-[#7A7D83] -mt-2">Valgfritt — brukes som visningsnavn</p>
          </div>
        </div>

        {/* Høyre: Valgfritt */}
        <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-6">
          <SeksjonHeader>Detaljer</SeksjonHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Antall rom" type="number" value={form.antallRom} onChange={set('antallRom')} placeholder="Inkl. stue" />
              <Input label="Antall soverom" type="number" value={form.antallSoverom} onChange={set('antallSoverom')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Areal" type="number" value={form.areal} onChange={set('areal')} suffix="m²" />
              <Input label="Forventet leie/mnd" type="number" value={form.forventetLeie} onChange={set('forventetLeie')} suffix="kr" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Målernummer" value={form.malernummer} onChange={set('malernummer')} placeholder="Strømmåler nr." />
              <Input label="Målepunkt ID" value={form.malepunktId} onChange={set('malepunktId')} placeholder="Siste 8 siffer" />
            </div>

            <Toggle
              checked={form.flereRomEnkeltvis}
              onChange={toggle('flereRomEnkeltvis')}
              label="Leieobjektet har flere rom som leies ut enkeltvis"
            />
          </div>
        </div>

        {/* Bilde */}
        <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-6">
          <SeksjonHeader>Bilde</SeksjonHeader>
          <div className="flex items-start gap-4">
            {form.bilde ? (
              <div className="relative group/img">
                <img src={form.bilde} alt="Leieobjekt" className="w-32 h-24 object-cover rounded-lg border border-[#E9E8E2]" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, bilde: '' }))}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 rounded-lg flex items-center justify-center text-xs text-[#1A1B1E] transition-opacity cursor-pointer"
                >
                  Fjern
                </button>
              </div>
            ) : null}
            <label className="flex flex-col items-center justify-center gap-2 w-32 h-24 border border-dashed border-[#DCDAD2] rounded-lg cursor-pointer hover:border-[#AEB0B4] hover:bg-black/[0.02] transition-all">
              <Upload size={16} className="text-[#7A7D83]" />
              <span className="text-xs text-[#7A7D83]">Last opp bilde</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBilde} />
            </label>
          </div>
        </div>

        {/* Beskrivelse */}
        <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-6">
          <SeksjonHeader>Beskrivelse</SeksjonHeader>
          <Textarea
            value={form.beskrivelse}
            onChange={set('beskrivelse')}
            placeholder="Beskriv leieobjektet — planløsning, parkering, fasiliteter..."
            rows={4}
          />
        </div>
      </div>
    </form>
  );
}
