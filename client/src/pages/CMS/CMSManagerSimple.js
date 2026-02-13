import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Spinner, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import CMSField from './CMSField';

const CMSManagerSimple = () => {
  const [loading, setLoading] = useState(true);
  const [secoes, setSecoes] = useState([]);
  const [error, setError] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [conteudos, setConteudos] = useState([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    loadSecoes();
  }, []);

  const loadSecoes = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch('http://localhost:3011/api/cms/secoes');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setSecoes(data.data || []);
        setSelectedSection(null);
        setConteudos([]);
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao carregar seções:', error);
      setError('Erro ao carregar seções: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSecao = async (secaoId) => {
    try {
      console.log(`🔍 CMSManager - Carregando seção ${secaoId}`);
      setLoading(true);
      setError('');

      const response = await fetch(`http://localhost:3011/api/cms/secoes/${secaoId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📡 CMSManager - Dados da seção ${secaoId} recebidos:`, data);

      if (data.success) {
        setSelectedSection(data.data.secao);
        setConteudos(data.data.conteudos || []);
        console.log(`📝 CMSManager - Seção e conteúdos definidos:`, {
          secao: data.data.secao,
          conteudos: data.data.conteudos
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManager - Erro ao carregar seção:', error);
      setError('Erro ao carregar seção: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConteudo = async (conteudoId, valor) => {
    try {
      console.log(`🚀 CMSManager - Salvando conteúdo ${conteudoId}:`, { valor });
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
      console.log(`📡 CMSManager - Resposta do servidor para ${conteudoId}:`, data);

      if (data.success) {
        // Atualizar estado local IMEDIATAMENTE
        console.log(`🔄 CMSManager - Atualizando estado local para ${conteudoId}`);
        setConteudos(prev => {
          const novoEstado = prev.map(content => {
            if (content.id === conteudoId) {
              const updatedContent = { ...content, valor: valor };
              console.log(`🔧 CMSManager - Conteúdo ${conteudoId} atualizado:`, {
                antes: content,
                depois: updatedContent
              });
              return updatedContent;
            }
            return content;
          });
          console.log(`📝 CMSManager - Novo estado dos conteúdos:`, novoEstado);
          return novoEstado;
        });

        toast.success('Conteúdo atualizado!');

        // Forçar re-render
        setUpdateTrigger(prev => prev + 1);

        // Recarregar dados após um breve delay para garantir sincronização
        setTimeout(() => {
          console.log(`⏰ CMSManager - Recarregando seção após delay`);
          if (selectedSection) {
            loadSecao(selectedSection.id);
          }
        }, 500);

        return data.data;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManager - Erro ao salvar:', error);
      toast.error('Erro ao salvar: ' + error.message);
      throw error;
    }
  };

  const handleImageUpload = async (conteudoId, file, altText) => {
    try {
      console.log(`🚀 CMSManager - Fazendo upload para conteúdo ${conteudoId}:`, {
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
      console.log(`📡 CMSManager - Resposta do upload para ${conteudoId}:`, data);

      if (data.success) {
        const uploadData = data.data.upload;

        // Atualizar estado local IMEDIATAMENTE
        console.log(`🔄 CMSManager - Atualizando estado com imagem para ${conteudoId}:`, uploadData);
        setConteudos(prev => {
          const novoEstado = prev.map(content => {
            if (content.id === conteudoId) {
              const updatedContent = {
                ...content,
                valor: uploadData.caminho,
                alt_text: uploadData.altText
              };
              console.log(`🔧 CMSManager - Imagem ${conteudoId} atualizada:`, {
                antes: content,
                depois: updatedContent,
                uploadData
              });
              return updatedContent;
            }
            return content;
          });
          console.log(`📝 CMSManager - Estado após upload:`, novoEstado);
          return novoEstado;
        });

        toast.success('Imagem enviada!');

        // Forçar re-render
        setUpdateTrigger(prev => prev + 1);

        // Recarregar dados após delay para garantir sincronização
        setTimeout(() => {
          console.log(`⏰ CMSManager - Recarregando seção após upload`);
          if (selectedSection) {
            loadSecao(selectedSection.id);
          }
        }, 500);

        return uploadData;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ CMSManager - Erro no upload:', error);
      toast.error('Erro no upload: ' + error.message);
      throw error;
    }
  };

  // Lidar com clique em seção
  const handleSectionClick = (secao) => {
    loadSecao(secao.id);
  };

  // Voltar para lista de seções
  const handleBackToSections = () => {
    loadSecoes();
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
          <Button variant="outline-danger" onClick={loadSecoes}>
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
          <div className="cms-header mb-4">
            <h2>Gerenciar Conteúdo do Site</h2>
            <p className="text-muted">
              Edite textos, títulos e imagens das seções do site de forma fácil e intuitiva.
            </p>
          </div>

          <Card>
            <Card.Header>
              <h5>Seções do Site</h5>
            </Card.Header>
            <Card.Body>
              {secoes.length === 0 ? (
                <Alert variant="info">
                  Nenhuma seção encontrada.
                </Alert>
              ) : (
                <Row>
                  {secoes.map((secao) => (
                    <Col md={6} lg={4} key={secao.id} className="mb-3">
                      <Card
                        className="h-100 cursor-pointer"
                        onClick={() => handleSectionClick(secao)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Card.Body>
                          <Card.Title>{secao.nome}</Card.Title>
                          <Card.Text>{secao.descricao}</Card.Text>
                          <small className="text-muted">
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

          {selectedSection && (
            <Card className="mt-4">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-1">Editando: {selectedSection.nome}</h5>
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
                  Voltar
                </Button>
              </Card.Header>
              <Card.Body>
                {conteudos.length === 0 ? (
                  <Alert variant="info">
                    <i className="bi bi-info-circle me-2"></i>
                    Nenhum conteúdo encontrado para esta seção.
                  </Alert>
                ) : (
                  <Row>
                    {conteudos.map((conteudo) => (
                      <Col key={conteudo.id} md={6} lg={4} className="mb-4">
                        <CMSField
                          conteudo={conteudo}
                          onSave={handleSaveConteudo}
                          onImageUpload={handleImageUpload}
                          updateTrigger={updateTrigger}
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

export default CMSManagerSimple;