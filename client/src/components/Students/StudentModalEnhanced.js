import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { studentService } from '../../services/api';
import { toast } from 'react-toastify';
import { formatPhone, isValidEmail, formatCEP } from '../../utils/formatters';
import axios from 'axios';

const StudentModalEnhanced = ({ show, handleClose, student = null, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [age, setAge] = useState(null);

  const [formData, setFormData] = useState({
    // Dados pessoais
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',

    // Endereço completo
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',

    // Email do responsável (obrigatório para menores)
    email_responsavel: '',

    // Dados do aluno
    programa: 'Adultos',
    graduacao: 'Branca',
    graus_faixa: 0,
    plano_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    professor_responsavel: '',

    // Dados financeiros
    bolsista: false,
    bolsa_observacao: '',
    valor_mensalidade_customizado: '',

    // Contato de emergência
    nome_contato_emergencia: '',
    contato_emergencia: '',

    // Informações médicas
    tipo_sanguineo: '',
    toma_medicamento: false,
    medicamentos_detalhes: '',
    historico_fraturas: false,
    fraturas_detalhes: '',
    tem_alergias: false,
    alergias_detalhes: '',
    observacoes_medicas: '',

    status: 'ativo'
  });

  const isEditing = !!student;

  // Carregar dados iniciais
  useEffect(() => {
    if (show) {
      if (student) {
        loadStudentData();
      } else {
        resetFormData();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, student]);

  // Calcular idade quando data de nascimento mudar
  useEffect(() => {
    if (formData.data_nascimento) {
      const calculatedAge = calculateAge(formData.data_nascimento);
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  }, [formData.data_nascimento]);


  const loadStudentData = async () => {
    if (!student) return;

    setLoading(true);
    try {
      // Buscar dados completos do aluno
      const { data: fullStudent } = await studentService.getStudentById(student.id);
      populateFormData(fullStudent);
    } catch (error) {
      console.error('Erro ao carregar dados do aluno:', error);
      toast.error('Erro ao carregar dados do aluno');
      // Se falhar ao buscar, usa os dados básicos que vieram
      populateFormData(student);
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      nome: '',
      email: '',
      telefone: '',
      data_nascimento: '',
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      email_responsavel: '',
      programa: 'Adultos',
      graduacao: 'Branca',
      graus_faixa: 0,
      plano_id: '',
      data_inicio: new Date().toISOString().split('T')[0],
      bolsista: false,
      bolsa_observacao: '',
      valor_mensalidade_customizado: '',
      nome_contato_emergencia: '',
      contato_emergencia: '',
      tipo_sanguineo: '',
      toma_medicamento: false,
      medicamentos_detalhes: '',
      historico_fraturas: false,
      fraturas_detalhes: '',
      tem_alergias: false,
      alergias_detalhes: '',
      observacoes_medicas: '',
      status: 'ativo'
    });
  };

  const populateFormData = (studentData) => {
    if (studentData) {
      // Formatar data de nascimento e data de início para o formato do input
      const formatDateForInput = (date) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      setFormData({
        nome: studentData.nome || '',
        email: studentData.email || '',
        telefone: studentData.telefone || '',
        data_nascimento: formatDateForInput(studentData.data_nascimento),

        cep: studentData.cep || '',
        rua: studentData.rua || '',
        numero: studentData.numero || '',
        complemento: studentData.complemento || '',
        bairro: studentData.bairro || '',
        cidade: studentData.cidade || '',
        estado: studentData.estado || '',

        email_responsavel: studentData.email_responsavel || '',

        programa: studentData.programa || 'Adultos',
        graduacao: studentData.graduacao || 'Branca',
        graus_faixa: studentData.graus_faixa || 0,
        plano_id: studentData.plano_id || '',
        data_inicio: formatDateForInput(studentData.data_inicio),

        bolsista: Boolean(studentData.bolsista),
        bolsa_observacao: studentData.bolsa_observacao || '',

        valor_mensalidade_customizado: studentData.valor_mensalidade_customizado || '',

        nome_contato_emergencia: studentData.nome_contato_emergencia || '',
        contato_emergencia: studentData.contato_emergencia || '',

        tipo_sanguineo: studentData.tipo_sanguineo || '',
        toma_medicamento: studentData.toma_medicamento || false,
        medicamentos_detalhes: studentData.medicamentos_detalhes || '',
        historico_fraturas: studentData.historico_fraturas || false,
        fraturas_detalhes: studentData.fraturas_detalhes || '',
        tem_alergias: studentData.tem_alergias || false,
        alergias_detalhes: studentData.alergias_detalhes || '',
        observacoes_medicas: studentData.observacoes_medicas || '',

        status: studentData.status || 'ativo'
      });
    }
  };

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let formattedValue = value;

    // Aplicar formatação específica
    if (name === 'telefone' || name === 'contato_emergencia') {
      formattedValue = formatPhone(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    }

    // Se mudou a modalidade, resetar graduação e graus para valores padrão
    if (name === 'programa') {
      const graduacoesPorModalidade = getGraduacoesPorModalidade();
      const graduacaoPadrao = graduacoesPorModalidade[formattedValue]?.[0]?.value || 'Branca';

      setFormData(prev => ({
        ...prev,
        programa: formattedValue,
        graduacao: graduacaoPadrao,
        graus_faixa: 0
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) || 0 : formattedValue)
    }));
  };

  // Buscar endereço via ViaCEP
  const buscarCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');

    if (cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    setLoadingCEP(true);

    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);

      if (response.data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        rua: response.data.logradouro || '',
        bairro: response.data.bairro || '',
        cidade: response.data.localidade || '',
        estado: response.data.uf || '',
        complemento: response.data.complemento || prev.complemento
      }));

      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCEP(false);
    }
  };

  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    // Email é obrigatório apenas se email_responsavel não estiver preenchido
    if (!formData.email_responsavel.trim() && !formData.email.trim()) {
      setError('Email é obrigatório (ou preencha o Email do Responsável)');
      return false;
    }

    // Se o email estiver preenchido, validar formato
    if (formData.email.trim() && !isValidEmail(formData.email)) {
      setError('Email inválido');
      return false;
    }
    if (!formData.data_inicio) {
      setError('Data de início é obrigatória');
      return false;
    }

    // Validar email do responsável para menores de 18 anos
    if (age !== null && age < 18 && !formData.email_responsavel.trim()) {
      setError('Email do responsável é obrigatório para menores de 18 anos');
      return false;
    }

    if (formData.email_responsavel && !isValidEmail(formData.email_responsavel)) {
      setError('Email do responsável inválido');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e, criarMensalidade = false) => {
    e.preventDefault();
    setError('');

    // Prevenir dupla submissão
    if (loading) {
      console.log('[DEBUG] Submissão bloqueada - já está processando');
      return;
    }

    if (!validateForm()) {
      return;
    }

    console.log('[DEBUG] Iniciando submissão. criarMensalidade:', criarMensalidade);
    setLoading(true);

    try {
      let createdStudent = null;

      // Sanitizar formData: converter strings vazias em null para campos opcionais
      const sanitizedData = { ...formData };
      const fieldsToConvertToNull = [
        'plano_id',
        'valor_mensalidade_customizado',
        'professor_responsavel',
        'email_responsavel',
        'complemento',
        'bolsa_observacao',
        'tipo_sanguineo',
        'medicamentos_detalhes',
        'fraturas_detalhes',
        'alergias_detalhes',
        'observacoes_medicas'
      ];

      fieldsToConvertToNull.forEach(field => {
        if (sanitizedData[field] === '') {
          sanitizedData[field] = null;
        }
      });

      if (isEditing) {
        await studentService.updateStudent(student.id, sanitizedData);
        toast.success('Aluno atualizado com sucesso!');
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.log('[DEBUG] Enviando dados:', { ...sanitizedData, nome: sanitizedData.nome });
        const response = await studentService.createStudent(sanitizedData);
        createdStudent = response.data.student;
        console.log('[DEBUG] Resposta recebida:', createdStudent);

        if (criarMensalidade) {
          toast.success('Aluno cadastrado! Redirecionando para cadastro de mensalidades...');
        } else {
          toast.success('Aluno cadastrado com sucesso! Email de boas-vindas enviado.');
        }

        console.log('[DEBUG] Aluno criado:', createdStudent.nome, 'criarMensalidade:', criarMensalidade);

        // Fechar o modal de aluno
        handleClose();

        // Sempre chamar onSuccess, passando o student E se deve criar mensalidade
        if (onSuccess) {
          console.log('[DEBUG] Chamando onSuccess com:', createdStudent.nome, criarMensalidade);
          onSuccess(createdStudent, criarMensalidade);
        }
      }
    } catch (error) {
      console.error('[DEBUG] Erro ao criar aluno:', error);
      console.error('[DEBUG] Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || 'Erro ao salvar aluno';
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
      cep: '',
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      email_responsavel: '',
      programa: 'Adultos',
      graduacao: 'Branca',
      graus_faixa: 0,
      plano_id: '',
      data_inicio: new Date().toISOString().split('T')[0],
      professor_responsavel: '',
      bolsista: false,
      bolsa_observacao: '',
      valor_mensalidade_customizado: '',
      nome_contato_emergencia: '',
      contato_emergencia: '',
      tipo_sanguineo: '',
      toma_medicamento: false,
      medicamentos_detalhes: '',
      historico_fraturas: false,
      fraturas_detalhes: '',
      tem_alergias: false,
      alergias_detalhes: '',
      observacoes_medicas: '',
      status: 'ativo'
    });
    setError('');
    setAge(null);
  };

  const onHide = () => {
    if (!loading) {
      resetForm();
      handleClose();
    }
  };

  // Graduações por modalidade (padrão IBJJF)
  const getGraduacoesPorModalidade = () => ({
    'Adultos': [
      { value: 'Branca', label: 'Branca' },
      { value: 'Azul', label: 'Azul' },
      { value: 'Roxa', label: 'Roxa' },
      { value: 'Marrom', label: 'Marrom' },
      { value: 'Preta', label: 'Preta' }
    ],
    'Infantil': [
      { value: 'Branca', label: 'Branca' },
      { value: 'Cinza', label: 'Cinza' },
      { value: 'Cinza-Branca', label: 'Cinza-Branca' },
      { value: 'Amarela', label: 'Amarela' },
      { value: 'Amarela-Branca', label: 'Amarela-Branca' },
      { value: 'Laranja', label: 'Laranja' },
      { value: 'Laranja-Branca', label: 'Laranja-Branca' },
      { value: 'Verde', label: 'Verde' },
      { value: 'Verde-Branca', label: 'Verde-Branca' }
    ],
    'Juvenil': [
      { value: 'Cinza-Branca', label: 'Cinza-Branca' },
      { value: 'Amarela-Branca', label: 'Amarela-Branca' },
      { value: 'Laranja-Branca', label: 'Laranja-Branca' },
      { value: 'Verde-Branca', label: 'Verde-Branca' },
      { value: 'Azul', label: 'Azul' },
      { value: 'Roxa', label: 'Roxa' }
    ],
    'Master': [
      { value: 'Branca', label: 'Branca' },
      { value: 'Azul', label: 'Azul' },
      { value: 'Roxa', label: 'Roxa' },
      { value: 'Marrom', label: 'Marrom' },
      { value: 'Preta', label: 'Preta' }
    ]
  });

  // Obter graduações disponíveis baseado no programa selecionado
  const graduacoesDisponiveis = getGraduacoesPorModalidade()[formData.programa] || getGraduacoesPorModalidade()['Adultos'];

  // Obter máximo de graus baseado no programa
  const getMaxGraus = () => {
    if (formData.programa === 'Infantil') {
      return 12; // Infantil tem até 12 graus
    }
    if (formData.programa === 'Juvenil') {
      return 10; // Juvenil tem até 10 graus
    }
    return 4; // Adultos e Master têm até 4 graus
  };

  const tiposSanguineos = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  return (
    <Modal show={show} onHide={onHide} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title className="text-gb-red gb-heading">
          {isEditing ? 'Editar Aluno' : 'Novo Aluno'}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {/* DADOS PESSOAIS */}
          <Row>
            <Col md={12}>
              <h6 className="text-gb-red gb-heading border-bottom-gb-red pb-2 mb-3">
                Dados Pessoais
              </h6>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Nome Completo *</Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  placeholder="Ex: João da Silva"
                  required
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">
                  Email {!formData.email_responsavel.trim() && '*'}
                </Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@exemplo.com"
                  required={!formData.email_responsavel.trim()}
                  disabled={loading}
                  autoComplete="off"
                />
                {formData.email_responsavel.trim() && (
                  <Form.Text className="text-muted">
                    Opcional - Email do responsável já preenchido
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Telefone</Form.Label>
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
                <Form.Label className="gb-body fw-bold">Data de Nascimento</Form.Label>
                <Form.Control
                  type="date"
                  name="data_nascimento"
                  value={formData.data_nascimento}
                  onChange={handleChange}
                  disabled={loading}
                />
                {age !== null && (
                  <Form.Text className={age < 18 ? 'text-warning fw-bold' : 'text-muted'}>
                    Idade: {age} anos {age < 18 && '(Menor de idade - Email do responsável obrigatório)'}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Data de Início *</Form.Label>
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

          {/* Email do Responsável (se menor de idade) */}
          {age !== null && age < 18 && (
            <Row>
              <Col md={12}>
                <Alert variant="warning" className="mb-3">
                  <strong>Atenção:</strong> Como o aluno é menor de 18 anos, o email do responsável é obrigatório.
                </Alert>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="gb-body fw-bold">Email do Responsável *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email_responsavel"
                    value={formData.email_responsavel}
                    onChange={handleChange}
                    placeholder="email.responsavel@exemplo.com"
                    required
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    Este email será usado para acessar informações do aluno no sistema
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          )}

          {/* ENDEREÇO */}
          <hr />
          <Row>
            <Col md={12}>
              <h6 className="text-gb-blue gb-heading border-bottom-gb-blue pb-2 mb-3">
                Endereço
              </h6>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">CEP</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    placeholder="00000-000"
                    maxLength="9"
                    disabled={loading}
                  />
                  <Button
                    variant="outline-primary"
                    onClick={buscarCEP}
                    disabled={loading || loadingCEP || formData.cep.replace(/\D/g, '').length !== 8}
                  >
                    {loadingCEP ? <Spinner animation="border" size="sm" /> : 'Buscar'}
                  </Button>
                </div>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Rua/Logradouro</Form.Label>
                <Form.Control
                  type="text"
                  name="rua"
                  value={formData.rua}
                  onChange={handleChange}
                  placeholder="Rua das Flores"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Número</Form.Label>
                <Form.Control
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  placeholder="123"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Complemento</Form.Label>
                <Form.Control
                  type="text"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleChange}
                  placeholder="Apto 45"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Bairro</Form.Label>
                <Form.Control
                  type="text"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  placeholder="Centro"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Cidade</Form.Label>
                <Form.Control
                  type="text"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Manaus"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={1}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">UF</Form.Label>
                <Form.Control
                  type="text"
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  placeholder="AM"
                  maxLength="2"
                  disabled={loading}
                  style={{ textTransform: 'uppercase' }}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* DADOS ACADÊMICOS */}
          <hr />
          <Row>
            <Col md={12}>
              <h6 className="text-gb-red gb-heading border-bottom-gb-red pb-2 mb-3">
                Dados Acadêmicos
              </h6>
            </Col>
          </Row>

          <Row>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Modalidade</Form.Label>
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
                <Form.Label className="gb-body fw-bold">Graduação</Form.Label>
                <Form.Select
                  name="graduacao"
                  value={formData.graduacao}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {graduacoesDisponiveis.map(grad => (
                    <option key={grad.value} value={grad.value}>{grad.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Graus na Faixa</Form.Label>
                <Form.Control
                  type="number"
                  name="graus_faixa"
                  value={formData.graus_faixa}
                  onChange={handleChange}
                  min="0"
                  max={getMaxGraus()}
                  disabled={loading}
                />
                <Form.Text className="text-muted">
                  {formData.programa === 'Infantil'
                    ? 'Máximo 12 graus'
                    : formData.programa === 'Juvenil'
                    ? 'Máximo 10 graus'
                    : 'Máximo 4 graus'}
                </Form.Text>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Status</Form.Label>
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

          {/* CONTATO DE EMERGÊNCIA */}
          <hr />
          <Row>
            <Col md={12}>
              <h6 className="text-gb-blue gb-heading border-bottom-gb-blue pb-2 mb-3">
                Contato de Emergência
              </h6>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Nome do Contato</Form.Label>
                <Form.Control
                  type="text"
                  name="nome_contato_emergencia"
                  value={formData.nome_contato_emergencia}
                  onChange={handleChange}
                  placeholder="Maria da Silva"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Telefone de Emergência</Form.Label>
                <Form.Control
                  type="text"
                  name="contato_emergencia"
                  value={formData.contato_emergencia}
                  onChange={handleChange}
                  placeholder="(11) 98888-8888"
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* INFORMAÇÕES MÉDICAS */}
          <hr />
          <Row>
            <Col md={12}>
              <h6 className="text-danger gb-heading border-bottom border-danger pb-2 mb-3">
                Informações Médicas
              </h6>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Tipo Sanguíneo</Form.Label>
                <Form.Select
                  name="tipo_sanguineo"
                  value={formData.tipo_sanguineo}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Selecione</option>
                  {tiposSanguineos.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Toma Medicamento?</Form.Label>
                <Form.Check
                  type="checkbox"
                  name="toma_medicamento"
                  label="Sim, toma medicamento regularmente"
                  checked={formData.toma_medicamento}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2"
                />
              </Form.Group>
            </Col>
          </Row>

          {formData.toma_medicamento && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="gb-body fw-bold">Detalhes dos Medicamentos</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="medicamentos_detalhes"
                    value={formData.medicamentos_detalhes}
                    onChange={handleChange}
                    placeholder="Ex: Ritalina 10mg - 1x ao dia pela manhã"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Histórico de Fraturas?</Form.Label>
                <Form.Check
                  type="checkbox"
                  name="historico_fraturas"
                  label="Sim, já teve fraturas"
                  checked={formData.historico_fraturas}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Possui Alergias?</Form.Label>
                <Form.Check
                  type="checkbox"
                  name="tem_alergias"
                  label="Sim, possui alergias"
                  checked={formData.tem_alergias}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-2"
                />
              </Form.Group>
            </Col>
          </Row>

          {formData.historico_fraturas && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="gb-body fw-bold">Detalhes das Fraturas</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="fraturas_detalhes"
                    value={formData.fraturas_detalhes}
                    onChange={handleChange}
                    placeholder="Ex: Fratura no punho esquerdo em 2020, fratura no tornozelo direito em 2021"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          {formData.tem_alergias && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="gb-body fw-bold">Detalhes das Alergias</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="alergias_detalhes"
                    value={formData.alergias_detalhes}
                    onChange={handleChange}
                    placeholder="Ex: Alergia a penicilina, alergia a amendoim"
                    disabled={loading}
                  />
                </Form.Group>
              </Col>
            </Row>
          )}

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label className="gb-body fw-bold">Observações Médicas Gerais</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="observacoes_medicas"
                  value={formData.observacoes_medicas}
                  onChange={handleChange}
                  placeholder="Ex: Asma leve controlada, cirurgia no joelho em 2019, usa óculos..."
                  disabled={loading}
                />
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer className="bg-light">
          <Button
            variant="secondary"
            onClick={onHide}
            disabled={loading}
          >
            Cancelar
          </Button>

          {!isEditing && (
            <Button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              variant="primary"
              disabled={loading}
              className="btn-gb-blue"
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
                  Cadastrando...
                </>
              ) : (
                'Cadastrar e Adicionar Mensalidade'
              )}
            </Button>
          )}

          <Button
            type="submit"
            variant="danger"
            disabled={loading}
            className="btn-gb-red"
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

export default StudentModalEnhanced;
