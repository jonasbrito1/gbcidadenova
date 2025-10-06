import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Nav, Tab, Alert, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { cmsService } from '../../services/api';
import CMSSection from './CMSSection';
import './CMSManager.css';

const CMSManager = () => {
  const [loading, setLoading] = useState(true);
  const [secoes, setSecoes] = useState([]);
  const [activeTab, setActiveTab] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSecoes();
  }, []);

  const loadSecoes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await cmsService.getSecoes();
      console.log('Response CMS:', response.data);

      // O backend retorna { success: true, data: [...] }
      const secoesData = response.data.data || response.data.secoes || [];
      setSecoes(secoesData);

      if (secoesData.length > 0 && !activeTab) {
        setActiveTab(secoesData[0].chave);
      }
    } catch (error) {
      console.error('Erro ao carregar seções:', error);
      setError('Erro ao carregar seções do site: ' + (error.message || 'Erro desconhecido'));
      toast.error('Erro ao carregar seções do site');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container fluid className="cms-manager">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Carregando...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="cms-manager">
        <Alert variant="danger" className="mt-3">
          <Alert.Heading>Erro ao carregar CMS</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="cms-manager">
      <Row>
        <Col>
          <div className="cms-header mb-4">
            <h2>
              <i className="bi bi-gear-fill me-2"></i>
              Gerenciar Conteúdo do Site
            </h2>
            <p className="text-muted">
              Edite textos, títulos e imagens das seções do site de forma fácil e intuitiva.
            </p>
          </div>

          <Card className="cms-card">
            <Card.Header className="cms-card-header">
              <Tab.Container
                id="cms-tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
              >
                <Nav variant="tabs" className="cms-nav">
                  {secoes.map((secao) => (
                    <Nav.Item key={secao.chave}>
                      <Nav.Link eventKey={secao.chave} className="cms-nav-link">
                        <i className="bi bi-folder me-2"></i>
                        {secao.nome}
                        {secao.total_conteudos > 0 && (
                          <span className="badge bg-primary ms-2">
                            {secao.total_conteudos}
                          </span>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>

                <Tab.Content className="cms-tab-content mt-4">
                  {secoes.map((secao) => (
                    <Tab.Pane key={secao.chave} eventKey={secao.chave}>
                      <CMSSection secao={secao} />
                    </Tab.Pane>
                  ))}
                </Tab.Content>
              </Tab.Container>
            </Card.Header>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col>
          <Card className="cms-help-card">
            <Card.Body>
              <h6>
                <i className="bi bi-info-circle me-2"></i>
                Dicas de Uso
              </h6>
              <ul className="mb-0">
                <li>Clique em uma seção acima para editar seu conteúdo</li>
                <li>Para imagens, use formatos JPG, PNG ou WebP com até 5MB</li>
                <li>As alterações são aplicadas automaticamente no site</li>
                <li>Utilize textos claros e objetivos para melhor experiência</li>
                <li>Todas as alterações são registradas no histórico</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CMSManager;