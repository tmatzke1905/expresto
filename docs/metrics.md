

# Metrics and Monitoring

expRESTo includes built-in support for Prometheus and OpenTelemetry metrics.

---

## Prometheus

If enabled in the config, the middleware exposes a Prometheus-compatible endpoint:

```txt
GET /__metrics
```

This endpoint is:

- Outside of the `contextRoot`
- Protected only if the route is not marked as public

### Configuration

```json
"metrics": {
  "enabled": true,
  "endpoint": "/__metrics"
}
```

Metrics are generated using a built-in Prometheus client. They include:

- Request durations
- HTTP status codes
- Request counts per route

---

## OpenTelemetry

expRESTo includes basic OpenTelemetry support. This allows:

- Tracing of incoming HTTP requests
- Custom spans inside controllers
- Export to OTLP/Jaeger/etc. (via external agent)

### Instrumentation Points

- Express middleware
- Controller handlers (custom spans)
- Database calls (via manual instrumentation)

You can use the exposed OpenTelemetry tracer to manually create spans:

```ts
const span = tracer.startSpan('custom-db-call');
...
span.end();
```

> Note: Automatic instrumentation is limited. Full tracing requires external agent setup.

---

## Integration Tips

- Use Prometheus with Grafana for dashboards
- Use Dynatrace, Datadog, or Jaeger with OpenTelemetry
- Avoid enabling both Prometheus and OpenTelemetry scraping on the same endpoint

---

_Last updated: 2025-09-14_
