import React, { useState, useRef, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaShieldAlt, FaLock, FaEnvelope, FaSpinner, FaGoogle } from 'react-icons/fa';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeLeft, setBlockTimeLeft] = useState(0);
  const [fieldErrors, setFieldErrors] = useState({});
  const [csrfToken, setCsrfToken] = useState('');

  const formRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Security: Generate CSRF token
  useEffect(() => {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    setCsrfToken(token);
  }, []);

  // Security: Block after failed attempts
  useEffect(() => {
    if (isBlocked && blockTimeLeft > 0) {
      const timer = setTimeout(() => {
        setBlockTimeLeft(blockTimeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isBlocked && blockTimeLeft === 0) {
      setIsBlocked(false);
      setAttempts(0);
    }
  }, [isBlocked, blockTimeLeft]);

  // Security: Input sanitization
  const sanitizeInput = (input) => {
    return input.trim().replace(/[<>]/g, '');
  };

  // Security: Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  // Security: Password strength validation
  const validatePassword = (password) => {
    return password.length >= 8 && password.length <= 128;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Security: Sanitize inputs
    const sanitizedValue = type === 'checkbox' ? checked : sanitizeInput(value);

    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));

    // Clear field-specific errors
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear general error
    if (error) setError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.email) {
      errors.email = 'Email é obrigatório';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (!validatePassword(formData.password)) {
      errors.password = 'Senha deve ter entre 8 e 128 caracteres';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Security: Check if blocked
    if (isBlocked) {
      setError(`Muitas tentativas. Tente novamente em ${blockTimeLeft} segundos.`);
      return;
    }

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await login(formData.email, formData.password, formData.rememberMe);

      if (result.success) {
        toast.success('Login realizado com sucesso!');
        setAttempts(0);
        // Redirecionamento manual para o dashboard
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 1000);
      } else {
        // Security: Track failed attempts
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
          setIsBlocked(true);
          setBlockTimeLeft(300); // 5 minutes block
          setError('Muitas tentativas falharam. Conta bloqueada por 5 minutos.');
        } else {
          setError(`${result.error}. Tentativas restantes: ${5 - newAttempts}`);
        }
      }
    } catch (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setIsBlocked(true);
        setBlockTimeLeft(300);
        setError('Muitas tentativas falharam. Conta bloqueada por 5 minutos.');
      } else {
        setError(`Erro inesperado. Tentativas restantes: ${5 - newAttempts}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login Success
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011';

      const response = await axios.post(`${API_URL}/api/auth/google/token`, {
        token: credentialResponse.credential
      });

      if (response.data.token) {
        // Salvar token e usuário no localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        toast.success('Login com Google realizado com sucesso!');

        // Atualizar contexto de autenticação
        window.location.href = '/app/dashboard';
      }
    } catch (error) {
      console.error('Erro no login Google:', error);
      setError('Erro ao fazer login com Google. Tente novamente.');
      toast.error('Erro ao fazer login com Google');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Login Error
  const handleGoogleError = () => {
    setError('Erro ao fazer login com Google');
    toast.error('Falha na autenticação do Google');
  };

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '362730662899-1b3rg8vldr8uvqb9s2rr9cqbsm5hmtfg.apps.googleusercontent.com';

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="modern-login-container">
        {/* Background Pattern */}
        <div className="login-background"></div>

        {/* Security Header */}
        <div className="security-header">
          <FaShieldAlt className="me-2" />
          <span>Conexão Segura</span>
        </div>

        <Container fluid className="vh-100 d-flex align-items-center justify-content-center position-relative">
          <Row className="w-100 justify-content-center">
            <Col md={6} lg={5} xl={4}>
              <Card className="modern-login-card shadow-lg border-0">
                <Card.Body className="p-5">
                {/* Logo/Header */}
                <div className="text-center mb-4">
                  <div className="login-logo-container mb-3">
                    <FaShieldAlt className="login-shield-icon text-danger" size={48} />
                  </div>
                  <h2 className="login-title mb-2">Gracie Barra</h2>
                  <p className="login-subtitle">Sistema de Gestão Seguro</p>
                </div>

                {/* Security Status */}
                {attempts > 0 && !isBlocked && (
                  <Alert variant="warning" className="mb-3 security-alert">
                    <FaLock className="me-2" />
                    Tentativas de login: {attempts}/5
                  </Alert>
                )}

                {/* Error Alert */}
                {error && (
                  <Alert
                    variant={isBlocked ? "danger" : "warning"}
                    className="mb-3 modern-alert"
                  >
                    <FaShieldAlt className="me-2" />
                    {error}
                  </Alert>
                )}

                {/* Login Form */}
                <Form ref={formRef} onSubmit={handleSubmit} noValidate>
                  {/* CSRF Token Hidden Field */}
                  <input type="hidden" name="csrf_token" value={csrfToken} />

                  <Form.Group className="mb-4">
                    <Form.Label className="modern-label">
                      <FaEnvelope className="me-2" />
                      Email
                    </Form.Label>
                    <Form.Control
                      ref={emailRef}
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu.email@exemplo.com"
                      required
                      disabled={loading || isBlocked}
                      className={`modern-input ${fieldErrors.email ? 'is-invalid' : ''}`}
                      autoComplete="email"
                      maxLength="254"
                      spellCheck="false"
                    />
                    {fieldErrors.email && (
                      <div className="invalid-feedback">
                        {fieldErrors.email}
                      </div>
                    )}
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="modern-label">
                      <FaLock className="me-2" />
                      Senha
                    </Form.Label>
                    <InputGroup>
                      <Form.Control
                        ref={passwordRef}
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Digite sua senha"
                        required
                        disabled={loading || isBlocked}
                        className={`modern-input ${fieldErrors.password ? 'is-invalid' : ''}`}
                        autoComplete="current-password"
                        maxLength="128"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading || isBlocked}
                        className="password-toggle-btn"
                        type="button"
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                      {fieldErrors.password && (
                        <div className="invalid-feedback">
                          {fieldErrors.password}
                        </div>
                      )}
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Check
                      type="checkbox"
                      name="rememberMe"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                      label="Manter-me conectado por 7 dias"
                      disabled={loading || isBlocked}
                      className="modern-checkbox"
                    />
                  </Form.Group>

                  <div className="d-grid">
                    <Button
                      type="submit"
                      variant="danger"
                      size="lg"
                      disabled={loading || isBlocked}
                      className="modern-login-btn"
                    >
                      {loading ? (
                        <>
                          <FaSpinner className="me-2 spin" />
                          Autenticando...
                        </>
                      ) : (
                        <>
                          <FaLock className="me-2" />
                          Entrar no Sistema
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Divisor */}
                  <div className="text-center my-3">
                    <span className="text-muted">ou</span>
                  </div>

                  {/* Google Login Button */}
                  <div className="d-grid">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      theme="outline"
                      size="large"
                      text="signin_with"
                      shape="rectangular"
                      width="100%"
                      disabled={loading || isBlocked}
                    />
                  </div>
                </Form>

                {/* Security Footer */}
                <div className="text-center mt-4">
                  <div className="security-info">
                    <small className="text-muted d-block mb-2">
                      <FaShieldAlt className="me-1" />
                      Sistema protegido com criptografia SSL/TLS
                    </small>
                    <small className="text-muted">
                      © 2024 Gracie Barra Cidade Nova
                    </small>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
    </GoogleOAuthProvider>
  );
};

export default Login;