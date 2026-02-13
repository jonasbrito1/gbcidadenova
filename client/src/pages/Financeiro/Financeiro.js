import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Table, Button, Badge, Form, Modal, InputGroup } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { useLocation } from 'react-router-dom';
import { financeiroService } from '../../services/api';
import { FaMoneyBillWave, FaExclamationTriangle, FaClock, FaPlus, FaCreditCard, FaCheckCircle, FaChartLine, FaSearch, FaPaperPlane, FaEdit } from 'react-icons/fa';
import { toast } from 'react-toastify';
import MensalidadeModal from '../../components/Financeiro/MensalidadeModal';
import EditarMensalidadeModal from '../../components/Financeiro/EditarMensalidadeModal';
import EditarMensalidadesModal from '../../components/Financeiro/EditarMensalidadesModal';

const Financeiro = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showPagamento, setShowPagamento] = useState(false);
  const [showMensalidade, setShowMensalidade] = useState(false);
  const [selectedMensalidade, setSelectedMensalidade] = useState(null);
  const [preSelectedAluno, setPreSelectedAluno] = useState(null);
  const [selectedMensalidades, setSelectedMensalidades] = useState({});
  const [showConfirmacaoEnvio, setShowConfirmacaoEnvio] = useState(false);
  const [showResultadoEnvio, setShowResultadoEnvio] = useState(false);
  const [resultadoEnvio, setResultadoEnvio] = useState(null);
  const [enviandoEmails, setEnviandoEmails] = useState(false);
  const [mensagemCustomizada, setMensagemCustomizada] = useState('');

  // Estados para edição
  const [showEditarMensalidade, setShowEditarMensalidade] = useState(false);
  const [showEditarMensalidades, setShowEditarMensalidades] = useState(false);
  const [mensalidadeParaEditar, setMensalidadeParaEditar] = useState(null);

  // Inicializar filtros com mês e ano correntes
  const dataAtual = new Date();
  const mesAtual = dataAtual.getMonth() + 1; // getMonth() retorna 0-11
  const anoAtual = dataAtual.getFullYear();

  const [filters, setFilters] = useState({
    status: '',
    mes: mesAtual.toString(),
    ano: anoAtual.toString(),
    aluno: ''
  });

  const [pendenciasFilters, setPendenciasFilters] = useState({
    mes: '',
    ano: '',
    aluno: ''
  });

  const [dashboardFilters, setDashboardFilters] = useState({
    mes: mesAtual.toString(),
    ano: anoAtual.toString()
  });

  // Estados temporários para pesquisa (antes de clicar na lupa)
  const [searchInput, setSearchInput] = useState('');
  const [pendenciasSearchInput, setPendenciasSearchInput] = useState('');


  // Funções para pesquisar ao clicar na lupa
  const handleSearchMensalidades = () => {
    setFilters({ ...filters, aluno: searchInput });
  };

  const handleSearchPendencias = () => {
    setPendenciasFilters({ ...pendenciasFilters, aluno: pendenciasSearchInput });
  };

  // Queries
  const { data: dashboardData, isLoading: loadingDashboard, refetch: refetchDashboard } = useQuery(
    ['financeiro-dashboard', dashboardFilters.mes, dashboardFilters.ano],
    () => financeiroService.getDashboard({
      mes: dashboardFilters.mes,
      ano: dashboardFilters.ano
    }),
    {
      staleTime: 30000,  // 30 segundos
      cacheTime: 300000  // 5 minutos
    }
  );

  const dashboard = dashboardData?.data || {};

  const { data: mensalidadesData, refetch: refetchMensalidades } = useQuery(
    ['mensalidades', filters],
    () => financeiroService.getMensalidades(filters)
  );

  const mensalidades = Array.isArray(mensalidadesData?.data) ? mensalidadesData.data : [];

  // Query separada para pendências com filtros independentes
  const { data: pendenciasData, refetch: refetchPendencias } = useQuery(
    ['pendencias', pendenciasFilters],
    () => financeiroService.getMensalidades({
      status: '', // Buscar todos os status, filtrar no cliente
      mes: pendenciasFilters.mes,
      ano: pendenciasFilters.ano,
      aluno: pendenciasFilters.aluno
    })
  );

  const pendencias = Array.isArray(pendenciasData?.data) ? pendenciasData.data : [];


  // Detectar se veio de um cadastro de aluno e abrir modal de mensalidade
  useEffect(() => {
    console.log('[DEBUG Financeiro.js] location.state:', location.state);

    if (location.state?.novoAluno && location.state?.abrirModalMensalidade) {
      const aluno = location.state.novoAluno;
      console.log('[DEBUG Financeiro.js] Abrindo modal para aluno:', aluno.nome);

      setPreSelectedAluno(aluno);
      setActiveTab('mensalidades');
      setShowMensalidade(true);

      toast.info(`Cadastrando mensalidades para ${aluno.nome}`, {
        position: 'top-center',
        autoClose: 3000
      });

      // Limpar o estado da navegação
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleRegistrarPagamento = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await financeiroService.registrarPagamento(selectedMensalidade.id, {
        valor_pago: formData.get('valor_pago'),
        data_pagamento: formData.get('data_pagamento'),
        numero_parcelas: formData.get('numero_parcelas') || 1,
        observacoes: formData.get('observacoes')
      });
      toast.success('Pagamento registrado com sucesso!');
      setShowPagamento(false);
      setSelectedMensalidade(null);
      refetchMensalidades();
      refetchPendencias();
      refetchDashboard();
    } catch (error) {
      toast.error('Erro ao registrar pagamento');
    }
  };

  const handleMensalidadeSuccess = () => {
    setPreSelectedAluno(null);
    refetchMensalidades();
    refetchPendencias();
    refetchDashboard();
  };

  // ========== FUNÇÕES DE SELEÇÃO EM MASSA ==========

  // Toggle seleção individual
  const handleToggleMensalidade = (mensalidadeId) => {
    setSelectedMensalidades(prev => ({
      ...prev,
      [mensalidadeId]: !prev[mensalidadeId]
    }));
  };

  // Selecionar/desselecionar todos visíveis
  const handleSelectAll = (checked) => {
    const filteredMensalidades = mensalidades.filter((m) => {
      if (filters.aluno) {
        return m.aluno_nome?.toLowerCase().includes(filters.aluno.toLowerCase());
      }
      return true;
    });

    if (checked) {
      const allSelected = {};
      filteredMensalidades.forEach(m => {
        allSelected[m.id] = true;
      });
      setSelectedMensalidades(allSelected);
    } else {
      setSelectedMensalidades({});
    }
  };

  // Contar selecionados
  const getSelectedCount = () => {
    return Object.values(selectedMensalidades).filter(Boolean).length;
  };

  // Obter IDs selecionados
  const getSelectedIds = () => {
    return Object.keys(selectedMensalidades)
      .filter(k => selectedMensalidades[k])
      .map(Number);
  };

  // Excluir em massa
  const handleBulkDelete = async () => {
    const ids = getSelectedIds();
    const count = ids.length;

    if (count === 0) {
      toast.warning('Nenhuma mensalidade selecionada');
      return;
    }

    // Primeira confirmação
    const confirmar1 = window.confirm(
      `⚠️ ATENÇÃO: Você está prestes a EXCLUIR ${count} mensalidade(s)!\n\n` +
      `Esta ação é IRREVERSÍVEL e irá remover:\n` +
      `- Os registros de mensalidades\n` +
      `- Histórico de pagamentos associados\n\n` +
      `Deseja continuar?`
    );

    if (!confirmar1) return;

    // Segunda confirmação
    const confirmar2 = window.confirm(
      `CONFIRME: Excluir permanentemente ${count} mensalidade(s)?`
    );

    if (!confirmar2) return;

    try {
      const response = await financeiroService.bulkDeleteMensalidades({ ids });

      toast.success(
        `${response.data.processados} mensalidade(s) excluída(s) com sucesso!` +
        (response.data.erros > 0 ? ` (${response.data.erros} erro(s))` : '')
      );

      setSelectedMensalidades({});
      refetchMensalidades();
      refetchPendencias();
      refetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao excluir mensalidades');
    }
  };

  // Alterar status em massa
  const handleBulkUpdateStatus = async (newStatus) => {
    const ids = getSelectedIds();
    const count = ids.length;

    if (count === 0) {
      toast.warning('Nenhuma mensalidade selecionada');
      return;
    }

    const statusLabels = {
      pago: 'Pago',
      pendente: 'Pendente',
      atrasado: 'Atrasado',
      cancelado: 'Cancelado'
    };

    const confirmar = window.confirm(
      `Deseja alterar o status de ${count} mensalidade(s) para "${statusLabels[newStatus]}"?`
    );

    if (!confirmar) return;

    try {
      const response = await financeiroService.bulkUpdateStatusMensalidades({
        ids,
        status: newStatus
      });

      toast.success(
        `Status alterado para "${statusLabels[newStatus]}" em ${response.data.processados} mensalidade(s)!` +
        (response.data.erros > 0 ? ` (${response.data.erros} erro(s))` : '')
      );

      setSelectedMensalidades({});
      refetchMensalidades();
      refetchPendencias();
      refetchDashboard();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    }
  };

  // Enviar notificações de pagamento em massa
  const handleSendBulkNotifications = async () => {
    const ids = getSelectedIds();
    const count = ids.length;

    if (count === 0) {
      toast.warning('Nenhuma mensalidade selecionada');
      return;
    }

    // Abrir modal de confirmação
    setShowConfirmacaoEnvio(true);
  };

  const confirmarEnvioNotificacoes = async () => {
    const ids = getSelectedIds();

    setShowConfirmacaoEnvio(false);
    setEnviandoEmails(true);

    try {
      const payload = { ids };

      // Adicionar mensagem customizada se preenchida
      if (mensagemCustomizada && mensagemCustomizada.trim()) {
        payload.mensagemCustomizada = mensagemCustomizada.trim();
      }

      const response = await financeiroService.sendBulkNotifications(payload);

      setResultadoEnvio(response.data);
      setShowResultadoEnvio(true);

      // Feedback rápido via toast
      if (response.data.falhas === 0) {
        toast.success(`✅ ${response.data.sucessos} email(s) enviado(s) com sucesso!`);
      } else {
        toast.warning(`⚠️ ${response.data.sucessos} enviado(s), ${response.data.falhas} falha(s)`);
      }

      setSelectedMensalidades({});
      setMensagemCustomizada(''); // Limpar mensagem customizada
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao enviar notificações');
    } finally {
      setEnviandoEmails(false);
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

  const handleCardClick = (filterStatus) => {
    setActiveTab('mensalidades');
    setFilters({ ...filters, status: filterStatus });
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
          {/* Filtros do Dashboard */}
          <Row className="mb-3">
            <Col xs={12} sm={4} md={3}>
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={dashboardFilters.mes}
                  onChange={(e) => setDashboardFilters({ ...dashboardFilters, mes: e.target.value })}
                >
                  <option value="">Todos</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={4} md={3}>
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={dashboardFilters.ano}
                  onChange={(e) => setDashboardFilters({ ...dashboardFilters, ano: e.target.value })}
                >
                  <option value="">Todos</option>
                  {[2024, 2025, 2026, 2027].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={4} md={3} className="d-flex align-items-end">
              <Button
                variant="secondary"
                onClick={() => setDashboardFilters({ mes: mesAtual.toString(), ano: anoAtual.toString() })}
              >
                Resetar
              </Button>
            </Col>
          </Row>

          <Row className="mb-4">
            {/* Card: Receita Recebida */}
            <Col xs={12} sm={6} md={6} lg={3} className="mb-3">
              <Card
                className="h-100 border-0 shadow-sm"
                style={{ borderLeft: '4px solid #28a745', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => handleCardClick('pago')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>RECEITA RECEBIDA</p>
                      <h3 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#28a745' }}>
                        {formatCurrency(dashboard.receita_recebida)}
                      </h3>
                    </div>
                    <div className="bg-success bg-opacity-10 p-2 rounded">
                      <FaMoneyBillWave size={24} className="text-success" />
                    </div>
                  </div>
                  {(() => {
                    const receitaEsperada = dashboard.receita_esperada || 0;
                    const percentualRecebido = receitaEsperada > 0 ? ((dashboard.receita_recebida || 0) / receitaEsperada * 100) : 0;
                    return (
                      <>
                        <div className="progress mb-2" style={{ height: '6px' }}>
                          <div
                            className="progress-bar bg-success"
                            role="progressbar"
                            style={{ width: `${percentualRecebido}%` }}
                            aria-valuenow={percentualRecebido}
                            aria-valuemin="0"
                            aria-valuemax="100"
                          ></div>
                        </div>
                        <small className="text-muted">
                          {percentualRecebido.toFixed(1)}% da receita esperada
                        </small>
                      </>
                    );
                  })()}
                </Card.Body>
              </Card>
            </Col>

            {/* Card: Receita Esperada */}
            <Col xs={12} sm={6} md={6} lg={3} className="mb-3">
              <Card
                className="h-100 border-0 shadow-sm"
                style={{ borderLeft: '4px solid #17a2b8', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => {
                  setActiveTab('mensalidades');
                  setFilters({ status: '', mes: '', ano: '' });
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>RECEITA ESPERADA</p>
                      <h3 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#17a2b8' }}>
                        {formatCurrency(dashboard.receita_esperada)}
                      </h3>
                    </div>
                    <div className="bg-info bg-opacity-10 p-2 rounded">
                      <FaChartLine size={24} className="text-info" />
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <small className="text-success mb-0">
                      <strong>{formatCurrency(dashboard.receita_recebida)}</strong> recebidos
                    </small>
                  </div>
                  <small className="text-muted d-block mt-1">
                    Total previsto para o mês
                  </small>
                </Card.Body>
              </Card>
            </Col>

            {/* Card: Pendências */}
            <Col xs={12} sm={6} md={6} lg={3} className="mb-3">
              <Card
                className="h-100 border-0 shadow-sm"
                style={{ borderLeft: '4px solid #ffc107', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => handleCardClick('pendente')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>PENDÊNCIAS</p>
                      <h3 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#ffc107' }}>
                        {formatCurrency(dashboard.pendencias?.total)}
                      </h3>
                    </div>
                    <div className="bg-warning bg-opacity-10 p-2 rounded">
                      <FaClock size={24} className="text-warning" />
                    </div>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <small className="text-muted">
                      {dashboard.pendencias?.quantidade || 0} mensalidade{(dashboard.pendencias?.quantidade || 0) !== 1 ? 's' : ''}
                    </small>
                    {dashboard.pendencias?.quantidade > 0 && (
                      <Badge bg="warning" text="dark" className="px-2">
                        A vencer
                      </Badge>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>

            {/* Card: Atrasados */}
            <Col xs={12} sm={6} md={6} lg={3} className="mb-3">
              <Card
                className="h-100 border-0 shadow-sm"
                style={{ borderLeft: '4px solid #dc3545', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onClick={() => handleCardClick('atrasado')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)';
                }}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <p className="text-muted mb-1" style={{ fontSize: '0.85rem', fontWeight: '500' }}>ATRASADOS</p>
                      <h3 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: '700', color: '#dc3545' }}>
                        {formatCurrency(dashboard.atrasados?.total)}
                      </h3>
                    </div>
                    <div className="bg-danger bg-opacity-10 p-2 rounded">
                      <FaExclamationTriangle size={24} className="text-danger" />
                    </div>
                  </div>
                  <div className="d-flex flex-column">
                    <small className="text-muted mb-1">
                      {dashboard.atrasados?.quantidade || 0} mensalidade{(dashboard.atrasados?.quantidade || 0) !== 1 ? 's' : ''}
                    </small>
                    {(() => {
                      const receitaEsperada = (dashboard.receita_recebida || 0) + (dashboard.pendencias?.total || 0) + (dashboard.atrasados?.total || 0);
                      const taxaInadimplencia = receitaEsperada > 0 ? ((dashboard.atrasados?.total || 0) / receitaEsperada * 100) : 0;
                      return (
                        <small className={`${taxaInadimplencia > 10 ? 'text-danger' : 'text-warning'}`}>
                          <strong>{taxaInadimplencia.toFixed(1)}%</strong> de inadimplência
                        </small>
                      );
                    })()}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Insights e Ações Rápidas */}
          <Row className="mb-4">
            <Col xs={12} md={12} lg={8} className="mb-3 mb-lg-0">
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-bottom">
                  <h5 className="mb-0" style={{ fontSize: '1rem', fontWeight: '600' }}>Insights Financeiros</h5>
                </Card.Header>
                <Card.Body>
                  {(() => {
                    const receitaEsperada = (dashboard.receita_recebida || 0) + (dashboard.pendencias?.total || 0) + (dashboard.atrasados?.total || 0);
                    const percentualRecebido = receitaEsperada > 0 ? ((dashboard.receita_recebida || 0) / receitaEsperada * 100) : 0;
                    const taxaInadimplencia = receitaEsperada > 0 ? ((dashboard.atrasados?.total || 0) / receitaEsperada * 100) : 0;

                    return (
                      <div>
                        {percentualRecebido >= 80 ? (
                          <div className="d-flex align-items-start mb-3">
                            <div className="bg-success bg-opacity-10 p-2 rounded me-3">
                              <FaCheckCircle className="text-success" size={20} />
                            </div>
                            <div>
                              <strong className="text-success">Excelente desempenho!</strong>
                              <p className="text-muted mb-0 small">
                                Você já recebeu {percentualRecebido.toFixed(1)}% da receita esperada para este mês.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="d-flex align-items-start mb-3">
                            <div className="bg-warning bg-opacity-10 p-2 rounded me-3">
                              <FaClock className="text-warning" size={20} />
                            </div>
                            <div>
                              <strong className="text-warning">Atenção às pendências</strong>
                              <p className="text-muted mb-0 small">
                                Ainda há {formatCurrency((dashboard.pendencias?.total || 0) + (dashboard.atrasados?.total || 0))} a receber este mês.
                              </p>
                            </div>
                          </div>
                        )}

                        {taxaInadimplencia > 10 && (
                          <div className="d-flex align-items-start mb-3">
                            <div className="bg-danger bg-opacity-10 p-2 rounded me-3">
                              <FaExclamationTriangle className="text-danger" size={20} />
                            </div>
                            <div>
                              <strong className="text-danger">Taxa de inadimplência elevada</strong>
                              <p className="text-muted mb-0 small">
                                {dashboard.atrasados?.quantidade} aluno{(dashboard.atrasados?.quantidade || 0) !== 1 ? 's estão' : ' está'} com pagamentos atrasados.
                                Considere entrar em contato para regularização.
                              </p>
                            </div>
                          </div>
                        )}

                        {(dashboard.pendencias?.quantidade || 0) > 0 && (
                          <div className="d-flex align-items-start">
                            <div className="bg-info bg-opacity-10 p-2 rounded me-3">
                              <FaChartLine className="text-info" size={20} />
                            </div>
                            <div>
                              <strong className="text-info">Previsão de recebimento</strong>
                              <p className="text-muted mb-0 small">
                                Há {dashboard.pendencias?.quantidade} mensalidade{(dashboard.pendencias?.quantidade || 0) !== 1 ? 's' : ''} pendente{(dashboard.pendencias?.quantidade || 0) !== 1 ? 's' : ''} no valor de {formatCurrency(dashboard.pendencias?.total)} a vencer.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={12} lg={4}>
              <Card className="border-0 shadow-sm h-100">
                <Card.Header className="bg-white border-bottom">
                  <h5 className="mb-0" style={{ fontSize: '1rem', fontWeight: '600' }}>Ações Rápidas</h5>
                </Card.Header>
                <Card.Body className="d-flex flex-column gap-2">
                  <Button
                    variant="danger"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setShowMensalidade(true)}
                  >
                    <FaPlus /> Nova Mensalidade
                  </Button>
                  <Button
                    variant="primary"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setActiveTab('mensalidades')}
                  >
                    <FaMoneyBillWave /> Ver Todas
                  </Button>
                  <Button
                    variant="warning"
                    className="w-100 d-flex align-items-center justify-content-center gap-2"
                    onClick={() => setActiveTab('pendencias')}
                  >
                    <FaClock /> Ver Pendências
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        {/* Mensalidades */}
        <Tab eventKey="mensalidades" title="Mensalidades">
          <Row className="mb-3">
            <Col xs={12} md={12} className="mb-3">
              <Form.Group>
                <Form.Label>Pesquisar Aluno</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Digite o nome do aluno..."
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setFilters({ ...filters, aluno: e.target.value }); // Pesquisa em tempo real
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchMensalidades();
                      }
                    }}
                    autoComplete="off"
                  />
                  <Button
                    variant="primary"
                    onClick={handleSearchMensalidades}
                    title="Pesquisar"
                  >
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
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
            <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={filters.mes}
                  onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                >
                  <option value="">Todos</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={filters.ano}
                  onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
                >
                  <option value="">Todos</option>
                  {[2024, 2025, 2026, 2027].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={3} className="d-flex align-items-end">
              <Button variant="danger" onClick={() => setShowMensalidade(true)} className="w-100" style={{minHeight: '44px'}}>
                <FaPlus className="me-2" />Nova Mensalidade
              </Button>
            </Col>
          </Row>

          {/* Barra de ações em massa */}
          {getSelectedCount() > 0 && (
            <Row className="mb-3">
              <Col>
                <Card className="border-primary">
                  <Card.Body className="py-2">
                    <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div>
                        <strong>{getSelectedCount()}</strong> mensalidade(s) selecionada(s)
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleBulkUpdateStatus('pago')}
                        >
                          Marcar como Pago
                        </Button>
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => handleBulkUpdateStatus('pendente')}
                        >
                          Marcar como Pendente
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleBulkUpdateStatus('atrasado')}
                        >
                          Marcar como Atrasado
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleBulkUpdateStatus('cancelado')}
                        >
                          Cancelar
                        </Button>
                        <div style={{ borderLeft: '1px solid #dee2e6', height: '100%', margin: '0 0.5rem' }}></div>
                        <Button
                          variant="info"
                          size="sm"
                          onClick={handleSendBulkNotifications}
                          disabled={enviandoEmails}
                        >
                          <FaPaperPlane className="me-1" />
                          {enviandoEmails ? 'Enviando...' : 'Enviar Notificação'}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowEditarMensalidades(true)}
                        >
                          <FaEdit className="me-1" />
                          Editar Selecionadas
                        </Button>
                        <div style={{ borderLeft: '1px solid #dee2e6', height: '100%', margin: '0 0.5rem' }}></div>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={handleBulkDelete}
                        >
                          Excluir Selecionadas
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedMensalidades({})}
                        >
                          Limpar Seleção
                        </Button>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>
                      <Form.Check
                        type="checkbox"
                        checked={
                          mensalidades.filter((m) => {
                            if (filters.aluno) {
                              return m.aluno_nome?.toLowerCase().includes(filters.aluno.toLowerCase());
                            }
                            return true;
                          }).length > 0 &&
                          mensalidades.filter((m) => {
                            if (filters.aluno) {
                              return m.aluno_nome?.toLowerCase().includes(filters.aluno.toLowerCase());
                            }
                            return true;
                          }).every(m => selectedMensalidades[m.id])
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
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
                  {mensalidades
                    .filter((m) => {
                      // Filtrar por nome do aluno
                      if (filters.aluno) {
                        return m.aluno_nome?.toLowerCase().includes(filters.aluno.toLowerCase());
                      }
                      return true;
                    })
                    .map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Form.Check
                            type="checkbox"
                            checked={selectedMensalidades[m.id] || false}
                            onChange={() => handleToggleMensalidade(m.id)}
                          />
                        </td>
                        <td>{m.aluno_nome}</td>
                        <td>{m.plano_nome || '-'}</td>
                        <td>{m.mes_referencia}/{m.ano_referencia}</td>
                        <td>{new Date(m.data_vencimento).toLocaleDateString('pt-BR')}</td>
                        <td className="text-end">{formatCurrency(m.valor_total)}</td>
                        <td className="text-center">{getStatusBadge(m.status)}</td>
                        <td className="text-center">
                          <div className="d-flex gap-2 justify-content-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => {
                                setMensalidadeParaEditar(m);
                                setShowEditarMensalidade(true);
                              }}
                              title="Editar mensalidade"
                            >
                              <FaEdit />
                            </Button>
                            {m.status !== 'pago' && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => {
                                  setSelectedMensalidade(m);
                                  setShowPagamento(true);
                                }}
                              >
                                Registrar Pagamento
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  {mensalidades.filter((m) => {
                    if (filters.aluno) {
                      return m.aluno_nome?.toLowerCase().includes(filters.aluno.toLowerCase());
                    }
                    return true;
                  }).length === 0 && (
                    <tr>
                      <td colSpan="8" className="text-center text-muted py-4">
                        Nenhuma mensalidade encontrada com os filtros selecionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Pendências */}
        <Tab eventKey="pendencias" title="Pendências">
          {/* Filtros de Pendências */}
          <Row className="mb-3">
            <Col xs={12} md={12} className="mb-3">
              <Form.Group>
                <Form.Label>Pesquisar Aluno</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Digite o nome do aluno..."
                    value={pendenciasSearchInput}
                    onChange={(e) => {
                      setPendenciasSearchInput(e.target.value);
                      setPendenciasFilters({ ...pendenciasFilters, aluno: e.target.value }); // Pesquisa em tempo real
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleSearchPendencias();
                      }
                    }}
                    autoComplete="off"
                  />
                  <Button
                    variant="primary"
                    onClick={handleSearchPendencias}
                    title="Pesquisar"
                  >
                    <FaSearch />
                  </Button>
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={pendenciasFilters.mes}
                  onChange={(e) => setPendenciasFilters({ ...pendenciasFilters, mes: e.target.value })}
                >
                  <option value="">Todos os meses</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={4} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={pendenciasFilters.ano}
                  onChange={(e) => setPendenciasFilters({ ...pendenciasFilters, ano: e.target.value })}
                >
                  <option value="">Todos os anos</option>
                  {[2024, 2025, 2026, 2027].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={12} md={4} className="d-flex align-items-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setPendenciasFilters({ mes: '', ano: '', aluno: '' });
                  setPendenciasSearchInput('');
                }}
                className="w-100"
                style={{minHeight: '44px'}}
              >
                Limpar Filtros
              </Button>
            </Col>
          </Row>

          {/* Tabela de Pendências */}
          <Card>
            <Card.Header className="bg-warning text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Mensalidades Pendentes</h5>
              <Badge bg="dark">
                {(() => {
                  const pendentes = pendencias
                    .filter((m) => m.status === 'pendente' || m.status === 'atrasado')
                    .filter((m) => {
                      if (pendenciasFilters.mes && m.mes_referencia !== parseInt(pendenciasFilters.mes)) return false;
                      if (pendenciasFilters.ano && m.ano_referencia !== parseInt(pendenciasFilters.ano)) return false;
                      if (pendenciasFilters.aluno && !m.aluno_nome?.toLowerCase().includes(pendenciasFilters.aluno.toLowerCase())) return false;
                      return true;
                    });
                  const totalPendente = pendentes.reduce((sum, m) => sum + (m.valor_total || 0), 0);
                  return `${pendentes.length} mensalidades - ${formatCurrency(totalPendente)}`;
                })()}
              </Badge>
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
                    <th className="text-center">Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const pendentes = pendencias
                      .filter((m) => m.status === 'pendente' || m.status === 'atrasado')
                      .filter((m) => {
                        if (pendenciasFilters.mes && m.mes_referencia !== parseInt(pendenciasFilters.mes)) return false;
                        if (pendenciasFilters.ano && m.ano_referencia !== parseInt(pendenciasFilters.ano)) return false;
                        if (pendenciasFilters.aluno && !m.aluno_nome?.toLowerCase().includes(pendenciasFilters.aluno.toLowerCase())) return false;
                        return true;
                      })
                      .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)); // Ordenar por vencimento

                    if (pendentes.length === 0) {
                      return (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            Nenhuma mensalidade pendente encontrada com os filtros selecionados
                          </td>
                        </tr>
                      );
                    }

                    return pendentes.map((m) => (
                      <tr key={m.id} className={m.status === 'atrasado' ? 'table-danger' : ''}>
                        <td>{m.aluno_nome}</td>
                        <td>{m.aluno_email}</td>
                        <td>{m.mes_referencia}/{m.ano_referencia}</td>
                        <td>
                          {new Date(m.data_vencimento).toLocaleDateString('pt-BR')}
                          {m.status === 'atrasado' && (
                            <Badge bg="danger" className="ms-2">Atrasado</Badge>
                          )}
                        </td>
                        <td className="text-end">{formatCurrency(m.valor_total)}</td>
                        <td className="text-center">{getStatusBadge(m.status)}</td>
                        <td className="text-center">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => {
                              setSelectedMensalidade(m);
                              setShowPagamento(true);
                            }}
                          >
                            <FaCheckCircle className="me-1" />
                            Registrar Pagamento
                          </Button>
                        </td>
                      </tr>
                    ));
                  })()}
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
      <MensalidadeModal
        show={showMensalidade}
        onHide={() => {
          setShowMensalidade(false);
          setPreSelectedAluno(null);
        }}
        preSelectedAluno={preSelectedAluno}
        onSuccess={handleMensalidadeSuccess}
      />

      {/* Modal Editar Mensalidade Individual */}
      <EditarMensalidadeModal
        show={showEditarMensalidade}
        onHide={() => {
          setShowEditarMensalidade(false);
          setMensalidadeParaEditar(null);
        }}
        mensalidade={mensalidadeParaEditar}
        onSuccess={() => {
          refetchMensalidades();
          refetchPendencias();
          refetchDashboard();
        }}
      />

      {/* Modal Editar Mensalidades em Massa */}
      <EditarMensalidadesModal
        show={showEditarMensalidades}
        onHide={() => setShowEditarMensalidades(false)}
        mensalidadesIds={getSelectedIds()}
        onSuccess={() => {
          setSelectedMensalidades({});
          refetchMensalidades();
          refetchPendencias();
          refetchDashboard();
        }}
      />

      {/* Modal Confirmação Envio de Notificações */}
      <Modal
        show={showConfirmacaoEnvio}
        onHide={() => setShowConfirmacaoEnvio(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPaperPlane className="me-2" />
            Enviar Notificações de Pagamento
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Você está prestes a enviar notificações de pagamento para{' '}
            <strong>{getSelectedCount()}</strong> mensalidade(s) selecionada(s).
          </p>
          <div className="alert alert-info mb-3">
            <strong>ℹ️ Informações:</strong>
            <ul className="mb-0 mt-2">
              <li>Serão enviados emails para <strong>alunos e responsáveis</strong> (quando cadastrados)</li>
              <li>O email incluirá: valor, vencimento, dias até/em atraso</li>
              <li>Mensagem amigável sobre a importância do pagamento</li>
            </ul>
          </div>

          <Form.Group className="mb-0">
            <Form.Label>Mensagem Adicional (Opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Digite uma mensagem personalizada que será exibida no email (opcional)..."
              value={mensagemCustomizada}
              onChange={(e) => setMensagemCustomizada(e.target.value)}
              maxLength={500}
            />
            <Form.Text className="text-muted">
              {mensagemCustomizada.length}/500 caracteres
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmacaoEnvio(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={confirmarEnvioNotificacoes}>
            <FaPaperPlane className="me-1" />
            Confirmar Envio
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Resultado do Envio */}
      <Modal
        show={showResultadoEnvio}
        onHide={() => setShowResultadoEnvio(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {resultadoEnvio?.falhas === 0 ? '✅' : '⚠️'} Resultado do Envio de Notificações
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {resultadoEnvio && (
            <>
              <Row className="mb-3">
                <Col md={4}>
                  <Card className="text-center border-primary">
                    <Card.Body>
                      <h3 className="text-primary mb-0">{resultadoEnvio.total}</h3>
                      <small className="text-muted">Mensalidades</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="text-center border-success">
                    <Card.Body>
                      <h3 className="text-success mb-0">{resultadoEnvio.sucessos}</h3>
                      <small className="text-muted">Enviados</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={4}>
                  <Card className="text-center border-danger">
                    <Card.Body>
                      <h3 className="text-danger mb-0">{resultadoEnvio.falhas}</h3>
                      <small className="text-muted">Falhas</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <p className="text-muted mb-3">
                <strong>Total de emails processados:</strong> {resultadoEnvio.emails_enviados}
                {' '}(alunos + responsáveis)
              </p>

              {resultadoEnvio.falhas === 0 ? (
                <div className="alert alert-success">
                  <strong>✅ Sucesso!</strong> Todas as notificações foram enviadas com sucesso!
                </div>
              ) : (
                <>
                  <div className="alert alert-warning">
                    <strong>⚠️ Atenção!</strong> Algumas notificações falharam ao serem enviadas.
                  </div>

                  {resultadoEnvio.falhas_lista && resultadoEnvio.falhas_lista.length > 0 && (
                    <div className="mt-3">
                      <h6 className="text-danger">Detalhes das Falhas:</h6>
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Nome</th>
                              <th>Email</th>
                              <th>Tipo</th>
                              <th>Erro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resultadoEnvio.falhas_lista.map((falha, idx) => (
                              <tr key={idx}>
                                <td>{falha.mensalidade_id}</td>
                                <td>{falha.nome}</td>
                                <td className="text-break">{falha.email}</td>
                                <td>
                                  <Badge bg={falha.tipo === 'aluno' ? 'primary' : 'secondary'}>
                                    {falha.tipo}
                                  </Badge>
                                </td>
                                <td className="text-danger small">{falha.erro}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setShowResultadoEnvio(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Financeiro;
