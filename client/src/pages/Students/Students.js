import React, { useState } from 'react';
import { Row, Col, Card, Table, Form, Button, Badge, InputGroup, Dropdown } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { studentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import StudentModal from '../../components/Students/StudentModal';
import { FaSearch, FaPlus, FaEye, FaEdit, FaTrash, FaEllipsisV, FaDownload, FaUserGraduate } from 'react-icons/fa';
import { LinkContainer } from 'react-router-bootstrap';
import { toast } from 'react-toastify';
import { formatDate, formatCurrency, formatPhone } from '../../utils/formatters';

const Students = () => {
  const { hasRole } = useAuth();
  const [filters, setFilters] = useState({
    search: '',
    programa: '',
    status: '',
    graduacao: '',
    plano: '',
    page: 1
  });

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Buscar alunos
  const { data: studentsData, isLoading, refetch } = useQuery(
    ['students', filters],
    () => studentService.getStudents(filters),
    {
      keepPreviousData: true
    }
  );

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1 // Reset para primeira página ao filtrar
    }));
  };

  // Funções do modal
  const handleShowModal = (student = null) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStudent(null);
  };

  const handleModalSuccess = () => {
    refetch();
  };

  // Ações dos alunos
  const handleDeleteStudent = async (studentId, studentName) => {
    if (window.confirm(`Tem certeza que deseja inativar o aluno ${studentName}?`)) {
      try {
        await studentService.updateStudent(studentId, { status: 'inativo' });
        toast.success('Aluno inativado com sucesso!');
        refetch();
      } catch (error) {
        toast.error('Erro ao inativar aluno');
      }
    }
  };

  const handleExportStudents = () => {
    // Implementar exportação
    toast.info('Funcionalidade de exportação em desenvolvimento');
  };

  const getStatusBadge = (status) => {
    const variants = {
      'ativo': 'success',
      'inativo': 'secondary',
      'trancado': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  if (isLoading) {
    return <LoadingSpinner text="Carregando alunos..." />;
  }

  const students = studentsData?.data?.students || [];
  const pagination = {
    total: studentsData?.data?.total || 0,
    page: studentsData?.data?.page || 1,
    totalPages: studentsData?.data?.totalPages || 1
  };

  return (
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-dark">Alunos</h2>
              <p className="text-muted">Gerenciar alunos da academia</p>
            </div>
            <div className="d-flex gap-2">
              {hasRole('admin', 'professor') && (
                <Button
                  variant="danger"
                  onClick={() => handleShowModal()}
                >
                  <FaPlus className="me-2" />
                  Novo Aluno
                </Button>
              )}
              <Button
                variant="outline-secondary"
                onClick={handleExportStudents}
              >
                <FaDownload className="me-2" />
                Exportar
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-4">
        <Col lg={12}>
          <Card className="card-dashboard">
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Buscar</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        placeholder="Nome, email ou matrícula..."
                        value={filters.search}
                        onChange={(e) => handleFilterChange('search', e.target.value)}
                      />
                      <Button variant="outline-secondary">
                        <FaSearch />
                      </Button>
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Programa</Form.Label>
                    <Form.Select
                      value={filters.programa}
                      onChange={(e) => handleFilterChange('programa', e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="Adultos">Adultos</option>
                      <option value="Infantil">Infantil</option>
                      <option value="Juvenil">Juvenil</option>
                      <option value="Master">Master</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Graduação</Form.Label>
                    <Form.Select
                      value={filters.graduacao}
                      onChange={(e) => handleFilterChange('graduacao', e.target.value)}
                    >
                      <option value="">Todas</option>
                      <option value="Branca">Branca</option>
                      <option value="Azul">Azul</option>
                      <option value="Roxa">Roxa</option>
                      <option value="Marrom">Marrom</option>
                      <option value="Preta">Preta</option>
                      <option value="Coral">Coral</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={filters.status}
                      onChange={(e) => handleFilterChange('status', e.target.value)}
                    >
                      <option value="">Todos</option>
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                      <option value="trancado">Trancado</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Estatísticas</Form.Label>
                    <div className="d-flex gap-2 align-items-center">
                      <div className="text-center">
                        <div className="fw-bold text-success">{pagination.total}</div>
                        <small className="text-muted">Total</small>
                      </div>
                      <div className="text-center">
                        <div className="fw-bold text-primary">{pagination.page}</div>
                        <small className="text-muted">Página</small>
                      </div>
                      <div className="text-center">
                        <div className="fw-bold text-secondary">{pagination.totalPages}</div>
                        <small className="text-muted">Páginas</small>
                      </div>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabela de alunos */}
      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Matrícula</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Programa</th>
                      <th>Graduação</th>
                      <th>Plano</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center text-muted">
                          Nenhum aluno encontrado
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <strong>{student.matricula}</strong>
                          </td>
                          <td>{student.nome}</td>
                          <td>{student.email}</td>
                          <td>
                            <Badge bg="info">{student.programa}</Badge>
                          </td>
                          <td>
                            {student.graduacao}
                            {student.graus_faixa > 0 && (
                              <small className="text-muted"> ({student.graus_faixa}°)</small>
                            )}
                          </td>
                          <td>
                            {student.plano_nome ? (
                              <div>
                                <div>{student.plano_nome}</div>
                                <small className="text-muted">
                                  {formatCurrency(student.valor_mensal || 0)}
                                </small>
                              </div>
                            ) : (
                              <span className="text-muted">Sem plano</span>
                            )}
                          </td>
                          <td>{getStatusBadge(student.status)}</td>
                          <td>
                            <div className="d-flex gap-1">
                              <LinkContainer to={`/students/${student.id}`}>
                                <Button variant="outline-primary" size="sm" title="Visualizar">
                                  <FaEye />
                                </Button>
                              </LinkContainer>

                              {hasRole('admin', 'professor') && (
                                <>
                                  <Button
                                    variant="outline-warning"
                                    size="sm"
                                    onClick={() => handleShowModal(student)}
                                    title="Editar"
                                  >
                                    <FaEdit />
                                  </Button>

                                  <Dropdown>
                                    <Dropdown.Toggle
                                      variant="outline-secondary"
                                      size="sm"
                                      className="no-caret"
                                    >
                                      <FaEllipsisV />
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                      <Dropdown.Item
                                        onClick={() => handleShowModal(student)}
                                      >
                                        <FaEdit className="me-2" />
                                        Editar
                                      </Dropdown.Item>

                                      <Dropdown.Item>
                                        <FaUserGraduate className="me-2" />
                                        Graduações
                                      </Dropdown.Item>

                                      <Dropdown.Divider />

                                      {student.status === 'ativo' ? (
                                        <Dropdown.Item
                                          className="text-warning"
                                          onClick={() => handleDeleteStudent(student.id, student.nome)}
                                        >
                                          <FaTrash className="me-2" />
                                          Inativar
                                        </Dropdown.Item>
                                      ) : (
                                        <Dropdown.Item
                                          className="text-success"
                                          onClick={() => handleDeleteStudent(student.id, student.nome)}
                                        >
                                          <FaUserGraduate className="me-2" />
                                          Reativar
                                        </Dropdown.Item>
                                      )}
                                    </Dropdown.Menu>
                                  </Dropdown>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Paginação */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-center mt-3">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={pagination.page === 1}
                    onClick={() => handleFilterChange('page', pagination.page - 1)}
                    className="me-2"
                  >
                    Anterior
                  </Button>
                  <span className="align-self-center mx-3">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={pagination.page === pagination.totalPages}
                    onClick={() => handleFilterChange('page', pagination.page + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Aluno */}
      <StudentModal
        show={showModal}
        handleClose={handleCloseModal}
        student={selectedStudent}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
};

export default Students;