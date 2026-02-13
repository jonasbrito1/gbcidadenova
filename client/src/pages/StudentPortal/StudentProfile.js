import React, { useState, useEffect } from 'react';
import {
  Container, Card, Form, Button, Alert, Badge, Spinner,
  Image, Modal, InputGroup, Toast, ToastContainer, Collapse, Row, Col
} from 'react-bootstrap';
import {
  FaUser, FaCamera, FaSave, FaTimes, FaMedal, FaEdit,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaKey,
  FaEye, FaEyeSlash, FaPhone, FaMapMarkerAlt, FaHome, FaCity,
  FaEnvelope, FaBirthdayCake, FaIdCard, FaHeart, FaPills, FaClinicMedical,
  FaUserMd, FaShieldAlt, FaInfoCircle, FaCheck, FaChevronDown, FaChevronUp,
  FaCalendar, FaAddressCard, FaFileAlt
} from 'react-icons/fa';
import { studentProfileService, frequenciaNovoService, authService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DependenteSelector from './DependenteSelector';
import './StudentProfile.css';

const StudentProfile = () => {
  const { user, updateUser } = useAuth();
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

  // Cards expansíveis
  const [openSections, setOpenSections] = useState({
    graduacao: true,
    dados: false,
    contato: false,
    endereco: false,
    saude: false,
    responsavel: false,
    justificativas: false
  });

  // Modais
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Justificativas
  const [justificativas, setJustificativas] = useState([]);
  const [justificativaData, setJustificativaData] = useState('');
  const [justificativaMotivo, setJustificativaMotivo] = useState('');
  const [enviandoJustificativa, setEnviandoJustificativa] = useState(false);

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
    loadJustificativas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDependenteId !== null) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDependenteId]);

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

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
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

      const photoUrl = response.data.foto_url;

      setProfile(prev => ({
        ...prev,
        usuario_foto_url: photoUrl
      }));

      if (user) {
        updateUser({
          ...user,
          foto_url: photoUrl
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

      await studentProfileService.updateMyProfile(dataToSend);
      showToastNotification('Perfil atualizado com sucesso!', 'success');
      setShowEditModal(false);
      setHasUnsavedChanges(false);
      await loadProfile();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      setError('Erro ao atualizar perfil: ' + errorMsg);
      showToastNotification('Erro ao atualizar perfil', 'danger');
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

  const loadJustificativas = async () => {
    try {
      const response = await frequenciaNovoService.getMinhasJustificativas();
      setJustificativas(response.data.justificativas || []);
    } catch (err) {
      console.error('Erro ao carregar justificativas:', err);
    }
  };

  const handleJustificarAusencia = async () => {
    if (!justificativaData || !justificativaMotivo.trim()) {
      showToastNotification('Data e motivo são obrigatórios', 'warning');
      return;
    }

    try {
      setEnviandoJustificativa(true);
      setError('');
      await frequenciaNovoService.justificarAusencia({
        data_ausencia: justificativaData,
        motivo: justificativaMotivo
      });
      showToastNotification('Justificativa enviada com sucesso!', 'success');
      setShowJustificativaModal(false);
      setJustificativaData('');
      setJustificativaMotivo('');
      await loadJustificativas();
    } catch (err) {
      showToastNotification('Erro ao enviar justificativa: ' + (err.response?.data?.error || err.message), 'danger');
    } finally {
      setEnviandoJustificativa(false);
    }
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

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pendente': <Badge bg="warning" text="dark">Pendente</Badge>,
      'aprovada': <Badge bg="success">Aprovada</Badge>,
      'rejeitada': <Badge bg="danger">Rejeitada</Badge>
    };
    return badges[status] || <Badge bg="secondary">{status}</Badge>;
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
      <Container className="student-profile-container py-4">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Carregando perfil...</p>
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
      }
    } else {
      setSelectedDependenteId(dependenteId);
      setIsProprioAluno(ehProprioAluno);
    }
  };

  return (
    <Container className="student-profile-container py-3 py-md-4">
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

      {/* HERO SECTION - Sempre Visível */}
      <Card className="hero-card mb-3">
        <Card.Body className="text-center p-3 p-md-4">
          <div className="profile-photo-wrapper">
            <Image
              src={profile?.usuario_foto_url || '/images/default-avatar.png'}
              roundedCircle
              className="profile-photo-large"
              alt="Foto de Perfil"
            />
            {isProprioAluno && (
              <>
                <label htmlFor="photoInput" className="photo-upload-fab">
                  <FaCamera />
                  {uploading && <Spinner animation="border" size="sm" />}
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

          <h3 className="mt-3 mb-2">{profile?.nome_completo}</h3>
          <p className="text-muted mb-3">{profile?.email}</p>

          <div className="d-flex justify-content-center gap-2 flex-wrap mb-3">
            <Badge bg={profile?.status === 'ativo' ? 'success' : 'secondary'} className="badge-lg">
              {profile?.status === 'ativo' ? 'Ativo' : 'Inativo'}
            </Badge>
            {profile?.plano_nome && (
              <Badge bg="info" className="badge-lg">{profile.plano_nome}</Badge>
            )}
            {profile?.programa && (
              <Badge bg="primary" className="badge-lg">{profile.programa}</Badge>
            )}
          </div>

          {isProprioAluno && (
            <div className="d-grid gap-2 d-md-flex justify-content-md-center">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowEditModal(true)}
                className="px-4"
              >
                <FaEdit className="me-2" />
                Editar Perfil
              </Button>
              <Button
                variant="outline-danger"
                size="lg"
                onClick={() => setShowPasswordModal(true)}
                className="px-4"
              >
                <FaKey className="me-2" />
                Alterar Senha
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* GRADUAÇÃO ATUAL - Card Expansível */}
      {profile?.graduacao_atual && (
        <Card className="info-card mb-3">
          <Card.Header
            onClick={() => toggleSection('graduacao')}
            className="card-header-clickable d-flex justify-content-between align-items-center"
          >
            <div>
              <FaMedal className="me-2 text-warning" />
              <strong>Graduação Atual</strong>
            </div>
            {openSections.graduacao ? <FaChevronUp /> : <FaChevronDown />}
          </Card.Header>
          <Collapse in={openSections.graduacao}>
            <Card.Body>
              <div
                className="graduation-badge-large mx-auto"
                style={{
                  backgroundColor: getGraduationColor(profile.graduacao_atual.cor),
                  color: ['branca', 'amarela', 'cinza'].includes(profile.graduacao_atual.cor?.toLowerCase()) ? '#000' : '#FFF',
                  border: profile.graduacao_atual.cor?.toLowerCase() === 'branca' ? '2px solid #ccc' : 'none'
                }}
              >
                {profile.graduacao_atual.nome}
              </div>
              <div className="text-center mt-3 text-muted">
                <FaCalendar className="me-2" />
                Obtida em: {formatDate(profile.graduacao_atual.data_graduacao)}
              </div>

              {profile?.graduacoes_historico && profile.graduacoes_historico.length > 0 && (
                <div className="mt-4">
                  <h6 className="text-muted mb-3">Histórico</h6>
                  {profile.graduacoes_historico.map((grad, idx) => (
                    <div key={idx} className="graduation-history-item d-flex align-items-center mb-2">
                      <div
                        className="graduation-indicator"
                        style={{
                          backgroundColor: getGraduationColor(grad.cor),
                          border: grad.cor?.toLowerCase() === 'branca' ? '2px solid #ccc' : 'none'
                        }}
                      />
                      <div className="flex-grow-1 ms-3">
                        <div><strong>{grad.nome}</strong></div>
                        <small className="text-muted">{formatDate(grad.data_graduacao)}</small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Collapse>
        </Card>
      )}

      {/* JUSTIFICATIVAS - Card com Ação */}
      <Card className="info-card mb-3">
        <Card.Header
          onClick={() => toggleSection('justificativas')}
          className="card-header-clickable d-flex justify-content-between align-items-center"
        >
          <div>
            <FaExclamationTriangle className="me-2 text-warning" />
            <strong>Justificativas de Ausências</strong>
            {justificativas.length > 0 && (
              <Badge bg="secondary" className="ms-2">{justificativas.length}</Badge>
            )}
          </div>
          {openSections.justificativas ? <FaChevronUp /> : <FaChevronDown />}
        </Card.Header>
        <Collapse in={openSections.justificativas}>
          <Card.Body>
            <Button
              variant="warning"
              className="w-100 mb-3"
              onClick={() => setShowJustificativaModal(true)}
            >
              <FaExclamationTriangle className="me-2" />
              Nova Justificativa
            </Button>

            {justificativas.length === 0 ? (
              <Alert variant="info" className="mb-0">
                <FaInfoCircle className="me-2" />
                Nenhuma justificativa enviada
              </Alert>
            ) : (
              <div className="justificativas-list">
                {justificativas.map((just) => (
                  <Card key={just.id} className="mb-2 border">
                    <Card.Body className="p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <strong>{formatDate(just.data_ausencia)}</strong>
                        {getStatusBadge(just.status)}
                      </div>
                      <p className="mb-2 small">{just.motivo}</p>
                      {just.observacoes_analise && (
                        <Alert variant="secondary" className="mb-0 p-2 small">
                          <strong>Observação:</strong> {just.observacoes_analise}
                        </Alert>
                      )}
                      <small className="text-muted">Enviado: {formatDateTime(just.created_at)}</small>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Card.Body>
        </Collapse>
      </Card>

      {/* MODAL - EDITAR PERFIL (Full Screen em Mobile) */}
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
              <Alert variant="danger" className="mb-3">
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

      {/* MODAL - JUSTIFICATIVA */}
      <Modal show={showJustificativaModal} onHide={() => setShowJustificativaModal(false)} centered>
        <Modal.Header closeButton className="bg-warning">
          <Modal.Title>
            <FaExclamationTriangle className="me-2" />
            Justificar Ausência
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Data da Ausência <span className="text-danger">*</span></Form.Label>
              <Form.Control
                type="date"
                value={justificativaData}
                onChange={(e) => setJustificativaData(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Motivo da Ausência <span className="text-danger">*</span></Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                value={justificativaMotivo}
                onChange={(e) => setJustificativaMotivo(e.target.value)}
                placeholder="Descreva o motivo da sua ausência..."
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowJustificativaModal(false)}>
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleJustificarAusencia}
            disabled={enviandoJustificativa}
          >
            {enviandoJustificativa ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enviando...
              </>
            ) : (
              <>
                <FaCheck className="me-1" />
                Enviar
              </>
            )}
          </Button>
        </Modal.Footer>
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
    </Container>
  );
};

export default StudentProfile;
