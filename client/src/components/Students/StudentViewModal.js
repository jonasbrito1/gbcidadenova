import React, { useEffect, useState } from 'react';
import { Modal, Nav, Tab, Row, Col, Badge, Card, ListGroup, Table, ProgressBar, Image } from 'react-bootstrap';
import { studentService, attendanceService } from '../../services/api';
import { formatDate, formatCurrency, formatPhone } from '../../utils/formatters';
import { FaUser, FaIdCard, FaGraduationCap, FaClipboardList, FaChartBar, FaMedkit, FaPhone, FaDollarSign } from 'react-icons/fa';
import LoadingSpinner from '../Common/LoadingSpinner';

const StudentViewModal = ({ show, handleClose, student }) => {
  const [studentData, setStudentData] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [graduations, setGraduations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStudentData = async () => {
      if (!student) return;

      setLoading(true);
      try {
        // Buscar dados completos do aluno (sempre busca dados frescos do servidor)
        const { data: fullStudent } = await studentService.getStudentById(student.id);
        setStudentData(fullStudent);

        // Buscar frequências (últimos 30 dias)
        try {
          const today = new Date();
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);

          const { data: attendanceData } = await attendanceService.getStudentAttendance(student.id, {
            data_inicio: thirtyDaysAgo.toISOString().split('T')[0],
            data_fim: today.toISOString().split('T')[0]
          });
          setAttendance(attendanceData || []);
        } catch (error) {
          console.error('Erro ao carregar frequências:', error);
          setAttendance([]);
        }

        // Buscar graduações
        try {
          const { data: graduationData } = await studentService.getStudentGraduations(student.id);
          setGraduations(graduationData || []);
        } catch (error) {
          console.error('Erro ao carregar graduações:', error);
          setGraduations([]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do aluno:', error);
      } finally {
        setLoading(false);
      }
    };

    if (show && student) {
      // Sempre buscar dados frescos quando o modal abrir
      loadStudentData();
    } else if (!show) {
      // Limpar dados quando o modal fechar para forçar busca fresca na próxima abertura
      setStudentData(null);
      setAttendance([]);
      setGraduations([]);
    }
  }, [show, student?.id]);

  const getStatusBadge = (status) => {
    const variants = {
      'ativo': 'success',
      'inativo': 'secondary',
      'trancado': 'warning'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const calculateAttendanceRate = () => {
    if (attendance.length === 0) return 0;
    const present = attendance.filter(a => a.presente).length;
    return Math.round((present / attendance.length) * 100);
  };

  if (!student) return null;

  return (
    <Modal show={show} onHide={handleClose} size="xl" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <FaUser className="me-2" />
          Detalhes do Aluno
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {loading ? (
          <LoadingSpinner text="Carregando informações..." />
        ) : studentData ? (
          <Tab.Container defaultActiveKey="geral">
            <Nav variant="pills" className="mb-4">
              <Nav.Item>
                <Nav.Link eventKey="geral">
                  <FaUser className="me-2" />
                  Dados Gerais
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="academico">
                  <FaGraduationCap className="me-2" />
                  Informações Acadêmicas
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="frequencia">
                  <FaClipboardList className="me-2" />
                  Frequência
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
            </Nav>

            <Tab.Content>
              {/* Aba de Dados Gerais */}
              <Tab.Pane eventKey="geral">
                <Card>
                  <Card.Body>
                    <Row className="mb-4">
                      <Col md={12}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center">
                            {/* Foto de Perfil Circular */}
                            <div className="me-3">
                              <Image
                                src={studentData.foto_url || '/images/default-avatar.png'}
                                roundedCircle
                                style={{
                                  width: '70px',
                                  height: '70px',
                                  objectFit: 'cover',
                                  border: '3px solid #dee2e6',
                                  backgroundColor: '#f8f9fa'
                                }}
                                alt={`Foto de ${studentData.nome}`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/images/default-avatar.png';
                                }}
                              />
                            </div>
                            <h5 className="mb-0">
                              <FaIdCard className="me-2" />
                              Informações Pessoais
                            </h5>
                          </div>
                          {getStatusBadge(studentData.status)}
                        </div>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <strong>Nome:</strong> {studentData.nome}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Email:</strong> {studentData.email}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Telefone:</strong> {formatPhone(studentData.telefone)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Data de Nascimento:</strong> {formatDate(studentData.data_nascimento)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Matrícula:</strong> {studentData.matricula}
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>

                      <Col md={6}>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <strong>CEP:</strong> {studentData.cep || 'Não informado'}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Endereço:</strong> {studentData.rua ? `${studentData.rua}, ${studentData.numero}` : 'Não informado'}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Bairro:</strong> {studentData.bairro || 'Não informado'}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Cidade/UF:</strong> {studentData.cidade && studentData.estado ? `${studentData.cidade}/${studentData.estado}` : 'Não informado'}
                          </ListGroup.Item>
                          {studentData.email_responsavel && (
                            <ListGroup.Item>
                              <strong>Email Responsável:</strong> {studentData.email_responsavel}
                            </ListGroup.Item>
                          )}
                        </ListGroup>
                      </Col>
                    </Row>

                    {(studentData.nome_contato_emergencia || studentData.contato_emergencia) && (
                      <Row className="mt-4">
                        <Col md={12}>
                          <h6>
                            <FaPhone className="me-2" />
                            Contato de Emergência
                          </h6>
                          <ListGroup variant="flush">
                            {studentData.nome_contato_emergencia && (
                              <ListGroup.Item>
                                <strong>Nome:</strong> {studentData.nome_contato_emergencia}
                              </ListGroup.Item>
                            )}
                            {studentData.contato_emergencia && (
                              <ListGroup.Item>
                                <strong>Contato:</strong> {studentData.contato_emergencia}
                              </ListGroup.Item>
                            )}
                          </ListGroup>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Aba de Informações Acadêmicas */}
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
                            <strong>Programa:</strong> <Badge bg="info">{studentData.programa}</Badge>
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Graduação Atual:</strong>{' '}
                            <span className="fw-bold">{studentData.graduacao}</span>
                            {studentData.graus_faixa > 0 && (
                              <span className="text-muted"> ({studentData.graus_faixa}°)</span>
                            )}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Data de Início:</strong> {formatDate(studentData.data_inicio)}
                          </ListGroup.Item>
                          {studentData.data_fim && (
                            <ListGroup.Item>
                              <strong>Data de Término:</strong> {formatDate(studentData.data_fim)}
                            </ListGroup.Item>
                          )}
                        </ListGroup>
                      </Col>

                      <Col md={6}>
                        <ListGroup variant="flush">
                          {studentData.plano_nome && (
                            <>
                              <ListGroup.Item>
                                <strong>Plano:</strong> {studentData.plano_nome}
                              </ListGroup.Item>
                              <ListGroup.Item>
                                <strong>Valor Mensal:</strong> {formatCurrency(studentData.valor_mensal)}
                              </ListGroup.Item>
                            </>
                          )}
                          <ListGroup.Item>
                            <strong>Status:</strong> {getStatusBadge(studentData.status)}
                          </ListGroup.Item>
                        </ListGroup>
                      </Col>
                    </Row>

                    {graduations.length > 0 && (
                      <Row className="mt-4">
                        <Col md={12}>
                          <h6 className="mb-3">Histórico de Graduações</h6>
                          <Table striped bordered hover size="sm">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Graduação</th>
                                <th>Graus</th>
                                <th>Professor Avaliador</th>
                              </tr>
                            </thead>
                            <tbody>
                              {graduations.map((grad, index) => (
                                <tr key={index}>
                                  <td>{formatDate(grad.data_graduacao)}</td>
                                  <td>{grad.graduacao}</td>
                                  <td>{grad.graus_faixa}°</td>
                                  <td>{grad.professor_avaliador_nome || 'Não informado'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Aba de Frequência */}
              <Tab.Pane eventKey="frequencia">
                <Card>
                  <Card.Body>
                    <h5 className="mb-4">
                      <FaChartBar className="me-2" />
                      Frequência - Últimos 30 Dias
                    </h5>

                    <Row className="mb-4">
                      <Col md={12}>
                        <div className="mb-2">
                          <strong>Taxa de Presença:</strong>
                        </div>
                        <ProgressBar
                          now={calculateAttendanceRate()}
                          label={`${calculateAttendanceRate()}%`}
                          variant={calculateAttendanceRate() >= 75 ? 'success' : calculateAttendanceRate() >= 50 ? 'warning' : 'danger'}
                          style={{ height: '30px' }}
                        />
                      </Col>
                    </Row>

                    {attendance.length > 0 ? (
                      <Row>
                        <Col md={12}>
                          <Table striped bordered hover size="sm">
                            <thead>
                              <tr>
                                <th>Data</th>
                                <th>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {attendance.map((att, index) => (
                                <tr key={index}>
                                  <td>{formatDate(att.data)}</td>
                                  <td>
                                    <Badge bg={att.presente ? 'success' : 'danger'}>
                                      {att.presente ? 'Presente' : 'Ausente'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </Col>
                      </Row>
                    ) : (
                      <div className="text-center text-muted py-4">
                        <FaClipboardList size={50} className="mb-3" />
                        <p>Nenhum registro de frequência encontrado nos últimos 30 dias</p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Aba de Informações Médicas */}
              <Tab.Pane eventKey="medico">
                <Card>
                  <Card.Body>
                    <h5 className="mb-4">
                      <FaMedkit className="me-2" />
                      Informações Médicas
                    </h5>

                    <Row>
                      <Col md={6}>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <strong>Tipo Sanguíneo:</strong> {studentData.tipo_sanguineo || 'Não informado'}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            <strong>Toma Medicamento:</strong>{' '}
                            <Badge bg={studentData.toma_medicamento ? 'warning' : 'secondary'}>
                              {studentData.toma_medicamento ? 'Sim' : 'Não'}
                            </Badge>
                          </ListGroup.Item>
                          {studentData.toma_medicamento && studentData.medicamentos_detalhes && (
                            <ListGroup.Item>
                              <strong>Detalhes Medicamentos:</strong>
                              <div className="mt-2 p-2 bg-light rounded">
                                {studentData.medicamentos_detalhes}
                              </div>
                            </ListGroup.Item>
                          )}
                        </ListGroup>
                      </Col>

                      <Col md={6}>
                        <ListGroup variant="flush">
                          <ListGroup.Item>
                            <strong>Histórico de Fraturas:</strong>{' '}
                            <Badge bg={studentData.historico_fraturas ? 'warning' : 'secondary'}>
                              {studentData.historico_fraturas ? 'Sim' : 'Não'}
                            </Badge>
                          </ListGroup.Item>
                          {studentData.historico_fraturas && studentData.fraturas_detalhes && (
                            <ListGroup.Item>
                              <strong>Detalhes Fraturas:</strong>
                              <div className="mt-2 p-2 bg-light rounded">
                                {studentData.fraturas_detalhes}
                              </div>
                            </ListGroup.Item>
                          )}
                          <ListGroup.Item>
                            <strong>Tem Alergias:</strong>{' '}
                            <Badge bg={studentData.tem_alergias ? 'warning' : 'secondary'}>
                              {studentData.tem_alergias ? 'Sim' : 'Não'}
                            </Badge>
                          </ListGroup.Item>
                          {studentData.tem_alergias && studentData.alergias_detalhes && (
                            <ListGroup.Item>
                              <strong>Detalhes Alergias:</strong>
                              <div className="mt-2 p-2 bg-light rounded">
                                {studentData.alergias_detalhes}
                              </div>
                            </ListGroup.Item>
                          )}
                        </ListGroup>
                      </Col>
                    </Row>

                    {studentData.observacoes_medicas && (
                      <Row className="mt-4">
                        <Col md={12}>
                          <h6>Observações Médicas Gerais</h6>
                          <div className="p-3 bg-light rounded">
                            {studentData.observacoes_medicas}
                          </div>
                        </Col>
                      </Row>
                    )}
                  </Card.Body>
                </Card>
              </Tab.Pane>

              {/* Aba de Informações Financeiras */}
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
                          <ListGroup.Item>
                            <strong>Status Bolsista:</strong>{' '}
                            <Badge bg={studentData.bolsista ? 'success' : 'secondary'}>
                              {studentData.bolsista ? 'Sim - Isento de Mensalidade' : 'Não'}
                            </Badge>
                          </ListGroup.Item>
                          {studentData.bolsista && studentData.bolsa_observacao && (
                            <ListGroup.Item>
                              <strong>Observação da Bolsa:</strong>
                              <div className="mt-2 p-2 bg-light rounded">
                                {studentData.bolsa_observacao}
                              </div>
                            </ListGroup.Item>
                          )}
                          {!studentData.bolsista && studentData.plano_nome && (
                            <ListGroup.Item>
                              <strong>Plano:</strong> {studentData.plano_nome}
                            </ListGroup.Item>
                          )}
                        </ListGroup>
                      </Col>

                      <Col md={6}>
                        <ListGroup variant="flush">
                          {!studentData.bolsista && (
                            <>
                              <ListGroup.Item>
                                <strong>Valor da Mensalidade:</strong>{' '}
                                <span className="text-success fw-bold">
                                  {studentData.valor_mensalidade_customizado
                                    ? formatCurrency(studentData.valor_mensalidade_customizado)
                                    : (studentData.valor_mensal ? formatCurrency(studentData.valor_mensal) : formatCurrency(150.00))
                                  }
                                </span>
                                {studentData.valor_mensalidade_customizado && (
                                  <div className="mt-1">
                                    <Badge bg="info" className="small">Valor Customizado</Badge>
                                  </div>
                                )}
                              </ListGroup.Item>
                              <ListGroup.Item>
                                <strong>Informação:</strong>
                                <div className="mt-2 small text-muted">
                                  {studentData.valor_mensalidade_customizado
                                    ? 'Este aluno possui um valor de mensalidade customizado diferente do plano padrão.'
                                    : 'Este aluno está usando o valor padrão do plano selecionado.'
                                  }
                                </div>
                              </ListGroup.Item>
                            </>
                          )}
                        </ListGroup>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Tab.Pane>
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

export default StudentViewModal;
