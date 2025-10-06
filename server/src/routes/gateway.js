const express = require('express');
const mercadopago = require('mercadopago');
const { query } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configurar Mercado Pago
if (process.env.MERCADOPAGO_ACCESS_TOKEN) {
  mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
  });
}

// ============== MERCADO PAGO ==============

// Criar preferência de pagamento
router.post('/mercadopago/create-preference', authenticateToken, async (req, res) => {
  try {
    const { planId, planName, price, paymentMethod } = req.body;
    const userId = req.user.userId;

    const preference = {
      items: [
        {
          title: planName || 'Plano Gracie Barra',
          unit_price: parseFloat(price),
          quantity: 1,
          currency_id: 'BRL'
        }
      ],
      payer: {
        email: req.user.email,
        name: req.user.nome
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payment/success`,
        failure: `${process.env.FRONTEND_URL}/payment/failure`,
        pending: `${process.env.FRONTEND_URL}/payment/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL || 'http://localhost:3011'}/api/gateway/mercadopago/webhook`,
      metadata: {
        user_id: userId,
        plan_id: planId
      },
      payment_methods: {
        installments: paymentMethod === 'credit' ? 3 : 1,
        excluded_payment_types: []
      }
    };

    const response = await mercadopago.preferences.create(preference);

    // Salvar transação inicial no banco
    await query(
      `INSERT INTO transacoes_gateway (
        usuario_id, gateway, transaction_id, tipo_transacao,
        status, valor, moeda, metodo_pagamento, dados_pagamento
      ) VALUES (?, 'mercadopago', ?, 'payment', 'pending', ?, 'BRL', ?, ?)`,
      [
        userId,
        response.body.id,
        price,
        paymentMethod,
        JSON.stringify(preference)
      ]
    );

    logger.info(`Preferência Mercado Pago criada: ${response.body.id} para usuário ${userId}`);

    res.json({
      preferenceId: response.body.id,
      initPoint: response.body.init_point,
      sandboxInitPoint: response.body.sandbox_init_point
    });

  } catch (error) {
    logger.error('Erro ao criar preferência Mercado Pago:', error);
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

// Criar pagamento PIX
router.post('/mercadopago/create-pix', authenticateToken, async (req, res) => {
  try {
    const { price, planId, planName } = req.body;
    const userId = req.user.userId;

    const payment = {
      transaction_amount: parseFloat(price),
      description: planName || 'Plano Gracie Barra',
      payment_method_id: 'pix',
      payer: {
        email: req.user.email,
        first_name: req.user.nome.split(' ')[0],
        last_name: req.user.nome.split(' ').slice(1).join(' ') || req.user.nome
      },
      metadata: {
        user_id: userId,
        plan_id: planId
      }
    };

    const response = await mercadopago.payment.create(payment);

    // Salvar transação no banco
    await query(
      `INSERT INTO transacoes_gateway (
        usuario_id, gateway, transaction_id, tipo_transacao,
        status, valor, moeda, metodo_pagamento, dados_pagamento
      ) VALUES (?, 'mercadopago', ?, 'payment', ?, ?, 'BRL', 'pix', ?)`,
      [
        userId,
        response.body.id,
        response.body.status,
        price,
        JSON.stringify(response.body)
      ]
    );

    logger.info(`PIX Mercado Pago criado: ${response.body.id} para usuário ${userId}`);

    res.json({
      paymentId: response.body.id,
      status: response.body.status,
      qrCode: response.body.point_of_interaction?.transaction_data?.qr_code_base64,
      qrCodeText: response.body.point_of_interaction?.transaction_data?.qr_code,
      expirationDate: response.body.date_of_expiration
    });

  } catch (error) {
    logger.error('Erro ao criar PIX Mercado Pago:', error);
    res.status(500).json({ error: 'Erro ao gerar PIX' });
  }
});

// Webhook do Mercado Pago
router.post('/mercadopago/webhook', async (req, res) => {
  try {
    const { type, data, action } = req.body;

    logger.info(`Webhook Mercado Pago recebido: ${type} - ${action}`);

    // Salvar payload completo
    await query(
      `INSERT INTO webhooks_financeiros (gateway, tipo_evento, payload, processado)
       VALUES ('mercadopago', ?, ?, false)`,
      [type, JSON.stringify(req.body)]
    );

    // Processar apenas notificações de pagamento
    if (type === 'payment') {
      const paymentId = data.id;

      // Buscar detalhes do pagamento
      const payment = await mercadopago.payment.get(paymentId);
      const paymentData = payment.body;

      logger.info(`Pagamento ${paymentId} - Status: ${paymentData.status}`);

      // Atualizar transação no banco
      await query(
        `UPDATE transacoes_gateway
         SET status = ?, dados_pagamento = ?, webhook_payload = ?, updated_at = NOW()
         WHERE gateway = 'mercadopago' AND transaction_id = ?`,
        [
          paymentData.status,
          JSON.stringify(paymentData),
          JSON.stringify(req.body),
          paymentId.toString()
        ]
      );

      // Se pagamento aprovado, ativar assinatura
      if (paymentData.status === 'approved') {
        const userId = paymentData.metadata?.user_id;
        const planId = paymentData.metadata?.plan_id;

        if (userId && planId) {
          // Buscar informações do plano
          const plans = await query(
            'SELECT * FROM planos WHERE id = ?',
            [planId]
          );

          if (plans.length > 0) {
            const plan = plans[0];

            // Verificar se já existe assinatura ativa
            const existingSubs = await query(
              `SELECT * FROM assinaturas
               WHERE usuario_id = ? AND status = 'ativa'`,
              [userId]
            );

            if (existingSubs.length === 0) {
              // Criar assinatura
              const dataInicio = new Date();
              const dataFim = new Date();
              dataFim.setMonth(dataFim.getMonth() + (plan.duracao_meses || 1));

              const dataProximaCobranca = new Date();
              dataProximaCobranca.setMonth(dataProximaCobranca.getMonth() + 1);

              await query(
                `INSERT INTO assinaturas (
                  usuario_id, plano_id, status, data_inicio, data_fim,
                  data_proxima_cobranca, valor_mensal, gateway_assinatura_id
                ) VALUES (?, ?, 'ativa', ?, ?, ?, ?, ?)`,
                [
                  userId,
                  planId,
                  dataInicio,
                  dataFim,
                  dataProximaCobranca,
                  plan.valor_mensal,
                  paymentId.toString()
                ]
              );

              logger.info(`Assinatura ativada para usuário ${userId}, plano ${planId}`);
            }
          }
        }

        // Marcar webhook como processado
        await query(
          `UPDATE webhooks_financeiros
           SET processado = true, data_processamento = NOW()
           WHERE gateway = 'mercadopago' AND payload = ?`,
          [JSON.stringify(req.body)]
        );
      }
    }

    res.status(200).send('OK');

  } catch (error) {
    logger.error('Erro no webhook Mercado Pago:', error);
    res.status(500).send('Error');
  }
});

// Consultar status de pagamento
router.get('/mercadopago/payment/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await mercadopago.payment.get(id);

    res.json({
      id: payment.body.id,
      status: payment.body.status,
      statusDetail: payment.body.status_detail,
      amount: payment.body.transaction_amount,
      paymentMethod: payment.body.payment_method_id,
      dateApproved: payment.body.date_approved
    });

  } catch (error) {
    logger.error('Erro ao consultar pagamento:', error);
    res.status(500).json({ error: 'Erro ao consultar pagamento' });
  }
});

// ============== ASSINATURAS ==============

// Listar assinaturas do usuário
router.get('/subscriptions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const subscriptions = await query(
      `SELECT a.*, p.nome AS plano_nome, p.descricao AS plano_descricao
       FROM assinaturas a
       JOIN planos p ON a.plano_id = p.id
       WHERE a.usuario_id = ?
       ORDER BY a.created_at DESC`,
      [userId]
    );

    res.json(subscriptions);

  } catch (error) {
    logger.error('Erro ao listar assinaturas:', error);
    res.status(500).json({ error: 'Erro ao listar assinaturas' });
  }
});

// Cancelar assinatura
router.post('/subscriptions/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verificar se assinatura pertence ao usuário
    const subs = await query(
      'SELECT * FROM assinaturas WHERE id = ? AND usuario_id = ?',
      [id, userId]
    );

    if (subs.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    // Cancelar assinatura
    await query(
      `UPDATE assinaturas
       SET status = 'cancelada', updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    logger.info(`Assinatura ${id} cancelada pelo usuário ${userId}`);

    res.json({ message: 'Assinatura cancelada com sucesso' });

  } catch (error) {
    logger.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ error: 'Erro ao cancelar assinatura' });
  }
});

module.exports = router;
