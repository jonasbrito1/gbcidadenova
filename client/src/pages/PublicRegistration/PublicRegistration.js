import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { FaCheckCircle, FaUserPlus, FaShieldAlt } from 'react-icons/fa';
import { formatPhone, formatCEP } from '../../utils/formatters';
import { formularioService } from '../../services/api';
import './PublicRegistration.css';

const PublicRegistration = () => {
  // Estado do modal de consentimento LGPD
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [consentCheckbox, setConsentCheckbox] = useState(false);

  // Graduações por modalidade (padrão IBJJF)
  const graduacoesPorModalidade = {
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
  };

  const [formData, setFormData] = useState({
    // Dados Pessoais
    nome: '',
    email: '',
    telefone: '',
    data_nascimento: '',

    // Endereço
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',

    // Email do Responsável (se menor)
    email_responsavel: '',

    // Dados Acadêmicos
    programa: 'Adultos',
    graduacao: 'Branca',
    graus_faixa: 0,
    data_inicio: new Date().toISOString().split('T')[0],

    // Contato de Emergência
    nome_contato_emergencia: '',
    contato_emergencia: '',
    contato_emergencia_parentesco: '',

    // Informações Médicas
    tipo_sanguineo: '',
    toma_medicamento: false,
    medicamentos_detalhes: '',
    historico_fraturas: false,
    fraturas_detalhes: '',
    tem_alergias: false,
    alergias_detalhes: '',
    observacoes_medicas: ''
  });

  const [age, setAge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Calcular idade
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

  useEffect(() => {
    if (formData.data_nascimento) {
      const calculatedAge = calculateAge(formData.data_nascimento);
      setAge(calculatedAge);
    }
  }, [formData.data_nascimento]);

  // Buscar CEP
  const buscarCEP = async () => {
    const cep = formData.cep.replace(/\D/g, '');

    if (cep.length !== 8) {
      setError('CEP deve conter 8 dígitos');
      return;
    }

    setLoadingCEP(true);
    setError('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado');
        setLoadingCEP(false);
        return;
      }

      setFormData(prev => ({
        ...prev,
        rua: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      }));

    } catch (err) {
      setError('Erro ao buscar CEP. Tente novamente.');
    } finally {
      setLoadingCEP(false);
    }
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    let finalValue = type === 'checkbox' ? checked : value;

    // Formatação automática
    if (name === 'telefone' || name === 'contato_emergencia') {
      finalValue = formatPhone(value);
    } else if (name === 'cep') {
      finalValue = formatCEP(value);
    }

    // Quando mudar a modalidade, resetar graduação e graus para valores padrão da nova modalidade
    if (name === 'programa') {
      const graduacoesDisponiveis = graduacoesPorModalidade[finalValue];
      const graduacaoPadrao = graduacoesDisponiveis && graduacoesDisponiveis.length > 0
        ? graduacoesDisponiveis[0].value
        : 'Branca';

      setFormData(prev => ({
        ...prev,
        programa: finalValue,
        graduacao: graduacaoPadrao,
        graus_faixa: 0
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  // Aceitar consentimento LGPD
  const handleAcceptConsent = () => {
    if (!consentCheckbox) {
      return;
    }
    setConsentAccepted(true);
    setShowConsentModal(false);
  };

  // Validar formulário
  const validateForm = () => {
    if (!formData.nome.trim()) {
      setError('Nome é obrigatório');
      return false;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Email válido é obrigatório');
      return false;
    }

    if (!formData.data_nascimento) {
      setError('Data de nascimento é obrigatória');
      return false;
    }

    if (age !== null && age < 18 && !formData.email_responsavel.trim()) {
      setError('Email do responsável é obrigatório para menores de 18 anos');
      return false;
    }

    if (!formData.data_inicio) {
      setError('Data de início é obrigatória');
      return false;
    }

    return true;
  };

  // Enviar formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await formularioService.enviarFormulario({
        ...formData,
        lgpd_aceite_publico: true // Consentimento LGPD já aceito no modal
      });

      setSuccess(true);
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
        data_inicio: new Date().toISOString().split('T')[0],
        nome_contato_emergencia: '',
        contato_emergencia: '',
        contato_emergencia_parentesco: '',
        tipo_sanguineo: '',
        toma_medicamento: false,
        medicamentos_detalhes: '',
        historico_fraturas: false,
        fraturas_detalhes: '',
        tem_alergias: false,
        alergias_detalhes: '',
        observacoes_medicas: ''
      });

      // Rolar para o topo
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar formulário. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Modal de Consentimento LGPD
  if (!consentAccepted) {
    return (
      <>
        <Modal
          show={showConsentModal}
          onHide={() => {}}
          backdrop="static"
          keyboard={false}
          size="lg"
          centered
        >
          <Modal.Header className="bg-primary text-white">
            <Modal.Title>
              <FaShieldAlt className="me-2" />
              Consentimento para Coleta de Dados - LGPD
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4">
            <Alert variant="info" className="mb-4">
              <strong>Importante:</strong> Antes de preencher o formulário de cadastro, você deve
              ler e concordar com os termos de coleta e uso de dados pessoais.
            </Alert>

            <div className="consent-content" style={{ maxHeight: '400px', overflowY: 'auto', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
              <h5 className="text-danger mb-3">Termo de Consentimento - Lei Geral de Proteção de Dados (LGPD)</h5>

              <p className="text-justify">
                A <strong>Gracie Barra Cidade Nova</strong> respeita a sua privacidade e está comprometida com a
                proteção dos seus dados pessoais, em conformidade com a Lei nº 13.709/2018 (LGPD).
              </p>

              <h6 className="text-primary mt-3 mb-2">1. Dados que Serão Coletados</h6>
              <p>Ao preencher este formulário, coletaremos as seguintes informações:</p>
              <ul>
                <li><strong>Dados pessoais:</strong> nome completo, email, telefone, data de nascimento</li>
                <li><strong>Endereço completo:</strong> CEP, rua, número, complemento, bairro, cidade, estado</li>
                <li><strong>Dados do responsável:</strong> email do responsável legal (para menores de 18 anos)</li>
                <li><strong>Informações acadêmicas:</strong> modalidade de interesse, graduação atual</li>
                <li><strong>Contato de emergência:</strong> nome e telefone</li>
                <li><strong>Informações médicas:</strong> tipo sanguíneo, uso de medicamentos, alergias, histórico de fraturas</li>
              </ul>

              <h6 className="text-primary mt-3 mb-2">2. Finalidade do Uso dos Dados</h6>
              <p>Seus dados serão utilizados exclusivamente para:</p>
              <ul>
                <li>Avaliar e processar sua solicitação de cadastro na academia</li>
                <li>Criar sua matrícula e perfil no sistema após aprovação</li>
                <li>Comunicação sobre o status do seu cadastro</li>
                <li>Gestão administrativa e acadêmica (após aprovação)</li>
                <li>Atendimento em situações de emergência</li>
                <li>Envio de informações sobre aulas, horários e atividades</li>
              </ul>

              <h6 className="text-primary mt-3 mb-2">3. Compartilhamento de Dados</h6>
              <p>
                Seus dados <strong>NÃO serão compartilhados</strong> com terceiros, exceto quando:
              </p>
              <ul>
                <li>Necessário para prestação de serviços essenciais (ex: sistema de pagamento)</li>
                <li>Exigido por lei ou ordem judicial</li>
                <li>Em caso de emergência médica, com profissionais de saúde</li>
              </ul>

              <h6 className="text-primary mt-3 mb-2">4. Armazenamento e Segurança</h6>
              <p>
                Seus dados serão armazenados em servidores seguros, protegidos por:
              </p>
              <ul>
                <li>Criptografia de senhas e dados sensíveis</li>
                <li>Controle de acesso restrito aos administradores autorizados</li>
                <li>Backups regulares para prevenção de perda de dados</li>
                <li>Medidas técnicas contra acessos não autorizados</li>
              </ul>

              <h6 className="text-primary mt-3 mb-2">5. Seus Direitos</h6>
              <p>Você tem direito a:</p>
              <ul>
                <li>Confirmar a existência de tratamento dos seus dados</li>
                <li>Acessar seus dados a qualquer momento</li>
                <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                <li>Solicitar a exclusão de dados desnecessários</li>
                <li>Revogar este consentimento a qualquer momento</li>
                <li>Solicitar portabilidade dos seus dados</li>
              </ul>

              <h6 className="text-primary mt-3 mb-2">6. Retenção de Dados</h6>
              <p>
                Seus dados serão mantidos apenas pelo tempo necessário para as finalidades descritas,
                ou conforme exigido por lei. Caso seu cadastro seja rejeitado, os dados poderão ser
                excluídos mediante solicitação.
              </p>

              <h6 className="text-primary mt-3 mb-2">7. Responsável pelos Dados</h6>
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados pessoais,
                entre em contato através do email: <strong>contato@gbcidadenovaam.com.br</strong>
              </p>

              <Alert variant="warning" className="mt-4 mb-0">
                <strong>Atenção:</strong> Ao aceitar este termo, você estará dando seu consentimento livre,
                informado e inequívoco para a coleta e tratamento dos seus dados pessoais conforme descrito acima.
              </Alert>
            </div>

            <Form.Group className="mt-4 mb-0">
              <Form.Check
                type="checkbox"
                id="consent-checkbox"
                checked={consentCheckbox}
                onChange={(e) => setConsentCheckbox(e.target.checked)}
                label={
                  <span>
                    <strong>Li e concordo</strong> com os termos descritos acima e autorizo expressamente
                    a <strong>Gracie Barra Cidade Nova</strong> a coletar e tratar meus dados pessoais
                    para as finalidades informadas, conforme a LGPD.
                  </span>
                }
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="danger"
              size="lg"
              onClick={handleAcceptConsent}
              disabled={!consentCheckbox}
              className="w-100"
            >
              <FaCheckCircle className="me-2" />
              {consentCheckbox ? 'Aceitar e Prosseguir para o Cadastro' : 'Marque o consentimento para continuar'}
            </Button>
            <div className="text-center w-100 mt-2">
              <small className="text-muted">
                Sem o consentimento, não será possível prosseguir com o cadastro
              </small>
            </div>
          </Modal.Footer>
        </Modal>
      </>
    );
  }

  if (success) {
    return (
      <div className="public-registration-page">
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="success-card text-center shadow-lg">
                <Card.Body className="p-5">
                  <FaCheckCircle className="success-icon text-success mb-4" size={80} />
                  <h2 className="text-gb-red mb-3">Formulário Enviado com Sucesso!</h2>
                  <p className="lead text-muted mb-4">
                    Obrigado por se cadastrar na <strong>Gracie Barra Cidade Nova</strong>!
                  </p>
                  <p className="text-muted mb-4">
                    Seu formulário foi recebido e está aguardando validação de nossa equipe.
                    Em breve você receberá um email com suas credenciais de acesso ao sistema.
                  </p>
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={() => {
                      setSuccess(false);
                      setConsentAccepted(false);
                      setConsentCheckbox(false);
                      setShowConsentModal(true);
                    }}
                  >
                    Enviar Outro Formulário
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="public-registration-page">
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col lg={10}>
            {/* Header */}
            <div className="text-center mb-5">
              <h1 className="text-gb-red mb-3">
                <FaUserPlus className="me-3" />
                Cadastro de Aluno
              </h1>
              <p className="lead text-muted">
                Gracie Barra Cidade Nova - Academia de Jiu-Jitsu
              </p>
              <p className="text-muted">
                Preencha o formulário abaixo para se cadastrar. Após a validação de nossa equipe,
                você receberá um email com suas credenciais de acesso.
              </p>
            </div>

            <Card className="shadow-lg">
              <Card.Body className="p-4">
                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {/* DADOS PESSOAIS */}
                  <div className="form-section mb-4">
                    <h5 className="section-title text-gb-red border-bottom-gb-red pb-2 mb-3">
                      Dados Pessoais
                    </h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nome Completo *</Form.Label>
                          <Form.Control
                            type="text"
                            name="nome"
                            value={formData.nome}
                            onChange={handleChange}
                            required
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
                            required
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
                            placeholder="(00) 00000-0000"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Data de Nascimento *</Form.Label>
                          <Form.Control
                            type="date"
                            name="data_nascimento"
                            value={formData.data_nascimento}
                            onChange={handleChange}
                            required
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        {age !== null && (
                          <div className="mt-4 pt-2">
                            <strong>Idade:</strong> {age} anos
                          </div>
                        )}
                      </Col>
                    </Row>

                    {age !== null && age < 18 && (
                      <Alert variant="warning" className="mb-3">
                        <strong>Atenção:</strong> Email do responsável é obrigatório para menores de 18 anos.
                      </Alert>
                    )}

                    {age !== null && age < 18 && (
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Email do Responsável *</Form.Label>
                            <Form.Control
                              type="email"
                              name="email_responsavel"
                              value={formData.email_responsavel}
                              onChange={handleChange}
                              required
                            />
                            <Form.Text className="text-muted">
                              Este email será usado para acesso ao sistema
                            </Form.Text>
                          </Form.Group>
                        </Col>
                      </Row>
                    )}
                  </div>

                  {/* ENDEREÇO */}
                  <div className="form-section mb-4">
                    <h5 className="section-title text-gb-blue border-bottom-gb-blue pb-2 mb-3">
                      Endereço
                    </h5>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>CEP</Form.Label>
                          <div className="d-flex gap-2">
                            <Form.Control
                              type="text"
                              name="cep"
                              value={formData.cep}
                              onChange={handleChange}
                              placeholder="00000-000"
                              maxLength={9}
                            />
                            <Button
                              variant="outline-primary"
                              onClick={buscarCEP}
                              disabled={loading || loadingCEP}
                            >
                              {loadingCEP ? <Spinner animation="border" size="sm" /> : 'Buscar'}
                            </Button>
                          </div>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>Rua</Form.Label>
                          <Form.Control
                            type="text"
                            name="rua"
                            value={formData.rua}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Número</Form.Label>
                          <Form.Control
                            type="text"
                            name="numero"
                            value={formData.numero}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Complemento</Form.Label>
                          <Form.Control
                            type="text"
                            name="complemento"
                            value={formData.complemento}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Bairro</Form.Label>
                          <Form.Control
                            type="text"
                            name="bairro"
                            value={formData.bairro}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Cidade</Form.Label>
                          <Form.Control
                            type="text"
                            name="cidade"
                            value={formData.cidade}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={1}>
                        <Form.Group className="mb-3">
                          <Form.Label>UF</Form.Label>
                          <Form.Control
                            type="text"
                            name="estado"
                            value={formData.estado}
                            onChange={handleChange}
                            maxLength={2}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* DADOS ACADÊMICOS */}
                  <div className="form-section mb-4">
                    <h5 className="section-title text-gb-red border-bottom-gb-red pb-2 mb-3">
                      Dados Acadêmicos
                    </h5>
                    <Row>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Modalidade *</Form.Label>
                          <Form.Select
                            name="programa"
                            value={formData.programa}
                            onChange={handleChange}
                            required
                          >
                            <option value="Adultos">Adultos</option>
                            <option value="Infantil">Infantil</option>
                            <option value="Juvenil">Juvenil</option>
                            <option value="Master">Master</option>
                          </Form.Select>
                          <Form.Text className="text-muted">
                            {formData.programa === 'Infantil' && 'Até 15 anos'}
                            {formData.programa === 'Juvenil' && '16-17 anos'}
                            {formData.programa === 'Adultos' && '18+ anos'}
                            {formData.programa === 'Master' && '30+ anos'}
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Graduação Atual *</Form.Label>
                          <Form.Select
                            name="graduacao"
                            value={formData.graduacao}
                            onChange={handleChange}
                            required
                          >
                            {graduacoesPorModalidade[formData.programa].map((grad) => (
                              <option key={grad.value} value={grad.value}>
                                {grad.label}
                              </option>
                            ))}
                          </Form.Select>
                          <Form.Text className="text-muted">
                            Faixa conforme padrão IBJJF
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Graus na Faixa *</Form.Label>
                          <Form.Select
                            name="graus_faixa"
                            value={formData.graus_faixa}
                            onChange={handleChange}
                            required
                          >
                            <option value={0}>Nenhum grau</option>
                            <option value={1}>1 grau</option>
                            <option value={2}>2 graus</option>
                            <option value={3}>3 graus</option>
                            <option value={4}>4 graus</option>
                            {formData.programa === 'Infantil' && (
                              <>
                                <option value={5}>5 graus</option>
                                <option value={6}>6 graus</option>
                                <option value={7}>7 graus</option>
                                <option value={8}>8 graus</option>
                                <option value={9}>9 graus</option>
                                <option value={10}>10 graus</option>
                                <option value={11}>11 graus</option>
                                <option value={12}>12 graus</option>
                              </>
                            )}
                            {formData.programa === 'Juvenil' && (
                              <>
                                <option value={5}>5 graus</option>
                                <option value={6}>6 graus</option>
                                <option value={7}>7 graus</option>
                                <option value={8}>8 graus</option>
                                <option value={9}>9 graus</option>
                                <option value={10}>10 graus</option>
                              </>
                            )}
                          </Form.Select>
                          <Form.Text className="text-muted">
                            {formData.programa === 'Infantil'
                              ? 'Quantidade de graus/faixinhas (máximo 12)'
                              : formData.programa === 'Juvenil'
                              ? 'Quantidade de graus/faixinhas (máximo 10)'
                              : 'Quantidade de graus/faixinhas (máximo 4)'}
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-3">
                          <Form.Label>Data de Início *</Form.Label>
                          <Form.Control
                            type="date"
                            name="data_inicio"
                            value={formData.data_inicio}
                            onChange={handleChange}
                            required
                          />
                          <Form.Text className="text-muted">
                            Data de início na academia
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* CONTATO DE EMERGÊNCIA */}
                  <div className="form-section mb-4">
                    <h5 className="section-title text-gb-blue border-bottom-gb-blue pb-2 mb-3">
                      Contato de Emergência
                    </h5>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nome do Contato</Form.Label>
                          <Form.Control
                            type="text"
                            name="nome_contato_emergencia"
                            value={formData.nome_contato_emergencia}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Telefone de Emergência</Form.Label>
                          <Form.Control
                            type="text"
                            name="contato_emergencia"
                            value={formData.contato_emergencia}
                            onChange={handleChange}
                            placeholder="(00) 00000-0000"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Grau de Parentesco</Form.Label>
                          <Form.Control
                            type="text"
                            name="contato_emergencia_parentesco"
                            value={formData.contato_emergencia_parentesco}
                            onChange={handleChange}
                            placeholder="Ex: Pai, Mãe, Irmão(ã), Cônjuge, etc."
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* INFORMAÇÕES MÉDICAS */}
                  <div className="form-section mb-4">
                    <h5 className="section-title text-gb-red border-bottom-gb-red pb-2 mb-3">
                      Informações Médicas
                    </h5>
                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Tipo Sanguíneo</Form.Label>
                          <Form.Select
                            name="tipo_sanguineo"
                            value={formData.tipo_sanguineo}
                            onChange={handleChange}
                          >
                            <option value="">Selecione...</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="toma_medicamento"
                            label="Faz uso de medicamentos regularmente?"
                            checked={formData.toma_medicamento}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {formData.toma_medicamento && (
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label>Quais medicamentos?</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="medicamentos_detalhes"
                              value={formData.medicamentos_detalhes}
                              onChange={handleChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="historico_fraturas"
                            label="Possui histórico de fraturas?"
                            checked={formData.historico_fraturas}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {formData.historico_fraturas && (
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label>Detalhes das fraturas</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="fraturas_detalhes"
                              value={formData.fraturas_detalhes}
                              onChange={handleChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Check
                            type="checkbox"
                            name="tem_alergias"
                            label="Possui alergias?"
                            checked={formData.tem_alergias}
                            onChange={handleChange}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {formData.tem_alergias && (
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label>Quais alergias?</Form.Label>
                            <Form.Control
                              as="textarea"
                              rows={2}
                              name="alergias_detalhes"
                              value={formData.alergias_detalhes}
                              onChange={handleChange}
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Outras observações médicas</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            name="observacoes_medicas"
                            value={formData.observacoes_medicas}
                            onChange={handleChange}
                            placeholder="Descreva qualquer outra informação médica relevante..."
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </div>

                  {/* BOTÃO ENVIAR */}
                  <div className="text-center mt-4">
                    <Button
                      type="submit"
                      variant="danger"
                      size="lg"
                      disabled={loading}
                      className="px-5"
                    >
                      {loading ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="me-2" />
                          Enviar Cadastro
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-center mt-3">
                    <small className="text-muted">
                      Ao enviar este formulário, você concorda com a coleta e uso dos dados fornecidos
                      de acordo com a LGPD.
                    </small>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default PublicRegistration;
