import { useNavigate } from 'react-router-dom';
import { Sparkles, RefreshCw } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

/**
 * In-app prøveteller «X dager igjen av Pro-prøven» (punkt D), og ved utløp/avslutning
 * en «Lås opp igjen»-melding som forsikrer om at dataene er bevart (punkt L).
 */
export function TrialBanner() {
  const { abonnement, trialDagerIgjen, plan } = usePlan();
  const navigate = useNavigate();
  if (!abonnement) return null;

  // Aktiv prøveperiode
  if (abonnement.status === 'prøve' && trialDagerIgjen > 0) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-line bg-mint/60 px-4 py-3">
        <Sparkles size={16} className="text-brand shrink-0" />
        <div className="flex-1 text-sm font-semibold text-ink-2">
          Du har <strong>{trialDagerIgjen} {trialDagerIgjen === 1 ? 'dag' : 'dager'}</strong> igjen av Pro-prøven.
          {trialDagerIgjen <= 3 && ' Velg årlig og få 2 måneder gratis.'}
        </div>
        <button onClick={() => navigate('/priser')}
          className="text-xs font-extrabold text-brand-ink hover:underline cursor-pointer shrink-0">
          Velg plan
        </button>
      </div>
    );
  }

  // Degradert til Gratis (prøve utløpt / abonnement avsluttet) — data er bevart.
  const avsluttet = plan === 'gratis' && ['prøve', 'forfalt', 'kansellert'].includes(abonnement.status);
  if (avsluttet) {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-amber-line bg-amber-soft px-4 py-3">
        <RefreshCw size={16} className="text-amber shrink-0" />
        <div className="flex-1 text-sm font-medium text-[#7a611c]">
          Pro-tilgangen er avsluttet. Alt du har lagt inn er trygt lagret — meld deg inn igjen, så er alt tilbake der du slapp.
        </div>
        <button onClick={() => navigate('/priser')}
          className="text-xs font-extrabold text-amber hover:underline cursor-pointer shrink-0">
          Lås opp igjen
        </button>
      </div>
    );
  }

  // «Over grensen» (Pro→Privat med for mange objekter)
  if (abonnement.status === 'over_grensen') {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-amber-line bg-amber-soft px-4 py-3">
        <RefreshCw size={16} className="text-amber shrink-0" />
        <div className="flex-1 text-sm font-medium text-[#7a611c]">
          Du har flere leieobjekter enn planen tillater. Alt er bevart og lesbart, men du kan ikke legge til nye før du oppgraderer til Pro.
        </div>
        <button onClick={() => navigate('/priser')}
          className="text-xs font-extrabold text-amber hover:underline cursor-pointer shrink-0">
          Oppgrader
        </button>
      </div>
    );
  }
  return null;
}
