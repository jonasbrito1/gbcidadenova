import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { turmaService, professorService, studentService } from '../../services/api';
import { toast } from 'react-toastify';
import { useQuery } from 'react-query';

const TurmaModal = ({ show, handleClose, turma = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    professor_id: '',
    graduacao_minima_id: '',
    graduacao_maxima_id: '',
    programa: 'Adultos',
    dia_semana: 'segunda',
    horario_inicio: '',
    horario_fim: '',
    capacidade_maxima: 30,
    status: 'ativo'
  });

  const [loading, setLoading] = useState(false);

  const { data: professores = [] } = useQuery(
    'professores-ativos',
    async () => {
      try {
        const response = await professorService.getProfessores({ status: 'ativo' });
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Erro ao carregar professores:', error);
        return [];
      }
    },
    { enabled: show }
  );

  const { data: graduacoes = [] } = useQuery(
    'graduacoes-sistema',
    async () => {
      try {
        const response = await studentService.getGraduationSystem();
        return Array.isArray(response.data) ? response.data : [];
      } catch (error) {
        console.error('Erro ao carregar graduacoes:', error);
        return [];
      }
    },
    { enabled: show }
  );

  useEffect(() => {
    if (turma) {
      setFormData({
        nome: turma.nome || '',
        professor_id: turma.professor_id || '',
        graduacao_minima_id: turma.graduacao_minima_id || '',
        graduacao_maxima_id: turma.graduacao_maxima_id || '',
        programa: turma.programa || 'Adultos',
        dia_semana: turma.dia_semana || 'segunda',
        horario_inicio: turma.horario_inicio || '',
        horario_fim: turma.horario_fim || '',
        capacidade_maxima: turma.capacidade_maxima || 30,
        status: turma.status || 'ativo'
      });
    } else {
      setFormData({
        nome: '',
        professor_id: '',
        graduacao_minima_id: '',
        graduacao_maxima_id: '',
        programa: 'Adultos',
        dia_semana: 'segunda',
        horario_inicio: '',
        horario_fim: '',
        capacidade_maxima: 30,
        status: 'ativo'
      });
    }
  }, [turma, show]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (turma) {
        await turmaService.updateTurma(turma.id, formData);
        toast.success('Turma atualizada com sucesso!');
      } else {
        await turmaService.createTurma(formData);
        toast.success('Turma criada com sucesso!');
      }
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar turma');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{turma ? 'Editar Turma' : 'Nova Turma'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Row>
            <Col md={8}>
              <Form.Group className="mb-3">
                <Form.Label>Nome da Turma <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  required
                  placeholder="Ex: GB1 - Iniciantes Manhã"
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Capacidade Máxima</Form.Label>
                <Form.Control
                  type="number"
                  name="capacidade_maxima"
                  value={formData.capacidade_maxima}
                  onChange={handleChange}
                  min="1"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Professor</Form.Label>
                <Form.Select name="professor_id" value={formData.professor_id} onChange={handleChange}>
                  <option value="">Selecione um professor...</option>
                  {professores.map((prof) => (
                    <option key={prof.id} value={prof.id}>{prof.nome}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Modalidade <span className="text-danger">*</span></Form.Label>
                <Form.Select name="programa" value={formData.programa} onChange={handleChange} required>
                  <option value="Adultos">Adultos</option>
                  <option value="Infantil">Infantil</option>
                  <option value="Juvenil">Juvenil</option>
                  <option value="Master">Master</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Dia da Semana <span className="text-danger">*</span></Form.Label>
                <Form.Select name="dia_semana" value={formData.dia_semana} onChange={handleChange} required>
                  <option value="segunda">Segunda-feira</option>
                  <option value="terca">Terça-feira</option>
                  <option value="quarta">Quarta-feira</option>
                  <option value="quinta">Quinta-feira</option>
                  <option value="sexta">Sexta-feira</option>
                  <option value="sabado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Horário Início <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="time"
                  name="horario_inicio"
                  value={formData.horario_inicio}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Horário Fim <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="time"
                  name="horario_fim"
                  value={formData.horario_fim}
                  onChange={handleChange}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Graduação Mínima</Form.Label>
                <Form.Select name="graduacao_minima_id" value={formData.graduacao_minima_id} onChange={handleChange}>
                  <option value="">Nenhuma</option>
                  {graduacoes.map((grad) => (
                    <option key={grad.id} value={grad.id}>{grad.nome}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Graduação Máxima</Form.Label>
                <Form.Select name="graduacao_maxima_id" value={formData.graduacao_maxima_id} onChange={handleChange}>
                  <option value="">Nenhuma</option>
                  {graduacoes.map((grad) => (
                    <option key={grad.id} value={grad.id}>{grad.nome}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Status</Form.Label>
            <Form.Select name="status" value={formData.status} onChange={handleChange}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Salvando...' : turma ? 'Atualizar' : 'Criar'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TurmaModal;
