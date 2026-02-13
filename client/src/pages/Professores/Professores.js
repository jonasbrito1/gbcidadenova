import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, InputGroup } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { professorService } from '../../services/api';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaUsers, FaChalkboardTeacher } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import ProfessorModal from '../../components/Professores/ProfessorModal';
import './Professores.css';

const Professores = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  const { data: professores = [], isLoading, refetch } = useQuery(
    ['professores', filters],
    () => professorService.getProfessores(filters),
    {
      select: (response) => response.data
    }
  );

  const handleAddProfessor = () => {
    setSelectedProfessor(null);
    setShowModal(true);
  };

  const handleEditProfessor = (professor) => {
    setSelectedProfessor(professor);
    setShowModal(true);
  };

  const handleDeleteProfessor = async (professorId, professorNome) => {
    if (window.confirm(`Tem certeza que deseja inativar o professor ${professorNome}?`)) {
      try {
        await professorService.deleteProfessor(professorId);
        toast.success('Professor inativado com sucesso!');
        refetch();
      } catch (error) {
        toast.error('Erro ao inativar professor');
      }
    }
  };

  const handleViewDetalhes = (professorId) => {
    navigate(`/dashboard/professores/${professorId}`);
  };

  const getStatusBadge = (status) => {
    const variants = {
      ativo: 'success',
      inativo: 'secondary',
      licenca: 'warning'
    };
    return <Badge bg={variants[status]}>{status.toUpperCase()}</Badge>;
  };

  return (
    <Container fluid className="professores-page">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <h2>
              <FaChalkboardTeacher className="me-2" />
              Professores
            </h2>
            <Button variant="danger" onClick={handleAddProfessor}>
              <FaPlus className="me-2" />
              Novo Professor
            </Button>
          </div>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col xs={12} sm={12} md={8} lg={8} className="mb-3 mb-md-0">
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Buscar por nome, email ou especialidades..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </InputGroup>
        </Col>
        <Col xs={12} sm={12} md={4} lg={4}>
          <Form.Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
            <option value="licenca">Em Licença</option>
          </Form.Select>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Body>
              {isLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-danger" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </div>
                </div>
              ) : professores.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <FaChalkboardTeacher size={50} className="mb-3 opacity-50" />
                  <p>Nenhum professor encontrado</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table hover className="professores-table">
                    <thead>
                      <tr>
                        <th>Professor</th>
                        <th>Graduação</th>
                        <th>Especialidades</th>
                        <th className="text-center">Turmas</th>
                        <th className="text-center">Alunos</th>
                        <th>Status</th>
                        <th className="text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {professores.map((professor) => (
                        <tr key={professor.id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="professor-avatar me-3">
                                {professor.foto_url ? (
                                  <img src={professor.foto_url} alt={professor.nome} />
                                ) : (
                                  <div className="avatar-placeholder">
                                    {professor.nome.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="fw-bold">{professor.nome}</div>
                                <small className="text-muted">{professor.email}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <Badge
                              bg="secondary"
                              style={{
                                backgroundColor: professor.cor_graduacao || '#6c757d',
                                color: '#fff'
                              }}
                            >
                              {professor.graduacao || 'Não definida'}
                            </Badge>
                          </td>
                          <td>
                            <small>{professor.especialidades || 'Não informado'}</small>
                          </td>
                          <td className="text-center">
                            <Badge bg="info">{professor.total_turmas || 0}</Badge>
                          </td>
                          <td className="text-center">
                            <Badge bg="primary">{professor.total_alunos || 0}</Badge>
                          </td>
                          <td>{getStatusBadge(professor.status)}</td>
                          <td>
                            <div className="d-flex justify-content-center gap-2">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleViewDetalhes(professor.id)}
                                title="Ver Detalhes"
                              >
                                <FaEye />
                              </Button>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleEditProfessor(professor)}
                                title="Editar"
                              >
                                <FaEdit />
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={() => handleDeleteProfessor(professor.id, professor.nome)}
                                title="Inativar"
                                disabled={professor.status === 'inativo'}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ProfessorModal
        show={showModal}
        handleClose={() => setShowModal(false)}
        professor={selectedProfessor}
        onSuccess={() => {
          refetch();
          setShowModal(false);
        }}
      />
    </Container>
  );
};

export default Professores;
