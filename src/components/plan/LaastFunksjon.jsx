import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { Button } from '../ui/Button';

/**
 * Viser innholdet sitt gråtonet med et «Lås opp»-overlegg når brukerens plan ikke
 * gir tilgang til `feature`. Innholdet er SYNLIG (ikke skjult) — brukeren ser hva de
 * går glipp av (punkt B). Server håndhever uansett; dette er kun UX.
 */
export function LaastFunksjon({
  feature,
  tittel = 'Lås opp denne funksjonen',
  beskrivelse,
  plan = 'Privat eller Pro',
  children,
}) {
  const { canUse } = usePlan();
  const navigate = useNavigate();
  if (canUse(feature)) return children;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none blur-[2.5px] opacity-55" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="max-w-sm w-full rounded-2xl border border-line bg-surface/95 backdrop-blur shadow-soft p-5 text-center">
          <div className="w-10 h-10 rounded-xl bg-mint text-brand flex items-center justify-center mx-auto mb-3">
            <Lock size={18} />
          </div>
          <div className="text-[15px] font-extrabold text-ink mb-1">{tittel}</div>
          {beskrivelse && <p className="text-[13px] text-muted leading-relaxed mb-3.5">{beskrivelse}</p>}
          <Button onClick={() => navigate('/priser')} size="md" className="w-full">
            Lås opp med {plan}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Liten inline-pille for låste valg (f.eks. AS-modus-bryter). */
export function LaastPille({ tekst = 'Pro' }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate('/priser')}
      className="inline-flex items-center gap-1 rounded-full bg-mint text-brand-ink text-[11px] font-extrabold px-2 py-0.5 cursor-pointer hover:bg-[#CDEBDD]"
    >
      <Lock size={11} /> {tekst}
    </button>
  );
}
