import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox, Building2, ArrowLeftRight, MapPin,
  Wrench, MessageSquare, FileText, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Photo, IconTile } from '../../components/ui/kit';

/**
 * Innlogget leietakers oversikt. Foreløpig minimal: innloggede leietakere er
 * ennå ikke koblet til konkrete leieforhold (kontrakter er ikke migrert/koblet
 * til bruker_id). Når den koblingen er på plass vises leie, betalinger,
 * meldinger og dokumenter her (jf. den token-baserte LeietakerPortal).
 */
export default function LeietakerHjem() {
  const { bruker, roller, byttModus } = useAuth();
  const navigate = useNavigate();
  const [jobber, setJobber] = useState(false);
  const fornavn = bruker?.fulltNavn?.split(' ')[0] || 'leietaker';
  const harUtleier = roller.includes('utleier');

  async function tilUtleier() {
    setJobber(true);
    const r = await byttModus('utleier');
    setJobber(false);
    if (r.ok) navigate('/app');
  }

  // Forhåndsvisning av hva som kommer når leieforhold er koblet til kontoen.
  const kommer = [
    { ikon: Wrench, tittel: 'Meld inn et problem', sub: 'Noe som lekker, knirker eller ikke virker' },
    { ikon: MessageSquare, tittel: 'Kontakt utleier', sub: 'Still et spørsmål eller gi beskjed' },
    { ikon: FileText, tittel: 'Dokumentene dine', sub: 'Kontrakt, protokoll og kvitteringer' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Hero — velkommen hjem */}
      <div className="relative overflow-hidden rounded-[24px] min-h-[200px] flex items-end">
        <Photo src={null} alt="Hjemmet ditt" className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(18,26,23,0.74) 0%, rgba(18,26,23,0.18) 55%, rgba(18,26,23,0) 100%)' }} />
        <div className="relative w-full p-[clamp(20px,4vw,32px)]">
          <h1 className="m-0 mb-1.5 text-[clamp(24px,3.6vw,34px)] font-extrabold tracking-[-0.025em] text-white">
            Velkommen hjem, {fornavn}
          </h1>
          <div className="flex items-center gap-1.5 text-[14px] font-semibold text-white/85">
            <MapPin size={14} className="shrink-0" />
            <span>Din oversikt som leietaker</span>
          </div>
        </div>
      </div>

      {/* Ingen aktive leieforhold ennå */}
      <div className="bg-surface border border-line rounded-[20px] p-8 text-center">
        <IconTile tone="mint" size={52} radius={16} className="mx-auto mb-4"><Inbox size={24} /></IconTile>
        <h2 className="m-0 mb-2 text-base font-extrabold tracking-[-0.01em] text-ink">Ingen aktive leieforhold ennå</h2>
        <p className="m-0 text-[14.5px] font-medium text-muted max-w-md mx-auto leading-relaxed">
          Når utleieren din kobler deg til et leieforhold, finner du leie, betalinger,
          meldinger og dokumenter her.
        </p>
      </div>

      {/* Forhåndsvisning: hva trenger du? */}
      <div className="bg-surface border border-line rounded-[20px] p-5">
        <h2 className="m-0 mb-3 text-base font-extrabold tracking-[-0.01em] text-ink">Hva du kan gjøre her</h2>
        <div className="flex flex-col gap-2.5">
          {kommer.map(({ ikon: Ikon, tittel, sub }) => (
            <div key={tittel}
              className="flex items-center gap-3.5 px-3.5 py-3.5 rounded-[13px] border border-line-soft bg-surface-2 opacity-70">
              <IconTile tone="mint" size={38} radius={12}><Ikon size={17} /></IconTile>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-ink">{tittel}</div>
                <div className="text-xs font-semibold text-muted-2 mt-0.5">{sub}</div>
              </div>
              <ChevronRight size={15} className="text-faint-2 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Bli/bytt til utleier */}
      <div className="bg-sand border border-line rounded-[16px] p-5 flex items-center gap-4 flex-wrap">
        <IconTile tone="mint" size={40} radius={12}><Building2 size={18} /></IconTile>
        <div className="flex-1 min-w-[200px]">
          <div className="text-sm font-bold text-ink">Skal du leie ut eiendom?</div>
          <div className="text-[12.5px] font-medium text-muted-2 mt-0.5">
            {harUtleier ? 'Bytt til utleier-modus for å forvalte eiendommene dine.' : 'Kom i gang som utleier — forvalt bygg, leieobjekter og kontrakter.'}
          </div>
        </div>
        <Button onClick={tilUtleier} disabled={jobber}>
          <ArrowLeftRight size={14} /> {jobber ? 'Bytter…' : harUtleier ? 'Bytt til utleier' : 'Bli utleier'}
        </Button>
      </div>
    </div>
  );
}
