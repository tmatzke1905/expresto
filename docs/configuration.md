# Configuration

expRESTo uses a central JSON config file for runtime behavior.

Minimum supported runtime:

- Node.js 22

---

## Example Configuration

```json
{
  "port": 8080,
  "host": "0.0.0.0",
  "contextRoot": "/api",
  "controllersPath": "./src/controllers",
  "log": {
    "level": "info",
    "application": "./logs/application.log",
    "access": "./logs/access.log"
  },
  "auth": {
    "jwt": {
      "enabled": true,
      "secret": "replace-with-a-real-secret",
      "algorithm": "HS256"
    }
  },
  "ops": {
    "enabled": true,
    "secure": "jwt"
  },
  "metrics": {
    "endpoint": "/__metrics"
  },
  "cluster": {
    "enabled": false
  },
  "websocket": {
    "enabled": true,
    "path": "/socket.io"
  }
}
```

---

## Fields

| Field | Description |
|-------|-------------|
| `port` | Port the server listens on |
| `host` | Interface to bind |
| `contextRoot` | Prefix for mounted application routes |
| `controllersPath` | Folder containing controller modules |
| `log.level` | Log level (`error`, `warn`, `info`, `debug`, `trace`, `fatal`) |
| `log.application` | Application log path |
| `log.access` | HTTP access log path |
| `auth.jwt.enabled` | Enables JWT auth for protected JWT routes |
| `auth.jwt.secret` | Shared HMAC secret for JWT verification |
| `auth.jwt.algorithm` | One of `HS256`, `HS384`, `HS512` |
| `auth.jwt.expiresIn` | Token lifetime used by helper tooling |
| `auth.basic.enabled` | Enables Basic Auth for protected Basic routes |
| `auth.basic.users` | Username/password map for Basic Auth |
| `ops.enabled` | Enables or disables `__health`, `__routes`, `__config`, `__logs` |
| `ops.secure` | Protects ops endpoints with `none`, `basic`, or `jwt` |
| `metrics.endpoint` | Path for Prometheus metrics (outside `contextRoot`) |
| `cluster.enabled` | Enables multi-process clustering |
| `websocket.enabled` | Enables Socket.IO on the shared HTTP server |
| `websocket.path` | Socket.IO path |

---

## Security-Sensitive Rules

- `auth.jwt.enabled: true` requires `auth.jwt.secret`
- placeholder JWT secrets are rejected at startup
- `auth.basic.enabled: true` requires at least one configured user
- `websocket.enabled: true` requires secure JWT configuration
- when `NODE_ENV=production`, ops endpoints must be disabled or protected

Recommended production options:

```json
{
  "ops": {
    "enabled": false
  }
}
```

or:

```json
{
  "ops": {
    "enabled": true,
    "secure": "basic"
  }
}
```

---

## Tips

- Use `port: 0` only in tests when you pass config objects directly
- keep `contextRoot` starting with `/`
- use absolute log paths in packaged deployments

---

_Last updated: 2026-03-15_
