import React from 'react';
import { Card, ProgressBar, Alert, Badge } from 'react-bootstrap';
import { FaClock, FaBook, FaChartLine, FaCheckCircle, FaClock as FaHourglass } from 'react-icons/fa';

const RequirementsChecklist = ({ eligibilityData }) => {
  if (!eligibilityData || !eligibilityData.nextBelt) {
    return (
      <Alert variant="info" className="m-3">
        <p className="mb-0">Você já está na graduação máxima!</p>
      </Alert>
    );
  }

  const { currentBelt, nextBelt, progress, eligible } = eligibilityData;

  // Helper function to get variant color based on percentage
  const getVariant = (percentage) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 70) return 'warning';
    return 'danger';
  };

  // Helper function to get icon for requirement
  const getRequirementIcon = (percentage) => {
    if (percentage >= 100) return <FaCheckCircle className="text-success" />;
    return <FaHourglass className="text-warning" />;
  };

  const requirements = [
    {
      icon: <FaClock size={32} />,
      title: 'Tempo na Faixa',
      current: progress.time.current,
      required: progress.time.required,
      unit: 'meses',
      percentage: progress.time.percentage,
      description: `Você está há ${progress.time.current} meses na faixa ${currentBelt.name}`
    },
    {
      icon: <FaBook size={32} />,
      title: 'Aulas Presentes',
      current: progress.classes.current,
      required: progress.classes.required,
      unit: 'aulas',
      percentage: progress.classes.percentage,
      description: `Você completou ${progress.classes.current} de ${progress.classes.required} aulas necessárias`
    },
    {
      icon: <FaChartLine size={32} />,
      title: 'Frequência',
      current: progress.attendance.current.toFixed(1),
      required: progress.attendance.required,
      unit: '%',
      percentage: progress.attendance.percentage,
      description: `Sua taxa de presença é de ${progress.attendance.current.toFixed(1)}%`
    }
  ];

  return (
    <div className="requirements-checklist p-3 p-md-4">
      {/* Overall Status */}
      <Card className={`status-card mb-4 ${eligible ? 'eligible' : 'not-eligible'}`}>
        <Card.Body className="text-center py-4">
          {eligible ? (
            <>
              <FaCheckCircle size={48} className="text-success mb-3" />
              <h4 className="text-success mb-2">Elegível para Graduação!</h4>
              <p className="text-muted mb-0">
                Você cumpriu todos os requisitos para a faixa {nextBelt.name}
              </p>
            </>
          ) : (
            <>
              <FaHourglass size={48} className="text-warning mb-3" />
              <h4 className="text-warning mb-2">Em Progresso</h4>
              <p className="text-muted mb-0">
                Continue treinando para alcançar a faixa {nextBelt.name}
              </p>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Requirements Cards */}
      <h6 className="section-subtitle mb-3">Requisitos para Faixa {nextBelt.name}</h6>
      <div className="requirements-grid">
        {requirements.map((req, index) => (
          <Card key={index} className="requirement-card">
            <Card.Body>
              <div className="d-flex align-items-start gap-3 mb-3">
                <div className="requirement-icon text-danger">
                  {req.icon}
                </div>
                <div className="flex-grow-1">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">{req.title}</h6>
                    {getRequirementIcon(req.percentage)}
                  </div>
                  <p className="text-muted small mb-0">{req.description}</p>
                </div>
              </div>

              <div className="mb-2">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="text-muted small">Progresso</span>
                  <Badge bg={getVariant(req.percentage)}>
                    {req.percentage}%
                  </Badge>
                </div>
                <ProgressBar
                  now={req.percentage}
                  variant={getVariant(req.percentage)}
                  className="requirement-progress"
                />
              </div>

              <div className="requirement-values text-center mt-2">
                <span className="current-value">{req.current}</span>
                <span className="separator"> / </span>
                <span className="required-value">{req.required}</span>
                <span className="unit text-muted"> {req.unit}</span>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      {/* Progress Summary */}
      <Card className="mt-4 summary-card">
        <Card.Body>
          <h6 className="mb-3">Resumo Geral</h6>
          <div className="summary-items">
            <div className="summary-item">
              <span className="label">Faixa Atual:</span>
              <div className="value">
                <div
                  className="belt-indicator me-2"
                  style={{ backgroundColor: currentBelt.color }}
                />
                <strong>{currentBelt.name}</strong>
              </div>
            </div>
            <div className="summary-item">
              <span className="label">Próxima Faixa:</span>
              <div className="value">
                <div
                  className="belt-indicator me-2"
                  style={{ backgroundColor: nextBelt.color }}
                />
                <strong>{nextBelt.name}</strong>
              </div>
            </div>
            <div className="summary-item">
              <span className="label">Status:</span>
              <Badge bg={eligible ? 'success' : 'warning'} className="px-3">
                {eligible ? 'Elegível' : 'Em Progresso'}
              </Badge>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Tips when not eligible */}
      {!eligible && (
        <Alert variant="info" className="mt-4">
          <Alert.Heading className="h6">
            <FaChartLine className="me-2" />
            Dicas para acelerar seu progresso
          </Alert.Heading>
          <ul className="mb-0 ps-3">
            {progress.time.percentage < 100 && (
              <li>Continue treinando consistentemente - faltam {progress.time.required - progress.time.current} meses</li>
            )}
            {progress.classes.percentage < 100 && (
              <li>Participe de mais aulas - faltam {progress.classes.required - progress.classes.current} aulas presentes</li>
            )}
            {progress.attendance.percentage < 100 && (
              <li>Melhore sua taxa de presença - meta: {progress.attendance.required}%</li>
            )}
          </ul>
        </Alert>
      )}
    </div>
  );
};

export default RequirementsChecklist;
