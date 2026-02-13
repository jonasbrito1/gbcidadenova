import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Alert, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3011/api';

function GerenciarPlanos() {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentPlano, setCurrentPlano] = useState(null);

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_mensal: '',
    duracao_meses: 1,
    tipo: 'mensal',
    destaque: false,
    beneficios: [''],
    valor_total: '',
    valor_avista: ''
  });

  useEffect(() => {
    fetchPlanos();
  }, []);

  useEffect(() => {
    // Calcular valor total automaticamente
    if (formData.valor_mensal && formData.duracao_meses) {
      const total = parseFloat(formData.valor_mensal) * parseInt(formData.duracao_meses);
      const avista = total * 0.85; // 15% desconto
      setFormData(prev => ({
        ...prev,
        valor_total: total.toFixed(2),
        valor_avista: avista.toFixed(2)
      }));
    }
  }, [formData.valor_mensal, formData.duracao_meses]);

  const fetchPlanos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlanos(response.data);
    } catch (err) {
      setError('Erro ao carregar planos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (plano = null) => {
    if (plano) {
      setEditMode(true);
      setCurrentPlano(plano);
      setFormData({
        nome: plano.nome,
        descricao: plano.descricao,
        valor_mensal: plano.valor_mensal,
        duracao_meses: plano.duracao_meses,
        tipo: plano.tipo || 'mensal',
        destaque: plano.destaque === 1,
        beneficios: plano.beneficios ? JSON.parse(plano.beneficios) : [''],
        valor_total: plano.valor_total || '',
        valor_avista: plano.valor_avista || ''
      });
    } else {
      setEditMode(false);
      setCurrentPlano(null);
      setFormData({
        nome: '',
        descricao: '',
        valor_mensal: '',
        duracao_meses: 1,
        tipo: 'mensal',
        destaque: false,
        beneficios: [''],
        valor_total: '',
        valor_avista: ''
      });
    }
    setShowModal(true);
    setError('');
    setSuccess('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentPlano(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleBeneficioChange = (index, value) => {
    const newBeneficios = [...formData.beneficios];
    newBeneficios[index] = value;
    setFormData(prev => ({ ...prev, beneficios: newBeneficios }));
  };

  const addBeneficio = () => {
    setFormData(prev => ({
      ...prev,
      beneficios: [...prev.beneficios, '']
    }));
  };

  const removeBeneficio = (index) => {
    const newBeneficios = formData.beneficios.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, beneficios: newBeneficios }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const dataToSend = {
        ...formData,
        beneficios: formData.beneficios.filter(b => b.trim() !== ''),
        destaque: formData.destaque ? 1 : 0
      };

      if (editMode) {
        await axios.put(
          `${API_URL}/plans/${currentPlano.id}`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Plano atualizado com sucesso!');
      } else {
        await axios.post(
          `${API_URL}/plans`,
          dataToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccess('Plano criado com sucesso!');
      }

      await fetchPlanos();
      setTimeout(() => {
        handleCloseModal();
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar plano');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (plano) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = plano.status === 'ativo' ? 'inativo' : 'ativo';

      await axios.put(
        `${API_URL}/plans/${plano.id}`,
        { ...plano, status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess(`Plano ${newStatus === 'ativo' ? 'ativado' : 'desativado'} com sucesso!`);
      await fetchPlanos();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erro ao alterar status do plano');
      console.error(err);
    }
  };

  if (loading && planos.length === 0) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Carregando planos...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Gerenciar Planos de Pagamento</h2>
          <p className="text-muted">Crie e gerencie os planos disponíveis para os alunos</p>
        </Col>
        <Col xs="auto">
          <Button variant="primary" onClick={() => handleShowModal()}>
            + Novo Plano
          </Button>
        </Col>
      </Row>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Descrição</th>
                <th>Valor Mensal</th>
                <th>Duração</th>
                <th>Valor Total</th>
                <th>Valor À Vista</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Destaque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {planos.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-4">
                    Nenhum plano cadastrado
                  </td>
                </tr>
              ) : (
                planos.map(plano => (
                  <tr key={plano.id}>
                    <td>{plano.id}</td>
                    <td><strong>{plano.nome}</strong></td>
                    <td>{plano.descricao}</td>
                    <td>R$ {parseFloat(plano.valor_mensal).toFixed(2)}</td>
                    <td>{plano.duracao_meses} {plano.duracao_meses === 1 ? 'mês' : 'meses'}</td>
                    <td>
                      {plano.valor_total ? `R$ ${parseFloat(plano.valor_total).toFixed(2)}` : '-'}
                    </td>
                    <td>
                      {plano.valor_avista ? `R$ ${parseFloat(plano.valor_avista).toFixed(2)}` : '-'}
                    </td>
                    <td>
                      <Badge bg="info">{plano.tipo || 'N/A'}</Badge>
                    </td>
                    <td>
                      <Badge bg={plano.status === 'ativo' ? 'success' : 'secondary'}>
                        {plano.status}
                      </Badge>
                    </td>
                    <td>
                      {plano.destaque === 1 && <Badge bg="warning">⭐</Badge>}
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        onClick={() => handleShowModal(plano)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant={plano.status === 'ativo' ? 'outline-danger' : 'outline-success'}
                        onClick={() => handleToggleStatus(plano)}
                      >
                        {plano.status === 'ativo' ? 'Desativar' : 'Ativar'}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Modal de Criar/Editar Plano */}
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editMode ? 'Editar Plano' : 'Novo Plano'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nome do Plano *</Form.Label>
                  <Form.Control
                    type="text"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    placeholder="Ex: Plano Premium"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo *</Form.Label>
                  <Form.Control
                    as="select"
                    name="tipo"
                    value={formData.tipo}
                    onChange={handleChange}
                    required
                  >
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </Form.Control>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                placeholder="Descrição do plano"
              />
            </Form.Group>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Mensal (R$) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    name="valor_mensal"
                    value={formData.valor_mensal}
                    onChange={handleChange}
                    required
                    placeholder="0.00"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Duração (meses) *</Form.Label>
                  <Form.Control
                    type="number"
                    name="duracao_meses"
                    value={formData.duracao_meses}
                    onChange={handleChange}
                    required
                    min="1"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    <Form.Check
                      type="checkbox"
                      name="destaque"
                      label="Marcar como destaque"
                      checked={formData.destaque}
                      onChange={handleChange}
                      className="mt-4"
                    />
                  </Form.Label>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Total</Form.Label>
                  <Form.Control
                    type="text"
                    value={`R$ ${formData.valor_total}`}
                    disabled
                  />
                  <Form.Text className="text-muted">
                    Calculado automaticamente
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor À Vista (15% desconto)</Form.Label>
                  <Form.Control
                    type="text"
                    value={`R$ ${formData.valor_avista}`}
                    disabled
                  />
                  <Form.Text className="text-muted">
                    Calculado automaticamente
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <hr />

            <Form.Label>Benefícios Inclusos</Form.Label>
            {formData.beneficios.map((beneficio, index) => (
              <Row key={index} className="mb-2">
                <Col md={10}>
                  <Form.Control
                    type="text"
                    value={beneficio}
                    onChange={(e) => handleBeneficioChange(index, e.target.value)}
                    placeholder="Digite um benefício"
                  />
                </Col>
                <Col md={2}>
                  {formData.beneficios.length > 1 && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => removeBeneficio(index)}
                    >
                      Remover
                    </Button>
                  )}
                </Col>
              </Row>
            ))}
            <Button variant="outline-secondary" size="sm" onClick={addBeneficio} className="mt-2">
              + Adicionar Benefício
            </Button>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Criar Plano'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}

export default GerenciarPlanos;
