import type { RequestHandler } from 'express';
import type { AppLogger } from '../logger';
import type { AuthConfig } from '../config';
import { verifyToken } from './jwt';

/**
 * SecurityProvider provides basic access control based on JWT or Basic Auth.
 */
export class SecurityProvider {
  private readonly logger: AppLogger;
  private readonly jwtEnabled: boolean;
  private readonly secret: string;
  private readonly algorithm: string;

  constructor(config: AuthConfig | undefined, logger: AppLogger) {
    this.logger = logger;
    this.jwtEnabled = config?.jwt?.enabled ?? true;
    this.secret = config?.jwt?.secret || 'default_secret';
    this.algorithm = config?.jwt?.algorithm || 'HS512';
  }

  /**
   * Express middleware for guarding routes using JWT
   */
  guard(): RequestHandler {
    return async (req, res, next) => {
      if (!this.jwtEnabled) return next();

      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.app.warn('Missing or invalid Authorization header');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.substring(7);
      try {
        const payload = await verifyToken(token, this.secret, this.algorithm);
        (req as any).user = payload; // optionally attach to request
        next();
      } catch (err) {
        this.logger.app.warn('Invalid token:', err);
        return res.status(403).json({ error: 'Forbidden' });
      }
    };
  }
}
