# Security

expresto-server supports route-level authentication via:

- JWT bearer tokens
- HTTP Basic Authentication
- shared security hooks for project-specific authorization

Protected routes fail closed. A route declared with `secure: 'jwt'` or
`secure: 'basic'` is never treated as public just because the corresponding
auth provider is disabled or missing.

---

## Configuration

Authentication is configured under `auth` in the main config file.

```json
{
  "auth": {
    "jwt": {
      "enabled": true,
      "secret": "replace-with-a-real-secret",
      "algorithm": "HS256",
      "expiresIn": "1h"
    },
    "basic": {
      "enabled": true,
      "users": {
        "alice": "password123"
      }
    }
  }
}
```

Rules enforced at startup:

- `auth.jwt.enabled: true` requires a non-empty `auth.jwt.secret`
- placeholder JWT secrets such as `default_secret` and `change-me` are rejected
- `auth.basic.enabled: true` requires at least one configured Basic Auth user

If these checks fail, server startup is aborted.

---

## Supported Modes

| Mode    | Behavior |
|---------|----------|
| `none`  | Public route, no authentication required |
| `basic` | Requires valid HTTP Basic credentials |
| `jwt`   | Requires a valid `Authorization: Bearer <token>` header |

Example controller metadata:

```ts
export default {
  route: '/secure',
  handlers: [
    {
      method: 'get',
      path: '/jwt',
      secure: 'jwt',
      handler: (_req, res) => {
        res.json({ ok: true });
      },
    },
  ],
};
```

---

## Fail-Closed Behavior

Protected routes are rejected when the required auth mode is unavailable:

- `secure: 'jwt'` returns `503` when JWT auth is disabled
- `secure: 'basic'` returns `503` when Basic Auth is disabled
- missing or malformed credentials still return `401`
- invalid JWTs return `403`

On successful authentication, the framework attaches:

- `req.auth`
- `req.user`

This keeps existing middleware and controller conventions working.

---

## Security Hooks and Events

After authentication succeeds, expresto-server runs the `LifecycleHook.SECURITY`
pipeline so applications can apply additional authorization checks.

The framework emits:

- `expresto-server.security.authorize`

Payloads include the route mode, path, method, and whether access was allowed
or denied.

---

## Ops Endpoints in Production

Ops endpoints are intentionally treated as sensitive in production.

When `NODE_ENV=production`, startup fails unless you choose one of these
options:

- disable ops endpoints with `ops.enabled: false`
- protect ops endpoints with `ops.secure: 'basic'`
- protect ops endpoints with `ops.secure: 'jwt'`

Example:

```json
{
  "ops": {
    "enabled": true,
    "secure": "basic"
  }
}
```

---

_Last updated: 2026-03-15_
