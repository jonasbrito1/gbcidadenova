// Serviço dedicado para CMS
class CMSService {
  constructor() {
    this.baseURL = 'http://localhost:3011/api/cms';
    this.cache = new Map();
  }

  // Limpar cache específico
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  // Buscar todas as seções
  async getSecoes() {
    const cacheKey = 'secoes';

    try {
      const response = await fetch(`${this.baseURL}/secoes`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        this.cache.set(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao buscar seções:', error);
      throw error;
    }
  }

  // Buscar seção específica
  async getSecao(id) {
    const cacheKey = `secao_${id}`;

    try {
      const response = await fetch(`${this.baseURL}/secoes/${id}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        this.cache.set(cacheKey, data.data);
        return data.data;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao buscar seção:', error);
      throw error;
    }
  }

  // Atualizar conteúdo
  async updateConteudo(conteudoId, valor) {
    try {
      const response = await fetch(`${this.baseURL}/conteudos/${conteudoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valor }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Limpar cache relacionado
        this.clearCache();
        return data.data;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro ao atualizar conteúdo:', error);
      throw error;
    }
  }

  // Upload de imagem
  async uploadImagem(conteudoId, file, altText = '') {
    try {
      const formData = new FormData();
      formData.append('imagem', file);
      formData.append('altText', altText);

      const response = await fetch(`${this.baseURL}/upload/${conteudoId}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        // Limpar cache relacionado
        this.clearCache();
        return data.data.upload;
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      throw error;
    }
  }

  // Buscar conteúdo público
  async getConteudoPublico() {
    try {
      const response = await fetch(`${this.baseURL}/public/conteudo`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erro ao buscar conteúdo público:', error);
      throw error;
    }
  }
}

// Singleton instance
const cmsService = new CMSService();

export default cmsService;