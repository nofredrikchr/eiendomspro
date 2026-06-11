import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Home } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Photo, PageHeader, SectionCard } from '../../components/ui/kit';

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
    <form onSubmit={handleSubmit} className="animate-fade-up">
      <PageHeader
        tittel={existing ? 'Rediger leieobjekt' : 'Nytt leieobjekt'}
        undertittel={existing ? (form.betegnelse || 'Uten navn') : 'Fyll inn informasjon om leieobjektet'}
      >
        <Button type="button" variant="secondary" onClick={() => navigate('/leieobjekter')}>
          <ArrowLeft size={15} /> Avbryt
        </Button>
        <Button type="submit" variant="primary" disabled={lagrer}>
          {lagrer ? 'Lagrer…' : existing ? 'Lagre endringer' : 'Opprett leieobjekt'}
        </Button>
      </PageHeader>

      {feil && (
        <div className="flex items-center gap-2 text-sm font-semibold text-danger bg-danger/[0.06] border border-danger/25 rounded-xl px-4 py-3 mb-5">
          {feil}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-[18px] items-start">
        {/* Obligatorisk */}
        <SectionCard tittel="Obligatorisk informasjon">
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

            <div>
              <Input
                label="Betegnelse / eget nummer"
                value={form.betegnelse}
                onChange={set('betegnelse')}
                placeholder="2etg, Leilighet A, Hybel 1..."
              />
              <p className="text-xs font-medium text-muted-2 mt-1.5">Valgfritt — brukes som visningsnavn</p>
            </div>
          </div>
        </SectionCard>

        {/* Detaljer */}
        <SectionCard tittel="Detaljer">
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
        </SectionCard>

        {/* Bilde */}
        <SectionCard tittel="Bilde">
          <div className="flex items-start gap-4">
            {form.bilde ? (
              <div className="relative group/img">
                <Photo
                  src={form.bilde}
                  alt="Leieobjekt"
                  className="w-36 h-28 rounded-xl border border-line"
                  icon={<Home size={22} strokeWidth={1.6} />}
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, bilde: '' }))}
                  className="absolute inset-0 bg-black/55 opacity-0 group-hover/img:opacity-100 rounded-xl flex items-center justify-center text-xs font-bold text-white transition-opacity cursor-pointer"
                >
                  Fjern
                </button>
              </div>
            ) : null}
            <label className="flex flex-col items-center justify-center gap-2 w-36 h-28 border-[1.5px] border-dashed border-line-input rounded-xl cursor-pointer hover:border-brand hover:bg-mint-soft transition-all">
              <Upload size={16} className="text-muted-2" />
              <span className="text-xs font-semibold text-muted-2">Last opp bilde</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleBilde} />
            </label>
          </div>
        </SectionCard>

        {/* Beskrivelse */}
        <SectionCard tittel="Beskrivelse">
          <Textarea
            value={form.beskrivelse}
            onChange={set('beskrivelse')}
            placeholder="Beskriv leieobjektet — planløsning, parkering, fasiliteter..."
            rows={4}
          />
        </SectionCard>
      </div>
    </form>
  );
}
