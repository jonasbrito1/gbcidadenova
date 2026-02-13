import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Tab, Tabs, Badge, Table, Form, InputGroup } from 'react-bootstrap';
import { useQuery, useQueryClient } from 'react-query';
import { turmaService } from '../../services/api';
import { FaPlus, FaClock, FaList, FaEdit, FaTrash, FaUsers, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import TurmaModal from '../../components/Turmas/TurmaModal';
import './Turmas.css';

const Turmas = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [activeTab, setActiveTab] = useState('grade');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPrograma, setFilterPrograma] = useState('');

  const { data: turmas = [], isLoading, refetch } = useQuery(
    'turmas',
    () => turmaService.getTurmas({}),
    {
      select: (response) => Array.isArray(response.data) ? response.data : []
    }
  );

  // Filtrar turmas baseado na pesquisa e filtros
  const filteredTurmas = useMemo(() => {
    return turmas.filter(turma => {
      const matchSearch = searchTerm === '' ||
        turma.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        turma.professor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        turma.dia_semana?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = filterStatus === '' || turma.status === filterStatus;
      const matchPrograma = filterPrograma === '' || turma.programa === filterPrograma;

      return matchSearch && matchStatus && matchPrograma;
    });
  }, [turmas, searchTerm, filterStatus, filterPrograma]);

  const { data: gradeHorarios = {} } = useQuery(
    'grade-horarios',
    () => turmaService.getGradeHorarios(),
    {
      select: (response) => response.data
    }
  );

  // Filtrar grade de horários baseado nos mesmos filtros
  const filteredGradeHorarios = useMemo(() => {
    if (!gradeHorarios || typeof gradeHorarios !== 'object') return {};

    const filtered = {};
    Object.keys(gradeHorarios).forEach(dia => {
      filtered[dia] = (gradeHorarios[dia] || []).filter(turma => {
        const matchSearch = searchTerm === '' ||
          turma.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          turma.professor_nome?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchStatus = filterStatus === '' || turma.status === filterStatus;
        const matchPrograma = filterPrograma === '' || turma.programa === filterPrograma;

        return matchSearch && matchStatus && matchPrograma;
      });
    });

    return filtered;
  }, [gradeHorarios, searchTerm, filterStatus, filterPrograma]);

  const diasSemana = [
    { key: 'segunda', label: 'Segunda' },
    { key: 'terca', label: 'Terça' },
    { key: 'quarta', label: 'Quarta' },
    { key: 'quinta', label: 'Quinta' },
    { key: 'sexta', label: 'Sexta' },
    { key: 'sabado', label: 'Sábado' },
    { key: 'domingo', label: 'Domingo' }
  ];

  const handleAddTurma = () => {
    setSelectedTurma(null);
    setShowModal(true);
  };

  const handleEditTurma = (turma) => {
    setSelectedTurma(turma);
    setShowModal(true);
  };

  const handleDeleteTurma = async (turmaId, turmaNome) => {
    if (window.confirm(`Tem certeza que deseja inativar a turma ${turmaNome}?`)) {
      try {
        await turmaService.deleteTurma(turmaId);
        toast.success('Turma inativada com sucesso!');
        // Atualizar ambas as queries
        queryClient.invalidateQueries('turmas');
        queryClient.invalidateQueries('grade-horarios');
      } catch (error) {
        toast.error('Erro ao inativar turma');
      }
    }
  };

  const handleViewTurma = (turmaId) => {
    navigate(`/app/turmas/${turmaId}`);
  };

  const getModalidadeBadge = (programa) => {
    const variants = {
      'Adultos': 'primary',
      'Infantil': 'warning',
      'Juvenil': 'info',
      'Master': 'dark'
    };
    return <Badge bg={variants[programa] || 'secondary'}>{programa}</Badge>;
  };

  return (
    <Container fluid className="turmas-page">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <FaClock className="me-2" />
              Turmas
            </h2>
            <Button variant="danger" onClick={handleAddTurma}>
              <FaPlus className="me-2" />
              Nova Turma
            </Button>
          </div>
        </Col>
      </Row>

      {/* Barra de Pesquisa e Filtros */}
      <Row className="mb-4">
        <Col xs={12} sm={12} md={5} className="mb-3 mb-md-0">
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Pesquisar turma, professor ou dia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
          <Form.Select
            value={filterPrograma}
            onChange={(e) => setFilterPrograma(e.target.value)}
          >
            <option value="">Todas as Modalidades</option>
            <option value="Adultos">Adultos</option>
            <option value="Infantil">Infantil</option>
            <option value="Juvenil">Juvenil</option>
            <option value="Master">Master</option>
          </Form.Select>
        </Col>
        <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Todos os Status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </Form.Select>
        </Col>
        <Col xs={12} sm={12} md={2} className="text-center text-md-end">
          <Badge bg="secondary" className="py-2 px-3">
            {filteredTurmas.length} turma(s)
          </Badge>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="grade" title={<><FaClock className="me-2" />Grade de Horários</>}>
          <Card>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </div>
              ) : (
                <div className="grade-horarios">
                  <Row>
                    {diasSemana.map((dia) => (
                      <Col key={dia.key} xs={12} className="mb-4">
                        <h5 className="text-danger mb-3">{dia.label}</h5>
                        {filteredGradeHorarios[dia.key] && filteredGradeHorarios[dia.key].length > 0 ? (
                          <Row className="g-3">
                            {filteredGradeHorarios[dia.key].map((turma) => (
                              <Col key={turma.id} xs={12} sm={12} md={6} lg={4}>
                                <Card className="turma-card h-100">
                                  <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <h6 className="mb-0">{turma.nome}</h6>
                                      {getModalidadeBadge(turma.programa)}
                                    </div>
                                    <p className="text-muted mb-2">
                                      <FaClock className="me-1" />
                                      {turma.horario_inicio} - {turma.horario_fim}
                                    </p>
                                    <p className="text-muted mb-2">
                                      <FaUsers className="me-1" />
                                      {turma.professor_nome || 'Sem professor'}
                                    </p>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <Badge bg="info">
                                        {turma.total_alunos || 0}/{turma.capacidade_maxima} alunos
                                      </Badge>
                                      <div className="d-flex gap-2">
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => handleViewTurma(turma.id)}
                                        >
                                          Ver
                                        </Button>
                                        <Button
                                          variant="warning"
                                          size="sm"
                                          onClick={() => handleEditTurma(turma)}
                                        >
                                          <FaEdit />
                                        </Button>
                                      </div>
                                    </div>
                                  </Card.Body>
                                </Card>
                              </Col>
                            ))}
                          </Row>
                        ) : (
                          <p className="text-muted">Nenhuma turma neste dia</p>
                        )}
                      </Col>
                    ))}
                  </Row>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="lista" title={<><FaList className="me-2" />Lista Completa</>}>
          <Card>
            <Card.Body>
              <div className="table-responsive">
                <Table hover>
                  <thead>
                    <tr>
                      <th>Turma</th>
                      <th>Professor</th>
                      <th>Modalidade</th>
                      <th>Dia</th>
                      <th>Horário</th>
                      <th>Alunos</th>
                      <th>Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTurmas.map((turma) => (
                      <tr key={turma.id}>
                        <td><strong>{turma.nome}</strong></td>
                        <td>{turma.professor_nome || 'Sem professor'}</td>
                        <td>{getModalidadeBadge(turma.programa)}</td>
                        <td className="text-capitalize">{turma.dia_semana}</td>
                        <td>{turma.horario_inicio} - {turma.horario_fim}</td>
                        <td>
                          <Badge bg="info">
                            {turma.total_alunos || 0}/{turma.capacidade_maxima}
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={turma.status === 'ativo' ? 'success' : 'secondary'}>
                            {turma.status}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex justify-content-center gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleViewTurma(turma.id)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => handleEditTurma(turma)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDeleteTurma(turma.id, turma.nome)}
                              disabled={turma.status === 'inativo'}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {filteredTurmas.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    {searchTerm || filterStatus || filterPrograma
                      ? 'Nenhuma turma encontrada com os filtros aplicados'
                      : 'Nenhuma turma cadastrada'}
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <TurmaModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        turma={selectedTurma}
        onSuccess={() => {
          // Atualizar ambas as queries
          queryClient.invalidateQueries('turmas');
          queryClient.invalidateQueries('grade-horarios');
          setShowModal(false);
        }}
      />
    </Container>
  );
};

export default Turmas;
