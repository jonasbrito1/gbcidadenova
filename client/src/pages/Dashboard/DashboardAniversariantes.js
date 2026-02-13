import React, { useState } from 'react';
import { Card, Badge, Form, Button, Modal, Table } from 'react-bootstrap';
import { useQuery, useQueryClient } from 'react-query';
import { FaBirthdayCake, FaWhatsapp, FaEnvelope, FaCalendarAlt, FaCheckCircle } from 'react-icons/fa';
import { dashboardService } from '../../services/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const DashboardAniversariantes = () => {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState('mes');
  const [mesEspecifico, setMesEspecifico] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Buscar aniversariantes
  const { data, isLoading } = useQuery(
    ['aniversariantes', filtro, mesEspecifico],
    () => {
      const params = { filtro };

      // Se filtro for mes_especifico E um mês foi selecionado, enviar o mês
      if (filtro === 'mes_especifico' && mesEspecifico) {
        params.mes = mesEspecifico;
      }

      console.log('[DashboardAniversariantes] Fazendo requisição com params:', params);
      return dashboardService.getAniversariantes(params);
    },
    {
      enabled: filtro !== 'mes_especifico' || (filtro === 'mes_especifico' && mesEspecifico !== ''), // Só busca se: não for mes_especifico OU se for mes_especifico e um mês foi selecionado
      refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
      onSuccess: (response) => {
        console.log('[DashboardAniversariantes] Dados recebidos:', response);
        console.log('[DashboardAniversariantes] Total de aniversariantes:', response?.data?.aniversariantes?.length || 0);
      },
      onError: (err) => {
        console.error('[DashboardAniversariantes] Erro ao buscar:', err);
      }
    }
  );

  const aniversariantes = data?.data?.aniversariantes || [];

  console.log('[DashboardAniversariantes] Filtro:', filtro, 'Mês:', mesEspecifico, 'Total:', aniversariantes.length);

  const handleWhatsApp = (telefone, nome) => {
    if (!telefone) {
      alert('Telefone não cadastrado para este aluno.');
      return;
    }

    // Remover caracteres especiais do telefone
    const telefoneFormatado = telefone.replace(/\D/g, '');

    // Mensagem padrão de felicitações
    const mensagem = encodeURIComponent(
      `Olá, ${nome}! A equipe da Gracie Barra Cidade Nova deseja um FELIZ ANIVERSÁRIO! Que este novo ano seja repleto de conquistas, saúde e muito Jiu-Jitsu! Seguimos juntos nessa jornada! OSS!`
    );

    // Abrir WhatsApp Web ou App
    window.open(`https://wa.me/55${telefoneFormatado}?text=${mensagem}`, '_blank');
  };

  const handleEmail = async (aluno) => {
    if (!aluno.email) {
      alert('Email não cadastrado para este aluno.');
      return;
    }

    try {
      // Confirmação antes de enviar
      const confirmar = window.confirm(
        `Deseja enviar email de aniversário para ${aluno.nome}?\n\nDestinatário: ${aluno.email}`
      );

      if (!confirmar) {
        return;
      }

      // Enviar email através da API
      const response = await dashboardService.enviarEmailAniversario({
        alunoId: aluno.id,
        nome: aluno.nome,
        email: aluno.email
      });

      if (response.data.success) {
        alert(`Email enviado com sucesso para ${aluno.nome}!`);
        // Atualizar lista de aniversariantes
        queryClient.invalidateQueries(['aniversariantes', filtro, mesEspecifico]);
      } else {
        alert(`Erro ao enviar email: ${response.data.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      alert(`Erro ao enviar email: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleValidar = async (aluno) => {
    try {
      // Confirmação antes de validar
      const confirmar = window.confirm(
        `Confirmar que a mensagem de aniversário foi enviada para ${aluno.nome}?\n\nIsso marcará a mensagem como enviada e evitará novos envios neste ano.`
      );

      if (!confirmar) {
        return;
      }

      // Validar mensagem através da API
      const response = await dashboardService.validarMensagemAniversario({
        alunoId: aluno.id,
        tipo: 'manual'
      });

      if (response.data.success) {
        alert(`Mensagem validada com sucesso para ${aluno.nome}!`);
        // Atualizar lista de aniversariantes
        queryClient.invalidateQueries(['aniversariantes', filtro, mesEspecifico]);
      } else {
        alert(`Erro ao validar mensagem: ${response.data.message || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao validar mensagem:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido';
      alert(`Erro ao validar mensagem: ${errorMessage}`);
    }
  };

  const formatarData = (dataNascimento) => {
    if (!dataNascimento) return '-';
    // Parse da data do MySQL (YYYY-MM-DD) para evitar problemas de timezone
    const partes = dataNascimento.split('T')[0].split('-');
    const dia = String(partes[2]).padStart(2, '0');
    const mes = String(partes[1]).padStart(2, '0');
    return `${dia}/${mes}`;
  };

  const formatarDataCompleta = (dataNascimento) => {
    if (!dataNascimento) return '-';
    // Parse da data do MySQL (YYYY-MM-DD) para evitar problemas de timezone
    const partes = dataNascimento.split('T')[0].split('-');
    const dia = String(partes[2]).padStart(2, '0');
    const mes = String(partes[1]).padStart(2, '0');
    const ano = partes[0];
    return `${dia}/${mes}/${ano}`;
  };

  const getDiasTexto = (dias) => {
    if (dias === 0) return 'Hoje!';
    if (dias === 1) return 'Amanhã';
    return `Em ${dias} dias`;
  };

  const meses = [
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  if (isLoading) {
    return <LoadingSpinner size="sm" text="Carregando aniversariantes..." />;
  }

  return (
    <>
      <Card className="card-dashboard-gb shadow-lg hover-lift h-100" style={{
        borderTop: '4px solid #0066cc',
        boxShadow: '0 4px 20px rgba(0, 102, 204, 0.2)'
      }}>
        <Card.Body className="d-flex flex-column">
          <Card.Title className="gb-heading d-flex justify-content-between align-items-center pb-2 mb-3" style={{
            borderBottom: '2px solid #0066cc',
            color: '#0066cc'
          }}>
            <span className="d-flex align-items-center">
              <FaBirthdayCake className="me-2" style={{ fontSize: '1.3rem' }} />
              <span style={{ fontWeight: 'bold' }}>Aniversariantes</span>
            </span>
            <Badge bg="primary" style={{
              fontSize: '0.9rem',
              padding: '0.4rem 0.6rem'
            }}>{aniversariantes.length}</Badge>
          </Card.Title>

              {/* Filtros */}
              <Form.Group className="mb-3">
                <Form.Select
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="form-control-gb"
                  size="sm"
                >
                  <option value="hoje">Hoje</option>
                  <option value="semana">Esta Semana</option>
                  <option value="mes">Este Mês</option>
                  <option value="mes_especifico">Mês Específico</option>
                </Form.Select>
              </Form.Group>

              {filtro === 'mes_especifico' && (
                <Form.Group className="mb-3">
                  <Form.Select
                    value={mesEspecifico}
                    onChange={(e) => setMesEspecifico(e.target.value)}
                    className="form-control-gb"
                    size="sm"
                  >
                    <option value="">Selecione o mês...</option>
                    {meses.map(mes => (
                      <option key={mes.value} value={mes.value}>{mes.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}

              {/* Lista de Aniversariantes */}
              <div className="flex-grow-1 d-flex flex-column">
                {aniversariantes.length > 0 ? (
                  <>
                    <div style={{ maxHeight: '280px', overflowY: 'auto' }} className="custom-scrollbar-gb mb-2 flex-grow-1">
                      {aniversariantes.slice(0, 3).map((aniversariante, index) => {
                        const isHoje = aniversariante.dias_ate_aniversario === 0;
                        return (
                          <div
                            key={index}
                            className="p-3 mb-2 rounded shadow-sm"
                            style={{
                              borderLeft: `5px solid ${isHoje ? '#28a745' : '#0066cc'}`,
                              background: isHoje
                                ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
                                : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                              transition: 'transform 0.2s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(5px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <strong className="text-dark" style={{ fontSize: '0.95rem' }}>
                                {isHoje && <span style={{ fontSize: '1.2rem' }}>🎉 </span>}
                                {aniversariante.nome}
                              </strong>
                            </div>
                            <div className="d-flex align-items-center mb-2">
                              <FaCalendarAlt className="me-2" style={{ color: '#0066cc', fontSize: '12px' }} />
                              <small className="text-dark">
                                {formatarData(aniversariante.data_nascimento)} • {aniversariante.idade_atual} anos
                              </small>
                            </div>
                            <div className="d-flex justify-content-between align-items-center">
                              <Badge
                                bg={isHoje ? 'success' : 'primary'}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.3rem 0.5rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {getDiasTexto(aniversariante.dias_ate_aniversario)}
                              </Badge>
                              <div>
                                {/* Botão WhatsApp */}
                                <Button
                                  variant={aniversariante.whatsapp_enviado_ano_atual ? 'secondary' : 'success'}
                                  size="sm"
                                  className="me-1"
                                  onClick={() => handleWhatsApp(aniversariante.telefone, aniversariante.nome)}
                                  disabled={aniversariante.whatsapp_enviado_ano_atual === 1}
                                  title={aniversariante.whatsapp_enviado_ano_atual
                                    ? 'Mensagem já enviada este ano'
                                    : 'Enviar WhatsApp'}
                                  style={{
                                    fontSize: '13px',
                                    padding: '4px 8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    opacity: aniversariante.whatsapp_enviado_ano_atual ? 0.6 : 1,
                                    cursor: aniversariante.whatsapp_enviado_ano_atual ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <FaWhatsapp /> {aniversariante.whatsapp_enviado_ano_atual ? ' ✓' : ''}
                                </Button>

                                {/* Botão Email */}
                                <Button
                                  variant={aniversariante.email_enviado_ano_atual ? 'secondary' : 'primary'}
                                  size="sm"
                                  className="me-1"
                                  onClick={() => handleEmail(aniversariante)}
                                  disabled={aniversariante.email_enviado_ano_atual === 1}
                                  title={aniversariante.email_enviado_ano_atual
                                    ? 'Email já enviado este ano'
                                    : 'Enviar Email'}
                                  style={{
                                    fontSize: '13px',
                                    padding: '4px 8px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                    opacity: aniversariante.email_enviado_ano_atual ? 0.6 : 1,
                                    cursor: aniversariante.email_enviado_ano_atual ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <FaEnvelope /> {aniversariante.email_enviado_ano_atual ? ' ✓' : ''}
                                </Button>

                                {/* Botão Validar Manual (apenas se NADA foi enviado) */}
                                {!aniversariante.email_enviado_ano_atual && !aniversariante.whatsapp_enviado_ano_atual && (
                                  <Button
                                    variant="outline-success"
                                    size="sm"
                                    onClick={() => handleValidar(aniversariante)}
                                    title="Marcar como enviado manualmente"
                                    style={{
                                      fontSize: '13px',
                                      padding: '4px 8px',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                  >
                                    <FaCheckCircle />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {aniversariantes.length > 3 && (
                      <div className="text-center mt-auto">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => setShowModal(true)}
                          className="btn-gb-outline-blue w-100"
                        >
                          Ver Todos ({aniversariantes.length})
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="gb-body text-gb-gray mb-0 text-center small">
                    Nenhum aniversariante no período selecionado
                  </p>
                )}
          </div>
        </Card.Body>
      </Card>

      {/* Modal com lista completa */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton className="bg-gb-blue">
          <Modal.Title className="text-white">
            <FaBirthdayCake className="me-2" />
            Todos os Aniversariantes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table responsive hover className="table-gb">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Data Nascimento</th>
                <th>Idade</th>
                <th>Dias Até</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {aniversariantes.map((aniversariante, index) => (
                <tr key={index} className={aniversariante.dias_ate_aniversario === 0 ? 'table-success' : ''}>
                  <td>
                    {aniversariante.dias_ate_aniversario === 0 && '🎉 '}
                    <strong>{aniversariante.nome}</strong>
                  </td>
                  <td>{formatarDataCompleta(aniversariante.data_nascimento)}</td>
                  <td>{aniversariante.idade_atual} anos</td>
                  <td>
                    <Badge bg={aniversariante.dias_ate_aniversario === 0 ? 'success' : 'primary'}>
                      {getDiasTexto(aniversariante.dias_ate_aniversario)}
                    </Badge>
                  </td>
                  <td>
                    {/* Botão WhatsApp no Modal */}
                    <Button
                      variant={aniversariante.whatsapp_enviado_ano_atual ? 'secondary' : 'success'}
                      size="sm"
                      className="me-1"
                      onClick={() => handleWhatsApp(aniversariante.telefone, aniversariante.nome)}
                      disabled={aniversariante.whatsapp_enviado_ano_atual === 1}
                      title={aniversariante.whatsapp_enviado_ano_atual ? 'Mensagem já enviada este ano' : 'Enviar WhatsApp'}
                    >
                      <FaWhatsapp /> {aniversariante.whatsapp_enviado_ano_atual ? ' ✓' : ''}
                    </Button>

                    {/* Botão Email no Modal */}
                    <Button
                      variant={aniversariante.email_enviado_ano_atual ? 'secondary' : 'primary'}
                      size="sm"
                      className="me-1"
                      onClick={() => handleEmail(aniversariante)}
                      disabled={aniversariante.email_enviado_ano_atual === 1}
                      title={aniversariante.email_enviado_ano_atual ? 'Email já enviado este ano' : 'Enviar Email'}
                    >
                      <FaEnvelope /> {aniversariante.email_enviado_ano_atual ? ' ✓' : ''}
                    </Button>

                    {/* Botão Validar no Modal */}
                    {!aniversariante.email_enviado_ano_atual && !aniversariante.whatsapp_enviado_ano_atual && (
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleValidar(aniversariante)}
                        title="Marcar como enviado manualmente"
                      >
                        <FaCheckCircle />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default DashboardAniversariantes;
