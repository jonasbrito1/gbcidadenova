<?php
/**
 * Gerenciador de Conteúdo - Gracie Barra CMS
 * Arquivo: public/api/classes/ContentManager.php
 */

require_once __DIR__ . '/../config/database.php';

class ContentManager {
    private $db;
    private $logger;
    
    public function __construct() {
        $this->db = Database::getInstance();
        $this->logger = new SecurityLogger();
    }
    
    /**
     * Obtém conteúdo de uma seção específica
     */
    public function getSectionContent($section) {
        try {
            $section = Utils::sanitize($section);
            
            $sql = "SELECT field_name, field_value, field_type, updated_at 
                    FROM site_content 
                    WHERE section = ? 
                    ORDER BY field_name";
            
            $results = $this->db->fetchAll($sql, [$section]);
            
            $content = [];
            foreach ($results as $row) {
                $value = $this->processFieldValue($row['field_value'], $row['field_type']);
                $content[$row['field_name']] = $value;
            }
            
            return $content;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao carregar conteúdo da seção: " . $e->getMessage());
        }
    }
    
    /**
     * Obtém todo o conteúdo do site
     */
    public function getAllContent() {
        try {
            $sql = "SELECT section, field_name, field_value, field_type, updated_at 
                    FROM site_content 
                    ORDER BY section, field_name";
            
            $results = $this->db->fetchAll($sql);
            
            $content = [];
            foreach ($results as $row) {
                $value = $this->processFieldValue($row['field_value'], $row['field_type']);
                
                if (!isset($content[$row['section']])) {
                    $content[$row['section']] = [];
                }
                
                $content[$row['section']][$row['field_name']] = $value;
            }
            
            return $content;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao carregar todo o conteúdo: " . $e->getMessage());
        }
    }
    
    /**
     * Atualiza conteúdo de uma seção
     */
    public function updateSectionContent($section, $data, $userId) {
        try {
            $section = Utils::sanitize($section);
            
            if (empty($data) || !is_array($data)) {
                throw new Exception("Dados inválidos para atualização");
            }
            
            $this->db->beginTransaction();
            
            // Criar backup antes da atualização
            $this->createBackup($section, $userId);
            
            $updatedFields = 0;
            
            foreach ($data as $fieldName => $fieldValue) {
                if ($this->updateField($section, $fieldName, $fieldValue, $userId)) {
                    $updatedFields++;
                }
            }
            
            $this->db->commit();
            
            // Log da atividade
            $this->logger->logActivity(
                $userId, 
                'update_content', 
                $section, 
                "Seção '$section' atualizada - $updatedFields campos modificados"
            );
            
            return [
                'success' => true,
                'updated_fields' => $updatedFields,
                'message' => 'Conteúdo atualizado com sucesso'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Erro ao atualizar conteúdo: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Atualiza um campo específico
     */
    public function updateField($section, $fieldName, $fieldValue, $userId) {
        try {
            $section = Utils::sanitize($section);
            $fieldName = Utils::sanitize($fieldName);
            
            // Determinar tipo do campo
            $fieldType = $this->determineFieldType($fieldValue);
            
            // Processar valor baseado no tipo
            $processedValue = $this->prepareFieldValue($fieldValue, $fieldType);
            
            // Verificar se campo já existe
            $sql = "SELECT id, field_value FROM site_content WHERE section = ? AND field_name = ?";
            $existing = $this->db->fetchOne($sql, [$section, $fieldName]);
            
            if ($existing) {
                // Verificar se realmente mudou
                if ($existing['field_value'] === $processedValue) {
                    return false; // Não houve mudança
                }
                
                // Atualizar campo existente
                $sql = "UPDATE site_content 
                        SET field_value = ?, field_type = ?, updated_by = ?, updated_at = NOW() 
                        WHERE section = ? AND field_name = ?";
                $this->db->execute($sql, [$processedValue, $fieldType, $userId, $section, $fieldName]);
            } else {
                // Criar novo campo
                $sql = "INSERT INTO site_content (section, field_name, field_value, field_type, updated_by, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, ?, NOW(), NOW())";
                $this->db->execute($sql, [$section, $fieldName, $processedValue, $fieldType, $userId]);
            }
            
            return true;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao atualizar campo '$fieldName': " . $e->getMessage());
        }
    }
    
    /**
     * Remove um campo
     */
    public function removeField($section, $fieldName, $userId) {
        try {
            $section = Utils::sanitize($section);
            $fieldName = Utils::sanitize($fieldName);
            
            $sql = "DELETE FROM site_content WHERE section = ? AND field_name = ?";
            $affected = $this->db->execute($sql, [$section, $fieldName]);
            
            if ($affected > 0) {
                $this->logger->logActivity(
                    $userId, 
                    'remove_field', 
                    $section, 
                    "Campo '$fieldName' removido da seção '$section'"
                );
                
                return [
                    'success' => true,
                    'message' => 'Campo removido com sucesso'
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Campo não encontrado'
                ];
            }
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'message' => 'Erro ao remover campo: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Obtém configurações do site
     */
    public function getSettings() {
        try {
            $sql = "SELECT setting_key, setting_value, setting_type, description 
                    FROM site_settings 
                    ORDER BY setting_key";
            
            $results = $this->db->fetchAll($sql);
            
            $settings = [];
            foreach ($results as $row) {
                $value = $this->processFieldValue($row['setting_value'], $row['setting_type']);
                $settings[$row['setting_key']] = [
                    'value' => $value,
                    'type' => $row['setting_type'],
                    'description' => $row['description']
                ];
            }
            
            return $settings;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao carregar configurações: " . $e->getMessage());
        }
    }
    
    /**
     * Atualiza configurações do site
     */
    public function updateSettings($settings, $userId) {
        try {
            if (empty($settings) || !is_array($settings)) {
                throw new Exception("Configurações inválidas");
            }
            
            $this->db->beginTransaction();
            
            $updatedCount = 0;
            
            foreach ($settings as $key => $value) {
                if ($this->updateSetting($key, $value, $userId)) {
                    $updatedCount++;
                }
            }
            
            $this->db->commit();
            
            $this->logger->logActivity(
                $userId, 
                'update_settings', 
                'settings', 
                "$updatedCount configurações atualizadas"
            );
            
            return [
                'success' => true,
                'updated_count' => $updatedCount,
                'message' => 'Configurações atualizadas com sucesso'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Erro ao atualizar configurações: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Atualiza uma configuração específica
     */
    public function updateSetting($key, $value, $userId) {
        try {
            $key = Utils::sanitize($key);
            $settingType = $this->determineSettingType($value);
            $processedValue = $this->prepareFieldValue($value, $settingType);
            
            // Verificar se configuração existe
            $sql = "SELECT id, setting_value FROM site_settings WHERE setting_key = ?";
            $existing = $this->db->fetchOne($sql, [$key]);
            
            if ($existing) {
                // Verificar se mudou
                if ($existing['setting_value'] === $processedValue) {
                    return false;
                }
                
                // Atualizar existente
                $sql = "UPDATE site_settings 
                        SET setting_value = ?, setting_type = ?, updated_by = ?, updated_at = NOW() 
                        WHERE setting_key = ?";
                $this->db->execute($sql, [$processedValue, $settingType, $userId, $key]);
            } else {
                // Criar nova
                $sql = "INSERT INTO site_settings (setting_key, setting_value, setting_type, updated_by, created_at, updated_at) 
                        VALUES (?, ?, ?, ?, NOW(), NOW())";
                $this->db->execute($sql, [$key, $processedValue, $settingType, $userId]);
            }
            
            return true;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao atualizar configuração '$key': " . $e->getMessage());
        }
    }
    
    /**
     * Cria backup do conteúdo
     */
    public function createBackup($section, $userId) {
        try {
            $content = $this->getSectionContent($section);
            
            if (!empty($content)) {
                $backupData = json_encode($content, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
                
                $sql = "INSERT INTO content_backups (section, backup_data, created_by, created_at) 
                        VALUES (?, ?, ?, NOW())";
                $this->db->execute($sql, [$section, $backupData, $userId]);
                
                // Manter apenas os últimos 10 backups por seção
                $this->cleanupOldBackups($section);
                
                return true;
            }
            
            return false;
            
        } catch (Exception $e) {
            // Log do erro mas não falha o processo principal
            error_log("Erro ao criar backup da seção '$section': " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Restaura backup
     */
    public function restoreBackup($backupId, $userId) {
        try {
            $backupId = (int)$backupId;
            
            // Buscar backup
            $sql = "SELECT section, backup_data FROM content_backups WHERE id = ?";
            $backup = $this->db->fetchOne($sql, [$backupId]);
            
            if (!$backup) {
                throw new Exception("Backup não encontrado");
            }
            
            $section = $backup['section'];
            $backupData = json_decode($backup['backup_data'], true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("Dados de backup corrompidos");
            }
            
            $this->db->beginTransaction();
            
            // Criar backup do estado atual antes de restaurar
            $this->createBackup($section . '_before_restore', $userId);
            
            // Remover conteúdo atual da seção
            $sql = "DELETE FROM site_content WHERE section = ?";
            $this->db->execute($sql, [$section]);
            
            // Restaurar dados do backup
            foreach ($backupData as $fieldName => $fieldValue) {
                $this->updateField($section, $fieldName, $fieldValue, $userId);
            }
            
            $this->db->commit();
            
            $this->logger->logActivity(
                $userId, 
                'restore_backup', 
                $section, 
                "Backup ID $backupId restaurado para seção '$section'"
            );
            
            return [
                'success' => true,
                'message' => 'Backup restaurado com sucesso'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            return [
                'success' => false,
                'message' => 'Erro ao restaurar backup: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Lista backups disponíveis
     */
    public function getBackups($section = null, $limit = 50) {
        try {
            $sql = "SELECT cb.id, cb.section, cb.created_at, cb.backup_data,
                           u.username, u.first_name, u.last_name 
                    FROM content_backups cb 
                    LEFT JOIN cms_users u ON cb.created_by = u.id 
                    WHERE 1=1";
            $params = [];
            
            if ($section) {
                $sql .= " AND cb.section = ?";
                $params[] = Utils::sanitize($section);
            }
            
            $sql .= " ORDER BY cb.created_at DESC LIMIT ?";
            $params[] = (int)$limit;
            
            $backups = $this->db->fetchAll($sql, $params);
            
            // Adicionar informações resumidas dos backups
            foreach ($backups as &$backup) {
                $data = json_decode($backup['backup_data'], true);
                $backup['fields_count'] = is_array($data) ? count($data) : 0;
                $backup['size'] = strlen($backup['backup_data']);
                $backup['creator_name'] = trim($backup['first_name'] . ' ' . $backup['last_name']) ?: $backup['username'];
                
                // Não enviar dados completos na listagem
                unset($backup['backup_data']);
            }
            
            return $backups;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao listar backups: " . $e->getMessage());
        }
    }
    
    /**
     * Busca no conteúdo
     */
    public function searchContent($term, $sections = null) {
        try {
            $term = Utils::sanitize($term);
            $searchTerm = '%' . $this->db->escapeLike($term) . '%';
            
            $sql = "SELECT section, field_name, field_value, field_type, updated_at 
                    FROM site_content 
                    WHERE field_value LIKE ?";
            $params = [$searchTerm];
            
            if ($sections && is_array($sections)) {
                $placeholders = str_repeat('?,', count($sections) - 1) . '?';
                $sql .= " AND section IN ($placeholders)";
                $params = array_merge($params, $sections);
            }
            
            $sql .= " ORDER BY section, field_name";
            
            $results = $this->db->fetchAll($sql, $params);
            
            // Processar resultados
            foreach ($results as &$result) {
                $result['field_value'] = $this->processFieldValue($result['field_value'], $result['field_type']);
                
                // Destacar termo encontrado (apenas para strings)
                if ($result['field_type'] === 'text' || $result['field_type'] === 'textarea') {
                    $result['highlight'] = $this->highlightSearchTerm($result['field_value'], $term);
                }
            }
            
            return $results;
            
        } catch (Exception $e) {
            throw new Exception("Erro na busca: " . $e->getMessage());
        }
    }
    
    /**
     * Obtém estatísticas do conteúdo
     */
    public function getContentStats() {
        try {
            $stats = [];
            
            // Número de seções
            $sql = "SELECT COUNT(DISTINCT section) as total_sections FROM site_content";
            $stats['total_sections'] = $this->db->fetchOne($sql)['total_sections'];
            
            // Número de campos
            $sql = "SELECT COUNT(*) as total_fields FROM site_content";
            $stats['total_fields'] = $this->db->fetchOne($sql)['total_fields'];
            
            // Última atualização
            $sql = "SELECT MAX(updated_at) as last_update FROM site_content";
            $stats['last_update'] = $this->db->fetchOne($sql)['last_update'];
            
            // Seções com mais campos
            $sql = "SELECT section, COUNT(*) as field_count 
                    FROM site_content 
                    GROUP BY section 
                    ORDER BY field_count DESC 
                    LIMIT 5";
            $stats['sections_by_fields'] = $this->db->fetchAll($sql);
            
            // Atividade recente
            $sql = "SELECT COUNT(*) as recent_updates 
                    FROM site_content 
                    WHERE updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            $stats['recent_updates'] = $this->db->fetchOne($sql)['recent_updates'];
            
            // Total de backups
            $sql = "SELECT COUNT(*) as total_backups FROM content_backups";
            $stats['total_backups'] = $this->db->fetchOne($sql)['total_backups'];
            
            return $stats;
            
        } catch (Exception $e) {
            throw new Exception("Erro ao obter estatísticas: " . $e->getMessage());
        }
    }
    
    // ===== MÉTODOS PRIVADOS =====
    
    /**
     * Determina o tipo de campo baseado no valor
     */
    private function determineFieldType($value) {
        if (is_array($value)) {
            return 'json';
        } elseif (is_bool($value)) {
            return 'boolean';
        } elseif (is_numeric($value)) {
            return 'number';
        } elseif (Utils::isValidURL($value)) {
            return 'url';
        } elseif (strlen($value) > 255) {
            return 'textarea';
        } elseif (strip_tags($value) !== $value) {
            return 'html';
        } else {
            return 'text';
        }
    }
    
    /**
     * Determina o tipo de configuração
     */
    private function determineSettingType($value) {
        if (is_array($value)) {
            return 'json';
        } elseif (is_bool($value)) {
            return 'boolean';
        } elseif (is_numeric($value)) {
            return 'number';
        } else {
            return 'text';
        }
    }
    
    /**
     * Prepara valor para armazenamento
     */
    private function prepareFieldValue($value, $type) {
        switch ($type) {
            case 'json':
                return json_encode($value, JSON_UNESCAPED_UNICODE);
            case 'boolean':
                return $value ? '1' : '0';
            case 'number':
                return (string)$value;
            case 'text':
            case 'textarea':
            case 'html':
                return Utils::sanitize($value);
            default:
                return (string)$value;
        }
    }
    
    /**
     * Processa valor do campo para retorno
     */
    private function processFieldValue($value, $type) {
        switch ($type) {
            case 'json':
                $decoded = json_decode($value, true);
                return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
            case 'boolean':
                return (bool)$value;
            case 'number':
                return is_numeric($value) ? (float)$value : $value;
            default:
                return $value;
        }
    }
    
    /**
     * Destaca termo de busca no texto
     */
    private function highlightSearchTerm($text, $term) {
        return preg_replace(
            '/(' . preg_quote($term, '/') . ')/i',
            '<mark>$1</mark>',
            $text
        );
    }
    
    /**
     * Remove backups antigos
     */
    private function cleanupOldBackups($section, $keepCount = 10) {
        try {
            $sql = "SELECT id FROM content_backups 
                    WHERE section = ? 
                    ORDER BY created_at DESC 
                    LIMIT 999999 OFFSET ?";
            
            $oldBackups = $this->db->fetchAll($sql, [$section, $keepCount]);
            
            if (!empty($oldBackups)) {
                $ids = array_column($oldBackups, 'id');
                $placeholders = str_repeat('?,', count($ids) - 1) . '?';
                
                $sql = "DELETE FROM content_backups WHERE id IN ($placeholders)";
                $this->db->execute($sql, $ids);
            }
            
        } catch (Exception $e) {
            error_log("Erro ao limpar backups antigos: " . $e->getMessage());
        }
    }
}
?>