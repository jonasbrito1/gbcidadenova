import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { studentService, planService, teacherService } from '../../services/api';
import { toast } from 'react-toastify';
import { formatPhone, formatCurrency, isValidEmail } from '../../utils/formatters';

const StudentModal = ({ show, handleClose, student = null, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    // Dados pessoais
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',
    endereco: '',

    // Dados do aluno
    programa: 'Adultos',
    graduacao: 'Branca',
    graus_faixa: 0,
    plano_id: '',
    professor_responsavel: '',
    data_inicio: new Date().toISOString().split('T')[0],
    contato_emergencia: '',
    observacoes_medicas: '',
    status: 'ativo'
  });

  const isEditing = !!student;

  // Carregar dados iniciais
  useEffect(() => {
    if (show) {
      loadInitialData();
      if (student) {
        populateFormData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, student]);

  const loadInitialData = async () => {
    try {
      const [plansResponse, teachersResponse] = await Promise.all([
        planService.getPlans(),
        teacherService.getTeachers()
      ]);

      setPlans(plansResponse.data || []);
      setTeachers(teachersResponse.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados iniciais');
    }
  };

  const populateFormData = () => {
    if (student) {
      setFormData({
        nome: student.nome || '',
        email: student.email || '',
        telefone: student.telefone || '',
        data_nascimento: student.data_nascimento || '',
        endereco: student.endereco || '',
        programa: student.programa || 'Adultos',
        graduacao: student.graduacao || 'Branca',
        graus_faixa: student.graus_faixa || 0,
        plano_id: student.plano_id || '',
        professor_responsavel: student.professor_responsavel || '',
        data_inicio: student.data_inicio || '',
        contato_emergencia: student.contato_emergencia || '',
        observacoes_medicas: student.observacoes_medicas || '',
        status: student.status || 'ativo'
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    let formattedValue = value;

    // Aplicar formatação específica para alguns campos
    if (name === 'telefone') {
      formattedValue = formatPhone(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : formattedValue
    }));
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    if (!isValidEmail(formData.email)) {
      setError('Email inválido');
      return false;
    }
    if (!formData.data_inicio) {
      setError('Data de início é obrigatória');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        await studentService.updateStudent(student.id, formData);
        toast.success('Aluno atualizado com sucesso!');
      } else {
        await studentService.createStudent(formData);
        toast.success('Aluno cadastrado com sucesso!');
      }

      handleClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Erro ao salvar aluno';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      data_nascimento: '',
      endereco: '',
      programa: 'Adultos',
      graduacao: 'Branca',
      graus_faixa: 0,
      plano_id: '',
      professor_responsavel: '',
      data_inicio: new Date().toISOString().split('T')[0],
      contato_emergencia: '',
      observacoes_medicas: '',
      status: 'ativo'
    });
    setError('');
  };

  const onHide = () => {
    if (!loading) {
      resetForm();
      handleClose();
    }
  };

  const graduacoes = [
    'Branca',
    'Azul',
    'Roxa',
    'Marrom',
    'Preta',
    'Coral'
  ];

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {isEditing ? 'Editar Aluno' : 'Novo Aluno'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3">Dados Pessoais</h6>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nome Completo *</Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: João da Silva, José Maria Araújo"
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email *</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Digite o email"
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Telefone</Form.Label>
                <Form.Control
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  placeholder="(11) 99999-9999"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Data de Nascimento</Form.Label>
                <Form.Control
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Data de Início *</Form.Label>
                <Form.Control
                  type="date"
                  name="data_inicio"
                  value={formData.data_inicio}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Endereço</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Ex: Rua São João, 123 - Centro - São Paulo/SP"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <hr />

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3">Dados Acadêmicos</h6>
            </Col>
          </Row>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Programa</Form.Label>
                <Form.Select
                  name="programa"
                  value={formData.programa}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="Adultos">Adultos</option>
                  <option value="Infantil">Infantil</option>
                  <option value="Juvenil">Juvenil</option>
                  <option value="Master">Master</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Graduação</Form.Label>
                <Form.Select
                  name="graduacao"
                  value={formData.graduacao}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {graduacoes.map(grad => (
                    <option key={grad} value={grad}>{grad}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Graus na Faixa</Form.Label>
                <Form.Control
                  type="number"
                  name="graus_faixa"
                  value={formData.graus_faixa}
                  onChange={handleChange}
                  min="0"
                  max="4"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="trancado">Trancado</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Plano</Form.Label>
                <Form.Select
                  name="plano_id"
                  value={formData.plano_id}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Selecione um plano</option>
                  {plans.map(plan => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nome} - {formatCurrency(plan.valor_mensal)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Professor Responsável</Form.Label>
                <Form.Select
                  name="professor_responsavel"
                  value={formData.professor_responsavel}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Selecione um professor</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <hr />

          <Row>
            <Col md={12}>
              <h6 className="text-muted mb-3">Informações Adicionais</h6>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Contato de Emergência</Form.Label>
                <Form.Control
                  type="text"
                  name="contato_emergencia"
                  value={formData.contato_emergencia}
                  onChange={handleChange}
                  placeholder="Ex: Mãe: Maria da Conceição (11) 99999-9999"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Observações Médicas</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="observacoes_medicas"
                  value={formData.observacoes_medicas}
                  onChange={handleChange}
                  placeholder="Ex: Alergia à penicilina, pressão alta, cirurgia no joelho..."
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="danger"
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                {isEditing ? 'Atualizando...' : 'Cadastrando...'}
              </>
            ) : (
              isEditing ? 'Atualizar Aluno' : 'Cadastrar Aluno'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default StudentModal;