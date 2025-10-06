const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./database');
const logger = require('../utils/logger');

module.exports = function(passport) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3011/api/auth/google/callback',
        passReqToCallback: true
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails[0].value;
          const nome = profile.displayName;
          const foto_url = profile.photos[0]?.value;

          // Verificar se usuário já existe pelo google_id
          let users = await query(
            'SELECT * FROM usuarios WHERE google_id = ?',
            [googleId]
          );

          if (users.length > 0) {
            // Usuário já existe com este Google ID
            const user = users[0];

            // Atualizar foto se mudou
            if (foto_url && user.foto_url !== foto_url) {
              await query(
                'UPDATE usuarios SET foto_url = ?, updated_at = NOW() WHERE id = ?',
                [foto_url, user.id]
              );
            }

            logger.info(`Login Google bem-sucedido: ${email}`);
            return done(null, user);
          }

          // Verificar se existe usuário com mesmo email
          users = await query(
            'SELECT * FROM usuarios WHERE email = ?',
            [email]
          );

          if (users.length > 0) {
            // Usuário existe com email, vincular Google ID
            const user = users[0];

            await query(
              'UPDATE usuarios SET google_id = ?, foto_url = ?, provedor_auth = ?, updated_at = NOW() WHERE id = ?',
              [googleId, foto_url, 'google', user.id]
            );

            const updatedUsers = await query(
              'SELECT * FROM usuarios WHERE id = ?',
              [user.id]
            );

            logger.info(`Conta vinculada ao Google: ${email}`);
            return done(null, updatedUsers[0]);
          }

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

          logger.info(`Nova conta criada via Google: ${email}`);
          return done(null, newUsers[0]);

        } catch (error) {
          logger.error('Erro na autenticação Google:', error);
          return done(error, null);
        }
      }
    )
  );

  // Serialização do usuário
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Desserialização do usuário
  passport.deserializeUser(async (id, done) => {
    try {
      const users = await query(
        'SELECT id, nome, email, tipo_usuario, status, google_id, foto_url FROM usuarios WHERE id = ?',
        [id]
      );

      if (users.length === 0) {
        return done(null, false);
      }

      done(null, users[0]);
    } catch (error) {
      done(error, null);
    }
  });
};
