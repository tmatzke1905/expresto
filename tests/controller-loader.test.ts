import type { Application } from 'express';
import request from 'supertest';
import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import { createServer } from '../src/index';

describe('ControllerLoader and example endpoint', () => {
  let app: Application;

  beforeAll(async () => {
    // Starte Server mit Test-Konfiguration
    const configPath = path.resolve(__dirname, './fixtures/integration-config.json');
    const server = await createServer(configPath);
    app = server.app;
  });

  it('should respond to GET /api/ping/ with pong', async () => {
    const response = await request(app).get('/api/ping/');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ pong: true });
  });
});
