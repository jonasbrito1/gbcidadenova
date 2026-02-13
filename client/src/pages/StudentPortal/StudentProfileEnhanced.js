import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Form, Button, Alert, Badge, Spinner,
  Image, Modal, Accordion, InputGroup, Toast, ToastContainer
} from 'react-bootstrap';
import {
  FaUser, FaCamera, FaSave, FaTimes, FaMedal, FaCalendar, FaEdit,
  FaExclamationTriangle, FaCheckCircle, FaTimesCircle, FaClock, FaKey,
  FaEye, FaEyeSlash, FaPhone, FaMapMarkerAlt, FaHome, FaCity,
  FaEnvelope, FaBirthdayCake, FaIdCard, FaHeart, FaPills, FaClinicMedical,
  FaUserMd, FaShieldAlt, FaInfoCircle, FaCheck
} from 'react-icons/fa';
import { studentProfileService, frequenciaNovoService, authService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DependenteSelector from './DependenteSelector';
import './StudentProfile.css';

const StudentProfileEnhanced = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estados para seleção de dependente
  const [selectedDependenteId, setSelectedDependenteId] = useState(null);
  const [isProprioAluno, setIsProprioAluno] = useState(true);

  // Estados para justificativas
  const [justificativas, setJustificativas] = useState([]);
  const [showJustificativaModal, setShowJustificativaModal] = useState(false);
  const [justificativaData, setJustificativaData] = useState('');
  const [justificativaMotivo, setJustificativaMotivo] = useState('');
  const [enviandoJustificativa, setEnviandoJustificativa] = useState(false);

  // Estados para alteração de senha
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

  // Estados para busca de CEP
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  // Estados para Toast notifications
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Estados para modal de confirmação
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Carregamento inicial
  useEffect(() => {
    loadProfile();
    loadJustificativas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarregar ao trocar de dependente
  useEffect(() => {
    if (selectedDependenteId !== null) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDependenteId]);

  // Aviso ao sair com mudanças não salvas
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
        // Dados Pessoais
        nome_completo: response.data.nome_completo || response.data.nome || '',
        data_nascimento: response.data.data_nascimento?.split('T')[0] || '',
        cpf: response.data.cpf || '',
        rg: response.data.rg || '',

        // Contato
        email: response.data.email || '',
        telefone: response.data.telefone || '',
        telefone_emergencia: response.data.telefone_emergencia || '',

        // Endereço
        endereco: response.data.endereco || '',
        numero: response.data.numero || '',
        complemento: response.data.complemento || '',
        bairro: response.data.bairro || '',
        cidade: response.data.cidade || '',
        estado: response.data.estado || '',
        cep: response.data.cep || '',

        // Responsável
        responsavel_nome: response.data.responsavel_nome || '',
        responsavel_telefone: response.data.responsavel_telefone || '',
        responsavel_parentesco: response.data.responsavel_parentesco || '',

        // Informações Médicas
        tipo_sanguineo: response.data.tipo_sanguineo || '',
        alergias: response.data.alergias || '',
        condicoes_saude: response.data.condicoes_saude || '',
        medicamentos_uso: response.data.medicamentos_uso || '',
        contato_emergencia_medica: response.data.contato_emergencia_medica || '',
        telefone_emergencia_medica: response.data.telefone_emergencia_medica || '',
        plano_saude: response.data.plano_saude || '',
        numero_plano_saude: response.data.numero_plano_saude || '',

        // Outros
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

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToastNotification('A foto deve ter no máximo 5MB', 'danger');
      return;
    }

    // Validar tipo
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

    // Aplicar máscaras
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

      // Remover máscaras antes de enviar
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
      setEditMode(false);
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
      setEditMode(false);
      loadProfile();
    }
  };

  const confirmCancelEdit = () => {
    setShowConfirmModal(false);
    setEditMode(false);
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

  const getGraduacaoColor = (cor) => {
    const colorMap = {
      'Branca': '#FFFFFF',
      'Cinza': '#808080',
      'Amarela': '#FFD700',
      'Laranja': '#FF8C00',
      'Verde': '#32CD32',
      'Azul': '#1E90FF',
      'Roxa': '#8B008B',
      'Marrom': '#8B4513',
      'Preta': '#000000'
    };
    return colorMap[cor] || '#CCCCCC';
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pendente':
        return <Badge bg="warning" text="dark"><FaClock className="me-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge bg="success"><FaCheckCircle className="me-1" />Aprovado</Badge>;
      case 'rejeitado':
        return <Badge bg="danger"><FaTimesCircle className="me-1" />Rejeitado</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  if (loading && !profile) {
    return (
      <Container className="student-profile-container">
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
        setEditMode(false);
        setHasUnsavedChanges(false);
      }
    } else {
      setSelectedDependenteId(dependenteId);
      setIsProprioAluno(ehProprioAluno);
      setEditMode(false);
    }
  };

  return (
    <Container className="student-profile-container py-4">
      {/* Toast Notifications */}
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

      <div className="page-header mb-4">
        <h2><FaUser className="me-2" /> {isProprioAluno ? 'Meu Perfil' : 'Perfil do Dependente'}</h2>
        <p className="text-muted">
          {isProprioAluno ? 'Gerencie suas informações pessoais e médicas' : 'Visualize as informações do dependente'}
        </p>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      {/* Seletor de Dependentes */}
      <DependenteSelector
        onSelectDependente={handleSelectDependente}
        selectedId={selectedDependenteId}
      />

      <Row>
        {/* Coluna da esquerda - Foto e Informações Básicas */}
        <Col xs={12} md={12} lg={4} className="mb-4">
          <Card className="profile-card">
            <Card.Body className="text-center">
              {/* Foto de Perfil */}
              <div className="profile-photo-container position-relative mb-3">
                <Image
                  src={profile?.usuario_foto_url || '/images/default-avatar.png'}
                  roundedCircle
                  className="profile-photo"
                  alt="Foto de Perfil"
                />
                {isProprioAluno && (
                  <>
                    <label htmlFor="photoInput" className="photo-upload-btn">
                      <FaCamera />
                      {uploading && <Spinner animation="border" size="sm" className="ms-2" />}
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

              <h4 className="mb-1">{profile?.nome_completo}</h4>
              <p className="text-muted mb-3">{profile?.email}</p>

              {/* Status e Plano */}
              <div className="info-badges mb-3">
                <Badge bg={profile?.status === 'ativo' ? 'success' : 'secondary'} className="me-2">
                  {profile?.status?.toUpperCase()}
                </Badge>
                {profile?.plano_nome && (
                  <Badge bg="info">{profile.plano_nome}</Badge>
                )}
              </div>

              {/* Graduação Atual */}
              {profile?.graduacao_atual && (
                <div className="current-graduation mb-3">
                  <h6 className="text-muted mb-2">Graduação Atual</h6>
                  <div className="graduation-display" style={{
                    backgroundColor: getGraduacaoColor(profile.graduacao_atual),
                    border: profile.graduacao_atual === 'Branca' ? '2px solid #ddd' : 'none'
                  }}>
                    <span style={{
                      color: ['Branca', 'Amarela', 'Cinza'].includes(profile.graduacao_atual) ? '#000' : '#fff',
                      fontWeight: 'bold',
                      textShadow: ['Branca', 'Amarela'].includes(profile.graduacao_atual) ? 'none' : '0 1px 2px rgba(0,0,0,0.5)'
                    }}>
                      {profile.graduacao_atual}
                    </span>
                  </div>
                  <small className="text-muted d-block mt-1">
                    Apenas professores podem alterar graduações
                  </small>
                </div>
              )}

              {/* Programa */}
              {profile?.programa && (
                <div className="mb-3">
                  <h6 className="text-muted mb-1">Programa</h6>
                  <Badge bg="primary" className="px-3 py-2">
                    {profile.programa === 'GBK' ? 'Gracie Barra Kids' : profile.programa}
                  </Badge>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Histórico de Graduações */}
          {profile?.graduacoes && profile.graduacoes.length > 0 && (
            <Card className="mt-3">
              <Card.Header>
                <h6 className="mb-0"><FaMedal className="me-2" /> Histórico de Graduações</h6>
              </Card.Header>
              <Card.Body>
                {profile.graduacoes.map((grad, index) => (
                  <div key={index} className="graduation-history-item mb-2">
                    <div className="d-flex align-items-center">
                      <div
                        className="graduation-color-indicator me-2"
                        style={{ backgroundColor: getGraduacaoColor(grad.graduacao_cor) }}
                      />
                      <div className="flex-grow-1">
                        <strong>{grad.graduacao_nome}</strong>
                        <div className="text-muted small">
                          <FaCalendar className="me-1" />
                          {formatDate(grad.data_graduacao)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Card.Body>
            </Card>
          )}

          {/* Justificativas de Ausências */}
          <Card className="mt-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0"><FaExclamationTriangle className="me-2" /> Justificativas</h6>
              <Button
                variant="warning"
                size="sm"
                onClick={() => setShowJustificativaModal(true)}
              >
                <FaExclamationTriangle className="me-1" />
                Nova
              </Button>
            </Card.Header>
            <Card.Body>
              {justificativas.length === 0 ? (
                <p className="text-muted text-center mb-0">Nenhuma justificativa enviada</p>
              ) : (
                <div className="justificativas-list">
                  {justificativas.slice(0, 5).map((just) => (
                    <div key={just.id} className="justificativa-item mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <strong>Data:</strong> {formatDate(just.data_ausencia)}
                        </div>
                        {getStatusBadge(just.status)}
                      </div>
                      <div className="mb-2">
                        <strong>Motivo:</strong>
                        <p className="mb-0 mt-1 text-muted small">
                          {just.motivo.length > 100 ? just.motivo.substring(0, 100) + '...' : just.motivo}
                        </p>
                      </div>
                      {just.observacoes_analise && (
                        <div className="mt-2 p-2 bg-light rounded">
                          <strong className="small">Observação:</strong>
                          <p className="mb-0 small text-muted">{just.observacoes_analise}</p>
                        </div>
                      )}
                      <div className="mt-2">
                        <small className="text-muted">
                          Enviado em: {formatDateTime(just.created_at)}
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Alterar Senha */}
          {isProprioAluno && (
            <Card className="mt-3">
              <Card.Header>
                <h6 className="mb-0">
                  <FaKey className="me-2 text-danger" />
                  Alterar Senha
                </h6>
              </Card.Header>
              <Card.Body>
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
                    <Form.Text className="text-muted">
                      Mínimo de 6 caracteres
                    </Form.Text>
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

                  <div className="alert alert-info small">
                    <strong>Dica de Segurança:</strong> Use uma senha forte que combine letras maiúsculas,
                    minúsculas, números e caracteres especiais.
                  </div>

                  <Button
                    variant="danger"
                    type="submit"
                    className="w-100"
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
              </Card.Body>
            </Card>
          )}
        </Col>

        {/* Coluna da direita - Formulário de Dados */}
        <Col xs={12} md={12} lg={8}>
          <Card className="profile-form-card">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <FaEdit className="me-2" />
                Informações Pessoais
              </h5>
              {isProprioAluno && (
                <>
                  {!editMode ? (
                    <Button variant="primary" size="sm" onClick={() => setEditMode(true)}>
                      <FaEdit className="me-1" /> Editar
                    </Button>
                  ) : (
                    <div className="d-flex gap-2">
                      <Button variant="success" size="sm" onClick={handleSubmit} disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <FaSave className="me-1" /> Salvar
                          </>
                        )}
                      </Button>
                      <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                        <FaTimes className="me-1" /> Cancelar
                      </Button>
                    </div>
                  )}
                </>
              )}
              {!isProprioAluno && (
                <Badge bg="info">Somente Visualização</Badge>
              )}
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                {/* Dados Pessoais */}
                <div className="mb-4">
                  <h6 className="section-title">
                    <FaIdCard className="me-2" />
                    Dados Pessoais
                  </h6>
                  <Row>
                    <Col xs={12} md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nome Completo <span className="text-danger">*</span></Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaUser /></InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="nome_completo"
                            value={formData.nome_completo}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            required
                            placeholder="Digite seu nome completo"
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12} sm={6} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Data de Nascimento</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaBirthdayCake /></InputGroup.Text>
                          <Form.Control
                            type="date"
                            name="data_nascimento"
                            value={formData.data_nascimento}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            max={new Date().toISOString().split('T')[0]}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>CPF</Form.Label>
                        <Form.Control
                          type="text"
                          name="cpf"
                          value={formData.cpf}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>RG</Form.Label>
                        <Form.Control
                          type="text"
                          name="rg"
                          value={formData.rg}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="00.000.000-0"
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Contato */}
                <div className="mb-4">
                  <h6 className="section-title">
                    <FaPhone className="me-2" />
                    Contato
                  </h6>
                  <Row>
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                          <Form.Control
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            placeholder="seu@email.com"
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Telefone</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaPhone /></InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            placeholder="(92) 98113-6742"
                            maxLength={15}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Telefone de Emergência</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaPhone /></InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="telefone_emergencia"
                            value={formData.telefone_emergencia}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            placeholder="(92) 98113-6742"
                            maxLength={15}
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Endereço */}
                <div className="mb-4">
                  <h6 className="section-title">
                    <FaMapMarkerAlt className="me-2" />
                    Endereço
                  </h6>
                  <Row>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>CEP</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            name="cep"
                            value={formData.cep}
                            onChange={handleCEPChange}
                            disabled={!editMode}
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
                        <Form.Text className="text-muted">Preenche endereço automaticamente</Form.Text>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={7}>
                      <Form.Group className="mb-3">
                        <Form.Label>Endereço</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaHome /></InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            placeholder="Rua, Avenida, Travessa..."
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Número</Form.Label>
                        <Form.Control
                          type="text"
                          name="numero"
                          value={formData.numero}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="123"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Complemento</Form.Label>
                        <Form.Control
                          type="text"
                          name="complemento"
                          value={formData.complemento}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="Apto, Bloco, Casa..."
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Bairro</Form.Label>
                        <Form.Control
                          type="text"
                          name="bairro"
                          value={formData.bairro}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="Nome do bairro"
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Cidade</Form.Label>
                        <InputGroup>
                          <InputGroup.Text><FaCity /></InputGroup.Text>
                          <Form.Control
                            type="text"
                            name="cidade"
                            value={formData.cidade}
                            onChange={handleInputChange}
                            disabled={!editMode}
                            placeholder="Cidade"
                          />
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col xs={6} sm={6} md={2}>
                      <Form.Group className="mb-3">
                        <Form.Label>Estado</Form.Label>
                        <Form.Control
                          type="text"
                          name="estado"
                          value={formData.estado}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          maxLength={2}
                          placeholder="AM"
                          style={{ textTransform: 'uppercase' }}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Informações Médicas (Accordion) */}
                <div className="mb-4">
                  <Accordion defaultActiveKey="0">
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>
                        <FaHeart className="me-2 text-danger" />
                        <strong>Informações Médicas</strong>
                        <Badge bg="danger" className="ms-2">Importante</Badge>
                      </Accordion.Header>
                      <Accordion.Body>
                        <Row>
                          <Col xs={12} sm={6} md={3}>
                            <Form.Group className="mb-3">
                              <Form.Label>Tipo Sanguíneo</Form.Label>
                              <Form.Select
                                name="tipo_sanguineo"
                                value={formData.tipo_sanguineo}
                                onChange={handleInputChange}
                                disabled={!editMode}
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
                          <Col xs={12} sm={6} md={9}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaPills className="me-1" />
                                Alergias
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="alergias"
                                value={formData.alergias}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                placeholder="Ex: Penicilina, amendoim, frutos do mar..."
                              />
                              <Form.Text className="text-muted">
                                Liste todas as alergias conhecidas (medicamentos, alimentos, etc.)
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col xs={12} md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaClinicMedical className="me-1" />
                                Condições de Saúde
                              </Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                name="condicoes_saude"
                                value={formData.condicoes_saude}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                placeholder="Ex: Diabetes, Asma, Epilepsia, Problemas cardíacos..."
                              />
                              <Form.Text className="text-muted">
                                Informe condições de saúde relevantes
                              </Form.Text>
                            </Form.Group>
                          </Col>
                          <Col xs={12} md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaPills className="me-1" />
                                Medicamentos em Uso
                              </Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                name="medicamentos_uso"
                                value={formData.medicamentos_uso}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                placeholder="Liste os medicamentos de uso contínuo..."
                              />
                              <Form.Text className="text-muted">
                                Medicamentos de uso regular
                              </Form.Text>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col xs={12} sm={6} md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaUserMd className="me-1" />
                                Contato Médico de Emergência
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="contato_emergencia_medica"
                                value={formData.contato_emergencia_medica}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                placeholder="Nome do médico ou hospital"
                              />
                            </Form.Group>
                          </Col>
                          <Col xs={12} sm={6} md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Telefone do Contato Médico</Form.Label>
                              <InputGroup>
                                <InputGroup.Text><FaPhone /></InputGroup.Text>
                                <Form.Control
                                  type="text"
                                  name="telefone_emergencia_medica"
                                  value={formData.telefone_emergencia_medica}
                                  onChange={handleInputChange}
                                  disabled={!editMode}
                                  placeholder="(92) 98113-6742"
                                  maxLength={15}
                                />
                              </InputGroup>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col xs={12} sm={6} md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>
                                <FaShieldAlt className="me-1" />
                                Plano de Saúde
                              </Form.Label>
                              <Form.Control
                                type="text"
                                name="plano_saude"
                                value={formData.plano_saude}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                placeholder="Nome da operadora"
                              />
                            </Form.Group>
                          </Col>
                          <Col xs={12} sm={6} md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Número do Plano</Form.Label>
                              <Form.Control
                                type="text"
                                name="numero_plano_saude"
                                value={formData.numero_plano_saude}
                                onChange={handleInputChange}
                                disabled={!editMode}
                                placeholder="Número da carteirinha"
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Alert variant="info" className="mt-2 mb-0">
                          <FaInfoCircle className="me-2" />
                          <strong>Privacidade:</strong> Suas informações médicas são confidenciais e utilizadas apenas em caso de emergência.
                        </Alert>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </div>

                {/* Responsável (se menor de idade) */}
                <div className="mb-4">
                  <h6 className="section-title">
                    <FaUser className="me-2" />
                    Responsável (se menor de idade)
                  </h6>
                  <Row>
                    <Col xs={12} sm={6} md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nome do Responsável</Form.Label>
                        <Form.Control
                          type="text"
                          name="responsavel_nome"
                          value={formData.responsavel_nome}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="Nome completo do responsável"
                        />
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Parentesco</Form.Label>
                        <Form.Select
                          name="responsavel_parentesco"
                          value={formData.responsavel_parentesco}
                          onChange={handleInputChange}
                          disabled={!editMode}
                        >
                          <option value="">Selecione...</option>
                          <option value="pai">Pai</option>
                          <option value="mae">Mãe</option>
                          <option value="avo">Avô/Avó</option>
                          <option value="tio">Tio/Tia</option>
                          <option value="tutor">Tutor Legal</option>
                          <option value="outro">Outro</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col xs={12} sm={6} md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Telefone do Responsável</Form.Label>
                        <Form.Control
                          type="text"
                          name="responsavel_telefone"
                          value={formData.responsavel_telefone}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          placeholder="(92) 98113-6742"
                          maxLength={15}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                </div>

                {/* Objetivo/Observações */}
                <div className="mb-3">
                  <h6 className="section-title">
                    <FaInfoCircle className="me-2" />
                    Objetivo/Observações
                  </h6>
                  <Form.Group className="mb-3">
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="objetivo"
                      value={formData.objetivo}
                      onChange={handleInputChange}
                      disabled={!editMode}
                      placeholder="Seus objetivos com o Jiu-Jitsu, observações adicionais..."
                    />
                  </Form.Group>
                </div>

                {/* Aviso de mudanças não salvas */}
                {hasUnsavedChanges && editMode && (
                  <Alert variant="warning" className="mt-3">
                    <FaExclamationTriangle className="me-2" />
                    <strong>Você tem alterações não salvas!</strong> Não esqueça de clicar em "Salvar" para preservar suas alterações.
                  </Alert>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Justificativa */}
      <Modal
        show={showJustificativaModal}
        onHide={() => {
          setShowJustificativaModal(false);
          setJustificativaData('');
          setJustificativaMotivo('');
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2" />
            Justificar Ausência
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
              <Form.Text className="text-muted">
                Selecione a data da aula que você faltou
              </Form.Text>
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
              <Form.Text className="text-muted">
                Seja claro e objetivo. A justificativa será analisada por um professor ou administrador.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowJustificativaModal(false);
              setJustificativaData('');
              setJustificativaMotivo('');
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="warning"
            onClick={handleJustificarAusencia}
            disabled={enviandoJustificativa || !justificativaData || !justificativaMotivo.trim()}
          >
            {enviandoJustificativa ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Enviando...
              </>
            ) : (
              <>
                <FaCheck className="me-1" />
                Enviar Justificativa
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de Confirmação (Cancelar Edição) */}
      <Modal
        show={showConfirmModal}
        onHide={() => setShowConfirmModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="me-2 text-warning" />
            Descartar Alterações?
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Você tem alterações não salvas. Tem certeza que deseja descartar essas alterações?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Continuar Editando
          </Button>
          <Button variant="danger" onClick={confirmCancelEdit}>
            <FaTimes className="me-1" />
            Descartar Alterações
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default StudentProfileEnhanced;
