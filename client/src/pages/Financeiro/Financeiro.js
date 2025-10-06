import React, { useState } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Table, Button, Badge, Form, Modal } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { financeiroService, studentService, planService } from '../../services/api';
import { FaMoneyBillWave, FaExclamationTriangle, FaClock, FaPlus, FaCreditCard } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPagamento, setShowPagamento] = useState(false);
  const [showMensalidade, setShowMensalidade] = useState(false);
  const [showBandeira, setShowBandeira] = useState(false);
  const [selectedMensalidade, setSelectedMensalidade] = useState(null);
  const [filters, setFilters] = useState({ status: '', mes: '', ano: '' });

  // Queries
  const { data: dashboardData, isLoading: loadingDashboard } = useQuery(
    ['financeiro-dashboard'],
    () => financeiroService.getDashboard()
  );

  const dashboard = dashboardData?.data || {};

  const { data: mensalidadesData, refetch: refetchMensalidades } = useQuery(
    ['mensalidades', filters],
    () => financeiroService.getMensalidades(filters)
  );

  const mensalidades = Array.isArray(mensalidadesData?.data) ? mensalidadesData.data : [];

  const { data: bandeirasData } = useQuery(
    'bandeiras',
    () => financeiroService.getBandeiras()
  );

  const bandeiras = Array.isArray(bandeirasData?.data) ? bandeirasData.data : [];

  const { data: alunos = [] } = useQuery(
    'alunos-ativos',
    () => studentService.getStudents({ status: 'ativo' }),
    {
      select: (response) => response.data,
      enabled: showMensalidade
    }
  );

  const { data: planos = [] } = useQuery(
    'planos',
    () => planService.getPlans(),
    {
      select: (response) => response.data,
      enabled: showMensalidade
    }
  );

  const handleRegistrarPagamento = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await financeiroService.registrarPagamento(selectedMensalidade.id, {
        bandeira_pagamento_id: formData.get('bandeira_pagamento_id'),
        valor_pago: formData.get('valor_pago'),
        data_pagamento: formData.get('data_pagamento'),
        numero_parcelas: formData.get('numero_parcelas') || 1,
        observacoes: formData.get('observacoes')
      });
      toast.success('Pagamento registrado com sucesso!');
      setShowPagamento(false);
      setSelectedMensalidade(null);
      refetchMensalidades();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleCriarMensalidade = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await financeiroService.createMensalidade({
        aluno_id: formData.get('aluno_id'),
        plano_id: formData.get('plano_id'),
        valor_base: formData.get('valor_base'),
        valor_desconto: formData.get('valor_desconto') || 0,
        valor_acrescimo: formData.get('valor_acrescimo') || 0,
        mes_referencia: formData.get('mes_referencia'),
        ano_referencia: formData.get('ano_referencia'),
        data_vencimento: formData.get('data_vencimento'),
        observacoes: formData.get('observacoes')
      });
      toast.success('Mensalidade criada com sucesso!');
      setShowMensalidade(false);
      refetchMensalidades();
    } catch (error) {
      toast.error('Erro ao criar mensalidade');
    }
  };

  const handleCriarBandeira = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await financeiroService.createBandeira({
        nome: formData.get('nome'),
        tipo: formData.get('tipo'),
        taxa_percentual: formData.get('taxa_percentual') || 0,
        taxa_fixa: formData.get('taxa_fixa') || 0
      });
      toast.success('Bandeira criada com sucesso!');
      setShowBandeira(false);
    } catch (error) {
      toast.error('Erro ao criar bandeira');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pago: 'success',
      pendente: 'warning',
      atrasado: 'danger',
      cancelado: 'secondary'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="text-danger">Financeiro</h2>
          <p className="text-muted">Gestão de mensalidades e pagamentos</p>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Dashboard */}
        <Tab eventKey="dashboard" title="Dashboard">
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaMoneyBillWave size={40} className="text-success mb-2" />
                  <h3 className="text-success">{formatCurrency(dashboard.receita_total)}</h3>
                  <p className="text-muted mb-0">Receita Total</p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaClock size={40} className="text-warning mb-2" />
                  <h3 className="text-warning">{formatCurrency(dashboard.pendencias?.total)}</h3>
                  <p className="text-muted mb-0">Pendências</p>
                  <small className="text-muted">{dashboard.pendencias?.quantidade} mensalidades</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center">
                <Card.Body>
                  <FaExclamationTriangle size={40} className="text-danger mb-2" />
                  <h3 className="text-danger">{formatCurrency(dashboard.atrasados?.total)}</h3>
                  <p className="text-muted mb-0">Atrasados</p>
                  <small className="text-muted">{dashboard.atrasados?.quantidade} mensalidades</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Pagamentos por Bandeira</h5>
                </Card.Header>
                <Card.Body>
                  <Table responsive>
                    <thead>
                      <tr>
                        <th>Bandeira</th>
                        <th>Tipo</th>
                        <th className="text-center">Quantidade</th>
                        <th className="text-end">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.por_bandeira?.map((item) => (
                        <tr key={item.nome}>
                          <td>{item.nome}</td>
                          <td><Badge bg="secondary">{item.tipo}</Badge></td>
                          <td className="text-center">{item.quantidade}</td>
                          <td className="text-end">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* Mensalidades */}
        <Tab eventKey="mensalidades" title="Mensalidades">
          <Row className="mb-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="cancelado">Cancelado</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={filters.mes}
                  onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                >
                  <option value="">Todos</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={filters.ano}
                  onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
                >
                  <option value="">Todos</option>
                  {[2024, 2025, 2026].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end">
              <Button variant="danger" onClick={() => setShowMensalidade(true)} className="w-100">
                <FaPlus className="me-2" />Nova Mensalidade
              </Button>
            </Col>
          </Row>

          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Plano</th>
                    <th>Referência</th>
                    <th>Vencimento</th>
                    <th className="text-end">Valor</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidades.map((m) => (
                    <tr key={m.id}>
                      <td>{m.aluno_nome}</td>
                      <td>{m.plano_nome || '-'}</td>
                      <td>{m.mes_referencia}/{m.ano_referencia}</td>
                      <td>{new Date(m.data_vencimento).toLocaleDateString('pt-BR')}</td>
                      <td className="text-end">{formatCurrency(m.valor_total)}</td>
                      <td className="text-center">{getStatusBadge(m.status)}</td>
                      <td className="text-center">
                        {m.status !== 'pago' && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => {
                              setSelectedMensalidade(m);
                              setShowPagamento(true);
                            }}
                          >
                            Registrar Pagamento
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Pendências */}
        <Tab eventKey="pendencias" title="Pendências">
          <Card>
            <Card.Header className="bg-warning text-white">
              <h5 className="mb-0">Mensalidades Pendentes</h5>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Email</th>
                    <th>Referência</th>
                    <th>Vencimento</th>
                    <th className="text-end">Valor</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mensalidades
                    .filter((m) => m.status === 'pendente' || m.status === 'atrasado')
                    .map((m) => (
                      <tr key={m.id} className={m.status === 'atrasado' ? 'table-danger' : ''}>
                        <td>{m.aluno_nome}</td>
                        <td>{m.aluno_email}</td>
                        <td>{m.mes_referencia}/{m.ano_referencia}</td>
                        <td>{new Date(m.data_vencimento).toLocaleDateString('pt-BR')}</td>
                        <td className="text-end">{formatCurrency(m.valor_total)}</td>
                        <td className="text-center">
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => {
                              setSelectedMensalidade(m);
                              setShowPagamento(true);
                            }}
                          >
                            Registrar Pagamento
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Bandeiras */}
        <Tab eventKey="bandeiras" title="Bandeiras de Pagamento">
          <Row className="mb-3">
            <Col className="text-end">
              <Button variant="danger" onClick={() => setShowBandeira(true)}>
                <FaPlus className="me-2" />Nova Bandeira
              </Button>
            </Col>
          </Row>

          <Card>
            <Card.Body>
              <Table responsive>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo</th>
                    <th className="text-end">Taxa %</th>
                    <th className="text-end">Taxa Fixa</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bandeiras.map((b) => (
                    <tr key={b.id}>
                      <td>{b.nome}</td>
                      <td><Badge bg="secondary">{b.tipo}</Badge></td>
                      <td className="text-end">{b.taxa_percentual}%</td>
                      <td className="text-end">{formatCurrency(b.taxa_fixa)}</td>
                      <td className="text-center">
                        <Badge bg={b.ativo ? 'success' : 'secondary'}>
                          {b.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal Registrar Pagamento */}
      <Modal show={showPagamento} onHide={() => setShowPagamento(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Registrar Pagamento</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRegistrarPagamento}>
          <Modal.Body>
            {selectedMensalidade && (
              <>
                <Row className="mb-3">
                  <Col>
                    <strong>Aluno:</strong> {selectedMensalidade.aluno_nome}
                  </Col>
                  <Col>
                    <strong>Valor:</strong> {formatCurrency(selectedMensalidade.valor_total)}
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Bandeira de Pagamento</Form.Label>
                      <Form.Select name="bandeira_pagamento_id" required>
                        <option value="">Selecione...</option>
                        {bandeiras.map((b) => (
                          <option key={b.id} value={b.id}>{b.nome}</option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Valor Pago</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="valor_pago"
                        defaultValue={selectedMensalidade.valor_total}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Data do Pagamento</Form.Label>
                      <Form.Control
                        type="date"
                        name="data_pagamento"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Número de Parcelas</Form.Label>
                      <Form.Control
                        type="number"
                        name="numero_parcelas"
                        defaultValue={1}
                        min={1}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Form.Group className="mb-3">
                  <Form.Label>Observações</Form.Label>
                  <Form.Control as="textarea" rows={3} name="observacoes" />
                </Form.Group>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPagamento(false)}>
              Cancelar
            </Button>
            <Button variant="success" type="submit">
              Registrar Pagamento
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Nova Mensalidade */}
      <Modal show={showMensalidade} onHide={() => setShowMensalidade(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Nova Mensalidade</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCriarMensalidade}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Aluno</Form.Label>
                  <Form.Select name="aluno_id" required>
                    <option value="">Selecione...</option>
                    {Array.isArray(alunos) && alunos.map((a) => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Plano</Form.Label>
                  <Form.Select name="plano_id">
                    <option value="">Selecione...</option>
                    {Array.isArray(planos) && planos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Valor Base</Form.Label>
                  <Form.Control type="number" step="0.01" name="valor_base" required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Desconto</Form.Label>
                  <Form.Control type="number" step="0.01" name="valor_desconto" defaultValue={0} />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Acréscimo</Form.Label>
                  <Form.Control type="number" step="0.01" name="valor_acrescimo" defaultValue={0} />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Mês</Form.Label>
                  <Form.Select name="mes_referencia" required>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Ano</Form.Label>
                  <Form.Select name="ano_referencia" required>
                    {[2024, 2025, 2026].map((ano) => (
                      <option key={ano} value={ano}>{ano}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Vencimento</Form.Label>
                  <Form.Control type="date" name="data_vencimento" required />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Observações</Form.Label>
              <Form.Control as="textarea" rows={3} name="observacoes" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMensalidade(false)}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit">
              Criar Mensalidade
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Nova Bandeira */}
      <Modal show={showBandeira} onHide={() => setShowBandeira(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Nova Bandeira de Pagamento</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCriarBandeira}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control type="text" name="nome" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tipo</Form.Label>
              <Form.Select name="tipo" required>
                <option value="">Selecione...</option>
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
                <option value="pix">PIX</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
                <option value="outros">Outros</option>
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Taxa Percentual (%)</Form.Label>
                  <Form.Control type="number" step="0.01" name="taxa_percentual" defaultValue={0} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Taxa Fixa (R$)</Form.Label>
                  <Form.Control type="number" step="0.01" name="taxa_fixa" defaultValue={0} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBandeira(false)}>
              Cancelar
            </Button>
            <Button variant="danger" type="submit">
              Criar Bandeira
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Financeiro;
