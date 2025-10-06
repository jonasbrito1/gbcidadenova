import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { turmaService, studentService } from '../../services/api';
import { FaArrowLeft, FaUserPlus, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

const TurmaDetalhes = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAddAluno, setShowAddAluno] = useState(false);
  const [selectedAluno, setSelectedAluno] = useState('');

  const { data: turma, isLoading, refetch } = useQuery(
    ['turma', id],
    () => turmaService.getTurmaById(id),
    { select: (response) => response.data }
  );

  const { data: alunosTurma = [], refetch: refetchAlunos } = useQuery(
    ['turma-alunos', id],
    () => turmaService.getTurmaAlunos(id),
    { select: (response) => response.data }
  );

  const { data: todosAlunos = [] } = useQuery(
    'alunos-ativos',
    () => studentService.getStudents({ status: 'ativo' }),
    {
      select: (response) => response.data,
      enabled: showAddAluno
    }
  );

  const handleAddAluno = async () => {
    if (!selectedAluno) {
      toast.error('Selecione um aluno');
      return;
    }

    try {
      await turmaService.addAlunoTurma(id, { aluno_id: selectedAluno });
      toast.success('Aluno adicionado com sucesso!');
      setShowAddAluno(false);
      setSelectedAluno('');
      refetchAlunos();
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar aluno');
    }
  };

  const handleRemoveAluno = async (alunoId, alunoNome) => {
    if (window.confirm(`Remover ${alunoNome} da turma?`)) {
      try {
        await turmaService.removeAlunoTurma(id, alunoId);
        toast.success('Aluno removido com sucesso!');
        refetchAlunos();
        refetch();
      } catch (error) {
        toast.error('Erro ao remover aluno');
      }
    }
  };

  if (isLoading) {
    return (
      <Container className="text-center py-5">
        <div className="spinner-border text-danger" role="status" />
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <Button variant="outline-secondary" onClick={() => navigate('/app/turmas')}>
            <FaArrowLeft className="me-2" />Voltar
          </Button>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row>
                <Col md={8}>
                  <h3 className="text-danger">{turma?.nome}</h3>
                  <p className="mb-2">
                    <strong>Professor:</strong> {turma?.professor_nome || 'Não definido'}
                  </p>
                  <p className="mb-2">
                    <Badge bg="primary">{turma?.programa}</Badge>
                    <Badge bg="secondary" className="ms-2 text-capitalize">{turma?.dia_semana}</Badge>
                    <Badge bg="info" className="ms-2">
                      {turma?.horario_inicio} - {turma?.horario_fim}
                    </Badge>
                  </p>
                </Col>
                <Col md={4} className="text-end">
                  <h4 className="text-danger">{turma?.total_alunos || 0}/{turma?.capacidade_maxima}</h4>
                  <small className="text-muted">Alunos matriculados</small>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Alunos da Turma</h5>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowAddAluno(true)}
                disabled={(turma?.total_alunos || 0) >= (turma?.capacidade_maxima || 0)}
              >
                <FaUserPlus className="me-2" />
                Adicionar Aluno
              </Button>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Graduação</th>
                    <th>Data Matrícula</th>
                    <th>Status</th>
                    <th className="text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {alunosTurma.map((aluno) => (
                    <tr key={aluno.id}>
                      <td>{aluno.nome}</td>
                      <td>{aluno.email}</td>
                      <td>
                        <Badge bg="secondary" style={{ backgroundColor: aluno.cor_graduacao }}>
                          {aluno.graduacao || 'Não definida'}
                        </Badge>
                      </td>
                      <td>{new Date(aluno.data_matricula).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <Badge bg={aluno.status_matricula === 'ativo' ? 'success' : 'secondary'}>
                          {aluno.status_matricula}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemoveAluno(aluno.id, aluno.nome)}
                        >
                          <FaTrash />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              {alunosTurma.length === 0 && (
                <p className="text-center text-muted py-4">Nenhum aluno matriculado</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Modal show={showAddAluno} onHide={() => setShowAddAluno(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Adicionar Aluno</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Selecione o Aluno</Form.Label>
            <Form.Select
              value={selectedAluno}
              onChange={(e) => setSelectedAluno(e.target.value)}
            >
              <option value="">Escolha um aluno...</option>
              {todosAlunos
                .filter(a => !alunosTurma.find(at => at.id === a.id))
                .map((aluno) => (
                  <option key={aluno.id} value={aluno.id}>
                    {aluno.nome} - {aluno.email}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddAluno(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleAddAluno}>
            Adicionar
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TurmaDetalhes;
