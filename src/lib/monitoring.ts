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
  buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

registry.registerMetric(httpRequestCounter);
registry.registerMetric(httpRequestDuration);

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
