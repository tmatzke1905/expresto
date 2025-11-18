import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import type { Application } from 'express';
import { createServer } from '../../src/index';

/**
 * Validates that /api/__routes lists the registered routes coming from
 * tests/controllers/secure-controller.ts
 */
describe('Ops: Routes introspection', () => {
  let app: Application;

  beforeAll(async () => {
    const cfg = path.resolve(__dirname, '../fixtures/security-basic.json');
    const server = await createServer(cfg);
    app = server.app;
  });

  it('lists registered routes with method, fullPath and security mode', async () => {
    const res = await request(app).get('/api/__routes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const paths = res.body.map((r: any) => r.fullPath);
    expect(paths).toContain('/api/secure/basic');
    expect(paths).toContain('/api/secure/jwt');

    const basic = res.body.find((r: any) => r.fullPath === '/api/secure/basic');
    const jwt = res.body.find((r: any) => r.fullPath === '/api/secure/jwt');

    expect(basic.method.toLowerCase()).toBe('get');
    expect(jwt.method.toLowerCase()).toBe('get');

    expect(basic.secure).toBe('basic');
    expect(jwt.secure).toBe('jwt');
  });
});
