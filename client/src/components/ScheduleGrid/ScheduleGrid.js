import React, { useState } from 'react';
import { Card, Badge, Button, Modal, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FaCheckCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import './ScheduleGrid.css';

const ScheduleGrid = ({ onCheckIn, userPrograma, availableClasses = [], loading = false }) => {
  const [selectedClass, setSelectedClass] = useState(null);
  const [showModal, setShowModal] = useState(false);

  console.log('[ScheduleGrid] Turmas disponíveis recebidas:', availableClasses);

  const handleClassClick = (turma) => {
    setSelectedClass(turma);
    setShowModal(true);
  };

  const handleConfirmCheckIn = () => {
    if (!selectedClass) {
      console.error('[ScheduleGrid] Nenhuma turma selecionada');
      return;
    }

    if (!selectedClass.id) {
      console.error('[ScheduleGrid] ID da turma não encontrado:', selectedClass);
      alert('Não foi possível identificar esta turma. Por favor, tente novamente ou contate o administrador.');
      return;
    }

    console.log('[ScheduleGrid] Registrando presença para turma:', selectedClass.id);

    if (onCheckIn) {
      onCheckIn(selectedClass);
    }
    setShowModal(false);
    setSelectedClass(null);
  };

  const getProgramaBadgeColor = (programa) => {
    if (programa === 'Adultos') return 'primary';
    if (programa === 'Infantil') return 'success';
    if (programa === 'Juvenil') return 'info';
    return 'secondary';
  };

  const getNivelFromNome = (nome) => {
    if (!nome) return '';
    if (nome.includes('Iniciante')) return 'Iniciante';
    if (nome.includes('Avançado')) return 'Avançado';
    if (nome.includes('NO GI') || nome.includes('No GI')) return 'No-Gi';
    if (nome.includes('KIDS') || nome.includes('Kids')) return 'Kids';
    if (nome.includes('K2')) return 'K2';
    if (nome.includes('Feminino')) return 'Feminino';
    return '';
  };

  const getEmojiFromNome = (nome) => {
    if (!nome) return '🥋';
    if (nome.includes('NO GI') || nome.includes('No GI')) return '🤼';
    if (nome.includes('KIDS') || nome.includes('Kids') || nome.includes('K2')) return '🧒';
    return '🥋';
  };

  const formatDiaSemana = (dia) => {
    const dias = {
      'segunda': 'Segunda',
      'terca': 'Terça',
      'quarta': 'Quarta',
      'quinta': 'Quinta',
      'sexta': 'Sexta',
      'sabado': 'Sábado',
      'domingo': 'Domingo'
    };
    return dias[dia] || dia;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // Formato: 19:00:00 -> 19:00
    return timeString.substring(0, 5);
  };

  return (
    <>
      <Card className="schedule-grid-card mb-4">
        <Card.Header>
          <h5 className="mb-0">
            <FaClock className="me-2" />
            Turmas Disponíveis Hoje
          </h5>
          <small className="text-muted">Clique em uma turma para registrar sua presença</small>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Carregando turmas...</p>
            </div>
          ) : availableClasses.length === 0 ? (
            <Alert variant="info" className="mb-0">
              <FaExclamationTriangle className="me-2" />
              Nenhuma turma disponível para hoje no seu programa.
            </Alert>
          ) : (
            <>
              <Row className="g-3">
                {availableClasses.map((turma) => {
                  const jaRegistrou = turma.ja_registrou_hoje === 1 || turma.ja_registrou_hoje === true;
                  const podeRegistrar = turma.pode_registrar === true;
                  const isClickable = !jaRegistrou && podeRegistrar;
                  const nivel = getNivelFromNome(turma.nome);
                  const emoji = getEmojiFromNome(turma.nome);

                  return (
                    <Col key={turma.id} xs={12} sm={6} md={4} lg={3}>
                      <Card
                        className={`h-100 turma-card ${isClickable ? 'clickable' : 'disabled'}`}
                        onClick={() => isClickable && handleClassClick(turma)}
                        style={{ cursor: isClickable ? 'pointer' : 'default' }}
                      >
                        <Card.Body className="text-center">
                          <div className="emoji-icon mb-2" style={{ fontSize: '2.5rem' }}>
                            {emoji}
                          </div>
                          <h6 className="card-title mb-2">{turma.nome}</h6>
                          <div className="mb-2">
                            <Badge bg={getProgramaBadgeColor(turma.programa)} className="me-1">
                              {nivel}
                            </Badge>
                          </div>
                          <div className="text-muted small mb-2">
                            <FaClock className="me-1" />
                            {formatTime(turma.horario_inicio)} - {formatTime(turma.horario_fim)}
                          </div>
                          <div className="text-muted small mb-2">
                            {formatDiaSemana(turma.dia_semana)}
                          </div>
                          {turma.professor_nome && (
                            <div className="text-muted small mb-2">
                              Prof. {turma.professor_nome}
                            </div>
                          )}
                          <div className="mt-2">
                            {jaRegistrou ? (
                              <Badge bg="info" className="w-100 py-2">
                                <FaCheckCircle className="me-1" />
                                Presença já registrada
                              </Badge>
                            ) : podeRegistrar ? (
                              <Badge bg="success" className="w-100 py-2">
                                Clique para registrar
                              </Badge>
                            ) : (
                              <Badge bg="secondary" className="w-100 py-2">
                                Não disponível
                              </Badge>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>

              <Alert variant="info" className="mt-3 mb-0">
                <strong>Legenda:</strong>
                <div className="d-flex flex-wrap gap-3 mt-2">
                  <div><span className="emoji">🥋</span> Gi (Com kimono)</div>
                  <div><span className="emoji">🤼</span> No-Gi (Sem kimono)</div>
                  <div><span className="emoji">🧒</span> Infantil/Juvenil</div>
                </div>
                {userPrograma && (
                  <div className="mt-2">
                    <small>
                      <strong>Seu programa:</strong> {userPrograma} - Você pode registrar presença apenas nas turmas do seu programa.
                    </small>
                  </div>
                )}
              </Alert>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal de Confirmação */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Registrar Presença</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedClass && (
            <>
              <p>Você deseja registrar sua presença na seguinte turma:</p>
              <div className="confirm-details p-3 bg-light rounded">
                <p className="mb-2"><strong>Dia:</strong> {formatDiaSemana(selectedClass.dia_semana)}</p>
                <p className="mb-2"><strong>Horário:</strong> {formatTime(selectedClass.horario_inicio)} - {formatTime(selectedClass.horario_fim)}</p>
                <p className="mb-2"><strong>Turma:</strong> {selectedClass.nome}</p>
                {selectedClass.professor_nome && (
                  <p className="mb-2"><strong>Professor:</strong> {selectedClass.professor_nome}</p>
                )}
                <p className="mb-0">
                  <Badge bg={getProgramaBadgeColor(selectedClass.programa)}>
                    {selectedClass.programa}
                  </Badge>
                  {' '}
                  <Badge bg="secondary">{getNivelFromNome(selectedClass.nome)}</Badge>
                </p>
              </div>

              {!selectedClass.id ? (
                <Alert variant="danger" className="mt-3 mb-0">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Erro: Não foi possível identificar esta turma.</strong>
                  <p className="mb-0 mt-1">
                    Esta turma não está disponível no sistema.
                    Por favor, contate o administrador.
                  </p>
                </Alert>
              ) : selectedClass.ja_registrou_hoje ? (
                <Alert variant="info" className="mt-3 mb-0">
                  <FaCheckCircle className="me-2" />
                  <strong>Você já registrou presença nesta turma hoje.</strong>
                  <p className="mb-0 mt-1">Aguarde a validação do professor.</p>
                </Alert>
              ) : !selectedClass.pode_registrar && selectedClass.mensagem ? (
                <Alert variant="warning" className="mt-3 mb-0">
                  <FaExclamationTriangle className="me-2" />
                  <strong>{selectedClass.mensagem}</strong>
                </Alert>
              ) : (
                <Alert variant="warning" className="mt-3 mb-0">
                  <small>
                    <strong>Importante:</strong> Certifique-se de estar presente no local do treino.
                    Registros falsos podem resultar em penalidades.
                  </small>
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmCheckIn}
            disabled={!selectedClass?.id || selectedClass?.ja_registrou_hoje || selectedClass?.pode_registrar === false}
          >
            <FaCheckCircle className="me-1" />
            Confirmar Presença
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ScheduleGrid;
