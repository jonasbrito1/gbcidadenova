import React, { useState } from 'react';
import { Row, Col, Card, ButtonGroup, Button } from 'react-bootstrap';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';

const DashboardCharts = ({ data }) => {
  const [chartPeriod, setChartPeriod] = useState('6'); // 3, 6 ou 12 meses

  if (!data) return null;

  // Cores da paleta Gracie Barra
  const COLORS = {
    red: '#c8102e',
    blue: '#003da5',
    yellow: '#ffd100',
    gray: '#6c757d',
    lightGray: '#dee2e6',
    success: '#198754',
    warning: '#ffc107',
    danger: '#dc3545'
  };

  const PIE_COLORS = [COLORS.red, COLORS.blue, COLORS.yellow, COLORS.gray, '#8884d8', '#82ca9d', '#ffc658'];

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px 15px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p className="label mb-2" style={{ fontWeight: 'bold', color: '#333' }}>{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="mb-1" style={{ color: entry.color, fontSize: '0.9rem' }}>
              {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Receita')
                ? `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Preparar dados para gráfico de linhas (Evolução)
  const evolucaoData = data.evolucaoAlunos?.slice(-parseInt(chartPeriod)) || [];
  const receitaData = data.receitaMensal?.slice(-parseInt(chartPeriod)) || [];

  // Combinar dados de evolução e receita
  const combinedEvolucaoData = evolucaoData.map((item, index) => ({
    mes: item.mes,
    alunos: item.novos_alunos || 0,
    receita: receitaData[index]?.receita || 0
  }));

  // Dados para gráfico de pizza (Distribuição por modalidade)
  const distribuicaoData = data.distribuicaoPrograma?.map(item => ({
    name: item.programa,
    value: item.total
  })) || [];

  // Dados para gráfico de barras (Top Frequência)
  const topFrequenciaData = data.topFrequencia?.slice(0, 8).map(item => ({
    nome: item.nome.split(' ')[0], // Primeiro nome
    aulas: item.total_aulas
  })) || [];

  // Dados para gráfico de mensalidades por status
  const mensalidadesStatusData = [
    { status: 'Pagas', valor: data.metricas?.totalPagamentos || 0, cor: COLORS.success },
    { status: 'Pendentes', valor: data.metricas?.pagamentosPendentes || 0, cor: COLORS.warning },
    { status: 'Vencidas', valor: data.metricas?.pagamentosVencidos || 0, cor: COLORS.danger }
  ];

  // Dados para gráfico Radar (Performance por modalidade)
  const radarData = data.distribuicaoPrograma?.map(item => ({
    modalidade: item.programa.substring(0, 15),
    alunos: item.total,
    ativos: item.ativos,
    taxaAtivacao: Math.round((item.ativos / item.total) * 100)
  })) || [];

  // Dados para gráfico de distribuição por graduação/faixa
  const graduacaoData = data.distribuicaoGraduacao?.map(item => {
    const cores = {
      'Branca': '#F8F9FA',
      'Cinza': '#6C757D',
      'Amarela': '#FFD700',
      'Laranja': '#FF8C00',
      'Verde': '#28A745',
      'Azul': '#003DA5',
      'Roxa': '#6F42C1',
      'Marrom': '#8B4513',
      'Preta': '#212529'
    };
    return {
      graduacao: item.graduacao,
      total: item.total,
      ativos: item.ativos,
      cor: cores[item.graduacao] || COLORS.gray
    };
  }) || [];

  return (
    <>
      {/* Controles de Período */}
      <Row className="mb-3">
        <Col className="d-flex justify-content-end">
          <ButtonGroup size="sm">
            <Button
              variant={chartPeriod === '3' ? 'danger' : 'outline-danger'}
              onClick={() => setChartPeriod('3')}
              style={chartPeriod !== '3' ? { color: '#dc3545', borderColor: '#dc3545', backgroundColor: '#fff' } : {}}
            >
              3 meses
            </Button>
            <Button
              variant={chartPeriod === '6' ? 'danger' : 'outline-danger'}
              onClick={() => setChartPeriod('6')}
              style={chartPeriod !== '6' ? { color: '#dc3545', borderColor: '#dc3545', backgroundColor: '#fff' } : {}}
            >
              6 meses
            </Button>
            <Button
              variant={chartPeriod === '12' ? 'danger' : 'outline-danger'}
              onClick={() => setChartPeriod('12')}
              style={chartPeriod !== '12' ? { color: '#dc3545', borderColor: '#dc3545', backgroundColor: '#fff' } : {}}
            >
              12 meses
            </Button>
          </ButtonGroup>
        </Col>
      </Row>

      <Row>
        {/* Gráfico de Linhas - Evolução de Alunos e Receita */}
        <Col xs={12} lg={8} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-red hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-red border-bottom-gb-red pb-3 mb-4">
                Evolução de Alunos e Receita
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={combinedEvolucaoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke={COLORS.red} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke={COLORS.blue} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="alunos"
                    stroke={COLORS.red}
                    strokeWidth={3}
                    name="Novos Alunos"
                    dot={{ fill: COLORS.red, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="receita"
                    stroke={COLORS.blue}
                    strokeWidth={3}
                    name="Receita (R$)"
                    dot={{ fill: COLORS.blue, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Gráfico de Pizza - Distribuição por Modalidade */}
        <Col xs={12} lg={4} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-blue hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-blue border-bottom-gb-blue pb-3 mb-4">
                Distribuição por Modalidade
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distribuicaoData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distribuicaoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Gráfico de Barras - Top Frequência */}
        <Col xs={12} lg={6} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-red hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-red border-bottom-gb-red pb-3 mb-4">
                Top 8 Frequência de Alunos
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topFrequenciaData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} />
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} stroke={COLORS.gray} />
                  <YAxis tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="aulas" fill={COLORS.red} name="Aulas" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Gráfico de Colunas - Mensalidades por Status */}
        <Col xs={12} lg={6} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-blue hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-blue border-bottom-gb-blue pb-3 mb-4">
                Mensalidades por Status
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mensalidadesStatusData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} />
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <YAxis tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="valor" name="Quantidade" radius={[8, 8, 0, 0]}>
                    {mensalidadesStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Gráfico de Área - Receita Mensal */}
        <Col xs={12} lg={6} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-red hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-red border-bottom-gb-red pb-3 mb-4">
                Receita Mensal
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={receitaData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <YAxis tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="receita"
                    stroke={COLORS.blue}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                    name="Receita (R$)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Gráfico Radar - Performance por Modalidade */}
        <Col xs={12} lg={6} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-blue hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-blue border-bottom-gb-blue pb-3 mb-4">
                Performance por Modalidade
              </Card.Title>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={COLORS.lightGray} />
                  <PolarAngleAxis dataKey="modalidade" tick={{ fontSize: 10 }} stroke={COLORS.gray} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Radar
                    name="Total Alunos"
                    dataKey="alunos"
                    stroke={COLORS.red}
                    fill={COLORS.red}
                    fillOpacity={0.5}
                  />
                  <Radar
                    name="Alunos Ativos"
                    dataKey="ativos"
                    stroke={COLORS.blue}
                    fill={COLORS.blue}
                    fillOpacity={0.5}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Gráfico de Distribuição por Graduação/Faixa */}
      <Row>
        <Col xs={12} className="mb-4">
          <Card className="card-dashboard-gb shadow-gb-red hover-lift h-100">
            <Card.Body>
              <Card.Title className="gb-heading text-gb-red border-bottom-gb-red pb-3 mb-4">
                Distribuição de Alunos por Graduação (Faixa)
              </Card.Title>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={graduacaoData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.lightGray} />
                  <XAxis dataKey="graduacao" tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <YAxis tick={{ fontSize: 12 }} stroke={COLORS.gray} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '14px' }} />
                  <Bar dataKey="total" name="Total Alunos" radius={[8, 8, 0, 0]}>
                    {graduacaoData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.cor}
                        stroke={entry.graduacao === 'Branca' ? '#dee2e6' : entry.cor}
                        strokeWidth={entry.graduacao === 'Branca' ? 2 : 0}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="ativos" name="Alunos Ativos" radius={[8, 8, 0, 0]}>
                    {graduacaoData.map((entry, index) => (
                      <Cell
                        key={`cell-active-${index}`}
                        fill={entry.cor}
                        opacity={0.6}
                        stroke={entry.graduacao === 'Branca' ? '#dee2e6' : entry.cor}
                        strokeWidth={entry.graduacao === 'Branca' ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default DashboardCharts;
