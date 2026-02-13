import { useState, useEffect } from 'react';
import axios from 'axios';

/**
 * Hook customizado para buscar e atualizar dados do CMS
 * @param {number} refreshInterval - Intervalo de atualização em ms (padrão: 5000ms)
 * @returns {Object} { data, loading, error, refresh }
 */
const useCMSData = (refreshInterval = 5000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await axios.get('/api/cms/landing-page');
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar dados do CMS:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Buscar dados imediatamente
    fetchData();

    // Atualizar periodicamente
    const interval = setInterval(fetchData, refreshInterval);

    // Cleanup
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { data, loading, error, refresh: fetchData };
};

export default useCMSData;
