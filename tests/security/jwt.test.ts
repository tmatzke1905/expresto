import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import type { Application } from 'express';
import { createServer } from '../../src/index';
import { SignJWT } from 'jose';

async function makeToken(secret: string) {
  const enc = new TextEncoder();
  const key = enc.encode(secret);
  const jwt = await new SignJWT({ sub: 'user-123', role: 'tester' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(key);
  return jwt;
}

describe('Security: JWT', () => {
  let app: Application;
  const secret = 'testsecret';

  beforeAll(async () => {
    const cfg = path.resolve(__dirname, '../fixtures/security-jwt.json');
    const server = await createServer(cfg);
    app = server.app;
  });

  it('denies when token missing', async () => {
    const res = await request(app).get('/api/secure/jwt');
    expect(res.status).toBe(401);
  });

  it('denies when token invalid', async () => {
    const res = await request(app)
      .get('/api/secure/jwt')
      .set('Authorization', 'Bearer invalid.token.here');
    expect(res.status).toBe(403);
  });

  it('allows with valid token', async () => {
    const token = await makeToken(secret);
    const res = await request(app).get('/api/secure/jwt').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, type: 'jwt' });
  });
});
