import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import type { Application } from 'express';
import { createServer } from '../../src/index';

describe('Security: Basic Auth', () => {
  let app: Application;

  beforeAll(async () => {
    const cfg = path.resolve(__dirname, '../fixtures/security-basic.json');
    const server = await createServer(cfg);
    app = server.app;
  });

  it('denies when credentials missing', async () => {
    const res = await request(app).get('/api/secure/basic');
    expect(res.status).toBe(401);
  });

  it('denies when credentials invalid', async () => {
    const res = await request(app)
      .get('/api/secure/basic')
      .auth('alice', 'wrong', { type: 'basic' });
    expect(res.status).toBe(401);
  });

  it('allows when credentials valid', async () => {
    const res = await request(app)
      .get('/api/secure/basic')
      .auth('alice', 'password123', { type: 'basic' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, type: 'basic' });
  });
});
