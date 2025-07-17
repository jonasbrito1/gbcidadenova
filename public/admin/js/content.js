/**
 * Gerenciador de Conteúdo - Gracie Barra CMS
 * Arquivo: public/admin/js/content.js
 */

'use strict';

class ContentManager {
    static API_BASE = '../api/';
    static cache = new Map();
    static cacheTimeout = 5 * 60 * 1000; // 5 minutos
    static autoSaveDelay = 3000; // 3 segundos
    static autoSaveTimeouts = new Map();
    
    /**
     * Obtém todo o conteúdo do site
     */
    static async getAllContent(useCache = true) {
        const cacheKey = 'all_content';
        
        // Verificar cache
        if (useCache && this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }
        
        try {
            const response = await this.apiRequest('content/sections');
            
            if (response.success) {
                // Salvar no cache
                this.setCache(cacheKey, response.content);
                return response.content;
            } else {
                throw new Error(response.message || 'Erro ao carregar conteúdo');
            }
            
        } catch (error) {
            console.error('Erro ao carregar todo o conteúdo:', error);
            
            // Retornar cache se disponível em caso de erro
            if (this.cache.has(cacheKey)) {
                console.warn('Usando conteúdo do cache devido a erro');
                return this.cache.get(cacheKey).data;
            }
            
            throw error;
        }
    }
    
    /**
     * Obtém conteúdo de uma seção específica
     */
    static async getSectionContent(section, useCache = true) {
        const cacheKey = `section_${section}`;
        
        // Verificar cache
        if (useCache && this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey).data;
        }
        
        try {
            const response = await this.apiRequest(`content/sections/${encodeURIComponent(section)}`);
            
            if (response.success) {
                // Salvar no cache
                this.setCache(cacheKey, response.content);
                return response.content;
            } else {
                throw new Error(response.message || 'Erro ao carregar seção');
            }
            
        } catch (error) {
            console.error(`Erro ao carregar seção ${section}:`, error);
            
            // Retornar cache se disponível
            if (this.cache.has(cacheKey)) {
                console.warn('Usando conteúdo do cache devido a erro');
                return this.cache.get(cacheKey).data;
            }
            
            throw error;
        }
    }
    
    /**
     * Atualiza conteúdo de uma seção
     */
    static async updateSectionContent(section, data, options = {}) {
        try {
            // Verificar permissões
            if (!AuthManager.canEdit()) {
                throw new Error('Sem permissão para editar conteúdo');
            }
            
            const response = await this.apiRequest(`content/sections/${encodeURIComponent(section)}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            if (response.success) {
                // Invalidar cache relacionado
                this.invalidateCache(`section_${section}`);
                this.invalidateCache('all_content');
                
                // Mostrar sucesso se não for silencioso
                if (!options.silent) {
                    this.showSuccessMessage(response.message || 'Seção atualizada com sucesso');
                }
                
                // Emitir evento personalizado
                this.emitContentUpdated(section, data);
                
                return response;
            } else {
                throw new Error(response.message || 'Erro ao atualizar seção');
            }
            
        } catch (error) {
            console.error(`Erro ao atualizar seção ${section}:`, error);
            
            if (!options.silent) {
                this.showErrorMessage('Erro ao salvar: ' + error.message);
            }
            
            throw error;
        }
    }
    
    /**
     * Remove um campo específico
     */
    static async removeField(section, fieldName) {
        try {
            if (!AuthManager.canEdit()) {
                throw new Error('Sem permissão para editar conteúdo');
            }
            
            const response = await this.apiRequest('content/field', {
                method: 'DELETE',
                body: JSON.stringify({
                    section: section,
                    field_name: fieldName
                })
            });
            
            if (response.success) {
                // Invalidar cache
                this.invalidateCache(`section_${section}`);
                this.invalidateCache('all_content');
                
                this.showSuccessMessage(response.message || 'Campo removido com sucesso');
                return response;
            } else {
                throw new Error(response.message || 'Erro ao remover campo');
            }
            
        } catch (error) {
            console.error(`Erro ao remover campo ${fieldName}:`, error);
            this.showErrorMessage('Erro ao remover campo: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Busca conteúdo por termo
     */
    static async searchContent(term, sections = null) {
        try {
            const params = new URLSearchParams({ q: term });
            
            if (sections && Array.isArray(sections)) {
                params.append('sections', sections.join(','));
            }
            
            const response = await this.apiRequest(`content/search?${params}`);
            
            if (response.success) {
                return {
                    results: response.results,
                    count: response.count,
                    query: response.query
                };
            } else {
                throw new Error(response.message || 'Erro na busca');
            }
            
        } catch (error) {
            console.error('Erro na busca:', error);
            throw error;
        }
    }
    
    /**
     * Cria backup de uma seção
     */
    static async createBackup(section) {
        try {
            if (!AuthManager.canEdit()) {
                throw new Error('Sem permissão para criar backups');
            }
            
            const response = await this.apiRequest('content/backup', {
                method: 'POST',
                body: JSON.stringify({ section })
            });
            
            if (response.success) {
                this.showSuccessMessage('Backup criado com sucesso');
                return response;
            } else {
                throw new Error(response.message || 'Erro ao criar backup');
            }
            
        } catch (error) {
            console.error(`Erro ao criar backup da seção ${section}:`, error);
            this.showErrorMessage('Erro ao criar backup: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Lista backups disponíveis
     */
    static async getBackups(section = null, limit = 50) {
        try {
            const params = new URLSearchParams();
            
            if (section) {
                params.append('section', section);
            }
            
            if (limit) {
                params.append('limit', limit.toString());
            }
            
            const response = await this.apiRequest(`content/backup?${params}`);
            
            if (response.success) {
                return response.backups;
            } else {
                throw new Error(response.message || 'Erro ao listar backups');
            }
            
        } catch (error) {
            console.error('Erro ao listar backups:', error);
            throw error;
        }
    }
    
    /**
     * Restaura backup
     */
    static async restoreBackup(backupId) {
        try {
            if (!AuthManager.canEdit()) {
                throw new Error('Sem permissão para restaurar backups');
            }
            
            const confirmed = confirm('Tem certeza que deseja restaurar este backup? As alterações atuais serão perdidas.');
            if (!confirmed) {
                return { success: false, message: 'Operação cancelada' };
            }
            
            const response = await this.apiRequest('content/restore', {
                method: 'POST',
                body: JSON.stringify({ backup_id: backupId })
            });
            
            if (response.success) {
                // Invalidar todo o cache
                this.clearCache();
                
                this.showSuccessMessage('Backup restaurado com sucesso');
                
                // Recarregar página para refletir mudanças
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                
                return response;
            } else {
                throw new Error(response.message || 'Erro ao restaurar backup');
            }
            
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            this.showErrorMessage('Erro ao restaurar backup: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Obtém estatísticas do conteúdo
     */
    static async getStats() {
        try {
            const response = await this.apiRequest('content/stats');
            
            if (response.success) {
                return response.stats;
            } else {
                throw new Error(response.message || 'Erro ao obter estatísticas');
            }
            
        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            throw error;
        }
    }
    
    /**
     * Configura auto-save para um formulário
     */
    static setupAutoSave(form, section) {
        if (!form || !section) return;
        
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            ['input', 'change', 'paste'].forEach(eventType => {
                input.addEventListener(eventType, () => {
                    this.scheduleAutoSave(form, section);
                });
            });
        });
    }
    
    /**
     * Agenda auto-save com delay
     */
    static scheduleAutoSave(form, section) {
        // Cancelar auto-save anterior se existir
        if (this.autoSaveTimeouts.has(section)) {
            clearTimeout(this.autoSaveTimeouts.get(section));
        }
        
        // Agendar novo auto-save
        const timeoutId = setTimeout(async () => {
            try {
                const formData = this.extractFormData(form);
                await this.updateSectionContent(section, formData, { silent: true });
                
                this.showAutoSaveIndicator(true);
                
            } catch (error) {
                console.warn('Erro no auto-save:', error);
                this.showAutoSaveIndicator(false);
            }
        }, this.autoSaveDelay);
        
        this.autoSaveTimeouts.set(section, timeoutId);
    }
    
    /**
     * Extrai dados do formulário
     */
    static extractFormData(form) {
        const formData = new FormData(form);
        const data = {};
        
        for (const [key, value] of formData.entries()) {
            // Processar tipos especiais
            if (key === 'menu_items') {
                // Converter textarea de menu em array
                data[key] = value.split('\n')
                    .map(item => item.trim())
                    .filter(item => item.length > 0);
            } else if (key.endsWith('_json')) {
                // Tentar fazer parse de campos JSON
                try {
                    data[key] = JSON.parse(value);
                } catch (e) {
                    data[key] = value;
                }
            } else {
                data[key] = value;
            }
        }
        
        return data;
    }
    
    /**
     * Mostra indicador de auto-save
     */
    static showAutoSaveIndicator(success) {
        const indicator = this.getOrCreateAutoSaveIndicator();
        
        indicator.textContent = success ? '✓ Auto-salvo' : '⚠ Erro no auto-save';
        indicator.className = `auto-save-indicator ${success ? 'success' : 'error'}`;
        indicator.style.display = 'block';
        
        // Esconder após 3 segundos
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 3000);
    }
    
    /**
     * Cria ou obtém indicador de auto-save
     */
    static getOrCreateAutoSaveIndicator() {
        let indicator = document.getElementById('autoSaveIndicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'autoSaveIndicator';
            indicator.className = 'auto-save-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: 500;
                z-index: 9999;
                display: none;
                transition: all 0.3s ease;
            `;
            
            document.body.appendChild(indicator);
            
            // Adicionar estilos CSS
            if (!document.getElementById('autoSaveStyles')) {
                const style = document.createElement('style');
                style.id = 'autoSaveStyles';
                style.textContent = `
                    .auto-save-indicator.success {
                        background: #d1fae5;
                        color: #065f46;
                        border: 1px solid #a7f3d0;
                    }
                    .auto-save-indicator.error {
                        background: #fef2f2;
                        color: #dc2626;
                        border: 1px solid #fecaca;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        return indicator;
    }
    
    /**
     * Emite evento personalizado quando conteúdo é atualizado
     */
    static emitContentUpdated(section, data) {
        const event = new CustomEvent('contentUpdated', {
            detail: { section, data }
        });
        
        document.dispatchEvent(event);
    }
    
    // ===== MÉTODOS DE CACHE =====
    
    static setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }
    
    static isCacheValid(key) {
        const cached = this.cache.get(key);
        if (!cached) return false;
        
        return (Date.now() - cached.timestamp) < this.cacheTimeout;
    }
    
    static invalidateCache(key) {
        this.cache.delete(key);
    }
    
    static clearCache() {
        this.cache.clear();
    }
    
    // ===== MÉTODOS DE UI =====
    
    static showSuccessMessage(message) {
        if (window.AdminSystem && window.AdminSystem.showSuccess) {
            window.AdminSystem.showSuccess(message);
        } else {
            console.log('✓', message);
        }
    }
    
    static showErrorMessage(message) {
        if (window.AdminSystem && window.AdminSystem.showError) {
            window.AdminSystem.showError(message);
        } else {
            console.error('✗', message);
        }
    }
    
    // ===== MÉTODO DE API =====
    
    static async apiRequest(endpoint, options = {}) {
        if (window.AuthManager && window.AuthManager.apiRequest) {
            return await window.AuthManager.apiRequest(`content/${endpoint}`, options);
        } else {
            // Fallback se AuthManager não estiver disponível
            const url = this.API_BASE + 'content/' + endpoint;
            
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            };
            
            const finalOptions = {
                ...defaultOptions,
                ...options,
                headers: {
                    ...defaultOptions.headers,
                    ...(options.headers || {})
                }
            };
            
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        }
    }
    
    /**
     * Inicializa o gerenciador de conteúdo
     */
    static init() {
        // Configurar limpeza de cache periódica
        setInterval(() => {
            this.cleanupExpiredCache();
        }, 60000); // A cada minuto
        
        // Listener para eventos de conteúdo atualizado
        document.addEventListener('contentUpdated', (event) => {
            console.log('Conteúdo atualizado:', event.detail);
        });
        
        console.log('ContentManager inicializado');
    }
    
    /**
     * Remove itens expirados do cache
     */
    static cleanupExpiredCache() {
        const now = Date.now();
        
        for (const [key, cached] of this.cache.entries()) {
            if ((now - cached.timestamp) > this.cacheTimeout) {
                this.cache.delete(key);
            }
        }
    }
    
    /**
     * Destroi o gerenciador e limpa recursos
     */
    static destroy() {
        // Cancelar todos os auto-saves pendentes
        for (const timeoutId of this.autoSaveTimeouts.values()) {
            clearTimeout(timeoutId);
        }
        this.autoSaveTimeouts.clear();
        
        // Limpar cache
        this.clearCache();
        
        // Remover indicador de auto-save
        const indicator = document.getElementById('autoSaveIndicator');
        if (indicator) {
            indicator.remove();
        }
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    ContentManager.init();
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    ContentManager.destroy();
});

// Export para outros módulos
window.ContentManager = ContentManager;