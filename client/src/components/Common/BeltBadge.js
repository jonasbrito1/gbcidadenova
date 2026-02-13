import React from 'react';
import './BeltBadge.css';

/**
 * Componente de Badge de Faixa de Jiu-Jitsu - Estilo Horizontal Simples
 * Barra horizontal com graus na extremidade
 *
 * @param {string} graduacao - Nome da graduação (ex: "Branca", "Azul", "Preta")
 * @param {number} graus - Número de graus/listras na faixa (0-4)
 * @param {string} size - Tamanho: "small", "medium", "large" (padrão: "medium")
 * @param {boolean} showLabel - Mostrar nome da graduação (padrão: true)
 */
const BeltBadge = ({
  graduacao = 'Branca',
  graus = 0,
  size = 'medium',
  showLabel = true
}) => {
  // Mapear cores das faixas
  const beltColors = {
    // Kids/Infantil
    'Branca Kids': { main: '#FFFFFF', border: '#999999', degree: '#000000' },
    'Cinza Kids': { main: '#9E9E9E', border: '#424242', degree: '#FFFFFF' },
    'Amarela Kids': { main: '#FFD700', border: '#F57C00', degree: '#000000' },
    'Laranja Kids': { main: '#FF9800', border: '#D84315', degree: '#000000' },
    'Verde Kids': { main: '#4CAF50', border: '#1B5E20', degree: '#FFFFFF' },
    'Coral Kids': { main: '#FF6B6B', border: '#C62828', degree: '#FFFFFF' },

    // Adultos
    'Branca': { main: '#FFFFFF', border: '#999999', degree: '#000000' },
    'Azul': { main: '#1976D2', border: '#0D47A1', degree: '#FFFFFF' },
    'Roxa': { main: '#7B1FA2', border: '#4A148C', degree: '#FFFFFF' },
    'Marrom': { main: '#6D4C41', border: '#3E2723', degree: '#FFFFFF' },
    'Preta': { main: '#000000', border: '#666666', degree: '#DC143C' },

    // Master
    'Preta Master': { main: '#000000', border: '#8B0000', degree: '#DC143C' },
    'Coral Master': { main: '#E63946', border: '#000000', degree: '#FFFFFF' },
    'Vermelha Master': { main: '#DC143C', border: '#8B0000', degree: '#FFFFFF' },

    // Dans
    '1º Dan': { main: '#000000', border: '#666666', degree: '#DC143C' },
    '2º Dan': { main: '#000000', border: '#666666', degree: '#DC143C' },
    '3º Dan': { main: '#000000', border: '#666666', degree: '#DC143C' },
    '4º Dan': { main: '#000000', border: '#666666', degree: '#DC143C' },
    '5º Dan': { main: '#000000', border: '#666666', degree: '#DC143C' },
    '6º Dan': { main: '#DC143C', border: '#8B0000', degree: '#FFFFFF' },
    '7º Dan': { main: '#E63946', border: '#000000', degree: '#DC143C' },
    '8º Dan': { main: '#FFFFFF', border: '#B71C1C', degree: '#DC143C' },
    '9º Dan': { main: '#DC143C', border: '#8B0000', degree: '#FFFFFF' },
    '10º Dan': { main: '#FFFFFF', border: '#9A7D0A', degree: '#DC143C' }
  };

  // Cor padrão se não encontrar
  const colors = beltColors[graduacao] || beltColors['Branca'];

  // Validar número de graus (máximo 4)
  const validGraus = Math.min(Math.max(0, graus), 4);

  return (
    <div className={`belt-bar belt-bar-${size}`}>
      {/* Barra da faixa */}
      <div
        className="belt-bar-main"
        style={{
          backgroundColor: colors.main,
          borderColor: colors.border
        }}
      >
        {/* Graus na extremidade direita */}
        {validGraus > 0 && (
          <div className="belt-bar-degrees">
            {Array.from({ length: validGraus }).map((_, index) => (
              <div
                key={index}
                className="belt-bar-degree"
                style={{
                  backgroundColor: colors.degree
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Label com nome da graduação */}
      {showLabel && (
        <div className="belt-bar-label">
          <span className="belt-bar-label-text">
            {graduacao}
            {validGraus > 0 && (
              <span className="belt-bar-label-degrees"> ({validGraus}°)</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
};

export default BeltBadge;
