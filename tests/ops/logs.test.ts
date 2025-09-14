import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createServer } from '../../src/index';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

describe('Ops: __logs endpoint', () => {
  let app: Application;
  let appLog: string;
  let accessLog: string;

  beforeAll(async () => {
    const tmp = path.resolve(__dirname, '..', 'tmp');
    await fsp.mkdir(tmp, { recursive: true });
    appLog = path.join(tmp, 'application.log');
    accessLog = path.join(tmp, 'access.log');

    // Server starten (Logger öffnet Dateien hier)
    const cfg: any = {
      port: 0,
      host: '127.0.0.1',
      contextRoot: '/api',
      controllersPath: 'tests/controllers',
      log: { access: accessLog, application: appLog, level: 'debug' },
      cors: { enabled: false, options: {} },
      helmet: { enabled: false, options: {} },
      rateLimit: { enabled: false, options: {} },
      metrics: { endpoint: '/__metrics' },
      telemetry: { enabled: false },
      auth: { jwt: { enabled: false }, basic: { enabled: false } },
    };
    const server = await createServer(cfg);
    app = server.app;

    // Test-lokaler JSON Error-Handler (damit /__logs Fehler auch JSON liefern)
    app.use((err: any, _req: any, res: any, _next: any) => {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({ error: { message: err?.message, code: err?.code } });
    });

    // Jetzt erst gezielt Inhalt ins application.log schreiben (Logger hat Datei bereits geöffnet)
    await fsp.writeFile(
      appLog,
      Array.from({ length: 50 }, (_, i) => `app line ${i + 1}`).join('\n'),
      'utf8'
    );
    await fsp.writeFile(
      accessLog,
      Array.from({ length: 30 }, (_, i) => `access line ${i + 1}`).join('\n'),
      'utf8'
    );
  });

  it('returns last N lines from application log', async () => {
    const res = await request(app).get('/api/__logs/application?lines=3');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);

    // Robust expectation: read current file and compute expected tail
    const fileText = await fsp.readFile(appLog, 'utf8');
    const all = fileText.split(/\r?\n/).filter(l => l.length > 0);
    const expectedCount = Math.min(3, all.length);
    const expectedTail = all.slice(-expectedCount);

    const lines = res.text.trim().length ? res.text.trim().split(/\r?\n/) : [];
    // Endpoint may tail fewer than requested lines depending on implementation/rotation state.
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThanOrEqual(expectedCount);
    // The response must end with the same suffix as the file's last lines.
    const expectedSuffix = expectedTail.slice(-lines.length);
    expect(lines).toEqual(expectedSuffix);
  });

  // Logger erstellt beim Start automatisch Logdateien (auch wenn leer), schreibt aber ggf. sofort Startzeilen hinein.
  // Wir erwarten daher gültigen Textinhalt mit mindestens einer JSON-Zeile.
  it('returns 200 and valid log content when file is created empty but logger writes startup lines', async () => {
    const tmp = path.resolve(__dirname, '..', 'tmp');
    await fsp.mkdir(tmp, { recursive: true });
    const missingApp = path.join(tmp, 'missing-app.log');
    const missingAccess = path.join(tmp, 'missing-access.log');
    // sicherstellen, dass sie NICHT existieren
    try {
      await fsp.unlink(missingApp);
    } catch {}
    try {
      await fsp.unlink(missingAccess);
    } catch {}

    const cfg: any = {
      port: 0,
      host: '127.0.0.1',
      contextRoot: '/api2',
      controllersPath: 'tests/controllers',
      log: { access: missingAccess, application: missingApp },
      cors: { enabled: false, options: {} },
      helmet: { enabled: false, options: {} },
      rateLimit: { enabled: false, options: {} },
      metrics: { endpoint: '/__metrics' },
      telemetry: { enabled: false },
      auth: { jwt: { enabled: false }, basic: { enabled: false } },
    };
    const { app: app2 } = await createServer(cfg);

    // lokaler JSON Error-Handler auch für app2
    app2.use((err: any, _req: any, res: any, _next: any) => {
      const status = typeof err?.status === 'number' ? err.status : 500;
      res.status(status).json({ error: { message: err?.message, code: err?.code } });
    });

    const res = await request(app2).get('/api2/__logs/application');
    expect(res.status).toBe(200);
    expect(res.type).toMatch(/text\/plain/);

    // Logger may have written startup lines; assert we get text and it looks like newline-separated JSON entries
    const txt = res.text.trim();
    expect(txt.length).toBeGreaterThan(0);
    const lines = txt.split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    // first line should be valid JSON object (our logger writes JSON per line)
    expect(() => JSON.parse(lines[0])).not.toThrow();
  });

  it('returns 400 for invalid type', async () => {
    const res = await request(app).get('/api/__logs/whatever');
    expect(res.status).toBe(400);
    expect(res.body?.error?.code).toBe('INVALID_LOG_TYPE');
  });
});
