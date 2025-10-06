import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { FaUsers, FaUserCheck, FaChalkboardTeacher, FaCreditCard, FaExclamationTriangle, FaDollarSign, FaClipboardList } from 'react-icons/fa';

const DashboardCards = ({ data }) => {
  if (!data?.metricas) return null;

  const { metricas } = data;

  const cards = [
    {
      title: 'Total de Alunos',
      value: metricas.totalAlunos,
      icon: FaUsers,
      color: 'primary',
      bgColor: 'bg-primary'
    },
    {
      title: 'Alunos Ativos',
      value: metricas.alunosAtivos,
      icon: FaUserCheck,
      color: 'success',
      bgColor: 'bg-success'
    },
    {
      title: 'Professores',
      value: metricas.totalProfessores,
      icon: FaChalkboardTeacher,
      color: 'info',
      bgColor: 'bg-info'
    },
    {
      title: 'Pagamentos do Período',
      value: metricas.totalPagamentos,
      icon: FaCreditCard,
      color: 'warning',
      bgColor: 'bg-warning'
    },
    {
      title: 'Pagamentos Vencidos',
      value: metricas.pagamentosVencidos,
      icon: FaExclamationTriangle,
      color: 'danger',
      bgColor: 'bg-danger'
    },
    {
      title: 'Receita Total',
      value: `R$ ${metricas.receitaTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: FaDollarSign,
      color: 'success',
      bgColor: 'bg-success'
    },
    {
      title: 'Aulas Hoje',
      value: metricas.aulasHoje,
      icon: FaClipboardList,
      color: 'info',
      bgColor: 'bg-info'
    }
  ];

  return (
    <Row className="mb-4">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Col lg={3} md={6} key={index} className="mb-3">
            <Card className="card-dashboard h-100">
              <Card.Body className="d-flex align-items-center">
                <div className={`p-3 rounded ${card.bgColor} text-white me-3`}>
                  <IconComponent size={24} />
                </div>
                <div>
                  <h6 className="text-muted mb-1">{card.title}</h6>
                  <h4 className="mb-0">{card.value}</h4>
                </div>
              </Card.Body>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default DashboardCards;