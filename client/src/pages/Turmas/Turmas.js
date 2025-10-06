import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Tab, Tabs, Badge, Table } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { turmaService } from '../../services/api';
import { FaPlus, FaClock, FaList, FaEdit, FaTrash, FaUsers } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import TurmaModal from '../../components/Turmas/TurmaModal';
import './Turmas.css';

const Turmas = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [activeTab, setActiveTab] = useState('grade');

  const { data: turmas = [], isLoading, refetch } = useQuery(
    'turmas',
    () => turmaService.getTurmas({}),
    {
      select: (response) => response.data
    }
  );

  const { data: gradeHorarios = {} } = useQuery(
    'grade-horarios',
    () => turmaService.getGradeHorarios(),
    {
      select: (response) => response.data
    }
  );

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
        refetch();
      } catch (error) {
        toast.error('Erro ao inativar turma');
      }
    }
  };

  const handleViewTurma = (turmaId) => {
    navigate(`/app/turmas/${turmaId}`);
  };

  const getProgramaBadge = (programa) => {
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
                      <Col key={dia.key} lg={12} className="mb-4">
                        <h5 className="text-danger mb-3">{dia.label}</h5>
                        {gradeHorarios[dia.key] && gradeHorarios[dia.key].length > 0 ? (
                          <Row className="g-3">
                            {gradeHorarios[dia.key].map((turma) => (
                              <Col key={turma.id} md={6} lg={4}>
                                <Card className="turma-card h-100">
                                  <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                      <h6 className="mb-0">{turma.nome}</h6>
                                      {getProgramaBadge(turma.programa)}
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
                                          variant="outline-primary"
                                          size="sm"
                                          onClick={() => handleViewTurma(turma.id)}
                                        >
                                          Ver
                                        </Button>
                                        <Button
                                          variant="outline-warning"
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
                      <th>Programa</th>
                      <th>Dia</th>
                      <th>Horário</th>
                      <th>Alunos</th>
                      <th>Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((turma) => (
                      <tr key={turma.id}>
                        <td><strong>{turma.nome}</strong></td>
                        <td>{turma.professor_nome || 'Sem professor'}</td>
                        <td>{getProgramaBadge(turma.programa)}</td>
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
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleViewTurma(turma.id)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => handleEditTurma(turma)}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
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
                {turmas.length === 0 && (
                  <div className="text-center py-5 text-muted">
                    Nenhuma turma cadastrada
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
          refetch();
          setShowModal(false);
        }}
      />
    </Container>
  );
};

export default Turmas;
