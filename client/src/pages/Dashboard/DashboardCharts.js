import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const DashboardCharts = ({ data }) => {
  if (!data) return null;

  return (
    <Row>
      <Col lg={6} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title>Evolução de Alunos</Card.Title>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Novos Alunos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.evolucaoAlunos?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.mes}</td>
                      <td>{item.novos_alunos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title>Distribuição por Programa</Card.Title>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Programa</th>
                    <th>Total</th>
                    <th>Ativos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.distribuicaoPrograma?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.programa}</td>
                      <td>{item.total}</td>
                      <td>
                        <span className="badge bg-success">{item.ativos}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title>Top Frequência</Card.Title>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Matrícula</th>
                    <th>Aulas</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topFrequencia?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nome}</td>
                      <td>{item.matricula}</td>
                      <td>
                        <span className="badge bg-primary">{item.total_aulas}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Col>

      <Col lg={6} className="mb-4">
        <Card className="card-dashboard">
          <Card.Body>
            <Card.Title>Receita Mensal</Card.Title>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {data.receitaMensal?.map((item, index) => (
                    <tr key={index}>
                      <td>{item.mes}</td>
                      <td>R$ {parseFloat(item.receita).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default DashboardCharts;