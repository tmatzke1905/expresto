

# Controllers

Controllers in expRESTo are self-contained modules that define one or more HTTP endpoints (routes). Each controller:

- Exports an `init(app, logger)` function
- Uses an `express.Router` instance to define its routes
- Can optionally declare if routes require authentication
- Is dynamically loaded from the configured `controllersPath` folder

---

## Controller Interface

A valid controller file exports:

```ts
export function init(app: Express, logger: Logger): void {
  const router = express.Router();

  router.get('/ping', handlePing);       // ➝ GET /api/ping
  router.post('/login', handleLogin);    // ➝ POST /api/login

  app.use('/api', router);
}
```

> The base path `/api` is defined by `contextRoot` in the configuration.

---

## Handler Functions

Each handler must match the standard Express signature:

```ts
function handlePing(req: Request, res: Response): void {
  res.json({ message: 'pong' });
}
```

Handlers can also be referenced functions, declared in the same file or imported from another module.

---

## Logging

Controllers receive a `logger` instance from the middleware:

```ts
logger.debug('Ping controller loaded');
```

This logger writes to `application.log`, based on the configured log level.

---

## Security

Controllers do not enforce security directly. Instead:

- Security is declared per route using route metadata or conventions
- The middleware's `SecurityProvider` validates access before the handler is called
- Security modes include `jwt`, `basic`, or `none`

---

## Dynamic Controller Loading

All controller files are loaded automatically from the `controllersPath` configured in the main JSON config.

Each controller is expected to export an `init()` function — otherwise it will be skipped with a warning.

---

_Last updated: 2025-09-14_
