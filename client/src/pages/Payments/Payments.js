import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const Payments = () => {
  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Pagamentos</h2>
          <p className="text-muted">Gerenciar mensalidades e pagamentos</p>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              <p>Página de pagamentos em desenvolvimento...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Payments;