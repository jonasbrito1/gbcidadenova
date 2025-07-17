
// =============================================
// APP COMPONENT - apps/frontend/src/App.tsx
// =============================================

import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// Layout Components
import { DashboardLayout } from './components/layouts/DashboardLayout';
import { PublicLayout } from './components/layouts/PublicLayout';

// Public Pages
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Protected Pages
import { ClassesPage } from './pages/classes/ClassesPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InstructorsPage } from './pages/instructors/InstructorsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { StudentDetailPage } from './pages/students/StudentDetailPage';
import { StudentsPage } from './pages/students/StudentsPage';

// Components
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/auth/*" element={
        user ? <Navigate to="/dashboard" replace /> : <PublicLayout />
      }>
        <Route path="login" element={<LoginPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password/:token" element={<ResetPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailPage />} />
        <Route path="instructors" element={<InstructorsPage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;