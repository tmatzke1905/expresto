// src/lib/security/security-provider.ts
import { Request, Response, NextFunction } from 'express';
import { jwtVerify, JWTVerifyResult } from 'jose';
import { HttpError } from '../errors';
import type { AppLogger } from '../logger';
import { AuthConfig } from '../config';

export class SecurityProvider {

  constructor(
    private config: AuthConfig,
    private logger: AppLogger,
    private hooks?: any,
    private services?: any,
    private eventBus?: any
  ) {}

  /**
   * Express middleware that checks JWT and applies all registered interceptors
   */
  async middleware(req: Request, res: Response, next: NextFunction) {
    try {
      const token = this.extractToken(req);
      const decoded = await this.verifyToken(token);

      req.auth = decoded;

      // Emit SECURITY hook if any handlers are registered
      if (this.hooks?.emit) {
        await this.hooks.emit('security', {
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
      const secret = this.config.jwt?.secret;
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
