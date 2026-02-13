import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup, Spinner } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import { FaLock, FaKey, FaCheckCircle, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const resetToken = params.get('token');

      if (!resetToken) {
        setError('Link inválido. Solicite uma nova recuperação de senha.');
        setVerifying(false);
        return;
      }

      setToken(resetToken);

      try {
        const response = await authService.verifyResetToken(resetToken);
        setTokenValid(true);
        setUserEmail(response.data.email);
      } catch (err) {
        setError('Link expirado ou inválido. Solicite uma nova recuperação de senha.');
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, []);

  // Check password strength (copied from FirstLogin.js)
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(null);
      return;
    }

    let strength = 0;
    let feedback = [];

    // Length
    if (password.length >= 8) {
      strength += 25;
    } else {
      feedback.push('mínimo 8 caracteres');
    }

    // Uppercase
    if (/[A-Z]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('uma letra maiúscula');
    }

    // Lowercase
    if (/[a-z]/.test(password)) {
      strength += 25;
    } else {
      feedback.push('uma letra minúscula');
    }

    // Numbers
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

    // Clear errors
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    if (!formData.newPassword) {
      setError('Senha é obrigatória');
      return false;
    }

    if (formData.newPassword.length < 8) {
      setError('Senha deve ter no mínimo 8 caracteres');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      await authService.confirmPasswordReset({
        token,
        newPassword: formData.newPassword
      });

      setSuccess(true);
      toast.success('Senha redefinida com sucesso!');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      if (err.response?.data?.errors) {
        // Backend validation errors
        const backendErrors = err.response.data.errors;
        const errorMessages = backendErrors.map(e => e.msg).join('. ');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.error || 'Erro ao redefinir senha. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modern-login-container">
      <div className="login-background"></div>

      <Container fluid className="d-flex align-items-center justify-content-center min-vh-100">
        <Row className="w-100 justify-content-center">
          <Col xs={12} sm={10} md={8} lg={5} xl={4}>
            <Card className="modern-login-card shadow-lg border-0">
              <Card.Body className="p-4 p-md-5">
                {/* Verifying State */}
                {verifying && (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="danger" className="mb-3" />
                    <p className="text-muted">Verificando link de recuperação...</p>
                  </div>
                )}

                {/* Invalid Token State */}
                {!verifying && !tokenValid && (
                  <>
                    <div className="text-center mb-4">
                      <div className="icon-circle mx-auto mb-3 bg-danger-subtle">
                        <FaLock size={40} className="text-danger" />
                      </div>
                      <h2 className="login-title mb-2">Link Inválido</h2>
                    </div>

                    <Alert variant="danger">
                      {error}
                    </Alert>

                    <div className="d-grid mb-3">
                      <Link to="/forgot-password" className="btn btn-danger btn-lg modern-login-btn">
                        <FaKey className="me-2" />
                        Solicitar Nova Recuperação
                      </Link>
                    </div>

                    <div className="text-center mt-3">
                      <Link to="/login" className="text-danger text-decoration-none">
                        Voltar para o Login
                      </Link>
                    </div>
                  </>
                )}

                {/* Valid Token - Show Form */}
                {!verifying && tokenValid && !success && (
                  <>
                    <div className="text-center mb-4">
                      <div className="icon-circle mx-auto mb-3">
                        <FaLock size={40} />
                      </div>
                      <h2 className="login-title mb-2">Criar Nova Senha</h2>
                      <p className="text-muted small">
                        Para: <strong>{userEmail}</strong>
                      </p>
                    </div>

                    {error && (
                      <Alert variant="danger" className="mb-4">
                        {error}
                      </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                      {/* New Password Field */}
                      <Form.Group className="mb-3">
                        <Form.Label className="modern-label">
                          <FaKey className="me-2" />
                          Nova Senha
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type={showPassword ? "text" : "password"}
                            name="newPassword"
                            value={formData.newPassword}
                            onChange={handleChange}
                            placeholder="Digite sua nova senha"
                            required
                            disabled={loading}
                            className="modern-input"
                            autoComplete="new-password"
                            autoFocus
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={loading}
                            className="password-toggle-btn"
                            type="button"
                          >
                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>

                        {/* Password Strength Indicator */}
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

                      {/* Confirm Password Field */}
                      <Form.Group className="mb-4">
                        <Form.Label className="modern-label">
                          <FaCheckCircle className="me-2" />
                          Confirmar Nova Senha
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Digite a senha novamente"
                            required
                            disabled={loading}
                            className="modern-input"
                            autoComplete="new-password"
                          />
                          <Button
                            variant="outline-secondary"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            disabled={loading}
                            className="password-toggle-btn"
                            type="button"
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </Button>
                        </InputGroup>
                        {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                          <small className="text-success d-block mt-1">
                            <FaCheckCircle className="me-1" />
                            As senhas coincidem
                          </small>
                        )}
                      </Form.Group>

                      {/* Password Requirements Info */}
                      <Alert variant="info" className="small mb-4">
                        <strong>Recomendações de senha:</strong>
                        <ul className="mb-0 mt-2 ps-3">
                          <li>Mínimo de 8 caracteres</li>
                          <li>Pelo menos uma letra maiúscula</li>
                          <li>Pelo menos uma letra minúscula</li>
                          <li>Pelo menos um número</li>
                        </ul>
                        <p className="mb-0 mt-2 fst-italic">
                          <small>Você pode criar qualquer senha com no mínimo 8 caracteres.</small>
                        </p>
                      </Alert>

                      {/* Submit Button */}
                      <div className="d-grid">
                        <Button
                          type="submit"
                          variant="danger"
                          size="lg"
                          disabled={loading}
                          className="modern-login-btn"
                        >
                          {loading ? (
                            <>
                              <FaSpinner className="me-2 spin" />
                              Redefinindo...
                            </>
                          ) : (
                            <>
                              <FaLock className="me-2" />
                              Redefinir Senha
                            </>
                          )}
                        </Button>
                      </div>
                    </Form>
                  </>
                )}

                {/* Success State */}
                {success && (
                  <>
                    <div className="text-center mb-4">
                      <div className="icon-circle mx-auto mb-3 bg-success-subtle">
                        <FaCheckCircle size={40} className="text-success" />
                      </div>
                      <h2 className="login-title mb-2 text-success">Senha Redefinida!</h2>
                    </div>

                    <Alert variant="success" className="mb-4">
                      <strong>Sucesso!</strong> Sua senha foi redefinida com sucesso.
                      <p className="mb-0 mt-2">
                        Redirecionando para o login em 3 segundos...
                      </p>
                    </Alert>

                    <div className="text-center">
                      <Spinner animation="border" variant="success" size="sm" className="me-2" />
                      <span className="text-muted small">Aguarde...</span>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ResetPassword;
