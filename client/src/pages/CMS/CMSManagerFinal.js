import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import CMSFieldSimple from './CMSFieldSimple';
import './CMS.css';

const CMSManagerFinal = () => {
  const [loading, setLoading] = useState(true);
  const [secoes, setSecoes] = useState([]);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [conteudos, setConteudos] = useState([]);

  useEffect(() => {
    loadSecoes();
  }, []);

  // Carregar todas as seções
  const loadSecoes = async () => {
    try {
      console.log('🔍 CMSManagerFinal - Carregando seções...');
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:3011/api/cms/secoes');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ CMSManagerFinal - Seções carregadas:', data.data.length);
        setSecoes(data.data || []);
        setSelectedSection(null);
        setConteudos([]);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManagerFinal - Erro ao carregar seções:', error);
      setError('Erro ao carregar seções: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Carregar seção específica
  const loadSecao = async (secaoId) => {
    try {
      console.log(`🔍 CMSManagerFinal - Carregando seção ${secaoId}...`);
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:3011/api/cms/secoes/${secaoId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ CMSManagerFinal - Seção ${secaoId} carregada:`, data.data);
        setSelectedSection(data.data.secao);
        setConteudos(data.data.conteudos || []);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManagerFinal - Erro ao carregar seção:', error);
      setError('Erro ao carregar seção: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Salvar conteúdo
  const handleSaveConteudo = async (conteudoId, valor) => {
    try {
      console.log(`💾 CMSManagerFinal - Salvando conteúdo ${conteudoId}:`, valor);

      const response = await fetch(`http://localhost:3011/api/cms/conteudos/${conteudoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valor }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`✅ CMSManagerFinal - Conteúdo ${conteudoId} salvo com sucesso`);

        // Atualizar imediatamente o estado local
        setConteudos(prevConteudos => {
          const novosConteudos = prevConteudos.map(content =>
            content.id === conteudoId
              ? { ...content, valor: valor }
              : content
          );
          console.log(`🔄 CMSManagerFinal - Estado atualizado:`, novosConteudos);
          return novosConteudos;
        });

        toast.success('Conteúdo atualizado com sucesso!');
        return data.data;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManagerFinal - Erro ao salvar:', error);
      toast.error('Erro ao salvar: ' + error.message);
      throw error;
    }
  };

  // Upload de imagem
  const handleImageUpload = async (conteudoId, file, altText) => {
    try {
      console.log(`📤 CMSManagerFinal - Upload para conteúdo ${conteudoId}:`, {
        arquivo: file.name,
        tamanho: file.size,
        altText
      });

      const formData = new FormData();
      formData.append('imagem', file);
      formData.append('altText', altText || '');

      const response = await fetch(`http://localhost:3011/api/cms/upload/${conteudoId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const uploadData = data.data.upload;
        console.log(`✅ CMSManagerFinal - Upload ${conteudoId} concluído:`, uploadData);

        // Atualizar imediatamente o estado local
        setConteudos(prevConteudos => {
          const novosConteudos = prevConteudos.map(content =>
            content.id === conteudoId
              ? {
                  ...content,
                  valor: uploadData.caminho,
                  alt_text: uploadData.altText
                }
              : content
          );
          console.log(`🔄 CMSManagerFinal - Estado após upload:`, novosConteudos);
          return novosConteudos;
        });

        toast.success('Imagem enviada com sucesso!');
        return uploadData;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManagerFinal - Erro no upload:', error);
      toast.error('Erro no upload: ' + error.message);
      throw error;
    }
  };

  // Handlers de navegação
  const handleSectionClick = (secao) => {
    console.log(`🔍 CMSManagerFinal - Selecionando seção:`, secao.nome);
    loadSecao(secao.id);
  };

  const handleBackToSections = () => {
    console.log('🔙 CMSManagerFinal - Voltando para lista de seções');
    setSelectedSection(null);
    setConteudos([]);
    loadSecoes();
  };

  // Loading state
  if (loading) {
    return (
      <Container fluid className="cms-manager">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <Spinner animation="border" role="status" size="lg" />
            <p className="mt-3">Carregando Sistema CMS...</p>
          </div>
        </div>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container fluid className="cms-manager">
        <Alert variant="danger" className="mt-3">
          <Alert.Heading>Erro no Sistema CMS</Alert.Heading>
          <p>{error}</p>
          <Button variant="outline-danger" onClick={loadSecoes}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Tentar Novamente
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="cms-manager">
      <Row>
        <Col>
          {/* Header */}
          <div className="cms-header mb-4">
            <h2>
              <i className="bi bi-gear-fill me-2"></i>
              Sistema CMS - Gracie Barra
            </h2>
            <p className="text-muted">
              Gerencie o conteúdo do site de forma simples e eficiente
            </p>
          </div>

          {/* Lista de Seções */}
          {!selectedSection && (
            <Card>
              <Card.Header>
                <h5>
                  <i className="bi bi-list-ul me-2"></i>
                  Seções Disponíveis ({secoes.length})
                </h5>
              </Card.Header>
              <Card.Body>
                {secoes.length === 0 ? (
                  <Alert variant="info">
                    <i className="bi bi-info-circle me-2"></i>
                    Nenhuma seção encontrada no sistema.
                  </Alert>
                ) : (
                  <Row>
                    {secoes.map((secao) => (
                      <Col md={6} lg={4} key={secao.id} className="mb-3">
                        <Card
                          className="h-100 cursor-pointer hover-shadow"
                          onClick={() => handleSectionClick(secao)}
                          style={{
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '';
                          }}
                        >
                          <Card.Body>
                            <Card.Title>
                              <i className="bi bi-folder me-2"></i>
                              {secao.nome}
                            </Card.Title>
                            <Card.Text className="text-muted">
                              {secao.descricao}
                            </Card.Text>
                            <small className="text-success">
                              <i className="bi bi-file-text me-1"></i>
                              {secao.total_conteudos} conteúdos
                            </small>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Card.Body>
            </Card>
          )}

          {/* Edição de Seção */}
          {selectedSection && (
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">
                    <i className="bi bi-pencil-square me-2"></i>
                    Editando: {selectedSection.nome}
                  </h5>
                  {selectedSection.descricao && (
                    <p className="text-muted mb-0">{selectedSection.descricao}</p>
                  )}
                </div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleBackToSections}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Voltar às Seções
                </Button>
              </Card.Header>
              <Card.Body>
                {conteudos.length === 0 ? (
                  <Alert variant="warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Nenhum conteúdo encontrado para esta seção.
                  </Alert>
                ) : (
                  <Row>
                    {conteudos.map((conteudo) => (
                      <Col key={conteudo.id} md={6} lg={4} className="mb-4">
                        <CMSFieldSimple
                          conteudo={conteudo}
                          onSave={handleSaveConteudo}
                          onImageUpload={handleImageUpload}
                        />
                      </Col>
                    ))}
                  </Row>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default CMSManagerFinal;