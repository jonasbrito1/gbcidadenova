import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import DashboardCards from './DashboardCards';
import DashboardCharts from './DashboardCharts';
import DashboardAlerts from './DashboardAlerts';
import DashboardAniversariantes from './DashboardAniversariantes';
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
    return <LoadingSpinner text="Carregando visão geral..." />;
  }

  return (
    <div className="dashboard-gb">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2 className="gb-title text-gradient-gb-red mb-2">Visão Geral</h2>
          <p className="gb-body text-gb-gray-dark fs-5">
            Bem-vindo(a), <strong className="text-gb-red">{user?.nome}</strong>! Aqui está um resumo das atividades da academia.
          </p>
        </Col>
      </Row>


      {/* Visão Geral para Admin e Professor */}
      {hasRole('admin', 'professor') && (
        <>
          {/* Cards de métricas */}
          <DashboardCards data={dashboardData?.data} />

          {/* Aniversariantes - Destaque */}
          <Row className="mb-4">
            <Col xs={12} md={6} lg={4}>
              <DashboardAniversariantes />
            </Col>
          </Row>

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

      {/* Visão Geral para Aluno */}
      {hasRole('aluno') && (
        <Row>
          <Col xs={12} md={12} lg={8} className="mb-3 mb-lg-0">
            <Card className="card-dashboard-gb shadow-gb-red">
              <Card.Body>
                <Card.Title className="gb-heading text-gb-red">Bem-vindo ao Sistema</Card.Title>
                <Card.Text className="gb-body text-gb-gray-dark">
                  Use o menu lateral para navegar pelas funcionalidades disponíveis.
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={12} lg={4}>
            <Card className="card-dashboard-gb shadow-gb-blue">
              <Card.Body>
                <Card.Title className="gb-heading text-gb-blue">Seus Dados</Card.Title>
                <p className="gb-body mb-2"><strong className="text-gb-black">Nome:</strong> {user?.nome}</p>
                <p className="gb-body mb-2"><strong className="text-gb-black">Email:</strong> {user?.email}</p>
                <p className="gb-body mb-0"><strong className="text-gb-black">Tipo:</strong> {user?.tipo_usuario}</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
};

export default Dashboard;