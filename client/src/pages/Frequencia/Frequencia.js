import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Table, Button, Badge, Form, Modal, Spinner, Alert, InputGroup } from 'react-bootstrap';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { frequenciaService, turmaService, frequenciaNovoService } from '../../services/api';
import { FaCheckCircle, FaTimesCircle, FaChartBar, FaCalendarAlt, FaUsers, FaClock, FaExclamationCircle, FaExclamationTriangle, FaEye, FaFilter, FaUserPlus, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';

const Frequencia = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('registrar');
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [dataAula, setDataAula] = useState(new Date().toISOString().split('T')[0]);
  const [horarioInicio, setHorarioInicio] = useState('');
  const [horarioFim, setHorarioFim] = useState('');
  const [presencas, setPresencas] = useState({});
  const [filters, setFilters] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear()
  });
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedPresenca, setSelectedPresenca] = useState(null);
  const [validationObservacoes, setValidationObservacoes] = useState('');

  // Estados para justificativas
  const [justificativasPendentes, setJustificativasPendentes] = useState([]);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [selectedJustificativa, setSelectedJustificativa] = useState(null);
  const [justificativaObservacoes, setJustificativaObservacoes] = useState('');
  const [loadingJustificativas, setLoadingJustificativas] = useState(false);
  const [processandoJustificativa, setProcessandoJustificativa] = useState(false);
  const [filtrosJustificativas, setFiltrosJustificativas] = useState({
    data_inicio: '',
    data_fim: '',
    aluno_nome: '',
    status: 'pendente'
  });

  // Estados para registro individual de presença
  const [showRegistroIndividualModal, setShowRegistroIndividualModal] = useState(false);
  const [buscaAluno, setBuscaAluno] = useState('');
  const [alunosEncontrados, setAlunosEncontrados] = useState([]);
  const [loadingBuscaAlunos, setLoadingBuscaAlunos] = useState(false);
  const [selectedAlunoIndividual, setSelectedAlunoIndividual] = useState(null);
  const [registroIndividualData, setRegistroIndividualData] = useState({
    turma_id: '',
    data_aula: new Date().toISOString().split('T')[0],
    horario_inicio: '',
    horario_fim: '',
    presente: true,
    observacoes: ''
  });
  const [registrandoIndividual, setRegistrandoIndividual] = useState(false);

  // Queries com tratamento de erros adequado
  const { data: turmas, isLoading: loadingTurmas } = useQuery(
    'turmas-ativas',
    async () => {
      const response = await turmaService.getTurmas({ status: 'ativo' });
      return response?.data || [];
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      onError: (error) => {
        console.error('Erro ao carregar turmas:', error);
        toast.error('Erro ao carregar turmas. Verifique sua conexão.');
      }
    }
  );

  const turmasList = Array.isArray(turmas) ? turmas : [];

  // Organizar turmas por categoria
  const getTurmasPorCategoria = () => {
    // Adultos: GB1, GB2 ou programa "Adultos"
    const gb1_gb2 = turmasList.filter(t => {
      const programa = t.programa?.toUpperCase() || '';
      const nome = t.nome?.toUpperCase() || '';
      return ['GB1', 'GB2', 'ADULTOS'].includes(programa) ||
             nome.includes('GB1') || nome.includes('GB2') ||
             (programa === 'ADULTOS' && !nome.includes('KIDS'));
    });

    // Kids: programa Kids ou nome contém KIDS/Infantil
    const kids = turmasList.filter(t => {
      const programa = t.programa?.toLowerCase() || '';
      const nome = t.nome?.toLowerCase() || '';
      return programa.includes('kids') || programa.includes('infantil') || nome.includes('kids') || nome.includes('infantil');
    });

    // Sábado: qualquer turma de sábado
    const sabado = turmasList.filter(t =>
      t.dia_semana?.toLowerCase().includes('sábado') ||
      t.dia_semana?.toLowerCase().includes('sabado')
    );

    // Excluir as turmas de sábado das categorias gb1_gb2 e kids
    const gb1_gb2_semSabado = gb1_gb2.filter(t =>
      !t.dia_semana?.toLowerCase().includes('sábado') &&
      !t.dia_semana?.toLowerCase().includes('sabado')
    );

    const kids_semSabado = kids.filter(t =>
      !t.dia_semana?.toLowerCase().includes('sábado') &&
      !t.dia_semana?.toLowerCase().includes('sabado')
    );

    // Outras: turmas que não se encaixam em nenhuma categoria acima
    const outras = turmasList.filter(t => {
      const programa = t.programa?.toLowerCase() || '';
      const nome = t.nome?.toLowerCase() || '';
      const diaSemana = t.dia_semana?.toLowerCase() || '';

      const isAdultos = ['gb1', 'gb2', 'adultos'].includes(programa) ||
                        nome.includes('gb1') || nome.includes('gb2');
      const isKids = programa.includes('kids') || programa.includes('infantil') || nome.includes('kids') || nome.includes('infantil');
      const isSabado = diaSemana.includes('sábado') || diaSemana.includes('sabado');

      return !isAdultos && !isKids && !isSabado;
    });

    return { gb1_gb2: gb1_gb2_semSabado, kids: kids_semSabado, sabado, outras };
  };

  const turmasOrganizadas = getTurmasPorCategoria();

  const { data: alunosTurma = [], refetch: refetchAlunos, isLoading: loadingAlunos } = useQuery(
    ['alunos-turma-frequencia', selectedTurma?.id, dataAula, horarioInicio],
    () => frequenciaService.getAlunosTurma(selectedTurma?.id, {
      data_aula: dataAula,
      horario_inicio: horarioInicio
    }),
    {
      select: (response) => response.data,
      enabled: !!selectedTurma && !!dataAula && !!horarioInicio,
      retry: false,
      onSuccess: (data) => {
        const initialPresencas = {};
        data.forEach(aluno => {
          initialPresencas[aluno.id] = {
            presente: aluno.presente !== null ? Boolean(aluno.presente) : true,
            observacoes: aluno.observacoes || ''
          };
        });
        setPresencas(initialPresencas);
      },
      onError: (error) => {
        console.error('Erro ao carregar alunos da turma:', error);
      }
    }
  );

  const { data: estatisticas = {}, isLoading: loadingEstatisticas } = useQuery(
    ['estatisticas-frequencia', filters.mes, filters.ano, activeTab],
    () => frequenciaService.getEstatisticasGerais({
      mes: filters.mes,
      ano: filters.ano
    }),
    {
      select: (response) => response.data,
      enabled: activeTab === 'estatisticas',
      retry: false,
      onError: (error) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    }
  );

  const { data: relatorioMensal = [], isLoading: loadingRelatorio } = useQuery(
    ['relatorio-mensal', filters.mes, filters.ano, activeTab],
    () => frequenciaService.getRelatorioMensal({
      mes: filters.mes,
      ano: filters.ano
    }),
    {
      select: (response) => response.data,
      enabled: activeTab === 'relatorio',
      retry: false,
      onError: (error) => {
        console.error('Erro ao carregar relatório:', error);
      }
    }
  );

  const { data: presencasPendentes = [], refetch: refetchPendentes, isLoading: loadingPendentes } = useQuery(
    ['presencas-pendentes', activeTab],
    () => frequenciaService.getPendentesValidacao(),
    {
      select: (response) => {
        console.log('=== DEBUG VALIDAÇÃO ===');
        console.log('[VALIDAÇÃO] Response completo:', response);
        console.log('[VALIDAÇÃO] Response.data:', response.data);
        console.log('[VALIDAÇÃO] Tipo de response.data:', typeof response.data);
        console.log('[VALIDAÇÃO] É array?', Array.isArray(response.data));

        try {
          // Tratamento defensivo para diferentes estruturas de resposta
          let presencas = [];

          if (response.data) {
            // Caso 1: response.data é um array direto
            if (Array.isArray(response.data)) {
              console.log('[VALIDAÇÃO] Estrutura: Array direto');
              presencas = response.data;
            }
            // Caso 2: response.data tem propriedade presencas
            else if (response.data.presencas && Array.isArray(response.data.presencas)) {
              console.log('[VALIDAÇÃO] Estrutura: Objeto com propriedade presencas');
              presencas = response.data.presencas;
            }
            // Caso 3: response.data é um objeto mas não tem presencas
            else {
              console.log('[VALIDAÇÃO] Estrutura: Objeto sem propriedade presencas');
              console.log('[VALIDAÇÃO] Keys do objeto:', Object.keys(response.data));
              presencas = [];
            }
          }

          console.log('[VALIDAÇÃO] ✅ Presenças extraídas:', presencas.length, 'registros');
          if (presencas.length > 0) {
            console.log('[VALIDAÇÃO] Primeira presença:', presencas[0]);
          }
          console.log('======================');

          return presencas;
        } catch (error) {
          console.error('[VALIDAÇÃO] ❌ ERRO no select:', error);
          console.error('[VALIDAÇÃO] Stack:', error.stack);
          return [];
        }
      },
      enabled: activeTab === 'validacao',
      retry: false,
      onSuccess: (data) => {
        console.log('[VALIDAÇÃO] ✅ onSuccess - Dados processados:', data.length, 'registros');
        if (data.length > 0) {
          console.log('[VALIDAÇÃO] Primeira presença processada:', data[0]);
        }
      },
      onError: (error) => {
        console.error('[VALIDAÇÃO] ❌ onError - Erro capturado:', error);
        console.error('[VALIDAÇÃO] error.response:', error.response);
        console.error('[VALIDAÇÃO] error.response?.data:', error.response?.data);
        console.error('[VALIDAÇÃO] error.response?.status:', error.response?.status);
        console.error('[VALIDAÇÃO] error.message:', error.message);
        toast.error('Erro ao carregar presenças pendentes: ' + (error.response?.data?.error || error.message));
      },
      cacheTime: 1000 * 60 * 5,
      staleTime: 1000 * 30,
      refetchOnMount: true,
      refetchOnWindowFocus: false
    }
  );

  // Mutations
  const registrarFrequenciaMutation = useMutation(
    (data) => frequenciaService.registrarTurma(data),
    {
      onSuccess: () => {
        toast.success('Frequência registrada com sucesso!');
        setSelectedTurma(null);
        setPresencas({});
        refetchAlunos();
      },
      onError: (error) => {
        console.error('Erro ao registrar frequência:', error);
        toast.error('Erro ao registrar frequência. Tente novamente.');
      }
    }
  );

  const validarPresencaMutation = useMutation(
    ({ id, data }) => frequenciaService.validarPresenca(id, data),
    {
      onSuccess: () => {
        toast.success('Presença validada com sucesso!');
        setShowValidationModal(false);
        setSelectedPresenca(null);
        setValidationObservacoes('');
        refetchPendentes();
        queryClient.invalidateQueries('estatisticas-frequencia');
      },
      onError: (error) => {
        console.error('Erro ao validar presença:', error);
        toast.error('Erro ao validar presença. Tente novamente.');
      }
    }
  );

  const handleTogglePresenca = (alunoId) => {
    setPresencas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        presente: !prev[alunoId]?.presente
      }
    }));
  };

  const handleObservacaoChange = (alunoId, observacoes) => {
    setPresencas(prev => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        observacoes
      }
    }));
  };

  const handleRegistrarFrequencia = async () => {
    if (!selectedTurma || !dataAula || !horarioInicio) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const presencasArray = Object.entries(presencas).map(([alunoId, data]) => ({
      aluno_id: parseInt(alunoId),
      presente: data.presente,
      observacoes: data.observacoes
    }));

    registrarFrequenciaMutation.mutate({
      turma_id: selectedTurma.id,
      data_aula: dataAula,
      horario_inicio: horarioInicio,
      horario_fim: horarioFim,
      tipo_aula: 'regular',
      presencas: presencasArray
    });
  };

  const handleMarcarTodos = (presente) => {
    const newPresencas = {};
    alunosTurma.forEach(aluno => {
      newPresencas[aluno.id] = {
        presente,
        observacoes: presencas[aluno.id]?.observacoes || ''
      };
    });
    setPresencas(newPresencas);
  };

  const handleOpenValidationModal = (presenca) => {
    setSelectedPresenca(presenca);
    setValidationObservacoes(presenca.observacoes || '');
    setShowValidationModal(true);
  };

  const handleValidarPresenca = (statusValidacao) => {
    if (!selectedPresenca) return;

    validarPresencaMutation.mutate({
      id: selectedPresenca.id,
      data: {
        status_validacao: statusValidacao,
        observacoes: validationObservacoes
      }
    });
  };

  // Funções para Justificativas
  const loadJustificativasPendentes = async () => {
    try {
      setLoadingJustificativas(true);
      const response = await frequenciaNovoService.getJustificativasPendentes(filtrosJustificativas);
      setJustificativasPendentes(response.data.justificativas || []);
    } catch (err) {
      console.error('Erro ao carregar justificativas:', err);
      toast.error('Erro ao carregar justificativas: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingJustificativas(false);
    }
  };

  const handleAnalisarJustificativa = async (id, status, observacoes) => {
    try {
      setProcessandoJustificativa(true);

      await frequenciaNovoService.analisarJustificativa(id, {
        status,
        observacoes_analise: observacoes
      });

      toast.success(`Justificativa ${status === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso!`);

      // Fechar modal e limpar
      setShowJustificativaModal(false);
      setSelectedJustificativa(null);
      setJustificativaObservacoes('');

      // Recarregar lista
      await loadJustificativasPendentes();
    } catch (err) {
      console.error('Erro ao analisar justificativa:', err);
      toast.error('Erro ao analisar justificativa: ' + (err.response?.data?.error || err.message));
    } finally {
      setProcessandoJustificativa(false);
    }
  };

  const handleFiltroJustificativaChange = (e) => {
    const { name, value } = e.target;
    setFiltrosJustificativas(prev => ({ ...prev, [name]: value }));
  };

  const handleAplicarFiltrosJustificativas = () => {
    loadJustificativasPendentes();
  };

  const handleLimparFiltrosJustificativas = () => {
    setFiltrosJustificativas({
      data_inicio: '',
      data_fim: '',
      aluno_nome: '',
      status: 'pendente'
    });
    setTimeout(() => loadJustificativasPendentes(), 100);
  };

  const openJustificativaModal = (justificativa) => {
    setSelectedJustificativa(justificativa);
    setJustificativaObservacoes('');
    setShowJustificativaModal(true);
  };

  // Funções para registro individual de presença
  const buscarAlunos = useCallback(async (termo) => {
    if (!termo || termo.length < 2) {
      setAlunosEncontrados([]);
      return;
    }

    try {
      setLoadingBuscaAlunos(true);
      const response = await frequenciaService.getAlunosDisponiveis({ busca: termo });
      setAlunosEncontrados(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar alunos:', error);
      toast.error('Erro ao buscar alunos');
    } finally {
      setLoadingBuscaAlunos(false);
    }
  }, []);

  // Debounce para busca de alunos
  useEffect(() => {
    const timer = setTimeout(() => {
      buscarAlunos(buscaAluno);
    }, 300);
    return () => clearTimeout(timer);
  }, [buscaAluno, buscarAlunos]);

  const handleOpenRegistroIndividual = () => {
    setShowRegistroIndividualModal(true);
    setBuscaAluno('');
    setAlunosEncontrados([]);
    setSelectedAlunoIndividual(null);
    setRegistroIndividualData({
      turma_id: '',
      data_aula: new Date().toISOString().split('T')[0],
      horario_inicio: '',
      horario_fim: '',
      presente: true,
      observacoes: ''
    });
  };

  const handleSelectAlunoIndividual = (aluno) => {
    setSelectedAlunoIndividual(aluno);
    setBuscaAluno('');
    setAlunosEncontrados([]);
  };

  const handleRegistroIndividualChange = (field, value) => {
    setRegistroIndividualData(prev => ({ ...prev, [field]: value }));

    // Se selecionou turma, preencher horários automaticamente
    if (field === 'turma_id' && value) {
      const turma = turmasList.find(t => t.id === parseInt(value));
      if (turma) {
        setRegistroIndividualData(prev => ({
          ...prev,
          turma_id: value,
          horario_inicio: turma.horario_inicio || '',
          horario_fim: turma.horario_fim || ''
        }));
      }
    }
  };

  const handleSubmitRegistroIndividual = async () => {
    if (!selectedAlunoIndividual) {
      toast.error('Selecione um aluno');
      return;
    }

    if (!registroIndividualData.turma_id || !registroIndividualData.data_aula || !registroIndividualData.horario_inicio) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setRegistrandoIndividual(true);
      const response = await frequenciaService.registrarIndividual({
        aluno_id: selectedAlunoIndividual.id,
        turma_id: parseInt(registroIndividualData.turma_id),
        data_aula: registroIndividualData.data_aula,
        horario_inicio: registroIndividualData.horario_inicio,
        horario_fim: registroIndividualData.horario_fim,
        presente: registroIndividualData.presente,
        observacoes: registroIndividualData.observacoes
      });

      toast.success(`Presença de ${selectedAlunoIndividual.nome} registrada com sucesso!`);
      setShowRegistroIndividualModal(false);

      // Recarregar dados se estiver na mesma turma/data
      if (selectedTurma && selectedTurma.id === parseInt(registroIndividualData.turma_id)) {
        refetchAlunos();
      }
    } catch (error) {
      console.error('Erro ao registrar presença:', error);
      toast.error(error.response?.data?.error || 'Erro ao registrar presença');
    } finally {
      setRegistrandoIndividual(false);
    }
  };

  // Effect para carregar justificativas quando a tab muda
  useEffect(() => {
    if (activeTab === 'justificativas' && justificativasPendentes.length === 0) {
      loadJustificativasPendentes();
    }
  }, [activeTab]);

  const getStatusBadge = (percentual) => {
    if (percentual >= 90) return <Badge bg="success">{percentual}%</Badge>;
    if (percentual >= 75) return <Badge bg="warning">{percentual}%</Badge>;
    return <Badge bg="danger">{percentual}%</Badge>;
  };

  const getStatusValidacaoBadge = (status) => {
    const statusMap = {
      pendente: { bg: 'warning', text: 'Pendente' },
      validado: { bg: 'success', text: 'Validado' },
      rejeitado: { bg: 'danger', text: 'Rejeitado' }
    };
    const config = statusMap[status] || statusMap.pendente;
    return <Badge bg={config.bg}>{config.text}</Badge>;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleString('pt-BR');
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2 className="text-danger">Frequência</h2>
              <p className="text-muted">Controle de presença, validação e relatórios</p>
            </div>
            <Button
              variant="primary"
              onClick={handleOpenRegistroIndividual}
              className="d-flex align-items-center gap-2"
            >
              <FaUserPlus />
              Registrar Presença Individual
            </Button>
          </div>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {/* Registrar Frequência */}
        <Tab eventKey="registrar" title={<span><FaCalendarAlt className="me-2" />Registrar Presença</span>}>
          <Row className="mb-3">
            <Col xs={12} sm={12} md={3} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Turma</Form.Label>
                <Form.Select
                  value={selectedTurma?.id || ''}
                  onChange={(e) => {
                    const turma = turmasList.find(t => t.id === parseInt(e.target.value));
                    setSelectedTurma(turma);
                    if (turma) {
                      setHorarioInicio(turma.horario_inicio);
                      setHorarioFim(turma.horario_fim);
                    }
                  }}
                  disabled={loadingTurmas}
                >
                  <option value="">Selecione uma turma...</option>

                  {/* GB1 e GB2 - Adultos */}
                  {turmasOrganizadas.gb1_gb2.length > 0 && (
                    <optgroup label="🥋 GB1 / GB2 - Adultos">
                      {turmasOrganizadas.gb1_gb2.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} - {t.dia_semana} {formatTime(t.horario_inicio)} ({t.programa})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Kids */}
                  {turmasOrganizadas.kids.length > 0 && (
                    <optgroup label="👶 Kids - Infantil">
                      {turmasOrganizadas.kids.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} - {t.dia_semana} {formatTime(t.horario_inicio)} ({t.programa})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Sábado */}
                  {turmasOrganizadas.sabado.length > 0 && (
                    <optgroup label="📅 Aulas de Sábado">
                      {turmasOrganizadas.sabado.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} - {formatTime(t.horario_inicio)} ({t.programa})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Outras Turmas */}
                  {turmasOrganizadas.outras.length > 0 && (
                    <optgroup label="📚 Outras Turmas">
                      {turmasOrganizadas.outras.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} - {t.dia_semana} {formatTime(t.horario_inicio)} ({t.programa})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Fallback: se nenhuma categoria tiver turmas mas turmasList tem, mostrar todas */}
                  {turmasOrganizadas.gb1_gb2.length === 0 &&
                   turmasOrganizadas.kids.length === 0 &&
                   turmasOrganizadas.sabado.length === 0 &&
                   turmasOrganizadas.outras.length === 0 &&
                   turmasList.length > 0 && (
                    <optgroup label="Todas as Turmas">
                      {turmasList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} - {t.dia_semana} {formatTime(t.horario_inicio)} ({t.programa || 'N/A'})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Data da Aula</Form.Label>
                <Form.Control
                  type="date"
                  value={dataAula}
                  onChange={(e) => setDataAula(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Horário Início</Form.Label>
                <Form.Control
                  type="time"
                  value={horarioInicio}
                  onChange={(e) => setHorarioInicio(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Horário Fim</Form.Label>
                <Form.Control
                  type="time"
                  value={horarioFim}
                  onChange={(e) => setHorarioFim(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} sm={12} md={3} className="d-flex align-items-end gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => handleMarcarTodos(true)}
                disabled={alunosTurma.length === 0 || loadingAlunos}
              >
                Marcar Todos
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleMarcarTodos(false)}
                disabled={alunosTurma.length === 0 || loadingAlunos}
              >
                Desmarcar Todos
              </Button>
            </Col>
          </Row>

          {loadingAlunos && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="danger" />
              <p className="mt-2">Carregando alunos...</p>
            </div>
          )}

          {!loadingAlunos && selectedTurma && alunosTurma.length > 0 && (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Lista de Presença - {selectedTurma.nome}</h5>
                <Button
                  variant="danger"
                  onClick={handleRegistrarFrequencia}
                  disabled={registrarFrequenciaMutation.isLoading}
                >
                  {registrarFrequenciaMutation.isLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Frequência'
                  )}
                </Button>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }} className="text-center">Presente</th>
                      <th>Nome</th>
                      <th>Graduação</th>
                      <th>Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosTurma.map((aluno) => (
                      <tr key={aluno.id} className={!presencas[aluno.id]?.presente ? 'table-warning' : ''}>
                        <td className="text-center">
                          <Button
                            variant={presencas[aluno.id]?.presente ? 'success' : 'outline-secondary'}
                            size="sm"
                            onClick={() => handleTogglePresenca(aluno.id)}
                          >
                            {presencas[aluno.id]?.presente ? (
                              <FaCheckCircle size={20} />
                            ) : (
                              <FaTimesCircle size={20} />
                            )}
                          </Button>
                        </td>
                        <td>{aluno.nome}</td>
                        <td>
                          <Badge
                            bg="secondary"
                            style={{ backgroundColor: aluno.cor_graduacao }}
                          >
                            {aluno.graduacao || 'Não definida'}
                          </Badge>
                        </td>
                        <td>
                          <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Observações..."
                            value={presencas[aluno.id]?.observacoes || ''}
                            onChange={(e) => handleObservacaoChange(aluno.id, e.target.value)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}

          {!loadingAlunos && selectedTurma && alunosTurma.length === 0 && (
            <Alert variant="info">
              <FaExclamationCircle className="me-2" />
              Nenhum aluno encontrado nesta turma
            </Alert>
          )}
        </Tab>

        {/* Validação de Presenças */}
        <Tab eventKey="validacao" title={<span><FaClock className="me-2" />Validar Presenças</span>}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">Presenças Pendentes de Validação</h5>
                <small className="text-muted">
                  {loadingPendentes ? 'Carregando...' : `${presencasPendentes.length} registro(s) encontrado(s)`}
                </small>
              </div>
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => refetchPendentes()}
                disabled={loadingPendentes}
              >
                {loadingPendentes ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    Atualizando...
                  </>
                ) : (
                  <>
                    <FaClock className="me-1" />
                    Atualizar
                  </>
                )}
              </Button>
            </Card.Header>
            <Card.Body>
              {loadingPendentes && (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="danger" />
                  <p className="mt-2">Carregando presenças pendentes...</p>
                </div>
              )}

              {!loadingPendentes && presencasPendentes.length === 0 && (
                <Alert variant="success">
                  <FaCheckCircle className="me-2" />
                  Não há presenças pendentes de validação
                </Alert>
              )}

              {!loadingPendentes && presencasPendentes.length > 0 && (
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Turma</th>
                      <th>Horário</th>
                      <th>Aluno</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presencasPendentes.map((presenca) => (
                      <tr key={presenca.id}>
                        <td>{formatDate(presenca.data_aula)}</td>
                        <td>{presenca.turma_nome}</td>
                        <td>{formatTime(presenca.horario_inicio)} - {formatTime(presenca.horario_fim)}</td>
                        <td>{presenca.aluno_nome}</td>
                        <td className="text-center">
                          {getStatusValidacaoBadge(presenca.status_validacao)}
                        </td>
                        <td className="text-center">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenValidationModal(presenca)}
                          >
                            Validar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        {/* Estatísticas */}
        <Tab eventKey="estatisticas" title={<span><FaChartBar className="me-2" />Estatísticas</span>}>
          <Row className="mb-3">
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={filters.mes}
                  onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={filters.ano}
                  onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
                >
                  {[2024, 2025, 2026].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {loadingEstatisticas && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="danger" />
              <p className="mt-2">Carregando estatísticas...</p>
            </div>
          )}

          {!loadingEstatisticas && (
            <>
              <Row className="mb-4">
                <Col xs={12} sm={6} md={4} className="mb-3">
                  <Card className="text-center h-100">
                    <Card.Body>
                      <FaCheckCircle size={40} className="text-success mb-2" />
                      <h3>{estatisticas.resumo?.taxa_presenca || 0}%</h3>
                      <p className="text-muted mb-0">Taxa de Presença</p>
                      <small className="text-muted">
                        {estatisticas.resumo?.total_presencas || 0} de {estatisticas.resumo?.total_registros || 0} aulas
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={6} md={4} className="mb-3">
                  <Card className="text-center h-100">
                    <Card.Body>
                      <FaTimesCircle size={40} className="text-danger mb-2" />
                      <h3>{estatisticas.resumo?.total_faltas || 0}</h3>
                      <p className="text-muted mb-0">Total de Faltas</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} sm={12} md={4} className="mb-3">
                  <Card className="text-center h-100">
                    <Card.Body>
                      <FaUsers size={40} className="text-primary mb-2" />
                      <h3>{estatisticas.resumo?.total_registros || 0}</h3>
                      <p className="text-muted mb-0">Total de Registros</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col xs={12} md={6} className="mb-3 mb-md-0">
                  <Card>
                    <Card.Header className="bg-success text-white">
                      <h5 className="mb-0">
                        <FaCheckCircle className="me-2" />
                        Alunos Mais Frequentes
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      {estatisticas.alunos_mais_faltas?.length > 0 ? (
                        <Table responsive>
                          <thead>
                            <tr>
                              <th>Aluno</th>
                              <th className="text-center">Presenças</th>
                              <th className="text-center">Total Aulas</th>
                              <th className="text-center">Taxa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estatisticas.alunos_mais_faltas
                              .sort((a, b) => (100 - b.taxa_falta) - (100 - a.taxa_falta))
                              .slice(0, 10)
                              .map((aluno) => {
                                const presencas = aluno.total_aulas - aluno.total_faltas;
                                const taxaPresenca = 100 - parseFloat(aluno.taxa_falta);
                                return (
                                  <tr key={aluno.id}>
                                    <td>{aluno.nome}</td>
                                    <td className="text-center">
                                      <strong className="text-success">{presencas}</strong>
                                    </td>
                                    <td className="text-center">{aluno.total_aulas}</td>
                                    <td className="text-center">
                                      {getStatusBadge(taxaPresenca)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted text-center">Nenhum dado disponível</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col xs={12} md={6} className="mb-3">
                  <Card>
                    <Card.Header className="bg-danger text-white">
                      <h5 className="mb-0">
                        <FaTimesCircle className="me-2" />
                        Alunos com Mais Faltas
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      {estatisticas.alunos_mais_faltas?.length > 0 ? (
                        <Table responsive>
                          <thead>
                            <tr>
                              <th>Aluno</th>
                              <th className="text-center">Faltas</th>
                              <th className="text-center">Total Aulas</th>
                              <th className="text-center">Taxa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estatisticas.alunos_mais_faltas.slice(0, 10).map((aluno) => (
                              <tr key={aluno.id}>
                                <td>{aluno.nome}</td>
                                <td className="text-center">
                                  <strong className="text-danger">{aluno.total_faltas}</strong>
                                </td>
                                <td className="text-center">{aluno.total_aulas}</td>
                                <td className="text-center">
                                  <Badge bg="danger">{aluno.taxa_falta}%</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted text-center">Nenhum dado disponível</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">Frequência por Dia da Semana</h5>
                    </Card.Header>
                    <Card.Body>
                      {estatisticas.por_dia_semana?.length > 0 ? (
                        <Table responsive>
                          <thead>
                            <tr>
                              <th>Dia</th>
                              <th className="text-center">Aulas</th>
                              <th className="text-center">Presenças</th>
                              <th className="text-center">Taxa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {estatisticas.por_dia_semana.map((dia) => (
                              <tr key={dia.dia_semana}>
                                <td>{dia.dia_semana}</td>
                                <td className="text-center">{dia.total_aulas}</td>
                                <td className="text-center">{dia.presencas}</td>
                                <td className="text-center">
                                  {getStatusBadge(parseFloat(dia.taxa_presenca))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <p className="text-muted text-center">Nenhum dado disponível</p>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Tab>

        {/* Relatório Mensal */}
        <Tab eventKey="relatorio" title={<span><FaUsers className="me-2" />Relatório Mensal</span>}>
          <Row className="mb-3">
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Mês</Form.Label>
                <Form.Select
                  value={filters.mes}
                  onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} sm={6} md={2} className="mb-3 mb-md-0">
              <Form.Group>
                <Form.Label>Ano</Form.Label>
                <Form.Select
                  value={filters.ano}
                  onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
                >
                  {[2024, 2025, 2026].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {loadingRelatorio && (
            <div className="text-center py-5">
              <Spinner animation="border" variant="danger" />
              <p className="mt-2">Carregando relatório...</p>
            </div>
          )}

          {!loadingRelatorio && (
            <Card>
              <Card.Header>
                <h5 className="mb-0">
                  Relatório de Frequência - {filters.mes}/{filters.ano}
                </h5>
              </Card.Header>
              <Card.Body>
                {relatorioMensal.length > 0 ? (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th className="text-center">Total Aulas</th>
                        <th className="text-center">Presenças</th>
                        <th className="text-center">Faltas</th>
                        <th className="text-center">% Presença</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorioMensal.map((aluno) => (
                        <tr key={aluno.aluno_id}>
                          <td>{aluno.aluno_nome}</td>
                          <td className="text-center">{aluno.total_aulas}</td>
                          <td className="text-center">{aluno.presencas}</td>
                          <td className="text-center">{aluno.faltas}</td>
                          <td className="text-center">
                            {getStatusBadge(parseFloat(aluno.percentual_presenca))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info">
                    Nenhum dado disponível para o período selecionado
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}
        </Tab>

        {/* Justificativas */}
        <Tab eventKey="justificativas" title={<span><FaExclamationTriangle className="me-2" />Justificativas</span>}>
          {/* Filtros de Justificativas */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <FaFilter className="me-2" />
                Filtros de Justificativas
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={12} sm={6} md={3} className="mb-3">
                  <Form.Group>
                    <Form.Label>Data Início</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_inicio"
                      value={filtrosJustificativas.data_inicio}
                      onChange={handleFiltroJustificativaChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3">
                  <Form.Group>
                    <Form.Label>Data Fim</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_fim"
                      value={filtrosJustificativas.data_fim}
                      onChange={handleFiltroJustificativaChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3">
                  <Form.Group>
                    <Form.Label>Nome do Aluno</Form.Label>
                    <Form.Control
                      type="text"
                      name="aluno_nome"
                      placeholder="Buscar por nome..."
                      value={filtrosJustificativas.aluno_nome}
                      onChange={handleFiltroJustificativaChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} sm={6} md={3} className="mb-3">
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      name="status"
                      value={filtrosJustificativas.status}
                      onChange={handleFiltroJustificativaChange}
                    >
                      <option value="">Todos</option>
                      <option value="pendente">Pendente</option>
                      <option value="aprovado">Aprovado</option>
                      <option value="rejeitado">Rejeitado</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <div className="d-flex gap-2">
                <Button variant="primary" size="sm" onClick={handleAplicarFiltrosJustificativas}>
                  <FaFilter className="me-1" /> Aplicar Filtros
                </Button>
                <Button variant="outline-secondary" size="sm" onClick={handleLimparFiltrosJustificativas}>
                  Limpar Filtros
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Lista de Justificativas */}
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaExclamationTriangle className="me-2" />
                  Justificativas de Ausências
                </h5>
                <Badge bg="primary">{justificativasPendentes.length} registros</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {loadingJustificativas ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="danger" />
                  <p className="mt-2">Carregando justificativas...</p>
                </div>
              ) : justificativasPendentes.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  Nenhuma justificativa encontrada com os filtros aplicados.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Aluno</th>
                        <th>Matrícula</th>
                        <th>Data da Ausência</th>
                        <th>Motivo</th>
                        <th className="text-center">Status</th>
                        <th>Enviado em</th>
                        <th className="text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {justificativasPendentes.map((just) => (
                        <tr key={just.id}>
                          <td>{just.aluno_nome}</td>
                          <td><small className="text-muted">{just.aluno_matricula}</small></td>
                          <td>{formatDate(just.data_ausencia)}</td>
                          <td>
                            <small className="text-muted">
                              {just.motivo.length > 60 ? just.motivo.substring(0, 60) + '...' : just.motivo}
                            </small>
                          </td>
                          <td className="text-center">
                            {just.status === 'pendente' && (
                              <Badge bg="warning" text="dark">
                                <FaClock className="me-1" />
                                Pendente
                              </Badge>
                            )}
                            {just.status === 'aprovado' && (
                              <Badge bg="success">
                                <FaCheckCircle className="me-1" />
                                Aprovado
                              </Badge>
                            )}
                            {just.status === 'rejeitado' && (
                              <Badge bg="danger">
                                <FaTimesCircle className="me-1" />
                                Rejeitado
                              </Badge>
                            )}
                          </td>
                          <td><small className="text-muted">{formatDateTime(just.created_at)}</small></td>
                          <td className="text-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => openJustificativaModal(just)}
                              disabled={just.status !== 'pendente'}
                            >
                              <FaEye className="me-1" />
                              {just.status === 'pendente' ? 'Analisar' : 'Ver Detalhes'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal de Validação */}
      <Modal show={showValidationModal} onHide={() => setShowValidationModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Validar Presença</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPresenca && (
            <>
              <div className="mb-3">
                <strong>Aluno:</strong> {selectedPresenca.aluno_nome}<br />
                <strong>Turma:</strong> {selectedPresenca.turma_nome}<br />
                <strong>Data:</strong> {formatDate(selectedPresenca.data_aula)}<br />
                <strong>Horário:</strong> {formatTime(selectedPresenca.horario_inicio)} - {formatTime(selectedPresenca.horario_fim)}
              </div>
              <Form.Group>
                <Form.Label>Observações</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={validationObservacoes}
                  onChange={(e) => setValidationObservacoes(e.target.value)}
                  placeholder="Adicione observações sobre a validação..."
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowValidationModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            onClick={() => handleValidarPresenca('rejeitado')}
            disabled={validarPresencaMutation.isLoading}
          >
            Rejeitar
          </Button>
          <Button
            variant="success"
            onClick={() => handleValidarPresenca('validado')}
            disabled={validarPresencaMutation.isLoading}
          >
            {validarPresencaMutation.isLoading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Validando...
              </>
            ) : (
              'Validar Presença'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Análise de Justificativa */}
      <Modal
        show={showJustificativaModal}
        onHide={() => {
          setShowJustificativaModal(false);
          setSelectedJustificativa(null);
          setJustificativaObservacoes('');
        }}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2" />
            Analisar Justificativa
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedJustificativa && (
            <>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Aluno:</strong>
                  <p>{selectedJustificativa.aluno_nome}</p>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Matrícula:</strong>
                  <p>{selectedJustificativa.aluno_matricula}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col xs={12} md={6}>
                  <strong>Data da Ausência:</strong>
                  <p>{formatDate(selectedJustificativa.data_ausencia)}</p>
                </Col>
                <Col xs={12} md={6}>
                  <strong>Enviado em:</strong>
                  <p>{formatDateTime(selectedJustificativa.created_at)}</p>
                </Col>
              </Row>
              <Row className="mb-3">
                <Col>
                  <strong>Motivo:</strong>
                  <p className="mt-2 p-3 bg-light rounded">{selectedJustificativa.motivo}</p>
                </Col>
              </Row>
              {selectedJustificativa.anexo_url && (
                <Row className="mb-3">
                  <Col>
                    <strong>Anexo:</strong>
                    <p>
                      <a href={selectedJustificativa.anexo_url} target="_blank" rel="noopener noreferrer">
                        Ver Anexo
                      </a>
                    </p>
                  </Col>
                </Row>
              )}
              {selectedJustificativa.status === 'pendente' && (
                <Row>
                  <Col>
                    <Form.Group>
                      <Form.Label>Observações da Análise (opcional)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={justificativaObservacoes}
                        onChange={(e) => setJustificativaObservacoes(e.target.value)}
                        placeholder="Adicione observações sobre a análise..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
              )}
              {selectedJustificativa.status !== 'pendente' && (
                <>
                  <Row className="mb-3">
                    <Col>
                      <strong>Status:</strong>
                      <p>
                        {selectedJustificativa.status === 'aprovado' ? (
                          <Badge bg="success">Aprovado</Badge>
                        ) : (
                          <Badge bg="danger">Rejeitado</Badge>
                        )}
                      </p>
                    </Col>
                  </Row>
                  {selectedJustificativa.analisado_por_nome && (
                    <Row className="mb-3">
                      <Col>
                        <strong>Analisado por:</strong>
                        <p>{selectedJustificativa.analisado_por_nome}</p>
                      </Col>
                    </Row>
                  )}
                  {selectedJustificativa.observacoes_analise && (
                    <Row>
                      <Col>
                        <strong>Observações da Análise:</strong>
                        <p className="mt-2 p-3 bg-light rounded">{selectedJustificativa.observacoes_analise}</p>
                      </Col>
                    </Row>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowJustificativaModal(false);
              setSelectedJustificativa(null);
              setJustificativaObservacoes('');
            }}
          >
            {selectedJustificativa?.status === 'pendente' ? 'Cancelar' : 'Fechar'}
          </Button>
          {selectedJustificativa?.status === 'pendente' && (
            <>
              <Button
                variant="danger"
                onClick={() => handleAnalisarJustificativa(selectedJustificativa.id, 'rejeitado', justificativaObservacoes)}
                disabled={processandoJustificativa}
              >
                {processandoJustificativa ? (
                  <Spinner as="span" animation="border" size="sm" className="me-1" />
                ) : (
                  <FaTimesCircle className="me-1" />
                )}
                Rejeitar
              </Button>
              <Button
                variant="success"
                onClick={() => handleAnalisarJustificativa(selectedJustificativa.id, 'aprovado', justificativaObservacoes)}
                disabled={processandoJustificativa}
              >
                {processandoJustificativa ? (
                  <Spinner as="span" animation="border" size="sm" className="me-1" />
                ) : (
                  <FaCheckCircle className="me-1" />
                )}
                Aprovar
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Modal de Registro Individual de Presença */}
      <Modal
        show={showRegistroIndividualModal}
        onHide={() => setShowRegistroIndividualModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaUserPlus className="me-2" />
            Registrar Presença Individual
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Busca de Aluno */}
          <Form.Group className="mb-4">
            <Form.Label><strong>1. Buscar Aluno</strong></Form.Label>
            {selectedAlunoIndividual ? (
              <Alert variant="success" className="d-flex justify-content-between align-items-center mb-0">
                <div>
                  <strong>{selectedAlunoIndividual.nome}</strong>
                  <br />
                  <small className="text-muted">{selectedAlunoIndividual.email}</small>
                  {selectedAlunoIndividual.graduacao && (
                    <Badge
                      className="ms-2"
                      style={{ backgroundColor: selectedAlunoIndividual.cor_graduacao || '#6c757d' }}
                    >
                      {selectedAlunoIndividual.graduacao}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => setSelectedAlunoIndividual(null)}
                >
                  Trocar Aluno
                </Button>
              </Alert>
            ) : (
              <>
                <InputGroup>
                  <InputGroup.Text>
                    <FaSearch />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Digite o nome ou email do aluno..."
                    value={buscaAluno}
                    onChange={(e) => setBuscaAluno(e.target.value)}
                  />
                  {loadingBuscaAlunos && (
                    <InputGroup.Text>
                      <Spinner animation="border" size="sm" />
                    </InputGroup.Text>
                  )}
                </InputGroup>
                {alunosEncontrados.length > 0 && (
                  <div className="border rounded mt-2" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {alunosEncontrados.map((aluno) => (
                      <div
                        key={aluno.id}
                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectAlunoIndividual(aluno)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{aluno.nome}</strong>
                            <br />
                            <small className="text-muted">{aluno.email}</small>
                          </div>
                          {aluno.graduacao && (
                            <Badge style={{ backgroundColor: aluno.cor_graduacao || '#6c757d' }}>
                              {aluno.graduacao}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {buscaAluno.length >= 2 && !loadingBuscaAlunos && alunosEncontrados.length === 0 && (
                  <Alert variant="warning" className="mt-2 mb-0">
                    Nenhum aluno encontrado com "{buscaAluno}"
                  </Alert>
                )}
              </>
            )}
          </Form.Group>

          {/* Dados da Presença */}
          <Form.Group className="mb-3">
            <Form.Label><strong>2. Dados da Aula</strong></Form.Label>
            <Row>
              <Col xs={12} md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Turma *</Form.Label>
                  <Form.Select
                    value={registroIndividualData.turma_id}
                    onChange={(e) => handleRegistroIndividualChange('turma_id', e.target.value)}
                    disabled={loadingTurmas}
                  >
                    <option value="">Selecione uma turma...</option>
                    {turmasList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} - {t.dia_semana} {formatTime(t.horario_inicio)}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col xs={12} md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Data da Aula *</Form.Label>
                  <Form.Control
                    type="date"
                    value={registroIndividualData.data_aula}
                    onChange={(e) => handleRegistroIndividualChange('data_aula', e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col xs={12} sm={6} md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>Horário Início *</Form.Label>
                  <Form.Control
                    type="time"
                    value={registroIndividualData.horario_inicio}
                    onChange={(e) => handleRegistroIndividualChange('horario_inicio', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>Horário Fim</Form.Label>
                  <Form.Control
                    type="time"
                    value={registroIndividualData.horario_fim}
                    onChange={(e) => handleRegistroIndividualChange('horario_fim', e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={12} md={4} className="mb-3">
                <Form.Group>
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    value={registroIndividualData.presente ? 'true' : 'false'}
                    onChange={(e) => handleRegistroIndividualChange('presente', e.target.value === 'true')}
                  >
                    <option value="true">Presente</option>
                    <option value="false">Ausente</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group>
              <Form.Label>Observações</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                placeholder="Observações sobre o registro..."
                value={registroIndividualData.observacoes}
                onChange={(e) => handleRegistroIndividualChange('observacoes', e.target.value)}
              />
            </Form.Group>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowRegistroIndividualModal(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleSubmitRegistroIndividual}
            disabled={registrandoIndividual || !selectedAlunoIndividual}
          >
            {registrandoIndividual ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-1" />
                Registrando...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-1" />
                Registrar Presença
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Frequencia;
