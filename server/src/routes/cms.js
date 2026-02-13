const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticateToken, adminOrSuperAdmin } = require('../middleware/auth');

// ========================================
// MIDDLEWARE DE AUTENTICAÇÃO
// ========================================

// Middleware de debug para CMS
const cmsDebug = (req, res, next) => {
  console.log('🔍 CMS DEBUG - Headers recebidos:', {
    authorization: req.headers.authorization,
    hasToken: !!req.headers.authorization,
    tokenPrefix: req.headers.authorization ? req.headers.authorization.substring(0, 20) + '...' : 'N/A',
    user: req.user ? `${req.user.email} (${req.user.tipo_usuario})` : 'Nenhum'
  });
  next();
};

// ========================================
// CONFIGURAÇÃO DE UPLOAD DE IMAGENS
// ========================================

// Diretório de uploads CMS
const uploadDir = path.join(__dirname, '../../uploads/cms');

// Garantir que diretório existe
(async () => {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
    console.log('📁 Diretório CMS criado/verificado:', uploadDir);
  } catch (error) {
    console.error('❌ Erro ao criar diretório CMS:', error);
  }
})();

// Configuração do Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
    cb(null, `cms-${basename}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas imagens são permitidas (jpeg, jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter
});

// ========================================
// ROTAS CMS
// ========================================

/**
 * GET /api/cms/secoes
 * Listar todas as seções ativas
 */
router.get('/secoes', cmsDebug, authenticateToken, adminOrSuperAdmin, async (req, res) => {
  try {
    console.log('🔍 CMS - Listando seções');

    const secoes = await query(`
      SELECT
        s.id,
        s.chave,
        s.nome,
        s.descricao,
        s.ordem,
        s.ativo,
        COUNT(c.id) as total_conteudos
      FROM cms_secoes s
      LEFT JOIN cms_conteudos c ON s.id = c.secao_id
      WHERE s.ativo = 1
      GROUP BY s.id
      ORDER BY s.ordem ASC
    `);

    console.log(`✅ CMS - ${secoes.length} seções encontradas`);

    res.json({
      success: true,
      data: secoes
    });
  } catch (error) {
    console.error('❌ CMS - Erro ao listar seções:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar seções',
      message: error.message
    });
  }
});

/**
 * GET /api/cms/secoes/:id
 * Obter seção específica com todos os conteúdos
 */
router.get('/secoes/:id', cmsDebug, authenticateToken, adminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 CMS - Buscando seção ID ${id}`);

    // Buscar seção
    const secoes = await query(`
      SELECT
        id,
        chave,
        nome,
        descricao,
        ordem,
        ativo
      FROM cms_secoes
      WHERE id = ? AND ativo = 1
    `, [id]);

    if (secoes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Seção não encontrada'
      });
    }

    const secao = secoes[0];

    // Buscar conteúdos da seção
    const conteudos = await query(`
      SELECT
        id,
        secao_id,
        chave,
        label,
        tipo,
        valor,
        alt_text,
        ordem,
        obrigatorio,
        max_caracteres,
        placeholder,
        dicas,
        ativo
      FROM cms_conteudos
      WHERE secao_id = ? AND ativo = 1
      ORDER BY ordem ASC
    `, [id]);

    console.log(`✅ CMS - Seção "${secao.nome}" com ${conteudos.length} conteúdos`);

    res.json({
      success: true,
      data: {
        secao: secao,
        conteudos: conteudos
      }
    });
  } catch (error) {
    console.error('❌ CMS - Erro ao buscar seção:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar seção',
      message: error.message
    });
  }
});

/**
 * PUT /api/cms/conteudos/:id
 * Atualizar valor de um conteúdo
 */
router.put('/conteudos/:id', authenticateToken, adminOrSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { valor } = req.body;

    console.log(`💾 CMS - Atualizando conteúdo ID ${id}`);

    // Verificar se conteúdo existe
    const conteudos = await query(`
      SELECT id, chave, tipo, valor
      FROM cms_conteudos
      WHERE id = ?
    `, [id]);

    if (conteudos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Conteúdo não encontrado'
      });
    }

    const conteudoAnterior = conteudos[0];

    // Validação básica
    if (valor === undefined || valor === null) {
      return res.status(400).json({
        success: false,
        error: 'Valor é obrigatório'
      });
    }

    // Atualizar conteúdo
    await query(`
      UPDATE cms_conteudos
      SET
        valor = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [valor, id]);

    // Buscar conteúdo atualizado
    const [conteudoAtualizado] = await query(`
      SELECT
        id,
        secao_id,
        chave,
        label,
        tipo,
        valor,
        alt_text,
        ordem,
        updated_at
      FROM cms_conteudos
      WHERE id = ?
    `, [id]);

    console.log(`✅ CMS - Conteúdo ID ${id} atualizado com sucesso`);

    res.json({
      success: true,
      message: 'Conteúdo atualizado com sucesso',
      data: conteudoAtualizado[0]
    });
  } catch (error) {
    console.error('❌ CMS - Erro ao atualizar conteúdo:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao salvar conteúdo',
      message: error.message
    });
  }
});

/**
 * POST /api/cms/upload/:id
 * Upload de imagem para um conteúdo específico
 */
router.post('/upload/:id', authenticateToken, adminOrSuperAdmin, upload.single('imagem'), async (req, res) => {
  try {
    const { id } = req.params;
    const { altText } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'Nenhum arquivo foi enviado'
      });
    }

    console.log(`📤 CMS - Upload de imagem para conteúdo ID ${id}`);
    console.log(`📁 Arquivo: ${file.filename} (${(file.size / 1024).toFixed(2)} KB)`);

    // Verificar se conteúdo existe e é do tipo imagem
    const conteudos = await query(`
      SELECT id, chave, tipo, valor
      FROM cms_conteudos
      WHERE id = ?
    `, [id]);

    if (conteudos.length === 0) {
      // Remover arquivo enviado
      await fs.unlink(file.path).catch(console.error);
      return res.status(404).json({
        success: false,
        error: 'Conteúdo não encontrado'
      });
    }

    const conteudo = conteudos[0];

    if (conteudo.tipo !== 'imagem') {
      // Remover arquivo enviado
      await fs.unlink(file.path).catch(console.error);
      return res.status(400).json({
        success: false,
        error: 'Este conteúdo não é do tipo imagem'
      });
    }

    // Caminho relativo da imagem (para salvar no banco e usar no frontend)
    const imagemPath = `/uploads/cms/${file.filename}`;

    // Remover imagem antiga se existir
    if (conteudo.valor && conteudo.valor.startsWith('/uploads/cms/')) {
      const oldImagePath = path.join(__dirname, '../..', conteudo.valor);
      await fs.unlink(oldImagePath).catch(err => {
        console.log('⚠️  Imagem antiga não encontrada ou já removida');
      });
    }

    // Atualizar banco de dados
    await query(`
      UPDATE cms_conteudos
      SET
        valor = ?,
        alt_text = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [imagemPath, altText || '', id]);

    // Buscar conteúdo atualizado
    const [conteudoAtualizado] = await query(`
      SELECT
        id,
        secao_id,
        chave,
        label,
        tipo,
        valor,
        alt_text,
        updated_at
      FROM cms_conteudos
      WHERE id = ?
    `, [id]);

    console.log(`✅ CMS - Upload concluído: ${imagemPath}`);

    res.json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: {
        conteudo: conteudoAtualizado[0],
        upload: {
          caminho: imagemPath,
          nomeOriginal: file.originalname,
          tamanho: file.size,
          altText: altText || ''
        }
      }
    });
  } catch (error) {
    console.error('❌ CMS - Erro no upload:', error);

    // Tentar remover arquivo em caso de erro
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao fazer upload da imagem',
      message: error.message
    });
  }
});

/**
 * GET /api/cms/landing-page
 * Retornar todos os dados formatados para a landing page
 * (Será implementado na Sprint 2)
 */
router.get('/landing-page', async (req, res) => {
  try {
    console.log('🔍 CMS - Buscando dados para landing page');

    // Buscar todas as seções com seus conteúdos
    const secoes = await query(`
      SELECT
        s.id,
        s.chave,
        s.nome,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', c.id,
            'chave', c.chave,
            'tipo', c.tipo,
            'label', c.label,
            'valor', c.valor,
            'alt_text', c.alt_text,
            'ordem', c.ordem
          )
        ) as conteudos
      FROM cms_secoes s
      LEFT JOIN cms_conteudos c ON s.id = c.secao_id
      WHERE s.ativo = 1
      GROUP BY s.id, s.chave, s.nome
      ORDER BY s.ordem ASC
    `);

    // Organizar dados por seção
    const dadosFormatados = {};

    secoes.forEach(secao => {
      // MySQL pode retornar JSON_ARRAYAGG como string ou array parseado
      let conteudos = [];

      if (typeof secao.conteudos === 'string') {
        try {
          conteudos = JSON.parse(secao.conteudos);
        } catch (e) {
          console.error('Erro ao parsear conteúdos:', e);
        }
      } else if (Array.isArray(secao.conteudos)) {
        conteudos = secao.conteudos;
      }

      const dadosSecao = {};

      conteudos.forEach(conteudo => {
        if (conteudo && conteudo.chave && conteudo.chave !== null) {
          dadosSecao[conteudo.chave] = conteudo.valor;
        }
      });

      dadosFormatados[secao.chave] = dadosSecao;
    });

    console.log(`✅ CMS - Dados da landing page preparados (${secoes.length} seções)`);
    console.log('📦 Preview dos dados:', JSON.stringify(dadosFormatados).substring(0, 200) + '...');

    // Adicionar headers para prevenir cache
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(dadosFormatados);
  } catch (error) {
    console.error('❌ CMS - Erro ao buscar dados da landing page:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao carregar dados da landing page',
      message: error.message
    });
  }
});

// ========================================
// TRATAMENTO DE ERROS
// ========================================

// Handler de erros do multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo muito grande. Tamanho máximo: 5MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Erro no upload: ${error.message}`
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  next();
});

module.exports = router;
