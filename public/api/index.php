<?php
/**
 * Roteador Principal da API - Gracie Barra CMS
 * Arquivo: public/api/index.php
 */

// Headers de segurança e CORS
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

// Responder a requisições OPTIONS (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Incluir dependências
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/classes/Auth.php';
require_once __DIR__ . '/classes/ContentManager.php';
require_once __DIR__ . '/classes/FileManager.php';

// Iniciar sessão
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Configurar tratamento de erros
set_error_handler('handleError');
set_exception_handler('handleException');

/**
 * Função para resposta JSON padronizada
 */
function jsonResponse($data, $statusCode = 200, $headers = []) {
    http_response_code($statusCode);
    
    foreach ($headers as $header => $value) {
        header("$header: $value");
    }
    
    // Adicionar metadados da resposta
    if (is_array($data)) {
        $data['timestamp'] = date('c');
        $data['status_code'] = $statusCode;
        
        if (DEBUG_MODE) {
            $data['debug'] = [
                'memory_usage' => memory_get_usage(true),
                'execution_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT'],
                'php_version' => PHP_VERSION
            ];
        }
    }
    
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit();
}

/**
 * Função para verificar autenticação
 */
function requireAuth() {
    $auth = new Auth();
    if (!$auth->isAuthenticated()) {
        jsonResponse([
            'success' => false,
            'error' => 'Acesso negado',
            'message' => 'Usuário não autenticado'
        ], 401);
    }
    return $auth->getCurrentUser();
}

/**
 * Função para verificar permissão específica
 */
function requirePermission($action, $section = null) {
    $auth = new Auth();
    $user = requireAuth();
    
    if (!$auth->hasPermission($action, $section)) {
        jsonResponse([
            'success' => false,
            'error' => 'Permissão insuficiente',
            'message' => 'Você não tem permissão para esta ação'
        ], 403);
    }
    
    return $user;
}

/**
 * Função para validar método HTTP
 */
function validateMethod($allowedMethods) {
    $method = $_SERVER['REQUEST_METHOD'];
    if (!in_array($method, $allowedMethods)) {
        jsonResponse([
            'success' => false,
            'error' => 'Método não permitido',
            'message' => "Método $method não é permitido para este endpoint"
        ], 405);
    }
    return $method;
}

/**
 * Função para obter dados do corpo da requisição
 */
function getRequestData() {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            jsonResponse([
                'success' => false,
                'error' => 'JSON inválido',
                'message' => 'Dados JSON malformados'
            ], 400);
        }
        
        return $data ?: [];
    }
    
    return $_POST;
}

/**
 * Função para validar parâmetros obrigatórios
 */
function validateRequired($data, $requiredFields) {
    $missing = [];
    
    foreach ($requiredFields as $field) {
        if (!isset($data[$field]) || $data[$field] === '' || $data[$field] === null) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        jsonResponse([
            'success' => false,
            'error' => 'Campos obrigatórios ausentes',
            'message' => 'Os seguintes campos são obrigatórios: ' . implode(', ', $missing),
            'missing_fields' => $missing
        ], 400);
    }
}

/**
 * Tratamento de erros personalizado
 */
function handleError($severity, $message, $file, $line) {
    if (error_reporting() & $severity) {
        $error = [
            'type' => 'PHP Error',
            'message' => $message,
            'file' => $file,
            'line' => $line,
            'severity' => $severity
        ];
        
        error_log(json_encode($error));
        
        if (DEBUG_MODE) {
            jsonResponse([
                'success' => false,
                'error' => 'Erro interno',
                'debug' => $error
            ], 500);
        }
    }
}

/**
 * Tratamento de exceções
 */
function handleException($exception) {
    $error = [
        'type' => get_class($exception),
        'message' => $exception->getMessage(),
        'file' => $exception->getFile(),
        'line' => $exception->getLine(),
        'trace' => $exception->getTraceAsString()
    ];
    
    error_log(json_encode($error));
    
    jsonResponse([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'message' => DEBUG_MODE ? $exception->getMessage() : 'Ocorreu um erro interno'
    ], 500);
}

// Obter rota da URL
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePath = dirname($scriptName);

// Remover base path e query string
$route = str_replace($basePath, '', $requestUri);
$route = strtok($route, '?'); // Remove query string
$route = trim($route, '/');

// Se não há rota, definir como vazia
if (empty($route) || $route === 'index.php') {
    $route = '';
}

// Dividir rota em segmentos
$segments = $route ? explode('/', $route) : [];

try {
    // Roteamento principal
    switch ($segments[0] ?? '') {
        case 'auth':
            handleAuthRoutes($segments);
            break;
            
        case 'content':
            handleContentRoutes($segments);
            break;
            
        case 'files':
            handleFileRoutes($segments);
            break;
            
        case 'users':
            handleUserRoutes($segments);
            break;
            
        case 'settings':
            handleSettingsRoutes($segments);
            break;
            
        case 'dashboard':
            handleDashboardRoutes($segments);
            break;
            
        case 'system':
            handleSystemRoutes($segments);
            break;
            
        case '':
            // Rota raiz - informações da API
            jsonResponse([
                'success' => true,
                'message' => 'Gracie Barra CMS API',
                'version' => '1.0.0',
                'endpoints' => [
                    'auth' => 'Autenticação de usuários',
                    'content' => 'Gerenciamento de conteúdo',
                    'files' => 'Gerenciamento de arquivos',
                    'users' => 'Gerenciamento de usuários',
                    'settings' => 'Configurações do sistema',
                    'dashboard' => 'Dados do dashboard'
                ]
            ]);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Endpoint não encontrado',
                'message' => "Endpoint '/{$segments[0]}' não existe"
            ], 404);
    }
    
} catch (Exception $e) {
    handleException($e);
}

/**
 * Rotas de autenticação
 */
function handleAuthRoutes($segments) {
    $auth = new Auth();
    $action = $segments[1] ?? '';
    
    switch ($action) {
        case 'login':
            validateMethod(['POST']);
            
            $data = getRequestData();
            validateRequired($data, ['username', 'password']);
            
            $result = $auth->login(
                $data['username'],
                $data['password'],
                $data['remember_me'] ?? false
            );
            
            jsonResponse($result, $result['success'] ? 200 : 401);
            break;
            
        case 'logout':
            validateMethod(['POST']);
            
            $result = $auth->logout();
            jsonResponse($result);
            break;
            
        case 'me':
            validateMethod(['GET']);
            
            $user = $auth->getCurrentUser();
            if ($user) {
                jsonResponse([
                    'success' => true,
                    'user' => $user
                ]);
            } else {
                jsonResponse([
                    'success' => false,
                    'message' => 'Usuário não autenticado'
                ], 401);
            }
            break;
            
        case 'check':
            validateMethod(['GET']);
            
            jsonResponse([
                'success' => true,
                'authenticated' => $auth->isAuthenticated()
            ]);
            break;
            
        case 'refresh':
            validateMethod(['POST']);
            
            $user = requireAuth();
            jsonResponse([
                'success' => true,
                'message' => 'Sessão renovada',
                'user' => $user
            ]);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de autenticação não encontrada',
                'message' => "Ação '/auth/$action' não existe"
            ], 404);
    }
}

/**
 * Rotas de conteúdo
 */
function handleContentRoutes($segments) {
    $contentManager = new ContentManager();
    $action = $segments[1] ?? '';
    
    switch ($action) {
        case 'sections':
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                requireAuth();
                
                if (isset($segments[2])) {
                    // Seção específica
                    $section = Utils::sanitize($segments[2]);
                    $content = $contentManager->getSectionContent($section);
                    jsonResponse([
                        'success' => true,
                        'section' => $section,
                        'content' => $content
                    ]);
                } else {
                    // Todas as seções
                    $content = $contentManager->getAllContent();
                    jsonResponse([
                        'success' => true,
                        'content' => $content
                    ]);
                }
                
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $user = requirePermission('edit');
                
                if (!isset($segments[2])) {
                    jsonResponse([
                        'success' => false,
                        'error' => 'Seção não especificada'
                    ], 400);
                }
                
                $section = Utils::sanitize($segments[2]);
                $data = getRequestData();
                
                $result = $contentManager->updateSectionContent($section, $data, $user['id']);
                jsonResponse($result, $result['success'] ? 200 : 400);
                
            } else {
                validateMethod(['GET', 'PUT']);
            }
            break;
            
        case 'field':
            validateMethod(['DELETE']);
            
            $user = requirePermission('edit');
            $data = getRequestData();
            validateRequired($data, ['section', 'field_name']);
            
            $result = $contentManager->removeField($data['section'], $data['field_name'], $user['id']);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'search':
            validateMethod(['GET']);
            requireAuth();
            
            $term = $_GET['q'] ?? '';
            if (empty($term)) {
                jsonResponse([
                    'success' => false,
                    'error' => 'Termo de busca obrigatório'
                ], 400);
            }
            
            $sections = isset($_GET['sections']) ? explode(',', $_GET['sections']) : null;
            $results = $contentManager->searchContent($term, $sections);
            
            jsonResponse([
                'success' => true,
                'query' => $term,
                'results' => $results,
                'count' => count($results)
            ]);
            break;
            
        case 'backup':
            if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                $user = requirePermission('edit');
                
                $data = getRequestData();
                validateRequired($data, ['section']);
                
                $success = $contentManager->createBackup($data['section'], $user['id']);
                jsonResponse([
                    'success' => $success,
                    'message' => $success ? 'Backup criado com sucesso' : 'Erro ao criar backup'
                ]);
                
            } elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
                requireAuth();
                
                $section = $_GET['section'] ?? null;
                $limit = (int)($_GET['limit'] ?? 50);
                
                $backups = $contentManager->getBackups($section, $limit);
                jsonResponse([
                    'success' => true,
                    'backups' => $backups
                ]);
                
            } else {
                validateMethod(['POST', 'GET']);
            }
            break;
            
        case 'restore':
            validateMethod(['POST']);
            
            $user = requirePermission('edit');
            $data = getRequestData();
            validateRequired($data, ['backup_id']);
            
            $result = $contentManager->restoreBackup($data['backup_id'], $user['id']);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'stats':
            validateMethod(['GET']);
            requireAuth();
            
            $stats = $contentManager->getContentStats();
            jsonResponse([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de conteúdo não encontrada',
                'message' => "Ação '/content/$action' não existe"
            ], 404);
    }
}

/**
 * Rotas de arquivos
 */
function handleFileRoutes($segments) {
    $fileManager = new FileManager();
    $action = $segments[1] ?? '';
    
    switch ($action) {
        case 'upload':
            validateMethod(['POST']);
            
            $user = requirePermission('upload');
            
            if (empty($_FILES['file'])) {
                jsonResponse([
                    'success' => false,
                    'error' => 'Nenhum arquivo enviado'
                ], 400);
            }
            
            $altText = $_POST['alt_text'] ?? '';
            $description = $_POST['description'] ?? '';
            
            // Upload múltiplo ou único
            if (is_array($_FILES['file']['name'])) {
                $result = $fileManager->uploadMultipleFiles($_FILES['file'], $user['id']);
            } else {
                $result = $fileManager->uploadFile($_FILES['file'], $user['id'], $altText, $description);
            }
            
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'list':
            validateMethod(['GET']);
            requireAuth();
            
            $filters = [
                'type' => $_GET['type'] ?? null,
                'user_id' => $_GET['user_id'] ?? null,
                'search' => $_GET['search'] ?? null,
                'limit' => (int)($_GET['limit'] ?? 50),
                'offset' => (int)($_GET['offset'] ?? 0)
            ];
            
            $files = $fileManager->getFiles($filters);
            jsonResponse([
                'success' => true,
                'files' => $files,
                'count' => count($files)
            ]);
            break;
            
        case 'details':
            $fileId = (int)($segments[2] ?? 0);
            
            if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                requireAuth();
                
                if (!$fileId) {
                    jsonResponse([
                        'success' => false,
                        'error' => 'ID do arquivo obrigatório'
                    ], 400);
                }
                
                $file = $fileManager->getFile($fileId);
                if ($file) {
                    jsonResponse([
                        'success' => true,
                        'file' => $file
                    ]);
                } else {
                    jsonResponse([
                        'success' => false,
                        'error' => 'Arquivo não encontrado'
                    ], 404);
                }
                
            } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
                $user = requirePermission('edit');
                
                if (!$fileId) {
                    jsonResponse([
                        'success' => false,
                        'error' => 'ID do arquivo obrigatório'
                    ], 400);
                }
                
                $data = getRequestData();
                $result = $fileManager->updateFile($fileId, $data, $user['id']);
                jsonResponse($result, $result['success'] ? 200 : 400);
                
            } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
                $user = requirePermission('edit');
                
                if (!$fileId) {
                    jsonResponse([
                        'success' => false,
                        'error' => 'ID do arquivo obrigatório'
                    ], 400);
                }
                
                $result = $fileManager->deleteFile($fileId, $user['id']);
                jsonResponse($result, $result['success'] ? 200 : 400);
                
            } else {
                validateMethod(['GET', 'PUT', 'DELETE']);
            }
            break;
            
        case 'stats':
            validateMethod(['GET']);
            requireAuth();
            
            $stats = $fileManager->getStats();
            jsonResponse([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        case 'cleanup':
            validateMethod(['POST']);
            
            $user = requirePermission('edit');
            $result = $fileManager->cleanupOrphanFiles($user['id']);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de arquivo não encontrada',
                'message' => "Ação '/files/$action' não existe"
            ], 404);
    }
}

/**
 * Rotas de usuários
 */
function handleUserRoutes($segments) {
    $auth = new Auth();
    $action = $segments[1] ?? '';
    
    switch ($action) {
        case 'list':
            validateMethod(['GET']);
            requirePermission('*');
            
            $filters = [
                'role' => $_GET['role'] ?? null,
                'status' => $_GET['status'] ?? null,
                'search' => $_GET['search'] ?? null,
                'limit' => (int)($_GET['limit'] ?? 50)
            ];
            
            $users = $auth->getUsers($filters);
            jsonResponse([
                'success' => true,
                'users' => $users,
                'count' => count($users)
            ]);
            break;
            
        case 'create':
            validateMethod(['POST']);
            requirePermission('*');
            
            $data = getRequestData();
            validateRequired($data, ['username', 'email', 'password', 'first_name', 'last_name']);
            
            $result = $auth->createUser($data);
            jsonResponse($result, $result['success'] ? 201 : 400);
            break;
            
        case 'update':
            validateMethod(['PUT']);
            
            $userId = (int)($segments[2] ?? 0);
            if (!$userId) {
                jsonResponse([
                    'success' => false,
                    'error' => 'ID do usuário obrigatório'
                ], 400);
            }
            
            $data = getRequestData();
            $result = $auth->updateUser($userId, $data);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'password':
            validateMethod(['PUT']);
            
            $data = getRequestData();
            validateRequired($data, ['user_id', 'new_password']);
            
            $currentPassword = $data['current_password'] ?? '';
            $result = $auth->changePassword($data['user_id'], $currentPassword, $data['new_password']);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        case 'toggle-status':
            validateMethod(['PUT']);
            requirePermission('*');
            
            $userId = (int)($segments[2] ?? 0);
            if (!$userId) {
                jsonResponse([
                    'success' => false,
                    'error' => 'ID do usuário obrigatório'
                ], 400);
            }
            
            $result = $auth->toggleUserStatus($userId);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de usuário não encontrada',
                'message' => "Ação '/users/$action' não existe"
            ], 404);
    }
}

/**
 * Rotas de configurações
 */
function handleSettingsRoutes($segments) {
    $contentManager = new ContentManager();
    $action = $segments[1] ?? '';
    
    switch ($action) {
        case 'get':
            validateMethod(['GET']);
            requireAuth();
            
            $settings = $contentManager->getSettings();
            jsonResponse([
                'success' => true,
                'settings' => $settings
            ]);
            break;
            
        case 'update':
            validateMethod(['PUT']);
            
            $user = requirePermission('edit', 'settings');
            $data = getRequestData();
            
            $result = $contentManager->updateSettings($data, $user['id']);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de configuração não encontrada',
                'message' => "Ação '/settings/$action' não existe"
            ], 404);
    }
}

/**
 * Rotas do dashboard
 */
function handleDashboardRoutes($segments) {
    validateMethod(['GET']);
    requireAuth();
    
    $contentManager = new ContentManager();
    $fileManager = new FileManager();
    $auth = new Auth();
    $logger = new SecurityLogger();
    
    $action = $segments[1] ?? 'stats';
    
    switch ($action) {
        case 'stats':
            $stats = [
                'content' => $contentManager->getContentStats(),
                'files' => $fileManager->getStats(),
                'recent_activity' => $logger->getRecentActivity(10)
            ];
            
            // Adicionar contagem de usuários se for admin
            $currentUser = $auth->getCurrentUser();
            if ($currentUser['role'] === 'admin') {
                $users = $auth->getUsers(['limit' => 1000]);
                $stats['users'] = count($users);
                $stats['active_users'] = count(array_filter($users, function($u) {
                    return $u['status'] === 'active';
                }));
            }
            
            jsonResponse([
                'success' => true,
                'stats' => $stats
            ]);
            break;
            
        case 'activity':
            $limit = (int)($_GET['limit'] ?? 50);
            $activity = $logger->getRecentActivity($limit);
            
            jsonResponse([
                'success' => true,
                'activity' => $activity,
                'count' => count($activity)
            ]);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de dashboard não encontrada',
                'message' => "Ação '/dashboard/$action' não existe"
            ], 404);
    }
}

/**
 * Rotas do sistema
 */
function handleSystemRoutes($segments) {
    requirePermission('*'); // Apenas admin
    
    $action = $segments[1] ?? '';
    
    switch ($action) {
        case 'info':
            validateMethod(['GET']);
            
            jsonResponse([
                'success' => true,
                'system' => [
                    'php_version' => PHP_VERSION,
                    'mysql_version' => Database::getInstance()->getConnection()->query('SELECT VERSION()')->fetchColumn(),
                    'memory_limit' => ini_get('memory_limit'),
                    'max_execution_time' => ini_get('max_execution_time'),
                    'upload_max_filesize' => ini_get('upload_max_filesize'),
                    'post_max_size' => ini_get('post_max_size'),
                    'timezone' => date_default_timezone_get(),
                    'debug_mode' => DEBUG_MODE
                ]
            ]);
            break;
            
        case 'health':
            validateMethod(['GET']);
            
            $health = [
                'database' => true,
                'uploads_dir' => is_writable(UPLOAD_DIR),
                'logs_dir' => is_writable(__DIR__ . '/../../logs/'),
                'sessions' => session_status() === PHP_SESSION_ACTIVE
            ];
            
            try {
                Database::getInstance()->getConnection()->query('SELECT 1');
            } catch (Exception $e) {
                $health['database'] = false;
            }
            
            $overall = array_reduce($health, function($carry, $item) {
                return $carry && $item;
            }, true);
            
            jsonResponse([
                'success' => true,
                'health' => $health,
                'status' => $overall ? 'healthy' : 'issues'
            ], $overall ? 200 : 503);
            break;
            
        default:
            jsonResponse([
                'success' => false,
                'error' => 'Ação de sistema não encontrada',
                'message' => "Ação '/system/$action' não existe"
            ], 404);
    }
}
?>