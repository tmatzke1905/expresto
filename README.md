# expresto
Middleware with all the bell and wistles

# expRESTo

**expRESTo** is a powerful, extensible middleware framework built on top of Express.js, designed to accelerate the development of secure, observable, and maintainable REST APIs.

---

## Features

- 🔌 Modular controller loading with lifecycle hooks
- 🔒 Built-in support for JWT and Basic authentication
- 🪵 Configurable logging (application and access logs)
- 📊 Prometheus metrics and OpenTelemetry tracing
- 📦 Config-driven setup (JSON-based)
- 🔁 Clustering support via Node.js cluster module
- 📡 WebSocket integration (Socket.IO)
- 📚 Route registry with conflict detection and debugging support

---

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Run the application

```bash
npm start
```

3. Configuration is loaded from `config/config.json`.

---

## Project Structure

```
├── src/
│   ├── core/              # Core bootstrap logic
│   ├── lib/               # Logging, routing, metrics, etc.
│   ├── controllers/       # Your REST controllers
│   └── index.ts           # Application entry point
├── tests/                 # Test cases (Jest or similar)
├── config/                # JSON-based configuration
├── logs/                  # Application and access logs
├── docs/                  # Markdown documentation
└── README.md              # You're here
```

---

## Documentation

Full documentation is located in the `docs/` folder:

- [Routing](./docs/routing.md)
- [Controllers](./docs/controllers.md)
- [Security](./docs/security.md)
- [Configuration](./docs/configuration.md)
- [Metrics](./docs/metrics.md)
- [Lifecycle Hooks](./docs/lifecycle-hooks.md)
- [WebSocket](./docs/websocket.md)
- [Clustering](./docs/clustering.md)
- [Service Registry](./docs/service-registry.md)
- [Event System](./docs/event-system.md)

---

## License

MIT License — see `LICENSE` for details.

---

_Last updated: 2025-09-14_
