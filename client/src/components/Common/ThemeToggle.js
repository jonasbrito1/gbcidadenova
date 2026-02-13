import React from 'react';
import { Button, Dropdown } from 'react-bootstrap';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = ({ variant = 'simple' }) => {
  const { theme, isDark, toggleTheme, setTheme } = useTheme();

  if (variant === 'dropdown') {
    return (
      <Dropdown>
        <Dropdown.Toggle
          variant="outline-secondary"
          size="sm"
          className="d-flex align-items-center"
          style={{ border: 'none' }}
        >
          {isDark ? (
            <i className="fas fa-moon me-2"></i>
          ) : (
            <i className="fas fa-sun me-2"></i>
          )}
          Tema
        </Dropdown.Toggle>

        <Dropdown.Menu>
          <Dropdown.Item
            onClick={() => setTheme('light')}
            className={theme === 'light' ? 'active' : ''}
          >
            <i className="fas fa-sun me-2"></i>
            Claro
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() => setTheme('dark')}
            className={theme === 'dark' ? 'active' : ''}
          >
            <i className="fas fa-moon me-2"></i>
            Escuro
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
    );
  }

  // Variant simple (toggle button)
  return (
    <Button
      variant="outline-secondary"
      size="sm"
      onClick={toggleTheme}
      className="d-flex align-items-center theme-toggle-btn"
      title={`Alternar para tema ${isDark ? 'claro' : 'escuro'}`}
      style={{
        border: 'none',
        background: 'transparent',
        transition: 'all 0.3s ease'
      }}
    >
      {isDark ? (
        <>
          <i className="fas fa-sun me-2"></i>
          <span className="d-none d-md-inline">Claro</span>
        </>
      ) : (
        <>
          <i className="fas fa-moon me-2"></i>
          <span className="d-none d-md-inline">Escuro</span>
        </>
      )}
    </Button>
  );
};

export default ThemeToggle;