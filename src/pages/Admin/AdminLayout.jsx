import { NavLink, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Users, MessageCircle, ScrollText, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Oversikt', end: true },
  { to: '/admin/brukere', icon: Users, label: 'Brukere' },
  { to: '/admin/feedback', icon: MessageCircle, label: 'Tilbakemeldinger' },
  { to: '/admin/logg', icon: ScrollText, label: 'Revisjonslogg' },
];

export function AdminLayout({ children }) {
  const { bruker, loggUt } = useAuth();
  const navigate = useNavigate();

  async function ut() {
    await loggUt();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#0E0E11] text-[#E4E4E7]">
      {/* Sidebar */}
      <aside className="fixed top-0 left-0 h-full w-60 bg-[#16161A] border-r border-[#26262C] flex flex-col">
        <div className="h-14 px-5 flex items-center gap-2 border-b border-[#26262C] shrink-0">
          <Shield size={18} className="text-[#DC2626]" />
          <span className="text-sm font-semibold">EiendomsPRO Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                ${isActive ? 'bg-[#DC2626]/15 text-[#F87171] font-semibold' : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'}`}>
              <Icon size={16} className="shrink-0" /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-3 border-t border-[#26262C] pt-3 shrink-0">
          <div className="px-3 pb-2">
            <div className="text-xs text-[#71717A]">Innlogget som</div>
            <div className="text-sm text-[#E4E4E7] truncate">{bruker?.epost || bruker?.fulltNavn}</div>
          </div>
          <button onClick={ut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#A1A1AA] hover:text-[#F87171] hover:bg-white/5 transition-all cursor-pointer">
            <LogOut size={16} /> Logg ut
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-60 min-h-screen">
        <div className="p-6 lg:p-8 max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
