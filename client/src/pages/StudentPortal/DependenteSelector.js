import React, { useState, useEffect, useRef } from 'react';
import { Card, ListGroup, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaUser, FaUserGraduate, FaUsers } from 'react-icons/fa';
import { studentProfileService } from '../../services/api';
import './DependenteSelector.css';

const DependenteSelector = ({ onSelectDependente, selectedId }) => {
  const [dependentes, setDependentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    // Evitar múltiplas chamadas
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadDependentes();
  }, []);

  const loadDependentes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await studentProfileService.getDependentes();
      setDependentes(response.data.dependentes || []);
    } catch (err) {
      setError('Erro ao carregar dependentes: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getGraduacaoColor = (graduacao) => {
    const cores = {
      'Branca': '#FFFFFF',
      'Cinza': '#808080',
      'Amarela': '#FFD700',
      'Laranja': '#FFA500',
      'Verde': '#008000',
      'Azul': '#0000FF',
      'Roxa': '#800080',
      'Marrom': '#8B4513',
      'Preta': '#000000'
    };
    return cores[graduacao] || '#CCCCCC';
  };

  const calculateAge = (dataNascimento) => {
    if (!dataNascimento) return null;
    const today = new Date();
    const birthDate = new Date(dataNascimento);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) {
    return (
      <Card className="mb-3">
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" className="me-2" />
          Carregando dependentes...
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="mb-3">
        {error}
      </Alert>
    );
  }

  if (!dependentes || dependentes.length === 0) {
    return null;
  }

  // Só mostrar o seletor se houver mais de um dependente (próprio aluno + filhos)
  if (dependentes.length === 1) {
    return null;
  }

  return (
    <Card className="mb-4 shadow-sm dependente-selector-card">
      <Card.Header className="bg-primary text-white">
        <FaUsers className="me-2" />
        <strong>Selecionar Perfil</strong>
      </Card.Header>
      <Card.Body className="p-2">
        <ListGroup variant="flush">
          {dependentes.map((dep) => {
            const age = calculateAge(dep.data_nascimento);
            const isSelected = selectedId === dep.id;

            return (
              <ListGroup.Item
                key={dep.id}
                action
                active={isSelected}
                onClick={() => onSelectDependente(dep.id, dep.eh_proprio_aluno)}
                className={`dependente-item ${isSelected ? 'selected' : ''}`}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <div className="dependente-avatar me-3">
                      {dep.foto_url ? (
                        <img
                          src={dep.foto_url}
                          alt={dep.nome}
                          className="rounded-circle"
                          style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-secondary d-flex align-items-center justify-content-center"
                          style={{ width: '40px', height: '40px' }}
                        >
                          {dep.eh_proprio_aluno ? (
                            <FaUser className="text-white" />
                          ) : (
                            <FaUserGraduate className="text-white" />
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="fw-bold">{dep.nome}</div>
                      <small className="text-muted">
                        {dep.programa} • {age ? `${age} anos` : 'Idade não informada'}
                        {dep.eh_proprio_aluno && (
                          <Badge bg="primary" className="ms-2" pill>Você</Badge>
                        )}
                      </small>
                    </div>
                  </div>
                  <div className="text-end">
                    <div
                      className="graduacao-badge"
                      style={{
                        backgroundColor: getGraduacaoColor(dep.graduacao_atual_nome || dep.graduacao),
                        color: (dep.graduacao_atual_nome || dep.graduacao) === 'Branca' ? '#000' : '#FFF',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        border: (dep.graduacao_atual_nome || dep.graduacao) === 'Branca' ? '1px solid #ccc' : 'none'
                      }}
                    >
                      {dep.graduacao_atual_nome || dep.graduacao}
                    </div>
                    <small className="text-muted d-block mt-1">
                      Mat: {dep.matricula}
                    </small>
                  </div>
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      </Card.Body>
      {dependentes.length > 1 && (
        <Card.Footer className="text-muted text-center small">
          {dependentes.filter(d => !d.eh_proprio_aluno).length} dependente(s) sob sua responsabilidade
        </Card.Footer>
      )}
    </Card>
  );
};

export default DependenteSelector;
