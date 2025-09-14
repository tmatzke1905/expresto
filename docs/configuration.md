

# Configuration

expRESTo is configured using a central JSON file. This configuration defines:

- Server port and bind address
- Base context path
- Log files and log level
- Controller loading path
- Security and clustering options
- Prometheus endpoint
- WebSocket support

---

## Example Configuration

```json
{
  "port": 8080,
  "host": "0.0.0.0",
  "contextRoot": "/api",
  "controllersPath": "./src/controllers",
  "log": {
    "level": "debug",
    "application": "logs/application.log",
    "access": "logs/access.log"
  },
  "security": {
    "jwt": {
      "secret": "my-secret",
      "algorithm": "HS256"
    }
  },
  "metrics": {
    "enabled": true,
    "endpoint": "/__metrics"
  },
  "cluster": {
    "enabled": false
  },
  "websocket": {
    "enabled": true
  }
}
```

---

## Fields

| Field               | Description |
|--------------------|-------------|
| `port`             | Port the server listens on |
| `host`             | Interface to bind (default: `127.0.0.1`) |
| `contextRoot`      | Prefix for all mounted routes |
| `controllersPath`  | Path to folder with controller modules |
| `log.level`        | Log level (`error`, `warn`, `info`, `debug`, `trace`) |
| `log.application`  | Path to application log file |
| `log.access`       | Path to HTTP access log file |
| `security.jwt.*`   | JWT configuration (see `security.md`) |
| `metrics.enabled`  | Enables Prometheus metrics endpoint |
| `metrics.endpoint` | URL path to expose metrics (outside contextRoot) |
| `cluster.enabled`  | Enables multi-process clustering |
| `websocket.enabled`| Enables Socket.IO on the same port |

---

## Tips

- Use `port: 0` during testing to let the OS pick a free port
- Use `trace` log level only for debugging; it logs full requests
- `contextRoot` must start with a `/` but must not end with `/`

---

_Last updated: 2025-09-14_
