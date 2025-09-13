import type { RequestHandler } from 'express';
import crypto from 'crypto';
import type { AppLogger } from '../logger';
import type { AuthConfig } from '../config';
import { verifyToken, type SupportedHmacAlg } from './jwt';

/**
 * SecurityProvider provides access control via JWT or Basic Auth.
 *
 * Supports:
 * - JWT (default): JSON Web Token authentication.
 * - Basic Auth: HTTP Basic Authentication.
 *
 * Usage of `guard` method:
 * - guard('basic')        -> Basic Auth guard.
 * - guard('jwt') or true  -> JWT guard (explicit request always enforces JWT).
 * - guard(false) or undefined -> passthrough (no authentication; `undefined` uses global default).
 *
 * Configuration:
 * - `auth.jwt`:   { secret?, algorithm?, enabled? }  // algorithm: HS256|HS384|HS512 (default HS512)
 * - `auth.basic`: { enabled?, users? }               // users: Record<string,string> | {username,password}[]
 */
export class SecurityProvider {
  private readonly logger: AppLogger;

  // JWT
  private readonly jwtEnabled: boolean;
  private readonly jwtSecret: string;
  private readonly jwtAlgorithm: SupportedHmacAlg;

  // Basic
  private readonly basicEnabled: boolean;
  private readonly basicUsers?:
    | Record<string, string>
    | Array<{ username: string; password: string }>;

  constructor(config: AuthConfig | undefined, logger: AppLogger) {
    this.logger = logger;

    // JWT settings (from config.auth.jwt)
    // enabled defaults to true if not specified
    this.jwtEnabled = config?.jwt?.enabled ?? true;
    this.jwtSecret = config?.jwt?.secret || 'default_secret';
    // normalize algorithm to a safe, supported HMAC algorithm
    const alg = (config?.jwt?.algorithm || 'HS512') as string;
    this.jwtAlgorithm = ['HS256', 'HS384', 'HS512'].includes(alg.toUpperCase())
      ? (alg.toUpperCase() as SupportedHmacAlg)
      : 'HS512';

    // Basic settings (from config.auth.basic)
    // enabled defaults to false if not specified
    this.basicEnabled = !!config?.basic?.enabled;
    this.basicUsers = (config as any)?.basic?.users;
  }

  /**
   * Route guard factory.
   * - 'basic' -> Basic Auth guard
   * - 'jwt' or true -> JWT guard (explicitly enforced)
   * - false/undefined -> no guard (undefined = use global default below)
   */
  guard(mode?: 'basic' | 'jwt' | boolean): RequestHandler {
    if (mode === 'basic') return this.basicGuard();

    // Explicit JWT or mode unspecified but globally enabled
    if (mode === 'jwt' || mode === true || (mode === undefined && this.jwtEnabled)) {
      return this.jwtGuard();
    }

    // no auth
    return (_req, _res, next) => next();
  }

  /** Basic Auth middleware (401 on missing/invalid) */
  private basicGuard(): RequestHandler {
    return (req, res, next) => {
      if (!this.basicEnabled) return next(); // feature off -> skip

      const header = req.headers['authorization'];
      if (!header || !header.startsWith('Basic ')) {
        this.logger.app.warn('BasicAuth: Missing or invalid Authorization header');
        // 401 Unauthorized: missing or malformed Basic Auth header
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
        // 401 Unauthorized: invalid base64 credentials
        res.set('WWW-Authenticate', 'Basic realm="expresto", charset="UTF-8"');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const i = decoded.indexOf(':');
      const username = i >= 0 ? decoded.slice(0, i) : '';
      const password = i >= 0 ? decoded.slice(i + 1) : '';

      if (!this.checkBasicCredentials(username, password)) {
        this.logger.app.warn('BasicAuth: Invalid credentials for user', username);
        // 401 Unauthorized: credentials invalid
        res.set('WWW-Authenticate', 'Basic realm="expresto", charset="UTF-8"');
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      (req as any).user = { username, auth: 'basic' };
      next();
    };
  }

  /** JWT middleware (401 when header missing; 403 when token invalid) */
  private jwtGuard(): RequestHandler {
    return (req, res, next) => {
      if (!this.jwtEnabled) return next(); // feature off -> skip

      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        this.logger.app.warn('JWT: Missing or invalid Authorization header');
        // 401 Unauthorized: missing or malformed Bearer token
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
          // 403 Forbidden: token invalid or expired
          res.status(403).json({ error: 'Forbidden' });
        });
    };
  }

  /** Constant-time comparison for Basic credentials against configured users. */
  private checkBasicCredentials(username: string, password: string): boolean {
    if (!this.basicUsers) return false;

    const safeEq = (a: string, b: string) => {
      const ab = Buffer.from(a);
      const bb = Buffer.from(b);
      if (ab.length !== bb.length) return false;
      return crypto.timingSafeEqual(ab, bb);
    };

    if (Array.isArray(this.basicUsers)) {
      for (const u of this.basicUsers) {
        if (u.username === username && safeEq(u.password, password)) return true;
      }
      return false;
    }

    // Record form { username: password }
    const expected = (this.basicUsers as Record<string, string>)[username];
    if (typeof expected !== 'string') return false;
    return safeEq(expected, password);
  }
}
