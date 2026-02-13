import React, { useState } from 'react';
import {
  Box,
  Container,
  Tab,
  Tabs,
  Typography,
  Paper,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Description as LogsIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
  Assignment as TermsIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import LogsPanel from './LogsPanel';
import SecurityPanel from './SecurityPanel';
import BackupsPanel from './BackupsPanel';
import TermsPanel from './TermsPanel';
import OverviewPanel from './OverviewPanel';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`superadmin-tabpanel-${index}`}
      aria-labelledby={`superadmin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const SuperAdminDashboard = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const navigate = useNavigate();

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          onClick={() => navigate('/dashboard')}
          sx={{ cursor: 'pointer' }}
        >
          Dashboard
        </Link>
        <Typography color="text.primary">SuperAdmin</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Painel SuperAdmin
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gerenciamento completo do sistema, logs, segurança, backups e monitoramento em tempo real
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
              fontSize: '0.95rem'
            }
          }}
        >
          <Tab
            icon={<DashboardIcon />}
            iconPosition="start"
            label="Visão Geral"
          />
          <Tab
            icon={<LogsIcon />}
            iconPosition="start"
            label="Logs do Sistema"
          />
          <Tab
            icon={<SecurityIcon />}
            iconPosition="start"
            label="Segurança"
          />
          <Tab
            icon={<BackupIcon />}
            iconPosition="start"
            label="Backups"
          />
          <Tab
            icon={<TermsIcon />}
            iconPosition="start"
            label="Termos LGPD"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <OverviewPanel />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <LogsPanel />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <SecurityPanel />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <BackupsPanel />
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <TermsPanel />
      </TabPanel>
    </Container>
  );
};

export default SuperAdminDashboard;
