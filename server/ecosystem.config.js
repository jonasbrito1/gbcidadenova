module.exports = {
  apps: [
    {
      name: 'gbcidadenova-api',
      script: './index.js',
      instances: 2,
      exec_mode: 'cluster',

      // Variáveis de ambiente
      env: {
        NODE_ENV: 'production',
        PORT: 4011
      },

      // Configurações de memória e CPU
      max_memory_restart: '800M',  // Reinicia se usar mais que 800MB
      node_args: '--max-old-space-size=768',

      // Configurações de restart inteligente
      min_uptime: '30s',           // Considera "online" após 30s
      max_restarts: 50,            // Limite de restarts
      restart_delay: 5000,         // 5s entre restarts
      exp_backoff_restart_delay: 500,  // Backoff exponencial

      // Timeouts e graceful shutdown
      kill_timeout: 10000,         // 10s para graceful shutdown
      listen_timeout: 5000,        // 5s para porta ficar disponível
      shutdown_with_message: true,

      // Auto-restart em caso de crash
      autorestart: true,

      // Logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Monitoramento
      vizion: true,
      autostart: true,

      // Watch (desabilitado em produção)
      watch: false,
      ignore_watch: ['node_modules', 'uploads', '.pm2', 'logs'],

      // Métricas e monitoramento
      pmx: true,
      automation: true,

      // Configurações adicionais
      treekill: true,
      instance_var: 'NODE_APP_INSTANCE'
    },
    {
      name: 'health-check-monitor',
      script: './health-check-process.js',
      instances: 1,
      exec_mode: 'cluster',

      env: {
        NODE_ENV: 'production'
      },

      max_memory_restart: '300M',
      node_args: '--max-old-space-size=256',

      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,

      kill_timeout: 5000,
      listen_timeout: 3000,

      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      watch: false,
      pmx: true,
      automation: true,
      treekill: true
    },
    {
      name: 'auto-reload-monitor',
      script: './auto-reload-monitor.js',
      instances: 1,
      exec_mode: 'fork',

      env: {
        NODE_ENV: 'production'
      },

      max_memory_restart: '200M',
      node_args: '--max-old-space-size=128',

      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 3000,

      kill_timeout: 5000,

      autorestart: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      watch: false,
      pmx: false,
      automation: false,
      treekill: true
    }
  ]
};
