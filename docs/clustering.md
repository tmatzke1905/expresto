

# Clustering

expRESTo supports optional clustering using Node.js built-in `cluster` module.

This allows you to take advantage of multi-core systems by running multiple worker processes.

---

## Enabling Clustering

Clustering can be enabled in the main configuration file:

```json
"cluster": {
  "enabled": true
}
```

By default, clustering is disabled in container environments, but this behavior can be overridden manually.

---

## How It Works

When clustering is enabled:

- The main process acts as the **master**
- It spawns one worker per CPU core (or a custom number in future versions)
- Each worker runs a full instance of the Express app
- Log messages include the worker PID

Workers share:

- The same configuration
- The same controller loading mechanism
- The same metrics endpoint (aggregated at reverse proxy level)

---

## Limitations

- No shared memory between workers
- Socket.IO does not support clustering out of the box (you must use Redis adapter)
- Metrics are not aggregated automatically unless done at Prometheus/Grafana level

---

## Use Cases

- Horizontal scaling on a single machine
- Better CPU utilization under load
- Running dedicated workers per role (future)

---

_Last updated: 2025-09-14_
