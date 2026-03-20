# Event System

expresto-server includes an async-first event bus to allow decoupled communication between internal modules and user projects.

## Overview

- Events are identified by a string name.
- Handlers are executed **in registration order**.
- Listener execution order is deterministic: **exact** event listeners → **namespace** listeners → **wildcard** listeners.
- Handlers may be async.
- `emit()` is **fire-and-forget** (async by default).
- Use `emitAsync()` only if you explicitly want to await all handlers.

## Stable EventBus API

The framework treats the following methods as stable:

- `on(event, handler)`
- `off(event, handler)`
- `emit(event, payload)`
- `emitAsync(event, payload)`

## Naming Convention

Use a consistent namespace to avoid collisions.

- Framework events: `expresto-server.<domain>.<event>`
  - Common domains: `ops`, `websocket`, `scheduler`, `security`, `services`
  - Example: `expresto-server.websocket.connected`
- Project-specific events: `<project>.<domain>.<event>`

## Payload Standard

Framework events should use this base shape:

```ts
{
  ts: string;
  source?: string;
  context?: object;
}
```

In Expresto internals, event-specific fields are currently also kept at top-level
for backward compatibility with existing consumers.

## Using the EventBus

### Subscribing

`on()` returns an unsubscribe function.

```ts
const unsubscribe = eventBus.on('expresto-server.websocket.connected', async (payload) => {
  // payload: { socketId: string, auth?: unknown }
});

// later
unsubscribe();
```

#### Subscribing to namespaces and all events

Sometimes you want to observe a whole subsystem (e.g. WebSocket) without subscribing to each event.

```ts
// Observe all WebSocket-related events
const offWs = eventBus.onNamespace('expresto-server.websocket.', async (event, payload) => {
  // event: e.g. "expresto-server.websocket.connected"
});

// Observe every event (useful for debugging / tracing)
const offAny = eventBus.onAny(async (event, payload) => {
  // be careful: this will run for all events
});

// later
offWs();
offAny();
```

Notes:

- Namespace and wildcard handlers run **after** exact event handlers.
- Prefer namespaced subscriptions over `onAny()` in production.

### Emitting

`emit()` schedules async listener execution.

```ts
eventBus.emit('myproject.audit.user_login', {
  userId: '42',
  ts: new Date().toISOString(),
});
```

If you need to await all handlers:

```ts
await eventBus.emitAsync('myproject.audit.flush', { ts: Date.now() });
```

## Framework Events (currently emitted)

### WebSocket

- `expresto-server.websocket.connected`
  - `{ ts, source, context, socketId, auth?, socketContext? }`
- `expresto-server.websocket.disconnected`
  - `{ ts, source, context, socketId, reason, socketContext? }`
- `expresto-server.websocket.error`
  - `{ ts, source, context, stage, reason?, socketId?, requestId?, error? }`
- `expresto-server.websocket.message`
  - `{ ts, source, context, socketId, event, payload, socketContext? }`

Handshake context (attached on socket):

- `socket.context.user`
- `socket.context.token`
- `socket.context.requestId`

### Scheduler

The Scheduler emits lifecycle and execution events. All events are fire-and-forget
and emitted asynchronously.

#### Lifecycle

- `expresto-server.scheduler.disabled`
  - `{ ts, source, context, reason }`
- `expresto-server.scheduler.starting`
  - `{ ts, source, context, mode }`
- `expresto-server.scheduler.started`
  - `{ ts, source, context, mode }`
- `expresto-server.scheduler.startup_error`
  - `{ ts, source, context, reason, mode? }`
- `expresto-server.scheduler.stopping`
  - `{ ts, source }`
- `expresto-server.scheduler.stopped`
  - `{ ts, source }`

#### Job Execution

- `expresto-server.scheduler.job.start`
  - `{ ts, source, context, job }`
- `expresto-server.scheduler.job.success`
  - `{ ts, source, context, job, durationMs }`
- `expresto-server.scheduler.job.error`
  - `{ ts, source, context, job, durationMs, error }`
- `expresto-server.scheduler.job.skipped`
  - `{ ts, source, context, job, reason }`

#### Timeout Jobs

- `expresto-server.scheduler.timeout.start`
  - `{ ts, source, context, name }`
- `expresto-server.scheduler.timeout.success`
  - `{ ts, source, context, name, durationMs }`
- `expresto-server.scheduler.timeout.error`
  - `{ ts, source, context, name, durationMs, error }`

### Security

- `expresto-server.security.authorize`
  - `{ ts, source, context, mode, method, path, route, controller, result, status?, error? }`

### Services

- `expresto-server.services.registered`
- `expresto-server.services.set`
- `expresto-server.services.removed`
- `expresto-server.services.shutdown.started`
- `expresto-server.services.shutdown.success`
- `expresto-server.services.shutdown.skipped`
- `expresto-server.services.shutdown.error`
- `expresto-server.services.shutdown.completed`
  - all follow `{ ts, source, context, ...eventSpecificFields }`

## Listener Errors

If a listener throws or rejects, the EventBus forwards the error to:

- `expresto-server.eventbus.listener_error`

Payload:

```ts
{
  event: string;
  error: unknown;
  payload: unknown;
}
```

If nobody subscribes to this error event, the EventBus invokes an optional fallback handler
(e.g. wired to the application logger during bootstrap). If no fallback is configured,
listener errors are silently ignored.

_Last updated: 2026-03-12_
