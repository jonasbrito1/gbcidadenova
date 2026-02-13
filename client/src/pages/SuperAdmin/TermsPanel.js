import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Grid,
  Button,
  ButtonGroup,
  TextField,
  MenuItem,
  Stack,
  Divider,
  TablePagination,
  Alert
} from '@mui/material';
import {
  Refresh,
  CheckCircle,
  PictureAsPdf,
  TableChart,
  Description,
  Assessment
} from '@mui/icons-material';
import { superAdminService } from '../../services/api';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const TermsPanel = () => {
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [versions, setVersions] = useState([]);
  const [acceptances, setAcceptances] = useState([]);
  const [stats, setStats] = useState(null);
  const [totalAcceptances, setTotalAcceptances] = useState(0);

  // Filtros
  const [filters, setFilters] = useState({
    tipo: '',
    dataInicio: '',
    dataFim: '',
    search: ''
  });

  // Paginação
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, rowsPerPage, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [versionsRes, acceptancesRes, statsRes] = await Promise.all([
        superAdminService.getTermsVersions(),
        superAdminService.getTermsAcceptances({
          limit: rowsPerPage,
          offset: page * rowsPerPage,
          ...filters
        }),
        superAdminService.getTermsStats()
      ]);
      setVersions(versionsRes.data);
      setAcceptances(acceptancesRes.data.acceptances);
      setTotalAcceptances(acceptancesRes.data.total || acceptancesRes.data.acceptances.length);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar termos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  // Função para exportar como CSV
  const exportCSV = () => {
    const headers = ['Usuário', 'Email', 'Versão', 'Tipo', 'Data de Aceite', 'IP'];
    const rows = acceptances.map(a => [
      a.usuario_nome,
      a.usuario_email,
      a.versao_aceita,
      a.tipo_termo || 'N/A',
      new Date(a.aceito_em).toLocaleString('pt-BR'),
      a.ip_address
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aceites_termos_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Função para exportar como TXT
  const exportTXT = () => {
    let txtContent = '='.repeat(80) + '\n';
    txtContent += 'RELATÓRIO DE ACEITES - TERMOS DE USO E LGPD\n';
    txtContent += 'Gerado em: ' + new Date().toLocaleString('pt-BR') + '\n';
    txtContent += '='.repeat(80) + '\n\n';

    if (stats) {
      txtContent += 'ESTATÍSTICAS GERAIS:\n';
      txtContent += '-'.repeat(80) + '\n';
      txtContent += `Total de Aceites: ${stats.total_aceites || 0}\n`;
      txtContent += `Usuários que Aceitaram: ${stats.usuarios_aceitaram || 0}\n`;
      txtContent += `Total de Usuários: ${stats.total_usuarios || 0}\n`;
      txtContent += `Taxa de Aceitação: ${stats.total_usuarios ? ((stats.usuarios_aceitaram / stats.total_usuarios) * 100).toFixed(1) : 0}%\n`;
      txtContent += `Versões Ativas: ${stats.versoes_ativas || 0}\n\n`;
    }

    txtContent += 'ACEITES RECENTES:\n';
    txtContent += '-'.repeat(80) + '\n\n';

    acceptances.forEach((a, index) => {
      txtContent += `${index + 1}. ${a.usuario_nome} (${a.usuario_email})\n`;
      txtContent += `   Versão: ${a.versao_aceita} | Tipo: ${a.tipo_termo || 'N/A'}\n`;
      txtContent += `   Data: ${new Date(a.aceito_em).toLocaleString('pt-BR')}\n`;
      txtContent += `   IP: ${a.ip_address}\n\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aceites_termos_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  // Função para exportar como PDF
  const exportPDF = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      // Título
      doc.setFontSize(18);
      doc.text('Relatório de Aceites - Termos de Uso e LGPD', 14, 20);

      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 28);

      // Estatísticas
      if (stats) {
        doc.setFontSize(14);
        doc.text('Estatísticas Gerais', 14, 40);

        doc.setFontSize(10);
        doc.text(`Total de Aceites: ${stats.total_aceites || 0}`, 14, 48);
        doc.text(`Usuários que Aceitaram: ${stats.usuarios_aceitaram || 0}`, 14, 54);
        doc.text(`Total de Usuários: ${stats.total_usuarios || 0}`, 14, 60);
        doc.text(`Taxa de Aceitação: ${stats.total_usuarios ? ((stats.usuarios_aceitaram / stats.total_usuarios) * 100).toFixed(1) : 0}%`, 14, 66);
        doc.text(`Versões Ativas: ${stats.versoes_ativas || 0}`, 14, 72);
      }

      // Tabela de aceites
      const tableData = acceptances.map(a => [
        a.usuario_nome,
        a.usuario_email,
        a.versao_aceita,
        new Date(a.aceito_em).toLocaleString('pt-BR'),
        a.ip_address
      ]);

      doc.autoTable({
        head: [['Usuário', 'Email', 'Versão', 'Data', 'IP']],
        body: tableData,
        startY: 80,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });

      doc.save(`aceites_termos_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    } finally {
      setExporting(false);
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5">Termos de Uso e LGPD</Typography>
          <Typography variant="body2" color="text.secondary">
            Auditoria completa de aceites e conformidade com LGPD
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <ButtonGroup variant="outlined" size="small">
            <Button
              startIcon={<PictureAsPdf />}
              onClick={exportPDF}
              disabled={exporting || acceptances.length === 0}
            >
              PDF
            </Button>
            <Button
              startIcon={<TableChart />}
              onClick={exportCSV}
              disabled={acceptances.length === 0}
            >
              CSV
            </Button>
            <Button
              startIcon={<Description />}
              onClick={exportTXT}
              disabled={acceptances.length === 0}
            >
              TXT
            </Button>
          </ButtonGroup>
          <IconButton onClick={loadData} color="primary">
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      {/* Estatísticas */}
      {stats && (
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} md={2.4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Assessment color="primary" />
                  <Typography variant="caption" color="text.secondary">
                    Versões Ativas
                  </Typography>
                </Stack>
                <Typography variant="h4">{stats.versoes_ativas || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CheckCircle color="success" />
                  <Typography variant="caption" color="text.secondary">
                    Total de Aceites
                  </Typography>
                </Stack>
                <Typography variant="h4">{stats.total_aceites || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CheckCircle color="info" />
                  <Typography variant="caption" color="text.secondary">
                    Usuários Aceitaram
                  </Typography>
                </Stack>
                <Typography variant="h4">{stats.usuarios_aceitaram || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <CheckCircle />
                  <Typography variant="caption" color="text.secondary">
                    Total Usuários
                  </Typography>
                </Stack>
                <Typography variant="h4">{stats.total_usuarios || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={2.4}>
            <Card>
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Assessment color="success" />
                  <Typography variant="caption" color="text.secondary">
                    Taxa de Aceitação
                  </Typography>
                </Stack>
                <Typography variant="h4">
                  {stats.total_usuarios ?
                    ((stats.usuarios_aceitaram / stats.total_usuarios) * 100).toFixed(1) : 0}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros de Auditoria */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros de Auditoria
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Tipo de Termo"
                select
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="termos_uso">Termos de Uso</MenuItem>
                <MenuItem value="lgpd">LGPD</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Data Início"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Data Fim"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={filters.dataFim}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Buscar usuário ou email"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Nome ou email..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Versões de Termos */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Versões dos Termos
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Versão</TableCell>
                  <TableCell>Título</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Aceites</TableCell>
                  <TableCell>Publicado em</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell>{version.versao}</TableCell>
                    <TableCell>{version.titulo}</TableCell>
                    <TableCell>
                      <Chip label={version.tipo} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={version.ativo ? 'Ativo' : 'Inativo'}
                        color={version.ativo ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{version.total_aceites || 0}</TableCell>
                    <TableCell>
                      {new Date(version.publicado_em).toLocaleString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Aceites Recentes */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Aceites Recentes ({totalAcceptances})
            </Typography>
            {acceptances.length > 0 && (
              <Alert severity="info" sx={{ py: 0 }}>
                Exibindo {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, totalAcceptances)} de {totalAcceptances}
              </Alert>
            )}
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Versão</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Data de Aceite</TableCell>
                  <TableCell>IP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {acceptances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" py={3}>
                        Nenhum aceite encontrado com os filtros selecionados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  acceptances.map((acceptance) => (
                    <TableRow key={acceptance.id} hover>
                      <TableCell>{acceptance.usuario_nome}</TableCell>
                      <TableCell>{acceptance.usuario_email}</TableCell>
                      <TableCell>
                        <Chip label={acceptance.versao_aceita} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={acceptance.tipo_termo === 'termos_uso' ? 'Termos de Uso' : 'LGPD'}
                          size="small"
                          color={acceptance.tipo_termo === 'termos_uso' ? 'primary' : 'secondary'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(acceptance.aceito_em).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {acceptance.ip_address}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider sx={{ my: 2 }} />
          <TablePagination
            component="div"
            count={totalAcceptances}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50, 100]}
            labelRowsPerPage="Linhas por página:"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default TermsPanel;
