import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaKey, FaEnvelope, FaSpinner, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { authService } from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  // Security: Input sanitization
  const sanitizeInput = (input) => {
    return input.trim().replace(/[<>]/g, '');
  };

  // Security: Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
  };

  const handleChange = (e) => {
    const sanitizedValue = sanitizeInput(e.target.value);
    setEmail(sanitizedValue);

    // Clear field error
    if (fieldError) {
      setFieldError('');
    }
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setError('');
    setFieldError('');

    // Validate email
    if (!email) {
      setFieldError('Email é obrigatório');
      return;
    }

    if (!validateEmail(email)) {
      setFieldError('Email inválido');
      return;
    }

    try {
      setLoading(true);

      // Call API to request password reset
      await authService.requestPasswordReset(email);

      // Always show success for security (don't reveal if email exists)
      setSuccess(true);
      setEmail(''); // Clear form

    } catch (err) {
      // Only show network errors
      if (!err.response) {
        setError('Erro de conexão. Verifique sua internet.');
      } else {
        // Still show success message for security
        setSuccess(true);
        setEmail('');
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
                {/* Header */}
                <div className="text-center mb-4">
                  <div className="icon-circle mx-auto mb-3">
                    <FaKey size={40} />
                  </div>
                  <h2 className="login-title mb-2">Esqueceu sua Senha?</h2>
                  <p className="text-muted small">
                    Sem problemas! Digite seu email e enviaremos instruções para redefinir sua senha.
                  </p>
                </div>

                {/* Success Message */}
                {success && (
                  <Alert variant="success" className="d-flex align-items-center mb-4">
                    <FaCheckCircle className="me-2" size={20} />
                    <div>
                      <strong>Email enviado!</strong>
                      <p className="mb-0 mt-1 small">
                        Verifique sua caixa de entrada e spam. O link expira em 1 hora.
                      </p>
                    </div>
                  </Alert>
                )}

                {/* Error Message */}
                {error && (
                  <Alert variant="danger" className="mb-4">
                    {error}
                  </Alert>
                )}

                {!success && (
                  <Form onSubmit={handleSubmit}>
                    {/* Email Field */}
                    <Form.Group className="mb-4">
                      <Form.Label className="modern-label">
                        <FaEnvelope className="me-2" />
                        Email
                      </Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={email}
                        onChange={handleChange}
                        placeholder="Digite seu email cadastrado"
                        required
                        disabled={loading}
                        className={`modern-input ${fieldError ? 'is-invalid' : ''}`}
                        autoComplete="email"
                        autoFocus
                      />
                      {fieldError && (
                        <Form.Control.Feedback type="invalid" className="d-block">
                          {fieldError}
                        </Form.Control.Feedback>
                      )}
                      <Form.Text className="text-muted small">
                        Digite o email que você usou para criar sua conta
                      </Form.Text>
                    </Form.Group>

                    {/* Submit Button */}
                    <div className="d-grid mb-3">
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
                            Enviando...
                          </>
                        ) : (
                          <>
                            <FaKey className="me-2" />
                            Enviar Link de Recuperação
                          </>
                        )}
                      </Button>
                    </div>
                  </Form>
                )}

                {/* Back to Login */}
                <div className="text-center mt-4">
                  <Link
                    to="/login"
                    className="text-danger text-decoration-none d-inline-flex align-items-center"
                  >
                    <FaArrowLeft className="me-2" size={14} />
                    Voltar para o Login
                  </Link>
                </div>

                {/* Security Info */}
                <div className="mt-4 pt-4 border-top">
                  <p className="text-muted text-center small mb-0">
                    <FaCheckCircle className="me-1" size={12} />
                    Suas informações estão seguras e protegidas
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ForgotPassword;
