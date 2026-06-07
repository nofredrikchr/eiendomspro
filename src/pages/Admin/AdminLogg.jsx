import { useState, useEffect } from 'react';
import { adminApi } from '../../services/adminApi';

const HANDLING = {
  endre_niva: 'Endret nivå',
  endre_status: 'Endret status',
  gi_gratis_maaned: 'Ga gratis måned',
};

function tid(d) {
  return d ? new Date(d).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

export default function AdminLogg() {
  const [logg, setLogg] = useState([]);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');

  useEffect(() => {
    let aktiv = true;
    adminApi.logg()
      .then((l) => { if (aktiv) setLogg(l); })
      .catch((e) => { if (aktiv) setFeil(e.message); })
      .finally(() => { if (aktiv) setLaster(false); });
    return () => { aktiv = false; };
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Revisjonslogg</h1>
      <p className="text-sm text-[#A1A1AA] mb-6">Siste {logg.length} admin-handlinger</p>

      {feil && <div className="text-sm text-[#F87171] mb-4">{feil}</div>}
      {laster ? (
        <div className="text-sm text-[#71717A]">Laster…</div>
      ) : logg.length === 0 ? (
        <div className="text-sm text-[#71717A]">Ingen handlinger logget ennå.</div>
      ) : (
        <div className="rounded-xl border border-[#26262C] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#16161A] text-[#A1A1AA] text-left text-xs">
                <th className="px-4 py-3 font-medium">Tidspunkt</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Handling</th>
                <th className="px-4 py-3 font-medium">Mål</th>
                <th className="px-4 py-3 font-medium">Detaljer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262C]">
              {logg.map((g) => (
                <tr key={g.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-[#71717A] whitespace-nowrap">{tid(g.tidspunkt)}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{g.admin_navn || '—'}</td>
                  <td className="px-4 py-3 text-white">{HANDLING[g.handling] || g.handling}</td>
                  <td className="px-4 py-3 text-[#A1A1AA]">{g.mal_navn || '—'}</td>
                  <td className="px-4 py-3 text-[#71717A] num text-xs">
                    {g.detaljer && Object.keys(g.detaljer).length
                      ? Object.entries(g.detaljer).map(([k, v]) => `${k}: ${v}`).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
