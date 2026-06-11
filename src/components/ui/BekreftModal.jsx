import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { IconTile } from './kit';

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
      <div className="absolute inset-0 bg-[#141A17]/45 backdrop-blur-sm" />

      {/* Modal — matcher restylet Modal: hvitt kort, mykt skille, varm radius */}
      <div
        className="relative w-full max-w-sm bg-surface border border-line rounded-3xl shadow-soft p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ikon */}
        {fare && (
          <IconTile tone="amber" size={44} radius={14} className="mb-4 bg-danger/10 text-danger">
            <AlertTriangle size={20} />
          </IconTile>
        )}

        <h2 className="text-base font-extrabold tracking-[-0.01em] text-ink mb-2">{tittel}</h2>
        {tekst && <p className="text-sm font-medium text-muted leading-relaxed mb-6">{tekst}</p>}
        {!tekst && <div className="mb-6" />}

        <div className="flex gap-2.5">
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
