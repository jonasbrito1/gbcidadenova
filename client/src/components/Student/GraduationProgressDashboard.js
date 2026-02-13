import React, { useState, useEffect } from 'react';
import { Card, Tabs, Tab, Spinner, Alert } from 'react-bootstrap';
import { FaChartLine, FaListCheck, FaCalendarAlt, FaHistory } from 'react-icons/fa';
import { studentProfileService } from '../../services/api';
import BeltProgressTimeline from './BeltProgressTimeline';
import RequirementsChecklist from './RequirementsChecklist';
import EligibilityCalculator from './EligibilityCalculator';
import GraduationHistory from './GraduationHistory';
import './GraduationProgress.css';

const GraduationProgressDashboard = ({ studentId, isProprioAluno }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('timeline');

  // Data from APIs
  const [eligibilityData, setEligibilityData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [projectionData, setProjectionData] = useState(null);

  useEffect(() => {
    loadGraduationData();
  }, [studentId]);

  const loadGraduationData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load all data in parallel
      const [eligibility, timeline, projection] = await Promise.all([
        studentProfileService.getGraduationEligibility(),
        studentProfileService.getGraduationTimeline(),
        studentProfileService.getGraduationProjection()
      ]);

      setEligibilityData(eligibility.data);
      setTimelineData(timeline.data);
      setProjectionData(projection.data);
    } catch (err) {
      console.error('Erro ao carregar dados de graduação:', err);
      setError('Erro ao carregar dados de graduação. ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="graduation-dashboard-card">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="danger" className="mb-3" />
          <p className="text-muted">Carregando dados de graduação...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mb-3">
        <Alert.Heading>Erro ao Carregar Dados</Alert.Heading>
        <p>{error}</p>
      </Alert>
    );
  }

  if (!eligibilityData || !timelineData) {
    return (
      <Alert variant="info" className="mb-3">
        <p className="mb-0">Dados de graduação não disponíveis.</p>
      </Alert>
    );
  }

  return (
    <Card className="graduation-dashboard-card">
      <Card.Header className="bg-gradient-danger text-white">
        <div className="d-flex align-items-center gap-2">
          <FaChartLine size={24} />
          <div>
            <h5 className="mb-0">Acompanhamento de Graduações</h5>
            <small className="opacity-90">
              Acompanhe seu progresso e próxima graduação
            </small>
          </div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <Tabs
          id="graduation-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="graduation-tabs"
        >
          {/* Timeline Tab */}
          <Tab
            eventKey="timeline"
            title={
              <div className="tab-title">
                <FaChartLine className="me-2" />
                <span className="tab-text">Progressão</span>
              </div>
            }
          >
            <div className="tab-content-wrapper">
              <BeltProgressTimeline
                timelineData={timelineData}
                currentBelt={eligibilityData.currentBelt}
              />
            </div>
          </Tab>

          {/* Requirements Tab */}
          <Tab
            eventKey="requirements"
            title={
              <div className="tab-title">
                <FaListCheck className="me-2" />
                <span className="tab-text">Requisitos</span>
              </div>
            }
          >
            <div className="tab-content-wrapper">
              <RequirementsChecklist
                eligibilityData={eligibilityData}
              />
            </div>
          </Tab>

          {/* Projection Tab */}
          <Tab
            eventKey="projection"
            title={
              <div className="tab-title">
                <FaCalendarAlt className="me-2" />
                <span className="tab-text">Projeção</span>
              </div>
            }
          >
            <div className="tab-content-wrapper">
              <EligibilityCalculator
                eligibilityData={eligibilityData}
                projectionData={projectionData}
              />
            </div>
          </Tab>

          {/* History Tab */}
          <Tab
            eventKey="history"
            title={
              <div className="tab-title">
                <FaHistory className="me-2" />
                <span className="tab-text">Histórico</span>
              </div>
            }
          >
            <div className="tab-content-wrapper">
              <GraduationHistory
                timelineData={timelineData}
              />
            </div>
          </Tab>
        </Tabs>
      </Card.Body>
    </Card>
  );
};

export default GraduationProgressDashboard;
