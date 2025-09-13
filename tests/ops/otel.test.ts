// tests/ops/otel.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { createServer } from '../../src/index';
import { __setTracerForTests } from '../../src/lib/otel';

// --- Minimal Fake-OTel --- //
type Attrs = Record<string, unknown>;

class FakeSpan {
  public name: string;
  public attributes: Attrs = {};
  public status?: { code: number; message?: string };
  public ended = false;

  constructor(name: string) {
    this.name = name;
  }
  setAttribute(k: string, v: unknown) {
    this.attributes[k] = v;
  }
  setStatus(s: { code: number; message?: string }) {
    this.status = s;
  }
  end() {
    this.ended = true;
  }
}

class FakeTracer {
  public created: FakeSpan[] = [];
  startActiveSpan<T>(name: string, fn: (span: FakeSpan) => T): T {
    const span = new FakeSpan(name);
    this.created.push(span);
    try {
      const res = fn(span);
      return res;
    } finally {
      // noop: span.end() wird in der Middleware aufgerufen
    }
  }
}

describe('Ops: OpenTelemetry middleware (with fake tracer)', () => {
  let app: Application;
  const tracer = new FakeTracer();

  beforeAll(async () => {
    // Tracer in Middleware injizieren
    __setTracerForTests(tracer as any);

    // Minimal gültige AppConfig direkt übergeben
    const cfg: any = {
      port: 0,
      host: '127.0.0.1',
      contextRoot: '/api',
      controllersPath: 'tests/controllers',
      log: {
        access: './access.log',
        application: './application.log',
        level: 'debug',
        traceRequests: false,
      },
      cors: { enabled: false, options: {} },
      helmet: { enabled: false, options: {} },
      rateLimit: { enabled: false, options: {} },
      metrics: { endpoint: '/__metrics' },
      telemetry: { enabled: true, serviceName: 'expresto-test' },
      auth: { jwt: { enabled: false }, basic: { enabled: false } },
    };

    const server = await createServer(cfg);
    app = server.app;
  });

  afterAll(() => {
    __setTracerForTests(undefined);
  });

  it('creates exactly one span for a request and sets basic attributes', async () => {
    const before = tracer.created.length;

    await request(app).get('/api/__health');

    const after = tracer.created.length;
    expect(after).toBeGreaterThan(before);

    const span = tracer.created[after - 1];
    expect(span).toBeTruthy();
    expect(span.name).toContain('expresto.http_request GET ');

    // Attribute grob prüfen
    expect(span.attributes['http.method']).toBe('GET');
    expect(typeof span.attributes['http.target']).toBe('string');
    expect(typeof span.attributes['http.route']).toBe('string');
    expect(span.attributes['service.name']).toBe('expresto-test');
  });
});
