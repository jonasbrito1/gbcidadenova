import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const Attendance = () => {
  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Frequência</h2>
          <p className="text-muted">Controle de presença dos alunos</p>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              <p>Página de frequência em desenvolvimento...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Attendance;