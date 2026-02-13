import React from 'react';
import { Card, Badge, Alert } from 'react-bootstrap';
import { FaCheckCircle, FaArrowRight, FaTrophy } from 'react-icons/fa';

const GraduationHistory = ({ timelineData }) => {
  if (!timelineData || !timelineData.allBelts) {
    return (
      <Alert variant="info" className="m-3">
        <p className="mb-0">Dados de histórico não disponíveis.</p>
      </Alert>
    );
  }

  // Filter only completed graduations (with achievement dates)
  const completedGraduations = timelineData.allBelts
    .filter(belt => belt.status === 'completed' && belt.achievedDate)
    .sort((a, b) => new Date(b.achievedDate) - new Date(a.achievedDate)); // Most recent first

  if (completedGraduations.length === 0) {
    return (
      <div className="graduation-history p-3 p-md-4">
        <Alert variant="info" className="text-center py-4">
          <FaTrophy size={48} className="text-muted mb-3" />
          <h5>Nenhuma Graduação Registrada</h5>
          <p className="text-muted mb-0">
            Suas graduações futuras aparecerão aqui quando forem concluídas.
          </p>
        </Alert>
      </div>
    );
  }

  // Helper function to format date in Portuguese
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  // Helper function to calculate time since graduation
  const getTimeSince = (dateString) => {
    const graduationDate = new Date(dateString);
    const today = new Date();
    const diffMs = today - graduationDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffMonths / 12);

    if (diffYears > 0) {
      return `Há ${diffYears} ano${diffYears > 1 ? 's' : ''}`;
    } else if (diffMonths > 0) {
      return `Há ${diffMonths} ${diffMonths > 1 ? 'meses' : 'mês'}`;
    } else if (diffDays > 0) {
      return `Há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else {
      return 'Hoje';
    }
  };

  return (
    <div className="graduation-history p-3 p-md-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h5 className="mb-1">Histórico de Graduações</h5>
          <p className="text-muted small mb-0">
            Total de {completedGraduations.length} graduação{completedGraduations.length > 1 ? 'ões' : ''} concluída{completedGraduations.length > 1 ? 's' : ''}
          </p>
        </div>
        <FaTrophy size={32} className="text-warning" />
      </div>

      <div className="history-timeline">
        {completedGraduations.map((graduation, index) => {
          // Find previous belt (if exists)
          const previousBelt = timelineData.allBelts.find(
            b => b.order === graduation.order - 1
          );

          return (
            <Card key={graduation.id} className="history-item mb-3">
              <Card.Body>
                <div className="d-flex align-items-start gap-3">
                  {/* Timeline Indicator */}
                  <div className="timeline-indicator">
                    <div className="timeline-dot">
                      <FaCheckCircle className="text-success" />
                    </div>
                    {index < completedGraduations.length - 1 && (
                      <div className="timeline-line" />
                    )}
                  </div>

                  {/* Graduation Content */}
                  <div className="flex-grow-1">
                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                      {/* Previous Belt (if exists) */}
                      {previousBelt && (
                        <>
                          <div
                            className="belt-badge"
                            style={{
                              backgroundColor: previousBelt.color,
                              color: previousBelt.color === '#FFFFFF' ? '#000' : '#FFF'
                            }}
                          >
                            {previousBelt.name}
                          </div>
                          <FaArrowRight className="text-muted" />
                        </>
                      )}

                      {/* Current Belt */}
                      <div
                        className="belt-badge highlight"
                        style={{
                          backgroundColor: graduation.color,
                          color: graduation.color === '#FFFFFF' ? '#000' : '#FFF'
                        }}
                      >
                        {graduation.name}
                      </div>

                      <Badge bg="success" pill>Concluída</Badge>
                    </div>

                    <div className="graduation-info">
                      <div className="info-row">
                        <span className="info-label">Data:</span>
                        <span className="info-value">{formatDate(graduation.achievedDate)}</span>
                      </div>
                      <div className="info-row">
                        <span className="info-label">Tempo decorrido:</span>
                        <span className="info-value text-muted">{getTimeSince(graduation.achievedDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Stats Card */}
      <Card className="stats-card mt-4">
        <Card.Body>
          <h6 className="mb-3">Estatísticas</h6>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{completedGraduations.length}</div>
              <div className="stat-label">Graduações</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {completedGraduations.length > 0
                  ? getTimeSince(completedGraduations[0].achievedDate)
                  : 'N/A'}
              </div>
              <div className="stat-label">Última Graduação</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">
                {timelineData.allBelts.find(b => b.status === 'current')?.name || 'N/A'}
              </div>
              <div className="stat-label">Faixa Atual</div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default GraduationHistory;
