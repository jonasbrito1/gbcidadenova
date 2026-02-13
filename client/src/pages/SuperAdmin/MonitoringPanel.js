import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  IconButton,
  CircularProgress
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { superAdminService } from '../../services/api';

const MonitoringPanel = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsRes, infoRes] = await Promise.all([
        superAdminService.getCurrentMetrics(),
        superAdminService.getSystemInfo()
      ]);
      setMetrics(metricsRes.data);
      setSystemInfo(infoRes.data);
    } catch (error) {
      console.error('Erro ao carregar monitoramento:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatBytes = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return gb.toFixed(2) + ' GB';
  };

  const getProgressColor = (value) => {
    if (value < 60) return 'success';
    if (value < 80) return 'warning';
    return 'error';
  };

  if (loading && !metrics) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Monitoramento do Sistema</Typography>
        <IconButton onClick={loadData} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {/* Métricas em Tempo Real */}
      <Grid container spacing={3}>
        {/* CPU */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                CPU
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h3" sx={{ mr: 2 }}>
                  {metrics?.cpu_usage?.toFixed(1) || 0}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics?.cpu_usage || 0}
                  color={getProgressColor(metrics?.cpu_usage || 0)}
                  sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                Load Average: {metrics?.load_average?.toFixed(2) || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Memória */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memória
              </Typography>
              <Box display="flex" alignItems="center" mb={1}>
                <Typography variant="h3" sx={{ mr: 2 }}>
                  {metrics?.memory_usage?.toFixed(1) || 0}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics?.memory_usage || 0}
                  color={getProgressColor(metrics?.memory_usage || 0)}
                  sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary">
                {formatBytes(metrics?.memory_used || 0)} / {formatBytes(metrics?.memory_total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Usuários Online */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usuários Online
              </Typography>
              <Typography variant="h3">{metrics?.users_online || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Conexões Ativas */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Conexões
              </Typography>
              <Typography variant="h3">{metrics?.active_connections || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Requisições/Min */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Requisições/Min
              </Typography>
              <Typography variant="h3">{metrics?.requests_per_minute || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Tempo Resposta */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tempo Resposta
              </Typography>
              <Typography variant="h3">{metrics?.avg_response_time || 0}ms</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Banco de Dados */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Banco de Dados
              </Typography>
              <Typography variant="h4">
                {metrics?.database_size_mb?.toFixed(2) || 0} MB
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tamanho total do banco
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Informações do Sistema */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações do Sistema
              </Typography>
              {systemInfo && (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    <strong>Plataforma:</strong> {systemInfo.platform}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Arquitetura:</strong> {systemInfo.architecture}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>CPUs:</strong> {systemInfo.cpus}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Memória Total:</strong> {formatBytes(systemInfo.totalMemory)}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Node.js:</strong> {systemInfo.nodeVersion}
                  </Typography>
                  <Typography variant="body2" gutterBottom>
                    <strong>Uptime:</strong> {formatUptime(systemInfo.uptime)}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringPanel;
