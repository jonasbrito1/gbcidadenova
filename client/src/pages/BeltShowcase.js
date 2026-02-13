import React, { useState } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import BeltBadge from '../components/Common/BeltBadge';

/**
 * Página de Demonstração das Faixas
 * Use esta página para visualizar todas as graduações disponíveis
 * Acesse em: /belt-showcase (apenas desenvolvimento)
 */
const BeltShowcase = () => {
  const [selectedSize, setSelectedSize] = useState('medium');
  const [showLabels, setShowLabels] = useState(true);

  const graduacoes = {
    kids: [
      { nome: 'Branca Kids', graus: [0, 1, 2, 3, 4] },
      { nome: 'Cinza Kids', graus: [0, 1, 2, 3, 4] },
      { nome: 'Amarela Kids', graus: [0, 1, 2, 3, 4] },
      { nome: 'Laranja Kids', graus: [0, 1, 2, 3, 4] },
      { nome: 'Verde Kids', graus: [0, 1, 2, 3, 4] },
      { nome: 'Coral Kids', graus: [0, 1, 2, 3, 4] }
    ],
    adultos: [
      { nome: 'Branca', graus: [0, 1, 2, 3, 4] },
      { nome: 'Azul', graus: [0, 1, 2, 3, 4] },
      { nome: 'Roxa', graus: [0, 1, 2, 3, 4] },
      { nome: 'Marrom', graus: [0, 1, 2, 3, 4] },
      { nome: 'Preta', graus: [0, 1, 2, 3, 4] }
    ],
    master: [
      { nome: 'Preta Master', graus: [0] },
      { nome: 'Coral Master', graus: [0] },
      { nome: 'Vermelha Master', graus: [0] }
    ],
    dans: [
      { nome: '1º Dan', graus: [0] },
      { nome: '2º Dan', graus: [0] },
      { nome: '3º Dan', graus: [0] },
      { nome: '4º Dan', graus: [0] },
      { nome: '5º Dan', graus: [0] },
      { nome: '6º Dan', graus: [0] },
      { nome: '7º Dan', graus: [0] },
      { nome: '8º Dan', graus: [0] },
      { nome: '9º Dan', graus: [0] },
      { nome: '10º Dan', graus: [0] }
    ]
  };

  return (
    <Container fluid className="py-4">
      <h1 className="mb-4">🥋 Showcase de Faixas - Gracie Barra</h1>

      {/* Controles */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Tamanho</Form.Label>
                <Form.Select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  <option value="small">Pequeno</option>
                  <option value="medium">Médio</option>
                  <option value="large">Grande</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Mostrar Labels</Form.Label>
                <Form.Check
                  type="switch"
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                  label={showLabels ? 'Sim' : 'Não'}
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Faixas Kids */}
      <Card className="mb-4">
        <Card.Header>
          <h3>Graduações Kids/Infantil</h3>
        </Card.Header>
        <Card.Body>
          {graduacoes.kids.map((grad) => (
            <div key={grad.nome} className="mb-4">
              <h5 className="mb-3">{grad.nome}</h5>
              <div className="d-flex flex-wrap gap-3">
                {grad.graus.map((grau) => (
                  <div key={`${grad.nome}-${grau}`}>
                    <BeltBadge
                      graduacao={grad.nome}
                      graus={grau}
                      size={selectedSize}
                      showLabel={showLabels}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      {/* Faixas Adultos */}
      <Card className="mb-4">
        <Card.Header>
          <h3>Graduações Adultos</h3>
        </Card.Header>
        <Card.Body>
          {graduacoes.adultos.map((grad) => (
            <div key={grad.nome} className="mb-4">
              <h5 className="mb-3">{grad.nome}</h5>
              <div className="d-flex flex-wrap gap-3">
                {grad.graus.map((grau) => (
                  <div key={`${grad.nome}-${grau}`}>
                    <BeltBadge
                      graduacao={grad.nome}
                      graus={grau}
                      size={selectedSize}
                      showLabel={showLabels}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card.Body>
      </Card>

      {/* Faixas Master */}
      <Card className="mb-4">
        <Card.Header>
          <h3>Graduações Master</h3>
        </Card.Header>
        <Card.Body>
          <div className="d-flex flex-wrap gap-3">
            {graduacoes.master.map((grad) => (
              <div key={grad.nome}>
                <BeltBadge
                  graduacao={grad.nome}
                  graus={0}
                  size={selectedSize}
                  showLabel={showLabels}
                />
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Dans */}
      <Card className="mb-4">
        <Card.Header>
          <h3>Dans (Graus de Faixa Preta)</h3>
        </Card.Header>
        <Card.Body>
          <div className="d-flex flex-wrap gap-3">
            {graduacoes.dans.map((grad) => (
              <div key={grad.nome}>
                <BeltBadge
                  graduacao={grad.nome}
                  graus={0}
                  size={selectedSize}
                  showLabel={showLabels}
                />
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      {/* Código de Exemplo */}
      <Card className="mb-4">
        <Card.Header>
          <h3>📝 Código de Exemplo</h3>
        </Card.Header>
        <Card.Body>
          <pre style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '5px' }}>
            <code>{`import BeltBadge from '../components/Common/BeltBadge';

// Exemplo básico
<BeltBadge graduacao="Azul" graus={2} />

// Exemplo com tamanho personalizado
<BeltBadge
  graduacao="Preta"
  graus={4}
  size="large"
/>

// Exemplo sem label
<BeltBadge
  graduacao="Roxa"
  graus={1}
  size="small"
  showLabel={false}
/>`}</code>
          </pre>
        </Card.Body>
      </Card>

      {/* Dicas de Uso */}
      <Card>
        <Card.Header>
          <h3>💡 Dicas de Uso no Sistema</h3>
        </Card.Header>
        <Card.Body>
          <h5>1. Lista de Alunos</h5>
          <p>Use <code>size="small"</code> e <code>showLabel=&#123;false&#125;</code> para economizar espaço</p>

          <h5 className="mt-3">2. Perfil do Aluno</h5>
          <p>Use <code>size="large"</code> para destacar a graduação atual</p>

          <h5 className="mt-3">3. Dashboard</h5>
          <p>Use <code>size="medium"</code> com labels para estatísticas</p>

          <h5 className="mt-3">4. Histórico de Graduações</h5>
          <p>Use <code>size="small"</code> em uma timeline para mostrar progressão</p>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BeltShowcase;
