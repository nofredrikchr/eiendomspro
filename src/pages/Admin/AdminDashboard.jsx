import { useState, useEffect } from 'react';
import { Users, Building2, Home, Shield, TrendingUp, AlertTriangle } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import { PageHeader } from '../../components/ui/kit';
import { StatCard } from '../../components/ui/Card';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [feil, setFeil] = useState('');

  useEffect(() => {
    let aktiv = true;
    adminApi.stats()
      .then((s) => { if (aktiv) setStats(s); })
      .catch((e) => { if (aktiv) setFeil(e.message); });
    return () => { aktiv = false; };
  }, []);

  return (
    <div>
      <PageHeader tittel="Oversikt" undertittel="Systemstatistikk" />

      {feil && (
        <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-danger/25 bg-danger/[0.07] px-4 py-3">
          <AlertTriangle size={16} className="text-danger shrink-0" />
          <div className="flex-1 text-sm font-medium text-danger">{feil}</div>
        </div>
      )}
      {!stats && !feil && <div className="text-sm font-medium text-muted-2">Laster…</div>}

      {stats && (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 215px), 1fr))' }}>
          <StatCard label="Brukere totalt" value={stats.brukere} color="green" icon={<Users size={17} />} />
          <StatCard label="Nye siste 7 dager" value={stats.nyeBrukere7} color="green" icon={<TrendingUp size={17} />} />
          <StatCard label="Nye siste 30 dager" value={stats.nyeBrukere30} color="green" icon={<TrendingUp size={17} />} />
          <StatCard label="Admins" value={stats.admins} color="amber" icon={<Shield size={17} />} />
          <StatCard label="Utleier-kontoer" value={stats.utleiere} color="ink" icon={<Building2 size={17} />} />
          <StatCard label="Leietaker-kontoer" value={stats.leietakere} color="ink" icon={<Home size={17} />} />
          <StatCard label="Bygg" value={stats.bygg} color="ink" icon={<Building2 size={17} />} />
          <StatCard label="Leieobjekter" value={stats.leieobjekter} color="ink" icon={<Home size={17} />} />
        </div>
      )}
    </div>
  );
}
