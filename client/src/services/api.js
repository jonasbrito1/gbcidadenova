import axios from 'axios';

// URL base da API
// Em desenvolvimento, usar o proxy configurado no setupProxy.js (/api -> http://localhost:4011)
// Em produção, usar a variável de ambiente
const API_BASE_URL = process.env.REACT_APP_API_URL
  ? `${process.env.REACT_APP_API_URL}/api`
  : '/api'; // Usar proxy em desenvolvimento

// Criar instância do axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('gb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se o token expirou ou é inválido, redirecionar para login
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('gb_token');
      localStorage.removeItem('gb_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verifyToken: () => api.get('/auth/verify'),
  changePassword: (data) => api.post('/auth/change-password', data),

  // Primeiro acesso
  firstLoginChangePassword: (data) => api.post('/auth/first-login/change-password', data),
  acceptLGPD: () => api.post('/auth/lgpd/accept'),
  getFirstAccessStatus: () => api.get('/auth/first-access-status'),

  // Password Reset
  requestPasswordReset: (email) => api.post('/auth/password-reset/request', { email }),
  verifyResetToken: (token) => api.get(`/auth/password-reset/verify/${token}`),
  confirmPasswordReset: (data) => api.post('/auth/password-reset/confirm', data),
};

// Serviços de usuários
export const userService = {
  getUsers: (params) => api.get('/users', { params }),
  getUserById: (id) => api.get(`/users/${id}`),
  createUser: (data) => api.post('/users', data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),
};

// Serviços de alunos
export const studentService = {
  getStudents: (params) => api.get('/students', { params }),
  getStudentById: (id) => api.get(`/students/${id}`),
  createStudent: (data) => api.post('/students/create', data), // Nova rota para criação completa
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  updateStudentStatus: (id, status) => api.patch(`/students/${id}/status`, { status }), // Alterar status (ativar/inativar/trancar)
  deleteStudent: (id) => api.delete(`/students/${id}`), // Excluir permanentemente

  // Operações em massa
  bulkUpdateStatus: (data) => api.post('/students/bulk-update-status', data), // Alterar status em massa
  bulkUpdateGraduacao: (data) => api.post('/students/bulk-update-graduacao', data), // Alterar graduação em massa
  bulkDelete: (data) => api.post('/students/bulk-delete', data), // Excluir em massa

  // Graduações
  getStudentGraduations: (id) => api.get(`/students/${id}/graduacoes`),
  checkGraduationEligibility: (id, params) => api.get(`/students/${id}/elegibilidade-graduacao`, { params }),
  registerGraduation: (id, data) => api.post(`/students/${id}/graduacoes`, data),
  getGraduationSystem: () => api.get('/students/graduacoes-sistema'),
  updateStudentDegrees: (id, graus_faixa) => api.put(`/students/${id}/graus`, { graus_faixa }),
};

// Serviços de professores
export const teacherService = {
  getTeachers: () => api.get('/teachers'),
  getTeacherById: (id) => api.get(`/teachers/${id}`),
};

// Serviços de professores (novo sistema completo)
export const professorService = {
  getProfessores: (params) => api.get('/professores', { params }),
  getProfessorById: (id) => api.get(`/professores/${id}`),
  createProfessor: (data) => api.post('/professores', data),
  updateProfessor: (id, data) => api.put(`/professores/${id}`, data),
  deleteProfessor: (id) => api.delete(`/professores/${id}`),
  getProfessorTurmas: (id) => api.get(`/professores/${id}/turmas`),
  getProfessorAlunos: (id) => api.get(`/professores/${id}/alunos`),
  getProfessorFrequencia: (id, params) => api.get(`/professores/${id}/frequencia`, { params }),
  getProfessorEstatisticas: (id) => api.get(`/professores/${id}/estatisticas`),
};

// Serviços de turmas
export const turmaService = {
  getTurmas: (params) => api.get('/turmas', { params }),
  getTurmaById: (id) => api.get(`/turmas/${id}`),
  createTurma: (data) => api.post('/turmas', data),
  updateTurma: (id, data) => api.put(`/turmas/${id}`, data),
  deleteTurma: (id) => api.delete(`/turmas/${id}`),
  getTurmaAlunos: (id) => api.get(`/turmas/${id}/alunos`),
  addAlunoTurma: (id, data) => api.post(`/turmas/${id}/alunos`, data),
  removeAlunoTurma: (id, alunoId) => api.delete(`/turmas/${id}/alunos/${alunoId}`),
  getGradeHorarios: () => api.get('/turmas/grade/horarios'),
};

// Serviços de financeiro
export const financeiroService = {
  // Mensalidades
  getMensalidades: (params) => api.get('/financeiro/mensalidades', { params }),
  getMensalidadeById: (id) => api.get(`/financeiro/mensalidades/${id}`),
  createMensalidade: (data) => api.post('/financeiro/mensalidades', data),
  registrarPagamento: (id, data) => api.post(`/financeiro/mensalidades/${id}/pagar`, data),
  gerarMensalidadesLote: (data) => api.post('/financeiro/mensalidades/gerar-lote', data),

  // Dashboard
  getDashboard: (params) => api.get('/financeiro/dashboard', { params }),

  // Operações em massa
  bulkDeleteMensalidades: (data) => api.post('/financeiro/mensalidades/bulk-delete', data),
  bulkUpdateStatusMensalidades: (data) => api.post('/financeiro/mensalidades/bulk-update-status', data),
  sendBulkNotifications: (data) => api.post('/financeiro/mensalidades/send-bulk-notifications', data),

  // Edição
  editarMensalidade: (id, data) => api.put(`/financeiro/mensalidades/${id}`, data),
  bulkEditMensalidades: (data) => api.put('/financeiro/mensalidades/bulk-edit', data),

  // Correção de vencimentos
  corrigirVencimentos: (alunoId, data) => api.post(`/financeiro/mensalidades/corrigir-vencimentos/${alunoId}`, data),
};

// Serviços de frequência
export const frequenciaService = {
  // Registro
  registrarTurma: (data) => api.post('/frequencia/registrar-turma', data),
  registrar: (data) => api.post('/frequencia/registrar', data),
  registrarIndividual: (data) => api.post('/frequencia/registrar-individual', data),

  // Busca de alunos para registro
  getAlunosDisponiveis: (params) => api.get('/frequencia/alunos-disponiveis', { params }),

  // Consultas
  getFrequencias: (params) => api.get('/frequencia', { params }),
  getFrequenciaAluno: (id, params) => api.get(`/frequencia/aluno/${id}`, { params }),
  getAlunosTurma: (turmaId, params) => api.get(`/frequencia/turma/${turmaId}/alunos`, { params }),

  // Estatísticas
  getEstatisticasAluno: (id, params) => api.get(`/frequencia/aluno/${id}/estatisticas`, { params }),
  getEstatisticasGerais: (params) => api.get('/frequencia/estatisticas', { params }),

  // Relatórios
  getRelatorioMensal: (params) => api.get('/frequencia/relatorio/mensal', { params }),
  getRelatorioDetalhado: (params) => api.get('/frequencia/relatorio/detalhado', { params }),

  // Validação de presenças
  getPendentesValidacao: (params) => api.get('/frequencia/pendentes-validacao', { params }),
  validarPresenca: (id, data) => api.post(`/frequencia/validar/${id}`, data),
  getTurmaDia: (turmaId, data, params) => api.get(`/frequencia/turma/${turmaId}/dia/${data}`, { params }),
};

// Serviços de formulários de cadastro
export const formularioService = {
  // Público (sem autenticação)
  enviarFormulario: (data) => axios.post('/api/formularios/publico', data),

  // Protegido (admin/professor)
  getFormularios: (params) => api.get('/formularios', { params }),
  getFormularioById: (id) => api.get(`/formularios/${id}`),
  aprovarFormulario: (id, data) => api.post(`/formularios/${id}/aprovar`, data),
  rejeitarFormulario: (id, data) => api.post(`/formularios/${id}/rejeitar`, data),
};

// Serviços de planos
export const planService = {
  getPlans: () => api.get('/plans'),
  getPlanById: (id) => api.get(`/plans/${id}`),
};

// Serviços de pagamentos
export const paymentService = {
  getPayments: (params) => api.get('/payments', { params }),
  markAsPaid: (id, data) => api.put(`/payments/${id}/pagar`, data),
};

// Serviços de frequência
export const attendanceService = {
  registerAttendance: (data) => api.post('/attendance', data),
  getStudentAttendance: (studentId, params) => api.get(`/attendance/aluno/${studentId}`, { params }),
};

// Serviços de dashboard
export const dashboardService = {
  getDashboardData: (params) => api.get('/dashboard', { params }),
  getFinancialMetrics: (params) => api.get('/dashboard/financeiro', { params }),
  getAlerts: () => api.get('/dashboard/alertas'),
  getAniversariantes: (params) => api.get('/dashboard/aniversariantes', { params }),
  enviarEmailAniversario: (data) => api.post('/dashboard/enviar-email-aniversario', data),
  validarMensagemAniversario: (data) => api.post('/dashboard/validar-mensagem-aniversario', data),
};

// Serviços de relatórios
export const reportService = {
  getFinancialReport: (params) => api.get('/reports/financeiro', { params }),
};

// Serviços de CMS
export const cmsService = {
  // Seções
  getSecoes: () => api.get('/cms/secoes'),
  getSecaoById: (id) => api.get(`/cms/secoes/${id}`),

  // Conteúdos
  updateConteudo: (id, data) => api.put(`/cms/conteudos/${id}`, data),

  // Upload
  uploadImagem: (conteudoId, formData) => api.post(`/cms/upload/${conteudoId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  removeUpload: (uploadId) => api.delete(`/cms/upload/${uploadId}`),

  // Histórico
  getHistorico: (conteudoId, params) => api.get(`/cms/historico/${conteudoId}`, { params }),

  // Conteúdo público - usar dados mock enquanto o CMS não está totalmente implementado
  getConteudoPublico: () => Promise.resolve({
    data: {
      hero: {
        nome: 'Seção Principal',
        conteudos: {
          titulo_principal: { valor: 'Gracie Barra' },
          subtitulo_principal: { valor: 'Cidade Nova' },
          descricao_hero: { valor: 'Jiu-Jitsu para todos os níveis e idades. Venha fazer parte da maior equipe de Jiu-Jitsu do mundo!' },
          botao_cta_texto: { valor: 'Comece Agora' }
        }
      },
      sobre: {
        nome: 'Sobre Nós',
        conteudos: {
          titulo_sobre: { valor: 'Sobre a Gracie Barra Cidade Nova' },
          texto_sobre: { valor: 'A Gracie Barra Cidade Nova é uma academia dedicada ao ensino do Jiu-Jitsu brasileiro, seguindo a metodologia e filosofia da maior organização de Jiu-Jitsu do mundo.' }
        }
      },
      contato: {
        nome: 'Contato',
        conteudos: {
          titulo_contato: { valor: 'Entre em Contato' },
          endereco: { valor: 'Rua das Palmeiras, 123 - Cidade Nova' },
          telefone: { valor: '(11) 99999-9999' },
          email: { valor: 'contato@gbcidadenova.com.br' }
        }
      },
      cta: {
        nome: 'Comece sua Jornada',
        conteudos: {
          titulo_cta: { valor: 'Comece sua Jornada Hoje' },
          subtitulo_cta: { valor: 'Transforme sua vida através do Jiu-Jitsu' },
          botao_cta_principal: { valor: 'Agende sua Aula Experimental' },
          botao_cta_secundario: { valor: 'Saiba Mais' }
        }
      },
      footer: {
        nome: 'Rodapé',
        conteudos: {
          texto_footer: { valor: '© 2025 Gracie Barra Cidade Nova. Todos os direitos reservados.' }
        }
      }
    }
  }),
};

// Serviços do perfil do aluno
export const studentProfileService = {
  // Perfil
  getMyProfile: () => api.get('/student-profile/me'),
  updateMyProfile: (data) => api.put('/student-profile/me', data),
  uploadPhoto: (formData) => api.post('/student-profile/upload-photo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  // Horários
  getSchedule: () => api.get('/student-profile/schedule'),
  // Dependentes
  getDependentes: () => api.get('/student-profile/dependentes'),
  getDependente: (id) => api.get(`/student-profile/dependente/${id}`),
  // Graduação - Acompanhamento de Progresso
  getGraduationEligibility: () => api.get('/student-profile/graduation-eligibility'),
  getGraduationTimeline: () => api.get('/student-profile/graduation-timeline'),
  getGraduationProjection: () => api.get('/student-profile/graduation-projection'),
};

// Serviços de frequência do aluno
export const studentAttendanceService = {
  checkIn: (turmaId) => api.post('/student-attendance/check-in', { turma_id: turmaId }),
  getMyHistory: (params) => api.get('/student-attendance/my-history', { params }),
  getAvailableClassesToday: () => api.get('/student-attendance/available-classes-today'),
  // Dependentes
  getDependenteHistory: (dependenteId, params) => api.get(`/student-attendance/dependente/${dependenteId}/history`, { params }),
};

// Serviços de pagamentos do aluno
export const studentPaymentService = {
  getMyPayments: () => api.get('/student-payments/my-payments'),
  generatePix: (mensalidadeId) => api.get(`/student-payments/${mensalidadeId}/pix`),
  confirmPayment: (mensalidadeId, data) => api.post(`/student-payments/${mensalidadeId}/confirm-payment`, data),
  // Dependentes
  getDependentePayments: (dependenteId) => api.get(`/student-payments/dependente/${dependenteId}`),
};

// Serviços do novo sistema de frequência
export const frequenciaNovoService = {
  // Aluno
  getTurmasDisponiveis: () => api.get('/frequencia-novo/turmas-disponiveis'),
  registrarPresenca: (data) => api.post('/frequencia-novo/registrar-presenca', data),
  getMinhasPresencas: (params) => api.get('/frequencia-novo/minhas-presencas', { params }),
  getMeuProgresso: () => api.get('/frequencia-novo/meu-progresso'),

  // Admin/Professor
  validarPresenca: (id, data) => api.put(`/frequencia-novo/validar/${id}`, data),
  validarPresencasLote: (data) => api.post('/frequencia-novo/validar-lote', data),
  getPresencasPendentes: (params) => api.get('/frequencia-novo/pendentes', { params }),
  getTurmasAtivas: () => api.get('/frequencia-novo/turmas-ativas'),

  // Justificativas de Ausências
  justificarAusencia: (data) => api.post('/frequencia-novo/justificar-ausencia', data),
  getMinhasJustificativas: (params) => api.get('/frequencia-novo/minhas-justificativas', { params }),
  getJustificativasPendentes: (params) => api.get('/frequencia-novo/justificativas-pendentes', { params }),
  analisarJustificativa: (id, data) => api.put(`/frequencia-novo/analisar-justificativa/${id}`, data),
};

// Serviços do SuperAdmin
export const superAdminService = {
  // Dashboard
  getDashboard: () => api.get('/superadmin/dashboard'),

  // Logs
  getLogs: (params) => api.get('/superadmin/logs', { params }),
  getLogsStats: () => api.get('/superadmin/logs/stats'),

  // Segurança
  getSecurityEvents: (params) => api.get('/superadmin/security/events', { params }),
  getSecurityStats: () => api.get('/superadmin/security/stats'),
  unblockIP: (ip_address) => api.post('/superadmin/security/unblock-ip', { ip_address }),

  // Backups
  getBackups: (params) => api.get('/superadmin/backups', { params }),
  getBackupsStats: () => api.get('/superadmin/backups/stats'),
  createBackup: () => api.post('/superadmin/backups/create'),
  downloadBackup: (id) => api.get(`/superadmin/backups/${id}/download`, { responseType: 'blob' }),
  deleteBackup: (id) => api.delete(`/superadmin/backups/${id}`),
  restoreBackup: (id) => api.post(`/superadmin/backups/${id}/restore`),
  validateBackup: (id) => api.get(`/superadmin/backups/${id}/validate`),
  getBackupsDiskSpace: () => api.get('/superadmin/backups/disk-space'),
  cleanupBackups: (keepCount) => api.post('/superadmin/backups/cleanup', { keepCount }),

  // Monitoramento
  getCurrentMetrics: () => api.get('/superadmin/monitoring/current'),
  getMetrics: (params) => api.get('/superadmin/monitoring/metrics', { params }),
  getMetricsHistory: (params) => api.get('/superadmin/monitoring/metrics', { params }),
  getMonitoringStats: () => api.get('/superadmin/monitoring/stats'),
  getSystemInfo: () => api.get('/superadmin/monitoring/system-info'),
  getHealthCheck: () => api.get('/superadmin/monitoring/health'),

  // Termos LGPD
  getTermsVersions: () => api.get('/superadmin/terms/versions'),
  getTermsAcceptances: (params) => api.get('/superadmin/terms/acceptances', { params }),
  getTermsStats: () => api.get('/superadmin/terms/stats'),
};

export default api;