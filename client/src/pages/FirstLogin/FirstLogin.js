import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaLock, FaKey, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './FirstLogin.css';

const FirstLogin = () => {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(null);

  // Validar força da senha
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    let strength = 0;
    let feedback = [];

    // Comprimento
    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback.push('mínimo 8 caracteres');
    }

    // Maiúsculas
    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('uma letra maiúscula');
    }

    // Minúsculas
    if (/[a-z]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('uma letra minúscula');
    }

    // Números
    if (/\d/.test(password)) {
      strength += 25;
    } else {
      feedback.push('um número');
    }

    let level = 'weak';
    let color = 'danger';
    let label = 'Fraca';

    if (strength >= 75) {
      level = 'strong';
      color = 'success';
      label = 'Forte';
    } else if (strength >= 50) {
      level = 'medium';
      color = 'warning';
      label = 'Média';
    }

    setPasswordStrength({
      strength,
      level,
      color,
      label,
      feedback
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'newPassword') {
      checkPasswordStrength(value);
    }
  };

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      setError('Digite sua senha temporária');
      return false;
    }

    if (!formData.newPassword.trim()) {
      setError('Digite a nova senha');
      return false;
    }

    if (formData.newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (!/[A-Z]/.test(formData.newPassword)) {
      setError('A nova senha deve conter pelo menos uma letra maiúscula');
      return false;
    }

    if (!/[a-z]/.test(formData.newPassword)) {
      setError('A nova senha deve conter pelo menos uma letra minúscula');
      return false;
    }

    if (!/\d/.test(formData.newPassword)) {
      setError('A nova senha deve conter pelo menos um número');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('A nova senha deve ser diferente da senha temporária');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await authService.firstLoginChangePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      // Atualizar dados do usuário
      await checkAuthStatus();

      // Redirecionar para aceite LGPD ou dashboard
      navigate('/lgpd-consent', { replace: true });

    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha. Verifique sua senha temporária.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="first-login-page">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col lg={5} md={7}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-5">
                {/* Logo/Header */}
                <div className="text-center mb-4">
                  <div className="icon-circle mb-3">
                    <FaKey size={40} />
                  </div>
                  <h3 className="text-gb-red mb-2">Primeiro Acesso</h3>
                  <p className="text-muted">
                    Bem-vindo à <strong>Gracie Barra Cidade Nova</strong>!
                  </p>
                  <p className="text-muted small">
                    Por segurança, você deve alterar sua senha temporária.
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <FaLock className="me-2" />
                      Senha Temporária
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      placeholder="Digite a senha recebida no email"
                      autoFocus
                    />
                    <Form.Text className="text-muted">
                      A senha enviada no email de boas-vindas
                    </Form.Text>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>
                      <FaKey className="me-2" />
                      Nova Senha
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Digite sua nova senha"
                    />
                    {passwordStrength && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Força da senha:</small>
                          <small className={`text-${passwordStrength.color} fw-bold`}>
                            {passwordStrength.label}
                          </small>
                        </div>
                        <div className="progress" style={{ height: '5px' }}>
                          <div
                            className={`progress-bar bg-${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.strength}%` }}
                          ></div>
                        </div>
                        {passwordStrength.feedback.length > 0 && (
                          <small className="text-danger d-block mt-1">
                            Falta: {passwordStrength.feedback.join(', ')}
                          </small>
                        )}
                      </div>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>
                      <FaCheckCircle className="me-2" />
                      Confirmar Nova Senha
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Digite a senha novamente"
                    />
                  </Form.Group>

                  {/* Requisitos */}
                  <Alert variant="info" className="small mb-4">
                    <strong>Requisitos da senha:</strong>
                    <ul className="mb-0 mt-2 ps-3">
                      <li>Mínimo de 8 caracteres</li>
                      <li>Pelo menos uma letra maiúscula</li>
                      <li>Pelo menos uma letra minúscula</li>
                      <li>Pelo menos um número</li>
                    </ul>
                  </Alert>

                  <Button
                    type="submit"
                    variant="danger"
                    size="lg"
                    className="w-100"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Alterando senha...
                      </>
                    ) : (
                      <>
                        <FaKey className="me-2" />
                        Alterar Senha e Continuar
                      </>
                    )}
                  </Button>
                </Form>
              </Card.Body>
            </Card>

            {/* Rodapé */}
            <div className="text-center mt-3">
              <small className="text-muted">
                Após alterar a senha, você precisará aceitar os termos LGPD
              </small>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default FirstLogin;
