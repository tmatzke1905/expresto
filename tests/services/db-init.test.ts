import { describe, it, expect, beforeEach } from 'vitest';
import { HookManager, LifecycleHook, type HookContext } from '../../src/lib/hooks';
import { ServiceRegistry } from '../../src/lib/services/service-registry';
import type { AppConfig } from '../../src/lib/config';
import type { AppLogger } from '../../src/lib/logger';

// --- Fake DB client used only for this test ---
class FakeDbClient {
  public connected = false;
  public disconnected = false;

  async connect(): Promise<void> {
    await new Promise(res => setTimeout(res, 5));
    this.connected = true;
  }
  async disconnect(): Promise<void> {
    await new Promise(res => setTimeout(res, 5));
    this.disconnected = true;
    this.connected = false;
  }
}

// --- Minimal test logger implementing AppLogger shape ---
const testLogger: AppLogger = {
  app: {
    // @ts-expect-error keep minimal methods used in code
    info: () => {},
    // @ts-expect-error
    warn: () => {},
    // @ts-expect-error
    error: () => {},
    // @ts-expect-error
    trace: () => {},
    // @ts-expect-error catch-all for log4js.Logger shape
    log: () => {},
    // @ts-expect-error unused
    level: 'INFO',
  },
  access: {
    // @ts-expect-error
    info: () => {},
    // @ts-expect-error
    warn: () => {},
    // @ts-expect-error
    error: () => {},
    // @ts-expect-error
    trace: () => {},
    // @ts-expect-error
    log: () => {},
    // @ts-expect-error unused
    level: 'INFO',
  },
} as unknown as AppLogger;

describe('DB init via Hooks (STARTUP/SHUTDOWN)', () => {
  let hooks: HookManager;
  let services: ServiceRegistry;
  let ctx: HookContext;

  beforeEach(() => {
    hooks = new HookManager();
    services = new ServiceRegistry();

    // Minimal viable config for context
    const config: AppConfig = {
      port: 0,
      host: '127.0.0.1',
      contextRoot: '/api',
      controllersPath: './tests/controllers',
      log: {
        access: './logs/access.log',
        application: './logs/application.log',
        level: 'ERROR',
        traceRequests: false,
      },
      cors: { enabled: true, options: { origin: '*' } },
      helmet: { enabled: true, options: {} },
      rateLimit: { enabled: false, options: {} },
      cluster: { enabled: false },
      metrics: { endpoint: '/__metrics' },
      auth: {
        jwt: { enabled: false },
        basic: { enabled: false },
      },
    };

    ctx = {
      config,
      logger: testLogger,
      eventBus: { emit: () => {}, on: () => {} } as any,
      services,
    };
  });

  it('registers DB client on STARTUP and disconnects on SHUTDOWN', async () => {
    // Arrange: register hooks that init/cleanup the DB client
    hooks.on(LifecycleHook.STARTUP, async c => {
      const db = new FakeDbClient();
      await db.connect();
      c.services.set('db', db);
      c.logger.app.info('DB connected');
    });

    hooks.on(LifecycleHook.SHUTDOWN, async c => {
      const db = c.services.get<FakeDbClient>('db');
      if (db) {
        await db.disconnect();
        c.logger.app.info('DB disconnected');
      }
    });

    // Act: startup
    await hooks.emit(LifecycleHook.STARTUP, ctx);

    // Assert after startup
    expect(services.has('db')).toBe(true);
    const dbAfterStart = services.get<FakeDbClient>('db');
    expect(dbAfterStart?.connected).toBe(true);
    expect(dbAfterStart?.disconnected).toBe(false);

    // Act: shutdown
    await hooks.emit(LifecycleHook.SHUTDOWN, ctx);

    // Assert after shutdown
    const dbAfterShutdown = services.get<FakeDbClient>('db');
    expect(dbAfterShutdown?.connected).toBe(false);
    expect(dbAfterShutdown?.disconnected).toBe(true);
  });
});
