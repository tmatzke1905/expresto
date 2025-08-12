import type { ExtHandler } from '../types';
import type { AppLogger } from '../logger';
import type { AuthConfig } from '../config';
import { verifyToken } from './jwt';
import crypto from 'crypto';

/**
 * SecurityProvider provides access control based on JWT or Basic Auth.
 * Use `guard('basic')` or `guard('jwt')` per route; `guard(true)` means JWT; `guard(false)` disables.
 */
export class SecurityProvider {
  private readonly logger: AppLogger;
  private readonly jwtEnabled: boolean;
  private readonly jwtSecret: string;
  private readonly jwtAlgorithm: string;

  private readonly basicEnabled: boolean;
  private readonly basicUsers?: Record<string, string> | Array<{ username: string; password: string }>; // supports map or array

  constructor(config: AuthConfig | undefined, logger: AppLogger) {
    this.logger = logger;

    // JWT settings
    this.jwtEnabled = config?.jwt?.enabled ?? true;
    this.jwtSecret = config?.jwt?.secret || 'default_secret';
    this.jwtAlgorithm = config?.jwt?.algorithm || 'HS512';

    // Basic settings
    this.basicEnabled = !!config?.basic?.enabled;
    this.basicUsers = (config as any)?.basic?.users;
  }

  /**
   * Returns an Express middleware according to the desired security mode.
   * - 'basic'  -> Basic Auth guard
   * - 'jwt' or true -> JWT guard (if enabled)
   * - false/undefined -> pass-through (no auth)
   */
  guard(mode?: 'basic' | 'jwt' | boolean): ExtHandler {
    if (mode === 'basic') return this.basicGuard();
    if (mode === 'jwt' || mode === true || (mode === undefined && this.jwtEnabled)) return this.jwtGuard();
    // no security
    return (_req, _res, next) => next();
  }

  /** Basic Auth guard. Responds 401 on missing/invalid credentials. */
  private basicGuard(): ExtHandler {
    return (req, res, next) => {
      if (!this.basicEnabled) return next(); // feature off -> skip

      const header = req.headers['authorization'];
      if (!header || !header.startsWith('Basic ')) {
        this.logger.app.warn('BasicAuth: Missing or invalid Authorization header');
        res.set('WWW-Authenticate', 'Basic realm="expresto", charset="UTF-8"');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const base64 = header.slice(6).trim();
      let decoded: string;
      try {
        decoded = Buffer.from(base64, 'base64').toString('utf8');
      } catch {
        this.logger.app.warn('BasicAuth: Cannot decode credentials');
        res.set('WWW-Authenticate', 'Basic realm="expresto", charset="UTF-8"');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const sepIndex = decoded.indexOf(':');
      const username = sepIndex >= 0 ? decoded.slice(0, sepIndex) : '';
      const password = sepIndex >= 0 ? decoded.slice(sepIndex + 1) : '';

      const ok = this.checkBasicCredentials(username, password);
      if (!ok) {
        this.logger.app.warn('BasicAuth: Invalid credentials for user', username);
        res.set('WWW-Authenticate', 'Basic realm="expresto", charset="UTF-8"');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      (req as any).user = { username, auth: 'basic' };
      next();
    };
  }

  /** JWT guard. 401 if missing/invalid header, 403 if token invalid. */
  private jwtGuard(): ExtHandler {
    return (req, res, next) => {
      if (!this.jwtEnabled) return next(); // feature off -> skip

      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.app.warn('JWT: Missing or invalid Authorization header');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = authHeader.substring(7);
      verifyToken(token, this.jwtSecret, this.jwtAlgorithm)
        .then(payload => {
          (req as any).user = payload;
          next();
        })
        .catch(err => {
          this.logger.app.warn('JWT: Invalid token', err);
          res.status(403).json({ error: 'Forbidden' });
        });
    };
  }

  /** Validate credentials against configured users (constant-time compare). */
  private checkBasicCredentials(username: string, password: string): boolean {
    if (!this.basicUsers) return false;

    const compareSafe = (a: string, b: string) => {
      // Ensure both Buffers have same length to avoid timing attacks
      const aBuf = Buffer.from(a);
      const bBuf = Buffer.from(b);
      if (aBuf.length !== bBuf.length) return false;
      return crypto.timingSafeEqual(aBuf, bBuf);
    };

    if (Array.isArray(this.basicUsers)) {
      for (const u of this.basicUsers) {
        if (u.username === username && compareSafe(u.password, password)) return true;
      }
      return false;
    }

    // record form
    const expected = (this.basicUsers as Record<string, string>)[username];
    if (typeof expected !== 'string') return false;
    return compareSafe(expected, password);
  }
}
