import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'node:path';
import type { Application } from 'express';
import { createServer } from '../../src/index';

describe('Ops: Prometheus metrics', () => {
  let app: Application;

  beforeAll(async () => {
    const cfg = path.resolve(__dirname, '../fixtures/security-basic.json');
    const server = await createServer(cfg);
    app = server.app;
  });

  it('exposes metrics at configured endpoint', async () => {
    const res = await request(app).get('/__metrics'); // from fixtures
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);
    expect(res.text).toContain('http_requests_total');
    expect(res.text).toContain('http_request_duration_seconds');
    expect(res.text).toContain('http_errors_total');
  });

  it('records a request and shows 404 status label', async () => {
    await request(app).get('/api/does-not-exist');

    const res = await request(app).get('/__metrics');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/status_code="404"/);
  });
});
