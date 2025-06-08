import fs from 'fs/promises';
import path from 'path';
import express from 'express';
import type { AppLogger } from './logger';
import type { SecurityProvider } from './security';

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
    } catch (err) {
      this.logger.app.error('Failed to read controller directory:', err);
      throw err;
    }
  }
}
