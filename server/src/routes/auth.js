const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validações
const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres')
];

// Login
router.post('/login', loginValidation, async (req, res) => {
    try {
        console.log('=== REQUISIÇÃO DE LOGIN RECEBIDA ===');
        console.log('Body:', JSON.stringify(req.body, null, 2));
        console.log('Headers:', JSON.stringify(req.headers, null, 2));

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ ERROS DE VALIDAÇÃO:', JSON.stringify(errors.array(), null, 2));
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, rememberMe } = req.body;

        logger.info(`[DEBUG LOGIN] Tentativa de login: ${email}`);
        logger.info(`[DEBUG LOGIN] Senha recebida tem ${password.length} caracteres`);

        // Buscar usuário
        let users = await query(
            'SELECT id, email, senha, nome, tipo_usuario, status, primeiro_acesso, lgpd_aceite, foto_url FROM usuarios WHERE email = ?',
            [email]
        );

        logger.info(`[DEBUG LOGIN] Usuários encontrados: ${users.length}`);

        // Se não encontrou e é Gmail, buscar variações com/sem pontos (Gmail ignora pontos)
        if (users.length === 0 && email.toLowerCase().endsWith('@gmail.com')) {
            logger.info(`[DEBUG LOGIN] Email Gmail não encontrado. Buscando variações com/sem pontos...`);

            // Normalizar o email digitado (remover pontos da parte local)
            const emailLocal = email.split('@')[0].replace(/\./g, '');
            const emailDomain = email.split('@')[1];

            logger.info(`[DEBUG LOGIN] Parte local normalizada: ${emailLocal}`);
            logger.info(`[DEBUG LOGIN] Domínio: ${emailDomain}`);

            // Buscar todos os emails Gmail no banco
            const allGmailUsers = await query(
                'SELECT id, email, senha, nome, tipo_usuario, status, primeiro_acesso, lgpd_aceite, foto_url FROM usuarios WHERE email LIKE ?',
                [`%@${emailDomain}`]
            );

            logger.info(`[DEBUG LOGIN] Total de emails @${emailDomain} encontrados: ${allGmailUsers.length}`);

            // Filtrar emails que correspondem à mesma parte local (ignorando pontos)
            users = allGmailUsers.filter(u => {
                const userEmailLocal = u.email.split('@')[0].replace(/\./g, '');
                const match = userEmailLocal === emailLocal;
                if (match) {
                    logger.info(`[DEBUG LOGIN] ✓ Match encontrado: ${u.email} (normalizado: ${userEmailLocal})`);
                }
                return match;
            });

            if (users.length > 0) {
                logger.info(`[DEBUG LOGIN] ✅ Usuário encontrado com variação de pontos: ${users[0].email}`);
            } else {
                logger.info(`[DEBUG LOGIN] ❌ Nenhuma variação correspondente encontrada`);
            }
        }

        if (users.length === 0) {
            logger.warn(`[DEBUG LOGIN] Usuário não encontrado: ${email}`);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];
        logger.info(`[DEBUG LOGIN] Usuário encontrado - ID: ${user.id}, Status: ${user.status}`);

        // Verificar status
        if (user.status !== 'ativo') {
            logger.warn(`[DEBUG LOGIN] Usuário não ativo: ${user.status}`);
            return res.status(401).json({ error: 'Usuário inativo ou suspenso' });
        }

        // Verificar senha
        logger.info(`[DEBUG LOGIN] Comparando senha... Hash no banco: ${user.senha.substring(0, 20)}...`);
        const isValidPassword = await bcrypt.compare(password, user.senha);
        logger.info(`[DEBUG LOGIN] Resultado da comparação de senha: ${isValidPassword}`);
        if (!isValidPassword) {
            logger.warn(`[DEBUG LOGIN] Senha inválida para: ${email}`);
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token JWT
        const tokenExpire = rememberMe ? '30d' : (process.env.JWT_EXPIRE || '7d');
        const token = jwt.sign(
            { userId: user.id, email: user.email, tipo: user.tipo_usuario },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpire }
        );

        // Atualizar último login
        await query(
            'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
            [user.id]
        );

        // Log de atividade
        logger.info(`Login realizado: ${user.email}`);

        res.json({
            message: 'Login realizado com sucesso',
            token,
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                tipo_usuario: user.tipo_usuario,
                primeiro_acesso: user.primeiro_acesso,
                lgpd_aceite: user.lgpd_aceite,
                foto_url: user.foto_url
            }
        });

    } catch (error) {
        logger.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Verificar token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            nome: req.user.nome,
            email: req.user.email,
            tipo_usuario: req.user.tipo_usuario,
            primeiro_acesso: req.user.primeiro_acesso,
            lgpd_aceite: req.user.lgpd_aceite,
            foto_url: req.user.foto_url
        }
    });
});

// Logout (opcional - principalmente para logs)
router.post('/logout', authenticateToken, (req, res) => {
    logger.info(`Logout realizado: ${req.user.email}`);
    res.json({ message: 'Logout realizado com sucesso' });
});

// ============== GOOGLE OAUTH ROUTES ==============

// Rota para iniciar autenticação Google (OAuth flow)
router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Callback do Google OAuth
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3010'}/login?error=google_auth_failed`,
    session: false
  }),
  async (req, res) => {
    try {
      const user = req.user;

      // Gerar token JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          tipo: user.tipo_usuario
        },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      // Atualizar último login
      await query(
        'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
        [user.id]
      );

      // Redirecionar para frontend com token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);

    } catch (error) {
      logger.error('Erro no callback Google:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3010';
      res.redirect(`${frontendUrl}/login?error=callback_error`);
    }
  }
);

// Rota alternativa: Login com Google usando token ID (para React)
router.post('/google/token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token não fornecido' });
    }

    // Verificar token do Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const nome = payload.name;
    const foto_url = payload.picture;

    // Verificar se usuário já existe pelo google_id
    let users = await query(
      'SELECT * FROM usuarios WHERE google_id = ?',
      [googleId]
    );

    let user;

    if (users.length > 0) {
      // Usuário já existe
      user = users[0];

      // Atualizar foto se mudou
      if (foto_url && user.foto_url !== foto_url) {
        await query(
          'UPDATE usuarios SET foto_url = ?, updated_at = NOW() WHERE id = ?',
          [foto_url, user.id]
        );
        user.foto_url = foto_url;
      }

    } else {
      // Verificar se existe usuário com mesmo email
      users = await query(
        'SELECT * FROM usuarios WHERE email = ?',
        [email]
      );

      if (users.length > 0) {
        // Vincular Google ID ao usuário existente
        // Marcar primeiro_acesso = FALSE para usuários Google (não precisam trocar senha)
        user = users[0];
        await query(
          'UPDATE usuarios SET google_id = ?, foto_url = ?, provedor_auth = ?, primeiro_acesso = FALSE, updated_at = NOW() WHERE id = ?',
          [googleId, foto_url, 'google', user.id]
        );
        user.google_id = googleId;
        user.foto_url = foto_url;
        user.provedor_auth = 'google';
        user.primeiro_acesso = 0;

      } else {
        // Criar novo usuário
        // Usuários Google não precisam alterar senha no primeiro acesso (primeiro_acesso = FALSE)
        const result = await query(
          `INSERT INTO usuarios (
            nome, email, google_id, foto_url, provedor_auth,
            tipo_usuario, status, primeiro_acesso, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'google', 'aluno', 'ativo', FALSE, NOW(), NOW())`,
          [nome, email, googleId, foto_url]
        );

        const newUsers = await query(
          'SELECT * FROM usuarios WHERE id = ?',
          [result.insertId]
        );

        user = newUsers[0];
        logger.info(`Nova conta criada via Google: ${email}`);
      }
    }

    // Verificar status do usuário
    if (user.status !== 'ativo') {
      return res.status(401).json({ error: 'Usuário inativo ou suspenso' });
    }

    // Gerar token JWT
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        tipo: user.tipo_usuario
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Atualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
      [user.id]
    );

    logger.info(`Login Google (token) bem-sucedido: ${email}`);

    res.json({
      message: 'Login Google realizado com sucesso',
      token: jwtToken,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo_usuario: user.tipo_usuario,
        foto_url: user.foto_url,
        primeiro_acesso: user.primeiro_acesso,
        lgpd_aceite: user.lgpd_aceite
      }
    });

  } catch (error) {
    logger.error('Erro na autenticação Google (token):', error);
    res.status(500).json({ error: 'Erro ao autenticar com Google' });
  }
});

// Alterar senha
router.post('/change-password', [
    authenticateToken,
    body('currentPassword').isLength({ min: 6 }).withMessage('Senha atual obrigatória'),
    body('newPassword').isLength({ min: 6 }).withMessage('Nova senha deve ter pelo menos 6 caracteres')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { currentPassword, newPassword } = req.body;

        // Buscar senha atual
        const users = await query(
            'SELECT senha FROM usuarios WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha atual
        const isValidPassword = await bcrypt.compare(currentPassword, users[0].senha);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }

        // Hash da nova senha
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        // Atualizar senha
        await query(
            'UPDATE usuarios SET senha = ?, updated_at = NOW() WHERE id = ?',
            [hashedPassword, req.user.id]
        );

        logger.info(`Senha alterada: ${req.user.email}`);

        res.json({ message: 'Senha alterada com sucesso' });

    } catch (error) {
        logger.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

module.exports = router;