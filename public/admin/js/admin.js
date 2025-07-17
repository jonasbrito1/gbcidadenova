/**
 * Sistema de Administração - Gracie Barra CMS
 * Arquivo: public/admin/js/admin.js
 */

'use strict';

// ===== CONFIGURAÇÕES GLOBAIS =====
const CONFIG = {
    API_BASE: '../api/',
    SITE_URL: '../',
    PREVIEW_URL: '../preview.php',
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    AUTO_SAVE_INTERVAL: 30000, // 30 segundos
};

// ===== SISTEMA PRINCIPAL =====
class AdminSystem {
    static currentUser = null;
    static currentSection = 'dashboard';
    static contentData = {};
    static autoSaveInterval = null;
    static isOnline = navigator.onLine;

    static async init() {
        try {
            // Configurar listeners básicos
            this.setupEventListeners();
            
            // Verificar conexão
            this.monitorConnection();
            
            // Verificar autenticação
            const isAuthenticated = await AuthManager.checkAuth();
            
            if (isAuthenticated) {
                this.currentUser = AuthManager.getCurrentUser();
                await this.showCMS();
            } else {
                this.showLogin();
            }
            
            console.log('🎉 Sistema CMS inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema:', error);
            this.showError('Erro ao inicializar sistema. Recarregue a página.');
        }
    }

    static setupEventListeners() {
        // Form de login
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // Botões da interface
        document.addEventListener('click', (e) => {
            const target = e.target;
            
            // Sidebar navigation
            if (target.closest('.sidebar-item')) {
                const section = target.closest('.sidebar-item').dataset.section;
                if (section) {
                    this.loadSection(section);
                }
            }
            
            // User menu toggle
            if (target.closest('#userMenuBtn')) {
                this.toggleUserMenu();
            }
            
            // Logout
            if (target.closest('#logoutBtn')) {
                this.handleLogout();
            }
            
            // Preview
            if (target.closest('#previewBtn')) {
                this.openPreview();
            }
            
            // Save all
            if (target.closest('#saveAllBtn')) {
                this.saveAllChanges();
            }
        });

        // Fechar dropdown ao clicar fora
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.classList.remove('show');
                });
            }
        });

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S para salvar
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentSection();
            }
            
            // Escape para fechar modais
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Monitor de conexão
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showAlert('Conexão restaurada', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showAlert('Sem conexão com a internet', 'warning');
        });
    }

    static monitorConnection() {
        setInterval(() => {
            if (!this.isOnline) {
                fetch(CONFIG.API_BASE + 'auth/check')
                    .then(() => {
                        this.isOnline = true;
                        this.showAlert('Conexão restaurada', 'success');
                    })
                    .catch(() => {
                        // Ainda offline
                    });
            }
        }, 5000);
    }

    static showLogin() {
        document.getElementById('loginSection').style.display = 'flex';
        document.getElementById('cmsSection').style.display = 'none';
        
        // Focus no campo username
        setTimeout(() => {
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.focus();
        }, 100);
    }

    static async showCMS() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('cmsSection').style.display = 'block';
        
        // Atualizar informações do usuário
        this.updateUserInfo();
        
        // Carregar conteúdo inicial
        await this.loadInitialData();
        
        // Configurar auto-save
        this.setupAutoSave();
        
        // Carregar dashboard por padrão
        this.loadSection('dashboard');
    }

    static updateUserInfo() {
        if (!this.currentUser) return;
        
        const elements = {
            avatar: document.getElementById('userAvatar'),
            name: document.getElementById('userName'),
            role: document.getElementById('userRole')
        };
        
        if (elements.avatar) {
            elements.avatar.textContent = this.currentUser.first_name?.charAt(0).toUpperCase() || 'U';
        }
        
        if (elements.name) {
            elements.name.textContent = this.currentUser.full_name || this.currentUser.username;
        }
        
        if (elements.role) {
            const roleMap = {
                'admin': 'Administrador',
                'editor': 'Editor',
                'viewer': 'Visualizador'
            };
            elements.role.textContent = roleMap[this.currentUser.role] || this.currentUser.role;
        }
    }

    static async loadInitialData() {
        try {
            this.showLoading('Carregando dados...');
            
            // Carregar todo o conteúdo
            this.contentData = await ContentManager.getAllContent();
            
            // Verificar permissões e esconder itens não permitidos
            this.updateUIPermissions();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados. Algumas funcionalidades podem não funcionar.');
        } finally {
            this.hideLoading();
        }
    }

    static updateUIPermissions() {
        const userRole = this.currentUser?.role;
        
        // Esconder itens que requerem permissão admin
        document.querySelectorAll('[data-permission="admin"]').forEach(item => {
            if (userRole !== 'admin') {
                item.style.display = 'none';
            }
        });
    }

    static setupAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        
        // Auto-save a cada 30 segundos se houver mudanças
        this.autoSaveInterval = setInterval(() => {
            if (this.hasUnsavedChanges()) {
                this.saveCurrentSection(true); // true = silent save
            }
        }, CONFIG.AUTO_SAVE_INTERVAL);
    }

    static hasUnsavedChanges() {
        // Verificar se há campos modificados
        const forms = document.querySelectorAll('#dynamicContent form, #dynamicContent input, #dynamicContent textarea');
        return Array.from(forms).some(form => form.dataset.modified === 'true');
    }

    static async loadSection(section) {
        if (section === this.currentSection) return;
        
        try {
            // Verificar mudanças não salvas
            if (this.hasUnsavedChanges()) {
                const shouldContinue = confirm('Você tem alterações não salvas. Deseja continuar?');
                if (!shouldContinue) return;
            }
            
            this.currentSection = section;
            
            // Atualizar sidebar
            this.updateSidebarSelection(section);
            
            // Carregar conteúdo da seção
            await this.renderSection(section);
            
        } catch (error) {
            console.error(`Erro ao carregar seção ${section}:`, error);
            this.showError(`Erro ao carregar seção: ${error.message}`);
        }
    }

    static updateSidebarSelection(section) {
        // Remover seleção atual
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adicionar seleção na nova seção
        const targetItem = document.querySelector(`[data-section="${section}"]`);
        if (targetItem) {
            targetItem.classList.add('active');
        }
    }

    static async renderSection(section) {
        const contentArea = document.getElementById('dynamicContent');
        
        try {
            let html = '';
            
            switch (section) {
                case 'dashboard':
                    html = await this.renderDashboard();
                    break;
                case 'header':
                    html = await this.renderHeaderForm();
                    break;
                case 'hero':
                    html = await this.renderHeroForm();
                    break;
                case 'about':
                    html = await this.renderAboutForm();
                    break;
                case 'contact':
                    html = await this.renderContactForm();
                    break;
                case 'media':
                    html = await this.renderMediaManager();
                    break;
                case 'settings':
                    html = await this.renderSettingsForm();
                    break;
                case 'users':
                    html = await this.renderUsersManager();
                    break;
                default:
                    html = await this.renderGenericForm(section);
            }
            
            contentArea.innerHTML = html;
            contentArea.classList.add('fade-in');
            
            // Configurar eventos específicos da seção
            this.bindSectionEvents(section);
            
        } catch (error) {
            console.error(`Erro ao renderizar seção ${section}:`, error);
            contentArea.innerHTML = `
                <div class="error-state">
                    <i class="bi bi-exclamation-triangle"></i>
                    <h3>Erro ao carregar seção</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="AdminSystem.loadSection('${section}')">
                        Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    static async renderDashboard() {
        try {
            // Carregar estatísticas
            const stats = await this.loadDashboardStats();
            
            return `
                <div class="dashboard-header">
                    <h1><i class="bi bi-speedometer2"></i> Dashboard</h1>
                    <p>Visão geral do sistema e atividades recentes</p>
                </div>

                <div class="dashboard-grid">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="bi bi-file-text"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.content?.total_sections || 0}</h3>
                            <p>Seções de Conteúdo</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="bi bi-images"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.files?.total_files || 0}</h3>
                            <p>Arquivos de Mídia</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="bi bi-people"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.users || 0}</h3>
                            <p>Usuários do Sistema</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon info">
                            <i class="bi bi-activity"></i>
                        </div>
                        <div class="stat-content">
                            <h3>${stats.recent_activity?.length || 0}</h3>
                            <p>Ações Recentes</p>
                        </div>
                    </div>
                </div>

                <div class="dashboard-content">
                    <div class="dashboard-section">
                        <h2><i class="bi bi-lightning"></i> Ações Rápidas</h2>
                        <div class="quick-actions-grid">
                            <button class="action-card" onclick="AdminSystem.loadSection('hero')">
                                <i class="bi bi-star"></i>
                                <span>Editar Página Principal</span>
                            </button>
                            <button class="action-card" onclick="AdminSystem.loadSection('media')">
                                <i class="bi bi-images"></i>
                                <span>Gerenciar Mídia</span>
                            </button>
                            <button class="action-card" onclick="AdminSystem.openPreview()">
                                <i class="bi bi-eye"></i>
                                <span>Visualizar Site</span>
                            </button>
                            <button class="action-card" onclick="AdminSystem.loadSection('contact')">
                                <i class="bi bi-telephone"></i>
                                <span>Editar Contato</span>
                            </button>
                        </div>
                    </div>

                    <div class="dashboard-section">
                        <h2><i class="bi bi-clock-history"></i> Atividade Recente</h2>
                        <div class="activity-list">
                            ${this.renderActivityList(stats.recent_activity || [])}
                        </div>
                    </div>
                </div>
            `;
            
        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            return this.renderErrorState('Erro ao carregar dashboard', error.message);
        }
    }

    static async loadDashboardStats() {
        try {
            const response = await fetch(CONFIG.API_BASE + 'dashboard/stats');
            const data = await response.json();
            
            if (data.success) {
                return data.stats;
            }
            
            throw new Error(data.message || 'Erro ao carregar estatísticas');
        } catch (error) {
            console.error('Erro ao carregar estatísticas:', error);
            return {};
        }
    }

    static renderActivityList(activities) {
        if (!activities.length) {
            return '<p class="no-activity">Nenhuma atividade recente</p>';
        }
        
        return activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="bi bi-${this.getActivityIcon(activity.action)}"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${activity.username}</strong> ${this.getActivityDescription(activity.action)}</p>
                    <small>${this.formatDate(activity.created_at)}</small>
                </div>
            </div>
        `).join('');
    }

    static getActivityIcon(action) {
        const iconMap = {
            'login': 'box-arrow-in-right',
            'logout': 'box-arrow-left',
            'update_content': 'pencil-square',
            'upload_file': 'cloud-upload',
            'create_user': 'person-plus',
            'update_user': 'person-gear',
            'delete_file': 'trash'
        };
        return iconMap[action] || 'activity';
    }

    static getActivityDescription(action) {
        const descriptionMap = {
            'login': 'fez login no sistema',
            'logout': 'fez logout do sistema',
            'update_content': 'atualizou conteúdo',
            'upload_file': 'fez upload de arquivo',
            'create_user': 'criou novo usuário',
            'update_user': 'atualizou usuário',
            'delete_file': 'removeu arquivo'
        };
        return descriptionMap[action] || 'realizou uma ação';
    }

    static formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            return 'há 1 dia';
        } else if (diffDays < 7) {
            return `há ${diffDays} dias`;
        } else {
            return date.toLocaleDateString('pt-BR');
        }
    }

    static async renderHeaderForm() {
        const content = this.contentData.header || {};
        
        return `
            <div class="content-header">
                <h1><i class="bi bi-layout-text-window"></i> Header & Logo</h1>
                <p>Configure o cabeçalho e logo do site</p>
            </div>

            <form class="section-form" data-section="header">
                <div class="form-section">
                    <h3 class="form-section-title">
                        <i class="bi bi-image"></i> Logo e Identidade
                    </h3>
                    <div class="form-row">
                        <div class="form-field">
                            <label for="logo_main">Nome Principal</label>
                            <input type="text" id="logo_main" name="logo_main" 
                                   value="${content.logo_main || 'Gracie Barra'}" required>
                        </div>
                        <div class="form-field">
                            <label for="logo_sub">Subtítulo</label>
                            <input type="text" id="logo_sub" name="logo_sub" 
                                   value="${content.logo_sub || 'Cidade Nova'}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">
                        <i class="bi bi-list"></i> Menu de Navegação
                    </h3>
                    <div class="form-row">
                        <div class="form-field">
                            <label for="menu_items">Itens do Menu (um por linha)</label>
                            <textarea id="menu_items" name="menu_items" rows="8">${
                                Array.isArray(content.menu_items) 
                                    ? content.menu_items.join('\n') 
                                    : 'Início\nSobre\nProgramas\nBenefícios\nFilosofia\nProfessores\nHorários\nContato'
                            }</textarea>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check"></i> Salvar Header
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="AdminSystem.openPreview()">
                        <i class="bi bi-eye"></i> Visualizar
                    </button>
                </div>
            </form>
        `;
    }

    static async renderHeroForm() {
        const content = this.contentData.hero || {};
        
        return `
            <div class="content-header">
                <h1><i class="bi bi-star-fill"></i> Seção Principal</h1>
                <p>Configure o banner principal do site</p>
            </div>

            <form class="section-form" data-section="hero">
                <div class="form-section">
                    <h3 class="form-section-title">
                        <i class="bi bi-type"></i> Conteúdo Principal
                    </h3>
                    <div class="form-row">
                        <div class="form-field">
                            <label for="title">Título Principal</label>
                            <input type="text" id="title" name="title" 
                                   value="${content.title || 'Gracie Barra Cidade Nova'}" required>
                        </div>
                        <div class="form-field">
                            <label for="subtitle">Subtítulo</label>
                            <input type="text" id="subtitle" name="subtitle" 
                                   value="${content.subtitle || 'Jiu-Jitsu para Todos'}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-field">
                            <label for="button_text">Texto do Botão</label>
                            <input type="text" id="button_text" name="button_text" 
                                   value="${content.button_text || 'Começar a Treinar'}">
                        </div>
                        <div class="form-field">
                            <label for="button_link">Link do Botão</label>
                            <input type="url" id="button_link" name="button_link" 
                                   value="${content.button_link || 'https://wa.me/559281136742'}">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3 class="form-section-title">
                        <i class="bi bi-image"></i> Imagem de Fundo
                    </h3>
                    <div class="form-row">
                        <div class="form-field">
                            <label>Imagem Atual</label>
                            <div class="current-image">
                                ${content.background_image ? 
                                    `<img src="${content.background_image}" alt="Imagem atual" style="max-width: 300px; border-radius: 8px;">` :
                                    '<p>Nenhuma imagem selecionada</p>'
                                }
                            </div>
                            <input type="hidden" id="background_image" name="background_image" value="${content.background_image || ''}">
                            <button type="button" class="btn btn-secondary" onclick="AdminSystem.selectImage('background_image')">
                                <i class="bi bi-image"></i> Selecionar Nova Imagem
                            </button>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="bi bi-check"></i> Salvar Seção Principal
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="AdminSystem.openPreview()">
                        <i class="bi bi-eye"></i> Visualizar
                    </button>
                </div>
            </form>
        `;
    }

    static bindSectionEvents(section) {
        // Bind form submissions
        const forms = document.querySelectorAll('.section-form');
        forms.forEach(form => {
            form.addEventListener('submit', this.handleFormSubmit.bind(this));
        });

        // Bind input changes for auto-save detection
        const inputs = document.querySelectorAll('#dynamicContent input, #dynamicContent textarea, #dynamicContent select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                input.closest('form').dataset.modified = 'true';
            });
        });

        // Bind eventos específicos por seção
        switch (section) {
            case 'media':
                this.bindMediaEvents();
                break;
            case 'users':
                this.bindUserEvents();
                break;
        }
    }

    static async handleFormSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const section = form.dataset.section;
        
        if (!section) {
            this.showError('Erro: seção não identificada');
            return;
        }

        try {
            this.showLoading('Salvando...');
            
            const formData = new FormData(form);
            const data = {};
            
            // Converter FormData para objeto
            for (const [key, value] of formData.entries()) {
                if (key === 'menu_items') {
                    // Processar menu items como array
                    data[key] = value.split('\n').map(item => item.trim()).filter(item => item.length > 0);
                } else {
                    data[key] = value;
                }
            }
            
            const success = await ContentManager.updateSection(section, data);
            
            if (success) {
                form.dataset.modified = 'false';
                this.showAlert('Seção salva com sucesso!', 'success');
            }
            
        } catch (error) {
            console.error('Erro ao salvar seção:', error);
            this.showError('Erro ao salvar: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    static async saveCurrentSection(silent = false) {
        const form = document.querySelector('.section-form');
        if (!form) return;
        
        if (!silent) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(submitEvent);
        } else {
            // Silent save para auto-save
            this.handleFormSubmit({ target: form, preventDefault: () => {} });
        }
    }

    static async saveAllChanges() {
        try {
            this.showLoading('Salvando todas as alterações...');
            
            // Salvar seção atual primeiro
            await this.saveCurrentSection(true);
            
            this.showAlert('Todas as alterações foram salvas!', 'success');
            
        } catch (error) {
            console.error('Erro ao salvar tudo:', error);
            this.showError('Erro ao salvar alterações: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    static async handleLogin(e) {
        e.preventDefault();
        
        const form = e.target;
        const loginBtn = document.getElementById('loginBtn');
        const errorMessage = document.getElementById('errorMessage');
        
        const formData = new FormData(form);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password'),
            remember_me: formData.get('rememberMe') === 'on'
        };
        
        try {
            // UI Loading state
            loginBtn.disabled = true;
            document.querySelector('.btn-text').style.display = 'none';
            document.querySelector('.btn-loading').style.display = 'flex';
            errorMessage.style.display = 'none';
            
            const result = await AuthManager.login(credentials.username, credentials.password, credentials.remember_me);
            
            if (result.success) {
                this.currentUser = result.user;
                await this.showCMS();
            } else {
                errorMessage.textContent = result.message;
                errorMessage.style.display = 'block';
            }
            
        } catch (error) {
            console.error('Erro no login:', error);
            errorMessage.textContent = 'Erro de conexão. Tente novamente.';
            errorMessage.style.display = 'block';
        } finally {
            // Reset UI
            loginBtn.disabled = false;
            document.querySelector('.btn-text').style.display = 'inline';
            document.querySelector('.btn-loading').style.display = 'none';
        }
    }

    static async handleLogout() {
        const confirmed = confirm('Tem certeza que deseja sair?');
        if (!confirmed) return;
        
        try {
            await AuthManager.logout();
            
            // Clear data
            this.currentUser = null;
            this.contentData = {};
            
            // Clear auto-save
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            
            this.showLogin();
            this.showAlert('Logout realizado com sucesso', 'success');
            
        } catch (error) {
            console.error('Erro no logout:', error);
            this.showError('Erro ao fazer logout');
        }
    }

    static toggleUserMenu() {
        const menu = document.getElementById('userMenu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    static openPreview() {
        const modal = document.getElementById('previewModal');
        const frame = document.getElementById('previewFrame');
        
        if (modal && frame) {
            frame.src = CONFIG.PREVIEW_URL;
            modal.classList.add('show');
        }
    }

    static closePreview() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    static closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // ===== UTILITY METHODS =====
    
    static showLoading(message = 'Carregando...') {
        const overlay = document.getElementById('loadingOverlay');
        const text = overlay?.querySelector('p');
        
        if (overlay) {
            if (text) text.textContent = message;
            overlay.classList.add('show');
        }
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show');
        }
    }

    static showAlert(message, type = 'info', duration = 4000) {
        const container = document.getElementById('alertContainer');
        if (!container) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        alert.innerHTML = `
            <i class="bi bi-${icons[type] || icons.info}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(alert);
        
        // Auto remove
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, duration);
    }

    static showError(message) {
        this.showAlert(message, 'error');
    }

    static showSuccess(message) {
        this.showAlert(message, 'success');
    }

    static renderErrorState(title, message) {
        return `
            <div class="error-state" style="text-align: center; padding: 3rem; background: var(--card-background); border-radius: var(--border-radius-lg);">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem; color: var(--danger-red); margin-bottom: 1rem;"></i>
                <h3 style="margin-bottom: 0.5rem;">${title}</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">${message}</p>
                <button class="btn btn-primary" onclick="window.location.reload()">
                    <i class="bi bi-arrow-clockwise"></i> Recarregar Página
                </button>
            </div>
        `;
    }
}

// ===== FUNÇÕES GLOBAIS PARA O HTML =====

function loadSection(section) {
    AdminSystem.loadSection(section);
}

function closePreview() {
    AdminSystem.closePreview();
}

function closeUploadModal() {
    AdminSystem.closeAllModals();
}

// ===== EXPORT PARA OUTROS MÓDULOS =====
window.AdminSystem = AdminSystem;