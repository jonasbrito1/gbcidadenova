import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';

const Reports = () => {
  return (
    <div>
      <Row className="mb-4">
        <Col>
          <h2>Relatórios</h2>
          <p className="text-muted">Relatórios e estatísticas da academia</p>
        </Col>
      </Row>

      <Row>
        <Col>
          <Card className="card-dashboard">
            <Card.Body>
              <p>Página de relatórios em desenvolvimento...</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;