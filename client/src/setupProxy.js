const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy para a API
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4011',
      changeOrigin: true,
      logLevel: 'debug'
    })
  );

  // Proxy para uploads (imagens de perfil)
  app.use(
    '/uploads',
    createProxyMiddleware({
      target: 'http://localhost:4011',
      changeOrigin: true,
      logLevel: 'debug'
    })
  );
};
