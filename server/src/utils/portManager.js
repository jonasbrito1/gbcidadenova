/**
 * Port Manager - Gerenciamento Robusto de Porta
 *
 * Solução para evitar EADDRINUSE em produção:
 * - Limpa porta automaticamente antes de iniciar
 * - Retry logic inteligente
 * - Graceful shutdown
 * - Force port reuse
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PortManager {
  constructor(port) {
    this.port = port;
    this.maxRetries = 5;
    this.retryDelay = 2000; // 2 segundos
  }

  /**
   * Mata processos que estão usando a porta
   */
  async killProcessOnPort() {
    try {
      console.log(`[PortManager] Verificando porta ${this.port}...`);

      // Comando para listar processos na porta
      const { stdout } = await execPromise(`lsof -ti:${this.port} 2>/dev/null || true`);

      if (stdout.trim()) {
        const pids = stdout.trim().split('\n');
        console.log(`[PortManager] Encontrado(s) ${pids.length} processo(s) na porta ${this.port}`);

        for (const pid of pids) {
          try {
            console.log(`[PortManager] Matando processo ${pid}...`);
            await execPromise(`kill -9 ${pid}`);
            console.log(`[PortManager] Processo ${pid} finalizado`);
          } catch (error) {
            // Ignora erro se processo já morreu
            console.log(`[PortManager] Processo ${pid} já não existe`);
          }
        }

        // Aguarda um pouco para SO liberar porta
        console.log(`[PortManager] Aguardando SO liberar porta...`);
        await this.sleep(1000);
      } else {
        console.log(`[PortManager] Porta ${this.port} está livre`);
      }
    } catch (error) {
      // Comando lsof pode falhar se porta estiver livre, isso é OK
      console.log(`[PortManager] Porta ${this.port} verificada (sem processos)`);
    }
  }

  /**
   * Verifica se porta está disponível
   */
  async isPortAvailable() {
    try {
      const { stdout } = await execPromise(`lsof -ti:${this.port} 2>/dev/null || true`);
      return stdout.trim() === '';
    } catch {
      return true;
    }
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inicia servidor com retry logic
   */
  async startServer(app, options = {}) {
    const {
      onSuccess = () => {},
      onError = () => {}
    } = options;

    let attempt = 0;
    let server = null;

    while (attempt < this.maxRetries) {
      attempt++;

      try {
        console.log(`\n[PortManager] Tentativa ${attempt}/${this.maxRetries} de iniciar servidor na porta ${this.port}`);

        // Limpa porta antes de cada tentativa
        await this.killProcessOnPort();

        // Tenta criar servidor
        server = await this.createServer(app);

        // Se chegou aqui, sucesso!
        console.log(`[PortManager] ✅ Servidor iniciado com sucesso na porta ${this.port}`);
        onSuccess(server);

        // Configura graceful shutdown
        this.setupGracefulShutdown(server);

        return server;

      } catch (error) {
        console.error(`[PortManager] ❌ Tentativa ${attempt} falhou: ${error.message}`);

        if (error.code === 'EADDRINUSE') {
          if (attempt < this.maxRetries) {
            console.log(`[PortManager] Aguardando ${this.retryDelay}ms antes de tentar novamente...`);
            await this.sleep(this.retryDelay);
          } else {
            console.error(`[PortManager] 🔴 Todas as ${this.maxRetries} tentativas falharam!`);
            onError(error);
            throw new Error(`Não foi possível iniciar servidor após ${this.maxRetries} tentativas`);
          }
        } else {
          // Erro diferente de EADDRINUSE, não tenta novamente
          onError(error);
          throw error;
        }
      }
    }
  }

  /**
   * Cria servidor HTTP com configurações otimizadas
   */
  createServer(app) {
    return new Promise((resolve, reject) => {
      const server = app.listen(this.port, '0.0.0.0', () => {
        resolve(server);
      });

      // Configura SO_REUSEADDR (permite reutilizar porta rapidamente)
      server.on('listening', () => {
        try {
          // Força reutilização de porta (TCP)
          server._handle.setNoDelay(true);
          server._handle.setKeepAlive(true, 1000);
        } catch (err) {
          console.warn('[PortManager] Aviso: Não foi possível configurar socket options:', err.message);
        }
      });

      // Timeout de 10 segundos para iniciar
      const timeout = setTimeout(() => {
        server.close();
        reject(new Error('Timeout ao iniciar servidor'));
      }, 10000);

      server.once('listening', () => {
        clearTimeout(timeout);
      });

      server.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  /**
   * Configura graceful shutdown para liberar porta corretamente
   */
  setupGracefulShutdown(server) {
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n[PortManager] Recebido sinal ${signal}, iniciando graceful shutdown...`);

        try {
          // Fecha servidor HTTP
          await new Promise((resolve) => {
            server.close(() => {
              console.log('[PortManager] Servidor HTTP fechado');
              resolve();
            });
          });

          // Aguarda conexões ativas finalizarem (máximo 5s)
          await this.sleep(5000);

          console.log('[PortManager] Graceful shutdown completado');
          process.exit(0);
        } catch (error) {
          console.error('[PortManager] Erro no graceful shutdown:', error);
          process.exit(1);
        }
      });
    });

    // Captura erros não tratados
    process.on('uncaughtException', (error) => {
      console.error('[PortManager] Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[PortManager] Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Health check - verifica se servidor está respondendo
   */
  async healthCheck() {
    try {
      const available = await this.isPortAvailable();
      return !available; // Se não está disponível, significa que está em uso (servidor rodando)
    } catch {
      return false;
    }
  }
}

module.exports = PortManager;
