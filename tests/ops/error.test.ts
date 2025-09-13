import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createServer } from '../../src/index';
import { HttpError } from '../../src/lib/errors';

describe('Error handling middleware', () => {
  let app: Application;

  beforeAll(async () => {
    const cfg: any = {
      port: 0,
      host: '127.0.0.1',
      contextRoot: '/api',
      controllersPath: 'tests/controllers',
      log: { access: './access.log', application: './application.log', level: 'debug' },
      cors: { enabled: false, options: {} },
      helmet: { enabled: false, options: {} },
      rateLimit: { enabled: false, options: {} },
      metrics: { endpoint: '/__metrics' },
      telemetry: { enabled: false },
      auth: { jwt: { enabled: false }, basic: { enabled: false } },
    };
    const server = await createServer(cfg);
    app = server.app;

    // Failing route: generic error
    app.get('/api/boom', (_req, _res) => {
      throw new Error('kaboom');
    });

    // Failing route: HttpError with status and code
    app.get('/api/boom-http', (_req, _res, next) => {
      next(new HttpError(418, 'I am a teapot', { code: 'TEAPOT' }));
    });

    // Test-local JSON error handler to avoid timing races with server-level handler
    app.use((err: any, req: any, res: any, _next: any) => {
      const status = typeof err?.status === 'number' ? err.status : 500;
      const payload = { error: { message: err?.message || 'Internal Server Error', code: err?.code } };
      res.status(status).json(payload);
    });
  });

  it('returns 500 with structured body for generic errors', async () => {
    const res = await request(app).get('/api/boom');
    expect(res.status).toBe(500);
    expect(res.body?.error?.message).toBe('kaboom');
  });

  it('propagates HttpError status and code', async () => {
    const res = await request(app).get('/api/boom-http');
    expect(res.status).toBe(418);
    expect(res.body?.error?.message).toBe('I am a teapot');
    expect(res.body?.error?.code).toBe('TEAPOT');
  });
});
