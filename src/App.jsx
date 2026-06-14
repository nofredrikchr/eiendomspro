import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import Login from './pages/Auth/Login';
// Offentlige markedssider lastes statisk (eager) så de vises umiddelbart uten
// «Laster…»-blink på første paint.
import LandingPage from './pages/LandingPage';
import Kalkulator from './pages/Kalkulator';

// Øvrige rute-komponenter lastes ved behov (code-splitting) — kun Login, Layout
// og markedssidene over ligger i hovedchunken. Tunge biblioteker (recharts,
// jspdf, xlsx) følger dermed sidene som bruker dem.
const Priser = lazy(() => import('./pages/Priser'));
const Velkommen = lazy(() => import('./pages/Velkommen'));
const VelgPlan = lazy(() => import('./pages/VelgPlan'));
const VervEnVenn = lazy(() => import('./pages/Verv/VervEnVenn'));
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'));
const GuiderIndex = lazy(() => import('./pages/Guider/GuiderIndex'));
const GuideArtikkel = lazy(() => import('./pages/Guider/GuideArtikkel'));
const ResetPage = lazy(() => import('./pages/Auth/ResetPage'));
const VerifyPage = lazy(() => import('./pages/Auth/VerifyPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ByggListe = lazy(() => import('./pages/Bygg/ByggListe'));
const ByggSkjema = lazy(() => import('./pages/Bygg/ByggSkjema'));
const LeieobjektListe = lazy(() => import('./pages/Leieobjekter/LeieobjektListe'));
const LeieobjektSkjema = lazy(() => import('./pages/Leieobjekter/LeieobjektSkjema'));
const KontraktListe = lazy(() => import('./pages/Kontrakter/KontraktListe'));
const KontraktSkjema = lazy(() => import('./pages/Kontrakter/KontraktSkjema'));
const LeieforholdDetalj = lazy(() => import('./pages/Kontrakter/LeieforholdDetalj'));
const Rapporter = lazy(() => import('./pages/Rapporter'));
const KpiRegulering = lazy(() => import('./pages/Kpi/KpiRegulering'));
const BoliganalyseKalkulator = lazy(() => import('./pages/Boliganalyse/BoliganalyseKalkulator'));
const MinKonto = lazy(() => import('./pages/Innstillinger/MinKonto'));
const IntegrasjonsSide = lazy(() => import('./pages/Integrasjoner/IntegrasjonsSide'));
const Innboks = lazy(() => import('./pages/Meldinger/Innboks'));
const Samtale = lazy(() => import('./pages/Meldinger/Samtale'));
const OvertakelsesProtokoll = lazy(() => import('./pages/Protokoll/OvertakelsesProtokoll'));
const LeietakerPortal = lazy(() => import('./pages/Leietaker/LeietakerPortal'));
const LeietakerHjem = lazy(() => import('./pages/Leietaker/LeietakerHjem'));
const MineAnnonser = lazy(() => import('./pages/Annonser/MineAnnonser'));
const AnnonseSkjema = lazy(() => import('./pages/Annonser/AnnonseSkjema'));
const Varsler = lazy(() => import('./pages/Varsler/Varsler'));
const Feedback = lazy(() => import('./pages/Feedback/Feedback'));
const AdminFeedback = lazy(() => import('./pages/Admin/AdminFeedback'));
const AdminLayout = lazy(() => import('./pages/Admin/AdminLayout').then((m) => ({ default: m.AdminLayout })));
const AdminDashboard = lazy(() => import('./pages/Admin/AdminDashboard'));
const AdminBrukere = lazy(() => import('./pages/Admin/AdminBrukere'));
const AdminLogg = lazy(() => import('./pages/Admin/AdminLogg'));
const IkkeFunnet = lazy(() => import('./pages/IkkeFunnet'));

const LANDING_PATHS = ['/'];

// Lys lasteskjerm — brukes både ved sesjonssjekk og som Suspense-fallback
function Laster() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F6F4]">
      <div className="text-sm text-[#7A7D83]">Laster…</div>
    </div>
  );
}

function AppRoutes() {
  const { pathname } = useLocation();
  const { innlogget, laster, erDemo, aktivModus, niva } = useAuth();
  const isLanding = LANDING_PATHS.includes(pathname);
  const isLeietaker = pathname.startsWith('/leietaker');
  const isLogin = pathname === '/login';
  const isMarketing = isLanding || pathname === '/kalkulator' || pathname === '/priser' || pathname === '/velkommen' || pathname === '/velg-plan' || pathname.startsWith('/guider');

  // Offentlige markedsføringssider — ingen innlogging, ingen app-layout
  if (isMarketing) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/kalkulator" element={<Kalkulator />} />
        <Route path="/priser" element={<Priser />} />
        <Route path="/velkommen" element={<Velkommen />} />
        <Route path="/velg-plan" element={<VelgPlan />} />
        <Route path="/guider" element={<GuiderIndex />} />
        <Route path="/guider/:slug" element={<GuideArtikkel />} />
      </Routes>
    );
  }

  // Registrering — login-siden i registreringsmodus
  if (pathname === '/register') return <Login startModus="registrer" />;

  // Passord-reset og e-postverifisering (token-baserte, ingen innlogging kreves)
  if (pathname === '/reset') return <ResetPage />;
  if (pathname === '/verifiser') return <VerifyPage />;

  // Leietakerportal — egen layout uten utleier-sidebar, men med datatilgang
  if (isLeietaker) {
    return (
      <AppProvider>
        <Routes>
          <Route path="/leietaker/:token" element={<LeietakerPortal />} />
        </Routes>
      </AppProvider>
    );
  }

  // Innlogging
  if (isLogin) return <Login />;

  // Vent på sesjonssjekk før vi avgjør
  if (laster) {
    return <Laster />;
  }

  // Rutebeskyttelse: krev innlogging når auth er aktivt (ikke i demo-modus)
  if (!erDemo && !innlogget) {
    return <Login />;
  }

  // Admin (niva=3): kun admin-panel — ingen utleier/leietaker-app.
  if (niva === 3) {
    return (
      <AdminLayout>
        <Routes>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/brukere" element={<AdminBrukere />} />
          <Route path="/admin/feedback" element={<AdminFeedback />} />
          <Route path="/admin/logg" element={<AdminLogg />} />
          <Route path="*" element={<IkkeFunnet hjemTil="/admin" hjemLabel="Til admin" />} />
        </Routes>
      </AdminLayout>
    );
  }

  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/app" element={aktivModus === 'leietaker' ? <LeietakerHjem /> : <Dashboard />} />
          <Route path="/bygg" element={<ByggListe />} />
          <Route path="/bygg/ny" element={<ByggSkjema />} />
          <Route path="/bygg/:id" element={<ByggSkjema />} />
          <Route path="/leieobjekter" element={<LeieobjektListe />} />
          <Route path="/leieobjekter/ny" element={<LeieobjektSkjema />} />
          <Route path="/leieobjekter/:id" element={<LeieobjektSkjema />} />
          <Route path="/annonser" element={<MineAnnonser />} />
          <Route path="/annonser/ny" element={<AnnonseSkjema />} />
          <Route path="/annonser/:id" element={<AnnonseSkjema />} />
          <Route path="/kontrakter" element={<KontraktListe />} />
          <Route path="/kontrakter/ny" element={<KontraktSkjema />} />
          <Route path="/kontrakter/:id" element={<LeieforholdDetalj />} />
          <Route path="/kontrakter/:id/rediger" element={<KontraktSkjema />} />
          <Route path="/rapporter" element={<Rapporter />} />
          <Route path="/kpi" element={<KpiRegulering />} />
          <Route path="/boliganalyse" element={<BoliganalyseKalkulator />} />
          <Route path="/innstillinger" element={<MinKonto />} />
          <Route path="/verv" element={<VervEnVenn />} />
          <Route path="/partner" element={<PartnerDashboard />} />
          <Route path="/tilbakemelding" element={<Feedback />} />
          <Route path="/admin/*" element={<Navigate to="/app" replace />} />
          <Route path="/integrasjoner" element={<IntegrasjonsSide />} />
          <Route path="/varsler" element={<Varsler />} />
          <Route path="/meldinger" element={<Innboks />} />
          <Route path="/meldinger/:kontraktId" element={<Samtale />} />
          <Route path="/protokoll/ny" element={<OvertakelsesProtokoll />} />
          <Route path="/protokoll/:protokollId" element={<OvertakelsesProtokoll />} />
          <Route path="*" element={<IkkeFunnet hjemTil="/app" hjemLabel="Til oversikt" />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Laster />}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
