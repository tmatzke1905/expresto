import request from 'supertest';
import express, { type Express } from 'express';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

// IMPORTANT: mock config BEFORE importing the ops controller.
vi.mock('../../src/lib/config', () => {
  return {
    getConfig: () => ({
      contextRoot: '/api',
      auth: {
        jwt: {
          enabled: true,
          secret: 'super-secret',
          algorithm: 'HS256',
        },
        basic: {
          enabled: true,
          password: 'p4ssw0rd',
        },
      },
      nested: {
        token: 'abc',
        apiKey: 'def',
        deep: [{ key: 'ghi' }],
      },
    }),
  };
});

async function createApp(): Promise<Express> {
  const mod = await import('../../src/core/ops/ops-controller.js');
  const opsController = mod.opsController;

  const tmp = path.resolve(__dirname, '..', 'tmp');
  await fsp.mkdir(tmp, { recursive: true });

  const appLog = path.join(tmp, 'config.application.log');
  const accessLog = path.join(tmp, 'config.access.log');

  await fsp.writeFile(
    appLog,
    Array.from({ length: 60 }, (_, i) => `app line ${i + 1}`).join('\n'),
    'utf8'
  );
  await fsp.writeFile(
    accessLog,
    Array.from({ length: 20 }, (_, i) => `access line ${i + 1}`).join('\n'),
    'utf8'
  );

  const app = express();
  app.locals.config = { log: { application: appLog, access: accessLog } };
  app.use('/api', opsController); // entspricht contextRoot
  return app;
}

describe('Ops: __routes endpoint', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('returns 200 and list of registered routes with required fields', async () => {
    const res = await request(app).get('/api/__routes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const route of res.body) {
      expect(typeof route.method).toBe('string');
      expect(typeof route.path).toBe('string');
      expect(['jwt', 'basic', 'none']).toContain(route.secure);
      expect(typeof route.source).toBe('string');
    }
  });
});

describe('Ops: __config endpoint', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('returns 200 and redacts secrets recursively', async () => {
    const res = await request(app).get('/api/__config');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/application\/json/);

    // shape
    expect(res.body).toHaveProperty('contextRoot');
    expect(res.body).toHaveProperty('auth');

    // redaction (keys containing: secret, password, token, key)
    expect(res.body.auth.jwt.secret).toBe('***');
    expect(res.body.auth.basic.password).toBe('***');
    expect(res.body.nested.token).toBe('***');
    expect(res.body.nested.apiKey).toBe('***');
    expect(res.body.nested.deep[0].key).toBe('***');
  });
});

describe('Ops: __logs endpoint', () => {
  let app: Express;

  beforeAll(async () => {
    app = await createApp();
  });

  it('returns application log content with default line count', async () => {
    const res = await request(app).get('/api/__logs/application');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(typeof res.text).toBe('string');
  });

  it('returns access log content with ?lines=2', async () => {
    const res = await request(app).get('/api/__logs/access?lines=2');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(typeof res.text).toBe('string');
  });

  it('returns 400 for unknown log type', async () => {
    const res = await request(app).get('/api/__logs/unknown');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toHaveProperty('code', 'INVALID_LOG_TYPE');
  });

  it('defaults to 50 lines if lines param is invalid', async () => {
    const res = await request(app).get('/api/__logs/application?lines=not-a-number');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(typeof res.text).toBe('string');
  });
});
