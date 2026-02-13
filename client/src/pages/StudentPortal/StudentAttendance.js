import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Form, Modal, ProgressBar } from 'react-bootstrap';
import { FaCheckCircle, FaCalendarCheck, FaClock, FaChartLine, FaTrophy, FaHourglassHalf, FaAward, FaExclamationTriangle } from 'react-icons/fa';
import { frequenciaNovoService, studentProfileService, studentAttendanceService } from '../../services/api';
import ScheduleGrid from '../../components/ScheduleGrid/ScheduleGrid';
import DependenteSelector from './DependenteSelector';
import './StudentAttendance.css';

const StudentAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [graduationProgress, setGraduationProgress] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [checkingIn, setCheckingIn] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [userPrograma, setUserPrograma] = useState(null);

  // Estados para seleção de dependente
  const [selectedDependenteId, setSelectedDependenteId] = useState(null);
  const [isProprioAluno, setIsProprioAluno] = useState(true);

  // Justificativas
  const [justificativas, setJustificativas] = useState([]);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [justificativaData, setJustificativaData] = useState('');
  const [justificativaMotivo, setJustificativaMotivo] = useState('');
  const [enviandoJustificativa, setEnviandoJustificativa] = useState(false);

  // Carregamento inicial
  useEffect(() => {
    loadAvailableClasses();
    loadAttendanceHistory();
    loadGraduationProgress();
    loadUserPrograma();
    loadJustificativas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarregar ao trocar de dependente
  useEffect(() => {
    if (selectedDependenteId !== null) {
      loadAttendanceHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDependenteId]);

  // Recarregar histórico ao mudar mês/ano
  useEffect(() => {
    loadAttendanceHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const loadAvailableClasses = async () => {
    try {
      setLoading(true);
      const response = await frequenciaNovoService.getTurmasDisponiveis();
      const turmas = response.data.turmas || [];

      console.log('[StudentAttendance] Turmas disponíveis carregadas:', {
        total: turmas.length,
        data_atual: response.data.data_atual,
        hora_atual: response.data.hora_atual,
        dia_semana: response.data.dia_semana,
        turmas: turmas.map(t => ({
          id: t.id,
          nome: t.nome,
          horario: `${t.horario_inicio} - ${t.horario_fim}`,
          pode_registrar: t.pode_registrar,
          ja_registrou: t.ja_registrou_hoje,
          mensagem: t.mensagem
        }))
      });

      setAvailableClasses(turmas);
    } catch (err) {
      console.error('[StudentAttendance] Erro ao carregar turmas:', err);
      setError('Erro ao carregar turmas disponíveis: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      let response;
      if (selectedDependenteId && !isProprioAluno) {
        // Carregar histórico do dependente
        response = await studentAttendanceService.getDependenteHistory(selectedDependenteId, {
          mes: selectedMonth,
          ano: selectedYear
        });
        setAttendanceHistory(response.data.frequencias || []);
      } else {
        // Carregar histórico próprio
        response = await frequenciaNovoService.getMinhasPresencas({
          mes: selectedMonth,
          ano: selectedYear
        });
        setAttendanceHistory(response.data.presencas || []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
  };

  const loadGraduationProgress = async () => {
    try {
      const response = await frequenciaNovoService.getMeuProgresso();
      setGraduationProgress(response.data);
    } catch (err) {
      console.error('Erro ao carregar progresso de graduação:', err);
    }
  };

  const loadUserPrograma = async () => {
    try {
      const response = await studentProfileService.getMyProfile();
      setUserPrograma(response.data.programa);
    } catch (err) {
      console.error('Erro ao carregar programa do usuário:', err);
    }
  };

  const loadJustificativas = async () => {
    try {
      const response = await frequenciaNovoService.getMinhasJustificativas();
      setJustificativas(response.data.justificativas || []);
    } catch (err) {
      console.error('Erro ao carregar justificativas:', err);
    }
  };

  const handleJustificarAusencia = async () => {
    if (!justificativaData || !justificativaMotivo) {
      setError('Data e motivo são obrigatórios');
      return;
    }

    try {
      setEnviandoJustificativa(true);
      setError('');
      setShowJustificativaModal(false);

      await frequenciaNovoService.justificarAusencia({
        data_ausencia: justificativaData,
        motivo: justificativaMotivo
      });

      setSuccess('Justificativa enviada com sucesso! Aguarde a análise.');

      // Limpar campos
      setJustificativaData('');
      setJustificativaMotivo('');

      // Recarregar justificativas
      await loadJustificativas();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao enviar justificativa: ' + (err.response?.data?.error || err.message));
    } finally {
      setEnviandoJustificativa(false);
    }
  };

  const handleCheckInClick = (turma) => {
    setSelectedClass(turma);
    setShowConfirmModal(true);
  };

  const handleCheckIn = async () => {
    if (!selectedClass) return;

    try {
      setCheckingIn(true);
      setError('');

      await frequenciaNovoService.registrarPresenca({ turma_id: selectedClass.id });

      setSuccess(`Presença registrada com sucesso! Aguarde a validação do professor.`);

      // Fechar modal após sucesso
      setShowConfirmModal(false);

      // Recarregar dados
      await loadAvailableClasses();
      await loadAttendanceHistory();
      await loadGraduationProgress();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Erro ao registrar presença: ' + (err.response?.data?.error || err.message));
      // Manter modal aberto em caso de erro para o usuário ver a mensagem
    } finally {
      setCheckingIn(false);
      setSelectedClass(null);
    }
  };

  const handleScheduleCheckIn = async (turma) => {
    try {
      setCheckingIn(true);
      setError('');
      setSuccess('');

      console.log('[StudentAttendance] Iniciando registro de presença:', {
        turma_id: turma.id,
        turma_nome: turma.nome || turma.turma,
        turma_completa: turma
      });

      // Validar se turma_id existe
      if (!turma.id) {
        console.error('[StudentAttendance] turma_id não encontrado!', turma);
        setError('Erro: Não foi possível identificar a turma. Por favor, tente novamente.');
        return;
      }

      // Registrar presença via API
      await frequenciaNovoService.registrarPresenca({ turma_id: turma.id });
      setSuccess(`Presença registrada com sucesso! Aguarde a validação do professor.`);

      // Recarregar dados
      await loadAvailableClasses();
      await loadAttendanceHistory();
      await loadGraduationProgress();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('[StudentAttendance] Erro ao registrar presença:', err);
      setError('Erro ao registrar presença: ' + (err.response?.data?.error || err.message));
    } finally {
      setCheckingIn(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5);
  };

  const getMonthName = (month) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[month - 1];
  };

  const getFrequencyColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const getValidationBadge = (status) => {
    switch (status) {
      case 'validado':
        return <Badge bg="success">Validado</Badge>;
      case 'rejeitado':
        return <Badge bg="danger">Rejeitado</Badge>;
      case 'pendente':
      default:
        return <Badge bg="warning">Pendente</Badge>;
    }
  };

  const handleSelectDependente = (dependenteId, ehProprioAluno) => {
    setSelectedDependenteId(dependenteId);
    setIsProprioAluno(ehProprioAluno);
  };

  return (
    <Container className="student-attendance-container py-4">
      <div className="page-header mb-4">
        <h2><FaCalendarCheck className="me-2" /> {isProprioAluno ? 'Minhas Frequências' : 'Frequências do Dependente'}</h2>
        <p className="text-muted">
          {isProprioAluno ? 'Registre sua presença e acompanhe seu histórico' : 'Acompanhe o histórico de frequência do dependente'}
        </p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Seletor de Dependentes */}
      <DependenteSelector
        onSelectDependente={handleSelectDependente}
        selectedId={selectedDependenteId}
      />

      {/* Progresso de Graduação - Apenas para o próprio aluno */}
      {isProprioAluno && graduationProgress && (
        <Card className="mb-4 graduation-progress-card">
          <Card.Header>
            <h5 className="mb-0">
              <FaTrophy className="me-2" />
              Progresso para Graduação
            </h5>
          </Card.Header>
          <Card.Body>
            {/* Graduação Atual */}
            <Row className="mb-4">
              <Col md={6}>
                <div className="current-graduation">
                  <h6 className="text-muted mb-2">Graduacao Atual</h6>
                  <div className="belt-visualization mb-4" style={{ paddingBottom: '30px' }}>
                    <div
                      className="belt-display"
                      style={{
                        '--belt-color': graduationProgress.graduacao_cor || '#666',
                        backgroundColor: graduationProgress.graduacao_cor || '#666',
                        border: graduationProgress.graduacao_atual?.nome === 'Branca' ? '2px solid #ddd' : 'none'
                      }}
                    >
                      {/* Graus da faixa - listras brancas */}
                      {(graduationProgress.graduacao_atual?.graus > 0) && (
                        <div className="belt-degrees">
                          {[...Array(graduationProgress.graduacao_atual.graus)].map((_, index) => (
                            <div key={index} className="degree-stripe"></div>
                          ))}
                        </div>
                      )}
                      {/* Nome da faixa abaixo */}
                      <span className="belt-name">
                        {graduationProgress.graduacao_atual?.nome || graduationProgress.graduacao_atual}
                        {graduationProgress.graduacao_atual?.graus > 0 && ` - ${graduationProgress.graduacao_atual.graus} grau${graduationProgress.graduacao_atual.graus > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                  {graduationProgress.data_ultima_graduacao && (
                    <small className="text-muted d-block text-center">
                      Desde: {formatDate(graduationProgress.data_ultima_graduacao)}
                    </small>
                  )}
                </div>
              </Col>
              <Col md={6}>
                <div className="next-graduation">
                  <h6 className="text-muted mb-2">Proxima Graduacao</h6>
                  {graduationProgress.proxima_graduacao ? (
                    <div className="belt-visualization mb-4" style={{ paddingBottom: '30px' }}>
                      <div
                        className="belt-display"
                        style={{
                          '--belt-color': graduationProgress.proxima_graduacao.cor || '#666',
                          backgroundColor: graduationProgress.proxima_graduacao.cor || '#666',
                          border: graduationProgress.proxima_graduacao.nome === 'Branca' ? '2px solid #ddd' : 'none'
                        }}
                      >
                        {/* Nome da faixa abaixo */}
                        <span className="belt-name">
                          {graduationProgress.proxima_graduacao.nome}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <Alert variant="info" className="mb-0">
                      <FaAward className="me-2" />
                      Voce ja alcancou a graduacao maxima!
                    </Alert>
                  )}
                </div>
              </Col>
            </Row>

            {/* Barra de Progresso para Próxima Graduação */}
            {graduationProgress.proxima_graduacao && (
              <Row className="mb-3">
                <Col>
                  <h6 className="text-muted mb-2">Progresso para {graduationProgress.proxima_graduacao.nome}</h6>
                  <ProgressBar
                    now={graduationProgress.progresso_percentual || 0}
                    label={`${graduationProgress.progresso_percentual || 0}%`}
                    variant="success"
                    style={{ height: '25px', fontSize: '14px' }}
                  />
                  <div className="mt-2 d-flex justify-content-between">
                    <small className="text-muted">
                      <FaCalendarCheck className="me-1" />
                      {graduationProgress.presencas_periodo || 0} de {graduationProgress.presencas_necessarias || 0} treinos
                    </small>
                    <small className="text-muted">
                      <FaClock className="me-1" />
                      {graduationProgress.dias_restantes || 0} dias restantes no período
                    </small>
                  </div>
                </Col>
              </Row>
            )}

            {/* Estatísticas de Progresso */}
            <Row className="mb-4">
              <Col md={4} className="mb-3">
                <div className="progress-stat">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Treinos Validados</span>
                    <strong>{graduationProgress.requisitos?.aulas_realizadas || 0}</strong>
                  </div>
                  <ProgressBar
                    now={((graduationProgress.requisitos?.aulas_realizadas || 0) / (graduationProgress.requisitos?.aulas_necessarias || 1)) * 100}
                    variant="success"
                    label={`${graduationProgress.requisitos?.aulas_realizadas || 0}/${graduationProgress.requisitos?.aulas_necessarias || 0}`}
                  />
                  <small className="text-muted">Mínimo: {graduationProgress.requisitos?.aulas_necessarias || 0} treinos</small>
                </div>
              </Col>
              <Col md={4} className="mb-3">
                <div className="progress-stat">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Tempo na Faixa</span>
                    <strong>{graduationProgress.requisitos?.meses_na_graduacao || 0} meses</strong>
                  </div>
                  <ProgressBar
                    now={((graduationProgress.requisitos?.meses_na_graduacao || 0) / (graduationProgress.requisitos?.tempo_necessario_meses || 1)) * 100}
                    variant="info"
                    label={`${graduationProgress.requisitos?.meses_na_graduacao || 0}/${graduationProgress.requisitos?.tempo_necessario_meses || 0}`}
                  />
                  <small className="text-muted">Mínimo: {graduationProgress.requisitos?.tempo_necessario_meses || 0} meses</small>
                </div>
              </Col>
              <Col md={4} className="mb-3">
                <div className="progress-stat">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Frequência</span>
                    <strong>{graduationProgress.requisitos?.frequencia_atual?.toFixed(1) || 0}%</strong>
                  </div>
                  <ProgressBar
                    now={graduationProgress.requisitos?.frequencia_atual || 0}
                    variant={getFrequencyColor(graduationProgress.requisitos?.frequencia_atual || 0)}
                    label={`${graduationProgress.requisitos?.frequencia_atual?.toFixed(1) || 0}%`}
                  />
                  <small className="text-muted">Mínimo: {graduationProgress.requisitos?.frequencia_necessaria || 75}%</small>
                </div>
              </Col>
            </Row>

            {/* Status de Elegibilidade */}
            <Row>
              <Col>
                <Alert variant={graduationProgress.apto_graduacao ? 'success' : 'info'} className="mb-0">
                  <div className="d-flex align-items-center">
                    {graduationProgress.apto_graduacao ? (
                      <>
                        <FaTrophy className="me-2" size={24} />
                        <div>
                          <strong>Você está apto para graduação!</strong>
                          <p className="mb-0 mt-1">
                            Parabéns! Você atingiu todos os requisitos necessários. Aguarde a próxima cerimônia de graduação.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <FaHourglassHalf className="me-2" size={24} />
                        <div>
                          <strong>Continue treinando!</strong>
                          <p className="mb-0 mt-1">
                            {!graduationProgress.detalhes_aptidao?.tempo && `Você precisa de mais ${(graduationProgress.requisitos?.tempo_necessario_meses || 0) - (graduationProgress.requisitos?.meses_na_graduacao || 0)} meses na faixa atual. `}
                            {!graduationProgress.detalhes_aptidao?.aulas && `Você precisa de mais ${(graduationProgress.requisitos?.aulas_necessarias || 0) - (graduationProgress.requisitos?.aulas_realizadas || 0)} treinos validados. `}
                            {!graduationProgress.detalhes_aptidao?.frequencia && `Você precisa melhorar sua frequência para ${graduationProgress.requisitos?.frequencia_necessaria || 75}%. `}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </Alert>
              </Col>
            </Row>

            {/* Resumo de Presenças */}
            <Row className="mt-3">
              <Col md={4}>
                <div className="stat-box success">
                  <div className="stat-value">{graduationProgress.estatisticas?.presencas_validadas || 0}</div>
                  <div className="stat-label">Presenças Validadas</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="stat-box warning">
                  <div className="stat-value">{graduationProgress.estatisticas?.presencas_pendentes || 0}</div>
                  <div className="stat-label">Aguardando Validação</div>
                </div>
              </Col>
              <Col md={4}>
                <div className="stat-box danger">
                  <div className="stat-value">{graduationProgress.estatisticas?.presencas_rejeitadas || 0}</div>
                  <div className="stat-label">Rejeitadas</div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Grade Completa de Horários - Apenas para o próprio aluno */}
      {isProprioAluno && (
        <ScheduleGrid
          onCheckIn={handleScheduleCheckIn}
          userPrograma={userPrograma}
          availableClasses={availableClasses}
          loading={loading}
        />
      )}

      {/* Histórico */}
      <Card className="history-card">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaCalendarCheck className="me-2" />
            Histórico de Frequências
          </h5>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{ width: 'auto' }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <option key={month} value={month}>{getMonthName(month)}</option>
              ))}
            </Form.Select>
            <Form.Select
              size="sm"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ width: 'auto' }}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body>
          {attendanceHistory.length === 0 ? (
            <Alert variant="info" className="mb-0">
              Nenhum registro de frequência encontrado para o período selecionado.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Turma</th>
                    <th>Horário</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Validação</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((freq, index) => {
                    // Verificar se já existe justificativa para esta data
                    const jaTemJustificativa = justificativas.some(
                      j => new Date(j.data_ausencia).toDateString() === new Date(freq.data_aula).toDateString()
                    );

                    return (
                      <tr key={index}>
                        <td>{formatDate(freq.data_aula)}</td>
                        <td>{freq.turma_nome}</td>
                        <td>
                          <small className="text-muted">
                            {formatTime(freq.horario_inicio)} - {formatTime(freq.horario_fim)}
                          </small>
                        </td>
                        <td className="text-center">
                          {freq.presente ? (
                            <Badge bg="success">
                              <FaCheckCircle className="me-1" />
                              Presente
                            </Badge>
                          ) : (
                            <Badge bg="danger">Falta</Badge>
                          )}
                        </td>
                        <td className="text-center">
                          {getValidationBadge(freq.status_validacao)}
                        </td>
                        <td className="text-center">
                          {!freq.presente && !jaTemJustificativa && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setJustificativaData(freq.data_aula?.split('T')[0] || '');
                                setShowJustificativaModal(true);
                              }}
                            >
                              <FaExclamationTriangle className="me-1" />
                              Justificar
                            </Button>
                          )}
                          {!freq.presente && jaTemJustificativa && (
                            <Badge bg="info" text="dark">
                              <FaExclamationTriangle className="me-1" />
                              Justificado
                            </Badge>
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

      {/* Modal de Confirmação */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Presença</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClass && (
            <>
              <p>Você está prestes a registrar sua presença na turma:</p>
              <div className="confirm-details">
                <p><strong>Turma:</strong> {selectedClass.nome}</p>
                <p><strong>Horário:</strong> {formatTime(selectedClass.horario_inicio)} - {formatTime(selectedClass.horario_fim)}</p>
                {selectedClass.professor_nome && (
                  <p><strong>Professor:</strong> {selectedClass.professor_nome}</p>
                )}
              </div>
              <Alert variant="info" className="mb-0 mt-3">
                Certifique-se de que você está presente no local do treino.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={checkingIn}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleCheckIn} disabled={checkingIn}>
            {checkingIn ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Registrando...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-1" />
                Confirmar Presença
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Justificativa de Ausência */}
      <Modal
        show={showJustificativaModal}
        onHide={() => {
          setShowJustificativaModal(false);
          setJustificativaData('');
          setJustificativaMotivo('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2" />
            Justificar Ausência
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Data da Ausência *</Form.Label>
              <Form.Control
                type="date"
                value={justificativaData}
                onChange={(e) => setJustificativaData(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
              <Form.Text className="text-muted">
                Selecione a data em que você faltou ao treino
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Motivo da Ausência *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={justificativaMotivo}
                onChange={(e) => setJustificativaMotivo(e.target.value)}
                placeholder="Descreva o motivo da sua ausência..."
                required
              />
              <Form.Text className="text-muted">
                Explique detalhadamente o motivo da ausência
              </Form.Text>
            </Form.Group>

            <Alert variant="info" className="mb-0">
              <small>
                Sua justificativa será analisada por um professor ou administrador.
                Você será notificado sobre o resultado da análise.
              </small>
            </Alert>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowJustificativaModal(false);
              setJustificativaData('');
              setJustificativaMotivo('');
            }}
            disabled={enviandoJustificativa}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleJustificarAusencia}
            disabled={enviandoJustificativa || !justificativaData || !justificativaMotivo}
          >
            {enviandoJustificativa ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  className="me-2"
                />
                Enviando...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-1" />
                Enviar Justificativa
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StudentAttendance;
