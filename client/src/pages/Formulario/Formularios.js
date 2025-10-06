import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Button, Badge, Modal, Form, Alert, Tabs, Tab } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { formularioService, planService } from '../../services/api';
import { toast } from 'react-toastify';
import { FaExternalLinkAlt, FaCopy } from 'react-icons/fa';
import './Formularios.css';

function Formularios() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: 'pendente'
  });

  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [showAprovarModal, setShowAprovarModal] = useState(false);
  const [showRejeitarModal, setShowRejeitarModal] = useState(false);
  const [formularioSelecionado, setFormularioSelecionado] = useState(null);

  const [planoSelecionado, setPlanoSelecionado] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Buscar formulários
  const { data: formulariosData, isLoading } = useQuery(
    ['formularios', filters],
    () => formularioService.getFormularios(filters),
    {
      onError: (error) => {
        console.error('Erro ao carregar formulários:', error);
        toast.error('Erro ao carregar formulários');
      }
    }
  );

  const formularios = Array.isArray(formulariosData?.data) ? formulariosData.data : [];

  // Buscar planos
  const { data: planosData } = useQuery('planos', () => planService.getPlans());
  const planos = Array.isArray(planosData?.data) ? planosData.data : [];

  // Mutation para aprovar
  const aprovarMutation = useMutation(
    ({ id, data }) => formularioService.aprovarFormulario(id, data),
    {
      onSuccess: (response) => {
        toast.success('Formulário aprovado com sucesso!');
        if (response.data.senha_temporaria) {
          toast.info(`Senha temporária: ${response.data.senha_temporaria}`, {
            autoClose: 10000
          });
        }
        queryClient.invalidateQueries('formularios');
        setShowAprovarModal(false);
        setFormularioSelecionado(null);
        setPlanoSelecionado('');
        setObservacoes('');
      },
      onError: (error) => {
        console.error('Erro ao aprovar formulário:', error);
        toast.error(error.response?.data?.error || 'Erro ao aprovar formulário');
      }
    }
  );

  // Mutation para rejeitar
  const rejeitarMutation = useMutation(
    ({ id, data }) => formularioService.rejeitarFormulario(id, data),
    {
      onSuccess: () => {
        toast.success('Formulário rejeitado');
        queryClient.invalidateQueries('formularios');
        setShowRejeitarModal(false);
        setFormularioSelecionado(null);
        setObservacoes('');
      },
      onError: (error) => {
        console.error('Erro ao rejeitar formulário:', error);
        toast.error('Erro ao rejeitar formulário');
      }
    }
  );

  const handleVerDetalhes = async (id) => {
    try {
      const response = await formularioService.getFormularioById(id);
      setFormularioSelecionado(response.data);
      setShowDetalhesModal(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      toast.error('Erro ao carregar detalhes do formulário');
    }
  };

  const handleAprovar = (formulario) => {
    setFormularioSelecionado(formulario);
    setShowAprovarModal(true);
  };

  const handleRejeitar = (formulario) => {
    setFormularioSelecionado(formulario);
    setShowRejeitarModal(true);
  };

  const confirmarAprovacao = () => {
    if (!planoSelecionado) {
      toast.error('Selecione um plano');
      return;
    }

    aprovarMutation.mutate({
      id: formularioSelecionado.id,
      data: {
        plano_id: planoSelecionado,
        observacoes
      }
    });
  };

  const confirmarRejeicao = () => {
    if (!observacoes.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    rejeitarMutation.mutate({
      id: formularioSelecionado.id,
      data: { observacoes }
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      pendente: <Badge bg="warning">Pendente</Badge>,
      aprovado: <Badge bg="success">Aprovado</Badge>,
      rejeitado: <Badge bg="danger">Rejeitado</Badge>
    };
    return badges[status] || <Badge bg="secondary">{status}</Badge>;
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

  const copiarLinkFormulario = () => {
    const link = `${window.location.origin}/formulario`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado para área de transferência!');
  };

  return (
    <Container fluid className="formularios-container py-4">
      <Row className="mb-4 align-items-center">
        <Col md={6}>
          <h2>Gerenciamento de Formulários de Cadastro</h2>
          <p className="text-muted">Analise e aprove cadastros de novos alunos</p>
        </Col>
        <Col md={6} className="text-end">
          <Alert variant="info" className="mb-0 d-inline-block">
            <div className="d-flex align-items-center gap-3">
              <div>
                <strong>Link do Formulário Público:</strong>
                <br />
                <small className="text-muted">{window.location.origin}/formulario</small>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={copiarLinkFormulario}
                  title="Copiar link"
                >
                  <FaCopy />
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  href={`${window.location.origin}/formulario`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FaExternalLinkAlt className="me-1" />
                  Abrir
                </Button>
              </div>
            </div>
          </Alert>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="rejeitado">Rejeitado</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabela de Formulários */}
      <Card>
        <Card.Body>
          {isLoading ? (
            <p>Carregando formulários...</p>
          ) : formularios.length === 0 ? (
            <Alert variant="info">Nenhum formulário encontrado</Alert>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Telefone</th>
                  <th>Idade</th>
                  <th>Status</th>
                  <th>Data Envio</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {formularios.map((form) => (
                  <tr key={form.id}>
                    <td>{form.id}</td>
                    <td>{form.nome}</td>
                    <td>{form.email}</td>
                    <td>{form.telefone}</td>
                    <td>{calcularIdade(form.data_nascimento)} anos</td>
                    <td>{getStatusBadge(form.status)}</td>
                    <td>{new Date(form.created_at).toLocaleDateString('pt-BR')}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="info"
                        className="me-2"
                        onClick={() => handleVerDetalhes(form.id)}
                      >
                        Detalhes
                      </Button>
                      {form.status === 'pendente' && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            className="me-2"
                            onClick={() => handleAprovar(form)}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleRejeitar(form)}
                          >
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal de Detalhes */}
      <Modal show={showDetalhesModal} onHide={() => setShowDetalhesModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalhes do Formulário</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formularioSelecionado && (
            <Tabs defaultActiveKey="pessoais" className="mb-3">
              <Tab eventKey="pessoais" title="Dados Pessoais">
                <Row>
                  <Col md={6}>
                    <p><strong>Nome:</strong> {formularioSelecionado.nome}</p>
                    <p><strong>Data de Nascimento:</strong> {new Date(formularioSelecionado.data_nascimento).toLocaleDateString('pt-BR')}</p>
                    <p><strong>Idade:</strong> {calcularIdade(formularioSelecionado.data_nascimento)} anos</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>E-mail:</strong> {formularioSelecionado.email}</p>
                    <p><strong>Telefone:</strong> {formularioSelecionado.telefone}</p>
                  </Col>
                </Row>
                <hr />
                <h6>Endereço</h6>
                <p><strong>Endereço:</strong> {formularioSelecionado.endereco}</p>
                <p><strong>Cidade/Estado:</strong> {formularioSelecionado.cidade} - {formularioSelecionado.estado}</p>
                <p><strong>CEP:</strong> {formularioSelecionado.cep}</p>
              </Tab>

              <Tab eventKey="emergencia" title="Contato de Emergência">
                <p><strong>Nome:</strong> {formularioSelecionado.contato_emergencia_nome}</p>
                <p><strong>Telefone:</strong> {formularioSelecionado.contato_emergencia_telefone}</p>
                <p><strong>Parentesco:</strong> {formularioSelecionado.contato_emergencia_parentesco}</p>
              </Tab>

              <Tab eventKey="medico" title="Informações Médicas">
                <p><strong>Tipo Sanguíneo:</strong> {formularioSelecionado.tipo_sanguineo}</p>
                <p><strong>Plano de Saúde:</strong> {formularioSelecionado.plano_saude || 'Não informado'}</p>
                <p><strong>Condições Médicas:</strong> {formularioSelecionado.condicoes_medicas || 'Nenhuma'}</p>
                <p><strong>Medicamentos em Uso:</strong> {formularioSelecionado.medicamentos_uso || 'Nenhum'}</p>
                <p><strong>Alergias:</strong> {formularioSelecionado.alergias || 'Nenhuma'}</p>
              </Tab>

              {formularioSelecionado.possui_responsavel && (
                <Tab eventKey="responsavel" title="Responsável">
                  <Alert variant="info">Este candidato é menor de 16 anos e possui responsável</Alert>
                  <p><strong>Nome:</strong> {formularioSelecionado.responsavel_nome}</p>
                  <p><strong>Telefone:</strong> {formularioSelecionado.responsavel_telefone}</p>
                  <p><strong>E-mail:</strong> {formularioSelecionado.responsavel_email}</p>
                  <p><strong>Parentesco:</strong> {formularioSelecionado.responsavel_parentesco}</p>
                </Tab>
              )}

              <Tab eventKey="analise" title="Análise">
                <p><strong>Status:</strong> {getStatusBadge(formularioSelecionado.status)}</p>
                <p><strong>Data de Envio:</strong> {new Date(formularioSelecionado.created_at).toLocaleString('pt-BR')}</p>
                {formularioSelecionado.analisado_por_nome && (
                  <>
                    <p><strong>Analisado por:</strong> {formularioSelecionado.analisado_por_nome}</p>
                    <p><strong>Data da Análise:</strong> {new Date(formularioSelecionado.data_analise).toLocaleString('pt-BR')}</p>
                  </>
                )}
                {formularioSelecionado.observacoes_admin && (
                  <p><strong>Observações:</strong> {formularioSelecionado.observacoes_admin}</p>
                )}
              </Tab>
            </Tabs>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetalhesModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Aprovação */}
      <Modal show={showAprovarModal} onHide={() => setShowAprovarModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Aprovar Cadastro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formularioSelecionado && (
            <>
              <Alert variant="success">
                Ao aprovar, um usuário e aluno serão criados automaticamente com credenciais de acesso.
                As credenciais serão enviadas por e-mail.
              </Alert>

              <p><strong>Nome:</strong> {formularioSelecionado.nome}</p>
              <p><strong>E-mail:</strong> {formularioSelecionado.email}</p>

              <Form.Group className="mb-3">
                <Form.Label>Plano *</Form.Label>
                <Form.Select
                  value={planoSelecionado}
                  onChange={(e) => setPlanoSelecionado(e.target.value)}
                >
                  <option value="">Selecione um plano</option>
                  {planos.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} - R$ {parseFloat(plano.valor).toFixed(2)}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Observações (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre a aprovação..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAprovarModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={confirmarAprovacao}
            disabled={aprovarMutation.isLoading}
          >
            {aprovarMutation.isLoading ? 'Aprovando...' : 'Confirmar Aprovação'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Rejeição */}
      <Modal show={showRejeitarModal} onHide={() => setShowRejeitarModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Rejeitar Cadastro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formularioSelecionado && (
            <>
              <p><strong>Nome:</strong> {formularioSelecionado.nome}</p>
              <p><strong>E-mail:</strong> {formularioSelecionado.email}</p>

              <Form.Group className="mb-3">
                <Form.Label>Motivo da Rejeição *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Descreva o motivo da rejeição..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejeitarModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={confirmarRejeicao}
            disabled={rejeitarMutation.isLoading}
          >
            {rejeitarMutation.isLoading ? 'Rejeitando...' : 'Confirmar Rejeição'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default Formularios;
