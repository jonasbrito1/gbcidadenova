import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Tema fixo em 'light' - tema escuro removido
  const [theme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // Inicializar tema (sempre claro)
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Remover qualquer preferência antiga de tema escuro
        localStorage.removeItem('gb_theme');
      } catch (error) {
        console.error('Erro ao inicializar tema:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  // Aplicar tema claro ao documento
  useEffect(() => {
    if (!isLoading) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.className = 'theme-light';
    }
  }, [isLoading]);

  // Funções mantidas para compatibilidade (mas não fazem nada)
  const toggleTheme = () => {
    // Tema fixo - função mantida apenas para não quebrar código existente
  };

  const setSpecificTheme = () => {
    // Tema fixo - função mantida apenas para não quebrar código existente
  };

  // Sempre retorna false (tema claro fixo)
  const isDark = false;

  // Sempre retorna lightClass
  const getThemeClass = (lightClass = '') => {
    return lightClass;
  };

  // Sempre retorna variável light
  const getThemeVar = (property) => {
    return `var(--${property}-light)`;
  };

  const value = {
    theme,
    isDark,
    isLoading,
    toggleTheme,
    setTheme: setSpecificTheme,
    getThemeClass,
    getThemeVar
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};