import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Meu Perfil</h2>
          <p className="text-muted">Visualizar e editar informações pessoais</p>
        </Col>
      </Row>

      <Row>
        <Col lg={6}>
          <Card className="card-dashboard">
            <Card.Body>
              <Card.Title>Informações Pessoais</Card.Title>
              <p><strong>Nome:</strong> {user?.nome}</p>
              <p><strong>Email:</strong> {user?.email}</p>
              <p><strong>Tipo de Usuário:</strong> {user?.tipo_usuario}</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Profile;