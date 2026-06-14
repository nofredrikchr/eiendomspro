import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Home, FileText, TrendingUp, Settings,
  Menu, X, BarChart3, Megaphone, MessageSquare, Bell, Zap, LifeBuoy, Percent,
  ArrowLeftRight, MailWarning, AlertTriangle, Gift,
} from 'lucide-react';
import { TrialBanner } from './plan/TrialBanner';
import { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { Avatar } from './ui/kit';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { antallUlestForBruker, abonner } from '../services/feedbackService';
import { lesPref, settPref } from '../utils/uiPref';

// ─── Utleier-modus: aktive sider ──────────────────────────────────────────────
const utleierNavItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Oversikt' },
  { to: '/boliganalyse', icon: TrendingUp, label: 'Boliganalyse' },
  { to: '/bygg', icon: Building2, label: 'Mine Bygg' },
  { to: '/leieobjekter', icon: Home, label: 'Leieobjekter' },
  { to: '/kontrakter', icon: FileText, label: 'Leiekontrakter' },
  { to: '/kpi', icon: Percent, label: 'KPI-regulering' },
  { to: '/rapporter', icon: BarChart3, label: 'Rapporter' },
  { to: '/annonser', icon: Megaphone, label: 'Mine annonser' },
  { to: '/meldinger', icon: MessageSquare, label: 'Meldinger' },
  { to: '/varsler', icon: Bell, label: 'Varsler' },
  { to: '/integrasjoner', icon: Zap, label: 'Integrasjoner' },
];

// ─── Leietaker-modus: aktive sider ────────────────────────────────────────────
const leietakerNavItems = [
  { to: '/app', icon: LayoutDashboard, label: 'Min oversikt' },
];

const bottomNavItems = [
  { to: '/verv', icon: Gift, label: 'Verv en venn' },
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
        `relative flex items-center gap-3 px-3 py-2.5 rounded-[11px] transition-colors duration-150
        ${isActive ? 'bg-mint' : 'hover:bg-line-soft'}`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} className={`shrink-0 ${isActive ? 'text-brand' : 'text-[#5F6A63]'}`} />
          <span className="flex-1 text-sm font-semibold text-ink-2">{label}</span>
          {badge > 0 && (
            <span className="w-5 h-5 rounded-full bg-brand text-white text-[11px] font-extrabold flex items-center justify-center shrink-0">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ─── Modus-veksler (Airbnb-stil) ──────────────────────────────────────────────
function ModusVelger({ onNavigate }) {
  const { aktivModus, roller, byttModus } = useAuth();
  const navigate = useNavigate();
  const [jobber, setJobber] = useState(false);
  if (!aktivModus) return null;

  const andre = aktivModus === 'utleier' ? 'leietaker' : 'utleier';
  const harAndre = roller.includes(andre);
  const byttLabel = harAndre
    ? (andre === 'utleier' ? 'Bytt til utleier' : 'Bytt til leietaker')
    : (andre === 'utleier' ? 'Bli utleier' : 'Finn bolig å leie');

  async function bytt() {
    setJobber(true);
    const r = await byttModus(andre);
    setJobber(false);
    if (r.ok) { onNavigate?.(); navigate('/app'); }
  }

  return (
    <div className="rounded-[14px] border border-line-soft bg-sand p-[13px] mb-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <div className="text-[10.5px] font-extrabold text-faint uppercase tracking-[0.1em]">Modus</div>
          <div className="text-[14.5px] font-bold text-ink">{aktivModus === 'utleier' ? 'Utleier' : 'Leietaker'}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-mint text-brand flex items-center justify-center">
          <ArrowLeftRight size={15} />
        </div>
      </div>
      <button onClick={bytt} disabled={jobber}
        className="w-full px-2.5 py-2 rounded-[10px] text-[13px] font-bold text-ink-2 bg-surface border-[1.5px] border-line-input hover:border-brand hover:text-brand-ink transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
        {jobber ? 'Bytter…' : byttLabel}
      </button>
    </div>
  );
}

// ─── E-postverifiserings-banner ───────────────────────────────────────────────
// Fullt banner ved første besøk. Kan lukkes (X) — da huskes avvisningen og det
// vises kun en subtil pille videre, så det ikke tar plass for nye brukere.
function EpostBanner() {
  const { bruker, epostVerifisert, sendVerifisering } = useAuth();
  const [sendt, setSendt] = useState(false);
  const [jobber, setJobber] = useState(false);
  const [avvist, setAvvist] = useState(() => lesPref('epostBannerAvvist', false));
  if (!bruker || !bruker.epost || epostVerifisert) return null;

  async function send() {
    setJobber(true);
    const r = await sendVerifisering();
    setJobber(false);
    if (r.ok) setSendt(true);
  }
  function avvis() {
    settPref('epostBannerAvvist', true);
    setAvvist(true);
  }

  // Subtil påminnelse etter at brukeren har lukket det fulle banneret.
  if (avvist) {
    return (
      <div className="mb-5 flex items-center gap-2 text-xs text-faint">
        <MailWarning size={13} className="text-amber shrink-0" />
        <span>E-post ikke bekreftet.</span>
        {sendt
          ? <span className="font-bold text-brand-ink">Sendt!</span>
          : <button onClick={send} disabled={jobber}
              className="font-bold text-amber hover:underline cursor-pointer disabled:opacity-50">
              {jobber ? 'Sender…' : 'Send bekreftelse'}
            </button>}
      </div>
    );
  }

  return (
    <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-amber-line bg-amber-soft px-4 py-3">
      <MailWarning size={16} className="text-amber shrink-0" />
      <div className="flex-1 text-sm font-medium text-[#7a611c]">Bekreft e-posten din ({bruker.epost}) for full tilgang.</div>
      {sendt
        ? <span className="text-xs font-bold text-brand-ink">Sendt!</span>
        : <button onClick={send} disabled={jobber}
            className="text-xs font-bold text-amber hover:underline cursor-pointer disabled:opacity-50">
            {jobber ? 'Sender…' : 'Send på nytt'}
          </button>}
      <button onClick={avvis} aria-label="Lukk"
        className="ml-1 w-6 h-6 rounded-lg flex items-center justify-center text-amber/70 hover:bg-amber-line/40 cursor-pointer shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Lastefeil-banner (data fra Neon kunne ikke hentes) ───────────────────────
function LastefeilBanner() {
  const { lastefeil, lastPaaNytt, lasterEiendom } = useApp();
  if (!lastefeil) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-[14px] border border-danger/25 bg-danger/[0.07] px-4 py-3">
      <AlertTriangle size={16} className="text-danger shrink-0" />
      <div className="flex-1 text-sm font-medium text-danger">{lastefeil}</div>
      <button onClick={() => lastPaaNytt()} disabled={lasterEiendom}
        className="text-xs font-bold text-danger hover:underline cursor-pointer disabled:opacity-50">
        {lasterEiendom ? 'Laster…' : 'Prøv igjen'}
      </button>
    </div>
  );
}

// ─── Bruker-kort (bunn av sidemeny) ───────────────────────────────────────────
function BrukerKort() {
  const { bruker, loggUt } = useAuth();
  const navigate = useNavigate();
  const navn = bruker?.navn || bruker?.epost || 'Min konto';
  async function ut() { await loggUt(); navigate('/'); }
  return (
    <div className="flex items-center gap-2.5 px-3 pt-3 pb-1">
      <Avatar navn={navn} size={34} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold text-ink truncate">{navn}</div>
        <button onClick={ut} className="text-[11.5px] font-semibold text-faint hover:text-brand-ink cursor-pointer">
          Logg ut
        </button>
      </div>
    </div>
  );
}

// ─── Sidemeny-innhold (delt av desktop-aside og mobil-drawer) ─────────────────
function MenyInnhold({ navItems, ulestFeedback, onNavigate }) {
  return (
    <>
      <ModusVelger onNavigate={onNavigate} />

      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="flex-1 min-h-6" />

      <div className="border-t border-line-soft pt-2.5 flex flex-col gap-0.5">
        {bottomNavItems.map((item) => (
          <NavItem key={item.to} {...item} onNavigate={onNavigate}
            badge={item.to === '/tilbakemelding' ? ulestFeedback : undefined} />
        ))}
        <BrukerKort />
      </div>
    </>
  );
}

export function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const lukk = () => setMobileOpen(false);
  const { aktivModus } = useAuth();
  const [ulestFeedback, setUlestFeedback] = useState(0);

  const erLeietaker = aktivModus === 'leietaker';
  const navItems = erLeietaker ? leietakerNavItems : utleierNavItems;

  // Ulest-teller: én lasting ved montering + rolig polling (60 s).
  useEffect(() => {
    let aktiv = true;
    const oppdater = () => antallUlestForBruker().then((n) => { if (aktiv) setUlestFeedback(n); });
    oppdater();
    const av = abonner(oppdater, 60000);
    return () => { aktiv = false; av(); };
  }, []);

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
      </div>

      <div className="flex items-stretch">
        {/* Sidemeny (desktop) */}
        <aside className="hidden lg:flex w-[264px] shrink-0 bg-surface border-r border-line sticky top-0 h-screen overflow-y-auto flex-col px-3.5 pt-5 pb-3.5">
          <div className="px-2">
            <Logo variant="dark" height={32} />
          </div>
          <div className="mt-[18px] flex flex-col flex-1">
            <MenyInnhold navItems={navItems} ulestFeedback={ulestFeedback} onNavigate={undefined} />
          </div>
        </aside>

        {/* Mobil drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-[#141A17]/45" onClick={lukk} />
            <div className="absolute top-0 left-0 bottom-0 w-[292px] bg-surface px-3.5 py-4 overflow-y-auto shadow-soft flex flex-col animate-fade-up">
              <div className="flex items-center gap-2.5 px-2 mb-4">
                <Logo variant="dark" height={30} />
                <button onClick={lukk} aria-label="Lukk meny"
                  className="ml-auto w-9 h-9 rounded-[10px] flex items-center justify-center text-muted hover:bg-line-soft cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col flex-1">
                <MenyInnhold navItems={navItems} ulestFeedback={ulestFeedback} onNavigate={lukk} />
              </div>
            </div>
          </div>
        )}

        {/* Hovedinnhold */}
        <main className="flex-1 min-w-0">
          <div className="max-w-[1140px] mx-auto px-[clamp(16px,3.5vw,44px)] pt-[clamp(20px,3.5vw,44px)] pb-[clamp(48px,6vw,72px)]">
            <TrialBanner />
            <EpostBanner />
            <LastefeilBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
