import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal } from 'react-bootstrap';
import { FaMoneyBillWave, FaQrcode, FaCopy, FaCheckCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { studentPaymentService } from '../../services/api';
import DependenteSelector from './DependenteSelector';
import './StudentPayments.css';

const StudentPayments = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mensalidades, setMensalidades] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixData, setPixData] = useState(null);
  const [loadingPix, setLoadingPix] = useState(false);
  const [selectedMensalidade, setSelectedMensalidade] = useState(null);
  const [confirming, setConfirming] = useState(false);

  // Estados para seleção de dependente
  const [selectedDependenteId, setSelectedDependenteId] = useState(null);
  const [isProprioAluno, setIsProprioAluno] = useState(true);

  // Carregamento inicial
  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarregar ao trocar de dependente
  useEffect(() => {
    if (selectedDependenteId !== null) {
      loadPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDependenteId]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      if (selectedDependenteId && !isProprioAluno) {
        // Carregar pagamentos do dependente
        response = await studentPaymentService.getDependentePayments(selectedDependenteId);
      } else {
        // Carregar pagamentos próprios
        response = await studentPaymentService.getMyPayments();
      }

      setMensalidades(response.data.mensalidades || []);
      setResumo(response.data.resumo);
    } catch (err) {
      setError('Erro ao carregar pagamentos: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePix = async (mensalidade) => {
    try {
      setLoadingPix(true);
      setError('');
      setSelectedMensalidade(mensalidade);

      const response = await studentPaymentService.generatePix(mensalidade.id);
      setPixData(response.data);
      setShowPixModal(true);
    } catch (err) {
      setError('Erro ao gerar PIX: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingPix(false);
    }
  };

  const handleCopyPixCode = () => {
    if (pixData?.pix?.payload) {
      navigator.clipboard.writeText(pixData.pix.payload);
      setSuccess('Código PIX copiado para a área de transferência!');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedMensalidade) return;

    try {
      setConfirming(true);
      setError('');

      await studentPaymentService.confirmPayment(selectedMensalidade.id, {
        comprovante_info: 'Pagamento via PIX informado pelo aluno'
      });

      setSuccess('Pagamento informado com sucesso! Aguarde a confirmação da administração.');
      setShowPixModal(false);
      setPixData(null);
      setSelectedMensalidade(null);

      // Recarregar mensalidades
      await loadPayments();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao confirmar pagamento: ' + (err.response?.data?.error || err.message));
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (statusLabel, dataVencimento) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);

    if (statusLabel === 'Pago') {
      return <Badge bg="success"><FaCheckCircle className="me-1" /> Pago</Badge>;
    } else if (statusLabel === 'Vencido') {
      return <Badge bg="danger"><FaExclamationTriangle className="me-1" /> Vencido</Badge>;
    } else if (statusLabel === 'Pendente') {
      return <Badge bg="warning" text="dark"><FaClock className="me-1" /> Pendente</Badge>;
    } else {
      return <Badge bg="info">{statusLabel}</Badge>;
    }
  };

  const getDaysRemaining = (dataVencimento) => {
    const hoje = new Date();
    const vencimento = new Date(dataVencimento);
    const diff = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));

    if (diff < 0) {
      return `Vencido há ${Math.abs(diff)} dias`;
    } else if (diff === 0) {
      return 'Vence hoje';
    } else if (diff <= 7) {
      return `Vence em ${diff} dias`;
    } else {
      return '';
    }
  };

  if (loading) {
    return (
      <Container className="student-payments-container">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Carregando pagamentos...</p>
        </div>
      </Container>
    );
  }

  const handleSelectDependente = (dependenteId, ehProprioAluno) => {
    setSelectedDependenteId(dependenteId);
    setIsProprioAluno(ehProprioAluno);
  };

  return (
    <Container className="student-payments-container py-4">
      <div className="page-header mb-4">
        <h2><FaMoneyBillWave className="me-2" /> {isProprioAluno ? 'Meus Pagamentos' : 'Pagamentos do Dependente'}</h2>
        <p className="text-muted">
          {isProprioAluno ? 'Gerencie suas mensalidades e pagamentos' : 'Visualize as mensalidades do dependente'}
        </p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Seletor de Dependentes */}
      <DependenteSelector
        onSelectDependente={handleSelectDependente}
        selectedId={selectedDependenteId}
      />

      {/* Resumo Financeiro */}
      {resumo && (
        <Row className="mb-4">
          <Col md={3} className="mb-3">
            <Card className="summary-card total">
              <Card.Body>
                <div className="summary-icon">
                  <FaMoneyBillWave />
                </div>
                <div className="summary-content">
                  <div className="summary-value">{resumo.total}</div>
                  <div className="summary-label">Total de Mensalidades</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="summary-card success">
              <Card.Body>
                <div className="summary-icon">
                  <FaCheckCircle />
                </div>
                <div className="summary-content">
                  <div className="summary-value">{resumo.pagas}</div>
                  <div className="summary-label">Pagas</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="summary-card warning">
              <Card.Body>
                <div className="summary-icon">
                  <FaClock />
                </div>
                <div className="summary-content">
                  <div className="summary-value">{resumo.pendentes}</div>
                  <div className="summary-label">Pendentes</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3} className="mb-3">
            <Card className="summary-card danger">
              <Card.Body>
                <div className="summary-icon">
                  <FaExclamationTriangle />
                </div>
                <div className="summary-content">
                  <div className="summary-value">{resumo.vencidas}</div>
                  <div className="summary-label">Vencidas</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Valor Total Pendente */}
      {resumo && resumo.valor_total_pendente > 0 && (
        <Alert variant="warning" className="mb-4">
          <strong>Total em aberto:</strong> {formatCurrency(resumo.valor_total_pendente)}
        </Alert>
      )}

      {/* Lista de Mensalidades */}
      <Card className="payments-card">
        <Card.Header>
          <h5 className="mb-0">Histórico de Mensalidades</h5>
        </Card.Header>
        <Card.Body>
          {mensalidades.length === 0 ? (
            <Alert variant="info" className="mb-0">
              Nenhuma mensalidade encontrada.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Mês/Ano</th>
                    <th>Plano</th>
                    <th>Valor</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidades.map((mensalidade) => {
                    const daysInfo = getDaysRemaining(mensalidade.data_vencimento);
                    const canPay = mensalidade.status_pagamento !== 'pago';

                    return (
                      <tr key={mensalidade.id} className={mensalidade.status_label === 'Vencido' ? 'row-vencido' : ''}>
                        <td>
                          <strong>
                            {String(mensalidade.mes_referencia).padStart(2, '0')}/{mensalidade.ano_referencia}
                          </strong>
                        </td>
                        <td>{mensalidade.plano_nome || '-'}</td>
                        <td><strong>{formatCurrency(mensalidade.valor)}</strong></td>
                        <td>
                          {formatDate(mensalidade.data_vencimento)}
                          {daysInfo && (
                            <div className={`text-muted small ${mensalidade.status_label === 'Vencido' ? 'text-danger' : ''}`}>
                              {daysInfo}
                            </div>
                          )}
                        </td>
                        <td>
                          {getStatusBadge(mensalidade.status_label, mensalidade.data_vencimento)}
                        </td>
                        <td className="text-center">
                          {canPay ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleGeneratePix(mensalidade)}
                              disabled={loadingPix}
                            >
                              {loadingPix && selectedMensalidade?.id === mensalidade.id ? (
                                <>
                                  <Spinner animation="border" size="sm" className="me-1" />
                                  Gerando...
                                </>
                              ) : (
                                <>
                                  <FaQrcode className="me-1" />
                                  Gerar PIX
                                </>
                              )}
                            </Button>
                          ) : (
                            <Badge bg="success">Pago</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal PIX */}
      <Modal show={showPixModal} onHide={() => setShowPixModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaQrcode className="me-2" />
            Pagamento via PIX
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pixData && (
            <>
              <div className="payment-details mb-4">
                <h6 className="mb-3">Detalhes do Pagamento</h6>
                <Row>
                  <Col md={6}>
                    <p><strong>Mês/Ano:</strong> {pixData.mensalidade.mes_referencia}/{pixData.mensalidade.ano_referencia}</p>
                    <p><strong>Plano:</strong> {pixData.mensalidade.plano_nome}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Valor:</strong> <span className="text-primary fs-5">{formatCurrency(pixData.mensalidade.valor)}</span></p>
                    <p><strong>Vencimento:</strong> {formatDate(pixData.mensalidade.data_vencimento)}</p>
                  </Col>
                </Row>
              </div>

              <div className="pix-section">
                <h6 className="mb-3">QR Code PIX</h6>
                <div className="text-center mb-4">
                  <img
                    src={pixData.pix.qrcode}
                    alt="QR Code PIX"
                    className="pix-qrcode"
                  />
                  <p className="text-muted mt-2">Escaneie o QR Code com o app do seu banco</p>
                </div>

                <h6 className="mb-3">Código PIX (Copia e Cola)</h6>
                <div className="pix-code-container">
                  <div className="pix-code-text">
                    {pixData.pix.payload}
                  </div>
                  <Button
                    variant="outline-primary"
                    onClick={handleCopyPixCode}
                    className="mt-2 w-100"
                  >
                    <FaCopy className="me-2" />
                    Copiar Código PIX
                  </Button>
                </div>

                <Alert variant="info" className="mt-3 mb-0">
                  <small>
                    <strong>Beneficiário:</strong> {pixData.pix.beneficiario}<br />
                    <strong>Chave PIX (CNPJ):</strong> {pixData.pix.chave_pix}<br />
                    <strong>Identificador:</strong> {pixData.pix.identificador}
                  </small>
                </Alert>
              </div>

              <Alert variant="warning" className="mt-3">
                <strong>Atenção:</strong> Após realizar o pagamento, clique no botão abaixo para informar que o pagamento foi feito. A administração confirmará o recebimento.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPixModal(false)}>
            Fechar
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmPayment}
            disabled={confirming}
          >
            {confirming ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Confirmando...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Já Paguei
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StudentPayments;
