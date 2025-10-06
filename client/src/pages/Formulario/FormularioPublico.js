import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, Button, Alert, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { formularioService } from '../../services/api';
import axios from 'axios';
import './FormularioPublico.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011/api';

function FormularioPublico() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Dados pessoais
    nome: '',
    data_nascimento: '',
    telefone: '',
    email: '',

    // Endereço
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',

    // Responsável
    responsavel_nome: '',
    responsavel_telefone: '',

    // Contato de emergência
    contato_emergencia_nome: '',
    contato_emergencia_telefone: '',

    // Dados médicos
    tipo_sanguineo: '',
    condicoes_medicas: '',
    medicamentos_uso: '',
    alergias: '',

    // Experiência com Jiu-Jitsu
    ja_treinou_jiu_jitsu: 'nao',
    graduacao_atual: '',
    tempo_treino: '',

    // Plano escolhido
    plano_id: '',
    forma_pagamento_escolhida: 'parcelado',

    // Responsável (se menor de 16 anos)
    responsavel: {
      nome: '',
      telefone: '',
      email: '',
      parentesco: ''
    }
  });

  const [precisaResponsavel, setPrecisaResponsavel] = useState(false);
  const [planos, setPlanos] = useState([]);
  const [loadingPlanos, setLoadingPlanos] = useState(true);

  // Buscar planos ao carregar o componente
  useEffect(() => {
    const fetchPlanos = async () => {
      try {
        const response = await axios.get(`${API_URL}/plans`);
        setPlanos(response.data.filter(p => p.status === 'ativo'));
      } catch (err) {
        console.error('Erro ao buscar planos:', err);
      } finally {
        setLoadingPlanos(false);
      }
    };

    fetchPlanos();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Se for um campo do responsável
    if (name.startsWith('responsavel_')) {
      const field = name.replace('responsavel_', '');
      setFormData(prev => ({
        ...prev,
        responsavel: {
          ...prev.responsavel,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Calcular idade quando a data de nascimento mudar
    if (name === 'data_nascimento' && value) {
      const idade = calcularIdade(value);
      setPrecisaResponsavel(idade < 16);
    }
  };

  const calcularIdade = (dataNascimento) => {
    const hoje = new Date();
    const nascimento = new Date(dataNascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }

    return idade;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar campos obrigatórios
      if (!formData.nome || !formData.data_nascimento || !formData.telefone ||
          !formData.email || !formData.endereco || !formData.responsavel_nome ||
          !formData.responsavel_telefone || !formData.contato_emergencia_nome ||
          !formData.contato_emergencia_telefone || !formData.tipo_sanguineo) {
        throw new Error('Por favor, preencha todos os campos obrigatórios');
      }

      // Validar plano escolhido
      if (!formData.plano_id) {
        throw new Error('Por favor, escolha um plano');
      }

      // Se precisa responsável, validar campos do responsável
      if (precisaResponsavel) {
        if (!formData.responsavel.nome || !formData.responsavel.telefone ||
            !formData.responsavel.email || !formData.responsavel.parentesco) {
          throw new Error('Por favor, preencha todos os dados do responsável');
        }
      }

      // Preparar dados para envio
      const dataToSend = {
        ...formData,
        contato_emergencia_parentesco: 'N/A', // Campo obrigatório no backend
        responsavel: precisaResponsavel ? formData.responsavel : null
      };

      await formularioService.enviarFormulario(dataToSend);

      setSuccess(true);

      // Redirecionar após 3 segundos
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (err) {
      console.error('Erro ao enviar formulário:', err);
      setError(err.response?.data?.error || err.message || 'Erro ao enviar formulário');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container className="formulario-publico-container py-5">
        <Row className="justify-content-center">
          <Col md={8}>
            <Alert variant="success">
              <Alert.Heading>Formulário Enviado com Sucesso!</Alert.Heading>
              <p>
                Seu formulário de cadastro foi recebido e está aguardando análise da nossa equipe.
                Em breve você receberá um e-mail com o resultado da análise.
              </p>
              <p className="mb-0">
                Você será redirecionado para a página inicial em instantes...
              </p>
            </Alert>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <Container className="formulario-publico-container py-5">
      <Row className="justify-content-center">
        <Col md={10} lg={8}>
          <Card>
            <Card.Header className="bg-primary text-white">
              <h3 className="mb-0">Formulário de Cadastro - Gracie Barra</h3>
              <small>Preencha todos os campos para iniciar sua jornada no Jiu-Jitsu</small>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

              <Form onSubmit={handleSubmit}>
                {/* Dados Pessoais */}
                <h5 className="border-bottom pb-2 mb-3">Dados Pessoais</h5>
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
                      <Form.Label>Data de Nascimento *</Form.Label>
                      <Form.Control
                        type="date"
                        name="data_nascimento"
                        value={formData.data_nascimento}
                        onChange={handleChange}
                        required
                      />
                      {precisaResponsavel && (
                        <Form.Text className="text-warning">
                          Menor de 16 anos - Necessário informar responsável
                        </Form.Text>
                      )}
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telefone *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="telefone"
                        value={formData.telefone}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>E-mail *</Form.Label>
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

                {/* Endereço */}
                <h5 className="border-bottom pb-2 mb-3 mt-4">Endereço</h5>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Endereço Completo *</Form.Label>
                      <Form.Control
                        type="text"
                        name="endereco"
                        value={formData.endereco}
                        onChange={handleChange}
                        placeholder="Rua, Número, Complemento"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>CEP</Form.Label>
                      <Form.Control
                        type="text"
                        name="cep"
                        value={formData.cep}
                        onChange={handleChange}
                        placeholder="00000-000"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={8}>
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
                  <Col md={4}>
                    <Form.Group className="mb-3">
                      <Form.Label>Estado</Form.Label>
                      <Form.Control
                        as="select"
                        name="estado"
                        value={formData.estado}
                        onChange={handleChange}
                      >
                        <option value="">Selecione</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>
                </Row>

                {/* Responsável */}
                <h5 className="border-bottom pb-2 mb-3 mt-4">Responsável</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome do Responsável *</Form.Label>
                      <Form.Control
                        type="text"
                        name="responsavel_nome"
                        value={formData.responsavel_nome}
                        onChange={handleChange}
                        placeholder="Pai, Mãe ou Responsável"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contato do Responsável *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="responsavel_telefone"
                        value={formData.responsavel_telefone}
                        onChange={handleChange}
                        placeholder="(00) 00000-0000"
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Contato de Emergência */}
                <h5 className="border-bottom pb-2 mb-3 mt-4">Contato de Emergência</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nome *</Form.Label>
                      <Form.Control
                        type="text"
                        name="contato_emergencia_nome"
                        value={formData.contato_emergencia_nome}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Telefone *</Form.Label>
                      <Form.Control
                        type="tel"
                        name="contato_emergencia_telefone"
                        value={formData.contato_emergencia_telefone}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>


                {/* Dados Médicos */}
                <h5 className="border-bottom pb-2 mb-3 mt-4">Informações Médicas</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Tipo Sanguíneo *</Form.Label>
                      <Form.Control
                        as="select"
                        name="tipo_sanguineo"
                        value={formData.tipo_sanguineo}
                        onChange={handleChange}
                        required
                      >
                        <option value="">Selecione</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                        <option value="Não sei">Não sei</option>
                      </Form.Control>
                    </Form.Group>
                  </Col>

                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Condições Médicas</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="condicoes_medicas"
                        value={formData.condicoes_medicas}
                        onChange={handleChange}
                        placeholder="Descreva qualquer condição médica relevante (opcional)"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Medicamentos em Uso</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="medicamentos_uso"
                        value={formData.medicamentos_uso}
                        onChange={handleChange}
                        placeholder="Liste medicamentos de uso contínuo (opcional)"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Alergias</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="alergias"
                        value={formData.alergias}
                        onChange={handleChange}
                        placeholder="Descreva alergias conhecidas (opcional)"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {/* Experiência com Jiu-Jitsu */}
                <h5 className="border-bottom pb-2 mb-3 mt-4">Experiência com Jiu-Jitsu</h5>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Você já treina ou treinou Jiu-Jitsu? *</Form.Label>
                      <div>
                        <Form.Check
                          inline
                          type="radio"
                          id="ja_treinou_sim"
                          name="ja_treinou_jiu_jitsu"
                          value="sim"
                          label="Sim"
                          checked={formData.ja_treinou_jiu_jitsu === 'sim'}
                          onChange={handleChange}
                        />
                        <Form.Check
                          inline
                          type="radio"
                          id="ja_treinou_nao"
                          name="ja_treinou_jiu_jitsu"
                          value="nao"
                          label="Não"
                          checked={formData.ja_treinou_jiu_jitsu === 'nao'}
                          onChange={handleChange}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {formData.ja_treinou_jiu_jitsu === 'sim' && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Qual sua graduação atual?</Form.Label>
                        <Form.Control
                          as="select"
                          name="graduacao_atual"
                          value={formData.graduacao_atual}
                          onChange={handleChange}
                        >
                          <option value="">Selecione</option>
                          <option value="Branca">Faixa Branca</option>
                          <option value="Cinza">Faixa Cinza</option>
                          <option value="Amarela">Faixa Amarela</option>
                          <option value="Laranja">Faixa Laranja</option>
                          <option value="Verde">Faixa Verde</option>
                          <option value="Azul">Faixa Azul</option>
                          <option value="Roxa">Faixa Roxa</option>
                          <option value="Marrom">Faixa Marrom</option>
                          <option value="Preta">Faixa Preta</option>
                        </Form.Control>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Há quanto tempo treina/treinou?</Form.Label>
                        <Form.Control
                          type="text"
                          name="tempo_treino"
                          value={formData.tempo_treino}
                          onChange={handleChange}
                          placeholder="Ex: 2 anos, 6 meses"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                {/* Escolha do Plano */}
                <h5 className="border-bottom pb-2 mb-3 mt-4">Escolha seu Plano</h5>
                {loadingPlanos ? (
                  <Alert variant="info">Carregando planos disponíveis...</Alert>
                ) : (
                  <>
                    <Row>
                      <Col md={12}>
                        <Form.Group className="mb-3">
                          <Form.Label>Plano *</Form.Label>
                          <Form.Control
                            as="select"
                            name="plano_id"
                            value={formData.plano_id}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Selecione um plano</option>
                            {planos.map(plano => (
                              <option key={plano.id} value={plano.id}>
                                {plano.nome} - R$ {parseFloat(plano.valor_mensal).toFixed(2)}/mês
                                {plano.duracao_meses > 1 && ` (${plano.duracao_meses} meses - Total: R$ ${parseFloat(plano.valor_total).toFixed(2)})`}
                                {plano.destaque ? ' ⭐ MAIS POPULAR' : ''}
                              </option>
                            ))}
                          </Form.Control>
                        </Form.Group>
                      </Col>
                    </Row>

                    {formData.plano_id && planos.find(p => p.id === parseInt(formData.plano_id))?.valor_avista && (
                      <Row>
                        <Col md={12}>
                          <Form.Group className="mb-3">
                            <Form.Label>Forma de Pagamento *</Form.Label>
                            <div className="d-flex gap-3">
                              <Form.Check
                                type="radio"
                                id="parcelado"
                                name="forma_pagamento_escolhida"
                                value="parcelado"
                                label={
                                  <div>
                                    <strong>Parcelado</strong>
                                    <div className="text-muted small">
                                      R$ {parseFloat(planos.find(p => p.id === parseInt(formData.plano_id))?.valor_total || 0).toFixed(2)}
                                      {' '}em {planos.find(p => p.id === parseInt(formData.plano_id))?.duracao_meses || 1}x
                                    </div>
                                  </div>
                                }
                                checked={formData.forma_pagamento_escolhida === 'parcelado'}
                                onChange={handleChange}
                              />
                              <Form.Check
                                type="radio"
                                id="avista"
                                name="forma_pagamento_escolhida"
                                value="avista"
                                label={
                                  <div>
                                    <strong>À Vista</strong>{' '}
                                    <Badge bg="success">15% de desconto</Badge>
                                    <div className="text-muted small">
                                      R$ {parseFloat(planos.find(p => p.id === parseInt(formData.plano_id))?.valor_avista || 0).toFixed(2)}
                                    </div>
                                  </div>
                                }
                                checked={formData.forma_pagamento_escolhida === 'avista'}
                                onChange={handleChange}
                              />
                            </div>
                          </Form.Group>
                        </Col>
                      </Row>
                    )}

                    {formData.plano_id && (
                      <Alert variant="info">
                        <strong>Benefícios inclusos:</strong>
                        {planos.find(p => p.id === parseInt(formData.plano_id))?.beneficios && (
                          <ul className="mb-0 mt-2">
                            {JSON.parse(planos.find(p => p.id === parseInt(formData.plano_id))?.beneficios || '[]').map((beneficio, idx) => (
                              <li key={idx}>{beneficio}</li>
                            ))}
                          </ul>
                        )}
                      </Alert>
                    )}
                  </>
                )}

                {/* Dados do Responsável (se menor de 16 anos) */}
                {precisaResponsavel && (
                  <>
                    <h5 className="border-bottom pb-2 mb-3 mt-4 text-warning">
                      Dados do Responsável
                    </h5>
                    <Alert variant="info">
                      Como você tem menos de 16 anos, é necessário informar os dados de um responsável legal.
                    </Alert>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nome do Responsável *</Form.Label>
                          <Form.Control
                            type="text"
                            name="responsavel_nome"
                            value={formData.responsavel.nome}
                            onChange={handleChange}
                            required={precisaResponsavel}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Parentesco *</Form.Label>
                          <Form.Control
                            type="text"
                            name="responsavel_parentesco"
                            value={formData.responsavel.parentesco}
                            onChange={handleChange}
                            placeholder="Ex: Pai, Mãe, Tutor"
                            required={precisaResponsavel}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Telefone do Responsável *</Form.Label>
                          <Form.Control
                            type="tel"
                            name="responsavel_telefone"
                            value={formData.responsavel.telefone}
                            onChange={handleChange}
                            required={precisaResponsavel}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>E-mail do Responsável *</Form.Label>
                          <Form.Control
                            type="email"
                            name="responsavel_email"
                            value={formData.responsavel.email}
                            onChange={handleChange}
                            required={precisaResponsavel}
                          />
                          <Form.Text className="text-muted">
                            As credenciais de acesso também serão enviadas para este e-mail
                          </Form.Text>
                        </Form.Group>
                      </Col>
                    </Row>
                  </>
                )}

                {/* Botões */}
                <div className="d-flex justify-content-between mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/')}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Enviar Formulário'}
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default FormularioPublico;
