import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import type { AppLogger } from './logger';
import type { SecurityProvider } from './security';
import { RouteRegistry } from './routing/route-registry';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options';

interface RouteHandler {
  method: HttpMethod;
  path: string;
  handler: (req: express.Request, res: express.Response) => void | Promise<void>;
  secure?: boolean;
  middlewares?: express.RequestHandler[];
}

interface SimpleController {
  route: string;
  handlers: RouteHandler[];
}

interface AdvancedController {
  route: string;
  init: (
    router: express.Router,
    logger: AppLogger,
    security: SecurityProvider
  ) => void | Promise<void>;
}

type ControllerModule = SimpleController | AdvancedController;

/**
 * Loads and registers all controller modules in the configured directory.
 */
export class ControllerLoader {
  private readonly routeRegistry = new RouteRegistry();

  constructor(
    private controllerPath: string,
    private logger: AppLogger,
    private security: SecurityProvider
  ) {}

  async load(app: express.Application, contextRoot: string): Promise<void> {
    const fullPath = path.resolve(this.controllerPath);

    try {
      const files = await fs.readdir(fullPath);

      for (const file of files) {
        const ext = path.extname(file);
        if (!['.js', '.ts'].includes(ext)) continue;

        const controllerFile = path.join(fullPath, file);
        this.logger.app.debug(`Loading controller: ${file}`);

        try {
          const mod = (await import(controllerFile)).default as ControllerModule;
          const router = express.Router();

          if ('init' in mod) {
            await mod.init(router, this.logger, this.security);
          } else if ('handlers' in mod) {
            for (const h of mod.handlers) {
              const method = h.method.toLowerCase() as HttpMethod;
              const args: express.RequestHandler[] = [];

              if (h.middlewares) {
                args.push(...h.middlewares);
              }

              if (h.secure !== false) {
                args.push(this.security.guard());
              }

              args.push(h.handler);
              router[method](h.path, ...args);

              // Register route for analysis
              this.routeRegistry.register({
                method,
                path: path.posix.join(contextRoot, mod.route, h.path),
                secure: h.secure !== false,
                source: file,
              });
            }
          } else {
            throw new Error('Controller must export either "init()" or "handlers[]".');
          }

          app.use(path.posix.join(contextRoot, mod.route), router);
          this.logger.app.info(`Controller mounted at ${contextRoot}${mod.route}`);
        } catch (err) {
          this.logger.app.error(`Failed to load controller ${file}:`, err);
        }
      }

      // Detect and log route conflicts after all are registered
      const conflicts = this.routeRegistry.detectConflicts();
      for (const msg of conflicts) {
        this.logger.app.warn(`[RouteRegistry] ${msg}`);
      }

      // Optional: log sorted route list (DEBUG or TRACE only)
      if (this.logger.app.isDebugEnabled()) {
        const sorted = this.routeRegistry.getSorted();
        this.logger.app.debug('[RouteRegistry] Registered Routes:');
        for (const r of sorted) {
          this.logger.app.debug(
            `  [${r.method.toUpperCase()}] ${r.path} (${r.secure ? 'secure' : 'public'})`
          );
        }
      }
    } catch (err) {
      this.logger.app.error('Failed to read controller directory:', err);
      throw err;
    }
  }
}
