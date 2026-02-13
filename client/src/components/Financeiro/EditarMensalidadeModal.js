import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { financeiroService } from '../../services/api';
import { toast } from 'react-toastify';

const EditarMensalidadeModal = ({ show, onHide, mensalidade, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    mes_referencia: '',
    ano_referencia: '',
    data_vencimento: '',
    valor_base: '',
    valor_desconto: '0',
    valor_acrescimo: '0',
    observacoes: ''
  });

  // Preencher formulário quando mensalidade mudar
  useEffect(() => {
    if (mensalidade && show) {
      setFormData({
        mes_referencia: mensalidade.mes_referencia || '',
        ano_referencia: mensalidade.ano_referencia || '',
        data_vencimento: mensalidade.data_vencimento ?
          new Date(mensalidade.data_vencimento).toISOString().split('T')[0] : '',
        valor_base: mensalidade.valor_base || '',
        valor_desconto: mensalidade.valor_desconto || '0',
        valor_acrescimo: mensalidade.valor_acrescimo || '0',
        observacoes: mensalidade.observacoes || ''
      });
    }
  }, [mensalidade, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calcularValorTotal = () => {
    const base = parseFloat(formData.valor_base) || 0;
    const desconto = parseFloat(formData.valor_desconto) || 0;
    const acrescimo = parseFloat(formData.valor_acrescimo) || 0;
    return base - desconto + acrescimo;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const valorTotal = calcularValorTotal();

      if (valorTotal <= 0) {
        toast.error('Valor total deve ser maior que zero');
        setLoading(false);
        return;
      }

      await financeiroService.editarMensalidade(mensalidade.id, formData);

      toast.success('Mensalidade atualizada com sucesso!');
      onSuccess();
      onHide();
    } catch (error) {
      console.error('Erro ao editar mensalidade:', error);
      toast.error(error.response?.data?.error || 'Erro ao editar mensalidade');
    } finally {
      setLoading(false);
    }
  };

  const valorTotal = calcularValorTotal();

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Editar Mensalidade</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {mensalidade && (
            <>
              <Alert variant="info" className="mb-3">
                <strong>Aluno:</strong> {mensalidade.aluno_nome}
                <br />
                <strong>Plano:</strong> {mensalidade.plano_nome || 'Sem plano'}
              </Alert>

              <Row>
                <Col xs={6} sm={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Mês de Referência *</Form.Label>
                    <Form.Select
                      name="mes_referencia"
                      value={formData.mes_referencia}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione...</option>
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={6} sm={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Ano de Referência *</Form.Label>
                    <Form.Select
                      name="ano_referencia"
                      value={formData.ano_referencia}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Selecione...</option>
                      {[2024, 2025, 2026, 2027, 2028].map((ano) => (
                        <option key={ano} value={ano}>{ano}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col xs={12} sm={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Data de Vencimento *</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_vencimento"
                      value={formData.data_vencimento}
                      onChange={handleChange}
                      required
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Valor Base *</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="valor_base"
                      value={formData.valor_base}
                      onChange={handleChange}
                      placeholder="0.00"
                      required
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Desconto</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="valor_desconto"
                      value={formData.valor_desconto}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Acréscimo</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      name="valor_acrescimo"
                      value={formData.valor_acrescimo}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </Form.Group>
                </Col>

                <Col xs={12} sm={6} md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label>Valor Total</Form.Label>
                    <Form.Control
                      type="text"
                      value={valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      disabled
                      style={{
                        fontWeight: 'bold',
                        backgroundColor: valorTotal <= 0 ? '#ffe6e6' : '#e6ffe6'
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Observações</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="observacoes"
                      value={formData.observacoes}
                      onChange={handleChange}
                      placeholder="Observações adicionais sobre esta mensalidade..."
                    />
                  </Form.Group>
                </Col>
              </Row>

              {valorTotal <= 0 && (
                <Alert variant="danger">
                  <strong>⚠️ Atenção:</strong> O valor total deve ser maior que zero!
                </Alert>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={loading || valorTotal <= 0}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditarMensalidadeModal;
