import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CMSProvider } from './contexts/CMSContext';

// Layout components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';
import FirstAccessGuard from './components/Auth/FirstAccessGuard';

// Pages
import Login from './pages/Auth/Login';
import ForgotPassword from './pages/Auth/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword';
import Landing from './pages/Landing/Landing';
import Dashboard from './pages/Dashboard/Dashboard';
import Students from './pages/Students/Students';
import StudentDetails from './pages/Students/StudentDetails';
import Teachers from './pages/Teachers/Teachers';
import Professores from './pages/Professores/Professores';
import ProfessorDetalhes from './pages/Professores/ProfessorDetalhes';
import Turmas from './pages/Turmas/Turmas';
import TurmaDetalhes from './pages/Turmas/TurmaDetalhes';
import Payments from './pages/Payments/Payments';
import Financeiro from './pages/Financeiro/Financeiro';
import Frequencia from './pages/Frequencia/Frequencia';
import ValidacaoPresencas from './pages/Frequencia/ValidacaoPresencas';
import Attendance from './pages/Attendance/Attendance';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';
import CMSManagerFinal from './pages/CMS/CMSManagerFinal';
import Formularios from './pages/Formulario/Formularios';
import Checkout from './pages/Checkout/Checkout';
import GerenciarPlanos from './pages/Planos/GerenciarPlanos';
import PublicRegistration from './pages/PublicRegistration/PublicRegistration';
import FirstLogin from './pages/FirstLogin/FirstLogin';
import LGPDConsent from './pages/LGPDConsent/LGPDConsent';
import FormValidation from './pages/FormValidation/FormValidation';
import StudentProfile from './pages/StudentPortal/StudentProfile';
import StudentAttendance from './pages/StudentPortal/StudentAttendance';
import StudentPayments from './pages/StudentPortal/StudentPayments';
import StudentDashboard from './pages/StudentPortal/StudentDashboard';
import SuperAdminDashboard from './pages/SuperAdmin/SuperAdminDashboard';
import BeltShowcase from './pages/BeltShowcase';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles) {
    // SuperAdmin tem acesso a TUDO exceto rotas exclusivas de aluno
    if (user?.tipo_usuario === 'superadmin') {
      // Se a rota é APENAS para alunos (não inclui admin/professor/superadmin), bloquear
      if (requiredRoles.length === 1 && requiredRoles[0] === 'aluno') {
        return <Navigate to="/app/dashboard" replace />;
      }
      // Caso contrário, SuperAdmin tem acesso
      return children;
    }

    // Para outros usuários, verificar normalmente
    if (!requiredRoles.includes(user?.tipo_usuario)) {
      return <Navigate to="/app/dashboard" replace />;
    }
  }

  return children;
};

// Conditional Layout - Renderiza layout apropriado baseado no tipo de usuário
const ConditionalLayout = () => {
  const { user } = useAuth();

  // Alunos não usam o Layout padrão (sem sidebar administrativa)
  if (user?.tipo_usuario === 'aluno') {
    return <Outlet />;
  }

  // Admin e professores usam o Layout com sidebar
  return <Layout />;
};

// Dashboard Router - Renderiza dashboard apropriado baseado no tipo de usuário
const DashboardRouter = () => {
  const { user } = useAuth();

  // Alunos veem o StudentDashboard
  if (user?.tipo_usuario === 'aluno') {
    return <StudentDashboard />;
  }

  // Admin e professores veem o Dashboard padrão
  return <Dashboard />;
};

function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider>
      <div className="App">
        <Routes>
        {/* Rota da landing page */}
        <Route
          path="/"
          element={<Landing />}
        />

        {/* Formulário público de cadastro */}
        <Route
          path="/cadastro-publico"
          element={<PublicRegistration />}
        />

        {/* Página de Checkout */}
        <Route
          path="/checkout"
          element={<Checkout />}
        />

        {/* Rota de login */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <Login />
          }
        />

        {/* Esqueceu a Senha - Solicitar Reset */}
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <ForgotPassword />
            )
          }
        />

        {/* Redefinir Senha - Com Token */}
        <Route
          path="/reset-password"
          element={
            isAuthenticated ? (
              <Navigate to="/app/dashboard" replace />
            ) : (
              <ResetPassword />
            )
          }
        />

        {/* Primeiro acesso - Alteração de senha */}
        <Route
          path="/first-login"
          element={
            isAuthenticated ? <FirstLogin /> : <Navigate to="/login" replace />
          }
        />

        {/* Aceite LGPD */}
        <Route
          path="/lgpd-consent"
          element={
            isAuthenticated ? <LGPDConsent /> : <Navigate to="/login" replace />
          }
        />

        {/* Rotas protegidas */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <FirstAccessGuard>
                <ConditionalLayout />
              </FirstAccessGuard>
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRouter />} />

          {/* Student Portal - Área do Aluno */}
          <Route
            path="student-profile"
            element={
              <ProtectedRoute requiredRoles={['aluno']}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="student-attendance"
            element={
              <ProtectedRoute requiredRoles={['aluno']}>
                <StudentAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="student-payments"
            element={
              <ProtectedRoute requiredRoles={['aluno']}>
                <StudentPayments />
              </ProtectedRoute>
            }
          />

          {/* Alunos */}
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetails />} />

          {/* Professores (admin apenas) */}
          <Route
            path="teachers"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Teachers />
              </ProtectedRoute>
            }
          />

          {/* Professores - Sistema Completo */}
          <Route path="professores" element={<Professores />} />
          <Route path="professores/:id" element={<ProfessorDetalhes />} />

          {/* Turmas */}
          <Route path="turmas" element={<Turmas />} />
          <Route path="turmas/:id" element={<TurmaDetalhes />} />

          {/* Pagamentos */}
          <Route
            path="payments"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <Payments />
              </ProtectedRoute>
            }
          />

          {/* Financeiro */}
          <Route
            path="financeiro"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <Financeiro />
              </ProtectedRoute>
            }
          />

          {/* Frequência */}
          <Route
            path="frequencia"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <Frequencia />
              </ProtectedRoute>
            }
          />

          {/* Validação de Presenças */}
          <Route
            path="validacao-presencas"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <ValidacaoPresencas />
              </ProtectedRoute>
            }
          />

          {/* Attendance (antigo) */}
          <Route
            path="attendance"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <Attendance />
              </ProtectedRoute>
            }
          />

          {/* Relatórios */}
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* Usuários (admin apenas) */}
          <Route
            path="users"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <Users />
              </ProtectedRoute>
            }
          />

          {/* Formulários de Cadastro (admin e professor) */}
          <Route
            path="formularios"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <Formularios />
              </ProtectedRoute>
            }
          />

          {/* Validação de Formulários Públicos (admin e professor) */}
          <Route
            path="validacao-formularios"
            element={
              <ProtectedRoute requiredRoles={['admin', 'professor']}>
                <FormValidation />
              </ProtectedRoute>
            }
          />

          {/* CMS - Gerenciar Conteúdo (admin apenas) */}
          <Route
            path="cms"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <CMSManagerFinal />
              </ProtectedRoute>
            }
          />

          {/* Planos - Gerenciar Planos (admin apenas) */}
          <Route
            path="planos"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <GerenciarPlanos />
              </ProtectedRoute>
            }
          />

          {/* SuperAdmin - Painel SuperAdmin (superadmin apenas) */}
          <Route
            path="superadmin"
            element={
              <ProtectedRoute requiredRoles={['superadmin']}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Belt Showcase - Demonstração de Faixas (admin apenas) */}
          <Route
            path="belt-showcase"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <BeltShowcase />
              </ProtectedRoute>
            }
          />

          {/* Perfil */}
          <Route path="profile" element={<Profile />} />

          {/* Rota não encontrada */}
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Route>

        {/* Rota para página não encontrada fora do layout */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;