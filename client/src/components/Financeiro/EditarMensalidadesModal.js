import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Card } from 'react-bootstrap';
import { financeiroService } from '../../services/api';
import { toast } from 'react-toastify';

const EditarMensalidadesModal = ({ show, onHide, mensalidadesIds, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [camposParaEditar, setCamposParaEditar] = useState({
    mes_referencia: false,
    ano_referencia: false,
    data_vencimento: false,
    valor_base: false,
    valor_desconto: false,
    valor_acrescimo: false
  });

  const [formData, setFormData] = useState({
    mes_referencia: '',
    ano_referencia: '',
    data_vencimento: '',
    valor_base: '',
    valor_desconto: '',
    valor_acrescimo: ''
  });

  const handleToggleCampo = (campo) => {
    setCamposParaEditar(prev => ({
      ...prev,
      [campo]: !prev[campo]
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Verificar se pelo menos um campo foi selecionado
      const algumCampoSelecionado = Object.values(camposParaEditar).some(v => v);
      if (!algumCampoSelecionado) {
        toast.warning('Selecione pelo menos um campo para editar');
        setLoading(false);
        return;
      }

      // Preparar apenas os campos selecionados
      const campos = {};
      Object.keys(camposParaEditar).forEach(campo => {
        if (camposParaEditar[campo] && formData[campo] !== '') {
          campos[campo] = formData[campo];
        }
      });

      if (Object.keys(campos).length === 0) {
        toast.warning('Preencha pelo menos um campo selecionado');
        setLoading(false);
        return;
      }

      const response = await financeiroService.bulkEditMensalidades({
        ids: mensalidadesIds,
        campos
      });

      if (response.data.processados > 0) {
        toast.success(
          `${response.data.processados} mensalidade(s) editada(s) com sucesso!` +
          (response.data.erros > 0 ? ` (${response.data.erros} erro(s))` : '')
        );
      } else {
        toast.error('Nenhuma mensalidade foi editada');
      }

      onSuccess();
      onHide();
    } catch (error) {
      console.error('Erro ao editar mensalidades em massa:', error);
      toast.error(error.response?.data?.error || 'Erro ao editar mensalidades em massa');
    } finally {
      setLoading(false);
    }
  };

  const calcularValorTotal = () => {
    const base = parseFloat(formData.valor_base) || 0;
    const desconto = parseFloat(formData.valor_desconto) || 0;
    const acrescimo = parseFloat(formData.valor_acrescimo) || 0;

    if (camposParaEditar.valor_base || camposParaEditar.valor_desconto || camposParaEditar.valor_acrescimo) {
      return base - desconto + acrescimo;
    }
    return null;
  };

  const valorTotal = calcularValorTotal();

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Mensalidades em Massa</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <strong>📝 {mensalidadesIds.length}</strong> mensalidade(s) selecionada(s)
            <br />
            <small>Marque os campos que deseja alterar e preencha os novos valores.</small>
          </Alert>

          {/* Mês e Ano de Referência */}
          <Card className="mb-3">
            <Card.Header className="bg-light">
              <strong>Período de Referência</strong>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Alterar Mês"
                      checked={camposParaEditar.mes_referencia}
                      onChange={() => handleToggleCampo('mes_referencia')}
                    />
                    {camposParaEditar.mes_referencia && (
                      <Form.Select
                        name="mes_referencia"
                        value={formData.mes_referencia}
                        onChange={handleChange}
                        className="mt-2"
                        required
                      >
                        <option value="">Selecione...</option>
                        {Array.from({ length: 12 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>

                <Col xs={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Alterar Ano"
                      checked={camposParaEditar.ano_referencia}
                      onChange={() => handleToggleCampo('ano_referencia')}
                    />
                    {camposParaEditar.ano_referencia && (
                      <Form.Select
                        name="ano_referencia"
                        value={formData.ano_referencia}
                        onChange={handleChange}
                        className="mt-2"
                        required
                      >
                        <option value="">Selecione...</option>
                        {[2024, 2025, 2026, 2027, 2028].map((ano) => (
                          <option key={ano} value={ano}>{ano}</option>
                        ))}
                      </Form.Select>
                    )}
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Data de Vencimento */}
          <Card className="mb-3">
            <Card.Header className="bg-light">
              <strong>Vencimento</strong>
            </Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Check
                  type="checkbox"
                  label="Alterar Data de Vencimento"
                  checked={camposParaEditar.data_vencimento}
                  onChange={() => handleToggleCampo('data_vencimento')}
                />
                {camposParaEditar.data_vencimento && (
                  <Form.Control
                    type="date"
                    name="data_vencimento"
                    value={formData.data_vencimento}
                    onChange={handleChange}
                    className="mt-2"
                    required
                  />
                )}
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Valores */}
          <Card className="mb-3">
            <Card.Header className="bg-light">
              <strong>Valores</strong>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col xs={12} md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Alterar Valor Base"
                      checked={camposParaEditar.valor_base}
                      onChange={() => handleToggleCampo('valor_base')}
                    />
                    {camposParaEditar.valor_base && (
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="valor_base"
                        value={formData.valor_base}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="mt-2"
                        required
                      />
                    )}
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Alterar Desconto"
                      checked={camposParaEditar.valor_desconto}
                      onChange={() => handleToggleCampo('valor_desconto')}
                    />
                    {camposParaEditar.valor_desconto && (
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="valor_desconto"
                        value={formData.valor_desconto}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="mt-2"
                      />
                    )}
                  </Form.Group>
                </Col>

                <Col xs={12} md={4}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Alterar Acréscimo"
                      checked={camposParaEditar.valor_acrescimo}
                      onChange={() => handleToggleCampo('valor_acrescimo')}
                    />
                    {camposParaEditar.valor_acrescimo && (
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="valor_acrescimo"
                        value={formData.valor_acrescimo}
                        onChange={handleChange}
                        placeholder="0.00"
                        className="mt-2"
                      />
                    )}
                  </Form.Group>
                </Col>
              </Row>

              {valorTotal !== null && (
                <Alert variant={valorTotal > 0 ? 'success' : 'danger'} className="mb-0">
                  <strong>Valor Total Resultante:</strong>{' '}
                  {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  {valorTotal <= 0 && (
                    <div className="mt-2">
                      <small>⚠️ O valor total deve ser maior que zero!</small>
                    </div>
                  )}
                </Alert>
              )}
            </Card.Body>
          </Card>

          <Alert variant="warning" className="mb-0">
            <strong>⚠️ Atenção:</strong> As alterações serão aplicadas a <strong>todas as {mensalidadesIds.length} mensalidades selecionadas</strong>.
            Verifique os dados antes de confirmar.
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || (valorTotal !== null && valorTotal <= 0)}
          >
            {loading ? 'Salvando...' : `Salvar Alterações (${mensalidadesIds.length})`}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditarMensalidadesModal;
