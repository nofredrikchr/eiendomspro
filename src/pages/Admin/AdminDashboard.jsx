import { useState, useEffect } from 'react';
import { Users, Building2, Home, Shield, TrendingUp } from 'lucide-react';
import { adminApi } from '../../services/adminApi';

function Kort({ ikon: Ikon, label, verdi, farge = '#A1A1AA' }) {
  return (
    <div className="rounded-xl bg-[#16161A] border border-[#26262C] p-5">
      <div className="flex items-center gap-2 mb-2">
        <Ikon size={15} style={{ color: farge }} />
        <span className="text-xs text-[#A1A1AA]">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-white num">{verdi}</div>
    </div>
  );
}

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
      <h1 className="text-xl font-semibold text-white mb-1">Oversikt</h1>
      <p className="text-sm text-[#A1A1AA] mb-6">Systemstatistikk</p>

      {feil && <div className="text-sm text-[#F87171] mb-4">{feil}</div>}
      {!stats && !feil && <div className="text-sm text-[#71717A]">Laster…</div>}

      {stats && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-3">
            <Kort ikon={Users} label="Brukere totalt" verdi={stats.brukere} farge="#60A5FA" />
            <Kort ikon={TrendingUp} label="Nye siste 7 dager" verdi={stats.nyeBrukere7} farge="#4ADE80" />
            <Kort ikon={TrendingUp} label="Nye siste 30 dager" verdi={stats.nyeBrukere30} farge="#4ADE80" />
            <Kort ikon={Shield} label="Admins" verdi={stats.admins} farge="#F87171" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kort ikon={Building2} label="Utleier-kontoer" verdi={stats.utleiere} farge="#C9A84C" />
            <Kort ikon={Home} label="Leietaker-kontoer" verdi={stats.leietakere} farge="#C9A84C" />
            <Kort ikon={Building2} label="Bygg" verdi={stats.bygg} />
            <Kort ikon={Home} label="Leieobjekter" verdi={stats.leieobjekter} />
          </div>
        </>
      )}
    </div>
  );
}
