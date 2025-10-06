import axios from 'axios';

// URL base da API
const API_BASE_URL = 'http://localhost:3011/api';

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
  getStudentGraduations: (id) => api.get(`/students/${id}/graduacoes`),
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
  // Bandeiras
  getBandeiras: () => api.get('/financeiro/bandeiras'),
  createBandeira: (data) => api.post('/financeiro/bandeiras', data),

  // Mensalidades
  getMensalidades: (params) => api.get('/financeiro/mensalidades', { params }),
  getMensalidadeById: (id) => api.get(`/financeiro/mensalidades/${id}`),
  createMensalidade: (data) => api.post('/financeiro/mensalidades', data),
  registrarPagamento: (id, data) => api.post(`/financeiro/mensalidades/${id}/pagar`, data),
  gerarMensalidadesLote: (data) => api.post('/financeiro/mensalidades/gerar-lote', data),

  // Dashboard
  getDashboard: (params) => api.get('/financeiro/dashboard', { params }),
};

// Serviços de frequência
export const frequenciaService = {
  // Registro
  registrarTurma: (data) => api.post('/frequencia/registrar-turma', data),
  registrar: (data) => api.post('/frequencia/registrar', data),

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
};

// Serviços de formulários de cadastro
export const formularioService = {
  // Público (sem autenticação)
  enviarFormulario: (data) => axios.post(`${API_BASE_URL}/formularios/publico`, data),

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

export default api;