import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Collapse,
  Paper,
  InputAdornment,
  CircularProgress,
  Button,
  Stack,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Search,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Info,
  Warning,
  Error as ErrorIcon,
  Security,
  Refresh,
  Download,
  FilterAltOff
} from '@mui/icons-material';
import { superAdminService } from '../../services/api';

const LogRow = ({ log }) => {
  const [open, setOpen] = useState(false);

  const getTypeColor = (tipo) => {
    switch (tipo) {
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'critical': return 'error';
      case 'security': return 'secondary';
      default: return 'default';
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'info': return <Info fontSize="small" />;
      case 'warning': return <Warning fontSize="small" />;
      case 'error':
      case 'critical': return <ErrorIcon fontSize="small" />;
      case 'security': return <Security fontSize="small" />;
      default: return null;
    }
  };

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>
          {new Date(log.created_at).toLocaleString('pt-BR')}
        </TableCell>
        <TableCell>
          <Chip
            icon={getTypeIcon(log.tipo)}
            label={log.tipo.toUpperCase()}
            color={getTypeColor(log.tipo)}
            size="small"
          />
        </TableCell>
        <TableCell>
          <Chip label={log.categoria} size="small" variant="outlined" />
        </TableCell>
        <TableCell>{log.usuario_nome || 'Sistema'}</TableCell>
        <TableCell>{log.acao}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom>
                Detalhes do Log
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Descrição:</strong> {log.descricao || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>IP:</strong> {log.ip_address || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Método:</strong> {log.request_method || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>URL:</strong> {log.request_url || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>Status:</strong> {log.response_status || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    <strong>User Agent:</strong> {log.user_agent || 'N/A'}
                  </Typography>
                </Grid>
                {log.request_body && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Request Body:</strong>
                    </Typography>
                    <Paper sx={{ p: 1, mt: 1, bgcolor: 'grey.100', overflow: 'auto', maxHeight: 200 }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                        {JSON.stringify(JSON.parse(log.request_body), null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const LogsPanel = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [filters, setFilters] = useState({
    tipo: '',
    categoria: '',
    search: '',
    dataInicio: '',
    dataFim: '',
    usuarioId: ''
  });

  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage, filters]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {
        limit: rowsPerPage,
        offset: page * rowsPerPage,
        ...filters
      };

      const response = await superAdminService.getLogs(params);
      setLogs(response.data.logs || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar logs: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleClearFilters = () => {
    setFilters({
      tipo: '',
      categoria: '',
      search: '',
      dataInicio: '',
      dataFim: '',
      usuarioId: ''
    });
    setPage(0);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);

      // Buscar todos os logs com os filtros atuais (sem paginação)
      const params = { ...filters, limit: 10000 };
      const response = await superAdminService.getLogs(params);
      const allLogs = response.data.logs || [];

      if (allLogs.length === 0) {
        setSnackbar({
          open: true,
          message: 'Não há logs para exportar com os filtros atuais',
          severity: 'warning'
        });
        return;
      }

      // Criar CSV
      const headers = ['Data/Hora', 'Tipo', 'Categoria', 'Usuário', 'Ação', 'Descrição', 'IP', 'Método', 'URL', 'Status'];
      const csvRows = [
        headers.join(','),
        ...allLogs.map(log => [
          `"${new Date(log.created_at).toLocaleString('pt-BR')}"`,
          `"${log.tipo}"`,
          `"${log.categoria}"`,
          `"${log.usuario_nome || 'Sistema'}"`,
          `"${log.acao || ''}"`,
          `"${(log.descricao || '').replace(/"/g, '""')}"`,
          `"${log.ip_address || ''}"`,
          `"${log.request_method || ''}"`,
          `"${(log.request_url || '').replace(/"/g, '""')}"`,
          `"${log.response_status || ''}"`
        ].join(','))
      ];

      // Criar e baixar arquivo
      const csvContent = csvRows.join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `logs_sistema_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnackbar({
        open: true,
        message: `${allLogs.length} logs exportados com sucesso!`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao exportar logs: ' + (error.response?.data?.error || error.message),
        severity: 'error'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Logs do Sistema</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            color="primary"
            startIcon={exporting ? <CircularProgress size={20} color="inherit" /> : <Download />}
            onClick={handleExportCSV}
            disabled={exporting || logs.length === 0}
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
          <IconButton onClick={loadLogs} color="primary">
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                label="Buscar"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                placeholder="Buscar em ação, descrição ou URL"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                select
                size="small"
                label="Tipo"
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="security">Security</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                select
                size="small"
                label="Categoria"
                value={filters.categoria}
                onChange={(e) => handleFilterChange('categoria', e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="auth">Autenticação</MenuItem>
                <MenuItem value="user">Usuário</MenuItem>
                <MenuItem value="payment">Pagamento</MenuItem>
                <MenuItem value="system">Sistema</MenuItem>
                <MenuItem value="security">Segurança</MenuItem>
                <MenuItem value="database">Database</MenuItem>
                <MenuItem value="api">API</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Data Início"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Data Fim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={12} md={6}>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<FilterAltOff />}
                  onClick={handleClearFilters}
                  fullWidth
                >
                  Limpar Filtros
                </Button>
                <Button
                  variant="contained"
                  onClick={loadLogs}
                  fullWidth
                >
                  Aplicar Filtros
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50} />
                <TableCell>Data/Hora</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell>Ação</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary">
                      Nenhum log encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => <LogRow key={log.id} log={log} />)
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
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </Card>

      {/* Snackbar para feedback */}
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

export default LogsPanel;
