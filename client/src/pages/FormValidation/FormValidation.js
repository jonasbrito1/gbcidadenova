import React, { useState } from 'react';
import { Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaCheckCircle, FaTimesCircle, FaEye, FaUserPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatDate, formatPhone, formatCEP } from '../../utils/formatters';
import axios from 'axios';

// URL base da API
const API_BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : 'http://localhost:4011/api';

const FormValidation = () => {
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Dados de aprovação
  const [approvalData, setApprovalData] = useState({
    valor_mensalidade: '150.00',
    dia_vencimento: '10',
    forma_pagamento: 'dinheiro',
    observacoes: '',
    bolsista: false
  });

  // Buscar formulários pendentes
  const { data: formsData, isLoading, error } = useQuery(
    'pending-forms',
    async () => {
      const token = localStorage.getItem('token');
      console.log('[FormValidation] Token:', token ? 'presente' : 'ausente');

      const response = await axios.get(`${API_BASE_URL}/formularios?status=pendente`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('[FormValidation] Resposta da API:', response.data);
      console.log('[FormValidation] Número de formulários:', Array.isArray(response.data) ? response.data.length : 'não é array');

      return response.data;
    },
    {
      refetchInterval: 30000, // Atualizar a cada 30 segundos
      retry: false,
      onError: (error) => {
        console.error('[FormValidation] Erro ao buscar formulários:', error);
        console.error('[FormValidation] Response:', error.response?.data);
        console.error('[FormValidation] Status:', error.response?.status);
      }
    }
  );

  const forms = formsData || [];

  // Log para debug
  console.log('[FormValidation] Forms:', forms);
  console.log('[FormValidation] isLoading:', isLoading);
  console.log('[FormValidation] error:', error);

  // Visualizar formulário
  const handleView = (form) => {
    setSelectedForm(form);
    setShowModal(true);
  };

  // Abrir modal de aprovação
  const handleApprove = (form) => {
    setSelectedForm(form);
    // Resetar dados de aprovação com valores padrão
    setApprovalData({
      valor_mensalidade: '150.00',
      dia_vencimento: '10',
      forma_pagamento: 'dinheiro',
      observacoes: '',
      bolsista: false
    });
    setShowModal(false);
    setShowApproveModal(true);
  };

  // Confirmar aprovação
  const confirmApprove = async () => {
    // Validações
    const valorMensalidade = parseFloat(approvalData.valor_mensalidade);
    if (!approvalData.bolsista && (!valorMensalidade || valorMensalidade <= 0)) {
      toast.error('Valor da mensalidade inválido');
      return;
    }

    const diaVencimento = parseInt(approvalData.dia_vencimento);
    if (!diaVencimento || diaVencimento < 1 || diaVencimento > 28) {
      toast.error('Dia de vencimento deve estar entre 1 e 28');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');

      await axios.post(
        `${API_BASE_URL}/formularios/${selectedForm.id}/aprovar`,
        {
          valor_mensalidade: approvalData.bolsista ? 0 : valorMensalidade,
          dia_vencimento: diaVencimento,
          forma_pagamento: approvalData.forma_pagamento,
          observacoes: approvalData.observacoes,
          bolsista: approvalData.bolsista
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Cadastro aprovado! Email de boas-vindas enviado ao aluno.');
      queryClient.invalidateQueries('pending-forms');
      setShowApproveModal(false);
      setSelectedForm(null);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao aprovar cadastro');
    } finally {
      setActionLoading(false);
    }
  };

  // Rejeitar formulário
  const handleReject = (form) => {
    setSelectedForm(form);
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE_URL}/formularios/${selectedForm.id}/rejeitar`,
        { observacoes: rejectReason },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success('Cadastro rejeitado');
      queryClient.invalidateQueries('pending-forms');
      setShowRejectModal(false);
      setRejectReason('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao rejeitar cadastro');
    } finally {
      setActionLoading(false);
    }
  };

  // Atualizar campo de aprovação
  const updateApprovalField = (field, value) => {
    setApprovalData(prev => ({ ...prev, [field]: value }));
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="danger" />
        <p className="mt-3 text-muted">Carregando formulários...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="text-dark">Validação de Formulários</h2>
              <p className="text-muted">Aprovar ou rejeitar cadastros públicos</p>
            </div>
            <Badge bg="danger" className="fs-5">
              {forms.length} Pendente{forms.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </Col>
      </Row>

      {/* Mensagem de Erro de Autenticação */}
      {error && (
        <Row className="mb-4">
          <Col>
            <Alert variant="danger">
              <Alert.Heading>Erro ao carregar formulários</Alert.Heading>
              <p>
                {error.response?.status === 403 || error.response?.status === 401
                  ? 'Você não tem permissão para acessar esta página ou sua sessão expirou. Faça login novamente.'
                  : error.response?.data?.error || error.message || 'Erro desconhecido ao buscar formulários'}
              </p>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Tabela de formulários */}
      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              {forms.length === 0 && !error ? (
                <div className="text-center py-5">
                  <FaUserPlus size={60} className="text-muted mb-3" />
                  <p className="text-muted">Nenhum formulário pendente de validação</p>
                </div>
              ) : !error ? (
                <div className="table-responsive">
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Data Envio</th>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Telefone</th>
                        <th>Modalidade</th>
                        <th>Idade</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forms.map((form) => {
                        const age = calculateAge(form.data_nascimento);
                        return (
                          <tr key={form.id}>
                            <td>{formatDate(form.created_at, 'datetime')}</td>
                            <td>
                              <strong>{form.nome}</strong>
                              {age !== null && age < 18 && (
                                <Badge bg="warning" text="dark" className="ms-2">
                                  Menor
                                </Badge>
                              )}
                            </td>
                            <td>{form.email}</td>
                            <td>{formatPhone(form.telefone)}</td>
                            <td>
                              <Badge bg="info">{form.programa}</Badge>
                            </td>
                            <td>{age !== null ? `${age} anos` : '-'}</td>
                            <td>
                              <div className="d-flex gap-1">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => handleView(form)}
                                  title="Visualizar"
                                >
                                  <FaEye />
                                </Button>
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => handleApprove(form)}
                                  title="Aprovar"
                                >
                                  <FaCheckCircle />
                                </Button>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleReject(form)}
                                  title="Rejeitar"
                                >
                                  <FaTimesCircle />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              ) : null}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Visualização */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" scrollable>
        <Modal.Header closeButton>
          <Modal.Title>Detalhes do Cadastro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedForm && (
            <div>
              {/* Dados Pessoais */}
              <div className="mb-4">
                <h5 className="text-danger border-bottom pb-2 mb-3">Dados Pessoais</h5>
                <Row>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Nome:</strong> {selectedForm.nome}
                    </p>
                  </Col>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Email:</strong> {selectedForm.email}
                    </p>
                  </Col>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Telefone:</strong> {formatPhone(selectedForm.telefone)}
                    </p>
                  </Col>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Data de Nascimento:</strong> {formatDate(selectedForm.data_nascimento)}
                      {' '}({calculateAge(selectedForm.data_nascimento)} anos)
                    </p>
                  </Col>
                  {selectedForm.email_responsavel && (
                    <Col xs={12} md={6} className="mb-3 mb-md-0">
                      <p>
                        <strong>Email Responsável:</strong> {selectedForm.email_responsavel}
                      </p>
                    </Col>
                  )}
                </Row>
              </div>

              {/* Endereço */}
              <div className="mb-4">
                <h5 className="text-primary border-bottom pb-2 mb-3">Endereço</h5>
                <Row>
                  <Col xs={12} md={12} className="mb-3 mb-md-0">
                    <p>
                      <strong>CEP:</strong> {formatCEP(selectedForm.cep)}
                    </p>
                  </Col>
                  <Col xs={12} sm={8} md={8} className="mb-3 mb-md-0">
                    <p>
                      <strong>Rua:</strong> {selectedForm.rua}
                    </p>
                  </Col>
                  <Col xs={12} sm={4} md={4} className="mb-3 mb-md-0">
                    <p>
                      <strong>Número:</strong> {selectedForm.numero}
                    </p>
                  </Col>
                  {selectedForm.complemento && (
                    <Col xs={12} md={12} className="mb-3 mb-md-0">
                      <p>
                        <strong>Complemento:</strong> {selectedForm.complemento}
                      </p>
                    </Col>
                  )}
                  <Col xs={12} sm={4} md={4} className="mb-3 mb-md-0">
                    <p>
                      <strong>Bairro:</strong> {selectedForm.bairro}
                    </p>
                  </Col>
                  <Col xs={12} sm={6} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Cidade:</strong> {selectedForm.cidade}
                    </p>
                  </Col>
                  <Col xs={12} sm={2} md={2} className="mb-3 mb-md-0">
                    <p>
                      <strong>UF:</strong> {selectedForm.estado}
                    </p>
                  </Col>
                </Row>
              </div>

              {/* Dados Acadêmicos */}
              <div className="mb-4">
                <h5 className="text-danger border-bottom pb-2 mb-3">Dados Acadêmicos</h5>
                <Row>
                  <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
                    <p>
                      <strong>Modalidade:</strong> {selectedForm.programa}
                    </p>
                  </Col>
                  <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
                    <p>
                      <strong>Graduação:</strong> {selectedForm.graduacao}
                    </p>
                  </Col>
                  <Col xs={12} sm={12} md={4} className="mb-3 mb-md-0">
                    <p>
                      <strong>Data Início:</strong> {formatDate(selectedForm.data_inicio)}
                    </p>
                  </Col>
                </Row>
              </div>

              {/* Contato de Emergência */}
              <div className="mb-4">
                <h5 className="text-primary border-bottom pb-2 mb-3">Contato de Emergência</h5>
                <Row>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Nome:</strong> {selectedForm.nome_contato_emergencia || '-'}
                    </p>
                  </Col>
                  <Col xs={12} md={6} className="mb-3 mb-md-0">
                    <p>
                      <strong>Telefone:</strong> {formatPhone(selectedForm.contato_emergencia)}
                    </p>
                  </Col>
                </Row>
              </div>

              {/* Informações Médicas */}
              <div className="mb-4">
                <h5 className="text-danger border-bottom pb-2 mb-3">Informações Médicas</h5>
                <Row>
                  <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
                    <p>
                      <strong>Tipo Sanguíneo:</strong> {selectedForm.tipo_sanguineo || '-'}
                    </p>
                  </Col>
                  <Col xs={12} md={12} className="mb-3 mb-md-0">
                    <p>
                      <strong>Medicamentos:</strong>{' '}
                      {selectedForm.toma_medicamento ? (
                        <span className="text-warning">
                          Sim - {selectedForm.medicamentos_detalhes}
                        </span>
                      ) : (
                        'Não'
                      )}
                    </p>
                  </Col>
                  <Col xs={12} md={12} className="mb-3 mb-md-0">
                    <p>
                      <strong>Histórico de Fraturas:</strong>{' '}
                      {selectedForm.historico_fraturas ? (
                        <span className="text-warning">
                          Sim - {selectedForm.fraturas_detalhes}
                        </span>
                      ) : (
                        'Não'
                      )}
                    </p>
                  </Col>
                  <Col xs={12} md={12} className="mb-3 mb-md-0">
                    <p>
                      <strong>Alergias:</strong>{' '}
                      {selectedForm.tem_alergias ? (
                        <span className="text-warning">
                          Sim - {selectedForm.alergias_detalhes}
                        </span>
                      ) : (
                        'Não'
                      )}
                    </p>
                  </Col>
                  {selectedForm.observacoes_medicas && (
                    <Col xs={12} md={12} className="mb-3 mb-md-0">
                      <p>
                        <strong>Observações:</strong> {selectedForm.observacoes_medicas}
                      </p>
                    </Col>
                  )}
                </Row>
              </div>

              {/* Info de Submissão */}
              <div className="bg-light p-3 rounded">
                <p className="mb-1">
                  <strong>Enviado em:</strong> {formatDate(selectedForm.created_at, 'datetime')}
                </p>
                <p className="mb-0">
                  <strong>IP de Origem:</strong> {selectedForm.ip_origem}
                </p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowModal(false)}
          >
            Fechar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setShowModal(false);
              handleReject(selectedForm);
            }}
            disabled={actionLoading}
          >
            <FaTimesCircle className="me-2" />
            Rejeitar
          </Button>
          <Button
            variant="success"
            onClick={() => handleApprove(selectedForm)}
            disabled={actionLoading}
          >
            <FaCheckCircle className="me-2" />
            Aprovar Cadastro
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Rejeição */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rejeitar Cadastro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Você está prestes a rejeitar o cadastro de <strong>{selectedForm?.nome}</strong>
          </Alert>
          <Form.Group>
            <Form.Label>Motivo da Rejeição *</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowRejectModal(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmReject}
            disabled={actionLoading || !rejectReason.trim()}
          >
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Rejeitando...
              </>
            ) : (
              <>
                <FaTimesCircle className="me-2" />
                Confirmar Rejeição
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Aprovação */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Aprovar Cadastro - {selectedForm?.nome}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            Você está prestes a aprovar o cadastro e criar o aluno no sistema.
            Configure abaixo os dados de matrícula.
          </Alert>

          <Form>
            {/* Mensalidade Padrão */}
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Mensalidade</Form.Label>
              <div className="p-3 border rounded bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-bold text-dark">Mensalidade Padrão</span>
                  <span className="text-danger fw-bold fs-5">R$ 150,00</span>
                </div>
                {approvalData.bolsista && (
                  <div className="mt-2">
                    <Badge bg="success">Aluno Bolsista - Isento de Mensalidade</Badge>
                  </div>
                )}
              </div>
            </Form.Group>

            {/* Checkbox Bolsista */}
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                id="bolsista"
                label="Aluno Bolsista (isento de mensalidade)"
                checked={approvalData.bolsista}
                onChange={(e) => updateApprovalField('bolsista', e.target.checked)}
              />
            </Form.Group>

            {/* Valor Customizado da Mensalidade (se não for bolsista) */}
            {!approvalData.bolsista && (
              <Form.Group className="mb-3">
                <Form.Label>Valor Customizado da Mensalidade (Opcional)</Form.Label>
                <div className="input-group">
                  <span className="input-group-text">R$</span>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    value={approvalData.valor_mensalidade}
                    onChange={(e) => updateApprovalField('valor_mensalidade', e.target.value)}
                    placeholder="150.00"
                  />
                </div>
                <Form.Text className="text-muted">
                  Deixe vazio para usar o valor padrão (R$ 150,00) ou insira um valor específico
                </Form.Text>
              </Form.Group>
            )}

            <Row>
              {/* Dia de Vencimento */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Dia de Vencimento *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="28"
                    value={approvalData.dia_vencimento}
                    onChange={(e) => updateApprovalField('dia_vencimento', e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    Dia do mês para vencimento (1 a 28)
                  </Form.Text>
                </Form.Group>
              </Col>

              {/* Forma de Pagamento */}
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Forma de Pagamento *</Form.Label>
                  <Form.Select
                    value={approvalData.forma_pagamento}
                    onChange={(e) => updateApprovalField('forma_pagamento', e.target.value)}
                    required
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Observações */}
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={approvalData.observacoes}
                onChange={(e) => updateApprovalField('observacoes', e.target.value)}
                placeholder="Observações sobre a aprovação (opcional)..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowApproveModal(false)}
            disabled={actionLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={confirmApprove}
            disabled={actionLoading || !approvalData.plano_id}
          >
            {actionLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Aprovando...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Confirmar Aprovação
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default FormValidation;
