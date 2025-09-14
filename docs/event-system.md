

# Event System

expRESTo includes a simple but powerful event system to allow decoupled communication between internal modules.

---

## Overview

Events are emitted and handled using an internal `EventEmitter` instance.

Modules can:

- Emit typed events
- Subscribe to specific event types
- Receive payloads with a defined argument structure

---

## Emitting Events

```ts
import { Events } from '../lib/events';

Events.emit('error.logged', {
  timestamp: Date.now(),
  error: err,
  route: req.path
});
```

---

## Listening to Events

```ts
Events.on('error.logged', (data) => {
  console.warn(`[event] Error logged:`, data);
});
```

You can listen to any event, including internal hooks like:

- `startup.ready`
- `shutdown.begin`
- `security.failed`

---

## Best Practices

- Use consistent naming: `module.event` (e.g. `db.connected`, `metrics.flush`)
- Always define the event payload shape (use TypeScript types)
- Avoid long-running handlers — use `setImmediate` if needed

---

## Event Ordering

Event arguments are always passed in the same order. All handlers are asynchronous by default.

---

_Last updated: 2025-09-14_
