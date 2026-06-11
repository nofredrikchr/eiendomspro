import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Download, Eye, X, ClipboardList, FileText } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Input, Select, Textarea, Toggle } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Pill } from '../../components/ui/kit';
import { formatKr } from '../../utils/format';
import { genererKontraktPDF } from '../../utils/kontraktPDF';
import { Logo } from '../../components/Logo';

// ─── Standardverdier ──────────────────────────────────────────────────────────
const defaultForm = {
  utleierNavn: '',

  leietakerNavn: '',
  leietakerEpost: '',
  leietakerTlf: '',
  leietakerFodselsdato: '',

  leieobjektId: '',

  maanedligLeie: '',
  betalingsdato: '1',
  kontonummer: '',
  inkludererStrom: false,
  inkludererVann: true,
  inkludererInternett: false,
  inkludererTV: false,
  annenInkludert: '',
  inkludererAnnet: false,
  indeksregulering: true,
  elektroniskKommunikasjon: true,

  kontraktstype: 'tidsubestemt',
  startdato: '',
  sluttdato: '',
  oppsigelsestid: '3',

  sikkerhetsType: 'depositumskonto',   // depositumskonto | garanti | ingen
  depositum: '',
  depositumFrist: '',
  garantiUtsteder: '',
  garantiKostnad: '',

  royking: false,
  husdyr: false,
  husordensregler: false,

  andrebestemmelser: '',
};

const SEKSJONER = [
  { nr: 1, tittel: 'Leietaker' },
  { nr: 2, tittel: 'Leieobjekt' },
  { nr: 3, tittel: 'Leie' },
  { nr: 4, tittel: 'Varighet' },
  { nr: 5, tittel: 'Sikkerhet' },
  { nr: 6, tittel: 'Tilleggsvilkår' },
];

// ─── UI-hjelper ───────────────────────────────────────────────────────────────
function SeksjonHeader({ nr, tittel, open, onClick, ferdig }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-between p-5 hover:bg-surface-2 transition-colors cursor-pointer">
      <div className="flex items-center gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors num
          ${ferdig ? 'bg-mint text-brand-ink' : open ? 'bg-line-soft text-ink' : 'bg-line-soft text-muted-2'}`}>
          {ferdig ? <Check size={13} /> : nr}
        </div>
        <span className={`text-sm font-bold transition-colors ${open ? 'text-ink' : 'text-muted'}`}>{tittel}</span>
      </div>
      {open ? <ChevronUp size={15} className="text-muted-2" /> : <ChevronDown size={15} className="text-faint-2" />}
    </button>
  );
}
function Divider() { return <div className="h-px bg-line-soft mx-5" />; }
function FeltRad({ children }) { return <div className="px-5 pb-5 space-y-4">{children}</div>; }

function RadioKort({ value, current, onChange, label, sub }) {
  const aktiv = current === value;
  return (
    <button type="button" onClick={() => onChange(value)}
      className={`p-3.5 rounded-xl border-[1.5px] text-left text-sm transition-all cursor-pointer w-full
        ${aktiv ? 'border-brand bg-mint-soft text-ink' : 'border-line text-muted hover:border-line-input'}`}>
      <div className="flex items-center gap-2.5">
        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center
          ${aktiv ? 'border-brand' : 'border-faint-2'}`}>
          {aktiv && <div className="w-2 h-2 rounded-full bg-brand" />}
        </div>
        <span className="font-bold">{label}</span>
      </div>
      {sub && <div className="text-xs font-medium text-muted-2 mt-1 pl-[26px]">{sub}</div>}
    </button>
  );
}

// ─── HTML-forhåndsvisning ────────────────────────────────────────────────────
function datoLang(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return d; }
}
function datoFmt(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return d; }
}

function KontraktPreviewModal({ kontrakt, leieobjekt, bygg, utleier, onLukk }) {
  const u = utleier || {};
  const inkl = [
    kontrakt.inkludererStrom && 'Strøm og oppvarming',
    kontrakt.inkludererVann && 'Vann og avløp',
    kontrakt.inkludererInternett && 'Internett',
    kontrakt.inkludererTV && 'TV-abonnement',
    kontrakt.inkludererAnnet && kontrakt.annenInkludert,
  ].filter(Boolean);

  const sType = kontrakt.sikkerhetsType || 'depositumskonto';

  const adr = bygg ? `${bygg.gatenavn} ${bygg.gatenummer}, ${bygg.postnummer} ${bygg.poststed}` : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto py-8">
      <div className="relative w-full max-w-3xl">
        {/* Lukk-knapp */}
        <button onClick={onLukk}
          className="fixed top-4 right-4 z-60 bg-surface hover:bg-line-soft text-ink rounded-full p-2 shadow-soft transition-colors cursor-pointer">
          <X size={18} />
        </button>

        {/* A4-lignende dokument — matcher generert PDF (eget visuelt språk) */}
        <div className="bg-white mx-4 rounded-[18px] overflow-hidden shadow-soft" style={{ fontFamily: 'Georgia, serif', color: '#111' }}>

          {/* Header */}
          <div style={{ background: '#fff', padding: '18px 36px 14px', borderBottom: '2px solid #162840', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Logo variant="dark" height={28} />
            <div style={{ fontSize: 18, fontWeight: 'bold', color: '#162840', fontFamily: 'Arial, sans-serif', letterSpacing: '0.02em' }}>
              LEIEKONTRAKT
            </div>
          </div>

          <div style={{ padding: '28px 36px' }}>

            {/* Parter-boks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #d4d8e0', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
              {[
                { tittel: 'UTLEIER', navn: u.navn || '—', sub1: u.type === 'foretak' ? `Org.nr: ${u.orgnummer || '—'}` : `Fødselsdato: ${u.fodselsdato || '—'}`, sub2: [u.epost, u.tlf].filter(Boolean).join(' · ') },
                { tittel: 'LEIETAKER', navn: kontrakt.leietakerNavn || '—', sub1: kontrakt.leietakerFodselsdato ? `Fødselsdato: ${datoFmt(kontrakt.leietakerFodselsdato)}` : '', sub2: [kontrakt.leietakerEpost, kontrakt.leietakerTlf].filter(Boolean).join(' · ') },
              ].map((p, i) => (
                <div key={i} style={{ padding: '14px 16px', background: '#f8f9fb', borderRight: i === 0 ? '1px solid #d4d8e0' : 'none' }}>
                  <div style={{ fontSize: 9, fontWeight: 'bold', color: '#888', letterSpacing: '0.08em', marginBottom: 6 }}>{p.tittel}</div>
                  <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>{p.navn}</div>
                  {p.sub1 && <div style={{ fontSize: 11, color: '#555', marginBottom: 2 }}>{p.sub1}</div>}
                  {p.sub2 && <div style={{ fontSize: 11, color: '#555' }}>{p.sub2}</div>}
                </div>
              ))}
            </div>

            {/* Eiendom-boks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #d4d8e0', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
              {[
                { tittel: 'EIENDOM', tekst: adr },
                { tittel: 'LEIEOBJEKT', tekst: [leieobjekt?.betegnelse, leieobjekt?.type, leieobjekt?.areal ? `${leieobjekt.areal} m²` : ''].filter(Boolean).join(' · ') || '—' },
              ].map((p, i) => (
                <div key={i} style={{ padding: '10px 16px', background: '#f8f9fb', borderRight: i === 0 ? '1px solid #d4d8e0' : 'none' }}>
                  <div style={{ fontSize: 9, fontWeight: 'bold', color: '#888', letterSpacing: '0.08em', marginBottom: 4 }}>{p.tittel}</div>
                  <div style={{ fontSize: 12, fontWeight: '600' }}>{p.tekst}</div>
                </div>
              ))}
            </div>

            {/* Dato-rad */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 20 }}>
              <span>Kontraktsdato: {datoFmt(new Date().toISOString())}</span>
              <span>Startdato: {datoLang(kontrakt.startdato)}</span>
            </div>
            <div style={{ borderTop: '2px solid #162840', marginBottom: 24 }} />

            {/* Seksjon-hjelper */}
            {[
              {
                nr: 1, tittel: 'KONTRAKTENS PARTER',
                innhold: (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12 }}>Utleier</div>
                      <InfoRad etikett={u.type === 'foretak' ? 'Selskapsnavn' : 'Navn'} verdi={u.navn} />
                      {u.type === 'foretak' ? <InfoRad etikett="Org.nr" verdi={u.orgnummer} /> : <InfoRad etikett="Fødselsdato" verdi={u.fodselsdato} />}
                      {u.epost && <InfoRad etikett="E-post" verdi={u.epost} />}
                      {u.tlf && <InfoRad etikett="Telefon" verdi={u.tlf} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: 6, fontSize: 12 }}>Leietaker</div>
                      <InfoRad etikett="Fullt navn" verdi={kontrakt.leietakerNavn} />
                      {kontrakt.leietakerFodselsdato && <InfoRad etikett="Fødselsdato" verdi={datoFmt(kontrakt.leietakerFodselsdato)} />}
                      {kontrakt.leietakerEpost && <InfoRad etikett="E-post" verdi={kontrakt.leietakerEpost} />}
                      {kontrakt.leietakerTlf && <InfoRad etikett="Telefon" verdi={kontrakt.leietakerTlf} />}
                    </div>
                  </div>
                ),
              },
              {
                nr: 2, tittel: 'EIENDOM OG LEIEOBJEKT',
                innhold: (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <InfoRad etikett="Adresse" verdi={bygg ? `${bygg.gatenavn} ${bygg.gatenummer}` : '—'} />
                      <InfoRad etikett="Postnummer / poststed" verdi={bygg ? `${bygg.postnummer} ${bygg.poststed}` : '—'} />
                      {(bygg?.gardsnummer || bygg?.bruksnummer) && <InfoRad etikett="Gnr./Bnr." verdi={`${bygg.gardsnummer || '—'} / ${bygg.bruksnummer || '—'}`} />}
                    </div>
                    <div>
                      <InfoRad etikett="Type" verdi={leieobjekt?.type || '—'} />
                      <InfoRad etikett="Betegnelse" verdi={leieobjekt?.betegnelse || '—'} />
                      <InfoRad etikett="Areal" verdi={leieobjekt?.areal ? `${leieobjekt.areal} m²` : '—'} />
                    </div>
                  </div>
                ),
              },
              {
                nr: 3, tittel: 'LEIE',
                innhold: (
                  <>
                    <InfoRad etikett="Månedlig leie" verdi={kontrakt.maanedligLeie ? `kr ${Number(kontrakt.maanedligLeie).toLocaleString('nb-NO')},-` : '—'} bold />
                    <InfoRad etikett="Betales den" verdi={`${kontrakt.betalingsdato || 1}. i måneden`} />
                    <InfoRad etikett="Kontonummer" verdi={kontrakt.kontonummer || (u.kontonummer || '—')} />
                    <InfoRad etikett="Inkludert i leien" verdi={inkl.length > 0 ? inkl.join(', ') : 'Ingen tillegg inkludert'} />
                    {kontrakt.indeksregulering && <Paragraf tekst="KPI-indeksregulering: Leien kan reguleres én gang per år i takt med endringen i konsumprisindeksen (SSB), tidligst 12 måneder etter siste fastsettelse. Leietaker varsles skriftlig minst én måned før ny leie trer i kraft, jf. husleieloven § 4-2." />}
                    {kontrakt.indeksregulering && kontrakt.elektroniskKommunikasjon && <Paragraf tekst="Elektronisk kommunikasjon: Partene samtykker til at varsler og meldinger, herunder varsel om leieregulering, kan sendes elektronisk til oppgitt e-post og mobilnummer." />}
                  </>
                ),
              },
              {
                nr: 4, tittel: 'VARIGHET OG OPPSIGELSE',
                innhold: (
                  <>
                    <InfoRad etikett="Avtaletype" verdi={kontrakt.kontraktstype === 'tidsubestemt' ? 'Tidsubestemt' : 'Tidsbestemt'} />
                    <InfoRad etikett="Startdato" verdi={datoLang(kontrakt.startdato)} />
                    {kontrakt.sluttdato && <InfoRad etikett="Sluttdato" verdi={datoLang(kontrakt.sluttdato)} />}
                    <InfoRad etikett="Oppsigelsestid" verdi={`${kontrakt.oppsigelsestid || 3} måneder`} />
                  </>
                ),
              },
              {
                nr: 5, tittel: 'SIKKERHET',
                innhold: sType === 'ingen' ? (
                  <Paragraf tekst="Partene har avtalt at det ikke stilles sikkerhet for leieforholdet." />
                ) : sType === 'garanti' ? (
                  <>
                    <InfoRad etikett="Type" verdi="Garanti fra forsikringsselskap" bold />
                    <InfoRad etikett="Beløp" verdi={kontrakt.depositum ? `kr ${Number(kontrakt.depositum).toLocaleString('nb-NO')},-` : '—'} />
                    {kontrakt.garantiUtsteder && <InfoRad etikett="Utsteder" verdi={kontrakt.garantiUtsteder} />}
                    {kontrakt.garantiKostnad && <InfoRad etikett="Garantikostnad" verdi={`kr ${Number(kontrakt.garantiKostnad).toLocaleString('nb-NO')},-`} />}
                    {kontrakt.depositumFrist && <InfoRad etikett="Betalingsfrist" verdi={datoFmt(kontrakt.depositumFrist)} />}
                    <Paragraf tekst="Garantibevis må foreligge før leietaker overtar boligen." />
                  </>
                ) : (
                  <>
                    <InfoRad etikett="Type" verdi="Depositumskonto (sperret bankkonto)" bold />
                    <InfoRad etikett="Beløp" verdi={kontrakt.depositum ? `kr ${Number(kontrakt.depositum).toLocaleString('nb-NO')},-` : '—'} />
                    {kontrakt.depositumFrist && <InfoRad etikett="Betalingsfrist" verdi={datoFmt(kontrakt.depositumFrist)} />}
                    <Paragraf tekst="Depositumet må innbetales på sperret konto og foreligge før leietaker overtar boligen." />
                  </>
                ),
              },
              {
                nr: 6, tittel: 'ORDENSREGLER',
                innhold: (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <InfoRad etikett="Røyking" verdi={kontrakt.royking ? 'Tillatt innendørs' : 'Ikke tillatt innendørs'} />
                      <InfoRad etikett="Husdyr" verdi={kontrakt.husdyr ? 'Tillatt etter avtale' : 'Ikke tillatt uten tillatelse'} />
                    </div>
                    <Paragraf tekst="Det skal være stille etter kl. 23:00. Naboers behov for ro skal respekteres." />
                    {kontrakt.husordensregler && <Paragraf tekst="Se vedlagte husordensregler." />}
                  </>
                ),
              },
              ...(kontrakt.andrebestemmelser ? [{
                nr: 7, tittel: 'ANDRE BESTEMMELSER',
                innhold: <Paragraf tekst={kontrakt.andrebestemmelser} />,
              }] : []),
            ].map((s) => (
              <div key={s.nr} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 'bold', fontSize: 13, color: '#162840', borderBottom: '1.5px solid #162840', paddingBottom: 4, marginBottom: 10, fontFamily: 'Arial, sans-serif' }}>
                  § {s.nr}  {s.tittel}
                </div>
                {s.innhold}
              </div>
            ))}

            {/* Signaturer */}
            <div style={{ borderTop: '2px solid #162840', marginTop: 24, paddingTop: 20 }}>
              <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 6, color: '#162840' }}>Signaturer</div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 20 }}>
                Begge parter bekrefter å ha lest og forstått kontraktens innhold. Kontrakten er bindende ved signering.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { tittel: 'UTLEIER', navn: u.navn || '—' },
                  { tittel: 'LEIETAKER', navn: kontrakt.leietakerNavn || '—' },
                ].map((p, i) => (
                  <div key={i} style={{ border: '1px solid #d4d8e0', borderRadius: 6, padding: '14px 16px', background: '#f8f9fb' }}>
                    <div style={{ fontSize: 9, fontWeight: 'bold', color: '#888', letterSpacing: '0.08em', marginBottom: 6 }}>{p.tittel}</div>
                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 20 }}>{p.navn}</div>
                    <div style={{ borderTop: '1px solid #bbb', paddingTop: 6, fontSize: 11, color: '#888' }}>Underskrift</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Dato: _______________</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ borderTop: '1px solid #d4d8e0', marginTop: 28, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#999' }}>
              <span>EiendomsPRO.no  ·  Leiekontrakt</span>
              <span>{datoFmt(new Date().toISOString())}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRad({ etikett, verdi, bold }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12 }}>
      <span style={{ color: '#777', minWidth: 140, flexShrink: 0 }}>{etikett}</span>
      <span style={{ fontWeight: bold ? 'bold' : 'normal' }}>{verdi || '—'}</span>
    </div>
  );
}
function Paragraf({ tekst }) {
  return <p style={{ fontSize: 11.5, color: '#444', lineHeight: 1.6, margin: '6px 0' }}>{tekst}</p>;
}

// ─── Hoved-komponent ─────────────────────────────────────────────────────────
export default function KontraktSkjema() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { kontrakter, leieobjekter, bygg, utleiere, protokoller = [], addKontrakt, updateKontrakt } = useApp();

  const existing = id ? kontrakter.find((k) => k.id === id) : null;
  const [form, setForm] = useState(() => {
    const base = existing ? { ...defaultForm, ...existing } : { ...defaultForm };
    if (!base.utleierNavn && utleiere.length > 0) base.utleierNavn = utleiere[0].id;
    return base;
  });
  const [apne, setApne] = useState([1, 2]);
  const [visPreview, setVisPreview] = useState(false);
  const [feil, setFeil] = useState('');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const toggle = (field) => () => setForm((f) => ({ ...f, [field]: !f[field] }));
  const toggleSeksjon = (nr) => setApne((prev) => prev.includes(nr) ? prev.filter((n) => n !== nr) : [...prev, nr]);
  const erOpen = (nr) => apne.includes(nr);

  const leieobjektOptions = leieobjekter.map((l) => {
    const b = bygg.find((b) => b.id === l.byggId);
    const adresse = b ? `${b.gatenavn} ${b.gatenummer}` : 'Ukjent bygg';
    return { value: l.id, label: `${adresse}${l.betegnelse ? ` · ${l.betegnelse}` : ''}` };
  });

  const valgtObj = leieobjekter.find((l) => l.id === form.leieobjektId);
  const valgtBygg = valgtObj ? bygg.find((b) => b.id === valgtObj.byggId) : null;
  const valgtUtleier = utleiere.find((u) => u.id === form.utleierNavn);

  const handleLeieobjektValg = (e) => {
    const objId = e.target.value;
    const obj = leieobjekter.find((l) => l.id === objId);
    setForm((f) => ({
      ...f,
      leieobjektId: objId,
      maanedligLeie: obj?.forventetLeie ? String(obj.forventetLeie) : f.maanedligLeie,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.leietakerNavn) { setFeil('Fyll inn leietakers navn (seksjon 1).'); setApne((a) => a.includes(1) ? a : [...a, 1]); return; }
    if (!form.leieobjektId) { setFeil('Velg et leieobjekt (seksjon 2).'); setApne((a) => a.includes(2) ? a : [...a, 2]); return; }
    if (!form.startdato) { setFeil('Fyll inn startdato (seksjon 4).'); setApne((a) => a.includes(4) ? a : [...a, 4]); return; }
    setFeil('');
    try {
      if (existing) await updateKontrakt(id, form);
      else await addKontrakt(form);
      navigate('/kontrakter');
    } catch (err) {
      setFeil(err.message || 'Kunne ikke lagre kontrakten. Prøv igjen.');
    }
  };

  async function lastNedPDF() {
    await genererKontraktPDF({
      kontrakt: { ...form, id },
      leieobjekt: valgtObj,
      bygg: valgtBygg,
      utleier: valgtUtleier,
    });
  }

  const ferdig = {
    1: !!(form.leietakerNavn && form.leietakerEpost),
    2: !!form.leieobjektId,
    3: !!(form.maanedligLeie && form.kontonummer),
    4: !!(form.startdato && (form.kontraktstype === 'tidsubestemt' || form.sluttdato)),
    5: form.sikkerhetsType === 'ingen' || !!form.depositum,
    6: true,
  };

  return (
    <div className="animate-fade-up">
      {visPreview && (
        <KontraktPreviewModal
          kontrakt={form}
          leieobjekt={valgtObj}
          bygg={valgtBygg}
          utleier={valgtUtleier}
          onLukk={() => setVisPreview(false)}
        />
      )}

      <form onSubmit={handleSubmit}>
        {/* Header */}
        <div className="flex items-start gap-4 flex-wrap mb-6">
          <div className="flex items-start gap-3 flex-1 min-w-[220px]">
            <button type="button" onClick={() => navigate('/kontrakter')}
              className="mt-1 p-1.5 text-muted hover:text-ink hover:bg-line-soft rounded-lg transition-all cursor-pointer">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="m-0 text-[clamp(24px,3vw,30px)] font-extrabold tracking-[-0.025em] text-ink">
                {existing ? form.leietakerNavn || 'Leiekontrakt' : 'Ny leiekontrakt'}
              </h1>
              <p className="mt-1.5 mb-0 text-[14.5px] font-medium text-muted">
                {valgtBygg ? `${valgtBygg.gatenavn} ${valgtBygg.gatenummer}` : 'Fyll inn kontraktsinformasjon'}
              </p>
            </div>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            <Button type="button" variant="secondary" onClick={() => navigate('/kontrakter')}>Avbryt</Button>
            <Button type="button" variant="ghost" onClick={() => setVisPreview(true)}>
              <Eye size={14} /> Forhåndsvis
            </Button>
            {existing && (
              <Button type="button" variant="ghost" onClick={lastNedPDF}>
                <Download size={14} /> Last ned PDF
              </Button>
            )}
            <Button type="submit" variant="primary">
              {existing ? 'Lagre endringer' : 'Opprett kontrakt'}
            </Button>
          </div>
        </div>

        {/* Navigasjonstabs */}
        {existing && (() => {
          const innProtokoll = protokoller.find((p) => p.kontraktId === id && p.type === 'innflytting');
          const utProtokoll = protokoller.find((p) => p.kontraktId === id && p.type === 'utflytting');
          return (
            <div className="flex items-center gap-1 mb-6 border-b border-line pb-0 overflow-x-auto">
              {[
                { label: 'Leiekontrakt', ikon: FileText, aktiv: true, onClick: null },
                {
                  label: 'Innflytting',
                  ikon: ClipboardList,
                  aktiv: false,
                  ferdig: !!innProtokoll,
                  onClick: () => innProtokoll
                    ? navigate(`/protokoll/${innProtokoll.id}`)
                    : navigate(`/protokoll/ny?kontraktId=${id}&type=innflytting`),
                },
                {
                  label: 'Utflytting',
                  ikon: ClipboardList,
                  aktiv: false,
                  ferdig: !!utProtokoll,
                  onClick: () => utProtokoll
                    ? navigate(`/protokoll/${utProtokoll.id}`)
                    : navigate(`/protokoll/ny?kontraktId=${id}&type=utflytting`),
                },
              ].map(({ label, ikon: Ikon, aktiv, ferdig: tabFerdig, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick || undefined}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer
                    ${aktiv
                      ? 'border-brand text-ink'
                      : tabFerdig
                        ? 'border-transparent text-brand-ink hover:text-brand-hover'
                        : 'border-transparent text-muted-2 hover:text-ink-2'
                    } ${!onClick ? 'cursor-default' : ''}`}
                >
                  <Ikon size={14} />
                  {label}
                  {tabFerdig && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
                </button>
              ))}
            </div>
          );
        })()}

        <div className="grid lg:grid-cols-[1fr_320px] gap-[18px] items-start">
          {/* Skjema */}
          <div className="bg-surface border border-line rounded-[20px] divide-y divide-line-soft overflow-hidden">

            {/* Utleier */}
            <div className="px-5 py-4 bg-sand flex items-center gap-4 flex-wrap">
              <span className="text-[11px] font-bold text-muted-2 uppercase tracking-widest whitespace-nowrap">Utleier</span>
              <div className="flex-1 min-w-48">
                <Select
                  value={form.utleierNavn}
                  onChange={set('utleierNavn')}
                  options={utleiere.map((u) => ({ value: u.id, label: u.navn + (u.orgnummer ? ` (${u.orgnummer})` : '') }))}
                  placeholder="Velg utleier..."
                />
              </div>
              {utleiere.length === 0 && (
                <a href="/innstillinger" className="text-xs font-bold text-brand-ink hover:underline">
                  Legg til utleier i Innstillinger →
                </a>
              )}
            </div>

            {/* === 1. LEIETAKER === */}
            <div>
              <SeksjonHeader nr={1} tittel="Leietaker" open={erOpen(1)} onClick={() => toggleSeksjon(1)} ferdig={ferdig[1]} />
              {erOpen(1) && (
                <>
                  <Divider />
                  <FeltRad>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Fullt navn" value={form.leietakerNavn} onChange={set('leietakerNavn')} required placeholder="Ola Nordmann" />
                      <Input label="Fødselsdato" type="date" value={form.leietakerFodselsdato} onChange={set('leietakerFodselsdato')} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="E-post" type="email" value={form.leietakerEpost} onChange={set('leietakerEpost')} placeholder="ola@example.no" />
                      <Input label="Telefon" type="tel" value={form.leietakerTlf} onChange={set('leietakerTlf')} placeholder="+47 999 99 999" />
                    </div>
                  </FeltRad>
                </>
              )}
            </div>

            {/* === 2. LEIEOBJEKT === */}
            <div>
              <SeksjonHeader nr={2} tittel="Leieobjekt" open={erOpen(2)} onClick={() => toggleSeksjon(2)} ferdig={ferdig[2]} />
              {erOpen(2) && (
                <>
                  <Divider />
                  <FeltRad>
                    <Select
                      label="Velg leieobjekt"
                      value={form.leieobjektId}
                      onChange={handleLeieobjektValg}
                      options={leieobjektOptions}
                      required
                      placeholder={leieobjekter.length === 0 ? 'Ingen leieobjekter registrert' : 'Velg leieobjekt...'}
                    />
                    {valgtObj && valgtBygg && (
                      <div className="bg-sand border border-line rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
                        <div><div className="text-muted-2 font-semibold mb-0.5">Adresse</div><div className="text-ink font-bold">{valgtBygg.gatenavn} {valgtBygg.gatenummer}</div></div>
                        {valgtObj.betegnelse && <div><div className="text-muted-2 font-semibold mb-0.5">Betegnelse</div><div className="text-ink font-bold">{valgtObj.betegnelse}</div></div>}
                        {valgtObj.areal && <div><div className="text-muted-2 font-semibold mb-0.5">Areal</div><div className="text-ink font-bold num">{valgtObj.areal} m²</div></div>}
                        {valgtObj.forventetLeie && <div><div className="text-muted-2 font-semibold mb-0.5">Forventet leie</div><div className="text-brand-ink font-bold num">{formatKr(valgtObj.forventetLeie)}/mnd</div></div>}
                      </div>
                    )}
                  </FeltRad>
                </>
              )}
            </div>

            {/* === 3. LEIE === */}
            <div>
              <SeksjonHeader nr={3} tittel="Leie" open={erOpen(3)} onClick={() => toggleSeksjon(3)} ferdig={ferdig[3]} />
              {erOpen(3) && (
                <>
                  <Divider />
                  <FeltRad>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Månedlig leie" type="number" value={form.maanedligLeie} onChange={set('maanedligLeie')} suffix="kr" required />
                      <Select
                        label="Betales den"
                        value={form.betalingsdato}
                        onChange={set('betalingsdato')}
                        options={[
                          { value: '1', label: '1. i måneden' },
                          { value: '15', label: '15. i måneden' },
                          { value: '20', label: '20. i måneden' },
                          { value: '25', label: '25. i måneden' },
                        ]}
                      />
                    </div>
                    <Input label="Kontonummer for innbetaling" value={form.kontonummer} onChange={set('kontonummer')} placeholder="1234.56.78901" />

                    <div>
                      <div className="text-[12.5px] font-bold text-muted mb-3">Inkludert i leien</div>
                      <div className="grid grid-cols-2 gap-3">
                        <Toggle checked={form.inkludererStrom} onChange={toggle('inkludererStrom')} label="Strøm og oppvarming" />
                        <Toggle checked={form.inkludererVann} onChange={toggle('inkludererVann')} label="Vann og avløp" />
                        <Toggle checked={form.inkludererInternett} onChange={toggle('inkludererInternett')} label="Internett" />
                        <Toggle checked={form.inkludererTV} onChange={toggle('inkludererTV')} label="TV-abonnement" />
                        <div className="col-span-2">
                          <Toggle checked={form.inkludererAnnet} onChange={toggle('inkludererAnnet')} label="Annet" />
                          {form.inkludererAnnet && (
                            <Input
                              value={form.annenInkludert}
                              onChange={set('annenInkludert')}
                              placeholder="Beskriv hva som er inkludert..."
                              className="mt-2"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <Toggle checked={form.indeksregulering} onChange={toggle('indeksregulering')} label="Automatisk KPI-indeksregulering (1 gang per år)" />
                    {form.indeksregulering && (
                      <div className="mt-3 rounded-xl border border-mint-line bg-mint-soft p-4 space-y-3">
                        <p className="text-xs leading-relaxed font-medium text-muted">
                          <strong className="text-ink font-bold">Slik fungerer varslingen:</strong> EiendomsPRO varsler deg når leien kan reguleres (tidligst 12 måneder etter siste fastsettelse). Ny leie beregnes automatisk på siste publiserte KPI fra SSB. Leietaker får skriftlig varsel på e-post{form.leietakerTlf ? ' og SMS' : ''} minst én måned før økningen trer i kraft, og du får bekreftelse på når det er varslet og hva ny leie blir.
                        </p>
                        <Toggle checked={form.elektroniskKommunikasjon} onChange={toggle('elektroniskKommunikasjon')} label="Leietaker samtykker til elektronisk varsling (e-post/SMS)" />
                        {!form.elektroniskKommunikasjon && <p className="text-xs font-semibold text-amber">Uten samtykke må varsel sendes på papir for å være gyldig som skriftlig melding.</p>}
                        {form.elektroniskKommunikasjon && !form.leietakerTlf && <p className="text-xs font-medium text-muted-2">Tips: legg inn leietakers telefon i seksjon 1 for å sende SMS-varsel i tillegg til e-post.</p>}
                      </div>
                    )}
                  </FeltRad>
                </>
              )}
            </div>

            {/* === 4. VARIGHET === */}
            <div>
              <SeksjonHeader nr={4} tittel="Varighet" open={erOpen(4)} onClick={() => toggleSeksjon(4)} ferdig={ferdig[4]} />
              {erOpen(4) && (
                <>
                  <Divider />
                  <FeltRad>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: 'tidsubestemt', label: 'Tidsubestemt', sub: 'Løper til oppsigelse' },
                        { value: 'tidsbestemt', label: 'Tidsbestemt', sub: 'Med fastsatt sluttdato' },
                      ].map((opt) => {
                        const aktiv = form.kontraktstype === opt.value;
                        return (
                          <button key={opt.value} type="button"
                            onClick={() => setForm((f) => ({ ...f, kontraktstype: opt.value }))}
                            className={`p-3.5 rounded-xl border-[1.5px] text-sm font-bold transition-all cursor-pointer text-left
                              ${aktiv ? 'border-brand bg-mint-soft text-ink' : 'border-line text-muted hover:border-line-input'}`}>
                            <div className="font-bold mb-1">{opt.label}</div>
                            <div className="text-xs font-medium text-muted-2">{opt.sub}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="Startdato" type="date" value={form.startdato} onChange={set('startdato')} required />
                      <Input
                        label={form.kontraktstype === 'tidsubestemt' ? 'Sluttdato (valgfritt)' : 'Sluttdato'}
                        type="date" value={form.sluttdato} onChange={set('sluttdato')}
                        required={form.kontraktstype === 'tidsbestemt'}
                      />
                    </div>
                    <div>
                      <Select
                        label="Oppsigelsestid"
                        value={form.oppsigelsestid}
                        onChange={set('oppsigelsestid')}
                        options={[
                          { value: '1', label: '1 måned' },
                          { value: '2', label: '2 måneder' },
                          { value: '3', label: '3 måneder (standard)' },
                          { value: '6', label: '6 måneder' },
                        ]}
                      />
                      <p className="text-xs font-medium text-muted-2 mt-1.5">Regnes fra 1. i måneden etter oppsigelsen</p>
                    </div>
                  </FeltRad>
                </>
              )}
            </div>

            {/* === 5. SIKKERHET === */}
            <div>
              <SeksjonHeader nr={5} tittel="Sikkerhet" open={erOpen(5)} onClick={() => toggleSeksjon(5)} ferdig={ferdig[5]} />
              {erOpen(5) && (
                <>
                  <Divider />
                  <FeltRad>
                    <div>
                      <div className="text-[12.5px] font-bold text-muted mb-3">Type sikkerhet</div>
                      <div className="space-y-2">
                        <RadioKort value="depositumskonto" current={form.sikkerhetsType}
                          onChange={(v) => setForm((f) => ({ ...f, sikkerhetsType: v }))}
                          label="Depositumskonto" sub="Beløpet settes inn på sperret bankkonto i leietakers navn" />
                        <RadioKort value="garanti" current={form.sikkerhetsType}
                          onChange={(v) => setForm((f) => ({ ...f, sikkerhetsType: v }))}
                          label="Garanti fra forsikringsselskap" sub="Forsikringsbasert garantibevis (f.eks. Tryg, If, Fremtind)" />
                        <RadioKort value="ingen" current={form.sikkerhetsType}
                          onChange={(v) => setForm((f) => ({ ...f, sikkerhetsType: v }))}
                          label="Ingen sikkerhet" sub="Partene avtaler at det ikke stilles sikkerhet" />
                      </div>
                    </div>

                    {form.sikkerhetsType !== 'ingen' && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Beløp" type="number" value={form.depositum} onChange={set('depositum')} suffix="kr"
                          placeholder={form.maanedligLeie ? String(Number(form.maanedligLeie) * 3) : '0'} />
                        <Input label="Betalingsfrist" type="date" value={form.depositumFrist} onChange={set('depositumFrist')} />
                      </div>
                    )}

                    {form.sikkerhetsType === 'garanti' && (
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Navn på garantiutsteder" value={form.garantiUtsteder} onChange={set('garantiUtsteder')} placeholder="f.eks. Tryg Forsikring" />
                        <Input label="Garantikostnad" type="number" value={form.garantiKostnad} onChange={set('garantiKostnad')} suffix="kr" placeholder="0" />
                      </div>
                    )}

                    {form.sikkerhetsType === 'depositumskonto' && form.maanedligLeie && (
                      <p className="text-xs font-medium text-muted-2">
                        Maks tillatt: {formatKr(Number(form.maanedligLeie) * 6)} (6 mnd leie, jf. husleieloven § 3-5)
                      </p>
                    )}
                  </FeltRad>
                </>
              )}
            </div>

            {/* === 6. TILLEGGSVILKÅR === */}
            <div>
              <SeksjonHeader nr={6} tittel="Tilleggsvilkår og ordensregler" open={erOpen(6)} onClick={() => toggleSeksjon(6)} ferdig={ferdig[6]} />
              {erOpen(6) && (
                <>
                  <Divider />
                  <FeltRad>
                    <div>
                      <div className="text-[12.5px] font-bold text-muted mb-3">Ordensregler</div>
                      <div className="space-y-3">
                        <Toggle checked={form.royking} onChange={toggle('royking')} label="Røyking tillatt innendørs" />
                        <Toggle checked={form.husdyr} onChange={toggle('husdyr')} label="Husdyr tillatt" />
                        <Toggle checked={form.husordensregler} onChange={toggle('husordensregler')} label="Husordensregler vedlegges kontrakten" />
                      </div>
                    </div>
                    <Textarea
                      label="Andre bestemmelser"
                      value={form.andrebestemmelser}
                      onChange={set('andrebestemmelser')}
                      placeholder="Spesielle avtaler, parkering, vaskerom, nøkler, WiFi, særskilte vilkår..."
                      rows={4}
                    />
                  </FeltRad>
                </>
              )}
            </div>
          </div>

          {/* Høyre: oppsummering */}
          <div className="bg-surface border border-line rounded-[20px] p-[22px] space-y-4 sticky top-6">
            <div className="text-[11px] font-bold text-muted-2 uppercase tracking-widest">Oppsummering</div>

            <div className="space-y-2.5">
              {SEKSJONER.map((s) => (
                <div key={s.nr} className="flex items-center justify-between text-sm">
                  <span className={`font-semibold ${ferdig[s.nr] ? 'text-ink' : 'text-muted-2'}`}>{s.nr}. {s.tittel}</span>
                  {ferdig[s.nr]
                    ? <Check size={14} className="text-brand-ink" />
                    : <span className="text-xs font-semibold text-faint">Ikke fylt</span>}
                </div>
              ))}
            </div>

            {(form.leietakerNavn || form.maanedligLeie || form.startdato) && (
              <>
                <div className="h-px bg-line-soft" />
                <div className="space-y-3 text-sm">
                  {form.leietakerNavn && <div><div className="text-xs font-semibold text-muted-2">Leietaker</div><div className="text-ink font-bold mt-0.5">{form.leietakerNavn}</div></div>}
                  {form.maanedligLeie && <div><div className="text-xs font-semibold text-muted-2">Månedlig leie</div><div className="text-brand-ink font-bold num mt-0.5">{formatKr(form.maanedligLeie)}</div></div>}
                  {form.sikkerhetsType !== 'ingen' && form.depositum && <div><div className="text-xs font-semibold text-muted-2">Depositum</div><div className="text-ink font-bold num mt-0.5">{formatKr(form.depositum)}</div></div>}
                  {form.startdato && <div><div className="text-xs font-semibold text-muted-2">Startdato</div><div className="text-ink font-bold mt-0.5">{datoLang(form.startdato)}</div></div>}
                  {form.kontraktstype && <div><div className="text-xs font-semibold text-muted-2">Type</div><div className="mt-1"><Pill tone={form.kontraktstype === 'tidsubestemt' ? 'neutral' : 'mint'}>{form.kontraktstype === 'tidsubestemt' ? 'Tidsubestemt' : 'Tidsbestemt'}</Pill></div></div>}
                </div>
              </>
            )}

            <div className="h-px bg-line-soft" />

            {feil && (
              <div className="flex items-center gap-2 text-xs font-semibold text-danger bg-danger/[0.06] border border-danger/25 rounded-xl px-3 py-2.5">
                {feil}
              </div>
            )}

            <div className="space-y-2">
              <Button type="button" variant="ghost" className="w-full justify-center" onClick={() => setVisPreview(true)}>
                <Eye size={14} /> Forhåndsvis kontrakt
              </Button>
              <Button type="submit" variant="primary" className="w-full justify-center">
                {existing ? 'Lagre endringer' : 'Opprett kontrakt'}
              </Button>
              {existing && (
                <Button type="button" variant="secondary" className="w-full justify-center" onClick={lastNedPDF}>
                  <Download size={14} /> Last ned PDF
                </Button>
              )}
            </div>

          </div>
        </div>
      </form>
    </div>
  );
}
