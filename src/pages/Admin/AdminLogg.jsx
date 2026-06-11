import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { PageHeader, SectionCard, Pill } from '../../components/ui/kit';

const HANDLING = {
  endre_niva: { label: 'Endret nivå', tone: 'neutral' },
  endre_status: { label: 'Endret status', tone: 'amber' },
  gi_gratis_maaned: { label: 'Ga gratis måned', tone: 'mint' },
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
      <PageHeader tittel="Revisjonslogg" undertittel={`Siste ${logg.length} admin-handlinger`} />

      {feil && (
        <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-danger/25 bg-danger/[0.07] px-4 py-3">
          <AlertTriangle size={16} className="text-danger shrink-0" />
          <div className="flex-1 text-sm font-medium text-danger">{feil}</div>
        </div>
      )}

      {laster ? (
        <div className="text-sm font-medium text-muted-2">Laster…</div>
      ) : logg.length === 0 ? (
        <div className="text-sm font-medium text-muted-2">Ingen handlinger logget ennå.</div>
      ) : (
        <SectionCard className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sand text-muted-2 text-left text-[11.5px] font-extrabold uppercase tracking-[0.06em]">
                  <th className="px-4 py-3">Tidspunkt</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Handling</th>
                  <th className="px-4 py-3">Mål</th>
                  <th className="px-4 py-3">Detaljer</th>
                </tr>
              </thead>
              <tbody>
                {logg.map((g) => {
                  const h = HANDLING[g.handling];
                  return (
                    <tr key={g.id} className="border-t border-line-soft hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3 text-muted-2 whitespace-nowrap num">{tid(g.tidspunkt)}</td>
                      <td className="px-4 py-3 text-muted">{g.admin_navn || '—'}</td>
                      <td className="px-4 py-3">
                        {h ? <Pill tone={h.tone}>{h.label}</Pill> : <span className="font-bold text-ink">{g.handling}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted">{g.mal_navn || '—'}</td>
                      <td className="px-4 py-3 text-muted-2 num text-xs">
                        {g.detaljer && Object.keys(g.detaljer).length
                          ? Object.entries(g.detaljer).map(([k, v]) => `${k}: ${v}`).join(', ')
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
