import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  MenuItem,
  Alert,
  Snackbar,
  Stack,
  LinearProgress,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  CloudDownload,
  Delete,
  AddCircle,
  RestoreOutlined,
  CheckCircle,
  CleaningServices,
  Storage,
  FilterAltOff
} from '@mui/icons-material';
import { superAdminService } from '../../services/api';

const BackupsPanel = () => {
  const [loading, setLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [diskSpace, setDiskSpace] = useState(null);
  const [creating, setCreating] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    tipo: '',
    status: '',
    dataInicio: '',
    dataFim: ''
  });

  // Dialogs
  const [createDialog, setCreateDialog] = useState({
    open: false,
    tipo: 'manual',
    backupType: 'completo',
    includeStructure: true,
    includeData: true,
    tables: '',
    description: '',
    isScheduled: false,
    scheduleConfig: {
      startDate: new Date().toISOString().split('T')[0],
      time: '03:00',
      recurrence: 'daily',
      daysOfWeek: [],
      timesPerWeek: 1,
      enabled: true
    }
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [restoreDialog, setRestoreDialog] = useState({ open: false, id: null, nome: '' });
  const [cleanupDialog, setCleanupDialog] = useState({ open: false, keepCount: 10 });
  const [restoring, setRestoring] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadData();
  }, [page, rowsPerPage, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [backupsRes, statsRes, diskSpaceRes] = await Promise.all([
        superAdminService.getBackups({
          ...filters,
          limit: rowsPerPage,
          offset: page * rowsPerPage
        }),
        superAdminService.getBackupsStats(),
        superAdminService.getBackupsDiskSpace()
      ]);

      setBackups(backupsRes.data.backups || []);
      setTotal(backupsRes.data.total || 0);
      setStats(statsRes.data);
      setDiskSpace(diskSpaceRes.data);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      showSnackbar('Erro ao carregar dados de backup', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      await superAdminService.createBackup({
        tipo: createDialog.isScheduled ? 'scheduled' : 'manual',
        backupType: createDialog.backupType,
        includeStructure: createDialog.includeStructure,
        includeData: createDialog.includeData,
        tables: createDialog.tables,
        description: createDialog.description,
        isScheduled: createDialog.isScheduled,
        scheduleConfig: createDialog.isScheduled ? createDialog.scheduleConfig : undefined
      });
      setCreateDialog({
        open: false,
        tipo: 'manual',
        backupType: 'completo',
        includeStructure: true,
        includeData: true,
        tables: '',
        description: '',
        isScheduled: false,
        scheduleConfig: {
          startDate: new Date().toISOString().split('T')[0],
          time: '03:00',
          recurrence: 'daily',
          daysOfWeek: [],
          timesPerWeek: 1,
          enabled: true
        }
      });
      showSnackbar(createDialog.isScheduled ? 'Backup agendado com sucesso!' : 'Backup criado com sucesso!', 'success');
      loadData();
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      showSnackbar('Erro ao criar backup', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (id, filename) => {
    try {
      const response = await superAdminService.downloadBackup(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('Download iniciado!', 'success');
    } catch (error) {
      console.error('Erro ao baixar backup:', error);
      showSnackbar('Erro ao baixar backup', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await superAdminService.deleteBackup(deleteDialog.id);
      setDeleteDialog({ open: false, id: null, nome: '' });
      showSnackbar('Backup excluído com sucesso!', 'success');
      loadData();
    } catch (error) {
      console.error('Erro ao deletar backup:', error);
      showSnackbar('Erro ao deletar backup', 'error');
    }
  };

  const handleRestore = async () => {
    try {
      setRestoring(true);
      await superAdminService.restoreBackup(restoreDialog.id);
      setRestoreDialog({ open: false, id: null, nome: '' });
      showSnackbar('Backup restaurado com sucesso!', 'success');
      loadData();
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      showSnackbar('Erro ao restaurar backup: ' + (error.response?.data?.error || error.message), 'error');
    } finally {
      setRestoring(false);
    }
  };

  const handleValidate = async (id) => {
    try {
      const response = await superAdminService.validateBackup(id);
      if (response.data.valid) {
        showSnackbar('Backup válido!', 'success');
      } else {
        showSnackbar(`Backup inválido: ${response.data.error}`, 'error');
      }
    } catch (error) {
      console.error('Erro ao validar backup:', error);
      showSnackbar('Erro ao validar backup', 'error');
    }
  };

  const handleCleanup = async () => {
    try {
      setCleaning(true);
      const response = await superAdminService.cleanupBackups(cleanupDialog.keepCount);
      setCleanupDialog({ open: false, keepCount: 10 });
      showSnackbar(response.data.message, 'success');
      loadData();
    } catch (error) {
      console.error('Erro ao limpar backups:', error);
      showSnackbar('Erro ao limpar backups', 'error');
    } finally {
      setCleaning(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({ tipo: '', status: '', dataInicio: '', dataFim: '' });
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) {
      return (mb / 1024).toFixed(2) + ' GB';
    }
    return mb.toFixed(2) + ' MB';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'concluido':
        return 'success';
      case 'falha':
        return 'error';
      case 'em_progresso':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getDiskSpacePercent = () => {
    if (!diskSpace || !diskSpace.totalSpaceBytes) return 0;
    return parseFloat(diskSpace.percentUsed) || 0;
  };

  const getDiskSpaceColor = () => {
    const percent = getDiskSpacePercent();
    if (percent >= 90) return 'error';
    if (percent >= 75) return 'warning';
    return 'primary';
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Backups do Sistema</Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Limpar backups antigos">
            <IconButton
              onClick={() => setCleanupDialog({ open: true, keepCount: 10 })}
              color="warning"
            >
              <CleaningServices />
            </IconButton>
          </Tooltip>
          <IconButton onClick={loadData} color="primary">
            <Refresh />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddCircle />}
            onClick={() => setCreateDialog(prev => ({ ...prev, open: true }))}
          >
            Criar Backup
          </Button>
        </Stack>
      </Box>

      {/* Estatísticas e Espaço em Disco */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo de Backups
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4">{stats?.total_backups || 0}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4" color="success.main">
                    {stats?.bem_sucedidos || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bem-sucedidos
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="h4">{formatBytes(stats?.espaco_total)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Espaço total
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  {stats?.lastBackup && (
                    <>
                      <Typography variant="body1">
                        {new Date(stats.lastBackup.concluido_em).toLocaleDateString('pt-BR')}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Último backup
                      </Typography>
                    </>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <Storage sx={{ mr: 1 }} />
                Espaço em Disco
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatBytes(diskSpace?.usedSpaceBytes)} / {formatBytes(diskSpace?.totalSpaceBytes)}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={getDiskSpacePercent()}
                color={getDiskSpaceColor()}
                sx={{ height: 10, borderRadius: 5, mt: 2 }}
              />
              <Typography variant="body2" color="text.secondary" mt={1}>
                {getDiskSpacePercent().toFixed(1)}% usado
              </Typography>
              {getDiskSpacePercent() >= 85 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Espaço em disco baixo! Considere limpar backups antigos.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                select
                label="Tipo"
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
                <MenuItem value="automatico">Automático</MenuItem>
                <MenuItem value="scheduled">Agendado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                select
                label="Status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="concluido">Concluído</MenuItem>
                <MenuItem value="falha">Falha</MenuItem>
                <MenuItem value="em_progresso">Em Progresso</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data Início"
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Data Fim"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterAltOff />}
                onClick={handleClearFilters}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Backups */}
      <Card>
        <CardContent>
          {loading && <LinearProgress />}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Tamanho</TableCell>
                  <TableCell>Duração</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      <Typography variant="body2" color="text.secondary">
                        Nenhum backup encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => (
                    <TableRow key={backup.id} hover>
                      <TableCell>{backup.id}</TableCell>
                      <TableCell>
                        {formatDateTime(backup.inicio_em)}
                      </TableCell>
                      <TableCell>
                        <Chip label={backup.tipo} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={backup.status}
                          color={getStatusColor(backup.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatBytes(backup.tamanho_bytes)}</TableCell>
                      <TableCell>{backup.duracao_segundos}s</TableCell>
                      <TableCell>{backup.usuario_nome || '-'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} justifyContent="center">
                          {backup.status === 'concluido' && (
                            <>
                              <Tooltip title="Validar backup">
                                <IconButton
                                  size="small"
                                  onClick={() => handleValidate(backup.id)}
                                  color="info"
                                >
                                  <CheckCircle />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Download">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownload(backup.id, backup.arquivo_nome)}
                                  color="primary"
                                >
                                  <CloudDownload />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Restaurar backup">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setRestoreDialog({
                                      open: true,
                                      id: backup.id,
                                      nome: backup.arquivo_nome
                                    })
                                  }
                                  color="warning"
                                >
                                  <RestoreOutlined />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Excluir">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    setDeleteDialog({
                                      open: true,
                                      id: backup.id,
                                      nome: backup.arquivo_nome
                                    })
                                  }
                                  color="error"
                                >
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
            }
          />
        </CardContent>
      </Card>

      {/* Dialog de Exclusão */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nome: '' })}>
        <DialogTitle>Excluir Backup</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o backup <strong>{deleteDialog.nome}</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta ação não pode ser desfeita!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, nome: '' })}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Restauração */}
      <Dialog open={restoreDialog.open} onClose={() => setRestoreDialog({ open: false, id: null, nome: '' })}>
        <DialogTitle>Restaurar Backup</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Tem certeza que deseja restaurar o backup <strong>{restoreDialog.nome}</strong>?
          </Typography>
          <Alert severity="error" sx={{ mt: 2 }}>
            <strong>ATENÇÃO:</strong> Esta ação irá substituir TODOS os dados atuais do banco de dados pelos dados do backup. Certifique-se de fazer um backup atual antes de continuar!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRestoreDialog({ open: false, id: null, nome: '' })}
            disabled={restoring}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRestore}
            color="warning"
            variant="contained"
            disabled={restoring}
            startIcon={restoring ? <CircularProgress size={20} /> : <RestoreOutlined />}
          >
            {restoring ? 'Restaurando...' : 'Restaurar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Criação de Backup */}
      <Dialog
        open={createDialog.open}
        onClose={() => setCreateDialog({
          open: false,
          tipo: 'manual',
          backupType: 'completo',
          includeStructure: true,
          includeData: true,
          tables: '',
          description: '',
          isScheduled: false,
          scheduleConfig: {
            startDate: new Date().toISOString().split('T')[0],
            time: '03:00',
            recurrence: 'daily',
            daysOfWeek: [],
            timesPerWeek: 1,
            enabled: true
          }
        })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Criar Novo Backup</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  label="Tipo de Backup"
                  value={createDialog.backupType}
                  onChange={(e) => setCreateDialog(prev => ({ ...prev, backupType: e.target.value }))}
                >
                  <MenuItem value="completo">Backup Completo</MenuItem>
                  <MenuItem value="estrutura">Apenas Estrutura (Schema)</MenuItem>
                  <MenuItem value="dados">Apenas Dados</MenuItem>
                  <MenuItem value="personalizado">Personalizado</MenuItem>
                </TextField>
              </Grid>

              {createDialog.backupType === 'personalizado' && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Opções de Inclusão
                    </Typography>
                    <Stack spacing={1}>
                      <Box display="flex" alignItems="center">
                        <input
                          type="checkbox"
                          checked={createDialog.includeStructure}
                          onChange={(e) => setCreateDialog(prev => ({
                            ...prev,
                            includeStructure: e.target.checked
                          }))}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          Incluir estrutura das tabelas
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <input
                          type="checkbox"
                          checked={createDialog.includeData}
                          onChange={(e) => setCreateDialog(prev => ({
                            ...prev,
                            includeData: e.target.checked
                          }))}
                        />
                        <Typography variant="body2" sx={{ ml: 1 }}>
                          Incluir dados das tabelas
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Tabelas Específicas (opcional)"
                      placeholder="Ex: usuarios, alunos, turmas (separadas por vírgula)"
                      value={createDialog.tables}
                      onChange={(e) => setCreateDialog(prev => ({ ...prev, tables: e.target.value }))}
                      helperText="Deixe em branco para incluir todas as tabelas"
                    />
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Descrição (opcional)"
                  placeholder="Ex: Backup antes da atualização do sistema"
                  value={createDialog.description}
                  onChange={(e) => setCreateDialog(prev => ({ ...prev, description: e.target.value }))}
                />
              </Grid>

              <Grid item xs={12}>
                <Box display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    checked={createDialog.isScheduled}
                    onChange={(e) => setCreateDialog(prev => ({
                      ...prev,
                      isScheduled: e.target.checked
                    }))}
                  />
                  <Typography variant="body1" sx={{ ml: 1, fontWeight: 'bold' }}>
                    Agendar backup (executar automaticamente)
                  </Typography>
                </Box>
              </Grid>

              {createDialog.isScheduled && (
                <>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      Configurações de Agendamento
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="date"
                      label="Data de Início"
                      value={createDialog.scheduleConfig.startDate}
                      onChange={(e) => setCreateDialog(prev => ({
                        ...prev,
                        scheduleConfig: { ...prev.scheduleConfig, startDate: e.target.value }
                      }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="time"
                      label="Horário de Execução"
                      value={createDialog.scheduleConfig.time}
                      onChange={(e) => setCreateDialog(prev => ({
                        ...prev,
                        scheduleConfig: { ...prev.scheduleConfig, time: e.target.value }
                      }))}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Recorrência"
                      value={createDialog.scheduleConfig.recurrence}
                      onChange={(e) => setCreateDialog(prev => ({
                        ...prev,
                        scheduleConfig: { ...prev.scheduleConfig, recurrence: e.target.value }
                      }))}
                    >
                      <MenuItem value="once">Uma vez (execução única)</MenuItem>
                      <MenuItem value="daily">Diariamente</MenuItem>
                      <MenuItem value="weekly">Semanalmente</MenuItem>
                      <MenuItem value="multiple_weekly">Múltiplas vezes por semana</MenuItem>
                      <MenuItem value="monthly">Mensalmente</MenuItem>
                    </TextField>
                  </Grid>

                  {createDialog.scheduleConfig.recurrence === 'weekly' && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Selecione o dia da semana:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                          <Chip
                            key={index}
                            label={day}
                            onClick={() => {
                              const newDays = createDialog.scheduleConfig.daysOfWeek.includes(index)
                                ? createDialog.scheduleConfig.daysOfWeek.filter(d => d !== index)
                                : [...createDialog.scheduleConfig.daysOfWeek, index];
                              setCreateDialog(prev => ({
                                ...prev,
                                scheduleConfig: { ...prev.scheduleConfig, daysOfWeek: newDays }
                              }));
                            }}
                            color={createDialog.scheduleConfig.daysOfWeek.includes(index) ? 'primary' : 'default'}
                            variant={createDialog.scheduleConfig.daysOfWeek.includes(index) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Stack>
                    </Grid>
                  )}

                  {createDialog.scheduleConfig.recurrence === 'multiple_weekly' && (
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Quantas vezes por semana?"
                        value={createDialog.scheduleConfig.timesPerWeek}
                        onChange={(e) => setCreateDialog(prev => ({
                          ...prev,
                          scheduleConfig: { ...prev.scheduleConfig, timesPerWeek: parseInt(e.target.value) || 1 }
                        }))}
                        InputProps={{ inputProps: { min: 1, max: 7 } }}
                        helperText="Backups serão distribuídos igualmente ao longo da semana"
                      />
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Alert severity="success">
                      {createDialog.scheduleConfig.recurrence === 'once' &&
                        `Backup será executado uma única vez em ${new Date(createDialog.scheduleConfig.startDate).toLocaleDateString('pt-BR')} às ${createDialog.scheduleConfig.time}`}
                      {createDialog.scheduleConfig.recurrence === 'daily' &&
                        `Backup será executado diariamente às ${createDialog.scheduleConfig.time}`}
                      {createDialog.scheduleConfig.recurrence === 'weekly' && createDialog.scheduleConfig.daysOfWeek.length > 0 &&
                        `Backup será executado semanalmente às ${createDialog.scheduleConfig.time} nos dias selecionados`}
                      {createDialog.scheduleConfig.recurrence === 'weekly' && createDialog.scheduleConfig.daysOfWeek.length === 0 &&
                        'Selecione ao menos um dia da semana'}
                      {createDialog.scheduleConfig.recurrence === 'multiple_weekly' &&
                        `Backup será executado ${createDialog.scheduleConfig.timesPerWeek}x por semana às ${createDialog.scheduleConfig.time}`}
                      {createDialog.scheduleConfig.recurrence === 'monthly' &&
                        `Backup será executado mensalmente no dia ${new Date(createDialog.scheduleConfig.startDate).getDate()} às ${createDialog.scheduleConfig.time}`}
                    </Alert>
                  </Grid>
                </>
              )}

              <Grid item xs={12}>
                <Alert severity="info">
                  {createDialog.backupType === 'completo' && 'Backup completo do banco de dados incluindo estrutura e dados.'}
                  {createDialog.backupType === 'estrutura' && 'Apenas a estrutura das tabelas será incluída (CREATE TABLE).'}
                  {createDialog.backupType === 'dados' && 'Apenas os dados das tabelas serão incluídos (INSERT INTO).'}
                  {createDialog.backupType === 'personalizado' && 'Configure as opções específicas para este backup.'}
                </Alert>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCreateDialog({
              open: false,
              tipo: 'manual',
              backupType: 'completo',
              includeStructure: true,
              includeData: true,
              tables: '',
              description: '',
              isScheduled: false,
              scheduleConfig: {
                startDate: new Date().toISOString().split('T')[0],
                time: '03:00',
                recurrence: 'daily',
                daysOfWeek: [],
                timesPerWeek: 1,
                enabled: true
              }
            })}
            disabled={creating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateBackup}
            variant="contained"
            disabled={creating}
            startIcon={creating ? <CircularProgress size={20} /> : <AddCircle />}
          >
            {creating ? (createDialog.isScheduled ? 'Agendando...' : 'Criando...') : (createDialog.isScheduled ? 'Agendar Backup' : 'Criar Backup')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Limpeza */}
      <Dialog open={cleanupDialog.open} onClose={() => setCleanupDialog({ open: false, keepCount: 10 })}>
        <DialogTitle>Limpar Backups Antigos</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Quantos backups você deseja manter? (Os mais recentes serão preservados)
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Quantidade a manter"
            value={cleanupDialog.keepCount}
            onChange={(e) =>
              setCleanupDialog(prev => ({ ...prev, keepCount: parseInt(e.target.value) || 10 }))
            }
            sx={{ mt: 2 }}
            InputProps={{ inputProps: { min: 1, max: 100 } }}
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Backups mais antigos que os {cleanupDialog.keepCount} mais recentes serão excluídos permanentemente.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCleanupDialog({ open: false, keepCount: 10 })}
            disabled={cleaning}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCleanup}
            color="warning"
            variant="contained"
            disabled={cleaning}
            startIcon={cleaning ? <CircularProgress size={20} /> : <CleaningServices />}
          >
            {cleaning ? 'Limpando...' : 'Limpar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BackupsPanel;
