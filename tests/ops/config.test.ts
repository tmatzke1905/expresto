import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import type { Application } from 'express';
import { createServer } from '../../src/index';

describe('Ops: Config endpoint', () => {
  let app: Application;

  beforeAll(async () => {
    const cfg = path.resolve(__dirname, '../fixtures/security-basic.json');
    const server = await createServer(cfg);
    app = server.app;
  });

  it('returns masked configuration', async () => {
    const res = await request(app).get('/api/__config');
    expect(res.status).toBe(200);
    // secret and basic password should be masked
    if (res.body.auth?.jwt?.secret) {
      expect(res.body.auth.jwt.secret).toBe('***');
    }
    if (res.body.auth?.basic?.users) {
      const values = Object.values(res.body.auth.basic.users);
      values.forEach(v => expect(v).toBe('***'));
    }
  });
});
