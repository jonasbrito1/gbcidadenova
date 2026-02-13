import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  LinearProgress,
  Divider,
  useTheme,
  alpha,
  Collapse,
  Stack
} from '@mui/material';
import {
  Description as LogsIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  TrendingUp,
  TrendingDown,
  Error as ErrorIcon,
  CheckCircle,
  Warning,
  Refresh,
  Timeline,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  Router as RouterIcon,
  ExpandMore,
  ExpandLess
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { superAdminService } from '../../services/api';

// Componente de Card Expansível
const ExpandableCard = ({ title, icon, children, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'all 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent>
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          onClick={() => setExpanded(!expanded)}
          sx={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {icon}
            <Typography variant="h6">{title}</Typography>
          </Box>
          <IconButton size="small">
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>
        <Collapse in={expanded} timeout="auto">
          <Box mt={2}>{children}</Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

// Componente de Card Clicável
const ClickableStatCard = ({ title, value, subtitle, icon, color, trend, trendValue, onClick, loading }) => {
  const theme = useTheme();

  return (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        borderLeft: `4px solid ${theme.palette[color]?.main || color}`,
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8]
        } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1 }}>
                  {value}
                </Typography>
                {subtitle && (
                  <Typography variant="caption" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
                {trend && (
                  <Box display="flex" alignItems="center" gap={0.5} mt={1}>
                    {trend === 'up' ? (
                      <TrendingUp color="success" fontSize="small" />
                    ) : (
                      <TrendingDown color="error" fontSize="small" />
                    )}
                    <Typography variant="caption" color={trend === 'up' ? 'success.main' : 'error.main'}>
                      {trendValue}% vs ontem
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(theme.palette[color]?.main || color, 0.1)
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

const OverviewPanel = () => {
  const theme = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    logs: null,
    security: null,
    backups: null,
    monitoring: null
  });
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [metricsHistory, setMetricsHistory] = useState([]);

  const loadStats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [logsStats, securityStats, backupsStats, monitoringStats, healthCheck, metricsData, sysInfo, historyData] = await Promise.all([
        superAdminService.getLogsStats(),
        superAdminService.getSecurityStats(),
        superAdminService.getBackupsStats(),
        superAdminService.getMonitoringStats(),
        superAdminService.getHealthCheck(),
        superAdminService.getCurrentMetrics(),
        superAdminService.getSystemInfo(),
        superAdminService.getMetricsHistory({ period: '24h', limit: 24 })
      ]);

      setStats({
        logs: logsStats.data,
        security: securityStats.data,
        backups: backupsStats.data,
        monitoring: monitoringStats.data
      });
      setHealth(healthCheck.data);
      setMetrics(metricsData.data);
      setSystemInfo(sysInfo.data);
      setMetricsHistory(historyData.data || []);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(() => {
      loadStats(true);
    }, 30000); // Atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleCardClick = (panel, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value);
    });
    navigate(`/app/superadmin?tab=${panel}${params.toString() ? '&' + params.toString() : ''}`);
  };

  const getHealthColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'warning': return 'warning';
      case 'critical':
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'critical':
      case 'error': return <ErrorIcon color="error" />;
      default: return null;
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 GB';
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0d 0h 0m';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const getProgressColor = (value) => {
    if (value < 60) return 'success';
    if (value < 80) return 'warning';
    return 'error';
  };

  // Preparar dados para gráficos históricos
  const prepareHistoryCharts = () => {
    if (!metricsHistory || metricsHistory.length === 0) return { cpu: [], memory: [], connections: [] };

    return {
      cpu: metricsHistory.slice().reverse().map((m, i) => ({
        time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        valor: parseFloat(m.cpu_usage) || 0
      })),
      memory: metricsHistory.slice().reverse().map((m, i) => ({
        time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        valor: parseFloat(m.memory_usage) || 0
      })),
      connections: metricsHistory.slice().reverse().map((m, i) => ({
        time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        usuarios: parseInt(m.users_online) || 0,
        conexoes: parseInt(m.active_connections) || 0
      }))
    };
  };

  const historyCharts = prepareHistoryCharts();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header com Refresh */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Visão Geral do Sistema
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitoramento em tempo real e estatísticas completas
          </Typography>
        </Box>
        <IconButton
          onClick={() => loadStats()}
          color="primary"
          disabled={refreshing}
          sx={{
            animation: refreshing ? 'spin 1s linear infinite' : 'none',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }}
        >
          <Refresh />
        </IconButton>
      </Box>

      {/* Health Check Alert */}
      {health && health.status !== 'healthy' && (
        <Alert
          severity={getHealthColor(health.status)}
          icon={getHealthIcon(health.status)}
          sx={{ mb: 3 }}
        >
          <Typography variant="body2">
            <strong>Status do Sistema: {health.status === 'warning' ? 'Atenção' : 'Crítico'}</strong>
          </Typography>
          {health.checks?.memory?.message && (
            <Typography variant="caption" display="block">• {health.checks.memory.message}</Typography>
          )}
          {health.checks?.cpu?.message && (
            <Typography variant="caption" display="block">• {health.checks.cpu.message}</Typography>
          )}
        </Alert>
      )}

      {/* Cards de Estatísticas Principais */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <ClickableStatCard
            title="Total de Logs"
            value={stats.logs?.total || 0}
            subtitle={`${stats.logs?.last_24h || 0} nas últimas 24h`}
            icon={<LogsIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />}
            color="primary"
            onClick={() => handleCardClick(1)}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <ClickableStatCard
            title="Alertas de Segurança"
            value={stats.security?.total_eventos || 0}
            subtitle={`${stats.security?.last_24h || 0} nas últimas 24h`}
            icon={<SecurityIcon sx={{ fontSize: 32, color: theme.palette.error.main }} />}
            color="error"
            onClick={() => handleCardClick(2)}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <ClickableStatCard
            title="Backups Recentes"
            value={stats.backups?.total || 0}
            subtitle={stats.backups?.ultimo_backup ? `Último: ${new Date(stats.backups.ultimo_backup).toLocaleDateString('pt-BR')}` : 'Nenhum backup'}
            icon={<BackupIcon sx={{ fontSize: 32, color: theme.palette.success.main }} />}
            color="success"
            onClick={() => handleCardClick(3)}
            loading={loading}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <ClickableStatCard
            title="Usuários Online"
            value={metrics?.users_online || 0}
            subtitle={`${metrics?.active_connections || 0} conexões ativas`}
            icon={<PeopleIcon sx={{ fontSize: 32, color: theme.palette.info.main }} />}
            color="info"
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Monitoramento em Tempo Real */}
      <Grid container spacing={3} mb={4}>
        {/* CPU */}
        <Grid item xs={12} md={6} lg={3}>
          <ExpandableCard
            title="CPU"
            icon={<SpeedIcon color="primary" />}
            defaultExpanded={true}
          >
            <Box textAlign="center" mb={2}>
              <Typography variant="h2" fontWeight="bold" color={getProgressColor(metrics?.cpu_usage || 0)}>
                {(metrics?.cpu_usage || 0).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics?.cpu_usage || 0}
                color={getProgressColor(metrics?.cpu_usage || 0)}
                sx={{ height: 10, borderRadius: 5, mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Load Average: {metrics?.load_average?.toFixed(2) || '0.00'}
              </Typography>
            </Box>
          </ExpandableCard>
        </Grid>

        {/* Memória */}
        <Grid item xs={12} md={6} lg={3}>
          <ExpandableCard
            title="Memória"
            icon={<MemoryIcon color="secondary" />}
            defaultExpanded={true}
          >
            <Box textAlign="center" mb={2}>
              <Typography variant="h2" fontWeight="bold" color={getProgressColor(metrics?.memory_usage || 0)}>
                {(metrics?.memory_usage || 0).toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics?.memory_usage || 0}
                color={getProgressColor(metrics?.memory_usage || 0)}
                sx={{ height: 10, borderRadius: 5, mt: 1 }}
              />
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {formatBytes(metrics?.memory_used)} / {formatBytes(metrics?.memory_total)}
              </Typography>
            </Box>
          </ExpandableCard>
        </Grid>

        {/* Banco de Dados */}
        <Grid item xs={12} md={6} lg={3}>
          <ExpandableCard
            title="Banco de Dados"
            icon={<StorageIcon color="success" />}
            defaultExpanded={true}
          >
            <Box textAlign="center" mb={2}>
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {(metrics?.database_size_mb || 0).toFixed(2)} MB
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                Tamanho total do banco
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {metrics?.active_connections || 0} conexões ativas
              </Typography>
            </Box>
          </ExpandableCard>
        </Grid>

        {/* Performance */}
        <Grid item xs={12} md={6} lg={3}>
          <ExpandableCard
            title="Performance"
            icon={<RouterIcon color="warning" />}
            defaultExpanded={true}
          >
            <Box textAlign="center" mb={2}>
              <Typography variant="h3" fontWeight="bold" color="warning.main">
                {metrics?.avg_response_time || 0}ms
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                Tempo médio de resposta
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                {metrics?.requests_per_minute || 0} requisições/min
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {(metrics?.error_rate || 0).toFixed(2)}% taxa de erro
              </Typography>
            </Box>
          </ExpandableCard>
        </Grid>
      </Grid>

      {/* Gráficos de Histórico */}
      <Grid container spacing={3} mb={4}>
        {/* CPU ao longo do tempo */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPU - Últimas 24 Horas
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={historyCharts.cpu}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke={theme.palette.primary.main}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                    name="CPU (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Memória ao longo do tempo */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memória - Últimas 24 Horas
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={historyCharts.memory}>
                  <defs>
                    <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme.palette.secondary.main} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={theme.palette.secondary.main} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Area
                    type="monotone"
                    dataKey="valor"
                    stroke={theme.palette.secondary.main}
                    fillOpacity={1}
                    fill="url(#colorMemory)"
                    name="Memória (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Usuários e Conexões */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Atividade do Sistema - Últimas 24 Horas
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyCharts.connections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="usuarios"
                    stroke={theme.palette.success.main}
                    strokeWidth={2}
                    name="Usuários Online"
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="conexoes"
                    stroke={theme.palette.warning.main}
                    strokeWidth={2}
                    name="Conexões Ativas"
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Informações do Sistema */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <Timeline /> Informações do Sistema
              </Typography>
              <Divider sx={{ my: 2 }} />
              {systemInfo && (
                <Stack spacing={1.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Plataforma:</Typography>
                    <Typography variant="body2" fontWeight="medium">{systemInfo.platform}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Arquitetura:</Typography>
                    <Typography variant="body2" fontWeight="medium">{systemInfo.architecture}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">CPUs:</Typography>
                    <Typography variant="body2" fontWeight="medium">{systemInfo.cpus}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Memória Total:</Typography>
                    <Typography variant="body2" fontWeight="medium">{formatBytes(systemInfo.totalMemory)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Node.js:</Typography>
                    <Typography variant="body2" fontWeight="medium">{systemInfo.nodeVersion}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Uptime:</Typography>
                    <Typography variant="body2" fontWeight="medium">{formatUptime(systemInfo.uptime)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Hostname:</Typography>
                    <Typography variant="body2" fontWeight="medium">{systemInfo.hostname}</Typography>
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Logs por Categoria */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Logs por Categoria (Últimos 7 dias)
              </Typography>
              <Divider sx={{ my: 2 }} />
              {stats.logs?.byCategory && stats.logs.byCategory.length > 0 ? (
                <Stack spacing={2}>
                  {stats.logs.byCategory.map((cat, index) => (
                    <Box key={index}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                        <Typography variant="body2" fontWeight="medium">
                          {cat.categoria}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {cat.total}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(cat.total / stats.logs.total) * 100}
                        color="primary"
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Nenhum dado disponível
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewPanel;
