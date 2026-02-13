import React, { useState } from 'react';
import { Row, Col, Card, Table, Form, Button, Badge, InputGroup, Modal } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { studentService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import StudentModal from '../../components/Students/StudentModalEnhanced';
import StudentViewModal from '../../components/Students/StudentViewModal';
import StudentGraduationsModal from '../../components/Students/StudentGraduationsModal';
import { FaSearch, FaPlus, FaDownload, FaLink, FaMoneyBillWave } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import ActionsMenu from '../../components/Common/ActionsMenu';
import BeltBadge from '../../components/Common/BeltBadge';
import './Students.css';

const Students = () => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    search: '',
    programa: '',
    status: '',
    graduacao: '',
    plano: '',
    page: 1,
    limit: 20
  });

  // Estados do modal
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showGraduationsModal, setShowGraduationsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Estado para confirmação de cadastro de mensalidade
  const [showConfirmMensalidade, setShowConfirmMensalidade] = useState(false);
  const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null);

  // Estado para seleção em massa
  const [selectedStudents, setSelectedStudents] = useState({});

  // Estado para modal de graduação
  const [showGraduacaoModal, setShowGraduacaoModal] = useState(false);
  const [selectedGraduacao, setSelectedGraduacao] = useState('');
  const [selectedGraus, setSelectedGraus] = useState(0);

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
      // Reset para primeira página apenas ao filtrar (não ao mudar página ou limit)
      page: (field === 'page' || field === 'limit') ? (field === 'page' ? value : 1) : 1
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

  const handleModalSuccess = (createdStudent, criarMensalidade = false) => {
    console.log('[DEBUG Students.js] handleModalSuccess chamado:', {
      aluno: createdStudent?.nome,
      criarMensalidade
    });

    refetch();

    // Se foi criado um novo aluno (não edição)
    if (createdStudent && criarMensalidade) {
      console.log('[DEBUG Students.js] Navegando para Financeiro com aluno:', createdStudent);
      // Navegar para a página de financeiro e abrir modal de mensalidade
      navigate('/app/financeiro', {
        state: {
          novoAluno: createdStudent,
          abrirModalMensalidade: true
        }
      });
    } else if (createdStudent) {
      console.log('[DEBUG Students.js] Mostrando modal de confirmação');
      // Mostrar modal de confirmação
      setNewlyCreatedStudent(createdStudent);
      setShowConfirmMensalidade(true);
    }
  };

  const handleConfirmCadastrarMensalidade = () => {
    setShowConfirmMensalidade(false);
    // Navegar para a página de financeiro com o aluno pré-selecionado
    navigate('/app/financeiro', {
      state: {
        novoAluno: newlyCreatedStudent,
        abrirModalMensalidade: true
      }
    });
  };

  const handleCancelarMensalidade = () => {
    setShowConfirmMensalidade(false);
    setNewlyCreatedStudent(null);
  };

  // ==================== FUNÇÕES DE SELEÇÃO EM MASSA ====================

  // Toggle seleção de um aluno
  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Selecionar/desselecionar todos os alunos visíveis
  const handleSelectAll = (checked) => {
    if (checked) {
      const allSelected = {};
      students.forEach(s => {
        allSelected[s.id] = true;
      });
      setSelectedStudents(allSelected);
    } else {
      setSelectedStudents({});
    }
  };

  // Contar alunos selecionados
  const getSelectedCount = () => {
    return Object.values(selectedStudents).filter(Boolean).length;
  };

  // Obter IDs dos alunos selecionados
  const getSelectedIds = () => {
    return Object.keys(selectedStudents)
      .filter(k => selectedStudents[k])
      .map(Number);
  };

  // ==================== AÇÕES EM MASSA ====================

  // Alterar status em massa
  const handleBulkUpdateStatus = async (newStatus) => {
    const ids = getSelectedIds();
    const count = ids.length;

    const statusLabels = {
      ativo: 'Ativo',
      inativo: 'Inativo',
      trancado: 'Trancado'
    };

    const confirmar = window.confirm(
      `Deseja alterar o status de ${count} aluno(s) para "${statusLabels[newStatus]}"?`
    );

    if (!confirmar) return;

    try {
      const response = await studentService.bulkUpdateStatus({
        ids,
        status: newStatus
      });

      toast.success(
        `Status alterado para "${statusLabels[newStatus]}" em ${response.data.processados} aluno(s)!`
      );

      setSelectedStudents({});
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status dos alunos');
    }
  };

  // Abrir modal de graduação
  const handleOpenGraduacaoModal = () => {
    const count = getSelectedCount();
    if (count === 0) {
      toast.warning('Selecione pelo menos um aluno');
      return;
    }
    setSelectedGraduacao('');
    setSelectedGraus(0);
    setShowGraduacaoModal(true);
  };

  // Alterar graduação em massa
  const handleBulkUpdateGraduacao = async () => {
    const ids = getSelectedIds();
    const count = ids.length;

    if (!selectedGraduacao || selectedGraduacao.trim() === '') {
      toast.warning('Selecione uma graduação');
      return;
    }

    // Verificar se a graduação selecionada exige graus
    const graduacoesComGraus = ['Azul', 'Roxa', 'Marrom', 'Preta', 'Preta Master'];
    const needsGraus = graduacoesComGraus.includes(selectedGraduacao);

    let descricaoCompleta = selectedGraduacao;
    if (needsGraus && selectedGraus > 0) {
      descricaoCompleta = `${selectedGraduacao} (${selectedGraus} ${selectedGraus === 1 ? 'grau' : 'graus'})`;
    }

    const confirmar = window.confirm(
      `Deseja alterar a graduação de ${count} aluno(s) para "${descricaoCompleta}"?`
    );

    if (!confirmar) return;

    try {
      const response = await studentService.bulkUpdateGraduacao({
        ids,
        graduacao: selectedGraduacao,
        graus_faixa: needsGraus ? selectedGraus : 0
      });

      toast.success(
        `Graduação alterada para "${descricaoCompleta}" em ${response.data.processados} aluno(s)!`
      );

      setShowGraduacaoModal(false);
      setSelectedStudents({});
      setSelectedGraduacao('');
      setSelectedGraus(0);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao alterar graduação dos alunos');
    }
  };

  // Função helper para verificar se graduação tem graus
  const graduacaoTemGraus = (graduacao) => {
    const graduacoesComGraus = ['Azul', 'Roxa', 'Marrom', 'Preta', 'Preta Master'];
    return graduacoesComGraus.includes(graduacao);
  };

  // Excluir alunos em massa
  const handleBulkDelete = async () => {
    const ids = getSelectedIds();
    const count = ids.length;

    const confirmar1 = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a EXCLUIR ${count} aluno(s)!\n\n` +
      `Esta ação é IRREVERSÍVEL e irá remover:\n` +
      `- Os registros dos alunos\n` +
      `- Frequências associadas\n` +
      `- Pagamentos/mensalidades\n` +
      `- Histórico de graduações\n\n` +
      `Deseja continuar?`
    );

    if (!confirmar1) return;

    const confirmar2 = window.confirm(
      `CONFIRME: Excluir permanentemente ${count} aluno(s)?`
    );

    if (!confirmar2) return;

    try {
      const response = await studentService.bulkDelete({ ids });

      toast.success(`${response.data.processados} aluno(s) excluído(s) com sucesso!`);

      setSelectedStudents({});
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao excluir alunos');
    }
  };

  // Exportar alunos selecionados
  const handleExportSelected = () => {
    const ids = getSelectedIds();
    const count = ids.length;

    toast.info(`Exportando ${count} aluno(s) selecionado(s)...`);

    // TODO: Implementar exportação real
    // Pode ser CSV, Excel, PDF, etc.
  };

  // ==================== FIM AÇÕES EM MASSA ====================

  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedStudent(null);
  };

  // Ações dos alunos
  const handleToggleStatus = async (studentId, studentName, currentStatus) => {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    const action = newStatus === 'ativo' ? 'ativar' : 'inativar';

    if (window.confirm(`Tem certeza que deseja ${action} o aluno ${studentName}?`)) {
      try {
        await studentService.updateStudentStatus(studentId, newStatus);
        toast.success(`Aluno ${newStatus === 'ativo' ? 'ativado' : 'inativado'} com sucesso!`);
        refetch();
      } catch (error) {
        toast.error(`Erro ao ${action} aluno`);
      }
    }
  };

  const handlePermanentDelete = async (studentId, studentName) => {
    if (window.confirm(
      `⚠️ ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n` +
      `Deseja realmente EXCLUIR PERMANENTEMENTE o aluno ${studentName}?\n\n` +
      `Todos os dados associados (frequências, pagamentos, graduações) serão perdidos.`
    )) {
      // Segunda confirmação
      if (window.confirm(
        `Confirme digitando OK para EXCLUIR PERMANENTEMENTE o aluno ${studentName}.`
      )) {
        try {
          await studentService.deleteStudent(studentId);
          toast.success('Aluno excluído permanentemente com sucesso!');
          refetch();
        } catch (error) {
          const errorMessage = error.response?.data?.error || 'Erro ao excluir aluno';
          toast.error(errorMessage);
        }
      }
    }
  };

  const handleGraduations = async (student) => {
    try {
      // Buscar dados atualizados do aluno antes de abrir o modal
      const response = await studentService.getStudentById(student.id);
      setSelectedStudent(response.data);
      setShowGraduationsModal(true);
    } catch (error) {
      console.error('Erro ao buscar dados do aluno:', error);
      // Se falhar, usar os dados que temos
      setSelectedStudent(student);
      setShowGraduationsModal(true);
    }
  };

  const handleCloseGraduationsModal = () => {
    setShowGraduationsModal(false);
    setSelectedStudent(null);
    refetch(); // Recarregar lista para atualizar graduação atual
  };

  const handleExportStudents = () => {
    // Implementar exportação
    toast.info('Funcionalidade de exportação em desenvolvimento');
  };

  const handleCopyPublicLink = () => {
    const publicLink = `${window.location.origin}/cadastro-publico`;
    navigator.clipboard.writeText(publicLink);
    toast.success('Link copiado! Compartilhe com os interessados.');
  };

  const getStatusBadge = (status) => {
    const variants = {
      'ativo': 'success',
      'inativo': 'secondary',
      'trancado': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getModalidadeBadge = (modalidade) => {
    const config = {
      'Adulto': '#0052cc', // Azul mais escuro
      'Adultos': '#0052cc', // Azul mais escuro
      'Infantil': '#ff8c00', // Laranja
      'Juvenil': '#8b5cf6', // Roxo
      'Master': '#d97706', // Dourado/Amarelo escuro
      'Kids': '#ff8c00', // Laranja (mesmo que Infantil)
      'GBK': '#ff8c00', // Laranja (Gracie Barra Kids)
    };

    const bgColor = config[modalidade] || '#17a2b8'; // Info (azul claro) para outros

    return (
      <span style={{
        display: 'inline-block',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: '500',
        lineHeight: '1',
        color: '#ffffff',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        verticalAlign: 'baseline',
        borderRadius: '0.25rem',
        backgroundColor: bgColor
      }}>
        {modalidade}
      </span>
    );
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
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleShowModal()}
                  >
                    <FaPlus className="me-2" />
                    Novo Aluno
                  </Button>
                  <Button
                    variant="info"
                    onClick={handleCopyPublicLink}
                    title="Copiar link do formulário público"
                  >
                    <FaLink className="me-2" />
                    Link Público
                  </Button>
                </>
              )}
              <Button
                variant="success"
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
                <Col xs={12} sm={12} md={3} className="mb-3">
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
                <Col xs={12} sm={6} md={2} className="mb-3">
                  <Form.Group>
                    <Form.Label>Modalidade</Form.Label>
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
                <Col xs={12} sm={6} md={2} className="mb-3">
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
                <Col xs={12} sm={6} md={2} className="mb-3">
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
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Barra de Ações em Massa */}
      {getSelectedCount() > 0 && (
        <Row className="mb-3">
          <Col>
            <Card className="border-primary">
              <Card.Body className="py-2">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div>
                    <strong>{getSelectedCount()}</strong> aluno(s) selecionado(s)
                  </div>
                  <div className="d-flex gap-2 flex-wrap">
                    {/* Ações de Status */}
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleBulkUpdateStatus('ativo')}
                      title="Marcar como Ativo"
                    >
                      Ativar
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleBulkUpdateStatus('inativo')}
                      title="Marcar como Inativo"
                    >
                      Inativar
                    </Button>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={() => handleBulkUpdateStatus('trancado')}
                      title="Marcar como Trancado"
                    >
                      Trancar
                    </Button>

                    {/* Botão de Graduação */}
                    <Button
                      variant="info"
                      size="sm"
                      onClick={handleOpenGraduacaoModal}
                      title="Alterar Graduação"
                    >
                      Alterar Graduação
                    </Button>

                    {/* Outras ações */}
                    <Button
                      variant="success"
                      size="sm"
                      onClick={handleExportSelected}
                      title="Exportar selecionados"
                    >
                      <FaDownload className="me-1" />
                      Exportar
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleBulkDelete}
                      title="Excluir selecionados"
                    >
                      Excluir Selecionados
                    </Button>

                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSelectedStudents({})}
                      title="Limpar seleção"
                    >
                      Limpar Seleção
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabela de alunos */}
      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>
                        <Form.Check
                          type="checkbox"
                          checked={
                            students.length > 0 &&
                            students.every(s => selectedStudents[s.id])
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          title="Selecionar/Desselecionar todos"
                        />
                      </th>
                      <th>Matrícula</th>
                      <th>Nome</th>
                      <th>Email</th>
                      <th>Modalidade</th>
                      <th>Graduação</th>
                      <th>Plano</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center text-muted">
                          Nenhum aluno encontrado
                        </td>
                      </tr>
                    ) : (
                      students.map((student) => (
                        <tr key={student.id}>
                          <td>
                            <Form.Check
                              type="checkbox"
                              checked={selectedStudents[student.id] || false}
                              onChange={() => handleToggleStudent(student.id)}
                            />
                          </td>
                          <td>
                            <strong>{student.matricula}</strong>
                          </td>
                          <td>{student.nome}</td>
                          <td>{student.email}</td>
                          <td>
                            {getModalidadeBadge(student.programa)}
                          </td>
                          <td>
                            <BeltBadge
                              graduacao={student.graduacao}
                              graus={student.graus_faixa || 0}
                              size="small"
                            />
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
                            <ActionsMenu
                              student={student}
                              onView={handleViewStudent}
                              onEdit={handleShowModal}
                              onGraduations={handleGraduations}
                              onToggleStatus={handleToggleStatus}
                              onDelete={handlePermanentDelete}
                              hasAdminAccess={hasRole('admin', 'professor')}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Paginação */}
              <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                <div className="text-muted">
                  Mostrando {((pagination.page - 1) * filters.limit) + 1} até {Math.min(pagination.page * filters.limit, pagination.total)} de {pagination.total} registros
                </div>

                {/* Seletor de quantidade de registros */}
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">Exibir:</span>
                  <Form.Select
                    value={filters.limit}
                    onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                    style={{ width: 'auto' }}
                    size="sm"
                  >
                    <option value="10">10</option>
                    <option value="20">20</option>
                    <option value="30">30</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="300">300</option>
                  </Form.Select>
                  <span className="text-muted">registros</span>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="d-flex gap-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handleFilterChange('page', 1)}
                      title="Primeira página"
                    >
                      «
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => handleFilterChange('page', pagination.page - 1)}
                    >
                      ‹ Anterior
                    </Button>

                    {/* Números das páginas */}
                    {(() => {
                      const pages = [];
                      const maxButtons = 5;
                      let startPage = Math.max(1, pagination.page - Math.floor(maxButtons / 2));
                      let endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);

                      if (endPage - startPage < maxButtons - 1) {
                        startPage = Math.max(1, endPage - maxButtons + 1);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={pagination.page === i ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => handleFilterChange('page', i)}
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}

                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => handleFilterChange('page', pagination.page + 1)}
                    >
                      Próxima ›
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.page === pagination.totalPages}
                      onClick={() => handleFilterChange('page', pagination.totalPages)}
                      title="Última página"
                    >
                      »
                    </Button>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Edição */}
      <StudentModal
        show={showModal}
        handleClose={handleCloseModal}
        student={selectedStudent}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de Visualização */}
      <StudentViewModal
        show={showViewModal}
        handleClose={handleCloseViewModal}
        student={selectedStudent}
      />

      {/* Modal de Graduações */}
      <StudentGraduationsModal
        show={showGraduationsModal}
        handleClose={handleCloseGraduationsModal}
        student={selectedStudent}
      />

      {/* Modal de Confirmação de Cadastro de Mensalidade */}
      <Modal
        show={showConfirmMensalidade}
        onHide={handleCancelarMensalidade}
        centered
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaMoneyBillWave className="me-2" />
            Cadastro Financeiro
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">
            Aluno cadastrado com sucesso!
          </p>
          <p className="mt-3 mb-0">
            Deseja cadastrar as <strong>mensalidades</strong> deste aluno agora?
          </p>
          {newlyCreatedStudent && (
            <div className="mt-3 p-3 bg-light rounded">
              <strong>Aluno:</strong> {newlyCreatedStudent.nome}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCancelarMensalidade}>
            Não, fazer depois
          </Button>
          <Button variant="primary" onClick={handleConfirmCadastrarMensalidade}>
            <FaMoneyBillWave className="me-2" />
            Sim, cadastrar mensalidades
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Alteração de Graduação em Massa */}
      <Modal
        show={showGraduacaoModal}
        onHide={() => setShowGraduacaoModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>Alterar Graduação em Massa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-3">
            <strong>{getSelectedCount()}</strong> aluno(s) selecionado(s)
          </p>

          {/* Select de Graduação */}
          <Form.Group className="mb-3">
            <Form.Label>Graduação / Faixa</Form.Label>
            <Form.Select
              value={selectedGraduacao}
              onChange={(e) => {
                setSelectedGraduacao(e.target.value);
                setSelectedGraus(0); // Reset graus quando mudar graduação
              }}
            >
              <option value="">Selecione...</option>

              <optgroup label="Kids/Infantil">
                <option value="Branca Kids">Branca Kids</option>
                <option value="Cinza Kids">Cinza Kids</option>
                <option value="Amarela Kids">Amarela Kids</option>
                <option value="Laranja Kids">Laranja Kids</option>
                <option value="Verde Kids">Verde Kids</option>
                <option value="Coral Kids">Coral Kids</option>
              </optgroup>

              <optgroup label="Adultos">
                <option value="Branca">Branca</option>
                <option value="Azul">Azul</option>
                <option value="Roxa">Roxa</option>
                <option value="Marrom">Marrom</option>
                <option value="Preta">Preta</option>
              </optgroup>

              <optgroup label="Master">
                <option value="Preta Master">Preta Master</option>
                <option value="Coral Master">Coral Master</option>
                <option value="Vermelha Master">Vermelha Master</option>
              </optgroup>

              <optgroup label="Dans (Graus)">
                <option value="1º Dan">1º Dan</option>
                <option value="2º Dan">2º Dan</option>
                <option value="3º Dan">3º Dan</option>
                <option value="4º Dan">4º Dan</option>
                <option value="5º Dan">5º Dan</option>
                <option value="6º Dan">6º Dan</option>
                <option value="7º Dan">7º Dan</option>
                <option value="8º Dan">8º Dan</option>
                <option value="9º Dan">9º Dan</option>
                <option value="10º Dan">10º Dan</option>
              </optgroup>
            </Form.Select>
          </Form.Group>

          {/* Select de Graus (condicional) */}
          {selectedGraduacao && graduacaoTemGraus(selectedGraduacao) && (
            <Form.Group className="mb-3">
              <Form.Label>Graus na Faixa</Form.Label>
              <Form.Select
                value={selectedGraus}
                onChange={(e) => setSelectedGraus(parseInt(e.target.value))}
              >
                <option value="0">Sem graus</option>
                <option value="1">1 grau</option>
                <option value="2">2 graus</option>
                <option value="3">3 graus</option>
                <option value="4">4 graus</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Graus são representados por listras na faixa
              </Form.Text>
            </Form.Group>
          )}

          {/* Preview da graduação selecionada */}
          {selectedGraduacao && (
            <div className="alert alert-info">
              <strong>Graduação selecionada:</strong>{' '}
              {selectedGraduacao}
              {graduacaoTemGraus(selectedGraduacao) && selectedGraus > 0 && (
                <span> ({selectedGraus} {selectedGraus === 1 ? 'grau' : 'graus'})</span>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGraduacaoModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="info"
            onClick={handleBulkUpdateGraduacao}
            disabled={!selectedGraduacao}
          >
            Confirmar Alteração
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Students;