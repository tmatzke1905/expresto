import { updateRouteMetrics } from './monitoring';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import type { ExtHandler, SecurityMode } from './types';
import type { AppLogger } from './logger';
import type { SecurityProvider, RouteSecurityMeta } from './security';
import { RouteRegistry } from './routing/route-registry';

type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options';

export type ControllerRouteInfo = {
  method: HttpMethod;
  path: string; // relative handler.path (ohne controller.route)
  fullPath: string; // contextRoot + controller.route + handler.path
  secure: 'basic' | 'jwt' | 'none';
  controller: string; // Dateiname
};

interface RouteHandler {
  method: HttpMethod;
  path: string;
  handler: ExtHandler;
  secure?: SecurityMode;
  middlewares?: ExtHandler[];
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
 * Lädt Controller-Module und registriert deren Routen.
 */
export class ControllerLoader {
  private readonly routeRegistry = new RouteRegistry();
  private registered: ControllerRouteInfo[] = [];

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
              const args: ExtHandler[] = [];

              if (h.middlewares) args.push(...h.middlewares);

              // Security-Mode auflösen -> 'basic' | 'jwt' | 'none'
              const secMode: 'basic' | 'jwt' | 'none' =
                h.secure === 'basic'
                  ? 'basic'
                  : h.secure === 'jwt' || h.secure === true
                    ? 'jwt'
                    : 'none';

              const full = path.posix.join(contextRoot, mod.route, h.path);

              const meta: RouteSecurityMeta = {
                mode: secMode,
                controller: file,
                fullPath: full,
                handlerPath: h.path,
                method,
              };

              // Security-Middleware mit Route-Metadaten einhängen
              args.push(this.security.createMiddleware(meta));

              // Handler registrieren
              args.push(h.handler);
              router[method](h.path, ...args);

              // Für Ops-Endpunkt
              this.registered.push({
                method,
                path: h.path,
                fullPath: full,
                secure: secMode,
                controller: file,
              });

              // Für Konflikt-Check & Metriken
              this.routeRegistry.register({
                method,
                path: full,
                secure: secMode,
                source: file,
              });
            }
          } else {
            throw new Error('Controller must export either "init()" or "handlers[]".');
          }

          app.use(path.posix.join(contextRoot, (mod as any).route), router);
          this.logger.app.info(`Controller mounted at ${contextRoot}${(mod as any).route}`);
        } catch (err) {
          this.logger.app.error(`Failed to load controller ${file}:`, err);
        }
      }

      // Konflikte melden
      const conflicts = this.routeRegistry.detectConflicts();
      for (const msg of conflicts) {
        this.logger.app.warn(`[RouteRegistry] ${msg}`);
      }

      // Metriken aktualisieren (Aggregat nach method/secure)
      const allRoutes = this.routeRegistry.getRoutes();
      const routeInfos = allRoutes.map(r => ({
        method: r.method,
        secure: r.secure,
      }));
      updateRouteMetrics(routeInfos, conflicts.length);

      // Optional: Liste ausgeben
      if (this.logger.app.isDebugEnabled()) {
        const sorted = this.routeRegistry.getSorted();
        this.logger.app.debug('[RouteRegistry] Registered Routes:');
        for (const r of sorted) {
          this.logger.app.debug(`  [${r.method.toUpperCase()}] ${r.path} (${r.secure})`);
        }
      }
    } catch (err) {
      this.logger.app.error('Failed to read controller directory:', err);
      throw err;
    }
  }

  /** Für /__routes Endpoint */
  getRegisteredRoutes(): ControllerRouteInfo[] {
    return [...this.registered];
  }
}
