import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Inbox, Building2, ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-[#1A1B1E]">Hei, {fornavn} 👋</h1>
        <p className="text-sm text-[#65696F] mt-1">Din oversikt som leietaker.</p>
      </div>

      <div className="rounded-2xl bg-white border border-[#E9E8E2] p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-[#E9E8E2] flex items-center justify-center mx-auto mb-4">
          <Inbox size={22} className="text-[#7A7D83]" />
        </div>
        <h2 className="text-base font-semibold text-[#1A1B1E] mb-2">Ingen aktive leieforhold ennå</h2>
        <p className="text-sm text-[#65696F] max-w-md mx-auto leading-relaxed">
          Når utleieren din kobler deg til et leieforhold, finner du leie, betalinger,
          meldinger og dokumenter her.
        </p>
      </div>

      <div className="rounded-xl bg-[#FAF9F6] border border-[#E9E8E2] p-5 mt-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-[#16284A]/[0.07] flex items-center justify-center shrink-0">
          <Building2 size={18} className="text-[#16284A]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#1A1B1E]">Skal du leie ut eiendom?</div>
          <div className="text-xs text-[#65696F] mt-0.5">
            {harUtleier ? 'Bytt til utleier-modus for å forvalte eiendommene dine.' : 'Kom i gang som utleier — forvalt bygg, leieobjekter og kontrakter.'}
          </div>
        </div>
        <button onClick={tilUtleier} disabled={jobber}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-[#16284A] text-white hover:bg-[#1E3A5F] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
          <ArrowLeftRight size={14} /> {jobber ? 'Bytter…' : harUtleier ? 'Bytt til utleier' : 'Bli utleier'}
        </button>
      </div>
    </div>
  );
}
