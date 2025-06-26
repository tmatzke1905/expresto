import express from 'express';
import client from 'prom-client';
import type { AppLogger } from './logger';
import type { AppConfig } from './config';

// Create a default metrics registry
const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const httpRequestCounter = new client.Counter({
  name: 'expresto_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

const httpRequestDuration = new client.Histogram({
  name: 'expresto_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const routeGauge = new client.Gauge({
  name: 'expresto_routes_total',
  help: 'Number of registered routes',
  labelNames: ['method', 'secure']
});

const conflictGauge = new client.Gauge({
  name: 'expresto_route_conflicts_total',
  help: 'Number of conflicting route registrations'
});

const serviceGauge = new client.Gauge({
  name: 'expresto_services_total',
  help: 'Number of registered services',
  labelNames: ['type']
});

registry.registerMetric(httpRequestCounter);
registry.registerMetric(httpRequestDuration);
registry.registerMetric(routeGauge);
registry.registerMetric(conflictGauge);
registry.registerMetric(serviceGauge);

export function createPrometheusRouter(config: AppConfig, logger: AppLogger): express.Router {
  const router = express.Router();
  const endpoint = config.metrics?.endpoint || '/__metrics';

  router.get(endpoint, async (_req, res) => {
    try {
      res.set('Content-Type', registry.contentType);
      res.send(await registry.metrics());
    } catch (err) {
      logger.app.error('Failed to collect Prometheus metrics:', err);
      res.status(500).end();
    }
  });

  logger.app.info(`Prometheus metrics endpoint mounted at ${endpoint}`);
  return router;
}


export function prometheusMiddleware(): express.RequestHandler {
  return (req, res, next) => {
    const start = process.hrtime();

    res.on('finish', () => {
      const duration = process.hrtime(start);
      const seconds = duration[0] + duration[1] / 1e9;

      const route = req.route?.path || req.path || 'unknown';

      httpRequestCounter.inc({
        method: req.method,
        route,
        status: res.statusCode
      });

      httpRequestDuration.observe({
        method: req.method,
        route,
        status: res.statusCode
      }, seconds);
    });

    next();
  };
}

export function updateRouteMetrics(routes: { method: string; secure: boolean }[], conflicts: number) {
  routeGauge.reset();
  const counter = new Map<string, number>();

  for (const route of routes) {
    const key = `${route.method}|${route.secure}`;
    counter.set(key, (counter.get(key) || 0) + 1);
  }

  for (const [key, value] of counter.entries()) {
    const [method, secure] = key.split('|');
    routeGauge.set({ method, secure }, value);
  }

  conflictGauge.set(conflicts);
}

export function updateServiceMetrics(serviceTypes: string[]) {
  serviceGauge.reset();
  const counter = new Map<string, number>();

  for (const type of serviceTypes) {
    counter.set(type, (counter.get(type) || 0) + 1);
  }

  for (const [type, count] of counter.entries()) {
    serviceGauge.set({ type }, count);
  }
}
