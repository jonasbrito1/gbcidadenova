import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaCreditCard, FaBarcode, FaLock, FaArrowLeft } from 'react-icons/fa';
import { SiPix } from 'react-icons/si';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { toast } from 'react-toastify';
import './Checkout.css';

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const planData = location.state;

  const [step, setStep] = useState(1); // 1: Payment, 2: Account Creation
  const [paymentType, setPaymentType] = useState('credit'); // credit, debit, pix
  const [formData, setFormData] = useState({
    // Payment data
    cardNumber: '',
    cardName: '',
    cardExpiry: '',
    cardCvv: '',
    installments: '1',

    // User account data
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    cpf: '',
    phone: '',
    acceptTerms: false
  });

  const [errors, setErrors] = useState({});
  const [pixData, setPixData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!planData) {
      navigate('/');
    }
  }, [planData, navigate]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setFormData(prev => ({ ...prev, cardNumber: formatted }));
  };

  const validatePaymentForm = () => {
    const newErrors = {};

    if (paymentType === 'credit' || paymentType === 'debit') {
      if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 16) {
        newErrors.cardNumber = 'Número do cartão inválido';
      }
      if (!formData.cardName || formData.cardName.length < 3) {
        newErrors.cardName = 'Nome do titular é obrigatório';
      }
      if (!formData.cardExpiry || !/^\d{2}\/\d{2}$/.test(formData.cardExpiry)) {
        newErrors.cardExpiry = 'Data de validade inválida (MM/AA)';
      }
      if (!formData.cardCvv || formData.cardCvv.length < 3) {
        newErrors.cardCvv = 'CVV inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateAccountForm = () => {
    const newErrors = {};

    if (!formData.fullName || formData.fullName.length < 3) {
      newErrors.fullName = 'Nome completo é obrigatório';
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.cpf || formData.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = 'CPF inválido';
    }
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = 'Telefone inválido';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Senha deve ter no mínimo 6 caracteres';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'Você deve aceitar os termos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (paymentType === 'pix') {
      // Generate PIX QR Code
      setLoading(true);
      setTimeout(() => {
        setPixData({
          qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          code: '00020126580014br.gov.bcb.pix0136' + Math.random().toString(36).substring(7),
          value: planData?.price || 0
        });
        setLoading(false);
        setStep(2);
      }, 1500);
      return;
    }

    if (!validatePaymentForm()) {
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    if (!validateAccountForm()) {
      return;
    }

    setLoading(true);

    try {
      // Here you would make API calls to:
      // 1. Process payment
      // 2. Create user account
      // 3. Activate subscription

      setTimeout(() => {
        alert('Cadastro realizado com sucesso! Bem-vindo à Gracie Barra!');
        navigate('/login');
      }, 2000);

    } catch (error) {
      setErrors({ submit: 'Erro ao processar pagamento. Tente novamente.' });
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011';

      const response = await axios.post(`${API_URL}/api/auth/google/token`, {
        token: credentialResponse.credential
      });

      if (response.data.token) {
        // Salvar token e usuário no localStorage
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        toast.success('Conta criada/vinculada com Google com sucesso!');

        // TODO: Criar assinatura e vincular ao usuário

        // Redirecionar para dashboard
        setTimeout(() => {
          navigate('/app/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error('Erro no cadastro Google:', error);
      setErrors({ submit: 'Erro ao cadastrar com Google. Tente novamente.' });
      toast.error('Erro ao cadastrar com Google');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrors({ submit: 'Erro ao conectar com Google' });
    toast.error('Falha na autenticação do Google');
  };

  const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '362730662899-1b3rg8vldr8uvqb9s2rr9cqbsm5hmtfg.apps.googleusercontent.com';

  if (!planData) return null;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="checkout-page">
      <Container className="py-5">
        <Button
          variant="link"
          className="mb-4 text-decoration-none"
          onClick={() => navigate('/')}
        >
          <FaArrowLeft className="me-2" />
          Voltar para planos
        </Button>

        <Row className="justify-content-center">
          <Col lg={8}>
            <Card className="checkout-card shadow">
              <Card.Body className="p-4">
                {/* Progress Steps */}
                <div className="checkout-steps mb-4">
                  <div className={`step ${step >= 1 ? 'active' : ''}`}>
                    <div className="step-number">1</div>
                    <div className="step-label">Pagamento</div>
                  </div>
                  <div className="step-line"></div>
                  <div className={`step ${step >= 2 ? 'active' : ''}`}>
                    <div className="step-number">2</div>
                    <div className="step-label">Cadastro</div>
                  </div>
                </div>

                {/* Plan Summary */}
                <Card className="mb-4 bg-light">
                  <Card.Body>
                    <h5 className="mb-3">Resumo do Plano</h5>
                    <div className="d-flex justify-content-between mb-2">
                      <span>{planData?.planName}</span>
                      <strong>R$ {planData?.price}</strong>
                    </div>
                    {planData?.discount > 0 && (
                      <div className="d-flex justify-content-between text-success">
                        <span>Desconto</span>
                        <strong>- R$ {planData?.discount}</strong>
                      </div>
                    )}
                    <hr />
                    <div className="d-flex justify-content-between">
                      <strong>Total</strong>
                      <strong className="text-danger">R$ {planData?.price}</strong>
                    </div>
                  </Card.Body>
                </Card>

                {/* Step 1: Payment */}
                {step === 1 && (
                  <Form onSubmit={handlePaymentSubmit}>
                    <h4 className="mb-4">Forma de Pagamento</h4>

                    {/* Payment Type Selection */}
                    <div className="payment-type-selector mb-4">
                      <Button
                        variant={paymentType === 'credit' ? 'danger' : 'outline-secondary'}
                        className="me-2 mb-2"
                        onClick={() => setPaymentType('credit')}
                      >
                        <FaCreditCard className="me-2" />
                        Crédito
                      </Button>
                      <Button
                        variant={paymentType === 'debit' ? 'danger' : 'outline-secondary'}
                        className="me-2 mb-2"
                        onClick={() => setPaymentType('debit')}
                      >
                        <FaCreditCard className="me-2" />
                        Débito
                      </Button>
                      <Button
                        variant={paymentType === 'pix' ? 'danger' : 'outline-secondary'}
                        className="mb-2"
                        onClick={() => setPaymentType('pix')}
                      >
                        <SiPix className="me-2" />
                        PIX
                      </Button>
                    </div>

                    {/* Credit/Debit Card Form */}
                    {(paymentType === 'credit' || paymentType === 'debit') && (
                      <>
                        <Form.Group className="mb-3">
                          <Form.Label>Número do Cartão</Form.Label>
                          <Form.Control
                            type="text"
                            name="cardNumber"
                            value={formData.cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="0000 0000 0000 0000"
                            maxLength="19"
                            isInvalid={!!errors.cardNumber}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.cardNumber}
                          </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3">
                          <Form.Label>Nome no Cartão</Form.Label>
                          <Form.Control
                            type="text"
                            name="cardName"
                            value={formData.cardName}
                            onChange={handleInputChange}
                            placeholder="Como está no cartão"
                            isInvalid={!!errors.cardName}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.cardName}
                          </Form.Control.Feedback>
                        </Form.Group>

                        <Row>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label>Validade</Form.Label>
                              <Form.Control
                                type="text"
                                name="cardExpiry"
                                value={formData.cardExpiry}
                                onChange={handleInputChange}
                                placeholder="MM/AA"
                                maxLength="5"
                                isInvalid={!!errors.cardExpiry}
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.cardExpiry}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                          <Col md={4}>
                            <Form.Group className="mb-3">
                              <Form.Label>CVV</Form.Label>
                              <Form.Control
                                type="text"
                                name="cardCvv"
                                value={formData.cardCvv}
                                onChange={handleInputChange}
                                placeholder="123"
                                maxLength="4"
                                isInvalid={!!errors.cardCvv}
                              />
                              <Form.Control.Feedback type="invalid">
                                {errors.cardCvv}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                          {paymentType === 'credit' && (
                            <Col md={4}>
                              <Form.Group className="mb-3">
                                <Form.Label>Parcelas</Form.Label>
                                <Form.Select
                                  name="installments"
                                  value={formData.installments}
                                  onChange={handleInputChange}
                                >
                                  <option value="1">1x de R$ {planData?.price}</option>
                                  <option value="2">2x de R$ {(planData?.price / 2).toFixed(2)}</option>
                                  <option value="3">3x de R$ {(planData?.price / 3).toFixed(2)}</option>
                                </Form.Select>
                              </Form.Group>
                            </Col>
                          )}
                        </Row>

                        <Alert variant="info" className="d-flex align-items-center">
                          <FaLock className="me-2" />
                          Pagamento 100% seguro e criptografado
                        </Alert>
                      </>
                    )}

                    {/* PIX Information */}
                    {paymentType === 'pix' && !pixData && (
                      <Alert variant="info">
                        <SiPix className="me-2" />
                        <strong>Pagamento via PIX</strong>
                        <p className="mb-0 mt-2">
                          Ao clicar em "Continuar", você receberá um QR Code para realizar o pagamento.
                          O pagamento é instantâneo e você será redirecionado automaticamente.
                        </p>
                      </Alert>
                    )}

                    {/* PIX QR Code */}
                    {paymentType === 'pix' && pixData && (
                      <div className="text-center">
                        <Alert variant="success">
                          <h5>Escaneie o QR Code abaixo</h5>
                          <div className="my-3">
                            <div className="qr-code-placeholder bg-white p-3 d-inline-block">
                              <div style={{ width: '200px', height: '200px', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                QR Code PIX
                              </div>
                            </div>
                          </div>
                          <p>Ou copie o código PIX:</p>
                          <Form.Control
                            type="text"
                            value={pixData.code}
                            readOnly
                            className="text-center mb-2"
                          />
                          <Button variant="outline-success" size="sm">
                            <FaBarcode className="me-2" />
                            Copiar Código
                          </Button>
                        </Alert>
                      </div>
                    )}

                    <Button
                      variant="danger"
                      size="lg"
                      className="w-100"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? 'Processando...' : 'Continuar para Cadastro'}
                    </Button>
                  </Form>
                )}

                {/* Step 2: Account Creation */}
                {step === 2 && (
                  <Form onSubmit={handleFinalSubmit}>
                    <h4 className="mb-4">Criar sua Conta</h4>

                    {/* Google Sign Up */}
                    <div className="mb-3">
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={handleGoogleError}
                        theme="outline"
                        size="large"
                        text="signup_with"
                        shape="rectangular"
                        width="100%"
                        disabled={loading}
                      />
                    </div>

                    <div className="text-center mb-3">
                      <span className="text-muted">ou cadastre-se com email</span>
                    </div>

                    <Form.Group className="mb-3">
                      <Form.Label>Nome Completo</Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        isInvalid={!!errors.fullName}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.fullName}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        isInvalid={!!errors.email}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.email}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>CPF</Form.Label>
                          <Form.Control
                            type="text"
                            name="cpf"
                            value={formData.cpf}
                            onChange={handleInputChange}
                            placeholder="000.000.000-00"
                            isInvalid={!!errors.cpf}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.cpf}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Telefone</Form.Label>
                          <Form.Control
                            type="text"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="(00) 00000-0000"
                            isInvalid={!!errors.phone}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.phone}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Senha</Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        isInvalid={!!errors.password}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.password}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Confirmar Senha</Form.Label>
                      <Form.Control
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        isInvalid={!!errors.confirmPassword}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.confirmPassword}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        name="acceptTerms"
                        checked={formData.acceptTerms}
                        onChange={handleInputChange}
                        label="Aceito os termos de uso e política de privacidade"
                        isInvalid={!!errors.acceptTerms}
                        feedback={errors.acceptTerms}
                        feedbackType="invalid"
                      />
                    </Form.Group>

                    {errors.submit && (
                      <Alert variant="danger">{errors.submit}</Alert>
                    )}

                    <div className="d-grid gap-2">
                      <Button
                        variant="danger"
                        size="lg"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'Finalizando...' : 'Finalizar Cadastro'}
                      </Button>
                      <Button
                        variant="outline-secondary"
                        onClick={() => setStep(1)}
                        disabled={loading}
                      >
                        Voltar
                      </Button>
                    </div>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
    </GoogleOAuthProvider>
  );
};

export default Checkout;
