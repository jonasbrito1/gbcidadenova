/**
 * Gerenciador de Arquivos - Gracie Barra CMS
 * Arquivo: public/admin/js/files.js
 */

'use strict';

class FileManager {
    static API_BASE = '../api/';
    static allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    static maxFileSize = 5 * 1024 * 1024; // 5MB
    static uploadQueue = [];
    static isUploading = false;
    
    /**
     * Faz upload de um arquivo
     */
    static async uploadFile(file, options = {}) {
        try {
            // Validar arquivo
            this.validateFile(file);
            
            // Verificar permissões
            if (!AuthManager.hasPermission('upload')) {
                throw new Error('Sem permissão para fazer upload de arquivos');
            }
            
            const formData = new FormData();
            formData.append('file', file);
            
            if (options.altText) {
                formData.append('alt_text', options.altText);
            }
            
            if (options.description) {
                formData.append('description', options.description);
            }
            
            const response = await this.apiRequest('files/upload', {
                method: 'POST',
                body: formData,
                // Não definir Content-Type para FormData
                headers: {}
            });
            
            if (response.success) {
                this.showSuccessMessage(`Arquivo ${file.name} enviado com sucesso`);
                
                // Emitir evento de upload concluído
                this.emitFileUploaded(response);
                
                return response;
            } else {
                throw new Error(response.message || 'Erro no upload');
            }
            
        } catch (error) {
            console.error('Erro no upload:', error);
            this.showErrorMessage(`Erro ao enviar ${file.name}: ${error.message}`);
            throw error;
        }
    }
    
    /**
     * Faz upload de múltiplos arquivos
     */
    static async uploadMultipleFiles(files, options = {}) {
        const results = [];
        let successCount = 0;
        
        // Adicionar à fila de upload
        for (const file of files) {
            this.uploadQueue.push({ file, options });
        }
        
        // Processar fila se não estiver processando
        if (!this.isUploading) {
            this.processUploadQueue();
        }
        
        return {
            success: true,
            message: `${files.length} arquivos adicionados à fila de upload`
        };
    }
    
    /**
     * Processa fila de upload
     */
    static async processUploadQueue() {
        if (this.isUploading || this.uploadQueue.length === 0) {
            return;
        }
        
        this.isUploading = true;
        const totalFiles = this.uploadQueue.length;
        let processedFiles = 0;
        let successCount = 0;
        
        this.showUploadProgress(0, totalFiles);
        
        while (this.uploadQueue.length > 0) {
            const { file, options } = this.uploadQueue.shift();
            
            try {
                await this.uploadFile(file, options);
                successCount++;
            } catch (error) {
                console.error(`Erro no upload de ${file.name}:`, error);
            }
            
            processedFiles++;
            this.showUploadProgress(processedFiles, totalFiles);
        }
        
        this.isUploading = false;
        this.hideUploadProgress();
        
        this.showSuccessMessage(`Upload concluído: ${successCount}/${totalFiles} arquivos enviados`);
    }
    
    /**
     * Lista arquivos com filtros
     */
    static async getFiles(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value.toString());
                }
            });
            
            const response = await this.apiRequest(`files/list?${params}`);
            
            if (response.success) {
                return response.files;
            } else {
                throw new Error(response.message || 'Erro ao listar arquivos');
            }
            
        } catch (error) {
            console.error('Erro ao listar arquivos:', error);
            throw error;
        }
    }
    
    /**
     * Obtém detalhes de um arquivo
     */
    static async getFileDetails(fileId) {
        try {
            const response = await this.apiRequest(`files/details/${fileId}`);
            
            if (response.success) {
                return response.file;
            } else {
                throw new Error(response.message || 'Arquivo não encontrado');
            }
            
        } catch (error) {
            console.error(`Erro ao obter detalhes do arquivo ${fileId}:`, error);
            throw error;
        }
    }
    
    /**
     * Atualiza informações de um arquivo
     */
    static async updateFile(fileId, data) {
        try {
            if (!AuthManager.canEdit()) {
                throw new Error('Sem permissão para editar arquivos');
            }
            
            const response = await this.apiRequest(`files/details/${fileId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            if (response.success) {
                this.showSuccessMessage('Arquivo atualizado com sucesso');
                
                // Emitir evento de arquivo atualizado
                this.emitFileUpdated(fileId, data);
                
                return response;
            } else {
                throw new Error(response.message || 'Erro ao atualizar arquivo');
            }
            
        } catch (error) {
            console.error(`Erro ao atualizar arquivo ${fileId}:`, error);
            this.showErrorMessage('Erro ao atualizar arquivo: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Remove um arquivo
     */
    static async deleteFile(fileId, fileName = '') {
        try {
            if (!AuthManager.canEdit()) {
                throw new Error('Sem permissão para remover arquivos');
            }
            
            const confirmed = confirm(`Tem certeza que deseja remover o arquivo${fileName ? ` "${fileName}"` : ''}? Esta ação não pode ser desfeita.`);
            if (!confirmed) {
                return { success: false, message: 'Operação cancelada' };
            }
            
            const response = await this.apiRequest(`files/details/${fileId}`, {
                method: 'DELETE'
            });
            
            if (response.success) {
                this.showSuccessMessage('Arquivo removido com sucesso');
                
                // Emitir evento de arquivo removido
                this.emitFileDeleted(fileId);
                
                return response;
            } else {
                throw new Error(response.message || 'Erro ao remover arquivo');
            }
            
        } catch (error) {
            console.error(`Erro ao remover arquivo ${fileId}:`, error);
            this.showErrorMessage('Erro ao remover arquivo: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Obtém estatísticas de arquivos
     */
    static async getStats() {
        try {
            const response = await this.apiRequest('files/stats');
            
            if (response.success) {
                return response.stats;
            } else {
                throw new Error(response.message || 'Erro ao obter estatísticas');
            }
            
        } catch (error) {
            console.error('Erro ao obter estatísticas de arquivos:', error);
            throw error;
        }
    }
    
    /**
     * Limpa arquivos órfãos
     */
    static async cleanupOrphanFiles() {
        try {
            if (!AuthManager.isAdmin()) {
                throw new Error('Apenas administradores podem fazer limpeza de arquivos');
            }
            
            const confirmed = confirm('Tem certeza que deseja limpar arquivos órfãos? Esta operação remove arquivos que não estão sendo utilizados.');
            if (!confirmed) {
                return { success: false, message: 'Operação cancelada' };
            }
            
            const response = await this.apiRequest('files/cleanup', {
                method: 'POST'
            });
            
            if (response.success) {
                this.showSuccessMessage(`Limpeza concluída: ${response.orphan_count} arquivos removidos`);
                return response;
            } else {
                throw new Error(response.message || 'Erro na limpeza');
            }
            
        } catch (error) {
            console.error('Erro na limpeza de arquivos:', error);
            this.showErrorMessage('Erro na limpeza: ' + error.message);
            throw error;
        }
    }
    
    /**
     * Configura drag and drop para upload
     */
    static setupDragAndDrop(dropZone, options = {}) {
        if (!dropZone) return;
        
        const defaultOptions = {
            allowMultiple: true,
            showPreview: true,
            onFilesAdded: null,
            ...options
        };
        
        // Prevenir comportamento padrão
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        // Visual feedback
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('dragover');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('dragover');
            });
        });
        
        // Handle drop
        dropZone.addEventListener('drop', (e) => {
            const files = Array.from(e.dataTransfer.files);
            
            if (files.length > 0) {
                this.handleFilesAdded(files, defaultOptions);
            }
        });
        
        // Handle click to select files
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = defaultOptions.allowMultiple;
            input.accept = this.allowedTypes.join(',');
            
            input.addEventListener('change', () => {
                if (input.files.length > 0) {
                    const files = Array.from(input.files);
                    this.handleFilesAdded(files, defaultOptions);
                }
            });
            
            input.click();
        });
    }
    
    /**
     * Manipula arquivos adicionados
     */
    static handleFilesAdded(files, options) {
        const validFiles = [];
        const invalidFiles = [];
        
        files.forEach(file => {
            try {
                this.validateFile(file);
                validFiles.push(file);
            } catch (error) {
                invalidFiles.push({ file, error: error.message });
            }
        });
        
        // Mostrar erros para arquivos inválidos
        if (invalidFiles.length > 0) {
            invalidFiles.forEach(({ file, error }) => {
                this.showErrorMessage(`${file.name}: ${error}`);
            });
        }
        
        // Processar arquivos válidos
        if (validFiles.length > 0) {
            if (options.onFilesAdded) {
                options.onFilesAdded(validFiles);
            } else {
                this.uploadMultipleFiles(validFiles);
            }
            
            if (options.showPreview) {
                this.showUploadPreview(validFiles);
            }
        }
    }
    
    /**
     * Mostra preview dos arquivos antes do upload
     */
    static showUploadPreview(files) {
        const container = this.getOrCreatePreviewContainer();
        container.innerHTML = '';
        
        files.forEach((file, index) => {
            const preview = this.createFilePreview(file, index);
            container.appendChild(preview);
        });
        
        container.style.display = 'block';
    }
    
    /**
     * Cria preview de um arquivo
     */
    static createFilePreview(file, index) {
        const preview = document.createElement('div');
        preview.className = 'file-preview';
        preview.dataset.index = index;
        
        let content = '';
        
        if (file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            content = `
                <img src="${url}" alt="${file.name}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px;">
            `;
        } else {
            content = `
                <div style="width: 100px; height: 100px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                    <i class="bi bi-file-earmark" style="font-size: 2rem; color: #666;"></i>
                </div>
            `;
        }
        
        preview.innerHTML = `
            ${content}
            <div style="margin-top: 8px; text-align: center;">
                <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px;">${file.name}</div>
                <div style="font-size: 11px; color: #666;">${this.formatFileSize(file.size)}</div>
            </div>
            <button type="button" onclick="FileManager.removeFromPreview(${index})" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 12px; cursor: pointer;">×</button>
        `;
        
        preview.style.cssText = `
            position: relative;
            display: inline-block;
            margin: 8px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        
        return preview;
    }
    
    /**
     * Remove arquivo do preview
     */
    static removeFromPreview(index) {
        const preview = document.querySelector(`[data-index="${index}"]`);
        if (preview) {
            preview.remove();
        }
        
        // Remover da fila de upload se ainda não foi processado
        this.uploadQueue = this.uploadQueue.filter((item, i) => i !== index);
    }
    
    /**
     * Copia URL do arquivo para clipboard
     */
    static async copyFileUrl(url, fileName = '') {
        try {
            await navigator.clipboard.writeText(url);
            this.showSuccessMessage(`URL${fileName ? ` de ${fileName}` : ''} copiada para a área de transferência`);
        } catch (error) {
            console.error('Erro ao copiar URL:', error);
            
            // Fallback para navegadores que não suportam clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = url;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            this.showSuccessMessage(`URL${fileName ? ` de ${fileName}` : ''} copiada para a área de transferência`);
        }
    }
    
    /**
     * Valida arquivo para upload
     */
    static validateFile(file) {
        // Verificar tipo
        if (!this.allowedTypes.includes(file.type)) {
            throw new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${this.allowedTypes.join(', ')}`);
        }
        
        // Verificar tamanho
        if (file.size > this.maxFileSize) {
            throw new Error(`Arquivo muito grande. Tamanho máximo: ${this.formatFileSize(this.maxFileSize)}`);
        }
        
        if (file.size === 0) {
            throw new Error('Arquivo vazio');
        }
        
        // Verificar nome
        if (!file.name || file.name.trim() === '') {
            throw new Error('Nome de arquivo inválido');
        }
    }
    
    /**
     * Formata tamanho do arquivo
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Mostra progresso de upload
     */
    static showUploadProgress(current, total) {
        const progress = this.getOrCreateProgressIndicator();
        const percentage = Math.round((current / total) * 100);
        
        progress.querySelector('.progress-fill').style.width = `${percentage}%`;
        progress.querySelector('.progress-text').textContent = `Enviando ${current}/${total} arquivos (${percentage}%)`;
        progress.style.display = 'block';
    }
    
    /**
     * Esconde progresso de upload
     */
    static hideUploadProgress() {
        const progress = document.getElementById('uploadProgress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    /**
     * Cria ou obtém indicador de progresso
     */
    static getOrCreateProgressIndicator() {
        let progress = document.getElementById('uploadProgress');
        
        if (!progress) {
            progress = document.createElement('div');
            progress.id = 'uploadProgress';
            progress.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                display: none;
                min-width: 300px;
            `;
            
            progress.innerHTML = `
                <div class="progress-text" style="margin-bottom: 8px; font-size: 14px; font-weight: 500;">Preparando upload...</div>
                <div style="width: 100%; height: 6px; background: #f0f0f0; border-radius: 3px; overflow: hidden;">
                    <div class="progress-fill" style="height: 100%; background: linear-gradient(90deg, #dc143c, #b91c3c); width: 0%; transition: width 0.3s ease;"></div>
                </div>
            `;
            
            document.body.appendChild(progress);
        }
        
        return progress;
    }
    
    /**
     * Cria ou obtém container de preview
     */
    static getOrCreatePreviewContainer() {
        let container = document.getElementById('uploadPreviewContainer');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'uploadPreviewContainer';
            container.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9998;
                display: none;
                max-width: 400px;
                max-height: 300px;
                overflow-y: auto;
            `;
            
            // Adicionar título e botão fechar
            container.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee;">
                    <h4 style="margin: 0; font-size: 14px; font-weight: 600;">Arquivos para Upload</h4>
                    <button onclick="this.parentElement.parentElement.style.display='none'" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
                </div>
                <div class="preview-files"></div>
            `;
            
            document.body.appendChild(container);
        }
        
        return container.querySelector('.preview-files');
    }
    
    // ===== EVENTOS =====
    
    static emitFileUploaded(response) {
        const event = new CustomEvent('fileUploaded', {
            detail: response
        });
        document.dispatchEvent(event);
    }
    
    static emitFileUpdated(fileId, data) {
        const event = new CustomEvent('fileUpdated', {
            detail: { fileId, data }
        });
        document.dispatchEvent(event);
    }
    
    static emitFileDeleted(fileId) {
        const event = new CustomEvent('fileDeleted', {
            detail: { fileId }
        });
        document.dispatchEvent(event);
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
            return await window.AuthManager.apiRequest(`files/${endpoint}`, options);
        } else {
            // Fallback se AuthManager não estiver disponível
            const url = this.API_BASE + 'files/' + endpoint;
            
            const defaultOptions = {
                credentials: 'same-origin'
            };
            
            // Para FormData, não definir Content-Type
            if (!(options.body instanceof FormData)) {
                defaultOptions.headers = {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                };
            }
            
            const finalOptions = {
                ...defaultOptions,
                ...options
            };
            
            if (options.headers && Object.keys(options.headers).length === 0) {
                delete finalOptions.headers;
            }
            
            const response = await fetch(url, finalOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        }
    }
    
    /**
     * Inicializa o gerenciador de arquivos
     */
    static init() {
        // Adicionar estilos CSS para drag and drop
        this.addDragDropStyles();
        
        // Listeners para eventos de arquivo
        document.addEventListener('fileUploaded', (event) => {
            console.log('Arquivo enviado:', event.detail);
        });
        
        document.addEventListener('fileUpdated', (event) => {
            console.log('Arquivo atualizado:', event.detail);
        });
        
        document.addEventListener('fileDeleted', (event) => {
            console.log('Arquivo removido:', event.detail);
        });
        
        console.log('FileManager inicializado');
    }
    
    /**
     * Adiciona estilos CSS para drag and drop
     */
    static addDragDropStyles() {
        if (document.getElementById('dragDropStyles')) return;
        
        const style = document.createElement('style');
        style.id = 'dragDropStyles';
        style.textContent = `
            .upload-area.dragover {
                border-color: var(--primary-red) !important;
                background: rgba(220, 20, 60, 0.05) !important;
                transform: scale(1.02);
            }
            
            .file-preview {
                transition: all 0.3s ease;
            }
            
            .file-preview:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Destroi o gerenciador e limpa recursos
     */
    static destroy() {
        // Cancelar uploads pendentes
        this.uploadQueue = [];
        this.isUploading = false;
        
        // Remover indicadores de progresso
        const progress = document.getElementById('uploadProgress');
        if (progress) progress.remove();
        
        const preview = document.getElementById('uploadPreviewContainer');
        if (preview) preview.remove();
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    FileManager.init();
});

// Cleanup ao sair da página
window.addEventListener('beforeunload', () => {
    FileManager.destroy();
});

// Export para outros módulos
window.FileManager = FileManager;