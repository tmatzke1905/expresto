# WebSocket Support

expRESTo can optionally enable WebSocket communication via [Socket.IO](https://socket.io/).

---

## Enabling WebSocket

WebSocket support must be explicitly enabled in the configuration:

```json
"websocket": {
  "enabled": true
}
```

Once enabled, a shared `http.Server` instance is used by both Express and Socket.IO.

---

## Usage

To use WebSocket in your controller or module:

```ts
import { getSocketServer } from '../lib/websocket';

const io = getSocketServer();

io.on('connection', (socket) => {
  console.log('WebSocket client connected');

  socket.on('ping', () => {
    socket.emit('pong');
  });
});
```

The same `io` instance is available anywhere after the POST_INIT lifecycle point.

---

## Integration Details

- Socket.IO runs on the same port as Express
- There is no need to open an additional port
- CORS and transport configuration can be customized later

---

## Tips

- Use rooms or namespaces for channel separation
- Log all incoming events during development
- Avoid sending sensitive data over unencrypted connections

---

_Last updated: 2025-09-14_
