# Route Registry

The Route Registry keeps track of all registered HTTP routes across all loaded controllers. It is responsible for:

- Storing method, path, security mode, and origin of each route
- Normalizing and sorting routes
- Detecting potential conflicts
- Exposing registered routes through log output and an HTTP endpoint

---

## RegisteredRoute Structure

Each registered route includes:

| Field       | Type                      | Description |
|------------|---------------------------|-------------|
| `method`   | `"get" \| "post" ...`     | HTTP method (lowercase) |
| `path`     | `string`                  | Full normalized path (e.g. `/api/user`) |
| `secure`   | `"jwt"` \| `"basic"` \| `"none"` | Security classification |
| `source`   | `string`                  | Name of the controller file |

---

## Conflict Detection

Routes are considered **conflicting** when:

- The same `method` and normalized `path` occur
- But they originate from different source files

Even if `secure` differs, the route is flagged as a conflict.

```ts
registry.register({
  method: 'get',
  path: '/api/data',
  secure: 'none',
  source: 'a.ts'
});

registry.register({
  method: 'get',
  path: '/api/data',
  secure: 'jwt',
  source: 'b.ts'
});
```

✅ ➝ Will trigger a conflict.

---

## Log Output

On startup, all routes are printed to the application log at `DEBUG` level:

```
[RouteRegistry] Registered Routes:
  [GET] /api/ping (jwt)
  [POST] /api/user (none)
```

Conflicts are logged as `WARN`.

---

## HTTP Endpoint

You can access the current route registry at:

```
GET /__routes
```

This returns all registered routes as JSON.

---

## Examples

### Dynamic Route

```ts
router.get('/users/:id', handler)
```

➡️ Will be registered as `/users/:id`

### Wildcard Route

```ts
router.get('/files/*', handler)
```

➡️ Will be registered as `/files/*`

> Note: The registry treats paths **literally**, so `/users/:id` and `/users/:userId` are seen as equal in conflict detection.

---

## Internal Use

Internally, the `RouteRegistry` is available through the `ControllerLoader`, and exported via the `GET /__routes` handler.

You can also access the current instance via:

```ts
import { RouteRegistry } from './lib/routing/route-registry';

const routes = RouteRegistry.getInstance().getRoutes();
```

---

_Last updated: 2025-09-14_
