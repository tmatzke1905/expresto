import request from 'supertest';
import express from 'express';
import opsController from '../../src/core/ops/ops-controller';

describe('Ops: __routes endpoint', () => {
  const app = express();
  app.use('/api', opsController); // entspricht contextRoot

  it('returns 200 and list of registered routes with required fields', async () => {
    const res = await request(app).get('/api/__routes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    for (const route of res.body) {
      expect(typeof route.method).toBe('string');
      expect(typeof route.fullPath).toBe('string');
      expect(typeof route.secure).toBe('string');
      expect(typeof route.source).toBe('string');
    }
  });
});

describe('Ops: __logs endpoint', () => {
  const app = express();
  app.use('/api', opsController);

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

  it('returns 404 for unknown log type', async () => {
    const res = await request(app).get('/api/__logs/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  it('defaults to 50 lines if lines param is invalid', async () => {
    const res = await request(app).get('/api/__logs/application?lines=not-a-number');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(typeof res.text).toBe('string');
  });
});
