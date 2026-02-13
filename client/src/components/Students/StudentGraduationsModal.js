import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Badge, Alert, Tabs, Tab, Form, Row, Col, ProgressBar, Spinner } from 'react-bootstrap';
import { studentService } from '../../services/api';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FaCheck, FaTimes, FaGraduationCap, FaCalendarAlt, FaChartLine } from 'react-icons/fa';

const StudentGraduationsModal = ({ show, handleClose, student, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('elegibilidade');
  const [graduacoes, setGraduacoes] = useState([]);
  const [elegibilidade, setElegibilidade] = useState(null);
  const [graduacoesDisponiveis, setGraduacoesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingGraus, setUpdatingGraus] = useState(false);
  const [grausAtual, setGrausAtual] = useState(0);
  const [formData, setFormData] = useState({
    graduacao_nova_id: '',
    data_graduacao: new Date().toISOString().split('T')[0],
    observacoes: ''
  });

  useEffect(() => {
    if (show && student) {
      carregarDados();
      setGrausAtual(student.graus_faixa || 0);
    }
  }, [show, student]);

  const carregarDados = async () => {
    setLoading(true);
    try {
      // Carregar histórico de graduações
      const histRes = await studentService.getStudentGraduations(student.id);
      setGraduacoes(histRes.data || []);

      // Carregar elegibilidade
      const elegRes = await studentService.checkGraduationEligibility(student.id, { periodoMeses: 6 });
      setElegibilidade(elegRes.data);
      if (elegRes.data?.aluno?.graus_faixa !== undefined) {
        setGrausAtual(elegRes.data.aluno.graus_faixa);
      }

      // Carregar graduações disponíveis
      const dispRes = await studentService.getGraduationSystem();
      setGraduacoesDisponiveis(dispRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGraus = async (novoGraus) => {
    try {
      setUpdatingGraus(true);
      await studentService.updateStudentDegrees(student.id, novoGraus);
      setGrausAtual(novoGraus);
      toast.success(`Graus atualizados para ${novoGraus}`);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar graus');
    } finally {
      setUpdatingGraus(false);
    }
  };

  const handleSubmitGraduacao = async (e) => {
    e.preventDefault();

    if (!formData.graduacao_nova_id) {
      toast.error('Selecione a nova graduacao');
      return;
    }

    try {
      setLoading(true);

      const data = {
        ...formData,
        frequencia_percentual: elegibilidade?.frequencia?.percentual || 0,
        total_aulas_periodo: elegibilidade?.frequencia?.total_aulas || 0,
        aulas_presentes: elegibilidade?.frequencia?.aulas_presentes || 0
      };

      await studentService.registerGraduation(student.id, data);
      toast.success('Graduacao registrada com sucesso!');

      // Recarregar dados
      await carregarDados();

      // Voltar para aba de elegibilidade
      setActiveTab('elegibilidade');

      // Limpar formulário
      setFormData({
        graduacao_nova_id: '',
        data_graduacao: new Date().toISOString().split('T')[0],
        observacoes: ''
      });

      // Notificar componente pai para atualizar lista
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao registrar graduacao');
    } finally {
      setLoading(false);
    }
  };

  const getCorBadge = (cor) => {
    const cores = {
      'branca': 'light',
      'cinza': 'secondary',
      'amarela': 'warning',
      'laranja': 'warning',
      'verde': 'success',
      'azul': 'primary',
      'roxa': 'purple',
      'marrom': 'brown',
      'preta': 'dark',
      'coral': 'danger'
    };
    return cores[cor?.toLowerCase()] || 'secondary';
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          Graduações - {student?.nome}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          {/* ABA: Histórico */}
          <Tab eventKey="historico" title="Histórico">
            {loading ? (
              <div className="text-center py-4">Carregando...</div>
            ) : graduacoes.length === 0 ? (
              <Alert variant="info">
                Este aluno ainda não possui graduações registradas.
              </Alert>
            ) : (
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>De</th>
                    <th>Para</th>
                    <th>Frequência</th>
                    <th>Aulas Realizadas</th>
                    <th>Aprovado Por</th>
                    <th>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {graduacoes.map((grad) => (
                    <tr key={grad.id}>
                      <td>
                        {grad.data_graduacao
                          ? format(new Date(grad.data_graduacao), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </td>
                      <td>
                        {grad.graduacao_anterior ? (
                          <Badge bg={getCorBadge(grad.cor_anterior)}>
                            {grad.graduacao_anterior}
                          </Badge>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <Badge bg={getCorBadge(grad.cor_nova)}>
                          {grad.graduacao_nova}
                        </Badge>
                      </td>
                      <td>
                        <strong>{parseFloat(grad.frequencia_percent || grad.frequencia_percentual || 0).toFixed(1)}%</strong>
                      </td>
                      <td>
                        {grad.aulas_realizadas || grad.aulas_presentes || 0}
                      </td>
                      <td>{grad.professor_avaliador_nome || '-'}</td>
                      <td className="text-truncate" style={{ maxWidth: '200px' }}>
                        {grad.observacoes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Tab>

          {/* ABA: Elegibilidade e Graus */}
          <Tab eventKey="elegibilidade" title={<><FaGraduationCap className="me-1" /> Elegibilidade</>}>
            {loading ? (
              <div className="text-center py-4"><Spinner animation="border" /> Carregando...</div>
            ) : !elegibilidade ? (
              <Alert variant="warning">Nao foi possivel carregar os dados</Alert>
            ) : (
              <div>
                {/* Graduacao Atual com Visualizacao */}
                <div className="p-3 mb-4 bg-light rounded">
                  <Row className="align-items-center">
                    <Col md={6}>
                      <h5 className="mb-3">
                        <FaGraduationCap className="me-2" />
                        Graduacao Atual
                      </h5>
                      <div
                        className="d-flex align-items-center justify-content-center p-3 rounded mb-2"
                        style={{
                          background: elegibilidade.aluno.cor_graduacao || '#666',
                          color: ['#FFFFFF', '#FFFF00', '#FFA500'].includes(elegibilidade.aluno.cor_graduacao) ? '#000' : '#fff',
                          fontWeight: 'bold',
                          fontSize: '1.2rem',
                          minHeight: '60px'
                        }}
                      >
                        {elegibilidade.aluno.graduacao_atual || 'Nao definida'}
                        {grausAtual > 0 && ` - ${grausAtual} grau${grausAtual > 1 ? 's' : ''}`}
                      </div>
                    </Col>
                    <Col md={6}>
                      <h6 className="mb-2">Atualizar Graus da Faixa</h6>
                      <div className="d-flex gap-2 flex-wrap">
                        {[0, 1, 2, 3, 4].map((grau) => (
                          <Button
                            key={grau}
                            variant={grausAtual === grau ? 'primary' : 'outline-secondary'}
                            size="sm"
                            onClick={() => handleUpdateGraus(grau)}
                            disabled={updatingGraus}
                            style={{ minWidth: '45px' }}
                          >
                            {updatingGraus && grausAtual === grau ? <Spinner size="sm" /> : `${grau}º`}
                          </Button>
                        ))}
                      </div>
                      <small className="text-muted d-block mt-2">
                        Clique para atualizar os graus instantaneamente
                      </small>
                    </Col>
                  </Row>
                </div>

                {/* Status de Elegibilidade */}
                <Alert variant={elegibilidade.elegivel ? 'success' : 'info'} className="mb-4">
                  <div className="d-flex align-items-center">
                    {elegibilidade.elegivel ? (
                      <FaCheck size={24} className="me-3 text-success" />
                    ) : (
                      <FaCalendarAlt size={24} className="me-3" />
                    )}
                    <div>
                      <strong>{elegibilidade.elegivel ? 'Aluno Elegivel para Graduacao!' : 'Requisitos Pendentes'}</strong>
                      <ul className="mb-0 mt-1 small">
                        {elegibilidade.motivos.map((motivo, index) => (
                          <li key={index}>{motivo}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Alert>

                {/* Requisitos em Cards */}
                <Row className="mb-4">
                  <Col md={4}>
                    <div className={`p-3 rounded border ${elegibilidade.requisitos_atendidos?.tempo ? 'border-success bg-success bg-opacity-10' : 'border-warning'}`}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Tempo na Faixa</strong>
                        {elegibilidade.requisitos_atendidos?.tempo ? <FaCheck className="text-success" /> : <FaTimes className="text-warning" />}
                      </div>
                      <h4 className="mb-1">{elegibilidade.tempo.meses_desde_ultima_graduacao || 0} meses</h4>
                      <small className="text-muted">Minimo: 6 meses</small>
                      <ProgressBar
                        now={Math.min(100, ((elegibilidade.tempo.meses_desde_ultima_graduacao || 0) / 6) * 100)}
                        variant={elegibilidade.requisitos_atendidos?.tempo ? 'success' : 'warning'}
                        className="mt-2"
                        style={{ height: '8px' }}
                      />
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className={`p-3 rounded border ${elegibilidade.requisitos_atendidos?.aulas ? 'border-success bg-success bg-opacity-10' : 'border-warning'}`}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Aulas Validadas</strong>
                        {elegibilidade.requisitos_atendidos?.aulas ? <FaCheck className="text-success" /> : <FaTimes className="text-warning" />}
                      </div>
                      <h4 className="mb-1">{elegibilidade.frequencia.aulas_presentes || 0} aulas</h4>
                      <small className="text-muted">Minimo: 48 aulas</small>
                      <ProgressBar
                        now={Math.min(100, ((elegibilidade.frequencia.aulas_presentes || 0) / 48) * 100)}
                        variant={elegibilidade.requisitos_atendidos?.aulas ? 'success' : 'warning'}
                        className="mt-2"
                        style={{ height: '8px' }}
                      />
                    </div>
                  </Col>
                  <Col md={4}>
                    <div className={`p-3 rounded border ${elegibilidade.requisitos_atendidos?.frequencia ? 'border-success bg-success bg-opacity-10' : 'border-warning'}`}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>Frequencia</strong>
                        {elegibilidade.requisitos_atendidos?.frequencia ? <FaCheck className="text-success" /> : <FaTimes className="text-warning" />}
                      </div>
                      <h4 className="mb-1">{elegibilidade.frequencia.percentual || 0}%</h4>
                      <small className="text-muted">Minimo: 75%</small>
                      <ProgressBar
                        now={elegibilidade.frequencia.percentual || 0}
                        variant={elegibilidade.requisitos_atendidos?.frequencia ? 'success' : 'warning'}
                        className="mt-2"
                        style={{ height: '8px' }}
                      />
                    </div>
                  </Col>
                </Row>

                {/* Proxima Graduacao */}
                {elegibilidade.proxima_graduacao && (
                  <div className="p-3 bg-light rounded">
                    <h6 className="mb-3"><FaChartLine className="me-2" />Proxima Graduacao</h6>
                    <div className="d-flex align-items-center gap-3">
                      <div
                        className="px-4 py-2 rounded"
                        style={{
                          background: elegibilidade.proxima_graduacao.cor || '#666',
                          color: '#fff',
                          fontWeight: 'bold'
                        }}
                      >
                        {elegibilidade.proxima_graduacao.nome}
                      </div>
                      <div>
                        <small className="text-muted d-block">Tempo minimo: {elegibilidade.proxima_graduacao.tempo_minimo_meses || 6} meses</small>
                        <small className="text-muted d-block">Aulas minimas: {elegibilidade.proxima_graduacao.aulas_minimas || 48} aulas</small>
                        <small className="text-muted d-block">Frequencia minima: 75%</small>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Tab>

          {/* ABA: Registrar Nova Graduação */}
          <Tab eventKey="registrar" title="Registrar Nova Graduação">
            <Form onSubmit={handleSubmitGraduacao}>
              <Form.Group className="mb-3">
                <Form.Label>Nova Graduação *</Form.Label>
                <Form.Select
                  value={formData.graduacao_nova_id}
                  onChange={(e) => setFormData({ ...formData, graduacao_nova_id: e.target.value })}
                  required
                >
                  <option value="">Selecione...</option>
                  {graduacoesDisponiveis.map((grad) => (
                    <option key={grad.id} value={grad.id}>
                      {grad.nome} - {grad.descricao || ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Data da Graduação *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.data_graduacao}
                  onChange={(e) => setFormData({ ...formData, data_graduacao: e.target.value })}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Observações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  placeholder="Observações sobre a graduação..."
                />
              </Form.Group>

              {elegibilidade && (
                <Alert variant="info" className="mb-3">
                  <strong>Dados que serão registrados:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Frequência: {elegibilidade.frequencia.percentual}%</li>
                    <li>Aulas presentes: {elegibilidade.frequencia.aulas_presentes} de {elegibilidade.frequencia.total_aulas}</li>
                  </ul>
                </Alert>
              )}

              <div className="d-flex justify-content-end gap-2">
                <Button variant="secondary" onClick={() => setActiveTab('historico')}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrar Graduação'}
                </Button>
              </div>
            </Form>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Fechar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default StudentGraduationsModal;
