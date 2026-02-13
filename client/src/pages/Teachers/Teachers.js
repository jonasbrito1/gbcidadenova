import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const Teachers = () => {
  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Professores</h2>
          <p className="text-muted">Gerenciar professores da academia</p>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              <p>Página de professores em desenvolvimento...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Teachers;