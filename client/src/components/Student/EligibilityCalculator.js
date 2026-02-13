import React from 'react';
import { Card, Alert, Badge, ProgressBar } from 'react-bootstrap';
import { FaCalendarAlt, FaChartLine, FaCheckCircle, FaLightbulb, FaFire } from 'react-icons/fa';

const EligibilityCalculator = ({ eligibilityData, projectionData }) => {
  if (!projectionData) {
    return (
      <Alert variant="info" className="m-3">
        <p className="mb-0">Dados de projeção não disponíveis.</p>
      </Alert>
    );
  }

  const { eligible, estimatedEligibilityDate, nextBelt } = eligibilityData;
  const { projectedDate, confidence, assumptions, suggestions } = projectionData;

  // Helper function to format date in Portuguese
  const formatDate = (dateString) => {
    if (!dateString) return 'Data não disponível';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Helper function to get confidence badge variant
  const getConfidenceBadge = (confidenceLevel) => {
    switch (confidenceLevel) {
      case 'high':
        return { variant: 'success', label: 'Alta', icon: <FaCheckCircle /> };
      case 'medium':
        return { variant: 'warning', label: 'Média', icon: <FaChartLine /> };
      case 'low':
        return { variant: 'danger', label: 'Baixa', icon: <FaFire /> };
      default:
        return { variant: 'secondary', label: 'N/A', icon: null };
    }
  };

  const confidenceBadge = getConfidenceBadge(confidence);

  // Helper function to calculate days until projection
  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffMs = targetDate - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilEligibility = getDaysUntil(projectedDate);
  const monthsUntilEligibility = daysUntilEligibility ? Math.ceil(daysUntilEligibility / 30) : null;

  return (
    <div className="eligibility-calculator p-3 p-md-4">
      {/* Already Eligible Alert */}
      {eligible ? (
        <Alert variant="success" className="text-center py-4">
          <FaCheckCircle size={48} className="mb-3" />
          <h4 className="mb-2">Você já está elegível!</h4>
          <p className="mb-3">
            Você cumpriu todos os requisitos para a faixa {nextBelt.name}.
          </p>
          <p className="text-muted mb-0">
            Converse com seu professor sobre sua próxima graduação.
          </p>
        </Alert>
      ) : (
        <>
          {/* Projection Card */}
          <Card className="projection-card mb-4">
            <Card.Body className="text-center py-4">
              <FaCalendarAlt size={40} className="text-danger mb-3" />
              <h5 className="mb-3">Projeção de Elegibilidade</h5>

              {projectedDate ? (
                <>
                  <div className="projected-date mb-3">
                    <div className="date-label text-muted small">
                      Você estará elegível aproximadamente em:
                    </div>
                    <div className="date-value display-6 text-danger fw-bold">
                      {formatDate(projectedDate)}
                    </div>
                    <div className="date-countdown mt-2">
                      <Badge bg="light" text="dark" className="px-3 py-2">
                        {daysUntilEligibility > 0
                          ? `Em ${monthsUntilEligibility} ${monthsUntilEligibility === 1 ? 'mês' : 'meses'} (${daysUntilEligibility} dias)`
                          : 'Prazo atingido'}
                      </Badge>
                    </div>
                  </div>

                  <div className="confidence-section mt-4">
                    <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                      <span className="text-muted small">Nível de Confiança:</span>
                      <Badge bg={confidenceBadge.variant} className="px-3">
                        {confidenceBadge.icon}
                        <span className="ms-1">{confidenceBadge.label}</span>
                      </Badge>
                    </div>

                    {/* Confidence Explanation */}
                    {confidence === 'high' && (
                      <small className="text-muted">
                        Baseado em sua frequência consistente e ritmo de treino atual
                      </small>
                    )}
                    {confidence === 'medium' && (
                      <small className="text-muted">
                        Mantenha ou melhore seu ritmo de treino para garantir esta projeção
                      </small>
                    )}
                    {confidence === 'low' && (
                      <small className="text-muted">
                        Aumente sua frequência de treino para acelerar seu progresso
                      </small>
                    )}
                  </div>
                </>
              ) : (
                <Alert variant="warning" className="mb-0">
                  <p className="mb-0">{projectionData.message || 'Dados insuficientes para projeção'}</p>
                </Alert>
              )}
            </Card.Body>
          </Card>

          {/* Assumptions Card */}
          {assumptions && (
            <Card className="assumptions-card mb-4">
              <Card.Header className="bg-light">
                <div className="d-flex align-items-center gap-2">
                  <FaChartLine className="text-danger" />
                  <strong>Premissas do Cálculo</strong>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="assumptions-grid">
                  <div className="assumption-item">
                    <div className="assumption-label">Aulas por Semana</div>
                    <div className="assumption-value">{assumptions.averageClassesPerWeek.toFixed(1)}</div>
                  </div>
                  <div className="assumption-item">
                    <div className="assumption-label">Taxa de Presença</div>
                    <div className="assumption-value">{assumptions.currentAttendanceRate.toFixed(1)}%</div>
                  </div>
                  <div className="assumption-item">
                    <div className="assumption-label">Meses na Faixa</div>
                    <div className="assumption-value">{assumptions.monthsSinceLastGraduation}</div>
                  </div>
                  <div className="assumption-item">
                    <div className="assumption-label">Mínimo Necessário</div>
                    <div className="assumption-value">{assumptions.minimumMonthsRequired} meses</div>
                  </div>
                </div>

                {/* Progress to minimum time */}
                {assumptions.monthsSinceLastGraduation !== undefined &&
                  assumptions.minimumMonthsRequired !== undefined && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">Progresso de Tempo</small>
                      <small className="fw-bold">
                        {Math.min(
                          Math.round(
                            (assumptions.monthsSinceLastGraduation / assumptions.minimumMonthsRequired) * 100
                          ),
                          100
                        )}%
                      </small>
                    </div>
                    <ProgressBar
                      now={Math.min(
                        (assumptions.monthsSinceLastGraduation / assumptions.minimumMonthsRequired) * 100,
                        100
                      )}
                      variant={
                        assumptions.monthsSinceLastGraduation >= assumptions.minimumMonthsRequired
                          ? 'success'
                          : 'warning'
                      }
                    />
                  </div>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Suggestions Card */}
          {suggestions && suggestions.length > 0 && (
            <Card className="suggestions-card">
              <Card.Header className="bg-light">
                <div className="d-flex align-items-center gap-2">
                  <FaLightbulb className="text-warning" />
                  <strong>Dicas para Acelerar seu Progresso</strong>
                </div>
              </Card.Header>
              <Card.Body>
                <ul className="suggestions-list mb-0">
                  {suggestions.map((suggestion, index) => (
                    <li key={index} className="suggestion-item">
                      <FaFire className="text-danger me-2" />
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Motivation Card */}
      <Card className="motivation-card mt-4">
        <Card.Body className="text-center py-4">
          <FaFire size={32} className="text-warning mb-2" />
          <h6 className="mb-2">Continue Treinando!</h6>
          <p className="text-muted small mb-0">
            Cada treino te aproxima da sua próxima conquista. A consistência é a chave do sucesso no Jiu-Jitsu.
          </p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EligibilityCalculator;
