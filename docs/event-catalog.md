

# Expresto Event Catalog

This document lists all internal framework events emitted by Expresto.

The purpose of this catalog is to provide:

- a stable reference for developers
- integration points for plugins and extensions
- observability hooks for monitoring systems
- clear guidance for coding agents

All events follow the naming scheme:

```
expresto-server.<domain>.<event>
```

Example:

```
expresto-server.websocket.connected
```

---

# Event Naming Rules

Event names must follow these rules:

1. Lowercase
2. Dot separated
3. Domain based

```
expresto-server.<module>.<action>
```

Examples:

```
expresto-server.websocket.connected
expresto-server.scheduler.job.start
expresto-server.security.authorize
```

---

# Common Payload Structure

Events should follow a consistent payload structure when possible:

```
{
  ts: string        // ISO timestamp
  source?: string   // emitting module
  context?: object  // optional contextual data
}
```

Example:

```
{
  ts: "2025-01-01T12:00:00.000Z",
  source: "scheduler",
  context: {
    job: "cleanup"
  }
}
```

---

# WebSocket Events

### expresto-server.websocket.connected

Emitted when a client successfully connects.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  socketId: string
  auth?: unknown
  socketContext?: {
    user?: unknown
    token?: string
    requestId?: string
  }
}
```

---

### expresto-server.websocket.disconnected

Emitted when a client disconnects.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  socketId: string
  reason?: string
  socketContext?: {
    user?: unknown
    token?: string
    requestId?: string
  }
}
```

---

### expresto-server.websocket.error

Emitted when a WebSocket error occurs.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  stage: "handshake" | "runtime"
  reason?: string
  socketId?: string
  requestId?: string
  error?: string
}
```

---

### expresto-server.websocket.message

Emitted when a custom client message arrives on a socket.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  socketId: string
  event: string
  payload: unknown
  socketContext?: {
    user?: unknown
    token?: string
    requestId?: string
  }
}
```

---

# Scheduler Events

### expresto-server.scheduler.started

Emitted when the scheduler starts.

Payload:

```
{
  ts: string
  source?: string
  context?: object
}
```

---

### expresto-server.scheduler.job.start

Emitted when a scheduled job begins execution.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  job: string
}
```

---

### expresto-server.scheduler.job.success

Emitted when a job finishes successfully.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  job: string
  durationMs: number
}
```

---

### expresto-server.scheduler.job.error

Emitted when a job fails.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  job: string
  durationMs: number
  error: unknown
}
```

---

### expresto-server.scheduler.stopped

Emitted when the scheduler shuts down.

Payload:

```
{
  ts: string
  source?: string
  context?: object
}
```

---

# Security Events

### expresto-server.security.authorize

Emitted when an authorization check occurs.

Payload:

```
{
  ts: string
  source?: string
  context?: object
  mode: "none" | "basic" | "jwt"
  method: string
  path: string
  route: string
  controller: string
  result: "allowed" | "denied"
  status?: number
  error?: string
}
```

---

# Ops Events

Operational endpoints may emit events for observability.

### expresto-server.ops.*

Operational endpoints emit:

```
expresto-server.ops.health_read
expresto-server.ops.routes_read
expresto-server.ops.config_read
expresto-server.ops.config_error
expresto-server.ops.logs_read
expresto-server.ops.logs_error
expresto-server.ops.logs_not_found
```

All payloads follow:

```
{
  ts: string
  source?: string
  context?: object
  ...eventSpecificFields
}
```

---

# Service Registry Events

### expresto-server.services.registered
### expresto-server.services.set
### expresto-server.services.removed
### expresto-server.services.shutdown.started
### expresto-server.services.shutdown.success
### expresto-server.services.shutdown.skipped
### expresto-server.services.shutdown.error
### expresto-server.services.shutdown.completed

Payload:

```
{
  ts: string
  source?: string
  context?: object
  ...eventSpecificFields
}
```

---

# Future Events

The following domains may introduce additional events:

```
expresto-server.metrics.*
expresto-server.cluster.*
expresto-server.database.*
```

New events must be documented in this file.

---

# Guidelines for Developers

When introducing new events:

1. Follow the naming convention
2. Document the event here
3. Provide a stable payload structure
4. Avoid breaking existing payload contracts

Events are part of the public extension interface of the framework.

Treat them as a stable API.

---

# Summary

The EventBus enables loose coupling between modules.

Typical consumers:

- monitoring systems
- plugins
- scheduler jobs
- WebSocket bridges

Always keep this catalog up to date when adding new events.
