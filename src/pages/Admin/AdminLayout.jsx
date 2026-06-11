import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  Shield, LayoutDashboard, Users, MessageCircle, ScrollText, LogOut,
  Menu, X, ArrowLeft,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { Avatar } from '../../components/ui/kit';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Oversikt', end: true },
  { to: '/admin/brukere', icon: Users, label: 'Brukere' },
  { to: '/admin/feedback', icon: MessageCircle, label: 'Tilbakemeldinger' },
  { to: '/admin/logg', icon: ScrollText, label: 'Revisjonslogg' },
];

function NavItem({ to, icon: Icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-[11px] transition-colors duration-150
        ${isActive ? 'bg-mint' : 'hover:bg-line-soft'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} className={`shrink-0 ${isActive ? 'text-brand' : 'text-[#5F6A63]'}`} />
          <span className="flex-1 text-sm font-semibold text-ink-2">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function MenyInnhold({ bruker, onUt, onNavigate }) {
  return (
    <>
      <div className="rounded-[14px] border border-line-soft bg-sand p-[13px] mb-3.5 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-mint text-brand flex items-center justify-center shrink-0">
          <Shield size={15} />
        </span>
        <div className="min-w-0">
          <div className="text-[10.5px] font-extrabold text-faint uppercase tracking-[0.1em]">Admin</div>
          <div className="text-[14.5px] font-bold text-ink leading-tight">Kontrollpanel</div>
        </div>
      </div>

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="flex-1 min-h-6" />

      <div className="border-t border-line-soft pt-2.5 flex flex-col gap-0.5">
        <NavLink
          to="/app"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-[11px] hover:bg-line-soft transition-colors duration-150"
        >
          <ArrowLeft size={17} className="shrink-0 text-[#5F6A63]" />
          <span className="flex-1 text-sm font-semibold text-ink-2">Tilbake til appen</span>
        </NavLink>

        <div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
          <Avatar navn={bruker?.fulltNavn || bruker?.epost || 'Admin'} size={34} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-ink truncate">{bruker?.epost || bruker?.fulltNavn || 'Admin'}</div>
            <button onClick={onUt} className="text-[11.5px] font-semibold text-faint hover:text-brand-ink cursor-pointer inline-flex items-center gap-1">
              <LogOut size={12} /> Logg ut
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function AdminLayout({ children }) {
  const { bruker, loggUt } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const lukk = () => setMobileOpen(false);

  async function ut() {
    await loggUt();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Mobil topbar */}
      <div className="lg:hidden sticky top-0 z-30 bg-surface/95 backdrop-blur-md border-b border-line h-[60px] flex items-center gap-3 px-4">
        <button onClick={() => setMobileOpen(true)}
          aria-label="Åpne meny" aria-expanded={mobileOpen}
          className="w-10 h-10 rounded-[11px] flex items-center justify-center text-ink-2 hover:bg-line-soft cursor-pointer">
          <Menu size={20} />
        </button>
        <Logo variant="dark" height={28} />
        <span className="ml-1 text-[11px] font-extrabold text-brand-ink bg-mint px-2 py-0.5 rounded-full">Admin</span>
      </div>

      <div className="flex items-stretch">
        {/* Sidemeny (desktop) */}
        <aside className="hidden lg:flex w-[264px] shrink-0 bg-surface border-r border-line sticky top-0 h-screen overflow-y-auto flex-col px-3.5 pt-5 pb-3.5">
          <div className="px-2 flex items-center gap-2">
            <Logo variant="dark" height={32} />
            <span className="text-[11px] font-extrabold text-brand-ink bg-mint px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <div className="mt-[18px] flex flex-col flex-1">
            <MenyInnhold bruker={bruker} onUt={ut} onNavigate={undefined} />
          </div>
        </aside>

        {/* Mobil drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-[#141A17]/45" onClick={lukk} />
            <div className="absolute top-0 left-0 bottom-0 w-[292px] bg-surface px-3.5 py-4 overflow-y-auto shadow-soft flex flex-col animate-fade-up">
              <div className="flex items-center gap-2.5 px-2 mb-4">
                <Logo variant="dark" height={30} />
                <span className="text-[11px] font-extrabold text-brand-ink bg-mint px-2 py-0.5 rounded-full">Admin</span>
                <button onClick={lukk} aria-label="Lukk meny"
                  className="ml-auto w-9 h-9 rounded-[10px] flex items-center justify-center text-muted hover:bg-line-soft cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col flex-1">
                <MenyInnhold bruker={bruker} onUt={ut} onNavigate={lukk} />
              </div>
            </div>
          </div>
        )}

        {/* Hovedinnhold */}
        <main className="flex-1 min-w-0">
          <div className="max-w-[1140px] mx-auto px-[clamp(16px,3.5vw,44px)] pt-[clamp(20px,3.5vw,44px)] pb-[clamp(48px,6vw,72px)]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
