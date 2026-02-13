import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Alert, Spinner, Modal } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { cmsService } from '../../services/api';
import CMSField from './CMSField';

const CMSSection = ({ secao }) => {
  const [loading, setLoading] = useState(true);
  const [conteudos, setConteudos] = useState([]);
  const [error, setError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (secao?.id) {
      loadConteudos();
    }
  }, [secao]);

  const loadConteudos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await cmsService.getSecaoById(secao.id);
      console.log('Response Section:', response.data);

      // O backend retorna { success: true, data: { secao: {}, conteudos: [] } }
      const conteudosData = response.data.data?.conteudos || response.data.conteudos || [];
      setConteudos(conteudosData);
    } catch (error) {
      console.error('Erro ao carregar conteúdos:', error);
      setError('Erro ao carregar conteúdos da seção: ' + (error.message || 'Erro desconhecido'));
      toast.error('Erro ao carregar conteúdos da seção');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConteudo = async (conteudoId, valor) => {
    try {
      await cmsService.updateConteudo(conteudoId, { valor });
      toast.success('Conteúdo atualizado com sucesso!');

      // Atualizar o valor local
      setConteudos(prev => prev.map(content =>
        content.id === conteudoId
          ? { ...content, valor }
          : content
      ));
    } catch (error) {
      console.error('Erro ao salvar conteúdo:', error);
      toast.error('Erro ao salvar conteúdo');
      throw error;
    }
  };

  const handleImageUpload = async (conteudoId, file, altText) => {
    try {
      const formData = new FormData();
      formData.append('imagem', file);
      formData.append('altText', altText || '');

      const response = await cmsService.uploadImagem(conteudoId, formData);
      toast.success('Imagem enviada com sucesso!');

      // Atualizar o conteúdo local
      setConteudos(prev => prev.map(content =>
        content.id === conteudoId
          ? {
              ...content,
              valor: response.data.upload.caminho,
              caminho: response.data.upload.caminho,
              alt_text: response.data.upload.altText
            }
          : content
      ));

      return response.data.upload;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error('Erro ao fazer upload da imagem');
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center p-4">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Carregando...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        {error}
      </Alert>
    );
  }

  if (!conteudos.length) {
    return (
      <Alert variant="info">
        <i className="bi bi-info-circle me-2"></i>
        Nenhum conteúdo configurado para esta seção.
      </Alert>
    );
  }

  return (
    <div className="cms-section">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-1">{secao.nome}</h5>
          {secao.descricao && (
            <p className="text-muted mb-0">{secao.descricao}</p>
          )}
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => setShowPreview(true)}
        >
          <i className="bi bi-eye me-2"></i>
          Visualizar
        </Button>
      </div>

      <Row>
        {conteudos.map((conteudo) => (
          <Col key={conteudo.id} md={6} lg={4} className="mb-4">
            <CMSField
              conteudo={conteudo}
              onSave={handleSaveConteudo}
              onImageUpload={handleImageUpload}
            />
          </Col>
        ))}
      </Row>

      {/* Modal de Preview */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-eye me-2"></i>
            Preview - {secao.nome}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="preview-content">
            {conteudos.map((conteudo) => (
              <div key={conteudo.id} className="preview-field mb-3">
                <strong>{conteudo.label}:</strong>
                <div className="mt-1">
                  {conteudo.tipo === 'imagem' ? (
                    conteudo.valor ? (
                      <img
                        src={`http://localhost:3011${conteudo.valor}`}
                        alt={conteudo.alt_text || conteudo.label}
                        style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                        className="border rounded"
                      />
                    ) : (
                      <span className="text-muted">Nenhuma imagem</span>
                    )
                  ) : (
                    <div
                      style={{
                        maxHeight: '60px',
                        overflow: 'hidden',
                        fontSize: conteudo.tipo === 'titulo' ? '1.2em' : '1em',
                        fontWeight: conteudo.tipo === 'titulo' ? 'bold' : 'normal'
                      }}
                    >
                      {conteudo.valor || <span className="text-muted">Vazio</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreview(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CMSSection;