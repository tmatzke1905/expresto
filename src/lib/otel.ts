import type { RequestHandler } from 'express';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import type { AppConfig } from './config';
import type { AppLogger } from './logger';

import type { Tracer } from '@opentelemetry/api';
let __tracerOverride: Tracer | undefined;

export function __setTracerForTests(tracer: Tracer | undefined) {
  __tracerOverride = tracer;
}

export function otelMiddleware(config: AppConfig, logger: AppLogger): RequestHandler {
  if (!config.telemetry?.enabled) {
    return (_req, _res, next) => next();
  }

  const tracer = __tracerOverride || trace.getTracer('expresto', '1.0.0');

  return (req, res, next) => {
    const route = (req as any).route?.path || req.path || 'unknown';
    const spanName = `expresto.http_request ${req.method} ${route}`;

    tracer.startActiveSpan(spanName, span => {
      try {
        span.setAttribute('http.method', req.method);
        span.setAttribute('http.route', route);
        span.setAttribute('http.target', req.originalUrl || req.url || route);
        span.setAttribute('http.scheme', req.protocol);
        span.setAttribute('net.host.name', req.hostname);
        if (config.telemetry?.serviceName) {
          span.setAttribute('service.name', config.telemetry.serviceName);
        }

        const onFinish = () => {
          res.removeListener('finish', onFinish);
          res.removeListener('close', onClose);
          const status = res.statusCode;
          span.setAttribute('http.status_code', status);
          if (status >= 500) {
            span.setStatus({ code: SpanStatusCode.ERROR });
          } else {
            span.setStatus({ code: SpanStatusCode.UNSET });
          }
          span.end();
        };

        const onClose = () => {
          res.removeListener('finish', onFinish);
          res.removeListener('close', onClose);
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'socket closed' });
          span.end();
        };

        res.on('finish', onFinish);
        res.on('close', onClose);

        next();
      } catch (err) {
        try {
          span.setStatus({ code: SpanStatusCode.ERROR });
          span.end();
        } catch {}
        logger.app.warn('otelMiddleware error', err as any);
        next();
      }
    });
  };
}
