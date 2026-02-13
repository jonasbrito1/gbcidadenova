import React, { useEffect, useRef } from 'react';
import { ProgressBar, Badge } from 'react-bootstrap';
import { FaCheckCircle, FaLock, FaClock, FaTrophy } from 'react-icons/fa';

const BeltProgressTimeline = ({ timelineData, currentBelt }) => {
  const currentBeltRef = useRef(null);

  useEffect(() => {
    // Auto-scroll to current belt on load
    if (currentBeltRef.current) {
      currentBeltRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, []);

  if (!timelineData || !timelineData.allBelts) {
    return (
      <div className="belt-timeline p-3 text-center text-muted">
        <p>Dados de timeline não disponíveis.</p>
      </div>
    );
  }

  const { allBelts } = timelineData;

  // Helper function to get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <FaCheckCircle className="status-icon completed" />;
      case 'current':
        return <FaTrophy className="status-icon current" />;
      case 'next':
        return <FaClock className="status-icon next" />;
      case 'future':
        return <FaLock className="status-icon future" />;
      default:
        return null;
    }
  };

  // Helper function to get status label
  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'current':
        return 'Atual';
      case 'next':
        return 'Próxima';
      case 'future':
        return 'Futura';
      default:
        return '';
    }
  };

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'current':
        return 'danger';
      case 'next':
        return 'warning';
      case 'future':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="belt-timeline-container p-3 p-md-4">
      <div className="timeline-header mb-4 text-center">
        <h5 className="mb-1">Progressão de Faixas</h5>
        <p className="text-muted small mb-0">
          Acompanhe sua jornada no Jiu-Jitsu
        </p>
      </div>

      <div className="belt-timeline">
        {allBelts.map((belt, index) => {
          const isCurrentBelt = belt.status === 'current';
          const isCompleted = belt.status === 'completed';
          const isNext = belt.status === 'next';
          const isFuture = belt.status === 'future';

          // Determine text color based on belt background color
          const textColor = belt.color === '#FFFFFF' || belt.color === '#FFD700' || belt.color === '#FFA500'
            ? '#000'
            : '#FFF';

          return (
            <div
              key={belt.id}
              ref={isCurrentBelt ? currentBeltRef : null}
              className={`belt-item ${belt.status} ${isCurrentBelt ? 'pulse-animation' : ''}`}
            >
              {/* Timeline Connector */}
              {index < allBelts.length - 1 && (
                <div className="timeline-connector" />
              )}

              {/* Belt Card */}
              <div className="belt-card">
                <div
                  className="belt-color-bar"
                  style={{
                    backgroundColor: belt.color,
                    color: textColor,
                    opacity: isFuture ? 0.5 : 1
                  }}
                >
                  <div className="belt-header">
                    <div className="belt-name">
                      {belt.name}
                    </div>
                    <div className="belt-status-icon">
                      {getStatusIcon(belt.status)}
                    </div>
                  </div>

                  {/* Belt Degrees/Stripes Indicator (for white/colored belts) */}
                  {isCurrentBelt && belt.order > 0 && belt.order < 8 && (
                    <div className="belt-degrees">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="degree-indicator"
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="belt-info">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Badge bg={getStatusBadgeVariant(belt.status)} pill>
                      {getStatusLabel(belt.status)}
                    </Badge>

                    {belt.achievedDate && (
                      <span className="text-muted small">
                        {formatDate(belt.achievedDate)}
                      </span>
                    )}
                  </div>

                  {/* Current Belt - Show time in belt */}
                  {isCurrentBelt && belt.timeInBelt !== undefined && (
                    <div className="belt-detail">
                      <FaClock className="me-1" />
                      <span>
                        {belt.timeInBelt} {belt.timeInBelt === 1 ? 'mês' : 'meses'} nesta faixa
                      </span>
                    </div>
                  )}

                  {/* Next Belt - Show progress */}
                  {isNext && belt.progressPercentage !== undefined && (
                    <div className="progress-section mt-2">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted">Progresso</small>
                        <small className="fw-bold">{belt.progressPercentage}%</small>
                      </div>
                      <ProgressBar
                        now={belt.progressPercentage}
                        variant={belt.progressPercentage >= 70 ? 'success' : 'warning'}
                        className="belt-progress-bar"
                      />
                    </div>
                  )}

                  {/* Completed Belt - Show achievement date */}
                  {isCompleted && belt.achievedDate && (
                    <div className="belt-detail text-success">
                      <FaCheckCircle className="me-1" />
                      <span>Concluída em {formatDate(belt.achievedDate)}</span>
                    </div>
                  )}

                  {/* Future Belt - Show locked */}
                  {isFuture && (
                    <div className="belt-detail text-muted">
                      <FaLock className="me-1" />
                      <span>Bloqueada</span>
                    </div>
                  )}

                  {/* Requirements (for next belt) */}
                  {isNext && belt.requirements && (
                    <div className="requirements-mini mt-2 pt-2 border-top">
                      <small className="text-muted d-block mb-1">Requisitos:</small>
                      <small className="text-muted">
                        • {belt.requirements.minimumMonths} meses mínimos
                      </small>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="timeline-legend mt-4 p-3">
        <small className="d-block mb-2 fw-bold">Legenda:</small>
        <div className="legend-items">
          <div className="legend-item">
            <FaCheckCircle className="text-success me-1" />
            <small>Concluída</small>
          </div>
          <div className="legend-item">
            <FaTrophy className="text-danger me-1" />
            <small>Atual</small>
          </div>
          <div className="legend-item">
            <FaClock className="text-warning me-1" />
            <small>Próxima</small>
          </div>
          <div className="legend-item">
            <FaLock className="text-secondary me-1" />
            <small>Futura</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeltProgressTimeline;
