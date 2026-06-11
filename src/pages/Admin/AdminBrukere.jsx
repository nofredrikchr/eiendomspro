import { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { PageHeader, SectionCard } from '../../components/ui/kit';

const NIVA = { 1: 'Utleier', 2: 'Leietaker', 3: 'Admin' };
const STATUS = { aktiv: 'Aktiv', suspendert: 'Suspendert', slettet: 'Slettet' };

function dato(d) {
  return d ? new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

const selectKlasse =
  'bg-surface-2 border-[1.5px] border-line-input rounded-[10px] px-2.5 py-1.5 text-xs font-bold text-ink outline-none focus:border-brand transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export default function AdminBrukere() {
  const [brukere, setBrukere] = useState([]);
  const [sok, setSok] = useState('');
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [lagrer, setLagrer] = useState('');

  const last = useCallback((s) => {
    setLaster(true);
    adminApi.brukere(s)
      .then((b) => { setBrukere(b); setFeil(''); })
      .catch((e) => setFeil(e.message))
      .finally(() => setLaster(false));
  }, []);

  // Initiell last — setState skjer i promise-callback (ikke synkront i effekten).
  useEffect(() => {
    let aktiv = true;
    adminApi.brukere('')
      .then((b) => { if (aktiv) { setBrukere(b); setFeil(''); } })
      .catch((e) => { if (aktiv) setFeil(e.message); })
      .finally(() => { if (aktiv) setLaster(false); });
    return () => { aktiv = false; };
  }, []);

  async function endre(id, endring) {
    setLagrer(id);
    try {
      const oppdatert = await adminApi.oppdaterBruker(id, endring);
      setBrukere((prev) => prev.map((b) => (b.id === id ? oppdatert : b)));
    } catch (e) {
      setFeil(e.message);
    } finally {
      setLagrer('');
    }
  }

  return (
    <div>
      <PageHeader tittel="Brukere" undertittel={`${brukere.length} brukere`} />

      <form onSubmit={(e) => { e.preventDefault(); last(sok); }} className="relative max-w-sm mb-5">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
        <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk navn, e-post, telefon…"
          className="w-full bg-surface-2 border-[1.5px] border-line-input rounded-xl pl-10 pr-4 py-[11px] text-sm font-bold text-ink placeholder:font-medium placeholder:text-faint outline-none focus:border-brand focus:bg-surface transition-all" />
      </form>

      {feil && (
        <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-danger/25 bg-danger/[0.07] px-4 py-3">
          <AlertTriangle size={16} className="text-danger shrink-0" />
          <div className="flex-1 text-sm font-medium text-danger">{feil}</div>
        </div>
      )}

      {laster ? (
        <div className="text-sm font-medium text-muted-2">Laster…</div>
      ) : (
        <SectionCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand text-muted-2 text-left text-[11.5px] font-extrabold uppercase tracking-[0.06em]">
                  <th className="px-4 py-3">Navn</th>
                  <th className="px-4 py-3">Kontakt</th>
                  <th className="px-4 py-3">Nivå</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Opprettet</th>
                </tr>
              </thead>
              <tbody>
                {brukere.map((b) => (
                  <tr key={b.id} className={`border-t border-line-soft hover:bg-surface-2 transition-colors ${lagrer === b.id ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-bold text-ink">{b.fulltNavn}</td>
                    <td className="px-4 py-3 text-muted">{b.epost || b.telefon || '—'}</td>
                    <td className="px-4 py-3">
                      <select value={b.niva} disabled={lagrer === b.id}
                        onChange={(e) => endre(b.id, { niva: Number(e.target.value) })}
                        className={selectKlasse}>
                        {Object.entries(NIVA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select value={b.status} disabled={lagrer === b.id}
                        onChange={(e) => endre(b.id, { status: e.target.value })}
                        className={selectKlasse}>
                        {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted-2 num">{dato(b.opprettet)}</td>
                  </tr>
                ))}
                {brukere.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm font-medium text-muted-2">Ingen brukere.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
