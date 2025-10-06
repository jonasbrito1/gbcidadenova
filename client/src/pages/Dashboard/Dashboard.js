import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import DashboardCards from './DashboardCards';
import DashboardCharts from './DashboardCharts';
import DashboardAlerts from './DashboardAlerts';
import './Dashboard.css';

const Dashboard = () => {
  const { user, hasRole } = useAuth();

  // Buscar dados do dashboard
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery(
    'dashboard',
    () => dashboardService.getDashboardData(),
    {
      enabled: hasRole('admin', 'professor'),
      refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    }
  );

  // Buscar alertas
  const { data: alertsData, isLoading: loadingAlerts } = useQuery(
    'alerts',
    () => dashboardService.getAlerts(),
    {
      enabled: hasRole('admin', 'professor'),
      refetchInterval: 2 * 60 * 1000, // Atualizar a cada 2 minutos
    }
  );

  if (loadingDashboard) {
    return <LoadingSpinner text="Carregando dashboard..." />;
  }

  return (
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="text-dark">Dashboard</h2>
          <p className="text-muted">
            Bem-vindo(a), {user?.nome}! Aqui está um resumo das atividades da academia.
          </p>
        </Col>
      </Row>


      {/* Dashboard para Admin e Professor */}
      {hasRole('admin', 'professor') && (
        <>
          {/* Cards de métricas */}
          <DashboardCards data={dashboardData?.data} />

          {/* Gráficos */}
          <Row className="mb-4">
            <Col>
              <DashboardCharts data={dashboardData?.data} />
            </Col>
          </Row>

          {/* Alertas */}
          <Row>
            <Col>
              <DashboardAlerts data={alertsData?.data} loading={loadingAlerts} />
            </Col>
          </Row>
        </>
      )}

      {/* Dashboard para Aluno */}
      {hasRole('aluno') && (
        <Row>
          <Col lg={8}>
            <Card className="card-dashboard">
              <Card.Body>
                <Card.Title>Bem-vindo ao Sistema</Card.Title>
                <Card.Text>
                  Use o menu lateral para navegar pelas funcionalidades disponíveis.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col lg={4}>
            <Card className="card-dashboard">
              <Card.Body>
                <Card.Title>Seus Dados</Card.Title>
                <p><strong>Nome:</strong> {user?.nome}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p><strong>Tipo:</strong> {user?.tipo_usuario}</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;