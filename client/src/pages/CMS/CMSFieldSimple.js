import React, { useState, useRef, useEffect } from 'react';
import { Card, Form, Button, Alert, Spinner, Badge } from 'react-bootstrap';

const CMSFieldSimple = ({ conteudo, onSave, onImageUpload }) => {
  const [valor, setValor] = useState('');
  const [altText, setAltText] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSavedValue, setLastSavedValue] = useState('');
  const fileInputRef = useRef(null);

  // Inicializar e atualizar valores quando conteudo muda
  useEffect(() => {
    const novoValor = conteudo.valor || '';
    const novoAltText = conteudo.alt_text || '';

    console.log(`🔄 CMSFieldSimple[${conteudo.id}] - Atualizando valores:`, {
      conteudoId: conteudo.id,
      valorAntigo: valor,
      valorNovo: novoValor,
      altTextAntigo: altText,
      altTextNovo: novoAltText
    });

    setValor(novoValor);
    setAltText(novoAltText);
    setLastSavedValue(novoValor);
  }, [conteudo.id, conteudo.valor, conteudo.alt_text]);

  // Detectar mudanças
  const hasChanges = valor !== lastSavedValue;
  const isRequired = conteudo.obrigatorio;
  const isEmpty = !valor || valor.trim() === '';

  // Salvar conteúdo
  const handleSave = async () => {
    if (!hasChanges || loading || (isRequired && isEmpty)) return;

    try {
      console.log(`💾 CMSFieldSimple[${conteudo.id}] - Salvando:`, {
        valorAntigo: lastSavedValue,
        valorNovo: valor
      });

      setLoading(true);
      await onSave(conteudo.id, valor);
      setLastSavedValue(valor);

      console.log(`✅ CMSFieldSimple[${conteudo.id}] - Salvo com sucesso`);
    } catch (error) {
      console.error(`❌ CMSFieldSimple[${conteudo.id}] - Erro ao salvar:`, error);
      // Reverter em caso de erro
      setValor(lastSavedValue);
    } finally {
      setLoading(false);
    }
  };

  // Upload de imagem
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validações
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato não suportado. Use JPG, PNG, WebP ou GIF.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    try {
      console.log(`📤 CMSFieldSimple[${conteudo.id}] - Upload iniciado:`, {
        arquivo: file.name,
        tamanho: file.size,
        tipo: file.type
      });

      setUploading(true);
      await onImageUpload(conteudo.id, file, altText);

      console.log(`✅ CMSFieldSimple[${conteudo.id}] - Upload concluído`);
    } catch (error) {
      console.error(`❌ CMSFieldSimple[${conteudo.id}] - Erro no upload:`, error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Renderizar campo baseado no tipo
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
                  onLoad={() => console.log(`🖼️ CMSFieldSimple[${conteudo.id}] - Imagem carregada`)}
                  onError={(e) => console.error(`❌ CMSFieldSimple[${conteudo.id}] - Erro ao carregar imagem`)}
                />
                <small className="text-muted d-block mt-1">
                  {valor}
                </small>
              </div>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Texto Alternativo (SEO)</Form.Label>
              <Form.Control
                type="text"
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Descrição da imagem"
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

  // Ícone baseado no tipo
  const getTypeIcon = () => {
    switch (conteudo.tipo) {
      case 'imagem': return 'bi-image';
      case 'titulo': return 'bi-type-h1';
      case 'subtitulo': return 'bi-type-h2';
      case 'textarea': return 'bi-text-paragraph';
      case 'texto': return 'bi-text-left';
      case 'cor': return 'bi-palette';
      case 'link': return 'bi-link-45deg';
      case 'html': return 'bi-code-slash';
      default: return 'bi-input-cursor-text';
    }
  };

  // Cor do badge baseado no tipo
  const getBadgeColor = () => {
    switch (conteudo.tipo) {
      case 'imagem': return 'info';
      case 'titulo': case 'subtitulo': return 'primary';
      case 'textarea': return 'success';
      case 'cor': return 'warning';
      case 'link': return 'info';
      case 'html': return 'dark';
      default: return 'secondary';
    }
  };

  return (
    <Card className={`cms-field-card h-100 ${hasChanges ? 'field-changed' : ''}`}>
      <Card.Header className="cms-field-header">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-2">
              <i className={`bi ${getTypeIcon()} text-primary`}></i>
              <h6 className="mb-0">
                {conteudo.label}
                {isRequired && <span className="text-danger ms-1">*</span>}
              </h6>
            </div>
            <div className="d-flex gap-2 align-items-center">
              <Badge
                bg={getBadgeColor()}
                className="text-uppercase"
                style={{ fontSize: '0.65em', fontWeight: '600' }}
              >
                {conteudo.tipo}
              </Badge>
              {hasChanges && (
                <Badge bg="warning" className="animate-pulse">
                  <i className="bi bi-pencil-fill me-1"></i>
                  Não salvo
                </Badge>
              )}
            </div>
          </div>

          {hasChanges && conteudo.tipo !== 'imagem' && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={loading || (isRequired && isEmpty)}
              className="save-button"
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Salvando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle-fill me-1"></i>
                  Salvar
                </>
              )}
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Body>
        <div className="field-content">
          {renderField()}
        </div>

        {conteudo.dicas && (
          <Alert variant="info" className="mt-3 mb-0 py-2">
            <small>
              <i className="bi bi-lightbulb me-1"></i>
              <strong>Dica:</strong> {conteudo.dicas}
            </small>
          </Alert>
        )}

        {conteudo.max_caracteres && conteudo.tipo !== 'imagem' && (
          <div className="mt-2 d-flex justify-content-between align-items-center">
            <Form.Text
              className={valor.length > conteudo.max_caracteres * 0.9 ? 'text-warning fw-bold' : 'text-muted'}
            >
              <i className="bi bi-fonts me-1"></i>
              {valor.length}/{conteudo.max_caracteres} caracteres
            </Form.Text>
            {valor.length > conteudo.max_caracteres * 0.9 && (
              <Badge bg="warning" className="animate-pulse">
                Limite próximo
              </Badge>
            )}
          </div>
        )}

        {isRequired && isEmpty && (
          <Alert variant="danger" className="mt-2 mb-0 py-2">
            <small>
              <i className="bi bi-exclamation-triangle-fill me-1"></i>
              <strong>Campo obrigatório</strong> - Este campo precisa ser preenchido
            </small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default CMSFieldSimple;