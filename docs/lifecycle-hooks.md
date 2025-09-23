# Lifecycle Hooks

expRESTo provides a structured hook system that lets you attach custom logic to key lifecycle events such as:

- Startup
- Express Initialization
- Shutdown

---

## Available Hook Points

| Hook              | Description |
|------------------|-------------|
| `BEFORE_STARTUP`  | Called before STARTUP; use to prepare or enrich configuration (e.g. load config from DB) or minimal resources. |
| `STARTUP`         | Called before Express is initialized, but after configuration is loaded |
| `PRE_INIT`        | Called immediately before Express middlewares and controllers are mounted |
| `POST_INIT`       | Called after everything is mounted and ready to serve requests |
| `SHUTDOWN`        | Called when the application is terminating (e.g., SIGTERM) |

---

## Registering a Hook

You can register a hook function using the `Lifecycle` module:

```ts
import { Lifecycle, HookContext } from '../lib/lifecycle';

Lifecycle.on('STARTUP', async (ctx: HookContext) => {
  ctx.logger.info('Startup logic executing');
  // e.g. initialize DB, register services
});
```

The `BEFORE_STARTUP` hook is suitable for preparing configuration before services start.

Hook functions can be `async` and receive a `HookContext` object containing:

- The logger
- The loaded config
- Access to the service registry
- Express app reference (only in PRE/POST_INIT)

---

## Failing a Hook

If a hook throws an error during `STARTUP` or `PRE_INIT`, the server will **not** start. This ensures:

- Invalid services or corrupted state cannot proceed
- Fatal misconfiguration is caught early

---

## Use Cases

- Database connection pools
- Service registration
- Warm-up logic
- Graceful shutdown handlers
- Clustering coordination
- Metrics exporter setup

---

_Last updated: 2025-09-14_
