import React from 'react';
import { Row, Col, Card, Alert, Badge } from 'react-bootstrap';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DashboardAlerts = ({ data, loading }) => {
  if (loading) {
    return <LoadingSpinner size="sm" text="Carregando alertas..." />;
  }

  if (!data) return null;

  return (
    <Row>
      {/* Vencimentos hoje */}
      <Col xs={12} md={6} lg={4} className="mb-4">
        <Card className="card-dashboard-gb shadow-gb hover-lift">
          <Card.Body>
            <Card.Title className="gb-heading text-gb-red d-flex justify-content-between align-items-center border-bottom-gb-red pb-3 mb-3">
              Vencimentos Hoje
              <Badge className="badge-gb-warning">{data.vencimentosHoje?.length || 0}</Badge>
            </Card.Title>
            {data.vencimentosHoje?.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar-gb">
                {data.vencimentosHoje.map((item, index) => (
                  <Alert key={index} className="alert-gb-warning p-3 mb-2 border-start-warning">
                    <small className="gb-body">
                      <strong className="text-gb-black d-block mb-1">{item.aluno_nome}</strong>
                      <span className="text-gb-gray-dark d-block">Matrícula: {item.matricula}</span>
                      <span className="text-gb-red fw-bold d-block">Valor: R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </small>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="gb-body text-gb-gray mb-0">Nenhum vencimento hoje</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Pagamentos atrasados */}
      <Col xs={12} md={6} lg={4} className="mb-4">
        <Card className="card-dashboard-gb shadow-gb-red hover-lift">
          <Card.Body>
            <Card.Title className="gb-heading text-gb-red d-flex justify-content-between align-items-center border-bottom-gb-red pb-3 mb-3">
              Pagamentos Atrasados
              <Badge className="badge-gb-red">{data.pagamentosAtrasados?.length || 0}</Badge>
            </Card.Title>
            {data.pagamentosAtrasados?.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar-gb">
                {data.pagamentosAtrasados.map((item, index) => (
                  <Alert key={index} className="alert-gb-danger p-3 mb-2 border-start-danger">
                    <small className="gb-body">
                      <strong className="text-gb-black d-block mb-1">{item.aluno_nome}</strong>
                      <span className="text-gb-gray-dark d-block">Matrícula: {item.matricula}</span>
                      <span className="text-gb-red d-block">Atraso: <strong>{item.dias_atraso} dias</strong></span>
                      <span className="text-gb-red fw-bold d-block">Valor: R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </small>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="gb-body text-gb-gray mb-0">Nenhum pagamento atrasado</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Alunos inativos */}
      <Col xs={12} md={12} lg={4} className="mb-4">
        <Card className="card-dashboard-gb shadow-gb hover-lift">
          <Card.Body>
            <Card.Title className="gb-heading text-gb-gray-dark d-flex justify-content-between align-items-center border-bottom-gb-gray pb-3 mb-3">
              Alunos Inativos
              <Badge className="badge-gb-gray">{data.alunosInativos?.length || 0}</Badge>
            </Card.Title>
            {data.alunosInativos?.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="custom-scrollbar-gb">
                {data.alunosInativos.map((item, index) => (
                  <Alert key={index} className="alert-gb-secondary p-3 mb-2 border-start-secondary">
                    <small className="gb-body">
                      <strong className="text-gb-black d-block mb-1">{item.nome}</strong>
                      <span className="text-gb-gray-dark d-block">Matrícula: {item.matricula}</span>
                      <span className="text-gb-gray d-block">
                        {item.dias_inativo ?
                          `Inativo há ${item.dias_inativo} dias` :
                          'Nunca compareceu'
                        }
                      </span>
                    </small>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="gb-body text-gb-gray mb-0">Todos os alunos estão ativos</p>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardAlerts;