import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { FaShieldAlt, FaCheckCircle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './LGPDConsent.css';

const LGPDConsent = () => {
  const navigate = useNavigate();
  const { checkAuthStatus } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!accepted) {
      setError('Você deve aceitar os termos para continuar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.acceptLGPD();

      // Atualizar dados do usuário
      await checkAuthStatus();

      // Redirecionar para o dashboard
      navigate('/app/dashboard', { replace: true });

    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao registrar consentimento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lgpd-consent-page">
      <Container>
        <Row className="justify-content-center align-items-center min-vh-100">
          <Col lg={8} md={10}>
            <Card className="shadow-lg border-0">
              <Card.Body className="p-5">
                {/* Logo/Header */}
                <div className="text-center mb-4">
                  <div className="icon-circle mb-3">
                    <FaShieldAlt size={40} />
                  </div>
                  <h3 className="text-gb-red mb-2">Termos de Consentimento LGPD</h3>
                  <p className="text-muted">
                    Gracie Barra Cidade Nova
                  </p>
                </div>

                {error && (
                  <Alert variant="danger" dismissible onClose={() => setError('')}>
                    {error}
                  </Alert>
                )}

                {/* Conteúdo dos Termos */}
                <div className="terms-content p-4 mb-4">
                  <h5 className="text-gb-blue mb-3">Política de Privacidade e Proteção de Dados</h5>

                  <p className="text-justify">
                    A <strong>Gracie Barra Cidade Nova</strong> está comprometida com a proteção dos seus dados pessoais
                    e com a sua privacidade, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                  </p>

                  <h6 className="text-gb-red mt-4 mb-2">1. Coleta de Dados</h6>
                  <p className="text-justify">
                    Coletamos as seguintes informações pessoais:
                  </p>
                  <ul className="mb-3">
                    <li>Dados pessoais (nome, email, telefone, data de nascimento)</li>
                    <li>Endereço completo</li>
                    <li>Informações acadêmicas (modalidade, graduação)</li>
                    <li>Dados de contato de emergência</li>
                    <li>Informações médicas relevantes (tipo sanguíneo, alergias, medicamentos, fraturas)</li>
                    <li>Dados de responsável legal (para menores de 18 anos)</li>
                  </ul>

                  <h6 className="text-gb-red mt-4 mb-2">2. Finalidade do Uso</h6>
                  <p className="text-justify">
                    Seus dados serão utilizados para:
                  </p>
                  <ul className="mb-3">
                    <li>Gestão acadêmica e administrativa do aluno</li>
                    <li>Comunicação sobre aulas, eventos e atividades</li>
                    <li>Atendimento em situações de emergência</li>
                    <li>Controle financeiro e de pagamentos</li>
                    <li>Cumprimento de obrigações legais</li>
                  </ul>

                  <h6 className="text-gb-red mt-4 mb-2">3. Compartilhamento de Dados</h6>
                  <p className="text-justify">
                    Seus dados não serão compartilhados com terceiros, exceto:
                  </p>
                  <ul className="mb-3">
                    <li>Quando necessário para prestação de serviços contratados</li>
                    <li>Em caso de emergência médica (com profissionais de saúde)</li>
                    <li>Quando exigido por lei ou autoridade competente</li>
                  </ul>

                  <h6 className="text-gb-red mt-4 mb-2">4. Segurança dos Dados</h6>
                  <p className="text-justify">
                    Adotamos medidas técnicas e organizacionais para proteger seus dados contra acessos não autorizados,
                    incluindo:
                  </p>
                  <ul className="mb-3">
                    <li>Criptografia de senhas</li>
                    <li>Controle de acesso restrito</li>
                    <li>Backups regulares</li>
                    <li>Servidores seguros</li>
                  </ul>

                  <h6 className="text-gb-red mt-4 mb-2">5. Seus Direitos</h6>
                  <p className="text-justify">
                    Você tem direito a:
                  </p>
                  <ul className="mb-3">
                    <li>Confirmar a existência de tratamento de dados</li>
                    <li>Acessar seus dados</li>
                    <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
                    <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
                    <li>Revogar o consentimento a qualquer momento</li>
                  </ul>

                  <h6 className="text-gb-red mt-4 mb-2">6. Retenção de Dados</h6>
                  <p className="text-justify">
                    Seus dados serão mantidos pelo período necessário para cumprimento das finalidades descritas,
                    ou conforme exigido por lei.
                  </p>

                  <h6 className="text-gb-red mt-4 mb-2">7. Contato</h6>
                  <p className="text-justify mb-0">
                    Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus dados pessoais,
                    entre em contato através do email: <strong>contato@gbcidadenovaam.com.br</strong>
                  </p>
                </div>

                {/* Checkbox de Aceite */}
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    id="lgpd-accept"
                    checked={accepted}
                    onChange={(e) => setAccepted(e.target.checked)}
                    label={
                      <span>
                        Declaro que li e concordo com os termos da{' '}
                        <strong>Política de Privacidade e Proteção de Dados</strong>, e autorizo o tratamento
                        dos meus dados pessoais pela Gracie Barra Cidade Nova, conforme descrito acima.
                      </span>
                    }
                  />
                </Form.Group>

                <Alert variant="warning" className="small">
                  <strong>Importante:</strong> Ao aceitar, você estará dando seu consentimento expresso
                  para o tratamento dos seus dados pessoais. Seu IP e data/hora de aceite serão registrados
                  para fins de comprovação legal.
                </Alert>

                <div className="d-grid gap-2">
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={handleAccept}
                    disabled={!accepted || loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Registrando consentimento...
                      </>
                    ) : (
                      <>
                        <FaCheckCircle className="me-2" />
                        Aceitar e Continuar para o Sistema
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    Você não pode acessar o sistema sem aceitar estes termos
                  </small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default LGPDConsent;
