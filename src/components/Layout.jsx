import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Home, FileText, TrendingUp, Settings,
  Menu, X, BarChart3, Megaphone, MessageSquare, Bell, Zap, LifeBuoy, Percent,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Logo } from './Logo';
import { antallUlestForBruker, abonner } from '../services/feedbackService';

// ─── Fase 1 — aktive sider ────────────────────────────────────────────────────
const aktiveNavItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Oversikt' },
  { to: '/boliganalyse', icon: TrendingUp, label: 'Boliganalyse' },
  { to: '/bygg', icon: Building2, label: 'Mine Bygg' },
  { to: '/leieobjekter', icon: Home, label: 'Leieobjekter' },
  { to: '/kontrakter', icon: FileText, label: 'Leiekontrakter' },
  { to: '/kpi', icon: Percent, label: 'KPI-regulering' },
  { to: '/rapporter', icon: BarChart3, label: 'Rapporter' },
];

// ─── Kommer snart — synlige, men ikke aktive ──────────────────────────────────
const kommerNavItems = [
  { icon: Megaphone, label: 'Mine annonser' },
  { icon: MessageSquare, label: 'Meldinger' },
  { icon: Bell, label: 'Varsler' },
  { icon: Zap, label: 'Integrasjoner' },
];

const bottomNavItems = [
  { to: '/tilbakemelding', icon: LifeBuoy, label: 'Tilbakemelding' },
  { to: '/innstillinger', icon: Settings, label: 'Min konto' },
];

function NavItem({ to, icon: Icon, label, onNavigate, badge }) {
  return (
    <NavLink
      to={to}
      end={to === '/app'}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
        ${isActive
          ? 'bg-[#16284A]/[0.07] text-[#16284A] font-semibold'
          : 'text-[#65696F] hover:text-[#16284A] hover:bg-black/[0.03]'
        }`
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="w-5 h-5 rounded-full bg-[#2563EB] text-[#F6F6F4] text-xs font-bold flex items-center justify-center shrink-0">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
    </NavLink>
  );
}

function KommerNavItem({ icon: Icon, label }) {
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#AEB0B4] cursor-not-allowed select-none"
      title="Kommer snart"
    >
      <Icon size={16} className="shrink-0 opacity-60" />
      <span className="flex-1">{label}</span>
      <span className="text-[10px] font-medium text-[#7A7D83] bg-[#E9E8E2] px-1.5 py-0.5 rounded-full shrink-0">
        Kommer
      </span>
    </div>
  );
}

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const lukk = () => setMobileOpen(false);
  const { pathname } = useLocation();
  const [ulestFeedback, setUlestFeedback] = useState(0);

  useEffect(() => {
    let aktiv = true;
    const oppdater = () => antallUlestForBruker().then((n) => { if (aktiv) setUlestFeedback(n); });
    oppdater();
    const av = abonner(oppdater);
    return () => { aktiv = false; av(); };
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-[#F6F6F4]">
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={lukk} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-50 w-60 bg-white border-r border-[#E9E8E2] flex flex-col
        transition-transform duration-250 lg:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

        {/* Logo */}
        <div className="h-14 px-4 flex items-center border-b border-[#E9E8E2] shrink-0">
          <Logo variant="dark" height={26} />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {/* Aktive Fase 1-sider */}
          {aktiveNavItems.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={lukk} />
          ))}

          {/* Kommer snart */}
          <div className="mt-8 mb-2 px-3">
            <span className="text-[10px] font-semibold text-[#AEB0B4] uppercase tracking-widest">
              Kommer snart
            </span>
          </div>
          {kommerNavItems.map((item) => (
            <KommerNavItem key={item.label} {...item} />
          ))}
        </nav>

        {/* Bunn-nav */}
        <div className="px-3 pb-3 border-t border-[#E9E8E2] pt-3 flex flex-col gap-0.5 shrink-0">
          {bottomNavItems.map((item) => (
            <NavItem key={item.to} {...item} onNavigate={lukk}
              badge={item.to === '/tilbakemelding' ? ulestFeedback : undefined} />
          ))}
          <div className="px-1 pt-2">
            <span className="text-xs text-[#AEB0B4]">v1.0.0</span>
          </div>
        </div>
      </aside>

      {/* Mobil topbar */}
      <div className="fixed top-0 left-0 right-0 z-30 lg:hidden bg-white border-b border-[#E9E8E2] px-4 h-14 flex items-center justify-between">
        <Logo variant="dark" height={26} />
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="text-[#65696F] hover:text-[#1A1B1E] transition-colors cursor-pointer p-1">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Innhold */}
      <main className="flex-1 lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
