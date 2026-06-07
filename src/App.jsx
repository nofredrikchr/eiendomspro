import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import LandingPage from './pages/LandingPage';
import Kalkulator from './pages/Kalkulator';
import GuiderIndex from './pages/Guider/GuiderIndex';
import GuideArtikkel from './pages/Guider/GuideArtikkel';
import Login from './pages/Auth/Login';
import ResetPage from './pages/Auth/ResetPage';
import VerifyPage from './pages/Auth/VerifyPage';
import Dashboard from './pages/Dashboard';
import ByggListe from './pages/Bygg/ByggListe';
import ByggSkjema from './pages/Bygg/ByggSkjema';
import LeieobjektListe from './pages/Leieobjekter/LeieobjektListe';
import LeieobjektSkjema from './pages/Leieobjekter/LeieobjektSkjema';
import KontraktListe from './pages/Kontrakter/KontraktListe';
import KontraktSkjema from './pages/Kontrakter/KontraktSkjema';
import LeieforholdDetalj from './pages/Kontrakter/LeieforholdDetalj';
import Rapporter from './pages/Rapporter';
import KpiRegulering from './pages/Kpi/KpiRegulering';
import BoliganalyseKalkulator from './pages/Boliganalyse/BoliganalyseKalkulator';
import MinKonto from './pages/Innstillinger/MinKonto';
import IntegrasjonsSide from './pages/Integrasjoner/IntegrasjonsSide';
import Innboks from './pages/Meldinger/Innboks';
import Samtale from './pages/Meldinger/Samtale';
import OvertakelsesProtokoll from './pages/Protokoll/OvertakelsesProtokoll';
import LeietakerPortal from './pages/Leietaker/LeietakerPortal';
import LeietakerHjem from './pages/Leietaker/LeietakerHjem';
import MineAnnonser from './pages/Annonser/MineAnnonser';
import AnnonseSkjema from './pages/Annonser/AnnonseSkjema';
import Varsler from './pages/Varsler/Varsler';
import Feedback from './pages/Feedback/Feedback';
import AdminFeedback from './pages/Admin/AdminFeedback';
import { AdminLayout } from './pages/Admin/AdminLayout';
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminBrukere from './pages/Admin/AdminBrukere';
import AdminLogg from './pages/Admin/AdminLogg';

const LANDING_PATHS = ['/'];

function AppRoutes() {
  const { pathname } = useLocation();
  const { innlogget, laster, erDemo, aktivModus, niva } = useAuth();
  const isLanding = LANDING_PATHS.includes(pathname);
  const isLeietaker = pathname.startsWith('/leietaker');
  const isLogin = pathname === '/login';
  const isMarketing = isLanding || pathname === '/kalkulator' || pathname.startsWith('/guider');

  // Offentlige markedsføringssider — ingen innlogging, ingen app-layout
  if (isMarketing) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/kalkulator" element={<Kalkulator />} />
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-sm text-[#52525b]">Laster…</div>
      </div>
    );
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
          <Route path="*" element={<Navigate to="/admin" replace />} />
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
          <Route path="/tilbakemelding" element={<Feedback />} />
          <Route path="/admin/*" element={<Navigate to="/app" replace />} />
          <Route path="/integrasjoner" element={<IntegrasjonsSide />} />
          <Route path="/varsler" element={<Varsler />} />
          <Route path="/meldinger" element={<Innboks />} />
          <Route path="/meldinger/:kontraktId" element={<Samtale />} />
          <Route path="/protokoll/ny" element={<OvertakelsesProtokoll />} />
          <Route path="/protokoll/:protokollId" element={<OvertakelsesProtokoll />} />
        </Routes>
      </Layout>
    </AppProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
