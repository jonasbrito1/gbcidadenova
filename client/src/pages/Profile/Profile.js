import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, InputGroup } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';
import { FaKey, FaEye, FaEyeSlash } from 'react-icons/fa';

const Profile = () => {
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      toast.error('A nova senha deve ser diferente da senha atual');
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      toast.success('Senha alterada com sucesso!');

      // Limpar formulário
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erro ao alterar senha';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Meu Perfil</h2>
          <p className="text-muted">Visualizar e editar informações pessoais</p>
        </Col>
      </Row>

      <Row>
        <Col lg={6} className="mb-4">
          <Card className="card-dashboard">
            <Card.Body>
              <Card.Title>Informações Pessoais</Card.Title>
              <p><strong>Nome:</strong> {user?.nome}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Tipo de Usuário:</strong> {user?.tipo_usuario}</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="card-dashboard">
            <Card.Body>
              <Card.Title className="d-flex align-items-center">
                <FaKey className="text-danger me-2" />
                Alterar Senha
              </Card.Title>
              <Form onSubmit={handlePasswordSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Senha Atual</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword.current ? "text" : "password"}
                      name="currentPassword"
                      placeholder="Digite sua senha atual"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={isChangingPassword}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => togglePasswordVisibility('current')}
                      disabled={isChangingPassword}
                    >
                      {showPassword.current ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Nova Senha</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword.new ? "text" : "password"}
                      name="newPassword"
                      placeholder="Digite sua nova senha"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      minLength={6}
                      required
                      disabled={isChangingPassword}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => togglePasswordVisibility('new')}
                      disabled={isChangingPassword}
                    >
                      {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    Mínimo de 6 caracteres
                  </Form.Text>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Confirmar Nova Senha</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showPassword.confirm ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Digite novamente a nova senha"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      minLength={6}
                      required
                      disabled={isChangingPassword}
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => togglePasswordVisibility('confirm')}
                      disabled={isChangingPassword}
                    >
                      {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <div className="alert alert-info">
                  <small>
                    <strong>Dica de Segurança:</strong> Use uma senha forte que combine letras maiúsculas,
                    minúsculas, números e caracteres especiais.
                  </small>
                </div>

                <Button
                  variant="danger"
                  type="submit"
                  className="w-100"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;
