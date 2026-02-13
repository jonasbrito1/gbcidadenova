import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { financeiroService, studentService, planService } from '../../services/api';
import { toast } from 'react-toastify';

const MensalidadeModal = ({ show, onHide, preSelectedAluno = null, onSuccess }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAlunoNome, setSelectedAlunoNome] = useState('');
  const [selectedAlunoId, setSelectedAlunoId] = useState('');

  // Queries
  const { data: alunosData, isLoading: loadingAlunos } = useQuery(
    'alunos-financeiro',
    () => studentService.getStudents({ limit: 1000, status: 'ativo' }),
    { enabled: show }
  );

  const alunos = Array.isArray(alunosData?.data?.students) ? alunosData.data.students : [];

  const { data: planos = [] } = useQuery(
    'planos',
    () => planService.getPlans(),
    {
      select: (response) => response.data,
      enabled: show
    }
  );

  // Query para buscar mensalidades existentes do aluno (verificar duplicatas)
  const { data: mensalidadesExistentes } = useQuery(
    ['mensalidades-aluno', selectedAlunoId],
    () => financeiroService.getMensalidades({ aluno_id: selectedAlunoId }),
    {
      enabled: !!selectedAlunoId && show,
      select: (response) => response.data
    }
  );

  // Efeito para pré-selecionar aluno
  useEffect(() => {
    if (show && preSelectedAluno) {
      setSelectedAlunoNome(preSelectedAluno.nome || '');
      setSelectedAlunoId(preSelectedAluno.id || '');
    } else if (show && !preSelectedAluno) {
      setSelectedAlunoNome('');
      setSelectedAlunoId('');
    }
  }, [show, preSelectedAluno]);

  // Função de validação dos dados do formulário
  const validateFormData = (formData) => {
    const valor_base = parseFloat(formData.get('valor_base'));
    const valor_desconto = parseFloat(formData.get('valor_desconto')) || 0;
    const valor_acrescimo = parseFloat(formData.get('valor_acrescimo')) || 0;
    const data_vencimento = new Date(formData.get('data_vencimento'));
    const hoje = new Date();

    // Validar valores
    if (valor_desconto > valor_base) {
      toast.error('Desconto não pode ser maior que o valor base');
      return false;
    }

    const valor_total = valor_base - valor_desconto + valor_acrescimo;
    if (valor_total <= 0) {
      toast.error('Valor total deve ser maior que zero');
      return false;
    }

    // Validar data de vencimento (alertar se no passado)
    hoje.setHours(0, 0, 0, 0);
    data_vencimento.setHours(0, 0, 0, 0);

    if (data_vencimento < hoje) {
      const confirmar = window.confirm(
        'Data de vencimento está no passado. Deseja continuar mesmo assim?'
      );
      if (!confirmar) return false;
    }

    return true;
  };

  const handleCriarMensalidade = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Validar antes de enviar
    if (!validateFormData(formData)) {
      return;
    }

    // Verificar duplicatas
    const mesRef = parseInt(formData.get('mes_referencia'));
    const anoRef = parseInt(formData.get('ano_referencia'));
    const quantidadeMeses = parseInt(formData.get('quantidade_meses')) || 1;

    if (mensalidadesExistentes && mensalidadesExistentes.length > 0) {
      const mesesDuplicados = [];
      for (let i = 0; i < quantidadeMeses; i++) {
        let mes = mesRef + i;
        let ano = anoRef;

        while (mes > 12) {
          mes -= 12;
          ano += 1;
        }

        const jaTem = mensalidadesExistentes.some(
          m => m.mes_referencia === mes && m.ano_referencia === ano
        );

        if (jaTem) {
          const nomeMes = new Date(2024, mes - 1).toLocaleDateString('pt-BR', { month: 'long' });
          mesesDuplicados.push(`${nomeMes}/${ano}`);
        }
      }

      if (mesesDuplicados.length > 0) {
        const confirmar = window.confirm(
          `Já existem mensalidades para: ${mesesDuplicados.join(', ')}.\n\nDeseja criar mesmo assim?`
        );
        if (!confirmar) return;
      }
    }

    setIsCreating(true);
    try {
      const response = await financeiroService.createMensalidade({
        aluno_id: formData.get('aluno_id'),
        plano_id: formData.get('plano_id'),
        valor_base: formData.get('valor_base'),
        valor_desconto: formData.get('valor_desconto') || 0,
        valor_acrescimo: formData.get('valor_acrescimo') || 0,
        mes_referencia: formData.get('mes_referencia'),
        ano_referencia: formData.get('ano_referencia'),
        data_vencimento: formData.get('data_vencimento'),
        observacoes: formData.get('observacoes'),
        quantidade_meses: formData.get('quantidade_meses')
      });

      const { criadas, duplicadas } = response.data;

      if (criadas > 0) {
        let message = `${criadas} mensalidade(s) criada(s) com sucesso!`;
        if (duplicadas > 0) {
          message += ` (${duplicadas} já existia(m))`;
        }
        toast.success(message);

        // Resetar estado
        setSelectedAlunoNome('');
        setSelectedAlunoId('');

        // Callback de sucesso
        if (onSuccess) {
          onSuccess();
        }

        onHide();
      } else if (duplicadas > 0) {
        toast.warning(`Todas as ${duplicadas} mensalidade(s) já existiam para este aluno`);
        setSelectedAlunoNome('');
        setSelectedAlunoId('');
        onHide();
      } else {
        toast.error('Nenhuma mensalidade foi criada');
      }
    } catch (error) {
      console.error('Erro ao criar mensalidade:', error);
      toast.error(error.response?.data?.error || 'Erro ao criar mensalidade');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSelectedAlunoNome('');
    setSelectedAlunoId('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Nova Mensalidade</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleCriarMensalidade}>
        <Modal.Body>
          {/* Aluno e Plano */}
          <Row>
            <Col xs={12} md={7}>
              <Form.Group className="mb-3">
                <Form.Label>Aluno *</Form.Label>
                {preSelectedAluno && (
                  <div className="alert alert-info py-2 mb-2">
                    <small>
                      Aluno selecionado: <strong>{preSelectedAluno.nome}</strong>
                    </small>
                  </div>
                )}
                <div className="mb-2">
                  <Form.Control
                    type="text"
                    list="modal-alunos-list"
                    placeholder={loadingAlunos ? 'Carregando alunos...' : 'Digite ou selecione o nome do aluno...'}
                    value={selectedAlunoNome}
                    onChange={(e) => {
                      const nome = e.target.value;
                      setSelectedAlunoNome(nome);

                      const alunoEncontrado = alunos.find(a => a.nome === nome);
                      if (alunoEncontrado) {
                        setSelectedAlunoId(alunoEncontrado.id);
                      } else {
                        setSelectedAlunoId('');
                      }
                    }}
                    disabled={loadingAlunos || !!preSelectedAluno}
                    required
                    autoComplete="off"
                  />
                  <datalist id="modal-alunos-list">
                    {alunos
                      .filter(a => a.nome)
                      .sort((a, b) => a.nome.localeCompare(b.nome))
                      .map((aluno) => (
                        <option key={aluno.id} value={aluno.nome}>
                          {aluno.nome} - {aluno.status}
                        </option>
                      ))}
                  </datalist>
                  <input type="hidden" name="aluno_id" value={selectedAlunoId} required />
                </div>
                {alunos.length === 0 && !loadingAlunos && (
                  <Form.Text className="text-danger d-block mb-2">
                    Nenhum aluno ativo encontrado no sistema
                  </Form.Text>
                )}
                {!loadingAlunos && !preSelectedAluno && (
                  <Form.Text className="text-muted">
                    Total de alunos disponíveis: {alunos.length}
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
            <Col xs={12} md={5}>
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

          {/* Valores */}
          <Row>
            <Col xs={12} sm={4}>
              <Form.Group className="mb-3">
                <Form.Label>Valor Base *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="valor_base"
                  placeholder="0.00"
                  required
                />
              </Form.Group>
            </Col>
            <Col xs={6} sm={4}>
              <Form.Group className="mb-3">
                <Form.Label>Desconto</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="valor_desconto"
                  placeholder="0.00"
                  defaultValue={0}
                />
              </Form.Group>
            </Col>
            <Col xs={6} sm={4}>
              <Form.Group className="mb-3">
                <Form.Label>Acréscimo</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="valor_acrescimo"
                  placeholder="0.00"
                  defaultValue={0}
                />
              </Form.Group>
            </Col>
          </Row>

          {/* Período e Vencimento */}
          <Row>
            <Col xs={6} sm={3}>
              <Form.Group className="mb-3">
                <Form.Label>Mês *</Form.Label>
                <Form.Select name="mes_referencia" required>
                  <option value="">Mês</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Group className="mb-3">
                <Form.Label>Ano *</Form.Label>
                <Form.Select name="ano_referencia" required>
                  <option value="">Ano</option>
                  {[2024, 2025, 2026, 2027].map((ano) => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Group className="mb-3">
                <Form.Label>Vencimento *</Form.Label>
                <Form.Control type="date" name="data_vencimento" required />
              </Form.Group>
            </Col>
            <Col xs={6} sm={3}>
              <Form.Group className="mb-3">
                <Form.Label>Quantidade de Meses</Form.Label>
                <Form.Control
                  type="number"
                  name="quantidade_meses"
                  defaultValue={1}
                  min={1}
                  max={36}
                  placeholder="Meses"
                  required
                />
                <Form.Text className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Consecutivos (máx: 36)
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {/* Observações */}
          <Form.Group className="mb-3">
            <Form.Label>Observações</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="observacoes"
              placeholder="Informações adicionais sobre a mensalidade..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" disabled={isCreating}>
            {isCreating ? 'Criando...' : 'Criar Mensalidade'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default MensalidadeModal;
