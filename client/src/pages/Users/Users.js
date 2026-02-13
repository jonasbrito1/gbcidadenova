import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Modal, InputGroup } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { userService, planService, teacherService } from '../../services/api';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaKey, FaUserShield, FaUserGraduate, FaUser, FaRandom, FaEye, FaEyeSlash, FaDownload } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';
import UserViewModal from '../../components/Users/UserViewModal';

const Users = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedViewUser, setSelectedViewUser] = useState(null);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState('');
  const [plans, setPlans] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [filters, setFilters] = useState({
    tipo: '',
    status: '',
    search: '',
    page: 1,
    limit: 20
  });

  // Estado para seleção em massa
  const [selectedUsers, setSelectedUsers] = useState({});

  // Query
  const { data: usuariosData, isLoading, refetch } = useQuery(
    ['usuarios', filters],
    () => userService.getUsers(filters),
    {
      keepPreviousData: true,
      onError: (error) => {
        console.error('Erro ao carregar usuários:', error);
        toast.error('Erro ao carregar usuários');
      }
    }
  );

  const usuarios = usuariosData?.data?.users || usuariosData?.data || [];
  const pagination = {
    page: usuariosData?.data?.page || 1,
    limit: filters.limit,
    total: usuariosData?.data?.total || usuarios.length,
    totalPages: usuariosData?.data?.totalPages || 1
  };

  // Função para mudar filtros e resetar paginação
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      // Reset para primeira página apenas ao filtrar (não ao mudar página ou limit)
      page: (field === 'page' || field === 'limit') ? (field === 'page' ? value : 1) : 1
    }));
  };

  // Carregar planos e professores quando o modal abrir
  useEffect(() => {
    if (showModal) {
      loadPlansAndTeachers();
      if (selectedUser) {
        setSelectedUserType(selectedUser.tipo_usuario);
      } else {
        setSelectedUserType('');
      }
    }
  }, [showModal, selectedUser]);

  const loadPlansAndTeachers = async () => {
    try {
      const [plansResponse, teachersResponse] = await Promise.all([
        planService.getPlans(),
        teacherService.getTeachers()
      ]);
      setPlans(plansResponse.data || []);
      setTeachers(teachersResponse.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  };

  const handleCreate = () => {
    setSelectedUser(null);
    setSelectedUserType('');
    setShowModal(true);
  };

  const handleEdit = async (user) => {
    try {
      setLoadingEdit(true);
      console.log('[Users] Abrindo edição para usuário ID:', user.id);

      // Buscar dados completos do usuário antes de abrir o modal
      const { data: fullUserData } = await userService.getUserById(user.id);
      console.log('[Users] Dados completos recebidos do servidor:', fullUserData);

      // Formatar data de nascimento para o formato correto (YYYY-MM-DD)
      if (fullUserData.data_nascimento) {
        const date = new Date(fullUserData.data_nascimento);
        if (!isNaN(date.getTime())) {
          // Formato ISO: YYYY-MM-DD
          fullUserData.data_nascimento = date.toISOString().split('T')[0];
          console.log('[Users] Data de nascimento formatada:', fullUserData.data_nascimento);
        } else {
          console.warn('[Users] Data de nascimento inválida:', fullUserData.data_nascimento);
        }
      } else {
        console.warn('[Users] Data de nascimento não fornecida');
      }

      // Formatar data de início para o formato correto (YYYY-MM-DD)
      if (fullUserData.data_inicio) {
        const date = new Date(fullUserData.data_inicio);
        if (!isNaN(date.getTime())) {
          fullUserData.data_inicio = date.toISOString().split('T')[0];
          console.log('[Users] Data de início formatada:', fullUserData.data_inicio);
        } else {
          console.warn('[Users] Data de início inválida:', fullUserData.data_inicio);
        }
      } else {
        console.warn('[Users] Data de início não fornecida');
      }

      console.log('[Users] ===== DADOS FINAIS PARA EDIÇÃO =====');
      console.log(JSON.stringify(fullUserData, null, 2));
      console.log('[Users] ========================================');

      // Atualizar estados
      setSelectedUser(fullUserData);
      setSelectedUserType(fullUserData.tipo_usuario);

      // Pequeno delay para garantir que o estado foi atualizado antes de abrir o modal
      setTimeout(() => {
        setShowModal(true);
        setLoadingEdit(false);
      }, 100);

    } catch (error) {
      console.error('[Users] Erro ao carregar dados do usuário:', error);
      toast.error('Erro ao carregar dados do usuário');
      setLoadingEdit(false);
    }
  };

  const handleView = (user) => {
    setSelectedViewUser(user);
    setShowViewModal(true);
  };

  const handleUserTypeChange = (e) => {
    setSelectedUserType(e.target.value);
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Deseja realmente excluir o usuário ${user.nome}?`)) {
      try {
        await userService.deleteUser(user.id);
        toast.success('Usuário excluído com sucesso!');
        refetch();
      } catch (error) {
        toast.error(error.response?.data?.error || 'Erro ao excluir usuário');
      }
    }
  };

  const handleChangePassword = (user) => {
    setSelectedUser(user);
    setGeneratedPassword('');
    setShowPassword(false);
    setShowPasswordModal(true);
  };

  const generateRandomPassword = () => {
    const length = 10;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let password = '';

    // Garantir pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.charAt(Math.floor(Math.random() * 26));
    password += 'abcdefghijklmnopqrstuvwxyz'.charAt(Math.floor(Math.random() * 26));
    password += '0123456789'.charAt(Math.floor(Math.random() * 10));
    password += '!@#$%&*'.charAt(Math.floor(Math.random() * 7));

    // Completar o restante da senha
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    // Embaralhar a senha
    password = password.split('').sort(() => Math.random() - 0.5).join('');

    setGeneratedPassword(password);
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const userData = {
      nome: formData.get('nome'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      data_nascimento: formData.get('data_nascimento'),
      tipo_usuario: formData.get('tipo_usuario'),
      status: formData.get('status')
    };

    if (!selectedUser) {
      userData.senha = formData.get('senha');
    }

    // Se for aluno, incluir campos específicos
    if (formData.get('tipo_usuario') === 'aluno') {
      userData.programa = formData.get('programa');
      userData.graduacao = formData.get('graduacao');
      userData.graus_faixa = parseInt(formData.get('graus_faixa')) || 0;
      userData.plano_id = formData.get('plano_id') || null;
      userData.professor_responsavel = formData.get('professor_responsavel') || null;
      userData.data_inicio = formData.get('data_inicio');
      userData.contato_emergencia = formData.get('contato_emergencia');
      userData.observacoes_medicas = formData.get('observacoes_medicas');

      // Campos de endereço detalhado
      userData.cep = formData.get('cep');
      userData.rua = formData.get('rua');
      userData.numero = formData.get('numero');
      userData.complemento = formData.get('complemento');
      userData.bairro = formData.get('bairro');
      userData.cidade = formData.get('cidade');
      userData.estado = formData.get('estado');

      // Campos de contato de emergência
      userData.email_responsavel = formData.get('email_responsavel');
      userData.nome_contato_emergencia = formData.get('nome_contato_emergencia');

      // Campos médicos
      userData.tipo_sanguineo = formData.get('tipo_sanguineo');
      userData.toma_medicamento = formData.get('toma_medicamento');
      userData.medicamentos_detalhes = formData.get('medicamentos_detalhes');
      userData.historico_fraturas = formData.get('historico_fraturas');
      userData.fraturas_detalhes = formData.get('fraturas_detalhes');
      userData.tem_alergias = formData.get('tem_alergias');
      userData.alergias_detalhes = formData.get('alergias_detalhes');
    }

    // Se for professor, incluir campos específicos (quando implementado no futuro)
    if (formData.get('tipo_usuario') === 'professor') {
      userData.especialidade = formData.get('especialidade');
      userData.graduacao_professor = formData.get('graduacao_professor');
    }

    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser.id, userData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await userService.createUser(userData);
        toast.success('Usuário criado com sucesso! Um email foi enviado com as credenciais de acesso.');
      }
      setShowModal(false);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar usuário');
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Usar senha gerada se existir, caso contrário pegar do formulário
    const newPassword = generatedPassword || formData.get('nova_senha');
    const confirmPassword = formData.get('confirmar_senha');

    // Se não tiver senha gerada, validar confirmação
    if (!generatedPassword) {
      if (newPassword !== confirmPassword) {
        toast.error('As senhas não coincidem');
        return;
      }
    }

    if (!newPassword || newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    try {
      await userService.updateUser(selectedUser.id, {
        ...selectedUser,
        senha: newPassword
      });
      toast.success('Senha alterada com sucesso! Um email foi enviado ao usuário com as novas credenciais.');
      setShowPasswordModal(false);
      setGeneratedPassword('');
      setShowPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao alterar senha');
    }
  };

  // ==================== FUNÇÕES DE SELEÇÃO EM MASSA ====================

  // Toggle seleção de um usuário
  const handleToggleUser = (userId) => {
    setSelectedUsers(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Selecionar/desselecionar todos os usuários visíveis
  const handleSelectAll = (checked) => {
    if (checked) {
      const allSelected = {};
      usuarios.forEach(u => {
        allSelected[u.id] = true;
      });
      setSelectedUsers(allSelected);
    } else {
      setSelectedUsers({});
    }
  };

  // Contar usuários selecionados
  const getSelectedCount = () => {
    return Object.values(selectedUsers).filter(Boolean).length;
  };

  // Obter IDs dos usuários selecionados
  const getSelectedIds = () => {
    return Object.keys(selectedUsers)
      .filter(k => selectedUsers[k])
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
      suspenso: 'Suspenso'
    };

    const confirmar = window.confirm(
      `Deseja alterar o status de ${count} usuário(s) para "${statusLabels[newStatus]}"?`
    );

    if (!confirmar) return;

    try {
      // Atualizar cada usuário individualmente
      await Promise.all(ids.map(id => {
        const user = usuarios.find(u => u.id === id);
        return userService.updateUser(id, { ...user, status: newStatus });
      }));

      toast.success(`Status alterado para "${statusLabels[newStatus]}" em ${count} usuário(s)!`);
      setSelectedUsers({});
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status dos usuários');
    }
  };

  // Excluir usuários em massa
  const handleBulkDelete = async () => {
    const ids = getSelectedIds();
    const count = ids.length;

    const confirmar1 = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a EXCLUIR ${count} usuário(s)!\n\n` +
      `Esta ação é IRREVERSÍVEL e irá remover todos os dados dos usuários.\n\n` +
      `Deseja continuar?`
    );

    if (!confirmar1) return;

    const confirmar2 = window.confirm(
      `CONFIRME: Excluir permanentemente ${count} usuário(s)?`
    );

    if (!confirmar2) return;

    try {
      await Promise.all(ids.map(id => userService.deleteUser(id)));
      toast.success(`${count} usuário(s) excluído(s) com sucesso!`);
      setSelectedUsers({});
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao excluir usuários');
    }
  };

  // Exportar usuários selecionados
  const handleExportSelected = () => {
    const ids = getSelectedIds();
    const count = ids.length;
    toast.info(`Exportando ${count} usuário(s) selecionado(s)...`);
    // TODO: Implementar exportação real
  };

  // ==================== FIM AÇÕES EM MASSA ====================

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'admin':
        return <FaUserShield className="text-danger me-1" />;
      case 'professor':
        return <FaUserGraduate className="text-primary me-1" />;
      default:
        return <FaUser className="text-secondary me-1" />;
    }
  };

  const getTipoBadge = (tipo) => {
    const variants = {
      admin: 'danger',
      professor: 'primary',
      aluno: 'secondary'
    };
    return <Badge bg={variants[tipo] || 'secondary'}>{tipo}</Badge>;
  };

  const getStatusBadge = (status) => {
    const variants = {
      ativo: 'success',
      inativo: 'secondary',
      suspenso: 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div>
              <h2 className="text-danger">Usuários</h2>
              <p className="text-muted mb-0">Gerenciamento completo de usuários do sistema</p>
            </div>
            <Button variant="danger" onClick={handleCreate} className="mt-2 mt-md-0">
              <FaPlus className="me-2" />
              <span className="d-none d-sm-inline">Novo Usuário</span>
              <span className="d-inline d-sm-none">Novo</span>
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col xs={12} sm={12} md={5} lg={4} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Buscar</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Nome ou email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Tipo</Form.Label>
                <Form.Select
                  value={filters.tipo}
                  onChange={(e) => handleFilterChange('tipo', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="admin">Administrador</option>
                  <option value="professor">Professor</option>
                  <option value="aluno">Aluno</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3} lg={3} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="suspenso">Suspenso</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={12} md={12} lg={2} className="d-flex align-items-end">
              <Form.Group className="w-100">
                <Form.Label className="d-none d-lg-block">&nbsp;</Form.Label>
                <Button
                  variant="outline-secondary"
                  className="w-100"
                  onClick={() => {
                    setFilters({
                      tipo: '',
                      status: '',
                      search: '',
                      page: 1,
                      limit: 20
                    });
                  }}
                  title="Limpar filtros"
                >
                  Limpar Filtros
                </Button>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Barra de Ações em Massa */}
      {getSelectedCount() > 0 && (
        <Card className="mb-4 border-primary">
          <Card.Body className="py-2">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <strong>{getSelectedCount()}</strong> usuário(s) selecionado(s)
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
                  onClick={() => handleBulkUpdateStatus('suspenso')}
                  title="Marcar como Suspenso"
                >
                  Suspender
                </Button>

                {/* Outras ações */}
                <Button
                  variant="info"
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
                  <FaTrash className="me-1" />
                  Excluir
                </Button>

                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSelectedUsers({})}
                  title="Limpar seleção"
                >
                  Limpar Seleção
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Tabela de Usuários */}
      <Card>
        <Card.Body>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" role="status" />
            </div>
          ) : (
            <>
            <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>
                    <Form.Check
                      type="checkbox"
                      checked={
                        usuarios.length > 0 &&
                        usuarios.every(u => selectedUsers[u.id])
                      }
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      title="Selecionar/Desselecionar todos"
                    />
                  </th>
                  <th>Nome</th>
                  <th className="d-none d-md-table-cell">Email</th>
                  <th className="d-none d-lg-table-cell">Telefone</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th className="d-none d-xl-table-cell">Último Login</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length > 0 ? (
                  usuarios.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedUsers[user.id] || false}
                          onChange={() => handleToggleUser(user.id)}
                        />
                      </td>
                      <td>
                        {getTipoIcon(user.tipo_usuario)}
                        {user.nome}
                      </td>
                      <td className="d-none d-md-table-cell">{user.email}</td>
                      <td className="d-none d-lg-table-cell">{user.telefone || '-'}</td>
                      <td>{getTipoBadge(user.tipo_usuario)}</td>
                      <td>{getStatusBadge(user.status)}</td>
                      <td className="d-none d-xl-table-cell">
                        {user.ultimo_login
                          ? new Date(user.ultimo_login).toLocaleString('pt-BR')
                          : 'Nunca acessou'}
                      </td>
                      <td className="text-center">
                        <div className="d-flex gap-1 justify-content-center flex-wrap">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleView(user)}
                            title="Visualizar Detalhes"
                          >
                            <FaEye />
                          </Button>
                          <Button
                            variant="warning"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            title="Editar Usuário"
                            disabled={loadingEdit}
                          >
                            {loadingEdit ? (
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                            ) : (
                              <FaEdit />
                            )}
                          </Button>
                          <Button
                            variant="info"
                            size="sm"
                            onClick={() => handleChangePassword(user)}
                            title="Alterar Senha"
                          >
                            <FaKey />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(user)}
                            title="Deletar Usuário"
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
            </div>

            {/* Paginação */}
            {!isLoading && pagination.totalPages > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-3 px-3 pb-2 flex-wrap gap-2">
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
            )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal Criar/Editar Usuário */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedUser ? 'Editar Usuário' : 'Novo Usuário'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col xs={12} md={6} className="mb-3 mb-md-0">
                <Form.Group className="mb-3">
                  <Form.Label>Nome Completo *</Form.Label>
                  <Form.Control
                    type="text"
                    name="nome"
                    defaultValue={selectedUser?.nome}
                    required
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6} className="mb-3 mb-md-0">
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    defaultValue={selectedUser?.email}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            {!selectedUser && (
              <Row>
                <Col xs={12} md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Senha *</Form.Label>
                    <Form.Control
                      type="password"
                      name="senha"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>
            )}

            <Row>
              <Col xs={12} sm={6} md={6} className="mb-3 mb-md-0">
                <Form.Group className="mb-3">
                  <Form.Label>Telefone</Form.Label>
                  <Form.Control
                    type="tel"
                    name="telefone"
                    defaultValue={selectedUser?.telefone}
                    placeholder="(00) 00000-0000"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={6} className="mb-3 mb-md-0">
                <Form.Group className="mb-3">
                  <Form.Label>Data de Nascimento</Form.Label>
                  <Form.Control
                    type="date"
                    name="data_nascimento"
                    defaultValue={selectedUser?.data_nascimento}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>CEP</Form.Label>
                  <Form.Control
                    type="text"
                    name="cep"
                    defaultValue={selectedUser?.cep || ''}
                    placeholder="00000-000"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Rua/Logradouro</Form.Label>
                  <Form.Control
                    type="text"
                    name="rua"
                    defaultValue={selectedUser?.rua || ''}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Número</Form.Label>
                  <Form.Control
                    type="text"
                    name="numero"
                    defaultValue={selectedUser?.numero || ''}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Complemento</Form.Label>
                  <Form.Control
                    type="text"
                    name="complemento"
                    defaultValue={selectedUser?.complemento || ''}
                    placeholder="Apto, bloco, etc"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Bairro</Form.Label>
                  <Form.Control
                    type="text"
                    name="bairro"
                    defaultValue={selectedUser?.bairro || ''}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Cidade</Form.Label>
                  <Form.Control
                    type="text"
                    name="cidade"
                    defaultValue={selectedUser?.cidade || ''}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} md={1}>
                <Form.Group className="mb-3">
                  <Form.Label>UF</Form.Label>
                  <Form.Control
                    type="text"
                    name="estado"
                    defaultValue={selectedUser?.estado || ''}
                    maxLength="2"
                    placeholder="AM"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col xs={12} sm={6} md={6} className="mb-3 mb-md-0">
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Usuário *</Form.Label>
                  <Form.Select
                    name="tipo_usuario"
                    defaultValue={selectedUser?.tipo_usuario || ''}
                    onChange={handleUserTypeChange}
                    required
                  >
                    {!selectedUser && <option value="">Selecione o tipo de usuário...</option>}
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="admin">Administrador</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={6} className="mb-3 mb-md-0">
                <Form.Group className="mb-3">
                  <Form.Label>Status *</Form.Label>
                  <Form.Select
                    name="status"
                    defaultValue={selectedUser?.status || 'ativo'}
                    required
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="suspenso">Suspenso</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Campos específicos para ALUNO */}
            {selectedUserType === 'aluno' && (
              <>
                <hr />
                <Row>
                  <Col md={12}>
                    <h6 className="text-muted mb-3">Dados Acadêmicos</h6>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} sm={6} md={3} className="mb-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Modalidade *</Form.Label>
                      <Form.Select
                        name="programa"
                        defaultValue={selectedUser?.programa || 'Adultos'}
                        required={selectedUserType === 'aluno'}
                      >
                        <option value="Adultos">Adultos</option>
                        <option value="Infantil">Infantil</option>
                        <option value="Juvenil">Juvenil</option>
                        <option value="Master">Master</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={3} className="mb-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Graduação *</Form.Label>
                      <Form.Select
                        name="graduacao"
                        defaultValue={selectedUser?.graduacao || 'Branca'}
                        required={selectedUserType === 'aluno'}
                      >
                        <option value="Branca">Branca</option>
                        <option value="Azul">Azul</option>
                        <option value="Roxa">Roxa</option>
                        <option value="Marrom">Marrom</option>
                        <option value="Preta">Preta</option>
                        <option value="Coral">Coral</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={3} className="mb-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Graus na Faixa</Form.Label>
                      <Form.Control
                        type="number"
                        name="graus_faixa"
                        defaultValue={selectedUser?.graus_faixa || 0}
                        min="0"
                        max="4"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} sm={6} md={3} className="mb-3">
                    <Form.Group className="mb-3">
                      <Form.Label>Data de Início *</Form.Label>
                      <Form.Control
                        type="date"
                        name="data_inicio"
                        defaultValue={selectedUser?.data_inicio || new Date().toISOString().split('T')[0]}
                        required={selectedUserType === 'aluno'}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <Form.Group className="mb-3">
                      <Form.Label>Plano</Form.Label>
                      <Form.Select
                        name="plano_id"
                        defaultValue={selectedUser?.plano_id || ''}
                      >
                        <option value="">Selecione um plano</option>
                        {plans.map(plan => (
                          <option key={plan.id} value={plan.id}>
                            {plan.nome} - {formatCurrency(plan.valor_mensal)}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <Form.Group className="mb-3">
                      <Form.Label>Professor Responsável</Form.Label>
                      <Form.Select
                        name="professor_responsavel"
                        defaultValue={selectedUser?.professor_responsavel || ''}
                      >
                        <option value="">Selecione um professor</option>
                        {teachers.map(teacher => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.nome}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <hr />

                <Row>
                  <Col xs={12} md={12}>
                    <h6 className="text-muted mb-3">Informações Adicionais</h6>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email do Responsável</Form.Label>
                      <Form.Control
                        type="email"
                        name="email_responsavel"
                        defaultValue={selectedUser?.email_responsavel || ''}
                        placeholder="Para menores de idade"
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome do Contato de Emergência</Form.Label>
                      <Form.Control
                        type="text"
                        name="nome_contato_emergencia"
                        defaultValue={selectedUser?.nome_contato_emergencia || ''}
                        placeholder="Ex: Maria Silva"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contato de Emergência</Form.Label>
                      <Form.Control
                        type="text"
                        name="contato_emergencia"
                        defaultValue={selectedUser?.contato_emergencia || ''}
                        placeholder="Ex: Mãe: (11) 99999-9999 / Pai: (11) 88888-8888"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={12}>
                    <h6 className="text-muted mb-3 mt-3">Informações Médicas</h6>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tipo Sanguíneo</Form.Label>
                      <Form.Select
                        name="tipo_sanguineo"
                        defaultValue={selectedUser?.tipo_sanguineo || ''}
                      >
                        <option value="">Selecione</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Toma Medicamento?</Form.Label>
                      <Form.Select
                        name="toma_medicamento"
                        defaultValue={selectedUser?.toma_medicamento ? '1' : '0'}
                      >
                        <option value="0">Não</option>
                        <option value="1">Sim</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Detalhes dos Medicamentos</Form.Label>
                      <Form.Control
                        type="text"
                        name="medicamentos_detalhes"
                        defaultValue={selectedUser?.medicamentos_detalhes || ''}
                        placeholder="Quais medicamentos e dosagem"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Histórico de Fraturas?</Form.Label>
                      <Form.Select
                        name="historico_fraturas"
                        defaultValue={selectedUser?.historico_fraturas ? '1' : '0'}
                      >
                        <option value="0">Não</option>
                        <option value="1">Sim</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={9}>
                    <Form.Group className="mb-3">
                      <Form.Label>Detalhes das Fraturas</Form.Label>
                      <Form.Control
                        type="text"
                        name="fraturas_detalhes"
                        defaultValue={selectedUser?.fraturas_detalhes || ''}
                        placeholder="Quais membros e quando ocorreu"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tem Alergias?</Form.Label>
                      <Form.Select
                        name="tem_alergias"
                        defaultValue={selectedUser?.tem_alergias ? '1' : '0'}
                      >
                        <option value="0">Não</option>
                        <option value="1">Sim</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={9}>
                    <Form.Group className="mb-3">
                      <Form.Label>Detalhes das Alergias</Form.Label>
                      <Form.Control
                        type="text"
                        name="alergias_detalhes"
                        defaultValue={selectedUser?.alergias_detalhes || ''}
                        placeholder="Quais alergias (medicamentos, alimentos, etc)"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Observações Médicas Gerais</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="observacoes_medicas"
                        defaultValue={selectedUser?.observacoes_medicas || ''}
                        placeholder="Outras observações médicas importantes"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}

            {/* Campos específicos para PROFESSOR */}
            {selectedUserType === 'professor' && (
              <>
                <hr />
                <Row>
                  <Col md={12}>
                    <h6 className="text-muted mb-3">Dados do Professor</h6>
                  </Col>
                </Row>

                <Row>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <Form.Group className="mb-3">
                      <Form.Label>Especialidade</Form.Label>
                      <Form.Control
                        type="text"
                        name="especialidade"
                        defaultValue={selectedUser?.especialidade || ''}
                        placeholder="Ex: Jiu-Jitsu, Muay Thai, Funcional..."
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <Form.Group className="mb-3">
                      <Form.Label>Graduação</Form.Label>
                      <Form.Select
                        name="graduacao_professor"
                        defaultValue={selectedUser?.graduacao_professor || 'Branca'}
                      >
                        <option value="Branca">Branca</option>
                        <option value="Azul">Azul</option>
                        <option value="Roxa">Roxa</option>
                        <option value="Marrom">Marrom</option>
                        <option value="Preta">Preta</option>
                        <option value="Coral">Coral</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit">
              {selectedUser ? 'Atualizar' : 'Criar'} Usuário
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Alterar Senha */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Alterar Senha - {selectedUser?.nome}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePasswordSubmit}>
          <Modal.Body>
            <div className="mb-3 d-flex gap-2">
              <Button
                variant="primary"
                type="button"
                onClick={generateRandomPassword}
                className="w-100"
              >
                <FaRandom className="me-2" />
                Gerar Senha Aleatória
              </Button>
            </div>

            {generatedPassword && (
              <div className="alert alert-success">
                <strong>Senha Gerada:</strong>
                <div className="d-flex align-items-center gap-2 mt-2">
                  <code className="flex-grow-1 bg-white p-2 rounded border">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPassword);
                      toast.success('Senha copiada!');
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <small className="text-muted d-block mt-2">
                  Esta senha será enviada por email ao usuário após a confirmação.
                </small>
              </div>
            )}

            {!generatedPassword && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Nova Senha</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword ? "text" : "password"}
                      name="nova_senha"
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                      required={!generatedPassword}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Confirmar Senha</Form.Label>
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    name="confirmar_senha"
                    placeholder="Digite a senha novamente"
                    minLength={6}
                    required={!generatedPassword}
                  />
                </Form.Group>
              </>
            )}

            <div className="alert alert-info mt-3">
              <small>
                <strong>Atenção:</strong> Ao alterar a senha, um email será enviado automaticamente
                ao usuário com as novas credenciais de acesso.
              </small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
              Cancelar
            </Button>
            <Button variant="warning" type="submit">
              <FaKey className="me-2" />
              Alterar Senha
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Visualizar Usuário */}
      <UserViewModal
        show={showViewModal}
        handleClose={() => setShowViewModal(false)}
        user={selectedViewUser}
      />
    </Container>
  );
};

export default Users;
