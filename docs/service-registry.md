# Service Registry

expRESTo provides a lightweight service registry to share initialized resources between hooks, controllers, and other modules.

---

## Motivation

Many features (e.g., database drivers, message queues) require early initialization and safe shutdown.

The service registry solves this by:

- Registering services once during the `INITIALIZE` lifecycle phase
- Making them available to any component via context
- Supporting graceful shutdown of services with `shutdownAll()`
- Allowing rollback on startup failure by removing services

---

## Usage

### Registering a service in `INITIALIZE`

```ts
import { hookManager, LifecycleHook } from 'expresto';

hookManager.on(LifecycleHook.INITIALIZE, async ctx => {
  const dbClient = await createPostgresClient(ctx.config.db);
  ctx.services.set('postgres', dbClient);
});
```

### Accessing a service later

```ts
hookManager.on(LifecycleHook.STARTUP, ctx => {
  const db = ctx.services.get('postgres');
  // Use db client here
});
```


### Graceful shutdown with timeout

```ts
hookManager.on(LifecycleHook.SHUTDOWN, async ctx => {
  try {
    await ctx.services.shutdownAll({ timeoutMs: 30000 }); // 30 seconds timeout
  } catch (error) {
    console.error('Failed to shutdown all services gracefully:', error);
  }
});
```

### Signal handling (SIGTERM / SIGINT)

expRESTo integrates signal handling by default.  
When the process receives `SIGTERM` or `SIGINT`, the framework:

- Logs the shutdown reason
- Executes all registered `SHUTDOWN` hooks
- Calls `ctx.services.shutdownAll({ timeoutMs: 30000 })` to terminate services
- Forces exit if services do not shut down within the timeout

You usually do not need to add this manually, but you can override the behavior if necessary.

### Startup failure rollback

If service initialization fails, remove partially initialized services to prevent inconsistent state:

```ts
hookManager.on(LifecycleHook.INITIALIZE, async ctx => {
  try {
    const cache = await createCacheClient(ctx.config.cache);
    ctx.services.set('cache', cache);

    const dbClient = await createPostgresClient(ctx.config.db);
    ctx.services.set('postgres', dbClient);
  } catch (error) {
    ctx.services.remove('cache'); // rollback partial setup
    throw error; // propagate error to abort startup
  }
});
```

---

## API

The service registry extends a `Map<string, unknown>` with:

- `set(key, value)`
- `get(key)`
- `has(key)`
- `remove(key)` — removes a service explicitly
- `shutdownAll(options?: { timeoutMs?: number })` — calls `.shutdown()` or `.close()` on services if available, with optional timeout
- `entries()` — iterate over all registered services

### Important

- Services should expose a `.shutdown()` or `.close()` method for graceful shutdown; otherwise, a warning is logged.
- Always handle possible missing services using `has()` before `get()`.
- Avoid circular dependencies between services.

---

_Last updated: 2025-09-24_
