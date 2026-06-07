import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

/**
 * Gjenbrukbar bekreftelsesdialog — erstatter window.confirm()
 *
 * Bruk:
 *   const [slett, setSlett] = useState(null);
 *   <BekreftModal
 *     åpen={!!slett}
 *     tittel="Slette kontrakten?"
 *     tekst="Dette kan ikke angres."
 *     bekreftLabel="Ja, slett"
 *     onBekreft={() => { deleteKontrakt(slett); setSlett(null); }}
 *     onAvbryt={() => setSlett(null)}
 *   />
 */
export function BekreftModal({
  åpen,
  tittel = 'Er du sikker?',
  tekst,
  bekreftLabel = 'Bekreft',
  avbrytLabel = 'Avbryt',
  fare = true,
  onBekreft,
  onAvbryt,
}) {
  if (!åpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onAvbryt}
    >
      {/* Bakgrunn */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-[#FFFFFF] border border-[#DCDAD2] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ikon */}
        {fare && (
          <div className="w-10 h-10 bg-[#DC2626]/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle size={18} className="text-[#DC2626]" />
          </div>
        )}

        <h3 className="text-base font-semibold text-[#1A1B1E] mb-2">{tittel}</h3>
        {tekst && <p className="text-sm text-[#65696F] leading-relaxed mb-6">{tekst}</p>}
        {!tekst && <div className="mb-6" />}

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 justify-center" onClick={onAvbryt}>
            {avbrytLabel}
          </Button>
          <Button
            variant={fare ? 'danger' : 'primary'}
            className="flex-1 justify-center"
            onClick={onBekreft}
          >
            {bekreftLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
