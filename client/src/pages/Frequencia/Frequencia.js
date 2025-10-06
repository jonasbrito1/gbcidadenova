import React, { useState } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Table, Button, Badge, Form, Modal } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { frequenciaService, turmaService } from '../../services/api';
import { FaCheckCircle, FaTimesCircle, FaChartBar, FaCalendarAlt, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Frequencia = () => {
  const [activeTab, setActiveTab] = useState('registrar');
  const [showRegistro, setShowRegistro] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [dataAula, setDataAula] = useState(new Date().toISOString().split('T')[0]);
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [presencas, setPresencas] = useState({});
  const [filters, setFilters] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });

  // Queries
  const { data: turmas = [] } = useQuery(
    'turmas-ativas',
    () => turmaService.getTurmas({ status: 'ativo' }),
    { select: (response) => response.data }
  );

  const { data: alunosTurma = [], refetch: refetchAlunos } = useQuery(
    ['alunos-turma-frequencia', selectedTurma?.id, dataAula, horarioInicio],
    () => frequenciaService.getAlunosTurma(selectedTurma?.id, {
      data_aula: dataAula,
      horario_inicio: horarioInicio
    }),
    {
      select: (response) => response.data,
      enabled: !!selectedTurma && !!dataAula && !!horarioInicio,
      onSuccess: (data) => {
        // Inicializar presencas com dados existentes
        const initialPresencas = {};
        data.forEach(aluno => {
          initialPresencas[aluno.id] = {
            presente: aluno.presente !== null ? Boolean(aluno.presente) : true,
            observacoes: aluno.observacoes || ''
          };
        });
        setPresencas(initialPresencas);
      }
    }
  );

  const { data: estatisticas = {} } = useQuery(
    ['estatisticas-frequencia', filters.mes, filters.ano],
    () => frequenciaService.getEstatisticasGerais({
      mes: filters.mes,
      ano: filters.ano
    }),
    { select: (response) => response.data }
  );

  const { data: relatorioMensal = [] } = useQuery(
    ['relatorio-mensal', filters.mes, filters.ano],
    () => frequenciaService.getRelatorioMensal({
      mes: filters.mes,
      ano: filters.ano
    }),
    { select: (response) => response.data }
  );

  const handleTogglePresenca = (alunoId) => {
    setPresencas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        presente: !prev[alunoId]?.presente
      }
    }));
  };

  const handleObservacaoChange = (alunoId, observacoes) => {
    setPresencas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        observacoes
      }
    }));
  };

  const handleRegistrarFrequencia = async () => {
    if (!selectedTurma || !dataAula || !horarioInicio) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const presencasArray = Object.entries(presencas).map(([alunoId, data]) => ({
        aluno_id: parseInt(alunoId),
        presente: data.presente,
        observacoes: data.observacoes
      }));

      await frequenciaService.registrarTurma({
        turma_id: selectedTurma.id,
        data_aula: dataAula,
        horario_inicio: horarioInicio,
        horario_fim: horarioFim,
        tipo_aula: 'regular',
        presencas: presencasArray
      });

      toast.success('Frequência registrada com sucesso!');
      setShowRegistro(false);
      setSelectedTurma(null);
      setPresencas({});
      refetchAlunos();
    } catch (error) {
      toast.error('Erro ao registrar frequência');
    }
  };

  const handleMarcarTodos = (presente) => {
    const newPresencas = {};
    alunosTurma.forEach(aluno => {
      newPresencas[aluno.id] = {
        presente,
        observacoes: presencas[aluno.id]?.observacoes || ''
      };
    });
    setPresencas(newPresencas);
  };

  const getStatusBadge = (percentual) => {
    if (percentual >= 90) return <Badge bg="success">{percentual}%</Badge>;
    if (percentual >= 75) return <Badge bg="warning">{percentual}%</Badge>;
    return <Badge bg="danger">{percentual}%</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="text-danger">Frequência</h2>
          <p className="text-muted">Controle de presença e relatórios</p>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Registrar Frequência */}
        <Tab eventKey="registrar" title="Registrar Presença">
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Turma</Form.Label>
                <Form.Select
                  value={selectedTurma?.id || ''}
                  onChange={(e) => {
                    const turma = turmas.find(t => t.id === parseInt(e.target.value));
                    setSelectedTurma(turma);
                    if (turma) {
                      setHorarioInicio(turma.horario_inicio);
                      setHorarioFim(turma.horario_fim);
                    }
                  }}
                >
                  <option value="">Selecione uma turma...</option>
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} - {t.dia_semana} {t.horario_inicio}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Data da Aula</Form.Label>
                <Form.Control
                  type="date"
                  value={dataAula}
                  onChange={(e) => setDataAula(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Horário Início</Form.Label>
                <Form.Control
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Horário Fim</Form.Label>
                <Form.Control
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end gap-2">
              <Button
                variant="success"
                onClick={() => handleMarcarTodos(true)}
                disabled={alunosTurma.length === 0}
              >
                Marcar Todos
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleMarcarTodos(false)}
                disabled={alunosTurma.length === 0}
              >
                Desmarcar Todos
              </Button>
            </Col>
          </Row>

          {selectedTurma && alunosTurma.length > 0 && (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Lista de Presença - {selectedTurma.nome}</h5>
                <Button variant="danger" onClick={handleRegistrarFrequencia}>
                  Salvar Frequência
                </Button>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }} className="text-center">Presente</th>
                      <th>Nome</th>
                      <th>Graduação</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosTurma.map((aluno) => (
                      <tr key={aluno.id} className={!presencas[aluno.id]?.presente ? 'table-warning' : ''}>
                        <td className="text-center">
                          <Button
                            variant={presencas[aluno.id]?.presente ? 'success' : 'outline-secondary'}
                            size="sm"
                            onClick={() => handleTogglePresenca(aluno.id)}
                          >
                            {presencas[aluno.id]?.presente ? (
                              <FaCheckCircle size={20} />
                            ) : (
                              <FaTimesCircle size={20} />
                            )}
                          </Button>
                        </td>
                        <td>{aluno.nome}</td>
                        <td>
                          <Badge
                            bg="secondary"
                            style={{ backgroundColor: aluno.cor_graduacao }}
                          >
                            {aluno.graduacao || 'Não definida'}
                          </Badge>
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Observações..."
                            value={presencas[aluno.id]?.observacoes || ''}
                            onChange={(e) => handleObservacaoChange(aluno.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {selectedTurma && alunosTurma.length === 0 && (
            <Card>
              <Card.Body className="text-center py-5">
                <p className="text-muted">Nenhum aluno encontrado nesta turma</p>
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* Estatísticas */}
        <Tab eventKey="estatisticas" title="Estatísticas">
          <Row className="mb-3">
            <Col md={2}>
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={filters.mes}
                  onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={filters.ano}
                  onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
                >
                  {[2024, 2025, 2026].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <FaCheckCircle size={40} className="text-success mb-2" />
                  <h3>{estatisticas.resumo?.taxa_presenca || 0}%</h3>
                  <p className="text-muted mb-0">Taxa de Presença</p>
                  <small className="text-muted">
                    {estatisticas.resumo?.total_presencas || 0} de {estatisticas.resumo?.total_registros || 0} aulas
                  </small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <FaTimesCircle size={40} className="text-danger mb-2" />
                  <h3>{estatisticas.resumo?.total_faltas || 0}</h3>
                  <p className="text-muted mb-0">Total de Faltas</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="text-center">
                <Card.Body>
                  <FaUsers size={40} className="text-primary mb-2" />
                  <h3>{estatisticas.resumo?.total_registros || 0}</h3>
                  <p className="text-muted mb-0">Total de Registros</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Alunos com Mais Faltas</h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th className="text-center">Faltas</th>
                        <th className="text-center">Total Aulas</th>
                        <th className="text-center">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estatisticas.alunos_mais_faltas?.map((aluno) => (
                        <tr key={aluno.id}>
                          <td>{aluno.nome}</td>
                          <td className="text-center">{aluno.total_faltas}</td>
                          <td className="text-center">{aluno.total_aulas}</td>
                          <td className="text-center">
                            <Badge bg="danger">{aluno.taxa_falta}%</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Frequência por Dia da Semana</h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Dia</th>
                        <th className="text-center">Aulas</th>
                        <th className="text-center">Presenças</th>
                        <th className="text-center">Taxa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estatisticas.por_dia_semana?.map((dia) => (
                        <tr key={dia.dia_semana}>
                          <td>{dia.dia_semana}</td>
                          <td className="text-center">{dia.total_aulas}</td>
                          <td className="text-center">{dia.presencas}</td>
                          <td className="text-center">
                            {getStatusBadge(parseFloat(dia.taxa_presenca))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* Relatório Mensal */}
        <Tab eventKey="relatorio" title="Relatório Mensal">
          <Row className="mb-3">
            <Col md={2}>
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={filters.mes}
                  onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={filters.ano}
                  onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
                >
                  {[2024, 2025, 2026].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Card>
            <Card.Header>
              <h5 className="mb-0">
                Relatório de Frequência - {filters.mes}/{filters.ano}
              </h5>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th className="text-center">Total Aulas</th>
                    <th className="text-center">Presenças</th>
                    <th className="text-center">Faltas</th>
                    <th className="text-center">% Presença</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioMensal.map((aluno) => (
                    <tr key={aluno.aluno_id}>
                      <td>{aluno.aluno_nome}</td>
                      <td className="text-center">{aluno.total_aulas}</td>
                      <td className="text-center">{aluno.presencas}</td>
                      <td className="text-center">{aluno.faltas}</td>
                      <td className="text-center">
                        {getStatusBadge(parseFloat(aluno.percentual_presenca))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Frequencia;
