/**
 * Gerenciador de Autenticação - Gracie Barra CMS
 * Arquivo: public/admin/js/auth.js
 */

'use strict';

class AuthManager {
    static API_BASE = '../api/';
    static currentUser = null;
    static authToken = null;
    static refreshInterval = null;
    
    /**
     * Realiza login do usuário
     */
    static async login(username, password, rememberMe = false) {
        try {
            const response = await this.apiRequest('auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    username: username.trim(),
                    password: password,
                    remember_me: rememberMe
                })
            });
            
            if (response.success) {
                this.currentUser = response.user;
                this.setupAutoRefresh();
                this.saveAuthState(rememberMe);
                
                return {
                    success: true,
                    user: response.user,
                    message: response.message || 'Login realizado com sucesso'
                };
            } else {
                return {
                    success: false,
                    message: response.message || 'Credenciais inválidas'
                };
            }
            
        } catch (error) {
            console.error('Erro no login:', error);
            return {
                success: false,
                message: 'Erro de conexão. Verifique sua internet e tente novamente.'
            };
        }
    }
    
    /**
     * Realiza logout do usuário
     */
    static async logout() {
        try {
            // Tentar fazer logout no servidor
            await this.apiRequest('auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.warn('Erro ao fazer logout no servidor:', error);
        } finally {
            // Limpar estado local independentemente do resultado do servidor
            this.clearAuthState();
            return true;
        }
    }
    
    /**
     * Verifica se usuário está autenticado
     */
    static async checkAuth() {
        try {
            // Primeiro, verificar se há dados salvos localmente
            if (!this.hasLocalAuthData()) {
                return false;
            }
            
            // Verificar com o servidor
            const response = await this.apiRequest('auth/me', {
                method: 'GET'
            });
            
            if (response.success && response.user) {
                this.currentUser = response.user;
                this.setupAutoRefresh();
                return true;
            } else {
                this.clearAuthState();
                return false;
            }
            
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            
            // Em caso de erro de rede, manter autenticação local se existir
            if (this.hasLocalAuthData()) {
                return true;
            }
            
            this.clearAuthState();
            return false;
        }
    }
    
    /**
     * Obtém usuário atual
     */
    static getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Verifica se usuário tem permissão específica
     */
    static hasPermission(action) {
        if (!this.currentUser) {
            return false;
        }
        
        const role = this.currentUser.role;
        
        // Admin tem todas as permissões
        if (role === 'admin') {
            return true;
        }
        
        // Editor tem permissões de visualização e edição
        if (role === 'editor') {
            const editorPermissions = ['view', 'edit', 'create', 'upload', 'update_content'];
            return editorPermissions.includes(action);
        }
        
        // Viewer só pode visualizar
        if (role === 'viewer') {
            return action === 'view';
        }
        
        return false;
    }
    
    /**
     * Verifica se usuário é admin
     */
    static isAdmin() {
        return this.currentUser?.role === 'admin';
    }
    
    /**
     * Verifica se usuário pode editar
     */
    static canEdit() {
        return this.hasPermission('edit');
    }
    
    /**
     * Atualiza dados do usuário atual
     */
    static async refreshUserData() {
        try {
            const response = await this.apiRequest('auth/me', {
                method: 'GET'
            });
            
            if (response.success && response.user) {
                this.currentUser = response.user;
                this.saveAuthState();
                return response.user;
            }
            
            return null;
            
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário:', error);
            return null;
        }
    }
    
    /**
     * Altera senha do usuário
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            const response = await this.apiRequest('users/password', {
                method: 'PUT',
                body: JSON.stringify({
                    user_id: userId,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            });
            
            return response;
            
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            return {
                success: false,
                message: 'Erro de conexão ao alterar senha'
            };
        }
    }
    
    /**
     * Solicita redefinição de senha (se implementado)
     */
    static async requestPasswordReset(email) {
        try {
            const response = await this.apiRequest('auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            
            return response;
            
        } catch (error) {
            console.error('Erro ao solicitar redefinição de senha:', error);
            return {
                success: false,
                message: 'Erro de conexão'
            };
        }
    }
    
    /**
     * Atualiza perfil do usuário
     */
    static async updateProfile(userId, userData) {
        try {
            const response = await this.apiRequest(`users/update/${userId}`, {
                method: 'PUT',
                body: JSON.stringify(userData)
            });
            
            if (response.success) {
                // Atualizar dados locais se foi o próprio usuário
                if (this.currentUser && this.currentUser.id === userId) {
                    await this.refreshUserData();
                }
            }
            
            return response;
            
        } catch (error) {
            console.error('Erro ao atualizar perfil:', error);
            return {
                success: false,
                message: 'Erro de conexão ao atualizar perfil'
            };
        }
    }
    
    /**
     * Configura renovação automática da sessão
     */
    static setupAutoRefresh() {
        // Limpar intervalo anterior se existir
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        // Renovar sessão a cada 30 minutos
        this.refreshInterval = setInterval(async () => {
            try {
                await this.apiRequest('auth/refresh', {
                    method: 'POST'
                });
                
                this.saveAuthState();
                
            } catch (error) {
                console.warn('Erro ao renovar sessão:', error);
                
                // Se falhar muito, fazer logout
                this.clearAuthState();
                window.location.reload();
            }
        }, 30 * 60 * 1000); // 30 minutos
    }
    
    /**
     * Salva estado de autenticação no localStorage
     */
    static saveAuthState(persistent = false) {
        const authData = {
            user: this.currentUser,
            timestamp: Date.now(),
            persistent: persistent
        };
        
        try {
            if (persistent) {
                localStorage.setItem('gb_auth', JSON.stringify(authData));
            } else {
                sessionStorage.setItem('gb_auth', JSON.stringify(authData));
            }
        } catch (error) {
            console.warn('Erro ao salvar estado de autenticação:', error);
        }
    }
    
    /**
     * Carrega estado de autenticação do localStorage
     */
    static loadAuthState() {
        try {
            // Tentar carregar do localStorage primeiro (lembrar-me)
            let authData = localStorage.getItem('gb_auth');
            
            // Se não encontrar, tentar sessionStorage
            if (!authData) {
                authData = sessionStorage.getItem('gb_auth');
            }
            
            if (authData) {
                const parsed = JSON.parse(authData);
                
                // Verificar se não expirou (7 dias máximo)
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
                if (Date.now() - parsed.timestamp < maxAge) {
                    this.currentUser = parsed.user;
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.warn('Erro ao carregar estado de autenticação:', error);
            return false;
        }
    }
    
    /**
     * Limpa estado de autenticação
     */
    static clearAuthState() {
        this.currentUser = null;
        this.authToken = null;
        
        // Limpar intervalos
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        // Limpar storage
        try {
            localStorage.removeItem('gb_auth');
            sessionStorage.removeItem('gb_auth');
        } catch (error) {
            console.warn('Erro ao limpar storage:', error);
        }
    }
    
    /**
     * Verifica se há dados de autenticação locais
     */
    static hasLocalAuthData() {
        return !!(localStorage.getItem('gb_auth') || sessionStorage.getItem('gb_auth'));
    }
    
    /**
     * Faz requisição para API com autenticação
     */
    static async apiRequest(endpoint, options = {}) {
        const url = this.API_BASE + endpoint;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        };
        
        // Adicionar token se disponível
        if (this.authToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...(options.headers || {})
            }
        };
        
        const response = await fetch(url, finalOptions);
        
        // Verificar se a resposta é JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Resposta inválida do servidor');
        }
        
        const data = await response.json();
        
        // Se receber 401, limpar autenticação
        if (response.status === 401) {
            this.clearAuthState();
            
            // Redirecionar para login se não estiver na página de login
            if (!window.location.pathname.includes('login')) {
                window.location.reload();
            }
        }
        
        // Se não foi successful mas a requisição passou, retornar os dados mesmo assim
        if (!response.ok && !data.success) {
            throw new Error(data.message || `Erro HTTP ${response.status}`);
        }
        
        return data;
    }
    
    /**
     * Monitora estado de conexão
     */
    static setupConnectionMonitoring() {
        window.addEventListener('online', () => {
            console.log('Conexão restaurada');
            
            // Tentar verificar autenticação quando voltar online
            if (this.currentUser) {
                this.checkAuth();
            }
        });
        
        window.addEventListener('offline', () => {
            console.log('Conexão perdida');
        });
    }
    
    /**
     * Inicializa o gerenciador de autenticação
     */
    static init() {
        // Carregar estado salvo
        this.loadAuthState();
        
        // Configurar monitoramento de conexão
        this.setupConnectionMonitoring();
        
        // Se há usuário carregado, configurar auto-refresh
        if (this.currentUser) {
            this.setupAutoRefresh();
        }
        
        console.log('AuthManager inicializado');
    }
    
    /**
     * Limpa todos os dados ao destruir
     */
    static destroy() {
        this.clearAuthState();
        
        // Remover event listeners se necessário
        window.removeEventListener('beforeunload', this.handleBeforeUnload);
    }
    
    /**
     * Handler para antes de sair da página
     */
    static handleBeforeUnload = () => {
        // Salvar estado se necessário
        if (this.currentUser) {
            this.saveAuthState();
        }
    }
}

// Event listeners globais
document.addEventListener('DOMContentLoaded', () => {
    AuthManager.init();
});

window.addEventListener('beforeunload', AuthManager.handleBeforeUnload);

// Export para outros módulos
window.AuthManager = AuthManager;