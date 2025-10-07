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
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, rememberMe } = req.body;

        // Buscar usuário
        const users = await query(
            'SELECT id, email, senha, nome, tipo_usuario, status FROM usuarios WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = users[0];

        // Verificar status
        if (user.status !== 'ativo') {
            return res.status(401).json({ error: 'Usuário inativo ou suspenso' });
        }

        // Verificar senha
        const isValidPassword = await bcrypt.compare(password, user.senha);
        if (!isValidPassword) {
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
                tipo_usuario: user.tipo_usuario
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
            tipo_usuario: req.user.tipo_usuario
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
        user = users[0];
        await query(
          'UPDATE usuarios SET google_id = ?, foto_url = ?, provedor_auth = ?, updated_at = NOW() WHERE id = ?',
          [googleId, foto_url, 'google', user.id]
        );
        user.google_id = googleId;
        user.foto_url = foto_url;
        user.provedor_auth = 'google';

      } else {
        // Criar novo usuário
        const result = await query(
          `INSERT INTO usuarios (
            nome, email, google_id, foto_url, provedor_auth,
            tipo_usuario, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'google', 'aluno', 'ativo', NOW(), NOW())`,
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
        foto_url: user.foto_url
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