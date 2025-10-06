import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { CMSProvider } from './contexts/CMSContext';

// Layout components
import Layout from './components/Layout/Layout';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Pages
import Login from './pages/Auth/Login';
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
import Attendance from './pages/Attendance/Attendance';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';
import Profile from './pages/Profile/Profile';
import CMSManagerFinal from './pages/CMS/CMSManagerFinal';
import FormularioPublico from './pages/Formulario/FormularioPublico';
import Formularios from './pages/Formulario/Formularios';
import Checkout from './pages/Checkout/Checkout';
import GerenciarPlanos from './pages/Planos/GerenciarPlanos';

// Protected Route Component
const ProtectedRoute = ({ children, requiredRoles }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(user?.tipo_usuario)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
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
          path="/formulario"
          element={<FormularioPublico />}
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

        {/* Rotas protegidas */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard */}
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />

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

          {/* CMS - Gerenciar Conteúdo (admin apenas) */}
          <Route
            path="cms"
            element={
              <ProtectedRoute requiredRoles={['admin']}>
                <CMSManagerFinal />
{/* Planos - Gerenciar Planos (admin apenas) */}          <Route            path="planos"            element={              <ProtectedRoute requiredRoles={['admin']}>                <GerenciarPlanos />              </ProtectedRoute>            }          />
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