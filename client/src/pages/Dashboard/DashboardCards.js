import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUsers, FaUserCheck, FaChalkboardTeacher, FaCreditCard, FaExclamationTriangle, FaDollarSign, FaClipboardList, FaChevronRight } from 'react-icons/fa';

const DashboardCards = ({ data }) => {
  const navigate = useNavigate();

  if (!data?.metricas) return null;

  const { metricas } = data;

  const cards = [
    {
      title: 'Total de Alunos',
      value: metricas.totalAlunos,
      icon: FaUsers,
      color: 'gb-red',
      bgColor: 'bg-gradient-gb-red',
      link: '/app/students',
      subtitle: 'Ver todos os alunos'
    },
    {
      title: 'Alunos Ativos',
      value: metricas.alunosAtivos,
      icon: FaUserCheck,
      color: 'gb-blue',
      bgColor: 'bg-gradient-gb-blue',
      link: '/app/students?status=ativo',
      subtitle: 'Alunos com matrículas ativas'
    },
    {
      title: 'Professores',
      value: metricas.totalProfessores,
      icon: FaChalkboardTeacher,
      color: 'gb-blue',
      bgColor: 'bg-gradient-gb-blue',
      link: '/app/professores',
      subtitle: 'Gerenciar professores'
    },
    {
      title: 'Pagamentos do Mês',
      value: metricas.totalPagamentos,
      icon: FaCreditCard,
      color: 'gb-red',
      bgColor: 'bg-gradient-gb-red',
      link: '/app/financeiro',
      subtitle: 'Mensalidades recebidas'
    },
    {
      title: 'Pagamentos Vencidos',
      value: metricas.pagamentosVencidos,
      icon: FaExclamationTriangle,
      color: 'gb-red',
      bgColor: 'bg-gradient-gb-red-dark',
      link: '/app/financeiro?status=atrasado',
      subtitle: 'Mensalidades em atraso'
    },
    {
      title: 'Receita do Mês',
      value: `R$ ${metricas.receitaTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: FaDollarSign,
      color: 'gb-blue',
      bgColor: 'bg-gradient-gb-blue',
      link: '/app/financeiro',
      subtitle: 'Receita total recebida'
    },
    {
      title: 'Aulas Hoje',
      value: metricas.aulasHoje,
      icon: FaClipboardList,
      color: 'gb-red',
      bgColor: 'bg-gradient-gb-red',
      link: '/app/turmas',
      subtitle: 'Aulas programadas para hoje'
    },
    {
      title: 'Taxa de Presença',
      value: metricas.taxaPresenca ? `${metricas.taxaPresenca}%` : '0%',
      icon: FaUserCheck,
      color: 'gb-blue',
      bgColor: 'bg-gradient-gb-blue',
      link: '/app/frequencia',
      subtitle: 'Frequência média mensal'
    }
  ];

  return (
    <Row className="mb-4">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Col xs={12} sm={6} md={6} lg={3} key={index} className="mb-3">
            <Card
              className="card-dashboard-gb h-100 shadow-gb hover-lift cursor-pointer"
              onClick={() => navigate(card.link)}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <Card.Body className="d-flex flex-column">
                <div className="d-flex align-items-start mb-2">
                  <div className={`p-3 rounded-3 ${card.bgColor} text-white me-3 icon-box-gb`}>
                    <IconComponent size={24} />
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="gb-heading text-gb-gray mb-1 text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>{card.title}</h6>
                    <h3 className="gb-title text-gb-black mb-0" style={{fontSize: '1.8rem', fontWeight: '700'}}>{card.value}</h3>
                  </div>
                </div>
                <div className="mt-auto d-flex align-items-center justify-content-between" style={{paddingTop: '0.5rem', borderTop: '1px solid #f0f0f0'}}>
                  <small className="text-gb-gray" style={{fontSize: '0.75rem'}}>{card.subtitle}</small>
                  <FaChevronRight className="text-gb-gray" size={12} />
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