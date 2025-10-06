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
  const [theme, setTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  // Verificar preferência salva ou do sistema ao carregar
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Verificar preferência salva no localStorage
        const savedTheme = localStorage.getItem('gb_theme');

        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
          setTheme(savedTheme);
        } else {
          // Verificar preferência do sistema
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          setTheme(prefersDark ? 'dark' : 'light');
        }
      } catch (error) {
        console.error('Erro ao inicializar tema:', error);
        setTheme('light'); // Fallback para tema claro
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();
  }, []);

  // Aplicar tema ao documento quando mudar
  useEffect(() => {
    if (!isLoading) {
      document.documentElement.setAttribute('data-theme', theme);
      document.body.className = theme === 'dark' ? 'theme-dark' : 'theme-light';
    }
  }, [theme, isLoading]);

  // Função para alternar tema
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    try {
      localStorage.setItem('gb_theme', newTheme);
    } catch (error) {
      console.error('Erro ao salvar preferência de tema:', error);
    }
  };

  // Função para definir tema específico
  const setSpecificTheme = (newTheme) => {
    if (newTheme === 'light' || newTheme === 'dark') {
      setTheme(newTheme);

      try {
        localStorage.setItem('gb_theme', newTheme);
      } catch (error) {
        console.error('Erro ao salvar preferência de tema:', error);
      }
    }
  };

  // Verificar se é tema escuro
  const isDark = theme === 'dark';

  // Obter classe CSS baseada no tema
  const getThemeClass = (lightClass = '', darkClass = '') => {
    return isDark ? darkClass : lightClass;
  };

  // Obter variável CSS baseada no tema
  const getThemeVar = (property) => {
    return `var(--${property}-${theme})`;
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