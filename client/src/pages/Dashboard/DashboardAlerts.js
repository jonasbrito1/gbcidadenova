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
      <Col lg={4} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-center">
              Vencimentos Hoje
              <Badge bg="warning">{data.vencimentosHoje?.length || 0}</Badge>
            </Card.Title>
            {data.vencimentosHoje?.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {data.vencimentosHoje.map((item, index) => (
                  <Alert key={index} variant="warning" className="p-2 mb-2">
                    <small>
                      <strong>{item.aluno_nome}</strong><br />
                      Matrícula: {item.matricula}<br />
                      Valor: R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </small>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0">Nenhum vencimento hoje</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Pagamentos atrasados */}
      <Col lg={4} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-center">
              Pagamentos Atrasados
              <Badge bg="danger">{data.pagamentosAtrasados?.length || 0}</Badge>
            </Card.Title>
            {data.pagamentosAtrasados?.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {data.pagamentosAtrasados.map((item, index) => (
                  <Alert key={index} variant="danger" className="p-2 mb-2">
                    <small>
                      <strong>{item.aluno_nome}</strong><br />
                      Matrícula: {item.matricula}<br />
                      Atraso: {item.dias_atraso} dias<br />
                      Valor: R$ {parseFloat(item.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </small>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0">Nenhum pagamento atrasado</p>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Alunos inativos */}
      <Col lg={4} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title className="d-flex justify-content-between align-items-center">
              Alunos Inativos
              <Badge bg="secondary">{data.alunosInativos?.length || 0}</Badge>
            </Card.Title>
            {data.alunosInativos?.length > 0 ? (
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {data.alunosInativos.map((item, index) => (
                  <Alert key={index} variant="secondary" className="p-2 mb-2">
                    <small>
                      <strong>{item.nome}</strong><br />
                      Matrícula: {item.matricula}<br />
                      {item.dias_inativo ?
                        `Inativo há ${item.dias_inativo} dias` :
                        'Nunca compareceu'
                      }
                    </small>
                  </Alert>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0">Todos os alunos estão ativos</p>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardAlerts;