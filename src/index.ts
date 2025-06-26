import { updateServiceMetrics } from './lib/monitoring';
import express from 'express';
import { createPrometheusRouter, prometheusMiddleware } from './lib/monitoring';
import { loadConfig, AppConfig } from './lib/config';
import { setupLogger, AppLogger } from './lib/logger';
import { HookManager, LifecycleHook, HookContext } from './lib/hooks';
import { EventBus } from './lib/events';
import { SecurityProvider } from './lib/security';
import { ControllerLoader } from './lib/controller-loader';
import { ServiceRegistry } from './lib/services/service-registry';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import log4js from 'log4js';

let server: import('http').Server | undefined;

/**
 * Creates and configures the expRESTo server asynchronously.
 * @param configInput Path to the middleware config JSON file or an AppConfig object.
 */
export async function createServer(configInput: string | AppConfig) {
  // Load configuration
  let config: AppConfig;
  if (typeof configInput === 'string') {
    config = await loadConfig(configInput);
  } else {
    config = configInput;
  }

  // Initialize logger, hooks, events, services
  const logger = setupLogger(config);
  const hookManager = new HookManager();
  const eventBus = new EventBus();
  const services = new ServiceRegistry();

  // Create express app
  const app = express();

  // Attach Prometheus middleware for per-request metrics
  app.use(prometheusMiddleware());

  // Mount Prometheus metrics endpoint (before contextRoot!)
  app.use(createPrometheusRouter(config, logger));

  const ctx: HookContext = { config, logger, eventBus, services };

  // Startup lifecycle hook
  await hookManager.emit(LifecycleHook.STARTUP, ctx);

  // Update Prometheus metrics after service registration
  updateServiceMetrics(Object.keys(services.getAll()));

  // Register built-in middleware
  app.use(express.json());
  app.use(cors(config.cors?.options || {}));
  app.use(helmet(config.helmet?.options || {}));

  if (config.rateLimit?.enabled) {
    app.use(rateLimit(config.rateLimit.options));
  }

  // Pre-initialization hook
  await hookManager.emit(LifecycleHook.PRE_INIT, ctx);

  // Initialize security provider (e.g. JWT, Basic Auth)
  const security = new SecurityProvider(config.auth, logger);

  // Custom middleware hook
  await hookManager.emit(LifecycleHook.CUSTOM_MIDDLEWARE, ctx);

  // Post-initialization hook
  await hookManager.emit(LifecycleHook.POST_INIT, ctx);

  // Access log middleware
  app.use(log4js.connectLogger(logger.access, { level: 'auto' }));

  // Load and register controllers
  const loader = new ControllerLoader(config.controllersPath, logger, security);
  await loader.load(app, config.contextRoot);

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.app.error('Unhandled error:', err);
    eventBus.emit('error', err);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  // Handle graceful shutdown
  const shutdown = async () => {
    await hookManager.emit(LifecycleHook.SHUTDOWN, ctx);
    if (server) {
      logger.app.info('Shutting down HTTP server...');
      try {
        await new Promise<void>((resolve, reject) => {
          server!.close(err => (err ? reject(err) : resolve()));
        });
      } catch (err) {
        logger.app.error('Error during HTTP server shutdown:', err);
      }
    }
    logger.app.info('expRESTo shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return { app, config, logger, hookManager, eventBus, services };
}

// Allow direct execution as CLI
// This check ensures the server only starts automatically
// when this file is executed directly via `node`, and not when imported as a module.
if (require.main === module) {
  (async () => {
    const { app, config, logger } = await createServer('./middleware.config.json');
    // Start server and capture instance for shutdown
    server = app.listen(config.port, config.host || '0.0.0.0', () => {
      logger.app.info(`expRESTo listening at http://${config.host || '0.0.0.0'}:${config.port}`);
    });
  })();
}
