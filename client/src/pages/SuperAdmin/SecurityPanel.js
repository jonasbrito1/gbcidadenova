import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert
} from '@mui/material';
import { Refresh, Block, CheckCircle } from '@mui/icons-material';
import { superAdminService } from '../../services/api';

const SecurityPanel = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [unblockDialog, setUnblockDialog] = useState({ open: false, ip: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, eventsRes] = await Promise.all([
        superAdminService.getSecurityStats(),
        superAdminService.getSecurityEvents({ limit: 50 })
      ]);
      setStats(statsRes.data);
      setEvents(eventsRes.data.events);
    } catch (error) {
      console.error('Erro ao carregar dados de segurança:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockIP = async () => {
    try {
      await superAdminService.unblockIP(unblockDialog.ip);
      setUnblockDialog({ open: false, ip: '' });
      loadData();
    } catch (error) {
      console.error('Erro ao desbloquear IP:', error);
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'baixa': return 'info';
      case 'media': return 'warning';
      case 'alta': return 'error';
      case 'critica': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={3}>
        <Typography variant="h5">Segurança e Ameaças</Typography>
        <IconButton onClick={loadData} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      {/* Estatísticas */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{stats?.total_eventos || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                Total de eventos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{stats?.login_failed || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                Falhas de login
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{stats?.ips_blocked || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                IPs bloqueados
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4">{stats?.critical || 0}</Typography>
              <Typography variant="body2" color="text.secondary">
                Eventos críticos
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* IPs Bloqueados */}
      {stats?.blockedIPs && stats.blockedIPs.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              IPs Bloqueados Atualmente
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>IP</TableCell>
                    <TableCell>Tentativas</TableCell>
                    <TableCell>Última Tentativa</TableCell>
                    <TableCell>Ação</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.blockedIPs.map((ip) => (
                    <TableRow key={ip.ip_address}>
                      <TableCell>{ip.ip_address}</TableCell>
                      <TableCell>{ip.tentativas}</TableCell>
                      <TableCell>
                        {new Date(ip.ultima_tentativa).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() =>
                            setUnblockDialog({ open: true, ip: ip.ip_address })
                          }
                        >
                          Desbloquear
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Eventos Recentes */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Eventos Recentes
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Severidade</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Descrição</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {new Date(event.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>{event.tipo}</TableCell>
                    <TableCell>
                      <Chip
                        label={event.severidade}
                        color={getSeverityColor(event.severidade)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{event.ip_address}</TableCell>
                    <TableCell>{event.descricao}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Dialog de Desbloqueio */}
      <Dialog open={unblockDialog.open} onClose={() => setUnblockDialog({ open: false, ip: '' })}>
        <DialogTitle>Desbloquear IP</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja desbloquear o IP <strong>{unblockDialog.ip}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnblockDialog({ open: false, ip: '' })}>
            Cancelar
          </Button>
          <Button onClick={handleUnblockIP} color="primary" variant="contained">
            Desbloquear
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityPanel;
