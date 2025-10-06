import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Form, Modal, InputGroup } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { userService } from '../../services/api';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaKey, FaUserShield, FaUserGraduate, FaUser } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Users = () => {
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [filters, setFilters] = useState({
    tipo: '',
    status: '',
    search: ''
  });

  // Query
  const { data: usuariosData, isLoading, refetch } = useQuery(
    ['usuarios', filters],
    () => userService.getUsers(filters),
    {
      onError: (error) => {
        console.error('Erro ao carregar usuários:', error);
        toast.error('Erro ao carregar usuários');
      }
    }
  );

  const usuarios = usuariosData?.data?.users || usuariosData?.data || [];

  const handleCreate = () => {
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setShowModal(true);
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
    setShowPasswordModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const userData = {
      nome: formData.get('nome'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      data_nascimento: formData.get('data_nascimento'),
      endereco: formData.get('endereco'),
      tipo_usuario: formData.get('tipo_usuario'),
      status: formData.get('status')
    };

    if (!selectedUser) {
      userData.senha = formData.get('senha');
    }

    try {
      if (selectedUser) {
        await userService.updateUser(selectedUser.id, userData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await userService.createUser(userData);
        toast.success('Usuário criado com sucesso!');
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
    const newPassword = formData.get('nova_senha');
    const confirmPassword = formData.get('confirmar_senha');

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    try {
      await userService.updateUser(selectedUser.id, {
        ...selectedUser,
        senha: newPassword
      });
      toast.success('Senha alterada com sucesso!');
      setShowPasswordModal(false);
    } catch (error) {
      toast.error('Erro ao alterar senha');
    }
  };

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
          <h2 className="text-danger">Usuários</h2>
          <p className="text-muted">Gerenciamento completo de usuários do sistema</p>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
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
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Tipo</Form.Label>
                <Form.Select
                  value={filters.tipo}
                  onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="admin">Administrador</option>
                  <option value="professor">Professor</option>
                  <option value="aluno">Aluno</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="suspenso">Suspenso</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button variant="danger" onClick={handleCreate} className="w-100">
                <FaPlus className="me-2" />Novo Usuário
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <Card.Body>
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-danger" role="status" />
            </div>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Telefone</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Último Login</th>
                  <th className="text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length > 0 ? (
                  usuarios.map((user) => (
                    <tr key={user.id}>
                      <td>
                        {getTipoIcon(user.tipo_usuario)}
                        {user.nome}
                      </td>
                      <td>{user.email}</td>
                      <td>{user.telefone || '-'}</td>
                      <td>{getTipoBadge(user.tipo_usuario)}</td>
                      <td>{getStatusBadge(user.status)}</td>
                      <td>
                        {user.ultimo_login
                          ? new Date(user.ultimo_login).toLocaleString('pt-BR')
                          : 'Nunca acessou'}
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="me-2"
                          onClick={() => handleEdit(user)}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="outline-warning"
                          size="sm"
                          className="me-2"
                          onClick={() => handleChangePassword(user)}
                        >
                          <FaKey />
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleDelete(user)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
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
              <Col md={6}>
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
              <Col md={6}>
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
                <Col md={12}>
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
              <Col md={6}>
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
              <Col md={6}>
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
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Endereço</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="endereco"
                    defaultValue={selectedUser?.endereco}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Usuário *</Form.Label>
                  <Form.Select
                    name="tipo_usuario"
                    defaultValue={selectedUser?.tipo_usuario || 'aluno'}
                    required
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="admin">Administrador</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
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
            <Form.Group className="mb-3">
              <Form.Label>Nova Senha</Form.Label>
              <Form.Control
                type="password"
                name="nova_senha"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Confirmar Senha</Form.Label>
              <Form.Control
                type="password"
                name="confirmar_senha"
                placeholder="Digite a senha novamente"
                minLength={6}
                required
              />
            </Form.Group>
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
    </Container>
  );
};

export default Users;
