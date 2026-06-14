import { useNavigate } from 'react-router-dom';
import { Gift, ArrowRight } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';

/**
 * Diskret verve-oppfordring som vises etter at brukeren har opplevd verdi (f.eks.
 * etter en lønnsomhetsanalyse). Kun for betalende, som har en aktiv vervelenke (I2).
 */
export function VerveOppfordring() {
  const navigate = useNavigate();
  const { erBetalende } = usePlan();
  if (!erBetalende) return null;
  return (
    <button onClick={() => navigate('/verv')}
      className="w-full flex items-center gap-3 rounded-2xl border border-line bg-mint/50 px-5 py-4 text-left hover:bg-mint/70 transition cursor-pointer">
      <span className="w-9 h-9 rounded-xl bg-surface text-brand flex items-center justify-center shrink-0"><Gift size={17} /></span>
      <span className="flex-1">
        <span className="block text-sm font-extrabold text-ink">Liker du EiendomsPRO? Verv en venn</span>
        <span className="block text-[13px] text-muted-2">Få 2 måneder gratis for hver venn som blir kunde – vennen får 1 måned gratis.</span>
      </span>
      <ArrowRight size={16} className="text-brand-ink shrink-0" />
    </button>
  );
}
