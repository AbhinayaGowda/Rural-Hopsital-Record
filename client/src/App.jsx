import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './hooks/useAuth.js';
import { useRole } from './hooks/useRole.js';
import Layout from './components/Layout.jsx';
import Spinner from './components/Spinner.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HouseholdsPage from './pages/HouseholdsPage.jsx';
import HouseholdDetailPage from './pages/HouseholdDetailPage.jsx';
import MemberDetailPage from './pages/MemberDetailPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import AuditLogsPage from './pages/AuditLogsPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AdminLocationsPage from './pages/AdminLocationsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';

// Lazy-loaded pages (code-split to keep initial bundle small)
const HouseholdMapPage  = lazy(() => import('./pages/HouseholdMapPage.jsx'));
const FieldVisitsPage   = lazy(() => import('./pages/FieldVisitsPage.jsx'));
const OutbreaksPage     = lazy(() => import('./pages/OutbreaksPage.jsx'));
const MyPregnanciesPage = lazy(() => import('./pages/MyPregnanciesPage.jsx'));
const CsvImportPage     = lazy(() => import('./pages/CsvImportPage.jsx'));

function ProtectedRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <Spinner center size="lg" />;
  if (!session) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AdminRoute({ children }) {
  const { session, loading } = useAuth();
  const { isAdmin } = useRole();
  if (loading) return <Spinner center size="lg" />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/households" replace />;
  return <Layout>{children}</Layout>;
}

function DoctorRoute({ children }) {
  const { session, loading } = useAuth();
  const { isDoctor, isAdmin } = useRole();
  if (loading) return <Spinner center size="lg" />;
  if (!session) return <Navigate to="/login" replace />;
  if (!isDoctor && !isAdmin) return <Navigate to="/households" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <Spinner center size="lg" />;
  if (session) return <Navigate to="/households" replace />;
  return children;
}

function Lazy({ children }) {
  return <Suspense fallback={<Spinner center size="lg" />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<Navigate to="/households" replace />} />

          <Route path="/households"     element={<ProtectedRoute><HouseholdsPage /></ProtectedRoute>} />
          <Route path="/households/:id" element={<ProtectedRoute><HouseholdDetailPage /></ProtectedRoute>} />
          <Route path="/members/:id"    element={<ProtectedRoute><MemberDetailPage /></ProtectedRoute>} />
          <Route path="/search"         element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
          <Route path="/notifications"  element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

          <Route path="/my-pregnancies" element={<DoctorRoute><Lazy><MyPregnanciesPage /></Lazy></DoctorRoute>} />
          <Route path="/field-visits"   element={<ProtectedRoute><Lazy><FieldVisitsPage /></Lazy></ProtectedRoute>} />

          <Route path="/admin/households/map" element={<AdminRoute><Lazy><HouseholdMapPage /></Lazy></AdminRoute>} />
          <Route path="/admin/outbreaks"      element={<AdminRoute><Lazy><OutbreaksPage /></Lazy></AdminRoute>} />
          <Route path="/admin/import"         element={<AdminRoute><Lazy><CsvImportPage /></Lazy></AdminRoute>} />
          <Route path="/admin/users"          element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
          <Route path="/admin/locations"      element={<AdminRoute><AdminLocationsPage /></AdminRoute>} />
          <Route path="/admin/reports"        element={<AdminRoute><ReportsPage /></AdminRoute>} />
          <Route path="/audit-logs"           element={<AdminRoute><AuditLogsPage /></AdminRoute>} />

          <Route path="*" element={<Navigate to="/households" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
