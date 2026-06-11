import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Upload, X, Trash2,
  ExternalLink, Eye, MapPin, Image as ImageIcon, Archive, Send,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Photo, Pill, SectionCard } from '../../components/ui/kit';
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

      <div className="animate-fade-up">
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3 flex-1 min-w-[220px]">
            <button type="button" onClick={() => navigate('/annonser')} aria-label="Tilbake til mine annonser"
              className="p-2 text-muted hover:text-ink hover:bg-line-soft rounded-xl transition-all cursor-pointer shrink-0">
              <ArrowLeft size={18} />
            </button>
            <div className="min-w-0">
              <h1 className="m-0 text-[clamp(24px,3vw,30px)] font-extrabold tracking-[-0.025em] text-ink">{eksisterende ? 'Rediger annonse' : 'Ny annonse'}</h1>
              <p className="mt-1.5 mb-0 text-[14.5px] font-medium text-muted truncate">{form.tittel || 'Lag en annonse og publiser til FINN.no'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {lagrefeil && <span className="text-xs font-semibold text-danger">{lagrefeil}</span>}
            {eksisterende && (
              <Button variant="ghost" onClick={() => setSlettVis(true)}>
                <Trash2 size={15} /> Slett
              </Button>
            )}
            <Button variant="secondary" onClick={() => lagre()}>
              {lagret ? <><Check size={15} className="text-brand-ink" /> Lagret!</> : 'Lagre kladd'}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_360px] gap-[18px] items-start">
          {/* Skjema */}
          <div className="space-y-[18px]">
            <SectionCard tittel="Hva leier du ut?" bodyClassName="space-y-4">
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
            </SectionCard>

            <SectionCard tittel="Nøkkelinfo">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Månedlig leie" type="number" value={form.maanedligLeie} onChange={set('maanedligLeie')} placeholder="12000" suffix="kr" />
                <Input label="Depositum" type="number" value={form.depositum} onChange={set('depositum')} placeholder="36000" suffix="kr" />
                <Input label="Areal" type="number" value={form.areal} onChange={set('areal')} placeholder="55" suffix="m²" />
                <Input label="Antall rom" type="number" value={form.antallRom} onChange={set('antallRom')} placeholder="2" />
                <Input label="Etasje" value={form.etasje} onChange={set('etasje')} placeholder="2. etasje" />
                <Input label="Tilgjengelig fra" type="date" value={form.tilgjengeligFra} onChange={set('tilgjengeligFra')} />
              </div>
            </SectionCard>

            <SectionCard tittel="Inkludert og regler" bodyClassName="space-y-4">
              <div>
                <div className="text-[12.5px] font-bold text-muted mb-3">Inkludert i leien</div>
                <div className="grid grid-cols-2 gap-3">
                  <Toggle checked={form.inkluderer.strom} onChange={setInkl('strom')} label="Strøm og oppvarming" />
                  <Toggle checked={form.inkluderer.vann} onChange={setInkl('vann')} label="Vann og avløp" />
                  <Toggle checked={form.inkluderer.internett} onChange={setInkl('internett')} label="Internett" />
                  <Toggle checked={form.inkluderer.mobler} onChange={setInkl('mobler')} label="Møblert" />
                  <Toggle checked={form.inkluderer.parkering} onChange={setInkl('parkering')} label="Parkering" />
                </div>
              </div>
              <div className="pt-1">
                <div className="text-[12.5px] font-bold text-muted mb-3">Husregler</div>
                <div className="grid grid-cols-2 gap-3">
                  <Toggle checked={form.dyrTillatt} onChange={toggle('dyrTillatt')} label="Dyr tillatt" />
                  <Toggle checked={form.roykTillatt} onChange={toggle('roykTillatt')} label="Røyking tillatt" />
                </div>
              </div>
            </SectionCard>

            <SectionCard tittel="Bilder" bodyClassName="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {form.bilder.map((b, i) => (
                  <div key={i} className="relative group">
                    <Photo src={b} alt="" className="aspect-video rounded-xl border border-line">
                      <button type="button" onClick={() => fjernBilde(i)} aria-label="Fjern bilde"
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#141A17]/65 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer">
                        <X size={12} />
                      </button>
                      {i === 0 && <span className="absolute bottom-1.5 left-1.5 text-[10px] font-extrabold bg-white/95 text-brand-ink px-2 py-0.5 rounded-full">Hovedbilde</span>}
                    </Photo>
                  </div>
                ))}
                <label className="aspect-video rounded-xl border-2 border-dashed border-line-input hover:border-brand bg-surface-2 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors">
                  <Upload size={18} className="text-muted-2" />
                  <span className="text-xs font-bold text-muted-2">Last opp</span>
                  <input type="file" accept="image/*" multiple onChange={lastOppBilder} className="hidden" />
                </label>
              </div>
              <p className="text-xs font-medium text-muted-2">Første bilde brukes som hovedbilde i annonsen. Last opp flere for best resultat.</p>
            </SectionCard>

            <SectionCard tittel="Kontaktinformasjon" bodyClassName="space-y-4">
              <p className="text-xs font-medium text-muted-2">Vises til interessenter på FINN. La stå tomt for å bruke utleier-info.</p>
              <div className="grid grid-cols-3 gap-4">
                <Input label="Navn" value={form.kontaktNavn} onChange={set('kontaktNavn')} placeholder="Kontaktperson" />
                <Input label="Telefon" value={form.kontaktTlf} onChange={set('kontaktTlf')} placeholder="+47 ..." />
                <Input label="E-post" value={form.kontaktEpost} onChange={set('kontaktEpost')} placeholder="post@..." />
              </div>
            </SectionCard>
          </div>

          {/* Forhåndsvisning + publisering */}
          <div className="sticky top-6 space-y-[18px]">
            {/* Preview-kort */}
            <div className="bg-surface border border-line rounded-[20px] overflow-hidden">
              <div className="px-[18px] py-3 border-b border-line flex items-center gap-2">
                <Eye size={14} className="text-muted-2" />
                <span className="text-[11px] font-extrabold text-muted-2 uppercase tracking-wider">Forhåndsvisning</span>
              </div>
              <Photo src={form.bilder[0]} alt="" className="aspect-video" icon={<ImageIcon size={28} strokeWidth={1.6} />} />
              <div className="p-[18px]">
                <div className="text-base font-extrabold tracking-[-0.01em] text-ink mb-1">{form.tittel || 'Annonsetittel'}</div>
                {form.adresse && (
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 mb-2.5">
                    <MapPin size={13} /> {form.adresse}
                  </div>
                )}
                <div className="text-lg font-extrabold text-brand-ink num mb-3.5">
                  {form.maanedligLeie ? `${formatKr(form.maanedligLeie)}/mnd` : '— kr/mnd'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.areal && <Pill tone="neutral">{form.areal} m²</Pill>}
                  {form.antallRom && <Pill tone="neutral">{form.antallRom} rom</Pill>}
                  {form.etasje && <Pill tone="neutral">{form.etasje}</Pill>}
                  {form.inkluderer.mobler && <Pill tone="mint">Møblert</Pill>}
                  {form.inkluderer.parkering && <Pill tone="mint">Parkering</Pill>}
                </div>
              </div>
            </div>

            {/* Publisering */}
            <SectionCard tittel="Publisering" bodyClassName="space-y-4">
              {/* FINN-status */}
              {form.finnKode ? (
                <div className="bg-mint-soft border border-mint-line rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-brand-ink">
                    <Check size={15} /> Publisert på FINN
                  </div>
                  <a href={form.finnUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink hover:underline">
                    FINN-kode {form.finnKode} <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <p className="text-[13px] font-medium text-muted leading-relaxed">
                  Annonsen er ikke publisert ennå. Publiser til FINN.no for å nå tusenvis av boligsøkere.
                </p>
              )}

              {!finnKonfigurert() && (
                <div className="bg-amber-soft border border-amber-line rounded-xl p-3.5 text-[13px] font-medium text-amber leading-relaxed">
                  FINN-publisering kommer — integrasjonen er ikke aktivert ennå.
                  Inntil videre lagres annonsen som upublisert kladd i EiendomsPRO.
                </div>
              )}

              <div className="space-y-2.5">
                {form.status !== 'aktiv' || !form.finnKode ? (
                  <Button variant="primary" className="w-full justify-center" onClick={publiser} disabled={jobber}>
                    <Send size={15} /> {jobber ? 'Publiserer...' : 'Publiser til FINN'}
                  </Button>
                ) : (
                  <>
                    <Button variant="primary" className="w-full justify-center" onClick={publiser} disabled={jobber}>
                      <Check size={15} /> {jobber ? 'Oppdaterer...' : 'Oppdater FINN-annonse'}
                    </Button>
                    <Button variant="secondary" className="w-full justify-center" onClick={avpubliser} disabled={jobber}>
                      <Archive size={15} /> Avpubliser
                    </Button>
                  </>
                )}
                <Button variant="secondary" className="w-full justify-center" onClick={() => lagre()}>
                  {lagret ? <><Check size={15} className="text-brand-ink" /> Lagret!</> : 'Lagre kladd'}
                </Button>
              </div>

              {/* Resultat */}
              {finnResultat && (
                <div className={`rounded-xl p-3.5 text-[13px] font-medium leading-relaxed
                  ${finnResultat.type === 'feil' ? 'bg-danger/[0.06] border border-danger/25 text-danger'
                    : finnResultat.type === 'kladd' ? 'bg-amber-soft border border-amber-line text-amber'
                    : 'bg-mint-soft border border-mint-line text-brand-ink'}`}>
                  {finnResultat.type === 'publisert' && (finnResultat.melding || 'Annonsen er publisert på FINN!')}
                  {finnResultat.type === 'oppdatert' && 'FINN-annonsen er oppdatert.'}
                  {finnResultat.type === 'arkivert' && 'Annonsen er avpublisert fra FINN.'}
                  {finnResultat.type === 'kladd' && finnResultat.melding}
                  {finnResultat.type === 'feil' && `Feil: ${finnResultat.melding}`}
                </div>
              )}
            </SectionCard>

            {/* Interessenter */}
            {form.interessenter?.length > 0 && (
              <SectionCard tittel={`Interessenter (${form.interessenter.length})`} bodyClassName="space-y-2">
                {form.interessenter.map((i, idx) => (
                  <div key={idx} className="text-sm font-semibold text-ink">{i.navn || i}</div>
                ))}
              </SectionCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
