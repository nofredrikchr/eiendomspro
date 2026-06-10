import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Upload, X, Trash2,
  ExternalLink, Eye, MapPin, Image as ImageIcon, Archive, Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { BekreftModal } from '../../components/ui/BekreftModal';
import { formatKr } from '../../utils/format';
import { publiserTilFinn, oppdaterFinnAnnonse, avpubliserFinn, finnKonfigurert } from '../../services/finn';

const BOLIGTYPER = [
  { value: 'leilighet', label: 'Leilighet' },
  { value: 'hybel', label: 'Hybel' },
  { value: 'sokkelleilighet', label: 'Sokkelleilighet' },
  { value: 'enebolig', label: 'Enebolig' },
  { value: 'rekkehus', label: 'Rekkehus' },
  { value: 'rom', label: 'Rom i bofellesskap' },
];

const defaultAnnonse = {
  leieobjektId: '',
  tittel: '',
  beskrivelse: '',
  boligtype: 'leilighet',
  maanedligLeie: '',
  depositum: '',
  areal: '',
  antallRom: '',
  etasje: '',
  tilgjengeligFra: '',
  adresse: '',
  inkluderer: { strom: false, vann: true, internett: false, mobler: false, parkering: false },
  dyrTillatt: false,
  roykTillatt: false,
  bilder: [],
  kontaktNavn: '',
  kontaktTlf: '',
  kontaktEpost: '',
  status: 'kladd',
  finnKode: null,
  finnUrl: null,
  visninger: 0,
  interessenter: [],
};

function Seksjon({ tittel, children }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E9E8E2] bg-[#F1F1ED] text-sm font-semibold text-[#1A1B1E]">{tittel}</div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

export default function AnnonseSkjema() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { annonser, leieobjekter, bygg, addAnnonse, updateAnnonse, deleteAnnonse } = useApp();

  const eksisterende = id ? annonser.find((a) => a.id === id) : null;
  const [form, setForm] = useState(() => eksisterende || { ...defaultAnnonse });
  const [lagret, setLagret] = useState(false);
  const [lagrefeil, setLagrefeil] = useState('');
  const [jobber, setJobber] = useState(false);
  const [finnResultat, setFinnResultat] = useState(null);
  const [slettVis, setSlettVis] = useState(false);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const setInkl = (f) => () => setForm((p) => ({ ...p, inkluderer: { ...p.inkluderer, [f]: !p.inkluderer[f] } }));
  const toggle = (f) => () => setForm((p) => ({ ...p, [f]: !p[f] }));

  // Forhåndsfyll fra leieobjekt
  function velgLeieobjekt(e) {
    const objId = e.target.value;
    const obj = leieobjekter.find((l) => l.id === objId);
    const b = obj ? bygg.find((bb) => bb.id === obj.byggId) : null;
    setForm((p) => ({
      ...p,
      leieobjektId: objId,
      maanedligLeie: obj?.forventetLeie ? String(obj.forventetLeie) : p.maanedligLeie,
      areal: obj?.areal ? String(obj.areal) : p.areal,
      antallRom: obj?.antallRom ? String(obj.antallRom) : p.antallRom,
      boligtype: obj?.type || p.boligtype,
      adresse: b ? `${b.gatenavn} ${b.gatenummer}, ${b.postnummer} ${b.poststed}` : p.adresse,
      tittel: p.tittel || (obj && b ? `${BOLIGTYPER.find(t => t.value === obj.type)?.label || 'Bolig'} til leie – ${b.gatenavn} ${b.gatenummer}` : p.tittel),
    }));
  }

  function lastOppBilder(e) {
    const files = [...e.target.files];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => setForm((p) => ({ ...p, bilder: [...p.bilder, reader.result] }));
      reader.readAsDataURL(file);
    });
  }
  function fjernBilde(i) {
    setForm((p) => ({ ...p, bilder: p.bilder.filter((_, j) => j !== i) }));
  }

  async function lagre(nyStatus) {
    const data = { ...form, ...(nyStatus ? { status: nyStatus } : {}) };
    setLagrefeil('');
    try {
      let lagretId = id;
      if (eksisterende) await updateAnnonse(id, data);
      else { const ny = await addAnnonse(data); lagretId = ny.id; }
      setForm(data);
      setLagret(true);
      setTimeout(() => setLagret(false), 2000);
      return lagretId;
    } catch (err) {
      setLagrefeil(err.message || 'Kunne ikke lagre annonsen. Prøv igjen.');
      return null;
    }
  }

  async function publiser() {
    setJobber(true);
    setFinnResultat(null);
    try {
      // FINN-publisering krever API-avtale. Uten den fabrikkerer vi IKKE
      // FINN-koder/lenker — annonsen lagres ærlig som upublisert kladd.
      if (!finnKonfigurert()) {
        const data = { ...form, status: 'kladd', finnKode: null, finnUrl: null };
        if (eksisterende) await updateAnnonse(id, data);
        else await addAnnonse(data);
        setForm(data);
        setFinnResultat({
          type: 'kladd',
          melding: 'FINN-publisering er ikke tilgjengelig ennå. Annonsen er lagret som kladd og kan publiseres når integrasjonen er på plass.',
        });
        return;
      }
      let res;
      if (form.finnKode) {
        res = await oppdaterFinnAnnonse(form.finnKode, form);
        setFinnResultat({ type: 'oppdatert', ...res });
      } else {
        res = await publiserTilFinn(form);
        setForm((p) => ({ ...p, finnKode: res.finnKode, finnUrl: res.url, status: 'aktiv' }));
        setFinnResultat({ type: 'publisert', ...res });
      }
      // Lagre med ny finn-info
      const data = { ...form, finnKode: res.finnKode || form.finnKode, finnUrl: res.url || form.finnUrl, status: 'aktiv' };
      if (eksisterende) await updateAnnonse(id, data);
      else await addAnnonse(data);
    } catch (err) {
      setFinnResultat({ type: 'feil', melding: err.message });
    } finally {
      setJobber(false);
    }
  }

  async function avpubliser() {
    setJobber(true);
    try {
      await avpubliserFinn(form.finnKode);
      const data = { ...form, status: 'arkivert' };
      setForm(data);
      if (eksisterende) await updateAnnonse(id, data);
      setFinnResultat({ type: 'arkivert' });
    } catch (err) {
      setFinnResultat({ type: 'feil', melding: err.message });
    } finally {
      setJobber(false);
    }
  }

  const ledigeLeieobjekter = leieobjekter.map((l) => {
    const b = bygg.find((bb) => bb.id === l.byggId);
    return { value: l.id, label: `${b ? `${b.gatenavn} ${b.gatenummer}` : 'Ukjent'}${l.betegnelse ? ` · ${l.betegnelse}` : ''}` };
  });

  return (
    <>
      <BekreftModal
        åpen={slettVis}
        tittel="Slette annonsen?"
        tekst="Annonsen blir permanent slettet."
        bekreftLabel="Slett"
        onBekreft={() => { deleteAnnonse(id); navigate('/annonser'); }}
        onAvbryt={() => setSlettVis(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/annonser')} aria-label="Tilbake til mine annonser"
            className="p-1.5 text-[#65696F] hover:text-[#1A1B1E] hover:bg-black/[0.045] rounded-lg transition-all cursor-pointer">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1B1E]">{eksisterende ? 'Rediger annonse' : 'Ny annonse'}</h1>
            <p className="text-sm text-[#65696F] mt-0.5">{form.tittel || 'Lag en annonse og publiser til FINN.no'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lagrefeil && <span className="text-xs text-[#DC2626]">{lagrefeil}</span>}
          {eksisterende && (
            <Button variant="ghost" onClick={() => setSlettVis(true)}>
              <Trash2 size={14} /> Slett
            </Button>
          )}
          <Button variant="secondary" onClick={() => lagre()}>
            {lagret ? <><Check size={14} className="text-[#15803D]" /> Lagret!</> : 'Lagre kladd'}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
        {/* Skjema */}
        <div className="space-y-4">
          <Seksjon tittel="Hva leier du ut?">
            {leieobjekter.length > 0 && (
              <Select label="Hent fra leieobjekt (valgfritt)" value={form.leieobjektId} onChange={velgLeieobjekt}
                options={ledigeLeieobjekter} placeholder="Velg leieobjekt for å forhåndsfylle..." />
            )}
            <Input label="Tittel" value={form.tittel} onChange={set('tittel')}
              placeholder="f.eks. Lys 2-roms med balkong sentralt i Sarpsborg" />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Boligtype" value={form.boligtype} onChange={set('boligtype')} options={BOLIGTYPER} />
              <Input label="Adresse" value={form.adresse} onChange={set('adresse')} placeholder="Gateadresse, poststed" />
            </div>
            <Textarea label="Beskrivelse" value={form.beskrivelse} onChange={set('beskrivelse')} rows={6}
              placeholder="Beskriv boligen: standard, beliggenhet, hva som er i nærheten, hvem som passer som leietaker..." />
          </Seksjon>

          <Seksjon tittel="Nøkkelinfo">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Månedlig leie (kr)" type="number" value={form.maanedligLeie} onChange={set('maanedligLeie')} placeholder="12000" />
              <Input label="Depositum (kr)" type="number" value={form.depositum} onChange={set('depositum')} placeholder="36000" />
              <Input label="Areal (m²)" type="number" value={form.areal} onChange={set('areal')} placeholder="55" />
              <Input label="Antall rom" type="number" value={form.antallRom} onChange={set('antallRom')} placeholder="2" />
              <Input label="Etasje" value={form.etasje} onChange={set('etasje')} placeholder="2. etasje" />
              <Input label="Tilgjengelig fra" type="date" value={form.tilgjengeligFra} onChange={set('tilgjengeligFra')} />
            </div>
          </Seksjon>

          <Seksjon tittel="Inkludert og regler">
            <div>
              <div className="text-xs font-medium text-[#65696F] mb-3">Inkludert i leien</div>
              <div className="grid grid-cols-2 gap-3">
                <Toggle checked={form.inkluderer.strom} onChange={setInkl('strom')} label="Strøm og oppvarming" />
                <Toggle checked={form.inkluderer.vann} onChange={setInkl('vann')} label="Vann og avløp" />
                <Toggle checked={form.inkluderer.internett} onChange={setInkl('internett')} label="Internett" />
                <Toggle checked={form.inkluderer.mobler} onChange={setInkl('mobler')} label="Møblert" />
                <Toggle checked={form.inkluderer.parkering} onChange={setInkl('parkering')} label="Parkering" />
              </div>
            </div>
            <div className="pt-1">
              <div className="text-xs font-medium text-[#65696F] mb-3">Husregler</div>
              <div className="grid grid-cols-2 gap-3">
                <Toggle checked={form.dyrTillatt} onChange={toggle('dyrTillatt')} label="Dyr tillatt" />
                <Toggle checked={form.roykTillatt} onChange={toggle('roykTillatt')} label="Røyking tillatt" />
              </div>
            </div>
          </Seksjon>

          <Seksjon tittel="Bilder">
            <div className="grid grid-cols-3 gap-3">
              {form.bilder.map((b, i) => (
                <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-[#E9E8E2] group">
                  <img src={b} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => fjernBilde(i)} aria-label="Fjern bilde"
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-[#1A1B1E] flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer">
                    <X size={12} />
                  </button>
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 text-xs bg-black/70 text-[#1A1B1E] px-1.5 py-0.5 rounded">Hovedbilde</span>}
                </div>
              ))}
              <label className="aspect-video rounded-lg border-2 border-dashed border-[#E9E8E2] hover:border-[#DCDAD2] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                <Upload size={18} className="text-[#7A7D83]" />
                <span className="text-xs text-[#7A7D83]">Last opp</span>
                <input type="file" accept="image/*" multiple onChange={lastOppBilder} className="hidden" />
              </label>
            </div>
            <p className="text-xs text-[#AEB0B4]">Første bilde brukes som hovedbilde i annonsen. Last opp flere for best resultat.</p>
          </Seksjon>

          <Seksjon tittel="Kontaktinformasjon">
            <p className="text-xs text-[#7A7D83]">Vises til interessenter på FINN. La stå tomt for å bruke utleier-info.</p>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Navn" value={form.kontaktNavn} onChange={set('kontaktNavn')} placeholder="Kontaktperson" />
              <Input label="Telefon" value={form.kontaktTlf} onChange={set('kontaktTlf')} placeholder="+47 ..." />
              <Input label="E-post" value={form.kontaktEpost} onChange={set('kontaktEpost')} placeholder="post@..." />
            </div>
          </Seksjon>
        </div>

        {/* Forhåndsvisning + publisering */}
        <div className="sticky top-6 space-y-4">
          {/* Preview-kort */}
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#E9E8E2] flex items-center gap-2">
              <Eye size={13} className="text-[#7A7D83]" />
              <span className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Forhåndsvisning</span>
            </div>
            <div className="aspect-video bg-[#F6F6F4] flex items-center justify-center overflow-hidden">
              {form.bilder[0] ? (
                <img src={form.bilder[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={28} className="text-[#DCDAD2]" />
              )}
            </div>
            <div className="p-4">
              <div className="text-sm font-semibold text-[#1A1B1E] mb-1">{form.tittel || 'Annonsetittel'}</div>
              {form.adresse && (
                <div className="flex items-center gap-1 text-xs text-[#7A7D83] mb-2">
                  <MapPin size={11} /> {form.adresse}
                </div>
              )}
              <div className="text-lg font-bold text-[#15803D] num mb-3">
                {form.maanedligLeie ? `${formatKr(form.maanedligLeie)}/mnd` : '— kr/mnd'}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {form.areal && <span className="bg-[#E9E8E2] px-2 py-1 rounded-md text-[#4B4E54] num">{form.areal} m²</span>}
                {form.antallRom && <span className="bg-[#E9E8E2] px-2 py-1 rounded-md text-[#4B4E54] num">{form.antallRom} rom</span>}
                {form.etasje && <span className="bg-[#E9E8E2] px-2 py-1 rounded-md text-[#4B4E54]">{form.etasje}</span>}
                {form.inkluderer.mobler && <span className="bg-[#E9E8E2] px-2 py-1 rounded-md text-[#4B4E54]">Møblert</span>}
                {form.inkluderer.parkering && <span className="bg-[#E9E8E2] px-2 py-1 rounded-md text-[#4B4E54]">Parkering</span>}
              </div>
            </div>
          </div>

          {/* Publisering */}
          <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5 space-y-4">
            <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider">Publisering</div>

            {/* FINN-status */}
            {form.finnKode ? (
              <div className="bg-[#15803D]/5 border border-[#15803D]/20 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm text-[#15803D] font-medium">
                  <Check size={14} /> Publisert på FINN
                </div>
                <a href={form.finnUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#2563EB] hover:underline">
                  FINN-kode {form.finnKode} <ExternalLink size={11} />
                </a>
              </div>
            ) : (
              <p className="text-xs text-[#65696F]">
                Annonsen er ikke publisert ennå. Publiser til FINN.no for å nå tusenvis av boligsøkere.
              </p>
            )}

            {!finnKonfigurert() && (
              <div className="bg-[#9A7A24]/5 border border-[#9A7A24]/20 rounded-lg p-3 text-xs text-[#9A7A24] leading-relaxed">
                FINN-publisering kommer — integrasjonen er ikke aktivert ennå.
                Inntil videre lagres annonsen som upublisert kladd i EiendomsPRO.
              </div>
            )}

            <div className="space-y-2">
              {form.status !== 'aktiv' || !form.finnKode ? (
                <Button variant="primary" className="w-full justify-center" onClick={publiser} disabled={jobber}>
                  <Send size={14} /> {jobber ? 'Publiserer...' : 'Publiser til FINN'}
                </Button>
              ) : (
                <>
                  <Button variant="primary" className="w-full justify-center" onClick={publiser} disabled={jobber}>
                    <Check size={14} /> {jobber ? 'Oppdaterer...' : 'Oppdater FINN-annonse'}
                  </Button>
                  <Button variant="secondary" className="w-full justify-center" onClick={avpubliser} disabled={jobber}>
                    <Archive size={14} /> Avpubliser
                  </Button>
                </>
              )}
              <Button variant="secondary" className="w-full justify-center" onClick={() => lagre()}>
                {lagret ? <><Check size={14} className="text-[#15803D]" /> Lagret!</> : 'Lagre kladd'}
              </Button>
            </div>

            {/* Resultat */}
            {finnResultat && (
              <div className={`rounded-lg p-3 text-xs leading-relaxed
                ${finnResultat.type === 'feil' ? 'bg-[#DC2626]/5 border border-[#DC2626]/20 text-[#DC2626]'
                  : finnResultat.type === 'kladd' ? 'bg-[#9A7A24]/5 border border-[#9A7A24]/20 text-[#9A7A24]'
                  : 'bg-[#15803D]/5 border border-[#15803D]/20 text-[#15803D]'}`}>
                {finnResultat.type === 'publisert' && (finnResultat.melding || 'Annonsen er publisert på FINN!')}
                {finnResultat.type === 'oppdatert' && 'FINN-annonsen er oppdatert.'}
                {finnResultat.type === 'arkivert' && 'Annonsen er avpublisert fra FINN.'}
                {finnResultat.type === 'kladd' && finnResultat.melding}
                {finnResultat.type === 'feil' && `Feil: ${finnResultat.melding}`}
              </div>
            )}
          </div>

          {/* Interessenter */}
          {form.interessenter?.length > 0 && (
            <div className="bg-[#FFFFFF] border border-[#E9E8E2] rounded-xl p-5">
              <div className="text-xs font-medium text-[#7A7D83] uppercase tracking-wider mb-3">
                Interessenter ({form.interessenter.length})
              </div>
              <div className="space-y-2">
                {form.interessenter.map((i, idx) => (
                  <div key={idx} className="text-sm text-[#1A1B1E]">{i.navn || i}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
