import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { IconTile } from '../components/ui/kit';
import { Button } from '../components/ui/Button';

/**
 * 404-side. Brukes både i app-layouten (catch-all for innloggede) og admin-
 * layouten. Erstatter den tidligere stille redirecten slik at brukeren vet at
 * adressen ikke finnes og får en tydelig vei tilbake.
 */
export default function IkkeFunnet({ hjemTil = '/', hjemLabel = 'Til forsiden' }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <IconTile tone="mint" size={64} radius={20} className="mb-6">
        <Compass size={30} />
      </IconTile>
      <div className="text-[13px] font-extrabold text-faint uppercase tracking-[0.12em] mb-2">Feil 404</div>
      <h1 className="text-2xl font-extrabold text-ink tracking-[-0.01em] mb-2">Siden finnes ikke</h1>
      <p className="max-w-sm text-sm text-muted mb-7">
        Adressen du prøvde å åpne finnes ikke, eller har blitt flyttet. Sjekk lenken,
        eller gå tilbake.
      </p>
      <Link to={hjemTil}>
        <Button variant="primary"><ArrowLeft size={16} /> {hjemLabel}</Button>
      </Link>
    </div>
  );
}
