// src/lib/security/security-provider.ts
import { Request, Response, NextFunction } from 'express';
import { jwtVerify, JWTVerifyResult } from 'jose';
import { HttpError } from '../errors';
import type { AppLogger } from '../logger';
import type { AppConfig } from '../config';
import type { HookManager } from '../hooks';
import { LifecycleHook } from '../hooks';
import type { ServiceRegistry } from '../services/service-registry';
import type { EventBus } from '../events';

export class SecurityProvider {
  constructor(
    private config: AppConfig,
    private logger: AppLogger,
    private hooks?: HookManager,
    private services?: ServiceRegistry,
    private eventBus?: EventBus
  ) {}

  /**
   * Express middleware that checks JWT and emits SECURITY hook for custom checks.
   */
  async middleware(req: Request, res: Response, next: NextFunction) {
    try {
      const token = this.extractToken(req);
      const decoded = await this.verifyToken(token);

      // Attach decoded payload to request context (req.auth)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).auth = decoded;

      // Emit SECURITY lifecycle hook if handlers are registered
      if (this.hooks && this.services) {
        await this.hooks.emit(LifecycleHook.SECURITY, {
          config: this.config,
          logger: this.logger,
          services: this.services,
          eventBus: this.eventBus,
          request: req,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * Extracts Bearer token from Authorization header
   */
  extractToken(req: Request): string {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Missing or invalid Authorization header');
    }
    return auth.slice(7);
  }

  /**
   * Verifies the JWT token using configured secret or key
   */
  async verifyToken(token: string): Promise<Record<string, unknown>> {
    try {
      const secret = this.config.auth?.jwt?.secret;
      if (!secret) {
        throw new Error('JWT secret is not configured');
      }
      const key: Uint8Array = new TextEncoder().encode(secret);
      const result: JWTVerifyResult = await jwtVerify(token, key);
      return result.payload;
    } catch (err) {
      this.logger.app.warn('JWT verification failed', err);
      throw new HttpError(401, 'Invalid or expired token');
    }
  }
}
