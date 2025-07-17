<?php
/**
 * Configuração do Banco de Dados - Gracie Barra CMS
 * Arquivo: public/api/config/database.php
 */

// Configurações do banco de dados
define('DB_HOST', 'localhost');
define('DB_NAME', 'u674882802_gb');
define('DB_USER', 'u674882802_jonasgb');
define('DB_PASS', 'MinhaSenhaSegura123!'); // ⚠️ ALTERE PARA A SENHA REAL
define('DB_CHARSET', 'utf8mb4');

// Configurações de segurança
define('JWT_SECRET', 'gb_cms_secret_key_muito_segura_' . hash('sha256', 'gracie_barra_cidade_nova_2024'));
define('SESSION_NAME', 'GB_CMS_SESSION');
define('COOKIE_LIFETIME', 7200); // 2 horas
define('REMEMBER_ME_LIFETIME', 2592000); // 30 dias

// Configurações de upload
define('UPLOAD_DIR', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_EXTENSIONS', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']);
define('ALLOWED_MIME_TYPES', [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/svg+xml'
]);

// Configurações do site
define('SITE_URL', 'http://localhost'); // ⚠️ ALTERE PARA A URL REAL DO SEU SITE
define('ADMIN_EMAIL', 'admin@graciebarracidadenova.com');
define('SITE_NAME', 'Gracie Barra Cidade Nova');

// Configurações de ambiente
define('ENVIRONMENT', 'development'); // development | production
define('DEBUG_MODE', ENVIRONMENT === 'development');

// Configurar timezone
date_default_timezone_set('America/Manaus');

// Configurar relatório de erros baseado no ambiente
if (DEBUG_MODE) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
} else {
    error_reporting(E_ERROR | E_WARNING | E_PARSE);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
}

// Configurar logs
ini_set('error_log', __DIR__ . '/../../../logs/error.log');

/**
 * Classe principal do banco de dados usando padrão Singleton
 */
class Database {
    private static $instance = null;
    private $connection;
    private $transactionLevel = 0;
    
    private function __construct() {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_PERSISTENT => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci",
                PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true
            ];
            
            $this->connection = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            // Configurar SQL mode para máxima compatibilidade
            $this->connection->exec("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'");
            
        } catch (PDOException $e) {
            $this->logError("Erro de conexão com o banco: " . $e->getMessage());
            
            if (DEBUG_MODE) {
                die("Erro de conexão com o banco de dados: " . $e->getMessage());
            } else {
                die("Erro de conexão com o banco de dados. Tente novamente mais tarde.");
            }
        }
    }
    
    /**
     * Obtém a instância única da classe (Singleton)
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Retorna a conexão PDO
     */
    public function getConnection() {
        return $this->connection;
    }
    
    /**
     * Executa uma query preparada
     */
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            $this->logError("Erro na consulta SQL: " . $e->getMessage() . " | SQL: " . $sql . " | Params: " . json_encode($params));
            throw new Exception("Erro na operação do banco de dados: " . ($DEBUG_MODE ? $e->getMessage() : 'Operação falhou'));
        }
    }
    
    /**
     * Executa INSERT e retorna o ID inserido
     */
    public function insert($sql, $params = []) {
        $this->query($sql, $params);
        return $this->connection->lastInsertId();
    }
    
    /**
     * Executa UPDATE/DELETE e retorna número de linhas afetadas
     */
    public function execute($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Busca um único registro
     */
    public function fetchOne($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Busca múltiplos registros
     */
    public function fetchAll($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Conta registros
     */
    public function count($sql, $params = []) {
        $stmt = $this->query($sql, $params);
        return (int)$stmt->fetchColumn();
    }
    
    /**
     * Verifica se existe pelo menos um registro
     */
    public function exists($sql, $params = []) {
        return $this->count($sql, $params) > 0;
    }
    
    /**
     * Inicia transação com suporte a transações aninhadas
     */
    public function beginTransaction() {
        if ($this->transactionLevel === 0) {
            $result = $this->connection->beginTransaction();
        } else {
            $this->connection->exec("SAVEPOINT sp_level_{$this->transactionLevel}");
            $result = true;
        }
        
        $this->transactionLevel++;
        return $result;
    }
    
    /**
     * Confirma transação
     */
    public function commit() {
        $this->transactionLevel--;
        
        if ($this->transactionLevel === 0) {
            return $this->connection->commit();
        } else {
            $this->connection->exec("RELEASE SAVEPOINT sp_level_{$this->transactionLevel}");
            return true;
        }
    }
    
    /**
     * Desfaz transação
     */
    public function rollback() {
        $this->transactionLevel--;
        
        if ($this->transactionLevel === 0) {
            return $this->connection->rollback();
        } else {
            $this->connection->exec("ROLLBACK TO SAVEPOINT sp_level_{$this->transactionLevel}");
            return true;
        }
    }
    
    /**
     * Escapa string para uso em LIKE
     */
    public function escapeLike($string) {
        return str_replace(['%', '_'], ['\%', '\_'], $string);
    }
    
    /**
     * Log de erros
     */
    private function logError($message) {
        $logMessage = "[" . date('Y-m-d H:i:s') . "] DATABASE ERROR: " . $message . PHP_EOL;
        file_put_contents(__DIR__ . '/../../../logs/database.log', $logMessage, FILE_APPEND | LOCK_EX);
    }
    
    /**
     * Impede clonagem
     */
    private function __clone() {}
    
    /**
     * Impede deserialização
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

/**
 * Classe para logging de atividades e segurança
 */
class SecurityLogger {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Registra atividade do usuário
     */
    public function logActivity($userId, $action, $section = null, $details = null) {
        $sql = "INSERT INTO activity_logs (user_id, action, section, details, ip_address, user_agent, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())";
        
        $params = [
            $userId,
            $action,
            $section,
            $details,
            $this->getClientIP(),
            $this->getUserAgent()
        ];
        
        try {
            $this->db->query($sql, $params);
        } catch (Exception $e) {
            $this->logError("Erro ao registrar atividade: " . $e->getMessage());
        }
    }
    
    /**
     * Obtém atividades recentes
     */
    public function getRecentActivity($limit = 50, $userId = null) {
        $sql = "SELECT al.*, u.username, u.first_name, u.last_name 
                FROM activity_logs al 
                LEFT JOIN cms_users u ON al.user_id = u.id 
                WHERE 1=1";
        $params = [];
        
        if ($userId) {
            $sql .= " AND al.user_id = ?";
            $params[] = $userId;
        }
        
        $sql .= " ORDER BY al.created_at DESC LIMIT ?";
        $params[] = (int)$limit;
        
        return $this->db->fetchAll($sql, $params);
    }
    
    /**
     * Registra tentativa de login falhada
     */
    public function logFailedLogin($username) {
        $this->logActivity(0, 'failed_login', 'auth', "Tentativa de login falhada para: $username");
    }
    
    /**
     * Verifica se IP está sendo bloqueado por muitas tentativas
     */
    public function isIPBlocked($maxAttempts = 5, $timeWindow = 900) { // 15 minutos
        $ip = $this->getClientIP();
        
        $sql = "SELECT COUNT(*) FROM activity_logs 
                WHERE action = 'failed_login' 
                AND ip_address = ? 
                AND created_at > DATE_SUB(NOW(), INTERVAL ? SECOND)";
        
        $attempts = $this->db->count($sql, [$ip, $timeWindow]);
        return $attempts >= $maxAttempts;
    }
    
    /**
     * Obtém IP real do cliente
     */
    private function getClientIP() {
        $ipKeys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
        
        foreach ($ipKeys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                
                // Para X-Forwarded-For, pegar o primeiro IP
                if (strpos($ip, ',') !== false) {
                    $ip = trim(explode(',', $ip)[0]);
                }
                
                // Validar IP
                if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                    return $ip;
                }
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
    
    /**
     * Obtém User Agent do cliente
     */
    private function getUserAgent() {
        return substr($_SERVER['HTTP_USER_AGENT'] ?? 'Unknown', 0, 500);
    }
    
    private function logError($message) {
        error_log("[SecurityLogger] " . $message);
    }
}

/**
 * Classe utilitária para operações comuns
 */
class Utils {
    /**
     * Sanitiza dados de entrada
     */
    public static function sanitize($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitize'], $data);
        }
        
        if (is_string($data)) {
            $data = trim($data);
            $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
            return $data;
        }
        
        return $data;
    }
    
    /**
     * Valida email
     */
    public static function isValidEmail($email) {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }
    
    /**
     * Valida URL
     */
    public static function isValidURL($url) {
        return filter_var($url, FILTER_VALIDATE_URL) !== false;
    }
    
    /**
     * Gera hash seguro de senha
     */
    public static function hashPassword($password) {
        return password_hash($password, PASSWORD_ARGON2ID, [
            'memory_cost' => 65536, // 64 MB
            'time_cost' => 4,       // 4 iterations
            'threads' => 3          // 3 threads
        ]);
    }
    
    /**
     * Verifica senha
     */
    public static function verifyPassword($password, $hash) {
        return password_verify($password, $hash);
    }
    
    /**
     * Gera token seguro
     */
    public static function generateSecureToken($length = 32) {
        return bin2hex(random_bytes($length));
    }
    
    /**
     * Valida extensão de arquivo
     */
    public static function isValidFileExtension($filename) {
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        return in_array($extension, ALLOWED_EXTENSIONS);
    }
    
    /**
     * Valida MIME type
     */
    public static function isValidMimeType($mimeType) {
        return in_array($mimeType, ALLOWED_MIME_TYPES);
    }
    
    /**
     * Formata bytes para exibição
     */
    public static function formatBytes($size, $precision = 2) {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        
        for ($i = 0; $size > 1024 && $i < count($units) - 1; $i++) {
            $size /= 1024;
        }
        
        return round($size, $precision) . ' ' . $units[$i];
    }
    
    /**
     * Gera slug a partir de string
     */
    public static function generateSlug($string) {
        $string = strtolower($string);
        $string = preg_replace('/[^a-z0-9-]/', '-', $string);
        $string = preg_replace('/-+/', '-', $string);
        $string = trim($string, '-');
        return $string;
    }
    
    /**
     * Valida CSRF token
     */
    public static function validateCSRFToken($token) {
        return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * Gera CSRF token
     */
    public static function generateCSRFToken() {
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = self::generateSecureToken();
        }
        return $_SESSION['csrf_token'];
    }
}

// Configurar headers de segurança
if (!DEBUG_MODE) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    
    if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
        header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    }
}

// Configurar sessão segura
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 1 : 0);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Strict');
session_name(SESSION_NAME);

// Verificar se diretórios necessários existem
$requiredDirs = [
    __DIR__ . '/../../../logs/',
    __DIR__ . '/../uploads/'
];

foreach ($requiredDirs as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// Criar arquivo .htaccess para logs se não existir
$logHtaccess = __DIR__ . '/../../../logs/.htaccess';
if (!file_exists($logHtaccess)) {
    file_put_contents($logHtaccess, "Deny from all\n");
}

// Criar arquivo .htaccess para uploads se não existir
$uploadHtaccess = __DIR__ . '/../uploads/.htaccess';
if (!file_exists($uploadHtaccess)) {
    $htaccessContent = "Options -Indexes\nOptions -ExecCGI\n\n<Files *.php>\n    Deny from all\n</Files>\n\n<FilesMatch \"\.(jpg|jpeg|png|gif|webp|svg)$\">\n    Allow from all\n</FilesMatch>\n";
    file_put_contents($uploadHtaccess, $htaccessContent);
}

// Log de inicialização
if (DEBUG_MODE) {
    error_log("[" . date('Y-m-d H:i:s') . "] CMS Database initialized successfully");
}
?>