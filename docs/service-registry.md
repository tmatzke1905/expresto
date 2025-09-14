

# Service Registry

expRESTo provides a lightweight service registry to share initialized resources between hooks, controllers, and other modules.

---

## Motivation

Many features (e.g., database drivers, message queues) need to be initialized early and reused later.

The service registry solves this by:

- Registering services once (e.g., during the STARTUP hook)
- Making them available to any component via context

---

## Usage

### Registering a service

```ts
Lifecycle.on('STARTUP', async (ctx) => {
  const dbClient = await createPostgresClient(ctx.config.db);
  ctx.services.set('postgres', dbClient);
});
```

### Accessing a service

In a controller or POST_INIT hook:

```ts
Lifecycle.on('POST_INIT', (ctx) => {
  const db = ctx.services.get('postgres');
});
```

---

## API

The registry behaves like a `Map<string, unknown>` and is accessible via `HookContext.services`.

You can:

- `set(key, value)`
- `get(key)`
- `has(key)`
- `delete(key)`

---

## Best Practices

- Use clear, unique keys for each service (e.g., `"postgres"`, `"redis"`)
- Always check `has()` before `get()` if optional
- Avoid circular dependencies between services

---

_Last updated: 2025-09-14_
