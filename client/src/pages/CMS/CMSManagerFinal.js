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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadSecoes();
  }, []);

  // Carregar todas as seções
  const loadSecoes = async () => {
    try {
      console.log('🔍 CMSManagerFinal - Carregando seções...');
      setLoading(true);
      setError('');

      const token = localStorage.getItem('gb_token');
      const response = await fetch('/api/cms/secoes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

      const token = localStorage.getItem('gb_token');
      const response = await fetch(`/api/cms/secoes/${secaoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

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

      const token = localStorage.getItem('gb_token');
      const response = await fetch(`/api/cms/conteudos/${conteudoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
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

      const token = localStorage.getItem('gb_token');
      const response = await fetch(`/api/cms/upload/${conteudoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
    setSearchTerm('');
    setFilterType('all');
    loadSecoes();
  };

  // Filtrar seções por busca
  const filteredSecoes = secoes.filter(secao =>
    secao.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    secao.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar conteúdos por tipo
  const filteredConteudos = filterType === 'all'
    ? conteudos
    : conteudos.filter(c => c.tipo === filterType);

  // Obter tipos únicos de conteúdos
  const uniqueTypes = [...new Set(conteudos.map(c => c.tipo))];

  // Calcular estatísticas
  const stats = {
    totalSections: secoes.length,
    totalContents: conteudos.reduce((sum, secao) => sum + (secao.total_conteudos || 0), 0),
    totalImages: conteudos.filter(c => c.tipo === 'imagem').length,
    totalTexts: conteudos.filter(c => c.tipo === 'texto' || c.tipo === 'textarea').length
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
            <p className="mb-0">
              Gerencie o conteúdo do site de forma simples e eficiente
            </p>
          </div>

          {/* Estatísticas */}
          {!selectedSection && (
            <Row className="mb-4">
              <Col xs={12} md={6} lg={3} className="mb-3">
                <div className="stats-card stats-sections">
                  <div className="d-flex align-items-center">
                    <div className="stats-icon me-3">
                      <i className="bi bi-folder-fill"></i>
                    </div>
                    <div>
                      <h3 className="mb-0">{stats.totalSections}</h3>
                      <small>Seções Totais</small>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6} lg={3} className="mb-3">
                <div className="stats-card stats-contents">
                  <div className="d-flex align-items-center">
                    <div className="stats-icon me-3">
                      <i className="bi bi-file-text-fill"></i>
                    </div>
                    <div>
                      <h3 className="mb-0">{stats.totalContents}</h3>
                      <small>Conteúdos</small>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6} lg={3} className="mb-3">
                <div className="stats-card stats-images">
                  <div className="d-flex align-items-center">
                    <div className="stats-icon me-3">
                      <i className="bi bi-image-fill"></i>
                    </div>
                    <div>
                      <h3 className="mb-0">{stats.totalImages}</h3>
                      <small>Imagens</small>
                    </div>
                  </div>
                </div>
              </Col>
              <Col xs={12} md={6} lg={3} className="mb-3">
                <div className="stats-card stats-texts">
                  <div className="d-flex align-items-center">
                    <div className="stats-icon me-3">
                      <i className="bi bi-pencil-fill"></i>
                    </div>
                    <div>
                      <h3 className="mb-0">{stats.totalTexts}</h3>
                      <small>Textos</small>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          )}

          {/* Lista de Seções */}
          {!selectedSection && (
            <>
              {/* Barra de Busca */}
              <div className="search-container slide-in">
                <Row className="align-items-center">
                  <Col md={8}>
                    <div className="position-relative">
                      <i className="bi bi-search search-icon"></i>
                      <input
                        type="text"
                        className="form-control search-input"
                        placeholder="Buscar seções por nome ou descrição..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </Col>
                  <Col md={4} className="text-end">
                    {searchTerm && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => setSearchTerm('')}
                      >
                        <i className="bi bi-x-lg me-2"></i>
                        Limpar Busca
                      </Button>
                    )}
                  </Col>
                </Row>
              </div>

              <Card>
                <Card.Header className="sections-header">
                  <h5>
                    <i className="bi bi-grid-3x3-gap-fill me-2"></i>
                    Seções Disponíveis ({filteredSecoes.length})
                  </h5>
                </Card.Header>
                <Card.Body>
                  {filteredSecoes.length === 0 ? (
                    <Alert variant="info" className="mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      {searchTerm ? 'Nenhuma seção encontrada com esse termo de busca.' : 'Nenhuma seção encontrada no sistema.'}
                    </Alert>
                  ) : (
                    <Row>
                      {filteredSecoes.map((secao) => (
                        <Col xs={12} sm={6} md={6} lg={4} key={secao.id} className="mb-3">
                          <Card
                            className="h-100 hover-shadow slide-in"
                            onClick={() => handleSectionClick(secao)}
                          >
                            <Card.Body>
                              <div className="d-flex align-items-start mb-3">
                                <div className="section-icon me-3">
                                  <i className="bi bi-folder-fill"></i>
                                </div>
                                <div className="flex-grow-1">
                                  <Card.Title className="mb-1">
                                    {secao.nome}
                                  </Card.Title>
                                  <Card.Text className="small">
                                    {secao.descricao}
                                  </Card.Text>
                                </div>
                              </div>
                              <div className="d-flex justify-content-between align-items-center">
                                <small className="text-success fw-bold">
                                  <i className="bi bi-file-text me-1"></i>
                                  {secao.total_conteudos} conteúdos
                                </small>
                                <i className="bi bi-arrow-right-circle text-primary"></i>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </Card.Body>
              </Card>
            </>
          )}

          {/* Edição de Seção */}
          {selectedSection && (
            <>
              {/* Filtro de Tipos */}
              <div className="search-container slide-in mb-3">
                <Row className="align-items-center">
                  <Col md={6}>
                    <h5 className="mb-0">
                      <i className="bi bi-funnel-fill me-2 text-primary"></i>
                      Filtrar por Tipo
                    </h5>
                  </Col>
                  <Col md={6}>
                    <div className="d-flex gap-2 flex-wrap justify-content-end">
                      <Button
                        variant={filterType === 'all' ? 'primary' : 'outline-primary'}
                        size="sm"
                        onClick={() => setFilterType('all')}
                      >
                        <i className="bi bi-grid-fill me-1"></i>
                        Todos ({conteudos.length})
                      </Button>
                      {uniqueTypes.map(tipo => (
                        <Button
                          key={tipo}
                          variant={filterType === tipo ? 'primary' : 'outline-primary'}
                          size="sm"
                          onClick={() => setFilterType(tipo)}
                        >
                          {tipo} ({conteudos.filter(c => c.tipo === tipo).length})
                        </Button>
                      ))}
                    </div>
                  </Col>
                </Row>
              </div>

              <Card className="slide-in">
                <Card.Header className="sections-header">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h5 className="mb-1">
                        <i className="bi bi-pencil-square me-2"></i>
                        Editando: {selectedSection.nome}
                      </h5>
                      {selectedSection.descricao && (
                        <p className="mb-0">{selectedSection.descricao}</p>
                      )}
                    </div>
                    <Button
                      variant="light"
                      size="sm"
                      onClick={handleBackToSections}
                    >
                      <i className="bi bi-arrow-left me-2"></i>
                      Voltar às Seções
                    </Button>
                  </div>
                </Card.Header>
              <Card.Body>
                {conteudos.length === 0 ? (
                  <Alert variant="warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Nenhum conteúdo encontrado para esta seção.
                  </Alert>
                ) : selectedSection.chave === 'professores' ? (
                  // Layout especial para professores
                  <div>
                    {[1, 2].map(profNum => {
                      const professorFields = conteudos.filter(c =>
                        c.chave.startsWith(`professor_${profNum}_`)
                      );

                      if (professorFields.length === 0) return null;

                      const getNome = () => professorFields.find(f => f.chave === `professor_${profNum}_nome`)?.valor || `Professor ${profNum}`;
                      const getFoto = () => professorFields.find(f => f.chave === `professor_${profNum}_foto`)?.valor || '';

                      return (
                        <Card key={profNum} className="mb-4 professor-card">
                          <Card.Header className="professor-card-header">
                            <Row className="align-items-center">
                              <Col md={8}>
                                <div className="professor-badge mb-2">
                                  <i className="bi bi-person-badge me-2"></i>
                                  Professor {profNum}
                                </div>
                                <h5 className="mb-0">
                                  {getNome()}
                                </h5>
                              </Col>
                              <Col md={4} className="text-end">
                                {getFoto() && (
                                  <img
                                    src={getFoto().startsWith('/') ? `http://localhost:4011${getFoto()}` : getFoto()}
                                    alt={getNome()}
                                    className="professor-photo-preview"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                              </Col>
                            </Row>
                          </Card.Header>
                          <Card.Body>
                            {/* Informações Básicas */}
                            <div className="mb-4">
                              <h6 className="text-muted mb-3">
                                <i className="bi bi-info-circle me-2"></i>
                                Informações Básicas
                              </h6>
                              <Row>
                                {['nome', 'faixa', 'especialidade'].map(tipo => {
                                  const campo = professorFields.find(f =>
                                    f.chave === `professor_${profNum}_${tipo}`
                                  );
                                  if (!campo) return null;

                                  return (
                                    <Col key={campo.id} xs={12} md={6} className="mb-3">
                                      <CMSFieldSimple
                                        conteudo={campo}
                                        onSave={handleSaveConteudo}
                                        onImageUpload={handleImageUpload}
                                      />
                                    </Col>
                                  );
                                })}
                              </Row>
                            </div>

                            {/* Foto do Professor */}
                            <div className="mb-4">
                              <h6 className="text-muted mb-3">
                                <i className="bi bi-camera me-2"></i>
                                Foto do Professor
                              </h6>
                              {(() => {
                                const campoFoto = professorFields.find(f =>
                                  f.chave === `professor_${profNum}_foto`
                                );
                                if (!campoFoto) return null;

                                return (
                                  <div className="professor-field-group">
                                    <CMSFieldSimple
                                      conteudo={campoFoto}
                                      onSave={handleSaveConteudo}
                                      onImageUpload={handleImageUpload}
                                    />
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Biografia */}
                            <div className="mb-3">
                              <h6 className="text-muted mb-3">
                                <i className="bi bi-card-text me-2"></i>
                                Biografia Completa
                              </h6>
                              {(() => {
                                const campoBio = professorFields.find(f =>
                                  f.chave === `professor_${profNum}_bio`
                                );
                                if (!campoBio) return null;

                                return (
                                  <div className="professor-bio-field">
                                    <CMSFieldSimple
                                      conteudo={campoBio}
                                      onSave={handleSaveConteudo}
                                      onImageUpload={handleImageUpload}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  // Layout padrão para outras seções
                  <>
                    {filteredConteudos.length === 0 ? (
                      <Alert variant="info" className="mb-0">
                        <i className="bi bi-info-circle me-2"></i>
                        Nenhum conteúdo encontrado com o filtro selecionado.
                      </Alert>
                    ) : (
                      <Row>
                        {filteredConteudos.map((conteudo) => (
                          <Col key={conteudo.id} xs={12} sm={6} md={6} lg={4} className="mb-4">
                            <CMSFieldSimple
                              conteudo={conteudo}
                              onSave={handleSaveConteudo}
                              onImageUpload={handleImageUpload}
                            />
                          </Col>
                        ))}
                      </Row>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default CMSManagerFinal;