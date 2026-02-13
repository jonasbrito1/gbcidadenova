import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Spinner, Image,
  Modal, Form, InputGroup, Toast, ToastContainer, Nav, Alert
} from 'react-bootstrap';
import {
  FaUser, FaCamera, FaSave, FaTimes, FaMedal, FaEdit,
  FaCheckCircle, FaTimesCircle, FaKey, FaEye, FaEyeSlash,
  FaPhone, FaMapMarkerAlt, FaHome, FaCity, FaEnvelope,
  FaBirthdayCake, FaIdCard, FaHeart, FaPills, FaClinicMedical,
  FaUserMd, FaShieldAlt, FaInfoCircle,
  FaDollarSign, FaExclamationTriangle, FaChartLine, FaClock,
  FaFileInvoiceDollar, FaTachometerAlt
} from 'react-icons/fa';
import { useLocation } from 'react-router-dom';
import { studentProfileService, authService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import StudentAttendance from './StudentAttendance';
import StudentPayments from './StudentPayments';
import DependenteSelector from './DependenteSelector';
import Header from '../../components/Layout/Header';
import './StudentDashboard.css';

const StudentDashboard = () => {
  const { user, updateUser } = useAuth();
  const location = useLocation();

  // Ler seção da URL (ex: ?section=perfil)
  const getSectionFromURL = () => {
    const params = new URLSearchParams(location.search);
    return params.get('section') || 'overview';
  };

  const [activeSection, setActiveSection] = useState(getSectionFromURL());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Seleção de dependente
  const [selectedDependenteId, setSelectedDependenteId] = useState(null);
  const [isProprioAluno, setIsProprioAluno] = useState(true);

  // Modais
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Senha
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // CEP
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDependenteId !== null) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDependenteId]);

  // Atualizar seção quando URL mudar
  useEffect(() => {
    const section = getSectionFromURL();
    if (section !== activeSection) {
      setActiveSection(section);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError('');

      let response;
      if (selectedDependenteId && !isProprioAluno) {
        response = await studentProfileService.getDependente(selectedDependenteId);
      } else {
        response = await studentProfileService.getMyProfile();
      }

      setProfile(response.data);
      setFormData({
        nome_completo: response.data.nome_completo || response.data.nome || '',
        data_nascimento: response.data.data_nascimento?.split('T')[0] || '',
        cpf: response.data.cpf || '',
        rg: response.data.rg || '',
        email: response.data.email || '',
        telefone: response.data.telefone || '',
        telefone_emergencia: response.data.telefone_emergencia || '',
        endereco: response.data.endereco || '',
        numero: response.data.numero || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        cidade: response.data.cidade || '',
        estado: response.data.estado || '',
        cep: response.data.cep || '',
        responsavel_nome: response.data.responsavel_nome || '',
        responsavel_telefone: response.data.responsavel_telefone || '',
        responsavel_parentesco: response.data.responsavel_parentesco || '',
        tipo_sanguineo: response.data.tipo_sanguineo || '',
        alergias: response.data.alergias || '',
        condicoes_saude: response.data.condicoes_saude || '',
        medicamentos_uso: response.data.medicamentos_uso || '',
        contato_emergencia_medica: response.data.contato_emergencia_medica || '',
        telefone_emergencia_medica: response.data.telefone_emergencia_medica || '',
        plano_saude: response.data.plano_saude || '',
        numero_plano_saude: response.data.numero_plano_saude || '',
        objetivo: response.data.objetivo || ''
      });
      setHasUnsavedChanges(false);
    } catch (err) {
      setError('Erro ao carregar perfil: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const showToastNotification = (message, variant = 'success') => {
    setToastMessage(message);
    setToastVariant(variant);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToastNotification('A foto deve ter no máximo 5MB', 'danger');
      return;
    }

    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      showToastNotification('Apenas imagens JPEG, PNG, GIF ou WebP são permitidas', 'danger');
      return;
    }

    try {
      setUploading(true);
      setError('');
      const formDataUpload = new FormData();
      formDataUpload.append('photo', file);

      const response = await studentProfileService.uploadPhoto(formDataUpload);
      showToastNotification('Foto atualizada com sucesso!', 'success');

      // Recarrega o perfil para garantir que a foto seja atualizada
      await loadProfile();

      // Atualiza também o contexto do usuário
      if (user && updateUser) {
        updateUser({
          ...user,
          foto_url: response.data.foto_url,
          usuario_foto_url: response.data.foto_url
        });
      }
    } catch (err) {
      showToastNotification('Erro ao fazer upload da foto: ' + (err.response?.data?.error || err.message), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const formatPhone = (value) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
  };

  const formatCEP = (value) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d{0,3})/, '$1-$2');
  };

  const formatCPF = (value) => {
    if (!value) return '';
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'telefone' || name === 'telefone_emergencia' || name === 'responsavel_telefone' || name === 'telefone_emergencia_medica') {
      formattedValue = formatPhone(value);
    } else if (name === 'cep') {
      formattedValue = formatCEP(value);
    } else if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'estado') {
      formattedValue = value.toUpperCase().substring(0, 2);
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
    setHasUnsavedChanges(true);
  };

  const buscarCEP = async (cep) => {
    const cepNumeros = cep.replace(/\D/g, '');

    if (cepNumeros.length !== 8) {
      setCepError('CEP deve ter 8 dígitos');
      return;
    }

    try {
      setLoadingCep(true);
      setCepError('');

      const response = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado');
        showToastNotification('CEP não encontrado', 'warning');
        return;
      }

      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado
      }));

      showToastNotification('Endereço preenchido automaticamente!', 'success');
      setHasUnsavedChanges(true);
    } catch (err) {
      setCepError('Erro ao buscar CEP');
      showToastNotification('Erro ao buscar CEP', 'danger');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleCEPChange = (e) => {
    const { value } = e.target;
    const formattedValue = formatCEP(value);

    setFormData(prev => ({
      ...prev,
      cep: formattedValue
    }));

    const cepNumeros = formattedValue.replace(/\D/g, '');
    if (cepNumeros.length === 8) {
      buscarCEP(formattedValue);
    }
    setHasUnsavedChanges(true);
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.nome_completo || formData.nome_completo.trim().length < 3) {
      errors.push('Nome completo deve ter pelo menos 3 caracteres');
    }

    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push('Email inválido');
    }

    if (formData.telefone && formData.telefone.replace(/\D/g, '').length < 10) {
      errors.push('Telefone inválido');
    }

    if (formData.cep && formData.cep.replace(/\D/g, '').length !== 8) {
      errors.push('CEP inválido');
    }

    if (formData.cpf && formData.cpf.replace(/\D/g, '').length !== 11) {
      errors.push('CPF inválido');
    }

    if (errors.length > 0) {
      setError(errors.join(', '));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');

      const dataToSend = {
        ...formData,
        telefone: formData.telefone?.replace(/\D/g, '') || '',
        telefone_emergencia: formData.telefone_emergencia?.replace(/\D/g, '') || '',
        responsavel_telefone: formData.responsavel_telefone?.replace(/\D/g, '') || '',
        telefone_emergencia_medica: formData.telefone_emergencia_medica?.replace(/\D/g, '') || '',
        cep: formData.cep?.replace(/\D/g, '') || '',
        cpf: formData.cpf?.replace(/\D/g, '') || ''
      };

      // Log de debug - dados sendo enviados
      console.log('📤 Dados enviados para atualizar perfil:', {
        campos: Object.keys(dataToSend),
        totalCampos: Object.keys(dataToSend).length,
        dados: dataToSend
      });

      const response = await studentProfileService.updateMyProfile(dataToSend);

      console.log('✅ Resposta do servidor:', response.data);

      showToastNotification('Perfil atualizado com sucesso!', 'success');
      setShowEditModal(false);
      setHasUnsavedChanges(false);
      await loadProfile();
    } catch (err) {
      console.error('❌ Erro ao atualizar perfil:', {
        mensagem: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });

      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      setError('Erro ao atualizar perfil: ' + errorMsg);
      showToastNotification('Erro ao atualizar perfil: ' + errorMsg, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowConfirmModal(true);
    } else {
      setShowEditModal(false);
      loadProfile();
    }
  };

  const confirmCancelEdit = () => {
    setShowConfirmModal(false);
    setShowEditModal(false);
    setHasUnsavedChanges(false);
    loadProfile();
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 6) {
      showToastNotification('A nova senha deve ter pelo menos 6 caracteres', 'warning');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToastNotification('As senhas não coincidem', 'warning');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      showToastNotification('A nova senha deve ser diferente da senha atual', 'warning');
      return;
    }

    setIsChangingPassword(true);

    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      showToastNotification('Senha alterada com sucesso!', 'success');

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Erro ao alterar senha';
      showToastNotification(errorMessage, 'danger');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getGraduationColor = (cor) => {
    const cores = {
      'branca': '#FFFFFF',
      'cinza': '#808080',
      'amarela': '#FFD700',
      'laranja': '#FF8C00',
      'verde': '#228B22',
      'azul': '#0000FF',
      'roxa': '#800080',
      'marrom': '#8B4513',
      'preta': '#000000'
    };
    return cores[cor?.toLowerCase()] || '#CCCCCC';
  };

  if (loading) {
    return (
      <Container className="student-dashboard-container py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Carregando dashboard...</p>
        </div>
      </Container>
    );
  }

  const handleSelectDependente = (dependenteId, ehProprioAluno) => {
    if (hasUnsavedChanges) {
      if (window.confirm('Você tem alterações não salvas. Deseja continuar?')) {
        setSelectedDependenteId(dependenteId);
        setIsProprioAluno(ehProprioAluno);
        setHasUnsavedChanges(false);
        setActiveSection('overview');
      }
    } else {
      setSelectedDependenteId(dependenteId);
      setIsProprioAluno(ehProprioAluno);
      setActiveSection('overview');
    }
  };

  // RENDER OVERVIEW
  const renderOverview = () => (
    <div className="dashboard-overview">
      {/* Header com Foto e Info */}
      <Card className="profile-header-card mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col xs={12} md="auto" className="text-center text-md-start mb-3 mb-md-0">
              <div className="profile-photo-container">
                <div className="profile-photo-wrapper-dashboard" onClick={() => setShowPhotoModal(true)} style={{ cursor: 'pointer' }}>
                  <Image
                    src={profile?.usuario_foto_url || '/images/default-avatar.png'}
                    roundedCircle
                    className="profile-photo-dashboard"
                    alt="Foto de Perfil"
                  />
                  {isProprioAluno && (
                    <>
                      <label
                        htmlFor="photoInput"
                        className="photo-upload-overlay"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {uploading ? (
                          <Spinner animation="border" variant="light" />
                        ) : (
                          <>
                            <FaCamera size={24} />
                            <span className="upload-text">Alterar Foto</span>
                          </>
                        )}
                      </label>
                      <input
                        id="photoInput"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        onChange={handlePhotoChange}
                        style={{ display: 'none' }}
                        disabled={uploading}
                      />
                    </>
                  )}
                </div>
                <p className="upload-hint">
                  <FaInfoCircle className="me-1" />
                  Clique para visualizar
                </p>
              </div>
            </Col>
            <Col xs={12} md>
              <h2 className="mb-2">{profile?.nome_completo}</h2>
              <p className="text-muted mb-3">{profile?.email}</p>
              <div className="d-flex flex-wrap gap-2">
                <Badge bg={profile?.status === 'ativo' ? 'success' : 'secondary'} className="badge-modern">
                  {profile?.status === 'ativo' ? 'Ativo' : 'Inativo'}
                </Badge>
                {profile?.plano_nome && (
                  <Badge bg="info" className="badge-modern">{profile.plano_nome}</Badge>
                )}
                {profile?.programa && (
                  <Badge bg="primary" className="badge-modern">{profile.programa}</Badge>
                )}
              </div>
            </Col>
            <Col xs={12} md="auto" className="mt-3 mt-md-0">
              {isProprioAluno && (
                <div className="d-grid gap-2">
                  <Button variant="primary" onClick={() => setShowEditModal(true)}>
                    <FaEdit className="me-2" />
                    Editar Perfil
                  </Button>
                  <Button variant="danger" onClick={() => setShowPasswordModal(true)}>
                    <FaKey className="me-2" />
                    Alterar Senha
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Ações Rápidas */}
      <Card className="quick-actions-card">
        <Card.Body>
          <h5 className="mb-4">Ações Rápidas</h5>
          <Row>
            <Col xs={12} sm={6} md={3} className="mb-3">
              <Button variant="primary" className="w-100 quick-action-btn" onClick={() => setActiveSection('frequencia')}>
                <FaClock className="d-block mx-auto mb-2" size={24} />
                Ver Frequência
              </Button>
            </Col>
            <Col xs={12} sm={6} md={4} className="mb-3">
              <Button variant="success" className="w-100 quick-action-btn" onClick={() => setActiveSection('pagamentos')}>
                <FaFileInvoiceDollar className="d-block mx-auto mb-2" size={24} />
                Ver Mensalidades
              </Button>
            </Col>
            <Col xs={12} sm={6} md={4} className="mb-3">
              <Button variant="info" className="w-100 quick-action-btn" onClick={() => setActiveSection('perfil')}>
                <FaUser className="d-block mx-auto mb-2" size={24} />
                Dados Pessoais
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </div>
  );

  // RENDER PERFIL
  const renderPerfil = () => (
    <Card className="profile-details-card">
      <Card.Header>
        <h5>
          <FaUser className="me-2" />
          Informações Pessoais
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <div className="info-item mb-3">
              <label><FaIdCard className="me-2" />Nome Completo</label>
              <p>{profile?.nome_completo || '-'}</p>
            </div>
          </Col>
          <Col md={6}>
            <div className="info-item mb-3">
              <label><FaBirthdayCake className="me-2" />Data de Nascimento</label>
              <p>{formatDate(profile?.data_nascimento) || '-'}</p>
            </div>
          </Col>
          <Col md={6}>
            <div className="info-item mb-3">
              <label><FaEnvelope className="me-2" />Email</label>
              <p>{profile?.email || '-'}</p>
            </div>
          </Col>
          <Col md={6}>
            <div className="info-item mb-3">
              <label><FaPhone className="me-2" />Telefone</label>
              <p>{formatPhone(profile?.telefone) || '-'}</p>
            </div>
          </Col>
        </Row>

        <h6 className="mt-4 mb-3 text-primary">Endereço</h6>
        <Row>
          <Col md={8}>
            <div className="info-item mb-3">
              <label><FaHome className="me-2" />Endereço Completo</label>
              <p>
                {profile?.endereco && profile?.numero
                  ? `${profile.endereco}, ${profile.numero}${profile.complemento ? ` - ${profile.complemento}` : ''}`
                  : '-'
                }
              </p>
            </div>
          </Col>
          <Col md={4}>
            <div className="info-item mb-3">
              <label><FaMapMarkerAlt className="me-2" />CEP</label>
              <p>{formatCEP(profile?.cep) || '-'}</p>
            </div>
          </Col>
          <Col md={8}>
            <div className="info-item mb-3">
              <label><FaCity className="me-2" />Cidade/Estado</label>
              <p>{profile?.cidade && profile?.estado ? `${profile.cidade} - ${profile.estado}` : '-'}</p>
            </div>
          </Col>
        </Row>

        {isProprioAluno && (
          <div className="text-end mt-4">
            <Button variant="primary" onClick={() => setShowEditModal(true)}>
              <FaEdit className="me-2" />
              Editar Informações
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );

  // RENDER GRADUAÇÃO
  const renderGraduacao = () => (
    <Card className="graduation-card">
      <Card.Header>
        <h5>
          <FaMedal className="me-2" />
          Graduações
        </h5>
      </Card.Header>
      <Card.Body>
        {profile?.graduacao_atual && (
          <div className="text-center mb-4">
            <h6 className="text-muted mb-3">Graduação Atual</h6>
            <div
              className="graduation-badge-xl mx-auto"
              style={{
                backgroundColor: getGraduationColor(profile.graduacao_atual.cor),
                color: ['branca', 'amarela', 'cinza'].includes(profile.graduacao_atual.cor?.toLowerCase()) ? '#000' : '#FFF',
                border: profile.graduacao_atual.cor?.toLowerCase() === 'branca' ? '2px solid #ccc' : 'none'
              }}
            >
              {profile.graduacao_atual.nome}
            </div>
            <p className="text-muted mt-3">
              Obtida em: {formatDate(profile.graduacao_atual.data_graduacao)}
            </p>
          </div>
        )}

        {profile?.graduacoes_historico && profile.graduacoes_historico.length > 0 && (
          <>
            <h6 className="text-muted mb-3">Histórico de Graduações</h6>
            <div className="graduation-timeline">
              {profile.graduacoes_historico.map((grad, idx) => (
                <div key={idx} className="timeline-item">
                  <div
                    className="timeline-indicator"
                    style={{
                      backgroundColor: getGraduationColor(grad.cor),
                      border: grad.cor?.toLowerCase() === 'branca' ? '2px solid #ccc' : 'none'
                    }}
                  />
                  <div className="timeline-content">
                    <strong>{grad.nome}</strong>
                    <small className="text-muted d-block">{formatDate(grad.data_graduacao)}</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  );

  return (
    <>
      <Header />
      <Container fluid className="student-dashboard-container">
        <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === 'success' && <FaCheckCircle className="me-2" />}
              {toastVariant === 'danger' && <FaTimesCircle className="me-2" />}
              {toastVariant === 'warning' && <FaExclamationTriangle className="me-2" />}
              {toastVariant === 'info' && <FaInfoCircle className="me-2" />}
              {toastVariant === 'success' ? 'Sucesso' : toastVariant === 'danger' ? 'Erro' : toastVariant === 'warning' ? 'Aviso' : 'Informação'}
            </strong>
          </Toast.Header>
          <Toast.Body className={toastVariant === 'warning' || toastVariant === 'info' ? 'text-dark' : 'text-white'}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <DependenteSelector
        onSelectDependente={handleSelectDependente}
        selectedId={selectedDependenteId}
      />

      {/* SIDEBAR NAVIGATION */}
      <Row className="g-0">
        <Col xs={12} lg={2} className="dashboard-sidebar">
          <Nav className="flex-column dashboard-nav">
            <Nav.Link
              active={activeSection === 'overview'}
              onClick={() => setActiveSection('overview')}
            >
              <FaTachometerAlt className="me-2" />
              <span>Visão Geral</span>
            </Nav.Link>
            <Nav.Link
              active={activeSection === 'perfil'}
              onClick={() => setActiveSection('perfil')}
            >
              <FaUser className="me-2" />
              <span>Meu Perfil</span>
            </Nav.Link>
            <Nav.Link
              active={activeSection === 'frequencia'}
              onClick={() => setActiveSection('frequencia')}
            >
              <FaChartLine className="me-2" />
              <span>Frequência</span>
            </Nav.Link>
            <Nav.Link
              active={activeSection === 'pagamentos'}
              onClick={() => setActiveSection('pagamentos')}
            >
              <FaDollarSign className="me-2" />
              <span>Pagamentos</span>
            </Nav.Link>
          </Nav>
        </Col>

        <Col xs={12} lg={10} className="dashboard-content">
          <div className="content-wrapper">
            {activeSection === 'overview' && renderOverview()}
            {activeSection === 'perfil' && renderPerfil()}
            {activeSection === 'frequencia' && <StudentAttendance />}
            {activeSection === 'pagamentos' && <StudentPayments />}
          </div>
        </Col>
      </Row>

      {/* MODAL - EDITAR PERFIL */}
      <Modal
        show={showEditModal}
        onHide={handleCancelEdit}
        size="lg"
        fullscreen="md-down"
        centered
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaEdit className="me-2" />
            Editar Perfil
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-3 p-md-4">
          <Form onSubmit={handleSubmit}>
            {/* Dados Pessoais */}
            <div className="form-section mb-4">
              <h5 className="section-title">
                <FaIdCard className="me-2" />
                Dados Pessoais
              </h5>
              <Form.Group className="mb-3">
                <Form.Label>Nome Completo <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  type="text"
                  name="nome_completo"
                  value={formData.nome_completo}
                  onChange={handleInputChange}
                  required
                  autoFocus
                />
              </Form.Group>

              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaBirthdayCake className="me-1" />Data de Nascimento</Form.Label>
                    <Form.Control
                      type="date"
                      name="data_nascimento"
                      value={formData.data_nascimento}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>CPF</Form.Label>
                    <Form.Control
                      type="text"
                      name="cpf"
                      value={formData.cpf}
                      onChange={handleInputChange}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Contato */}
            <div className="form-section mb-4">
              <h5 className="section-title">
                <FaPhone className="me-2" />
                Contato
              </h5>
              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaEnvelope className="me-1" />Email</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaPhone className="me-1" />Telefone</Form.Label>
                    <Form.Control
                      type="text"
                      name="telefone"
                      value={formData.telefone}
                      onChange={handleInputChange}
                      placeholder="(92) 98113-6742"
                      maxLength={15}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Endereço */}
            <div className="form-section mb-4">
              <h5 className="section-title">
                <FaMapMarkerAlt className="me-2" />
                Endereço
              </h5>
              <Row>
                <Col xs={12} md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>CEP</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="cep"
                        value={formData.cep}
                        onChange={handleCEPChange}
                        placeholder="69000-000"
                        maxLength={9}
                      />
                      {loadingCep && (
                        <InputGroup.Text>
                          <Spinner animation="border" size="sm" />
                        </InputGroup.Text>
                      )}
                    </InputGroup>
                    {cepError && <Form.Text className="text-danger">{cepError}</Form.Text>}
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaHome className="me-1" />Endereço</Form.Label>
                    <Form.Control
                      type="text"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nº</Form.Label>
                    <Form.Control
                      type="text"
                      name="numero"
                      value={formData.numero}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Bairro</Form.Label>
                    <Form.Control
                      type="text"
                      name="bairro"
                      value={formData.bairro}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaCity className="me-1" />Cidade</Form.Label>
                    <Form.Control
                      type="text"
                      name="cidade"
                      value={formData.cidade}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={6} md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label>UF</Form.Label>
                    <Form.Control
                      type="text"
                      name="estado"
                      value={formData.estado}
                      onChange={handleInputChange}
                      maxLength={2}
                      placeholder="AM"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Informações Médicas */}
            <div className="form-section mb-4">
              <h5 className="section-title text-danger">
                <FaHeart className="me-2" />
                Informações Médicas
              </h5>
              <Alert variant="danger" className="mb-3 small">
                <FaShieldAlt className="me-2" />
                <strong>Importante:</strong> Essas informações são confidenciais e usadas apenas em emergências.
              </Alert>

              <Row>
                <Col xs={12} md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Tipo Sanguíneo</Form.Label>
                    <Form.Select
                      name="tipo_sanguineo"
                      value={formData.tipo_sanguineo}
                      onChange={handleInputChange}
                    >
                      <option value="">Selecione...</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col xs={12} md={8}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaPills className="me-1" />Alergias</Form.Label>
                    <Form.Control
                      type="text"
                      name="alergias"
                      value={formData.alergias}
                      onChange={handleInputChange}
                      placeholder="Ex: Penicilina, amendoim..."
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaClinicMedical className="me-1" />Condições de Saúde</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="condicoes_saude"
                      value={formData.condicoes_saude}
                      onChange={handleInputChange}
                      placeholder="Ex: Diabetes, Asma..."
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaPills className="me-1" />Medicamentos</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      name="medicamentos_uso"
                      value={formData.medicamentos_uso}
                      onChange={handleInputChange}
                      placeholder="Medicamentos de uso regular..."
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaUserMd className="me-1" />Contato Emergência Médica</Form.Label>
                    <Form.Control
                      type="text"
                      name="contato_emergencia_medica"
                      value={formData.contato_emergencia_medica}
                      onChange={handleInputChange}
                      placeholder="Nome do médico ou hospital"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Telefone Emergência</Form.Label>
                    <Form.Control
                      type="text"
                      name="telefone_emergencia_medica"
                      value={formData.telefone_emergencia_medica}
                      onChange={handleInputChange}
                      placeholder="(92) 98113-6742"
                      maxLength={15}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label><FaShieldAlt className="me-1" />Plano de Saúde</Form.Label>
                    <Form.Control
                      type="text"
                      name="plano_saude"
                      value={formData.plano_saude}
                      onChange={handleInputChange}
                      placeholder="Nome da operadora"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Número do Plano</Form.Label>
                    <Form.Control
                      type="text"
                      name="numero_plano_saude"
                      value={formData.numero_plano_saude}
                      onChange={handleInputChange}
                      placeholder="Número da carteirinha"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Responsável */}
            <div className="form-section mb-4">
              <h5 className="section-title">
                <FaUser className="me-2" />
                Responsável (se menor de idade)
              </h5>
              <Row>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome do Responsável</Form.Label>
                    <Form.Control
                      type="text"
                      name="responsavel_nome"
                      value={formData.responsavel_nome}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Telefone</Form.Label>
                    <Form.Control
                      type="text"
                      name="responsavel_telefone"
                      value={formData.responsavel_telefone}
                      onChange={handleInputChange}
                      placeholder="(92) 98113-6742"
                      maxLength={15}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {hasUnsavedChanges && (
              <Alert variant="warning">
                <FaExclamationTriangle className="me-2" />
                <strong>Alterações não salvas!</strong> Clique em "Salvar" para preservar.
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="sticky-footer">
          <Button variant="secondary" onClick={handleCancelEdit} size="lg">
            <FaTimes className="me-2" />
            Cancelar
          </Button>
          <Button variant="success" onClick={handleSubmit} disabled={saving} size="lg">
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Salvando...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL - ALTERAR SENHA */}
      <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <FaKey className="me-2" />
            Alterar Senha
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form onSubmit={handlePasswordSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Senha Atual</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword.current ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Digite sua senha atual"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={isChangingPassword}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => togglePasswordVisibility('current')}
                  disabled={isChangingPassword}
                  type="button"
                >
                  {showPassword.current ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nova Senha</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword.new ? "text" : "password"}
                  name="newPassword"
                  placeholder="Digite sua nova senha"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  minLength={6}
                  required
                  disabled={isChangingPassword}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => togglePasswordVisibility('new')}
                  disabled={isChangingPassword}
                  type="button"
                >
                  {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">Mínimo de 6 caracteres</Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Confirmar Nova Senha</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword.confirm ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Digite novamente a nova senha"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  minLength={6}
                  required
                  disabled={isChangingPassword}
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => togglePasswordVisibility('confirm')}
                  disabled={isChangingPassword}
                  type="button"
                >
                  {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                </Button>
              </InputGroup>
            </Form.Group>

            <Alert variant="info" className="small">
              <strong>Dica:</strong> Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
            </Alert>

            <Button
              variant="danger"
              type="submit"
              className="w-100"
              size="lg"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Alterando...
                </>
              ) : (
                <>
                  <FaKey className="me-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      {/* MODAL - CONFIRMAÇÃO */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2 text-warning" />
            Descartar Alterações?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Você tem alterações não salvas. Tem certeza que deseja descartar?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Continuar Editando
          </Button>
          <Button variant="danger" onClick={confirmCancelEdit}>
            <FaTimes className="me-1" />
            Descartar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Visualização de Foto */}
      <Modal
        show={showPhotoModal}
        onHide={() => setShowPhotoModal(false)}
        centered
        className="photo-view-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Foto de Perfil</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="expanded-photo-container">
            <Image
              src={profile?.usuario_foto_url || '/images/default-avatar.png'}
              className="expanded-photo"
              alt="Foto de Perfil"
            />
          </div>
        </Modal.Body>
        {isProprioAluno && (
          <Modal.Footer>
            <label htmlFor="photoInputModal" className="btn-change-photo">
              <FaCamera size={18} />
              <span>Alterar Foto</span>
              <input
                id="photoInputModal"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  handlePhotoChange(e);
                  setShowPhotoModal(false);
                }}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </label>
          </Modal.Footer>
        )}
      </Modal>
      </Container>
    </>
  );
};

export default StudentDashboard;
