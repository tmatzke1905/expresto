import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createServer } from '../../src/index';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

describe('Ops: __logs endpoint', () => {
  let app: Application;
  let appLog: string;
  let accessLog: string;

  beforeAll(async () => {
    const tmp = path.resolve(__dirname, '..', 'tmp');
    await fsp.mkdir(tmp, { recursive: true });
    appLog = path.join(tmp, 'application.log');
    accessLog = path.join(tmp, 'access.log');

    const cfg: any = {
      port: 3001,
      host: '127.0.0.1',
      contextRoot: '/api',
      controllersPath: 'tests/controllers',
      log: { access: accessLog, application: appLog, level: 'debug' },
      cors: { enabled: false, options: {} },
      helmet: { enabled: false, options: {} },
      rateLimit: { enabled: false, options: {} },
      metrics: { endpoint: '/__metrics' },
      telemetry: { enabled: false },
      auth: { jwt: { enabled: false }, basic: { enabled: false } },
    };

    const server = await createServer(cfg);
    app = server.app;

    // JSON Error-Handler (damit /__logs Fehler auch JSON liefern)
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({ error: { message: err?.message, code: err?.code } });
    });

    // Test-Inhalt schreiben
    await fsp.writeFile(
      appLog,
      Array.from({ length: 50 }, (_, i) => `app line ${i + 1}`).join('\n'),
      'utf8'
    );
    await fsp.writeFile(
      accessLog,
      Array.from({ length: 30 }, (_, i) => `access line ${i + 1}`).join('\n'),
      'utf8'
    );
  });

  it('returns last N lines from application log', async () => {
    const res = await request(app).get('/api/__logs/application?lines=3');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);

    const fileText = await fsp.readFile(appLog, 'utf8');
    const all = fileText.split(/\r?\n/).filter((l) => l.length > 0);
    const expectedCount = Math.min(3, all.length);
    const expectedTail = all.slice(-expectedCount);

    const lines = res.text.trim().length ? res.text.trim().split(/\r?\n/) : [];
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(expectedCount);

    const expectedSuffix = expectedTail.slice(-lines.length);
    expect(lines).toEqual(expectedSuffix);
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(app).get('/api/__logs/whatever');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_LOG_TYPE');
  });
});
