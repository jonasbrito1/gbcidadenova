import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';

const CMSField = ({ conteudo, onSave, onImageUpload, updateTrigger }) => {
  const [valor, setValor] = useState(conteudo.valor || '');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [altText, setAltText] = useState(conteudo.alt_text || '');
  const fileInputRef = useRef(null);

  // Sincronizar com props quando conteudo muda
  useEffect(() => {
    console.log(`🔄 CMSField[${conteudo.id}] - Sincronizando dados (trigger: ${updateTrigger}):`, {
      novoValor: conteudo.valor,
      valorAtual: valor,
      novoAltText: conteudo.alt_text,
      altTextAtual: altText,
      conteudoCompleto: conteudo,
      updateTrigger
    });
    setValor(conteudo.valor || '');
    setAltText(conteudo.alt_text || '');
  }, [conteudo, updateTrigger]);

  // Detectar se há mudanças
  const hasChanges = valor !== conteudo.valor;

  // Salvar conteúdo
  const handleSave = async () => {
    if (!hasChanges || loading) return;

    try {
      console.log(`💾 CMSField[${conteudo.id}] - Iniciando salvamento:`, {
        valorAntigo: conteudo.valor,
        valorNovo: valor,
        hasChanges
      });
      setLoading(true);
      const result = await onSave(conteudo.id, valor);
      console.log(`✅ CMSField[${conteudo.id}] - Salvo com sucesso:`, result);
    } catch (error) {
      console.error(`❌ CMSField[${conteudo.id}] - Erro ao salvar:`, error);
      // Reverter em caso de erro
      setValor(conteudo.valor || '');
    } finally {
      setLoading(false);
    }
  };

  // Upload de imagem
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    // Validar tamanho
    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    try {
      console.log(`📤 CMSField[${conteudo.id}] - Iniciando upload:`, {
        arquivo: file.name,
        tamanho: file.size,
        tipo: file.type,
        altText
      });
      setUploading(true);
      const result = await onImageUpload(conteudo.id, file, altText);
      console.log(`✅ CMSField[${conteudo.id}] - Upload concluído:`, result);
      // A atualização será feita pelo componente pai
    } catch (error) {
      console.error(`❌ CMSField[${conteudo.id}] - Erro no upload:`, error);
    } finally {
      setUploading(false);
      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderField = () => {
    switch (conteudo.tipo) {
      case 'imagem':
        return (
          <div>
            {valor && (
              <div className="mb-3">
                <img
                  src={`http://localhost:3011${valor}`}
                  alt={altText || conteudo.label}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                  onLoad={() => console.log(`🖼️ CMSField[${conteudo.id}] - Imagem carregada:`, `http://localhost:3011${valor}`)}
                  onError={(e) => console.error(`❌ CMSField[${conteudo.id}] - Erro ao carregar imagem:`, e.target.src)}
                />
                <small className="text-muted d-block mt-1">
                  URL: http://localhost:3011{valor}
                </small>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Texto Alternativo (SEO)</Form.Label>
              <Form.Control
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descrição da imagem para acessibilidade"
                size="sm"
              />
            </Form.Group>

            <Form.Group>
              <Form.Control
                ref={fileInputRef}
                type="file"
                onChange={handleImageUpload}
                accept="image/*"
                disabled={uploading}
                size="sm"
              />
              <Form.Text className="text-muted">
                JPG, PNG, WebP ou GIF - Máx. 5MB
              </Form.Text>
            </Form.Group>

            {uploading && (
              <div className="text-center mt-2">
                <Spinner animation="border" size="sm" />
                <span className="ms-2">Enviando...</span>
              </div>
            )}
          </div>
        );

      case 'titulo':
      case 'subtitulo':
        return (
          <Form.Control
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={conteudo.placeholder}
            maxLength={conteudo.max_caracteres}
            style={{
              fontSize: conteudo.tipo === 'titulo' ? '1.1em' : '1em',
              fontWeight: conteudo.tipo === 'titulo' ? 'bold' : 'normal'
            }}
          />
        );

      case 'textarea':
      case 'texto':
        return (
          <Form.Control
            as="textarea"
            rows={4}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={conteudo.placeholder || `Digite o ${conteudo.label.toLowerCase()}`}
            maxLength={conteudo.max_caracteres}
          />
        );

      case 'cor':
        return (
          <div className="d-flex align-items-center gap-2">
            <Form.Control
              type="color"
              value={valor || '#ffffff'}
              onChange={(e) => setValor(e.target.value)}
              style={{ width: '60px', minWidth: '60px', height: '38px' }}
              className="p-1"
            />
            <Form.Control
              type="text"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="#ffffff"
              maxLength={7}
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        );

      case 'link':
        return (
          <Form.Control
            type="url"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={conteudo.placeholder || "https://exemplo.com"}
          />
        );

      case 'html':
        return (
          <Form.Control
            as="textarea"
            rows={6}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={conteudo.placeholder || "HTML code here..."}
            style={{ fontFamily: 'monospace', fontSize: '0.9em' }}
          />
        );

      default:
        return (
          <Form.Control
            type="text"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={conteudo.placeholder}
          />
        );
    }
  };

  const isRequired = conteudo.obrigatorio;
  const isEmpty = !valor || valor.trim() === '';

  // Log do render
  console.log(`🎨 CMSField[${conteudo.id}] - Renderizando:`, {
    label: conteudo.label,
    tipo: conteudo.tipo,
    valor: valor,
    valorProp: conteudo.valor,
    hasChanges,
    isEmpty,
    isRequired
  });

  return (
    <Card className="cms-field-card h-100">
      <Card.Header className="cms-field-header">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h6 className="mb-1">
              {conteudo.label}
              {isRequired && <span className="text-danger ms-1">*</span>}
            </h6>
            <Badge
              bg={conteudo.tipo === 'imagem' ? 'info' : 'secondary'}
              className="text-uppercase"
              style={{ fontSize: '0.7em' }}
            >
              {conteudo.tipo}
            </Badge>
          </div>

          {hasChanges && conteudo.tipo !== 'imagem' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={loading || (isRequired && isEmpty)}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-1"></i>
                  Salvar
                </>
              )}
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Body>
        {renderField()}

        {conteudo.dicas && (
          <Form.Text className="text-muted d-block mt-2">
            <i className="bi bi-info-circle me-1"></i>
            {conteudo.dicas}
          </Form.Text>
        )}

        {conteudo.max_caracteres && conteudo.tipo !== 'imagem' && (
          <div className="mt-2">
            <Form.Text
              className={valor.length > conteudo.max_caracteres * 0.9 ? 'text-warning' : 'text-muted'}
            >
              {valor.length}/{conteudo.max_caracteres} caracteres
            </Form.Text>
          </div>
        )}

        {isRequired && isEmpty && (
          <Alert variant="warning" className="mt-2 mb-0 py-1">
            <small>
              <i className="bi bi-exclamation-triangle me-1"></i>
              Campo obrigatório
            </small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default CMSField;