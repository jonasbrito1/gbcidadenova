const logger = require('../utils/logger');
const pool = require('../config/database');

/**
 * Cria ou atualiza a recorrência de pagamento para um aluno
 * @param {number} alunoId - ID do aluno
 * @param {object} studentData - Dados do aluno incluindo plano_id, bolsista, valor_mensalidade_customizado, dia_vencimento
 * @returns {Promise<object|null>} - Recorrência criada/atualizada ou null se aluno for bolsista
 */
async function configurarRecorrenciaParaAluno(alunoId, studentData) {
  const connection = await pool.getConnection();

  try {
    logger.info(`[PAYMENT RECURRENCE] Configurando recorrência para aluno ${alunoId}`);

    // Se aluno é bolsista, cancelar recorrência existente e retornar
    if (studentData.bolsista) {
      logger.info(`[PAYMENT RECURRENCE] Aluno ${alunoId} é bolsista - cancelando recorrência`);
      await connection.query(
        `UPDATE pagamentos_recorrentes
         SET status = 'cancelado'
         WHERE aluno_id = ?`,
        [alunoId]
      );
      return null;
    }

    // Garantir que temos um plano_id válido
    let planoIdFinal = studentData.plano_id;
    if (!planoIdFinal || planoIdFinal === '' || planoIdFinal === 'null' || planoIdFinal === null) {
      // Buscar plano padrão ativo
      const [planosDefault] = await connection.query(
        'SELECT id FROM planos WHERE status = "ativo" ORDER BY id LIMIT 1'
      );
      planoIdFinal = planosDefault.length > 0 ? planosDefault[0].id : 1;
      logger.info(`[PAYMENT RECURRENCE] Plano não fornecido, usando plano padrão: ${planoIdFinal}`);
    }

    // Determinar o valor da mensalidade
    let valorMensalidade;
    if (studentData.valor_mensalidade_customizado && parseFloat(studentData.valor_mensalidade_customizado) > 0) {
      valorMensalidade = parseFloat(studentData.valor_mensalidade_customizado);
      logger.info(`[PAYMENT RECURRENCE] Usando valor customizado: R$ ${valorMensalidade}`);
    } else {
      // Buscar valor do plano
      const [planos] = await connection.query(
        'SELECT valor_mensal FROM planos WHERE id = ? AND status = "ativo"',
        [planoIdFinal]
      );

      if (planos.length > 0 && planos[0].valor_mensal) {
        valorMensalidade = parseFloat(planos[0].valor_mensal);
        logger.info(`[PAYMENT RECURRENCE] Usando valor do plano ${planoIdFinal}: R$ ${valorMensalidade}`);
      } else {
        // Valor padrão
        valorMensalidade = 150.00;
        logger.info(`[PAYMENT RECURRENCE] Usando valor padrão: R$ ${valorMensalidade}`);
      }
    }

    // Dia de vencimento (padrão: 5)
    const diaVencimento = studentData.dia_vencimento || 5;

    // Calcular próxima data de cobrança
    const hoje = new Date();
    let proximaCobranca = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);

    // Se já passou o dia de vencimento deste mês, próxima cobrança é mês que vem
    if (hoje.getDate() > diaVencimento) {
      proximaCobranca.setMonth(proximaCobranca.getMonth() + 1);
    }

    const dataProximaCobranca = proximaCobranca.toISOString().split('T')[0];
    const dataInicio = studentData.data_inicio || hoje.toISOString().split('T')[0];

    // Verificar se já existe recorrência para este aluno
    const [existingRecurrence] = await connection.query(
      'SELECT id FROM pagamentos_recorrentes WHERE aluno_id = ?',
      [alunoId]
    );

    let recurrenceId;

    if (existingRecurrence.length > 0) {
      // Atualizar recorrência existente
      recurrenceId = existingRecurrence[0].id;
      await connection.query(
        `UPDATE pagamentos_recorrentes
         SET plano_id = ?,
             valor = ?,
             dia_vencimento = ?,
             data_proxima_cobranca = ?,
             status = 'ativo',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [planoIdFinal, valorMensalidade, diaVencimento, dataProximaCobranca, recurrenceId]
      );
      logger.info(`[PAYMENT RECURRENCE] Recorrência ${recurrenceId} atualizada para aluno ${alunoId}`);
    } else {
      // Criar nova recorrência
      const [result] = await connection.query(
        `INSERT INTO pagamentos_recorrentes (
          aluno_id,
          plano_id,
          valor,
          dia_vencimento,
          data_inicio,
          data_proxima_cobranca,
          status,
          notificacao_3dias,
          notificacao_1dia,
          notificacao_vencimento
        ) VALUES (?, ?, ?, ?, ?, ?, 'ativo', FALSE, FALSE, FALSE)`,
        [alunoId, planoIdFinal, valorMensalidade, diaVencimento, dataInicio, dataProximaCobranca]
      );
      recurrenceId = result.insertId;
      logger.info(`[PAYMENT RECURRENCE] Nova recorrência ${recurrenceId} criada para aluno ${alunoId}`);
    }

    // Buscar e retornar a recorrência criada/atualizada
    const [recurrence] = await connection.query(
      'SELECT * FROM pagamentos_recorrentes WHERE id = ?',
      [recurrenceId]
    );

    return recurrence[0];

  } catch (error) {
    logger.error(`[PAYMENT RECURRENCE] Erro ao configurar recorrência para aluno ${alunoId}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Cancela a recorrência de pagamento para um aluno
 * @param {number} alunoId - ID do aluno
 */
async function cancelarRecorrenciaParaAluno(alunoId) {
  const connection = await pool.getConnection();

  try {
    logger.info(`[PAYMENT RECURRENCE] Cancelando recorrência para aluno ${alunoId}`);

    await connection.query(
      `UPDATE pagamentos_recorrentes
       SET status = 'cancelado',
           updated_at = CURRENT_TIMESTAMP
       WHERE aluno_id = ? AND status != 'cancelado'`,
      [alunoId]
    );

  } catch (error) {
    logger.error(`[PAYMENT RECURRENCE] Erro ao cancelar recorrência para aluno ${alunoId}:`, error);
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  configurarRecorrenciaParaAluno,
  cancelarRecorrenciaParaAluno
};
