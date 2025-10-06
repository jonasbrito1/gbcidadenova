import React, { useState } from 'react';
import { Container, Row, Col, Card, Badge, Table, Tab, Tabs, Button } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { professorService } from '../../services/api';
import { FaArrowLeft, FaUsers, FaChalkboardTeacher, FaChartLine, FaCalendarCheck } from 'react-icons/fa';
import './ProfessorDetalhes.css';

const ProfessorDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  // Buscar dados do professor
  const { data: professor, isLoading } = useQuery(
    ['professor', id],
    () => professorService.getProfessorById(id),
    {
      select: (response) => response.data
    }
  );

  // Buscar estatísticas
  const { data: estatisticas } = useQuery(
    ['professor-estatisticas', id],
    () => professorService.getProfessorEstatisticas(id),
    {
      select: (response) => response.data
    }
  );

  // Buscar turmas
  const { data: turmas = [] } = useQuery(
    ['professor-turmas', id],
    () => professorService.getProfessorTurmas(id),
    {
      select: (response) => response.data
    }
  );

  // Buscar alunos
  const { data: alunos = [] } = useQuery(
    ['professor-alunos', id],
    () => professorService.getProfessorAlunos(id),
    {
      select: (response) => response.data
    }
  );

  // Buscar frequência
  const { data: frequencias = [] } = useQuery(
    ['professor-frequencia', id],
    () => professorService.getProfessorFrequencia(id, {
      data_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }),
    {
      select: (response) => response.data
    }
  );

  if (isLoading) {
    return (
      <Container className="text-center py-5">
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="professor-detalhes-page">
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/dashboard/professores')}>
            <FaArrowLeft className="me-2" />
            Voltar
          </Button>
        </Col>
      </Row>

      {/* Cabeçalho do Professor */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row>
                <Col md={2} className="text-center">
                  <div className="professor-avatar-large">
                    {professor?.foto_url ? (
                      <img src={professor.foto_url} alt={professor.nome} />
                    ) : (
                      <div className="avatar-placeholder-large">
                        {professor?.nome.charAt(0)}
                      </div>
                    )}
                  </div>
                </Col>
                <Col md={10}>
                  <h3 className="text-danger">{professor?.nome}</h3>
                  <p className="text-muted mb-2">{professor?.email}</p>
                  <div className="mb-3">
                    <Badge bg="secondary" className="me-2" style={{ backgroundColor: professor?.cor_graduacao }}>
                      {professor?.graduacao || 'Não definida'}
                    </Badge>
                    <Badge bg={professor?.status === 'ativo' ? 'success' : 'secondary'}>
                      {professor?.status?.toUpperCase()}
                    </Badge>
                  </div>
                  {professor?.especialidades && (
                    <p><strong>Especialidades:</strong> {professor.especialidades}</p>
                  )}
                  {professor?.biografia && (
                    <p className="text-muted">{professor.biografia}</p>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Estatísticas */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaChalkboardTeacher size={30} className="text-danger mb-2" />
              <h4 className="mb-0">{estatisticas?.total_turmas || 0}</h4>
              <small className="text-muted">Turmas</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaUsers size={30} className="text-primary mb-2" />
              <h4 className="mb-0">{estatisticas?.total_alunos || 0}</h4>
              <small className="text-muted">Alunos</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaChartLine size={30} className="text-success mb-2" />
              <h4 className="mb-0">{estatisticas?.media_frequencia || 0}%</h4>
              <small className="text-muted">Frequência Média</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="stats-card">
            <Card.Body className="text-center">
              <FaCalendarCheck size={30} className="text-info mb-2" />
              <h4 className="mb-0">{estatisticas?.aulas_mes || 0}</h4>
              <small className="text-muted">Aulas no Mês</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs de Conteúdo */}
      <Row>
        <Col>
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
            <Tab eventKey="dashboard" title="Dashboard">
              <Card>
                <Card.Body>
                  <h5 className="text-danger mb-4">Resumo Geral</h5>
                  <p>Dashboard com informações gerais do professor.</p>
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="turmas" title={`Turmas (${turmas.length})`}>
              <Card>
                <Card.Body>
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Turma</th>
                        <th>Programa</th>
                        <th>Dia da Semana</th>
                        <th>Horário</th>
                        <th>Alunos</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turmas.map((turma) => (
                        <tr key={turma.id}>
                          <td>{turma.nome}</td>
                          <td>{turma.programa}</td>
                          <td className="text-capitalize">{turma.dia_semana}</td>
                          <td>{turma.horario_inicio} - {turma.horario_fim}</td>
                          <td><Badge bg="primary">{turma.total_alunos || 0}</Badge></td>
                          <td><Badge bg={turma.status === 'ativo' ? 'success' : 'secondary'}>{turma.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {turmas.length === 0 && (
                    <p className="text-center text-muted py-4">Nenhuma turma cadastrada</p>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="alunos" title={`Alunos (${alunos.length})`}>
              <Card>
                <Card.Body>
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Graduação</th>
                        <th>Turmas</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alunos.map((aluno) => (
                        <tr key={aluno.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="aluno-avatar me-2">
                                {aluno.foto_url ? (
                                  <img src={aluno.foto_url} alt={aluno.nome} />
                                ) : (
                                  <div className="avatar-small-placeholder">{aluno.nome.charAt(0)}</div>
                                )}
                              </div>
                              {aluno.nome}
                            </div>
                          </td>
                          <td>
                            <Badge bg="secondary" style={{ backgroundColor: aluno.cor_graduacao }}>
                              {aluno.graduacao || 'Não definida'}
                            </Badge>
                          </td>
                          <td><small>{aluno.turmas}</small></td>
                          <td><Badge bg={aluno.status === 'ativo' ? 'success' : 'secondary'}>{aluno.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {alunos.length === 0 && (
                    <p className="text-center text-muted py-4">Nenhum aluno cadastrado</p>
                  )}
                </Card.Body>
              </Card>
            </Tab>

            <Tab eventKey="frequencia" title="Frequência">
              <Card>
                <Card.Body>
                  <h5 className="text-danger mb-4">Frequência dos Últimos 30 Dias</h5>
                  <Table responsive hover size="sm">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Aluno</th>
                        <th>Turma</th>
                        <th>Presente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {frequencias.slice(0, 50).map((freq, idx) => (
                        <tr key={idx}>
                          <td>{new Date(freq.data).toLocaleDateString('pt-BR')}</td>
                          <td>{freq.aluno_nome}</td>
                          <td>{freq.turma_nome}</td>
                          <td>
                            <Badge bg={freq.presente ? 'success' : 'danger'}>
                              {freq.presente ? 'Sim' : 'Não'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  {frequencias.length === 0 && (
                    <p className="text-center text-muted py-4">Nenhuma frequência registrada</p>
                  )}
                </Card.Body>
              </Card>
            </Tab>
          </Tabs>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfessorDetalhes;
