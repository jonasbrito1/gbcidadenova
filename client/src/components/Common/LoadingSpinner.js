import React from 'react';
import { Spinner, Container } from 'react-bootstrap';

const LoadingSpinner = ({ size = 'lg', text = 'Carregando...' }) => {
  return (
    <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <div className="text-center">
        <Spinner animation="border" variant="danger" size={size} className="mb-3" />
        <div className="text-muted">{text}</div>
      </div>
    </Container>
  );
};

export default LoadingSpinner;