<?php
/**
 * Sistema de Autenticação - Gracie Barra CMS
 * Arquivo: public/api/classes/Auth.php
 */

require_once __DIR__ . '/../config/database.php';

class Auth {
    private $db;
    private $logger;
    private $sessionTimeout;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new SecurityLogger();
        $this->sessionTimeout = COOKIE_LIFETIME;
        
        // Iniciar sessão se não estiver ativa
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
    }
    
    /**
     * Realiza login do usuário
     */
    public function login($username, $password, $rememberMe = false) {
        try {
            // Verificar se IP está bloqueado
            if ($this->logger->isIPBlocked()) {
                throw new Exception("Muitas tentativas de login. Tente novamente em 15 minutos.");
            }
            
            // Sanitizar entrada
            $username = Utils::sanitize(trim($username));
            
            if (empty($username) || empty($password)) {
                throw new Exception("Usuário e senha são obrigatórios");
            }
            
            // Buscar usuário no banco
            $sql = "SELECT * FROM cms_users 
                    WHERE (username = ? OR email = ?) 
                    AND status = 'active'";
            $user = $this->db->fetchOne($sql, [$username, $username]);
            
            if (!$user) {
                $this->logger->logFailedLogin($username);
                throw new Exception("Credenciais inválidas");
            }
            
            // Verificar senha
            if (!Utils::verifyPassword($password, $user['password'])) {
                $this->logger->logFailedLogin($username);
                throw new Exception("Credenciais inválidas");
            }
            
            // Login bem-sucedido - criar sessão
            $this->createSession($user, $rememberMe);
            $this->updateLastLogin($user['id']);
            
            // Log da atividade
            $this->logger->logActivity($user['id'], 'login', null, 'Login realizado com sucesso');
            
            return [
                'success' => true,
                'user' => $this->formatUserData($user),
                'message' => 'Login realizado com sucesso'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Realiza logout do usuário
     */
    public function logout() {
        try {
            // Log da atividade antes de destruir a sessão
            if (isset($_SESSION['user_id'])) {
                $this->logger->logActivity($_SESSION['user_id'], 'logout', null, 'Logout realizado');
            }
            
            // Destruir dados da sessão
            $_SESSION = [];
            
            // Destruir cookie da sessão
            if (isset($_COOKIE[session_name()])) {
                setcookie(session_name(), '', time() - 3600, '/');
            }
            
            // Destruir sessão
            session_destroy();
            
            return [
                'success' => true,
                'message' => 'Logout realizado com sucesso'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Erro ao fazer logout: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Verifica se usuário está autenticado
     */
    public function isAuthenticated() {
        // Verificar se há dados de sessão
        if (!isset($_SESSION['user_id']) || !isset($_SESSION['login_time'])) {
            return false;
        }
        
        // Verificar timeout da sessão
        if (time() - $_SESSION['login_time'] > $this->sessionTimeout) {
            $this->logout();
            return false;
        }
        
        // Verificar se usuário ainda existe e está ativo
        $sql = "SELECT id, status FROM cms_users WHERE id = ? AND status = 'active'";
        $user = $this->db->fetchOne($sql, [$_SESSION['user_id']]);
        
        if (!$user) {
            $this->logout();
            return false;
        }
        
        // Renovar sessão
        $this->renewSession();
        
        return true;
    }
    
    /**
     * Obtém dados do usuário atual
     */
    public function getCurrentUser() {
        if (!$this->isAuthenticated()) {
            return null;
        }
        
        $sql = "SELECT id, username, email, first_name, last_name, role, avatar, last_login, created_at 
                FROM cms_users WHERE id = ?";
        $user = $this->db->fetchOne($sql, [$_SESSION['user_id']]);
        
        return $user ? $this->formatUserData($user) : null;
    }
    
    /**
     * Verifica se usuário tem permissão para ação
     */
    public function hasPermission($action, $section = null) {
        $user = $this->getCurrentUser();
        
        if (!$user) {
            return false;
        }
        
        $role = $user['role'];
        
        // Definir matriz de permissões
        $permissions = [
            'admin' => ['*'], // Admin tem acesso total
            'editor' => [
                'view', 'edit', 'create', 'upload', 'update_content', 
                'manage_media', 'backup_content'
            ],
            'viewer' => ['view']
        ];
        
        $userPermissions = $permissions[$role] ?? [];
        
        // Admin tem acesso total
        if (in_array('*', $userPermissions)) {
            return true;
        }
        
        // Verificar permissão específica
        return in_array($action, $userPermissions);
    }
    
    /**
     * Cria novo usuário
     */
    public function createUser($data) {
        try {
            // Verificar permissão
            if (!$this->hasPermission('*')) {
                throw new Exception("Sem permissão para criar usuários");
            }
            
            // Validar dados
            $this->validateUserData($data);
            
            // Verificar se username ou email já existem
            if ($this->userExists($data['username'], $data['email'])) {
                throw new Exception("Nome de usuário ou email já estão em uso");
            }
            
            // Preparar dados
            $userData = [
                'username' => Utils::sanitize($data['username']),
                'email' => Utils::sanitize($data['email']),
                'password' => Utils::hashPassword($data['password']),
                'first_name' => Utils::sanitize($data['first_name']),
                'last_name' => Utils::sanitize($data['last_name']),
                'role' => Utils::sanitize($data['role'] ?? 'viewer'),
                'status' => 'active'
            ];
            
            // Inserir usuário
            $sql = "INSERT INTO cms_users (username, email, password, first_name, last_name, role, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, NOW())";
            
            $userId = $this->db->insert($sql, [
                $userData['username'],
                $userData['email'],
                $userData['password'],
                $userData['first_name'],
                $userData['last_name'],
                $userData['role'],
                $userData['status']
            ]);
            
            // Log da atividade
            $currentUser = $this->getCurrentUser();
            $this->logger->logActivity(
                $currentUser['id'], 
                'create_user', 
                'users', 
                "Usuário {$userData['username']} criado"
            );
            
            return [
                'success' => true,
                'user_id' => $userId,
                'message' => 'Usuário criado com sucesso'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Atualiza dados do usuário
     */
    public function updateUser($userId, $data) {
        try {
            $currentUser = $this->getCurrentUser();
            
            // Verificar permissões
            if (!$currentUser || 
                ($currentUser['id'] != $userId && !$this->hasPermission('*'))) {
                throw new Exception("Sem permissão para editar este usuário");
            }
            
            // Campos permitidos para atualização
            $allowedFields = ['first_name', 'last_name', 'email'];
            
            // Admin pode editar role e status
            if ($this->hasPermission('*')) {
                $allowedFields = array_merge($allowedFields, ['role', 'status']);
            }
            
            $updateFields = [];
            $params = [];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = ?";
                    $params[] = Utils::sanitize($data[$field]);
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception("Nenhum campo válido para atualizar");
            }
            
            // Verificar se email não está em uso por outro usuário
            if (isset($data['email'])) {
                $sql = "SELECT id FROM cms_users WHERE email = ? AND id != ?";
                if ($this->db->exists($sql, [$data['email'], $userId])) {
                    throw new Exception("Este email já está em uso por outro usuário");
                }
            }
            
            $params[] = $userId;
            $sql = "UPDATE cms_users SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = ?";
            
            $this->db->execute($sql, $params);
            
            // Log da atividade
            $this->logger->logActivity(
                $currentUser['id'], 
                'update_user', 
                'users', 
                "Usuário ID $userId atualizado"
            );
            
            return [
                'success' => true,
                'message' => 'Usuário atualizado com sucesso'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Altera senha do usuário
     */
    public function changePassword($userId, $currentPassword, $newPassword) {
        try {
            $user = $this->getCurrentUser();
            
            // Verificar permissões
            if (!$user || ($user['id'] != $userId && !$this->hasPermission('*'))) {
                throw new Exception("Sem permissão para alterar senha");
            }
            
            // Validar nova senha
            if (strlen($newPassword) < 6) {
                throw new Exception("Nova senha deve ter pelo menos 6 caracteres");
            }
            
            // Se não for admin, verificar senha atual
            if (!$this->hasPermission('*') || $user['id'] == $userId) {
                $sql = "SELECT password FROM cms_users WHERE id = ?";
                $userData = $this->db->fetchOne($sql, [$userId]);
                
                if ($userData && !Utils::verifyPassword($currentPassword, $userData['password'])) {
                    throw new Exception("Senha atual incorreta");
                }
            }
            
            // Atualizar senha
            $sql = "UPDATE cms_users SET password = ?, updated_at = NOW() WHERE id = ?";
            $this->db->execute($sql, [Utils::hashPassword($newPassword), $userId]);
            
            // Log da atividade
            $this->logger->logActivity(
                $user['id'], 
                'change_password', 
                'users', 
                "Senha alterada para usuário ID $userId"
            );
            
            return [
                'success' => true,
                'message' => 'Senha alterada com sucesso'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Lista usuários com filtros
     */
    public function getUsers($filters = []) {
        try {
            // Verificar permissão
            if (!$this->hasPermission('*') && !$this->hasPermission('view')) {
                throw new Exception("Sem permissão para listar usuários");
            }
            
            $sql = "SELECT id, username, email, first_name, last_name, role, status, last_login, created_at, updated_at 
                    FROM cms_users WHERE 1=1";
            $params = [];
            
            // Aplicar filtros
            if (isset($filters['role']) && !empty($filters['role'])) {
                $sql .= " AND role = ?";
                $params[] = $filters['role'];
            }
            
            if (isset($filters['status']) && !empty($filters['status'])) {
                $sql .= " AND status = ?";
                $params[] = $filters['status'];
            }
            
            if (isset($filters['search']) && !empty($filters['search'])) {
                $searchTerm = '%' . $this->db->escapeLike($filters['search']) . '%';
                $sql .= " AND (username LIKE ? OR email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)";
                $params = array_merge($params, [$searchTerm, $searchTerm, $searchTerm, $searchTerm]);
            }
            
            $sql .= " ORDER BY created_at DESC";
            
            if (isset($filters['limit']) && is_numeric($filters['limit'])) {
                $sql .= " LIMIT ?";
                $params[] = (int)$filters['limit'];
            }
            
            $users = $this->db->fetchAll($sql, $params);
            
            // Formatar dados dos usuários
            return array_map([$this, 'formatUserData'], $users);
            
        } catch (Exception $e) {
            throw new Exception("Erro ao listar usuários: " . $e->getMessage());
        }
    }
    
    /**
     * Desativa/ativa usuário
     */
    public function toggleUserStatus($userId) {
        try {
            // Verificar permissão
            if (!$this->hasPermission('*')) {
                throw new Exception("Sem permissão para alterar status de usuários");
            }
            
            $currentUser = $this->getCurrentUser();
            
            // Não pode desativar a si mesmo
            if ($currentUser['id'] == $userId) {
                throw new Exception("Você não pode desativar sua própria conta");
            }
            
            // Buscar usuário atual
            $sql = "SELECT status FROM cms_users WHERE id = ?";
            $user = $this->db->fetchOne($sql, [$userId]);
            
            if (!$user) {
                throw new Exception("Usuário não encontrado");
            }
            
            // Alternar status
            $newStatus = $user['status'] === 'active' ? 'inactive' : 'active';
            
            $sql = "UPDATE cms_users SET status = ?, updated_at = NOW() WHERE id = ?";
            $this->db->execute($sql, [$newStatus, $userId]);
            
            // Log da atividade
            $this->logger->logActivity(
                $currentUser['id'], 
                'toggle_user_status', 
                'users', 
                "Status do usuário ID $userId alterado para $newStatus"
            );
            
            return [
                'success' => true,
                'new_status' => $newStatus,
                'message' => "Usuário " . ($newStatus === 'active' ? 'ativado' : 'desativado') . " com sucesso"
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    // ===== MÉTODOS PRIVADOS =====
    
    /**
     * Cria sessão para usuário
     */
    private function createSession($user, $rememberMe = false) {
        // Regenerar ID da sessão para segurança
        session_regenerate_id(true);
        
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_role'] = $user['role'];
        $_SESSION['login_time'] = time();
        $_SESSION['csrf_token'] = Utils::generateSecureToken();
        
        // Configurar timeout
        if ($rememberMe) {
            $this->sessionTimeout = REMEMBER_ME_LIFETIME;
            $_SESSION['remember_me'] = true;
        }
        
        $_SESSION['expires_at'] = time() + $this->sessionTimeout;
    }
    
    /**
     * Renova sessão
     */
    private function renewSession() {
        $_SESSION['login_time'] = time();
        
        $timeout = isset($_SESSION['remember_me']) ? REMEMBER_ME_LIFETIME : COOKIE_LIFETIME;
        $_SESSION['expires_at'] = time() + $timeout;
    }
    
    /**
     * Atualiza último login
     */
    private function updateLastLogin($userId) {
        $sql = "UPDATE cms_users SET last_login = NOW() WHERE id = ?";
        $this->db->execute($sql, [$userId]);
    }
    
    /**
     * Formata dados do usuário para retorno
     */
    private function formatUserData($user) {
        // Remover senha dos dados retornados
        unset($user['password']);
        
        return [
            'id' => (int)$user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'full_name' => trim($user['first_name'] . ' ' . $user['last_name']),
            'role' => $user['role'],
            'status' => $user['status'],
            'avatar' => $user['avatar'] ?? null,
            'last_login' => $user['last_login'],
            'created_at' => $user['created_at'],
            'updated_at' => $user['updated_at'] ?? null
        ];
    }
    
    /**
     * Valida dados do usuário
     */
    private function validateUserData($data) {
        $required = ['username', 'email', 'password', 'first_name', 'last_name'];
        
        foreach ($required as $field) {
            if (empty($data[$field])) {
                throw new Exception("Campo '$field' é obrigatório");
            }
        }
        
        if (!Utils::isValidEmail($data['email'])) {
            throw new Exception("Email inválido");
        }
        
        if (strlen($data['password']) < 6) {
            throw new Exception("Senha deve ter pelo menos 6 caracteres");
        }
        
        if (strlen($data['username']) < 3) {
            throw new Exception("Nome de usuário deve ter pelo menos 3 caracteres");
        }
        
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $data['username'])) {
            throw new Exception("Nome de usuário deve conter apenas letras, números e underscore");
        }
        
        $validRoles = ['admin', 'editor', 'viewer'];
        if (isset($data['role']) && !in_array($data['role'], $validRoles)) {
            throw new Exception("Papel de usuário inválido");
        }
    }
    
    /**
     * Verifica se usuário já existe
     */
    private function userExists($username, $email) {
        $sql = "SELECT COUNT(*) FROM cms_users WHERE username = ? OR email = ?";
        return $this->db->count($sql, [$username, $email]) > 0;
    }
}
?>