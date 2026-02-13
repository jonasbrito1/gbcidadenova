import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Form, Modal } from 'react-bootstrap';
import { FaCheckCircle, FaTimesCircle, FaFilter, FaClock, FaCalendar, FaSync, FaCheckDouble, FaBan, FaExclamationTriangle, FaEye } from 'react-icons/fa';
import { frequenciaNovoService } from '../../services/api';

const ValidacaoPresencas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [presencasPendentes, setPresencasPendentes] = useState([]);
  const [turmasAtivas, setTurmasAtivas] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    aluno_nome: '',
    turma_id: '',
    programa: '',
  });
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedPresenca, setSelectedPresenca] = useState(null);
  const [validationAction, setValidationAction] = useState('');
  const [batchAction, setBatchAction] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [processando, setProcessando] = useState(false);

  // Estados para justificativas
  const [activeTab, setActiveTab] = useState('presencas'); // 'presencas' ou 'justificativas'
  const [justificativasPendentes, setJustificativasPendentes] = useState([]);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [selectedJustificativa, setSelectedJustificativa] = useState(null);
  const [justificativaObservacoes, setJustificativaObservacoes] = useState('');
  const [filtrosJustificativas, setFiltrosJustificativas] = useState({
    data_inicio: '',
    data_fim: '',
    aluno_nome: '',
    status: 'pendente'
  });

  // Auto-refresh a cada 30 segundos
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadPresencasPendentes(false); // false = não mostrar loading
      }, 30000); // 30 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, filtros]);

  useEffect(() => {
    loadPresencasPendentes();
    loadTurmasAtivas();
  }, []);

  const loadPresencasPendentes = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await frequenciaNovoService.getPresencasPendentes(filtros);
      setPresencasPendentes(response.data.presencas || []);
      setLastUpdate(new Date());

      // Limpar seleções se a lista mudou
      if (selectedIds.length > 0) {
        const idsValidos = response.data.presencas.map(p => p.id);
        setSelectedIds(prev => prev.filter(id => idsValidos.includes(id)));
      }
    } catch (err) {
      setError('Erro ao carregar presenças pendentes: ' + (err.response?.data?.error || err.message));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const loadTurmasAtivas = async () => {
    try {
      const response = await frequenciaNovoService.getTurmasAtivas();
      setTurmasAtivas(response.data.turmas || []);
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
    }
  };

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  const handleAplicarFiltros = () => {
    loadPresencasPendentes();
  };

  const handleLimparFiltros = () => {
    setFiltros({
      data_inicio: '',
      data_fim: '',
      aluno_nome: '',
      turma_id: '',
      programa: '',
    });
    setTimeout(() => loadPresencasPendentes(), 100);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
    } else {
      setSelectedIds(presencasPendentes.map(p => p.id));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectPresenca = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const openValidationModal = (presenca, action) => {
    setSelectedPresenca(presenca);
    setValidationAction(action);
    setObservacoes('');
    setShowValidationModal(true);
  };

  const openBatchModal = (action) => {
    if (selectedIds.length === 0) {
      setError('Selecione pelo menos uma presença para validar em lote');
      return;
    }
    setBatchAction(action);
    setObservacoes('');
    setShowBatchModal(true);
  };

  const handleValidar = async () => {
    if (!selectedPresenca) return;

    try {
      setProcessando(true);
      setError('');
      setShowValidationModal(false);

      const status_validacao = validationAction === 'aprovar' ? 'validado' : 'rejeitado';

      await frequenciaNovoService.validarPresenca(selectedPresenca.id, {
        status_validacao,
        observacoes
      });

      setSuccess(
        `Presença ${validationAction === 'aprovar' ? 'validada' : 'rejeitada'} com sucesso!`
      );

      // Recarregar lista
      await loadPresencasPendentes();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao processar validação: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessando(false);
      setSelectedPresenca(null);
      setObservacoes('');
    }
  };

  const handleValidarLote = async () => {
    if (selectedIds.length === 0) return;

    try {
      setProcessando(true);
      setError('');
      setShowBatchModal(false);

      const status_validacao = batchAction === 'aprovar' ? 'validado' : 'rejeitado';

      const response = await frequenciaNovoService.validarPresencasLote({
        ids: selectedIds,
        status_validacao,
        observacoes
      });

      setSuccess(
        `${response.data.processados} presença(s) ${batchAction === 'aprovar' ? 'validada(s)' : 'rejeitada(s)'} com sucesso!`
      );

      // Limpar seleções
      setSelectedIds([]);
      setSelectAll(false);

      // Recarregar lista
      await loadPresencasPendentes();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao processar validação em lote: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessando(false);
      setBatchAction('');
      setObservacoes('');
    }
  };

  // Funções para Justificativas
  const loadJustificativasPendentes = async () => {
    try {
      setLoading(true);
      const response = await frequenciaNovoService.getJustificativasPendentes(filtrosJustificativas);
      setJustificativasPendentes(response.data.justificativas || []);
    } catch (err) {
      setError('Erro ao carregar justificativas: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleAnalisarJustificativa = async (id, status, observacoes) => {
    try {
      setProcessando(true);
      setError('');
      setSuccess('');

      await frequenciaNovoService.analisarJustificativa(id, {
        status,
        observacoes_analise: observacoes
      });

      setSuccess(`Justificativa ${status === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso!`);

      // Fechar modal e limpar
      setShowJustificativaModal(false);
      setSelectedJustificativa(null);
      setJustificativaObservacoes('');

      // Recarregar lista
      await loadJustificativasPendentes();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao analisar justificativa: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessando(false);
    }
  };

  const handleFiltroJustificativaChange = (e) => {
    const { name, value } = e.target;
    setFiltrosJustificativas(prev => ({ ...prev, [name]: value }));
  };

  const handleAplicarFiltrosJustificativas = () => {
    loadJustificativasPendentes();
  };

  const handleLimparFiltrosJustificativas = () => {
    setFiltrosJustificativas({
      data_inicio: '',
      data_fim: '',
      aluno_nome: '',
      status: 'pendente'
    });
    setTimeout(() => loadJustificativasPendentes(), 100);
  };

  const openJustificativaModal = (justificativa) => {
    setSelectedJustificativa(justificativa);
    setJustificativaObservacoes('');
    setShowJustificativaModal(true);
  };

  // Effect para carregar justificativas quando a tab muda
  useEffect(() => {
    if (activeTab === 'justificativas' && justificativasPendentes.length === 0) {
      loadJustificativasPendentes();
    }
  }, [activeTab]);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR');
  };

  const formatLastUpdate = () => {
    return lastUpdate.toLocaleTimeString('pt-BR');
  };

  return (
    <Container className="validacao-presencas-container py-4">
      <div className="page-header mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h2><FaCheckCircle className="me-2" /> Validação e Justificativas</h2>
            <p className="text-muted">Valide presenças e analise justificativas de ausências</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <Form.Check
              type="switch"
              id="auto-refresh-switch"
              label="Atualização automática"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="me-3"
            />
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => loadPresencasPendentes()}
              disabled={loading}
            >
              <FaSync className={loading ? 'fa-spin' : ''} /> Atualizar
            </Button>
            <small className="text-muted ms-2">
              Última atualização: {formatLastUpdate()}
            </small>
          </div>
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Tabs de Navegação */}
      <div className="mb-4">
        <Button
          variant={activeTab === 'presencas' ? 'primary' : 'outline-primary'}
          className="me-2"
          onClick={() => setActiveTab('presencas')}
        >
          <FaCheckCircle className="me-1" />
          Validação de Presenças
          {presencasPendentes.length > 0 && (
            <Badge bg="light" text="dark" className="ms-2">{presencasPendentes.length}</Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'justificativas' ? 'primary' : 'outline-primary'}
          onClick={() => setActiveTab('justificativas')}
        >
          <FaExclamationTriangle className="me-1" />
          Justificativas de Ausências
          {justificativasPendentes.filter(j => j.status === 'pendente').length > 0 && (
            <Badge bg="light" text="dark" className="ms-2">
              {justificativasPendentes.filter(j => j.status === 'pendente').length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Conteúdo baseado na tab ativa */}
      {activeTab === 'presencas' && (
        <>
      {/* Filtros */}
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <FaFilter className="me-2" />
            Filtros Avançados
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Data Início</Form.Label>
                <Form.Control
                  type="date"
                  name="data_inicio"
                  value={filtros.data_inicio}
                  onChange={handleFiltroChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Data Fim</Form.Label>
                <Form.Control
                  type="date"
                  name="data_fim"
                  value={filtros.data_fim}
                  onChange={handleFiltroChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Nome do Aluno</Form.Label>
                <Form.Control
                  type="text"
                  name="aluno_nome"
                  placeholder="Buscar por nome..."
                  value={filtros.aluno_nome}
                  onChange={handleFiltroChange}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Turma</Form.Label>
                <Form.Select
                  name="turma_id"
                  value={filtros.turma_id}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todas as turmas</option>
                  {turmasAtivas.map(turma => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome} - {turma.dia_semana} {formatTime(turma.horario_inicio)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Programa</Form.Label>
                <Form.Select
                  name="programa"
                  value={filtros.programa}
                  onChange={handleFiltroChange}
                >
                  <option value="">Todos os programas</option>
                  <option value="Adultos">Adultos</option>
                  <option value="Infantil">Infantil</option>
                  <option value="Juvenil">Juvenil</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={9} className="d-flex align-items-end">
              <div className="w-100 mb-3">
                <Button
                  variant="primary"
                  className="me-2"
                  onClick={handleAplicarFiltros}
                >
                  Aplicar Filtros
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleLimparFiltros}
                >
                  Limpar Filtros
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de Presenças Pendentes */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <h5 className="mb-0">Presenças Pendentes de Validação</h5>
            {presencasPendentes.length > 0 && (
              <Badge bg="warning" text="dark">{presencasPendentes.length} pendente(s)</Badge>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="d-flex gap-2">
              <Badge bg="info">{selectedIds.length} selecionada(s)</Badge>
              <Button
                variant="success"
                size="sm"
                onClick={() => openBatchModal('aprovar')}
                disabled={processando}
              >
                <FaCheckDouble className="me-1" />
                Validar Selecionadas
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => openBatchModal('rejeitar')}
                disabled={processando}
              >
                <FaBan className="me-1" />
                Rejeitar Selecionadas
              </Button>
            </div>
          )}
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Carregando presenças...</p>
            </div>
          ) : presencasPendentes.length === 0 ? (
            <Alert variant="info" className="mb-0">
              Não há presenças pendentes de validação no momento.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>
                      <Form.Check
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th>Data/Hora Registro</th>
                    <th>Aluno</th>
                    <th>Turma</th>
                    <th>Data da Aula</th>
                    <th>Horário</th>
                    <th className="text-center">IP/Local</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {presencasPendentes.map((presenca) => (
                    <tr key={presenca.id}>
                      <td>
                        <Form.Check
                          type="checkbox"
                          checked={selectedIds.includes(presenca.id)}
                          onChange={() => handleSelectPresenca(presenca.id)}
                        />
                      </td>
                      <td>
                        <small className="text-muted">
                          <FaClock className="me-1" />
                          {formatDateTime(presenca.created_at)}
                        </small>
                      </td>
                      <td>
                        <div>
                          <strong>{presenca.aluno_nome}</strong>
                          <br />
                          <small className="text-muted">{presenca.aluno_matricula}</small>
                        </div>
                      </td>
                      <td>
                        {presenca.turma_nome}
                        <br />
                        <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                          {presenca.programa}
                        </Badge>
                      </td>
                      <td>
                        <FaCalendar className="me-1" />
                        {formatDate(presenca.data_aula)}
                      </td>
                      <td>
                        <small className="text-muted">
                          {formatTime(presenca.horario_inicio)} - {formatTime(presenca.horario_fim)}
                        </small>
                      </td>
                      <td className="text-center">
                        <small className="text-muted">
                          {presenca.localizacao_registro || 'N/A'}
                        </small>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="success"
                          size="sm"
                          className="me-1"
                          onClick={() => openValidationModal(presenca, 'aprovar')}
                          disabled={processando}
                        >
                          <FaCheckCircle className="me-1" />
                          Validar
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => openValidationModal(presenca, 'rejeitar')}
                          disabled={processando}
                        >
                          <FaTimesCircle className="me-1" />
                          Rejeitar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal de Confirmação Individual */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {validationAction === 'aprovar' ? 'Validar' : 'Rejeitar'} Presença
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPresenca && (
            <>
              <Alert variant={validationAction === 'aprovar' ? 'success' : 'warning'}>
                Você está prestes a <strong>{validationAction === 'aprovar' ? 'VALIDAR' : 'REJEITAR'}</strong> esta presença:
              </Alert>

              <div className="mb-3">
                <p><strong>Aluno:</strong> {selectedPresenca.aluno_nome}</p>
                <p><strong>Turma:</strong> {selectedPresenca.turma_nome}</p>
                <p><strong>Data:</strong> {formatDate(selectedPresenca.data_aula)}</p>
                <p><strong>Horário:</strong> {formatTime(selectedPresenca.horario_inicio)} - {formatTime(selectedPresenca.horario_fim)}</p>
                <p><strong>Registrado em:</strong> {formatDateTime(selectedPresenca.created_at)}</p>
              </div>

              <Form.Group>
                <Form.Label>Observações {validationAction === 'rejeitar' && <span className="text-danger">*</span>}</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder={
                    validationAction === 'aprovar'
                      ? 'Adicione observações se necessário...'
                      : 'Informe o motivo da rejeição...'
                  }
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </Form.Group>

              {validationAction === 'rejeitar' && !observacoes && (
                <small className="text-danger">Observações são obrigatórias para rejeitar uma presença.</small>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
            Cancelar
          </Button>
          <Button
            variant={validationAction === 'aprovar' ? 'success' : 'danger'}
            onClick={handleValidar}
            disabled={validationAction === 'rejeitar' && !observacoes}
          >
            {validationAction === 'aprovar' ? (
              <>
                <FaCheckCircle className="me-1" />
                Confirmar Validação
              </>
            ) : (
              <>
                <FaTimesCircle className="me-1" />
                Confirmar Rejeição
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Validação em Lote */}
      <Modal show={showBatchModal} onHide={() => setShowBatchModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {batchAction === 'aprovar' ? 'Validar' : 'Rejeitar'} Presenças em Lote
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant={batchAction === 'aprovar' ? 'success' : 'warning'}>
            Você está prestes a <strong>{batchAction === 'aprovar' ? 'VALIDAR' : 'REJEITAR'}</strong>{' '}
            <strong>{selectedIds.length}</strong> presença(s) selecionada(s).
          </Alert>

          <Form.Group>
            <Form.Label>
              Observações {batchAction === 'rejeitar' && <span className="text-danger">*</span>}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder={
                batchAction === 'aprovar'
                  ? 'Adicione observações se necessário...'
                  : 'Informe o motivo da rejeição em lote...'
              }
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </Form.Group>

          {batchAction === 'rejeitar' && !observacoes && (
            <small className="text-danger">
              Observações são obrigatórias para rejeitar presenças.
            </small>
          )}

          <Alert variant="info" className="mt-3 mb-0">
            <small>
              Esta ação será aplicada a todas as {selectedIds.length} presença(s) selecionada(s).
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBatchModal(false)}>
            Cancelar
          </Button>
          <Button
            variant={batchAction === 'aprovar' ? 'success' : 'danger'}
            onClick={handleValidarLote}
            disabled={batchAction === 'rejeitar' && !observacoes}
          >
            {batchAction === 'aprovar' ? (
              <>
                <FaCheckDouble className="me-1" />
                Validar Todas
              </>
            ) : (
              <>
                <FaBan className="me-1" />
                Rejeitar Todas
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
        </>
      )}

      {/* Conteúdo da Tab de Justificativas */}
      {activeTab === 'justificativas' && (
        <>
          {/* Filtros de Justificativas */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <FaFilter className="me-2" />
                Filtros de Justificativas
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Data Início</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_inicio"
                      value={filtrosJustificativas.data_inicio}
                      onChange={handleFiltroJustificativaChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Data Fim</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_fim"
                      value={filtrosJustificativas.data_fim}
                      onChange={handleFiltroJustificativaChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome do Aluno</Form.Label>
                    <Form.Control
                      type="text"
                      name="aluno_nome"
                      placeholder="Buscar por nome..."
                      value={filtrosJustificativas.aluno_nome}
                      onChange={handleFiltroJustificativaChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filtrosJustificativas.status}
                      onChange={handleFiltroJustificativaChange}
                    >
                      <option value="">Todos</option>
                      <option value="pendente">Pendente</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="rejeitado">Rejeitado</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex gap-2">
                <Button variant="primary" size="sm" onClick={handleAplicarFiltrosJustificativas}>
                  <FaFilter className="me-1" /> Aplicar Filtros
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={handleLimparFiltrosJustificativas}>
                  Limpar Filtros
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Lista de Justificativas */}
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaExclamationTriangle className="me-2" />
                  Justificativas de Ausências
                </h5>
                <Badge bg="primary">{justificativasPendentes.length} registros</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Carregando...</span>
                  </Spinner>
                </div>
              ) : justificativasPendentes.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Nenhuma justificativa encontrada com os filtros aplicados.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Matrícula</th>
                        <th>Data da Ausência</th>
                        <th>Motivo</th>
                        <th className="text-center">Status</th>
                        <th>Enviado em</th>
                        <th className="text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {justificativasPendentes.map((just) => (
                        <tr key={just.id}>
                          <td>{just.aluno_nome}</td>
                          <td><small className="text-muted">{just.aluno_matricula}</small></td>
                          <td>{formatDate(just.data_ausencia)}</td>
                          <td>
                            <small className="text-muted">
                              {just.motivo.length > 60 ? just.motivo.substring(0, 60) + '...' : just.motivo}
                            </small>
                          </td>
                          <td className="text-center">
                            {just.status === 'pendente' && (
                              <Badge bg="warning" text="dark">
                                <FaClock className="me-1" />
                                Pendente
                              </Badge>
                            )}
                            {just.status === 'aprovado' && (
                              <Badge bg="success">
                                <FaCheckCircle className="me-1" />
                                Aprovado
                              </Badge>
                            )}
                            {just.status === 'rejeitado' && (
                              <Badge bg="danger">
                                <FaTimesCircle className="me-1" />
                                Rejeitado
                              </Badge>
                            )}
                          </td>
                          <td><small className="text-muted">{formatDateTime(just.created_at)}</small></td>
                          <td className="text-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openJustificativaModal(just)}
                              disabled={just.status !== 'pendente'}
                            >
                              <FaEye className="me-1" />
                              {just.status === 'pendente' ? 'Analisar' : 'Ver Detalhes'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Modal de Análise de Justificativa */}
          <Modal
            show={showJustificativaModal}
            onHide={() => {
              setShowJustificativaModal(false);
              setSelectedJustificativa(null);
              setJustificativaObservacoes('');
            }}
            size="lg"
            centered
          >
            <Modal.Header closeButton>
              <Modal.Title>
                <FaExclamationTriangle className="me-2" />
                Analisar Justificativa
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {selectedJustificativa && (
                <>
                  <Row className="mb-3">
                    <Col md={6}>
                      <strong>Aluno:</strong>
                      <p>{selectedJustificativa.aluno_nome}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Matrícula:</strong>
                      <p>{selectedJustificativa.aluno_matricula}</p>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col md={6}>
                      <strong>Data da Ausência:</strong>
                      <p>{formatDate(selectedJustificativa.data_ausencia)}</p>
                    </Col>
                    <Col md={6}>
                      <strong>Enviado em:</strong>
                      <p>{formatDateTime(selectedJustificativa.created_at)}</p>
                    </Col>
                  </Row>
                  <Row className="mb-3">
                    <Col>
                      <strong>Motivo:</strong>
                      <p className="mt-2 p-3 bg-light rounded">{selectedJustificativa.motivo}</p>
                    </Col>
                  </Row>
                  {selectedJustificativa.anexo_url && (
                    <Row className="mb-3">
                      <Col>
                        <strong>Anexo:</strong>
                        <p>
                          <a href={selectedJustificativa.anexo_url} target="_blank" rel="noopener noreferrer">
                            Ver Anexo
                          </a>
                        </p>
                      </Col>
                    </Row>
                  )}
                  {selectedJustificativa.status === 'pendente' && (
                    <Row>
                      <Col>
                        <Form.Group>
                          <Form.Label>Observações da Análise (opcional)</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={justificativaObservacoes}
                            onChange={(e) => setJustificativaObservacoes(e.target.value)}
                            placeholder="Adicione observações sobre a análise..."
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  )}
                  {selectedJustificativa.status !== 'pendente' && (
                    <>
                      <Row className="mb-3">
                        <Col>
                          <strong>Status:</strong>
                          <p>
                            {selectedJustificativa.status === 'aprovado' ? (
                              <Badge bg="success">Aprovado</Badge>
                            ) : (
                              <Badge bg="danger">Rejeitado</Badge>
                            )}
                          </p>
                        </Col>
                      </Row>
                      {selectedJustificativa.analisado_por_nome && (
                        <Row className="mb-3">
                          <Col>
                            <strong>Analisado por:</strong>
                            <p>{selectedJustificativa.analisado_por_nome}</p>
                          </Col>
                        </Row>
                      )}
                      {selectedJustificativa.observacoes_analise && (
                        <Row>
                          <Col>
                            <strong>Observações da Análise:</strong>
                            <p className="mt-2 p-3 bg-light rounded">{selectedJustificativa.observacoes_analise}</p>
                          </Col>
                        </Row>
                      )}
                    </>
                  )}
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowJustificativaModal(false);
                  setSelectedJustificativa(null);
                  setJustificativaObservacoes('');
                }}
              >
                {selectedJustificativa?.status === 'pendente' ? 'Cancelar' : 'Fechar'}
              </Button>
              {selectedJustificativa?.status === 'pendente' && (
                <>
                  <Button
                    variant="danger"
                    onClick={() => handleAnalisarJustificativa(selectedJustificativa.id, 'rejeitado', justificativaObservacoes)}
                    disabled={processando}
                  >
                    {processando ? (
                      <Spinner as="span" animation="border" size="sm" className="me-1" />
                    ) : (
                      <FaTimesCircle className="me-1" />
                    )}
                    Rejeitar
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => handleAnalisarJustificativa(selectedJustificativa.id, 'aprovado', justificativaObservacoes)}
                    disabled={processando}
                  >
                    {processando ? (
                      <Spinner as="span" animation="border" size="sm" className="me-1" />
                    ) : (
                      <FaCheckCircle className="me-1" />
                    )}
                    Aprovar
                  </Button>
                </>
              )}
            </Modal.Footer>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default ValidacaoPresencas;
