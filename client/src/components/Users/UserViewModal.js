import React, { useEffect, useState } from 'react';
import { Modal, Nav, Tab, Row, Col, Badge, Card, ListGroup } from 'react-bootstrap';
import { userService } from '../../services/api';
import { formatDate, formatCurrency, formatPhone } from '../../utils/formatters';
import { FaUser, FaIdCard, FaGraduationCap, FaMedkit, FaPhone, FaDollarSign, FaUserGraduate, FaUserShield } from 'react-icons/fa';
import LoadingSpinner from '../Common/LoadingSpinner';

const UserViewModal = ({ show, handleClose, user }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        console.log('[UserViewModal] Nenhum usuário selecionado');
        return;
      }

      console.log('[UserViewModal] Carregando dados do usuário ID:', user.id);
      setLoading(true);
      try {
        // Buscar dados completos do usuário (sempre busca dados frescos do servidor)
        const { data: fullUser } = await userService.getUserById(user.id);
        console.log('[UserViewModal] Dados carregados:', fullUser);
        setUserData(fullUser);
      } catch (error) {
        console.error('[UserViewModal] Erro ao carregar dados do usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    if (show && user) {
      // Sempre buscar dados frescos quando o modal abrir
      loadUserData();
    } else if (!show) {
      // Limpar dados quando o modal fechar para forçar busca fresca na próxima abertura
      setUserData(null);
    }
  }, [show, user]);

  const getStatusBadge = (status) => {
    const variants = {
      'ativo': 'success',
      'inativo': 'secondary',
      'suspenso': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getTipoBadge = (tipo) => {
    const variants = {
      admin: 'danger',
      professor: 'primary',
      aluno: 'secondary'
    };
    const labels = {
      admin: 'Administrador',
      professor: 'Professor',
      aluno: 'Aluno'
    };
    return <Badge bg={variants[tipo] || 'secondary'}>{labels[tipo] || tipo}</Badge>;
  };

  const getTipoIcon = (tipo) => {
    switch (tipo) {
      case 'admin':
        return <FaUserShield className="me-2 text-danger" />;
      case 'professor':
        return <FaUserGraduate className="me-2 text-primary" />;
      default:
        return <FaUser className="me-2 text-secondary" />;
    }
  };

  if (!user) return null;

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>
          {getTipoIcon(user.tipo_usuario)}
          Detalhes do Usuário
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <LoadingSpinner text="Carregando informações..." />
        ) : userData ? (
          <Tab.Container defaultActiveKey="geral">
            <Nav variant="pills" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="geral">
                  <FaUser className="me-2" />
                  Dados Gerais
                </Nav.Link>
              </Nav.Item>
              {userData.tipo_usuario === 'aluno' && (
                <>
                  <Nav.Item>
                    <Nav.Link eventKey="academico">
                      <FaGraduationCap className="me-2" />
                      Informações Acadêmicas
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="medico">
                      <FaMedkit className="me-2" />
                      Informações Médicas
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="financeiro">
                      <FaDollarSign className="me-2" />
                      Financeiro
                    </Nav.Link>
                  </Nav.Item>
                </>
              )}
              {userData.tipo_usuario === 'professor' && (
                <Nav.Item>
                  <Nav.Link eventKey="professor">
                    <FaUserGraduate className="me-2" />
                    Dados do Professor
                  </Nav.Link>
                </Nav.Item>
              )}
            </Nav>

            <Tab.Content>
              {/* Aba de Dados Gerais */}
              <Tab.Pane eventKey="geral">
                <Card>
                  <Card.Body>
                    <Row className="mb-4">
                      <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="mb-0">
                            <FaIdCard className="me-2" />
                            Informações Pessoais
                          </h5>
                          <div>
                            {getTipoBadge(userData.tipo_usuario)}
                            <span className="ms-2">{getStatusBadge(userData.status)}</span>
                          </div>
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <strong>Nome Completo:</strong> {userData.nome}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Email:</strong> {userData.email}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Telefone:</strong> {userData.telefone ? formatPhone(userData.telefone) : 'Não informado'}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Data de Nascimento:</strong> {userData.data_nascimento ? formatDate(userData.data_nascimento) : 'Não informado'}
                          </ListGroup.Item>
                          {userData.tipo_usuario === 'aluno' && userData.matricula && (
                            <ListGroup.Item>
                              <strong>Matrícula:</strong> {userData.matricula}
                            </ListGroup.Item>
                          )}
                        </ListGroup>
                      </Col>

                      <Col md={6}>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <strong>Tipo de Usuário:</strong> {getTipoBadge(userData.tipo_usuario)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Status:</strong> {getStatusBadge(userData.status)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Cadastrado em:</strong> {formatDate(userData.created_at)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Último Login:</strong>{' '}
                            {userData.ultimo_login
                              ? new Date(userData.ultimo_login).toLocaleString('pt-BR')
                              : 'Nunca acessou'}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Primeiro Acesso:</strong>{' '}
                            <Badge bg={userData.primeiro_acesso ? 'warning' : 'success'}>
                              {userData.primeiro_acesso ? 'Pendente' : 'Realizado'}
                            </Badge>
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                    </Row>

                    {userData.endereco && (
                      <Row className="mt-4">
                        <Col md={12}>
                          <h6>
                            <FaIdCard className="me-2" />
                            Endereço
                          </h6>
                          <div className="p-3 bg-light rounded">
                            {userData.endereco}
                          </div>
                        </Col>
                      </Row>
                    )}

                    {/* Contato de Emergência (para alunos) */}
                    {userData.tipo_usuario === 'aluno' && userData.contato_emergencia && (
                      <Row className="mt-4">
                        <Col md={12}>
                          <h6>
                            <FaPhone className="me-2" />
                            Contato de Emergência
                          </h6>
                          <div className="p-3 bg-light rounded">
                            {userData.contato_emergencia}
                          </div>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Aba de Informações Acadêmicas (apenas para alunos) */}
              {userData.tipo_usuario === 'aluno' && (
                <Tab.Pane eventKey="academico">
                  <Card>
                    <Card.Body>
                      <h5 className="mb-4">
                        <FaGraduationCap className="me-2" />
                        Informações Acadêmicas
                      </h5>

                      <Row>
                        <Col md={6}>
                          <ListGroup variant="flush">
                            <ListGroup.Item>
                              <strong>Programa/Modalidade:</strong>{' '}
                              <Badge bg="info">{userData.programa || 'Não informado'}</Badge>
                            </ListGroup.Item>
                            <ListGroup.Item>
                              <strong>Graduação Atual:</strong>{' '}
                              <span className="fw-bold">{userData.graduacao || 'Não informado'}</span>
                              {userData.graus_faixa > 0 && (
                                <span className="text-muted"> ({userData.graus_faixa}°)</span>
                              )}
                            </ListGroup.Item>
                            <ListGroup.Item>
                              <strong>Data de Início:</strong>{' '}
                              {userData.data_inicio ? formatDate(userData.data_inicio) : 'Não informado'}
                            </ListGroup.Item>
                            {userData.data_fim && (
                              <ListGroup.Item>
                                <strong>Data de Término:</strong> {formatDate(userData.data_fim)}
                              </ListGroup.Item>
                            )}
                          </ListGroup>
                        </Col>

                        <Col md={6}>
                          <ListGroup variant="flush">
                            {userData.plano_nome && (
                              <ListGroup.Item>
                                <strong>Plano:</strong> {userData.plano_nome}
                              </ListGroup.Item>
                            )}
                            {userData.professor_responsavel_nome && (
                              <ListGroup.Item>
                                <strong>Professor Responsável:</strong> {userData.professor_responsavel_nome}
                              </ListGroup.Item>
                            )}
                            <ListGroup.Item>
                              <strong>Status:</strong> {getStatusBadge(userData.status)}
                            </ListGroup.Item>
                          </ListGroup>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              )}

              {/* Aba de Informações Médicas (apenas para alunos) */}
              {userData.tipo_usuario === 'aluno' && (
                <Tab.Pane eventKey="medico">
                  <Card>
                    <Card.Body>
                      <h5 className="mb-4">
                        <FaMedkit className="me-2" />
                        Informações Médicas
                      </h5>

                      {userData.observacoes_medicas ? (
                        <Row>
                          <Col md={12}>
                            <div className="alert alert-info">
                              <strong>Observações Médicas:</strong>
                              <div className="mt-2">
                                {userData.observacoes_medicas}
                              </div>
                            </div>
                          </Col>
                        </Row>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <FaMedkit size={50} className="mb-3" />
                          <p>Nenhuma informação médica cadastrada</p>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              )}

              {/* Aba de Informações Financeiras (apenas para alunos) */}
              {userData.tipo_usuario === 'aluno' && (
                <Tab.Pane eventKey="financeiro">
                  <Card>
                    <Card.Body>
                      <h5 className="mb-4">
                        <FaDollarSign className="me-2" />
                        Informações Financeiras
                      </h5>

                      <Row>
                        <Col md={6}>
                          <ListGroup variant="flush">
                            {userData.plano_nome && (
                              <ListGroup.Item>
                                <strong>Plano Contratado:</strong> {userData.plano_nome}
                              </ListGroup.Item>
                            )}
                            {userData.valor_mensal && (
                              <ListGroup.Item>
                                <strong>Valor da Mensalidade:</strong>{' '}
                                <span className="text-success fw-bold">
                                  {formatCurrency(userData.valor_mensal)}
                                </span>
                              </ListGroup.Item>
                            )}
                          </ListGroup>
                        </Col>

                        <Col md={6}>
                          <ListGroup variant="flush">
                            <ListGroup.Item>
                              <strong>Status:</strong> {getStatusBadge(userData.status)}
                            </ListGroup.Item>
                            <ListGroup.Item>
                              <strong>Informação:</strong>
                              <div className="mt-2 small text-muted">
                                Para visualizar mensalidades e pagamentos, acesse a página Financeiro.
                              </div>
                            </ListGroup.Item>
                          </ListGroup>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              )}

              {/* Aba de Dados do Professor (apenas para professores) */}
              {userData.tipo_usuario === 'professor' && (
                <Tab.Pane eventKey="professor">
                  <Card>
                    <Card.Body>
                      <h5 className="mb-4">
                        <FaUserGraduate className="me-2" />
                        Dados do Professor
                      </h5>

                      <Row>
                        <Col md={6}>
                          <ListGroup variant="flush">
                            <ListGroup.Item>
                              <strong>Especialidade:</strong> {userData.especialidade || 'Não informado'}
                            </ListGroup.Item>
                            <ListGroup.Item>
                              <strong>Graduação:</strong>{' '}
                              <span className="fw-bold">{userData.graduacao_professor || 'Não informado'}</span>
                            </ListGroup.Item>
                          </ListGroup>
                        </Col>

                        <Col md={6}>
                          <ListGroup variant="flush">
                            <ListGroup.Item>
                              <strong>Status:</strong> {getStatusBadge(userData.status)}
                            </ListGroup.Item>
                            <ListGroup.Item>
                              <strong>Data de Cadastro:</strong> {formatDate(userData.created_at)}
                            </ListGroup.Item>
                          </ListGroup>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              )}
            </Tab.Content>
          </Tab.Container>
        ) : (
          <div className="text-center text-muted py-5">
            <p>Nenhuma informação disponível</p>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default UserViewModal;
