<?php
/**
 * Gerenciador de Arquivos - Gracie Barra CMS
 * Arquivo: public/api/classes/FileManager.php
 */

require_once __DIR__ . '/../config/database.php';

class FileManager {
    private $db;
    private $logger;
    private $uploadDir;
    private $allowedTypes;
    private $maxFileSize;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new SecurityLogger();
        $this->uploadDir = UPLOAD_DIR;
        $this->allowedTypes = ALLOWED_MIME_TYPES;
        $this->maxFileSize = MAX_FILE_SIZE;
        
        // Criar diretório de upload se não existir
        $this->ensureUploadDirectory();
    }
    
    /**
     * Faz upload de um arquivo
     */
    public function uploadFile($file, $userId, $altText = '', $description = '') {
        try {
            // Validar arquivo
            $this->validateFile($file);
            
            // Gerar nome único e seguro
            $filename = $this->generateUniqueFilename($file['name']);
            $filePath = $this->uploadDir . $filename;
            $fileUrl = $this->getFileUrl($filename);
            
            // Mover arquivo para destino
            if (!move_uploaded_file($file['tmp_name'], $filePath)) {
                throw new Exception("Erro ao mover arquivo para o destino");
            }
            
            // Obter informações do arquivo
            $fileInfo = $this->getFileInfo($filePath, $file);
            
            // Criar thumbnail se for imagem
            $this->createThumbnailIfImage($filePath, $fileInfo);
            
            // Salvar informações no banco
            $fileId = $this->saveFileToDatabase($filename, $filePath, $fileUrl, $fileInfo, $altText, $description, $userId);
            
            // Log da atividade
            $this->logger->logActivity($userId, 'upload_file', 'media', 
                "Arquivo '{$file['name']}' enviado com sucesso");
            
            return [
                'success' => true,
                'file_id' => $fileId,
                'filename' => $filename,
                'file_path' => $filePath,
                'file_url' => $fileUrl,
                'file_info' => $fileInfo,
                'message' => 'Arquivo enviado com sucesso'
            ];
            
        } catch (Exception $e) {
            // Limpar arquivo se houve erro após upload
            if (isset($filePath) && file_exists($filePath)) {
                unlink($filePath);
            }
            
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Upload de múltiplos arquivos
     */
    public function uploadMultipleFiles($files, $userId) {
        $results = [];
        $successCount = 0;
        $totalFiles = count($files['name']);
        
        for ($i = 0; $i < $totalFiles; $i++) {
            $file = [
                'name' => $files['name'][$i],
                'type' => $files['type'][$i],
                'tmp_name' => $files['tmp_name'][$i],
                'error' => $files['error'][$i],
                'size' => $files['size'][$i]
            ];
            
            $result = $this->uploadFile($file, $userId);
            $results[] = $result;
            
            if ($result['success']) {
                $successCount++;
            }
        }
        
        return [
            'success' => $successCount > 0,
            'total' => $totalFiles,
            'success_count' => $successCount,
            'failed_count' => $totalFiles - $successCount,
            'results' => $results,
            'message' => "$successCount de $totalFiles arquivos enviados com sucesso"
        ];
    }
    
    /**
     * Lista arquivos com filtros
     */
    public function getFiles($filters = []) {
        try {
            $sql = "SELECT mf.*, u.username, u.first_name, u.last_name 
                    FROM media_files mf 
                    LEFT JOIN cms_users u ON mf.uploaded_by = u.id 
                    WHERE 1=1";
            $params = [];
            
            // Aplicar filtros
            if (isset($filters['type']) && !empty($filters['type'])) {
                if ($filters['type'] === 'image') {
                    $sql .= " AND mf.mime_type LIKE 'image/%'";
                } else {
                    $sql .= " AND mf.mime_type LIKE ?";
                    $params[] = $filters['type'] . '%';
                }
            }
            
            if (isset($filters['user_id']) && is_numeric($filters['user_id'])) {
                $sql .= " AND mf.uploaded_by = ?";
                $params[] = (int)$filters['user_id'];
            }
            
            if (isset($filters['search']) && !empty($filters['search'])) {
                $searchTerm = '%' . $this->db->escapeLike($filters['search']) . '%';
                $sql .= " AND (mf.original_name LIKE ? OR mf.alt_text LIKE ? OR mf.description LIKE ?)";
                $params[] = $searchTerm;
                $params[] = $searchTerm;
                $params[] = $searchTerm;
            }
            
            if (isset($filters['featured']) && $filters['featured']) {
                $sql .= " AND mf.is_featured = 1";
            }
            
            $sql .= " ORDER BY mf.created_at DESC";
            
            if (isset($filters['limit']) && is_numeric($filters['limit'])) {
                if (isset($filters['offset']) && is_numeric($filters['offset'])) {
                    $sql .= " LIMIT ?, ?";
                    $params[] = (int)$filters['offset'];
                    $params[] = (int)$filters['limit'];
                } else {
                    $sql .= " LIMIT ?";
                    $params[] = (int)$filters['limit'];
                }
            }
            
            $files = $this->db->fetchAll($sql, $params);
            
            // Processar dados dos arquivos
            foreach ($files as &$file) {
                $file = $this->processFileData($file);
            }
            
            return $files;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao listar arquivos: " . $e->getMessage());
        }
    }
    
    /**
     * Obtém informações de um arquivo específico
     */
    public function getFile($fileId) {
        try {
            $sql = "SELECT mf.*, u.username, u.first_name, u.last_name 
                    FROM media_files mf 
                    LEFT JOIN cms_users u ON mf.uploaded_by = u.id 
                    WHERE mf.id = ?";
            
            $file = $this->db->fetchOne($sql, [(int)$fileId]);
            
            if ($file) {
                return $this->processFileData($file);
            }
            
            return null;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao obter arquivo: " . $e->getMessage());
        }
    }
    
    /**
     * Atualiza informações de um arquivo
     */
    public function updateFile($fileId, $data, $userId) {
        try {
            $fileId = (int)$fileId;
            
            // Verificar se arquivo existe
            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception("Arquivo não encontrado");
            }
            
            // Verificar permissões (admin pode editar qualquer arquivo, usuário só seus próprios)
            $auth = new Auth();
            $currentUser = $auth->getCurrentUser();
            if ($currentUser['role'] !== 'admin' && $file['uploaded_by'] != $userId) {
                throw new Exception("Sem permissão para editar este arquivo");
            }
            
            // Campos permitidos para atualização
            $allowedFields = ['alt_text', 'description', 'is_featured'];
            
            $updateFields = [];
            $params = [];
            
            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateFields[] = "$field = ?";
                    $value = Utils::sanitize($data[$field]);
                    
                    // Tratar boolean
                    if ($field === 'is_featured') {
                        $value = $value ? 1 : 0;
                    }
                    
                    $params[] = $value;
                }
            }
            
            if (empty($updateFields)) {
                throw new Exception("Nenhum campo válido para atualizar");
            }
            
            $params[] = $fileId;
            $sql = "UPDATE media_files SET " . implode(', ', $updateFields) . ", updated_at = NOW() WHERE id = ?";
            
            $this->db->execute($sql, $params);
            
            $this->logger->logActivity($userId, 'update_file', 'media', 
                "Arquivo ID $fileId atualizado");
            
            return [
                'success' => true,
                'message' => 'Arquivo atualizado com sucesso'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Remove um arquivo
     */
    public function deleteFile($fileId, $userId) {
        try {
            $fileId = (int)$fileId;
            
            // Buscar informações do arquivo
            $file = $this->getFile($fileId);
            if (!$file) {
                throw new Exception("Arquivo não encontrado");
            }
            
            // Verificar permissões
            $auth = new Auth();
            $currentUser = $auth->getCurrentUser();
            if ($currentUser['role'] !== 'admin' && $file['uploaded_by'] != $userId) {
                throw new Exception("Sem permissão para deletar este arquivo");
            }
            
            $this->db->beginTransaction();
            
            // Remover arquivo físico
            if (file_exists($file['file_path'])) {
                if (!unlink($file['file_path'])) {
                    error_log("Erro ao remover arquivo físico: " . $file['file_path']);
                }
            }
            
            // Remover thumbnail se existir
            $thumbnailPath = $this->getThumbnailPath($file['file_path']);
            if (file_exists($thumbnailPath)) {
                unlink($thumbnailPath);
            }
            
            // Remover do banco
            $sql = "DELETE FROM media_files WHERE id = ?";
            $this->db->execute($sql, [$fileId]);
            
            $this->db->commit();
            
            $this->logger->logActivity($userId, 'delete_file', 'media', 
                "Arquivo '{$file['original_name']}' removido");
            
            return [
                'success' => true,
                'message' => 'Arquivo removido com sucesso'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'message' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Cria thumbnail de imagem
     */
    public function createThumbnail($sourceFile, $width = 300, $height = 300) {
        try {
            if (!extension_loaded('gd')) {
                throw new Exception("Extensão GD não está disponível");
            }
            
            $imageInfo = getimagesize($sourceFile);
            if (!$imageInfo) {
                throw new Exception("Arquivo não é uma imagem válida");
            }
            
            $sourceWidth = $imageInfo[0];
            $sourceHeight = $imageInfo[1];
            $mimeType = $imageInfo['mime'];
            
            // Criar imagem fonte
            switch ($mimeType) {
                case 'image/jpeg':
                    $sourceImage = imagecreatefromjpeg($sourceFile);
                    break;
                case 'image/png':
                    $sourceImage = imagecreatefrompng($sourceFile);
                    break;
                case 'image/gif':
                    $sourceImage = imagecreatefromgif($sourceFile);
                    break;
                case 'image/webp':
                    $sourceImage = imagecreatefromwebp($sourceFile);
                    break;
                default:
                    throw new Exception("Tipo de imagem não suportado para thumbnail");
            }
            
            if (!$sourceImage) {
                throw new Exception("Erro ao carregar imagem fonte");
            }
            
            // Calcular dimensões mantendo proporção
            $ratio = min($width / $sourceWidth, $height / $sourceHeight);
            $newWidth = (int)($sourceWidth * $ratio);
            $newHeight = (int)($sourceHeight * $ratio);
            
            // Criar thumbnail
            $thumbnail = imagecreatetruecolor($newWidth, $newHeight);
            
            // Preservar transparência para PNG e GIF
            if ($mimeType === 'image/png' || $mimeType === 'image/gif') {
                imagealphablending($thumbnail, false);
                imagesavealpha($thumbnail, true);
                
                $transparent = imagecolorallocatealpha($thumbnail, 255, 255, 255, 127);
                imagefilledrectangle($thumbnail, 0, 0, $newWidth, $newHeight, $transparent);
            }
            
            // Redimensionar
            imagecopyresampled($thumbnail, $sourceImage, 0, 0, 0, 0, 
                             $newWidth, $newHeight, $sourceWidth, $sourceHeight);
            
            // Salvar thumbnail
            $thumbnailPath = $this->getThumbnailPath($sourceFile);
            $saved = false;
            
            switch ($mimeType) {
                case 'image/jpeg':
                    $saved = imagejpeg($thumbnail, $thumbnailPath, 85);
                    break;
                case 'image/png':
                    $saved = imagepng($thumbnail, $thumbnailPath, 8);
                    break;
                case 'image/gif':
                    $saved = imagegif($thumbnail, $thumbnailPath);
                    break;
                case 'image/webp':
                    $saved = imagewebp($thumbnail, $thumbnailPath, 85);
                    break;
            }
            
            // Limpar memória
            imagedestroy($sourceImage);
            imagedestroy($thumbnail);
            
            if (!$saved) {
                throw new Exception("Erro ao salvar thumbnail");
            }
            
            return $thumbnailPath;
            
        } catch (Exception $e) {
            error_log("Erro ao criar thumbnail: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Obtém estatísticas de arquivos
     */
    public function getStats() {
        try {
            $stats = [];
            
            // Total de arquivos
            $sql = "SELECT COUNT(*) as total_files FROM media_files";
            $stats['total_files'] = $this->db->fetchOne($sql)['total_files'];
            
            // Tamanho total
            $sql = "SELECT SUM(file_size) as total_size FROM media_files";
            $totalSize = $this->db->fetchOne($sql)['total_size'] ?? 0;
            $stats['total_size'] = $totalSize;
            $stats['total_size_formatted'] = Utils::formatBytes($totalSize);
            
            // Arquivos por tipo
            $sql = "SELECT 
                        CASE 
                            WHEN mime_type LIKE 'image/%' THEN 'Imagens'
                            WHEN mime_type LIKE 'video/%' THEN 'Vídeos'
                            WHEN mime_type LIKE 'audio/%' THEN 'Áudios'
                            WHEN mime_type LIKE 'application/pdf' THEN 'PDFs'
                            ELSE 'Outros'
                        END as type_group,
                        COUNT(*) as count,
                        SUM(file_size) as size
                    FROM media_files 
                    GROUP BY type_group
                    ORDER BY count DESC";
            $stats['files_by_type'] = $this->db->fetchAll($sql);
            
            // Formatar tamanhos
            foreach ($stats['files_by_type'] as &$type) {
                $type['size_formatted'] = Utils::formatBytes($type['size']);
            }
            
            // Uploads recentes (últimos 7 dias)
            $sql = "SELECT COUNT(*) as recent_uploads 
                    FROM media_files 
                    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            $stats['recent_uploads'] = $this->db->fetchOne($sql)['recent_uploads'];
            
            // Arquivo mais recente
            $sql = "SELECT original_name, created_at 
                    FROM media_files 
                    ORDER BY created_at DESC 
                    LIMIT 1";
            $stats['latest_file'] = $this->db->fetchOne($sql);
            
            // Top uploaders
            $sql = "SELECT u.first_name, u.last_name, u.username, COUNT(*) as upload_count
                    FROM media_files mf
                    JOIN cms_users u ON mf.uploaded_by = u.id
                    GROUP BY mf.uploaded_by
                    ORDER BY upload_count DESC
                    LIMIT 5";
            $stats['top_uploaders'] = $this->db->fetchAll($sql);
            
            return $stats;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao obter estatísticas: " . $e->getMessage());
        }
    }
    
    /**
     * Limpa arquivos órfãos (não referenciados no banco)
     */
    public function cleanupOrphanFiles($userId) {
        try {
            $orphanCount = 0;
            $cleanedSize = 0;
            
            // Buscar todos os arquivos do diretório
            $files = glob($this->uploadDir . '*');
            
            foreach ($files as $filePath) {
                $filename = basename($filePath);
                
                // Ignorar diretórios e arquivos de sistema
                if (is_dir($filePath) || strpos($filename, '.') === 0) {
                    continue;
                }
                
                // Verificar se arquivo está no banco
                $sql = "SELECT id FROM media_files WHERE filename = ?";
                $exists = $this->db->fetchOne($sql, [$filename]);
                
                if (!$exists) {
                    // Arquivo órfão, obter tamanho antes de remover
                    $fileSize = filesize($filePath);
                    
                    // Remover arquivo
                    if (unlink($filePath)) {
                        $orphanCount++;
                        $cleanedSize += $fileSize;
                    }
                }
            }
            
            $this->logger->logActivity($userId, 'cleanup_orphan_files', 'media', 
                "$orphanCount arquivos órfãos removidos (" . Utils::formatBytes($cleanedSize) . ")");
            
            return [
                'success' => true,
                'orphan_count' => $orphanCount,
                'cleaned_size' => $cleanedSize,
                'cleaned_size_formatted' => Utils::formatBytes($cleanedSize),
                'message' => "$orphanCount arquivos órfãos removidos"
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Erro na limpeza: ' . $e->getMessage()
            ];
        }
    }
    
    // ===== MÉTODOS PRIVADOS =====
    
    /**
     * Garante que o diretório de upload existe
     */
    private function ensureUploadDirectory() {
        if (!is_dir($this->uploadDir)) {
            if (!mkdir($this->uploadDir, 0755, true)) {
                throw new Exception("Não foi possível criar diretório de upload");
            }
        }
        
        if (!is_writable($this->uploadDir)) {
            throw new Exception("Diretório de upload não tem permissão de escrita");
        }
    }
    
    /**
     * Valida arquivo para upload
     */
    private function validateFile($file) {
        // Verificar erros de upload
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception("Erro no upload: " . $this->getUploadErrorMessage($file['error']));
        }
        
        // Verificar tamanho
        if ($file['size'] > $this->maxFileSize) {
            throw new Exception("Arquivo muito grande. Tamanho máximo: " . Utils::formatBytes($this->maxFileSize));
        }
        
        if ($file['size'] <= 0) {
            throw new Exception("Arquivo vazio");
        }
        
        // Verificar extensão
        if (!Utils::isValidFileExtension($file['name'])) {
            throw new Exception("Tipo de arquivo não permitido. Extensões permitidas: " . implode(', ', ALLOWED_EXTENSIONS));
        }
        
        // Verificar MIME type
        if (!Utils::isValidMimeType($file['type'])) {
            throw new Exception("Tipo MIME não permitido");
        }
        
        // Verificação adicional para imagens
        if (strpos($file['type'], 'image/') === 0) {
            $imageInfo = getimagesize($file['tmp_name']);
            if (!$imageInfo) {
                throw new Exception("Arquivo não é uma imagem válida");
            }
            
            // Verificar dimensões máximas (opcional)
            $maxWidth = 4000;
            $maxHeight = 4000;
            if ($imageInfo[0] > $maxWidth || $imageInfo[1] > $maxHeight) {
                throw new Exception("Imagem muito grande. Dimensões máximas: {$maxWidth}x{$maxHeight}px");
            }
        }
        
        // Verificar se é um arquivo executável (segurança)
        $dangerousExtensions = ['php', 'js', 'html', 'htm', 'exe', 'bat', 'cmd', 'sh'];
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (in_array($extension, $dangerousExtensions)) {
            throw new Exception("Tipo de arquivo perigoso não permitido");
        }
    }
    
    /**
     * Gera nome único e seguro para o arquivo
     */
    private function generateUniqueFilename($originalName) {
        $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
        $baseName = pathinfo($originalName, PATHINFO_FILENAME);
        
        // Limpar nome base
        $baseName = preg_replace('/[^a-zA-Z0-9-_]/', '_', $baseName);
        $baseName = substr($baseName, 0, 50); // Limitar tamanho
        
        // Gerar nome único
        do {
            $uniqueId = uniqid() . '_' . mt_rand(1000, 9999);
            $filename = $baseName . '_' . $uniqueId . '.' . $extension;
        } while (file_exists($this->uploadDir . $filename));
        
        return $filename;
    }
    
    /**
     * Obtém informações do arquivo
     */
    private function getFileInfo($filePath, $originalFile) {
        $info = [
            'file_size' => filesize($filePath),
            'mime_type' => $originalFile['type'],
            'file_extension' => strtolower(pathinfo($filePath, PATHINFO_EXTENSION)),
            'width' => null,
            'height' => null
        ];
        
        // Obter dimensões se for imagem
        if (strpos($info['mime_type'], 'image/') === 0) {
            $imageInfo = getimagesize($filePath);
            if ($imageInfo) {
                $info['width'] = $imageInfo[0];
                $info['height'] = $imageInfo[1];
            }
        }
        
        return $info;
    }
    
    /**
     * Cria thumbnail se for imagem
     */
    private function createThumbnailIfImage($filePath, $fileInfo) {
        if (strpos($fileInfo['mime_type'], 'image/') === 0) {
            $this->createThumbnail($filePath);
        }
    }
    
    /**
     * Salva informações do arquivo no banco
     */
    private function saveFileToDatabase($filename, $filePath, $fileUrl, $fileInfo, $altText, $description, $userId) {
        $sql = "INSERT INTO media_files 
                (filename, original_name, file_path, file_url, file_size, mime_type, file_extension, 
                 width, height, alt_text, description, uploaded_by, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())";
        
        $params = [
            $filename,
            basename($filePath), // original_name será derivado do filename
            $filePath,
            $fileUrl,
            $fileInfo['file_size'],
            $fileInfo['mime_type'],
            $fileInfo['file_extension'],
            $fileInfo['width'],
            $fileInfo['height'],
            Utils::sanitize($altText),
            Utils::sanitize($description),
            $userId
        ];
        
        return $this->db->insert($sql, $params);
    }
    
    /**
     * Processa dados do arquivo para retorno
     */
    private function processFileData($file) {
        $file['file_size_formatted'] = Utils::formatBytes($file['file_size']);
        $file['is_image'] = strpos($file['mime_type'], 'image/') === 0;
        $file['uploader_name'] = trim($file['first_name'] . ' ' . $file['last_name']) ?: $file['username'];
        
        // Adicionar URL do thumbnail se existir
        if ($file['is_image']) {
            $thumbnailPath = $this->getThumbnailPath($file['file_path']);
            if (file_exists($thumbnailPath)) {
                $file['thumbnail_url'] = $this->getFileUrl('thumb_' . $file['filename']);
            }
        }
        
        // Limpar dados sensíveis
        unset($file['first_name'], $file['last_name']);
        
        return $file;
    }
    
    /**
     * Obtém URL do arquivo
     */
    private function getFileUrl($filename) {
        return SITE_URL . '/' . $this->uploadDir . $filename;
    }
    
    /**
     * Obtém caminho do thumbnail
     */
    private function getThumbnailPath($originalPath) {
        $pathInfo = pathinfo($originalPath);
        return $pathInfo['dirname'] . '/thumb_' . $pathInfo['basename'];
    }
    
    /**
     * Obtém mensagem de erro de upload
     */
    private function getUploadErrorMessage($errorCode) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'Arquivo muito grande (limite do servidor)',
            UPLOAD_ERR_FORM_SIZE => 'Arquivo muito grande (limite do formulário)',
            UPLOAD_ERR_PARTIAL => 'Upload parcial - arquivo incompleto',
            UPLOAD_ERR_NO_FILE => 'Nenhum arquivo foi enviado',
            UPLOAD_ERR_NO_TMP_DIR => 'Diretório temporário ausente',
            UPLOAD_ERR_CANT_WRITE => 'Erro de escrita no disco',
            UPLOAD_ERR_EXTENSION => 'Upload interrompido por extensão PHP'
        ];
        
        return $errors[$errorCode] ?? 'Erro desconhecido no upload';
    }
}
?>