import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

const NIVA = { 1: 'Utleier', 2: 'Leietaker', 3: 'Admin' };
const STATUS = { aktiv: 'Aktiv', suspendert: 'Suspendert', slettet: 'Slettet' };

function dato(d) {
  return d ? new Date(d).toLocaleDateString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

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
      <h1 className="text-xl font-semibold text-white mb-1">Brukere</h1>
      <p className="text-sm text-[#A1A1AA] mb-6">{brukere.length} brukere</p>

      <form onSubmit={(e) => { e.preventDefault(); last(sok); }} className="relative max-w-sm mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" />
        <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk navn, e-post, telefon…"
          className="w-full bg-[#16161A] border border-[#26262C] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-[#52525B] outline-none focus:border-[#3F3F46]" />
      </form>

      {feil && <div className="text-sm text-[#F87171] mb-4">{feil}</div>}
      {laster ? (
        <div className="text-sm text-[#71717A]">Laster…</div>
      ) : (
        <div className="rounded-xl border border-[#26262C] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#16161A] text-[#A1A1AA] text-left text-xs">
                <th className="px-4 py-3 font-medium">Navn</th>
                <th className="px-4 py-3 font-medium">Kontakt</th>
                <th className="px-4 py-3 font-medium">Nivå</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Opprettet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262C]">
              {brukere.map((b) => (
                <tr key={b.id} className={`hover:bg-white/[0.02] ${lagrer === b.id ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3 text-white">{b.fulltNavn}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{b.epost || b.telefon || '—'}</td>
                  <td className="px-4 py-3">
                    <select value={b.niva} disabled={lagrer === b.id}
                      onChange={(e) => endre(b.id, { niva: Number(e.target.value) })}
                      className="bg-[#0E0E11] border border-[#26262C] rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer">
                      {Object.entries(NIVA).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select value={b.status} disabled={lagrer === b.id}
                      onChange={(e) => endre(b.id, { status: e.target.value })}
                      className="bg-[#0E0E11] border border-[#26262C] rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer">
                      {Object.entries(STATUS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#71717A]">{dato(b.opprettet)}</td>
                </tr>
              ))}
              {brukere.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[#71717A]">Ingen brukere.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
