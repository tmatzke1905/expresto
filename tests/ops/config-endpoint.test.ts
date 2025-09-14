import express from 'express';
import request from 'supertest';
import { getConfig, initConfig } from '../../src/lib/config';
import { createServer } from '../../src';

describe('Ops: __config endpoint', () => {
  let app: express.Express;

  beforeAll(async () => {
    await initConfig('./tests/config/basic.json'); // ggf. Pfad anpassen
    const server = await createServer(getConfig());
    app = server.app;
  });

  it('returns 200 and includes expected config structure', async () => {
    const res = await request(app).get('/api/__config');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('contextRoot');
    expect(res.body).toHaveProperty('log');
    expect(res.body).toHaveProperty('port');
  });
});
