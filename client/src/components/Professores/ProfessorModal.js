import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { professorService } from '../../services/api';
import { toast } from 'react-toastify';
import { useQuery } from 'react-query';
import api from '../../services/api';

const ProfessorModal = ({ show, handleClose, professor = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf: '',
    data_nascimento: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    graduacao_id: '',
    especialidades: '',
    biografia: '',
    certificacoes: '',
    data_contratacao: '',
    salario: '',
    status: 'ativo'
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Buscar graduações
  const { data: graduacoes = [] } = useQuery(
    'graduacoes',
    async () => {
      const response = await api.get('/api/graduacoes');
      return response.data;
    },
    {
      enabled: show
    }
  );

  useEffect(() => {
    if (professor) {
      setFormData({
        nome: professor.nome || '',
        email: professor.email || '',
        telefone: professor.telefone || '',
        cpf: professor.cpf || '',
        data_nascimento: professor.data_nascimento || '',
        endereco: professor.endereco || '',
        cidade: professor.cidade || '',
        estado: professor.estado || '',
        cep: professor.cep || '',
        graduacao_id: professor.graduacao_id || '',
        especialidades: professor.especialidades || '',
        biografia: professor.biografia || '',
        certificacoes: professor.certificacoes || '',
        data_contratacao: professor.data_contratacao || '',
        salario: professor.salario || '',
        status: professor.status || 'ativo'
      });
    } else {
      // Reset form
      setFormData({
        nome: '',
        email: '',
        telefone: '',
        cpf: '',
        data_nascimento: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        graduacao_id: '',
        especialidades: '',
        biografia: '',
        certificacoes: '',
        data_contratacao: '',
        salario: '',
        status: 'ativo'
      });
    }
    setErrors({});
  }, [professor, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpar erro do campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.email.trim()) newErrors.email = 'Email é obrigatório';
    if (!formData.telefone.trim()) newErrors.telefone = 'Telefone é obrigatório';

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);

    try {
      if (professor) {
        await professorService.updateProfessor(professor.id, formData);
        toast.success('Professor atualizado com sucesso!');
      } else {
        await professorService.createProfessor(formData);
        toast.success('Professor cadastrado com sucesso!');
      }
      onSuccess();
    } catch (error) {
      console.error('Erro ao salvar professor:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar professor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {professor ? 'Editar Professor' : 'Novo Professor'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={12}>
              <h6 className="text-danger mb-3">Dados Pessoais</h6>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nome Completo <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  isInvalid={!!errors.nome}
                  placeholder="Nome completo do professor"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.nome}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Email <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  isInvalid={!!errors.email}
                  placeholder="email@exemplo.com"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.email}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Telefone <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  isInvalid={!!errors.telefone}
                  placeholder="(92) 98888-8888"
                />
                <Form.Control.Feedback type="invalid">
                  {errors.telefone}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>CPF</Form.Label>
                <Form.Control
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  placeholder="000.000.000-00"
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
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-danger mb-3 mt-3">Endereço</h6>
            </Col>
          </Row>

          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Endereço</Form.Label>
                <Form.Control
                  type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                  placeholder="Rua, número, complemento"
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
                  placeholder="Manaus"
                />
              </Form.Group>
            </Col>

            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                >
                  <option value="">Selecione...</option>
                  <option value="AM">Amazonas</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <h6 className="text-danger mb-3 mt-3">Informações Profissionais</h6>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Graduação</Form.Label>
                <Form.Select
                  name="graduacao_id"
                  value={formData.graduacao_id}
                  onChange={handleChange}
                >
                  <option value="">Selecione a graduação...</option>
                  {graduacoes.map((grad) => (
                    <option key={grad.id} value={grad.id}>
                      {grad.nome}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Data de Contratação</Form.Label>
                <Form.Control
                  type="date"
                  name="data_contratacao"
                  value={formData.data_contratacao}
                  onChange={handleChange}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Especialidades</Form.Label>
                <Form.Control
                  type="text"
                  name="especialidades"
                  value={formData.especialidades}
                  onChange={handleChange}
                  placeholder="Ex: Jiu-Jitsu, MMA, Defesa Pessoal"
                />
                <Form.Text className="text-muted">
                  Separe por vírgula
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Biografia</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  name="biografia"
                  value={formData.biografia}
                  onChange={handleChange}
                  placeholder="Breve biografia do professor..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={12}>
              <Form.Group className="mb-3">
                <Form.Label>Certificações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  name="certificacoes"
                  value={formData.certificacoes}
                  onChange={handleChange}
                  placeholder="Certificações e títulos..."
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Salário</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="salario"
                  value={formData.salario}
                  onChange={handleChange}
                  placeholder="0.00"
                />
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                  <option value="licenca">Em Licença</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : professor ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ProfessorModal;
