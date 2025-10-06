import React from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card } from 'react-bootstrap';
import { useQuery } from 'react-query';
import { studentService } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const StudentDetails = () => {
  const { id } = useParams();

  const { data: student, isLoading } = useQuery(
    ['student', id],
    () => studentService.getStudentById(id)
  );

  if (isLoading) {
    return <LoadingSpinner text="Carregando dados do aluno..." />;
  }

  const studentData = student?.data;

  if (!studentData) {
    return <div>Aluno não encontrado</div>;
  }

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Detalhes do Aluno</h2>
          <p className="text-muted">{studentData.nome} - {studentData.matricula}</p>
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <Card className="card-dashboard mb-4">
            <Card.Body>
              <Card.Title>Informações Pessoais</Card.Title>
              <p><strong>Nome:</strong> {studentData.nome}</p>
              <p><strong>Email:</strong> {studentData.email}</p>
              <p><strong>Telefone:</strong> {studentData.telefone}</p>
              <p><strong>Data de Nascimento:</strong> {studentData.data_nascimento}</p>
              <p><strong>Endereço:</strong> {studentData.endereco}</p>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="card-dashboard mb-4">
            <Card.Body>
              <Card.Title>Informações Acadêmicas</Card.Title>
              <p><strong>Matrícula:</strong> {studentData.matricula}</p>
              <p><strong>Programa:</strong> {studentData.programa}</p>
              <p><strong>Graduação:</strong> {studentData.graduacao}</p>
              <p><strong>Graus da Faixa:</strong> {studentData.graus_faixa}</p>
              <p><strong>Data de Início:</strong> {studentData.data_inicio}</p>
              <p><strong>Status:</strong> {studentData.status}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StudentDetails;