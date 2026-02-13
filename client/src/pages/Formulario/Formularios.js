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

  const [tipoMatricula, setTipoMatricula] = useState('mensalidade'); // 'mensalidade' ou 'bolsa'
  const [observacoes, setObservacoes] = useState('');
  const [valorBase, setValorBase] = useState('150.00');
  const [valorDesconto, setValorDesconto] = useState('0.00');
  const [valorAcrescimo, setValorAcrescimo] = useState('0.00');
  const [quantidadeMeses, setQuantidadeMeses] = useState('12');
  const [diaVencimento, setDiaVencimento] = useState('10');
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');

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
        if (response.data.mensalidades_criadas) {
          toast.info(`${response.data.mensalidades_criadas} mensalidades criadas`);
        }
        queryClient.invalidateQueries('formularios');
        setShowAprovarModal(false);
        setFormularioSelecionado(null);
        setTipoMatricula('mensalidade');
        setValorBase('150.00');
        setValorDesconto('0.00');
        setValorAcrescimo('0.00');
        setQuantidadeMeses('12');
        setDiaVencimento('10');
        setFormaPagamento('dinheiro');
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
      console.log('=== DEBUG handleVerDetalhes ===');
      console.log('Response completo:', response);
      console.log('Response.data:', response.data);
      console.log('Tipo de response.data:', typeof response.data);
      console.log('==============================');
      setFormularioSelecionado(response.data);
      setShowDetalhesModal(true);
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
      toast.error('Erro ao carregar detalhes do formulário');
    }
  };

  const handleAprovar = (formulario) => {
    setFormularioSelecionado(formulario);
    // Limpar campos ao abrir modal
    setTipoMatricula('mensalidade');
    setValorBase('150.00');
    setValorDesconto('0.00');
    setValorAcrescimo('0.00');
    setQuantidadeMeses('12');
    setDiaVencimento('10');
    setFormaPagamento('dinheiro');
    setObservacoes('');
    setShowAprovarModal(true);
  };

  // Calcular valor total automaticamente
  const calcularValorTotal = () => {
    const base = parseFloat(valorBase) || 0;
    const desconto = parseFloat(valorDesconto) || 0;
    const acrescimo = parseFloat(valorAcrescimo) || 0;
    return (base - desconto + acrescimo).toFixed(2);
  };

  const handleRejeitar = (formulario) => {
    setFormularioSelecionado(formulario);
    setShowRejeitarModal(true);
  };

  const confirmarAprovacao = () => {
    const bolsista = tipoMatricula === 'bolsa';

    // Validar campos de mensalidade
    if (!bolsista) {
      if (!valorBase || parseFloat(valorBase) <= 0) {
        toast.error('Informe o valor base da mensalidade');
        return;
      }

      const total = parseFloat(calcularValorTotal());
      if (total <= 0) {
        toast.error('Valor total deve ser maior que zero');
        return;
      }

      const desconto = parseFloat(valorDesconto) || 0;
      const base = parseFloat(valorBase) || 0;
      if (desconto > base) {
        toast.error('Desconto não pode ser maior que o valor base');
        return;
      }

      if (!quantidadeMeses || parseInt(quantidadeMeses) < 1) {
        toast.error('Quantidade de meses deve ser pelo menos 1');
        return;
      }
    }

    aprovarMutation.mutate({
      id: formularioSelecionado.id,
      data: {
        bolsista,
        valor_base: bolsista ? 0 : parseFloat(valorBase),
        valor_desconto: bolsista ? 0 : parseFloat(valorDesconto) || 0,
        valor_acrescimo: bolsista ? 0 : parseFloat(valorAcrescimo) || 0,
        quantidade_meses: bolsista ? 0 : parseInt(quantidadeMeses),
        dia_vencimento: parseInt(diaVencimento),
        forma_pagamento: formaPagamento,
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
    const link = `${window.location.origin}/cadastro-publico`;
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
                <small className="text-muted">{window.location.origin}/cadastro-publico</small>
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
                  href={`${window.location.origin}/cadastro-publico`}
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
          {!formularioSelecionado && (
            <div className="text-center p-4">
              <p className="text-danger">Nenhum dado carregado</p>
              <pre>{JSON.stringify(formularioSelecionado, null, 2)}</pre>
            </div>
          )}
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

              {!!formularioSelecionado.possui_responsavel && (
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
                {!!formularioSelecionado.analisado_por_nome && (
                  <>
                    <p><strong>Analisado por:</strong> {formularioSelecionado.analisado_por_nome}</p>
                    <p><strong>Data da Análise:</strong> {new Date(formularioSelecionado.data_analise).toLocaleString('pt-BR')}</p>
                  </>
                )}
                {!!formularioSelecionado.observacoes_admin && (
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
      <Modal show={showAprovarModal} onHide={() => setShowAprovarModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Aprovar Cadastro</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formularioSelecionado && (
            <>
              <Alert variant="success">
                <strong>Ao aprovar:</strong> Um usuário e aluno serão criados automaticamente com credenciais de acesso.
                As credenciais serão enviadas por e-mail.
              </Alert>

              <div className="mb-3 p-3 bg-light rounded">
                <p className="mb-1"><strong>Nome:</strong> {formularioSelecionado.nome}</p>
                <p className="mb-0"><strong>E-mail:</strong> {formularioSelecionado.email}</p>
              </div>

              {/* Tipo de Matrícula */}
              <Form.Group className="mb-4">
                <Form.Label><strong>Tipo de Matrícula *</strong></Form.Label>
                <div className="d-flex gap-4">
                  <Form.Check
                    type="radio"
                    id="tipo-mensalidade"
                    name="tipoMatricula"
                    label="Mensalidade"
                    checked={tipoMatricula === 'mensalidade'}
                    onChange={() => setTipoMatricula('mensalidade')}
                  />
                  <Form.Check
                    type="radio"
                    id="tipo-bolsa"
                    name="tipoMatricula"
                    label="Bolsa Integral (Gratuito)"
                    checked={tipoMatricula === 'bolsa'}
                    onChange={() => setTipoMatricula('bolsa')}
                  />
                </div>
              </Form.Group>

              {/* Campos de Mensalidade - Mostrar apenas se não for bolsista */}
              {tipoMatricula === 'mensalidade' && (
                <>
                  <Alert variant="info" className="mb-3">
                    <small>
                      <strong>Recorrência:</strong> A primeira mensalidade será marcada como PAGA (entrada).
                      As demais serão criadas como PENDENTES.
                    </small>
                  </Alert>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Valor Base (R$) *</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorBase}
                          onChange={(e) => setValorBase(e.target.value)}
                          placeholder="150.00"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Desconto (R$)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorDesconto}
                          onChange={(e) => setValorDesconto(e.target.value)}
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Acréscimo (R$)</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          value={valorAcrescimo}
                          onChange={(e) => setValorAcrescimo(e.target.value)}
                          placeholder="0.00"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <div className="mb-3 p-3 bg-success bg-opacity-10 rounded">
                    <h6 className="text-success mb-0">
                      Valor Total: R$ {calcularValorTotal()}
                    </h6>
                  </div>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Quantidade de Meses *</Form.Label>
                        <Form.Control
                          type="number"
                          min="1"
                          max="24"
                          value={quantidadeMeses}
                          onChange={(e) => setQuantidadeMeses(e.target.value)}
                        />
                        <Form.Text className="text-muted">
                          Total de mensalidades a criar
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Dia de Vencimento *</Form.Label>
                        <Form.Select
                          value={diaVencimento}
                          onChange={(e) => setDiaVencimento(e.target.value)}
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map(dia => (
                            <option key={dia} value={dia}>Dia {dia}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Forma de Pagamento *</Form.Label>
                        <Form.Select
                          value={formaPagamento}
                          onChange={(e) => setFormaPagamento(e.target.value)}
                        >
                          <option value="dinheiro">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="cartao_credito">Cartão de Crédito</option>
                          <option value="cartao_debito">Cartão de Débito</option>
                          <option value="transferencia">Transferência</option>
                          <option value="boleto">Boleto</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                </>
              )}

              {/* Mensagem para Bolsista */}
              {tipoMatricula === 'bolsa' && (
                <Alert variant="warning">
                  <strong>Bolsa Integral:</strong> O aluno será cadastrado sem mensalidades.
                  Nenhuma cobrança será gerada.
                </Alert>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Observações (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
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
