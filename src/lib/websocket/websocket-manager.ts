import type { Server as HttpServer } from 'node:http';
import { Server as IOServer, type Socket } from 'socket.io';
import type { AppConfig } from '../config';
import type { AppLogger } from '../logger';
import type { EventBus } from '../events';
import type { ServiceRegistry } from '../services/service-registry';
import type { HookManager } from '../hooks';
import { verifyToken, type SupportedHmacAlg } from '../security/jwt';

export class WebSocketManager {
  private readonly io: IOServer;

  private readonly jwtEnabled: boolean;
  private readonly jwtSecret: string;
  private readonly jwtAlgorithm: SupportedHmacAlg;

  constructor(
    server: HttpServer,
    private readonly config: AppConfig,
    private readonly logger: AppLogger,
    private readonly eventBus: EventBus,
    private readonly services?: ServiceRegistry,
    private readonly hooks?: HookManager
  ) {
    // Konfiguration (noch untypisiert, um AppConfig nicht aufzureißen)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wsConfig = ((config as any).websocket ?? {}) as {
      enabled?: boolean;
      path?: string;
      cors?: unknown;
    };

    this.io = new IOServer(server, {
      path: wsConfig.path ?? '/socket.io',
      // cors kann später typisiert werden, wenn du es im AppConfig verankerst
      // @ts-expect-error: wsConfig.cors ist absichtlich lose getypt
      cors: wsConfig.cors,
    });

    const auth = config.auth;
    this.jwtEnabled = auth?.jwt?.enabled ?? true;
    this.jwtSecret = auth?.jwt?.secret || 'default_secret';
    const alg = (auth?.jwt?.algorithm || 'HS512') as string;
    this.jwtAlgorithm = ['HS256', 'HS384', 'HS512'].includes(alg.toUpperCase())
      ? (alg.toUpperCase() as SupportedHmacAlg)
      : 'HS512';

    this.setup();
  }

  private setup(): void {
    // Auth-Middleware für jeden WS-Connect
    this.io.use(async (socket, next) => {
      try {
        if (!this.jwtEnabled) {
          return next();
        }

        const token = this.extractTokenFromHandshake(socket);
        if (!token) {
          this.logger.app.warn('WebSocket: missing auth token');
          return next(new Error('Unauthorized'));
        }

        const payload = await verifyToken(token, this.jwtSecret, this.jwtAlgorithm);
        socket.data.auth = payload;
        return next();
      } catch (err) {
        this.logger.app.warn('WebSocket: auth failed', err);
        return next(new Error('Forbidden'));
      }
    });

    this.io.on('connection', socket => {
      this.logger.app.debug(`WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', reason => {
        this.logger.app.debug(`WebSocket client disconnected: ${socket.id} (${reason})`);
      });
    });
  }

  private extractTokenFromHandshake(socket: Socket): string | undefined {
    // 1. Preferred: handshake.auth.token (socket.io-Standard)
    const auth = socket.handshake.auth;
    if (auth && typeof auth.token === 'string') {
      return auth.token;
    }

    // 2. Query-Parameter ?token=...
    const query = socket.handshake.query;
    if (query && typeof query.token === 'string') {
      return query.token as string;
    }

    // 3. Authorization-Header
    const header = socket.handshake.headers['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice(7);
    }

    return undefined;
  }

  async shutdown(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.io.close(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Zugriff auf das Socket.IO-Serverobjekt für Projekte/Plugins.
   */
  get server(): IOServer {
    return this.io;
  }
}
