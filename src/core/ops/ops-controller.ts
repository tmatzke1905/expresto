import express from 'express';
import path from 'node:path';

import { routeRegistry } from '../../lib/routing/route-registry';
import { readPublicConfig } from './config-reader';
import { readLogTail } from './log-reader';

const router = express.Router();

// ------------------------------------------------------------
// Optional EventBus integration
// ------------------------------------------------------------

type EventBusLike = {
  emit: (event: string, payload: unknown) => void;
};

function getEventBus(req: express.Request): EventBusLike | undefined {
  // The bootstrap may attach the EventBus to app.locals.
  // We keep this optional so ops endpoints remain usable in tests/standalone.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req.app.locals as any).eventBus as EventBusLike | undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

router.get('/__routes', (req, res) => {
  const result = routeRegistry.getRoutes().map(r => ({
    method: r.method,
    path: r.path,
    secure: r.secure,
    source: r.source ?? 'unknown',
  }));

  getEventBus(req)?.emit('expresto.ops.routes_read', {
    ts: nowIso(),
    count: result.length,
  });

  res.json(result);
});

router.get('/__config', (req, res) => {
  try {
    const cfg = readPublicConfig();

    getEventBus(req)?.emit('expresto.ops.config_read', { ts: nowIso() });

    res.json(cfg);
  } catch (err) {
    getEventBus(req)?.emit('expresto.ops.config_error', {
      ts: nowIso(),
      error: String(err),
    });

    res.status(500).json({ error: `Could not read config: ${String(err)}` });
  }
});

router.get('/__logs/:type', async (req, res) => {
  const { type } = req.params;
  const lines = Number.parseInt(req.query.lines as string, 10);
  const lineCount = Number.isFinite(lines) && lines > 0 ? lines : 50;

  const eventBus = getEventBus(req);

  if (!['application', 'access'].includes(type)) {
    eventBus?.emit('expresto.ops.logs_not_found', {
      ts: nowIso(),
      type,
      lines: lineCount,
    });
    return res.status(404).json({ error: `Log type '${type}' not found` });
  }

  const filePath = path.join('logs', `${type}.log`);

  try {
    const content = await readLogTail(filePath, lineCount);
    eventBus?.emit('expresto.ops.logs_read', {
      ts: nowIso(),
      type,
      lines: lineCount,
    });
    res.type('text/plain').send(content);
  } catch (err) {
    eventBus?.emit('expresto.ops.logs_error', {
      ts: nowIso(),
      type,
      lines: lineCount,
      error: String(err),
    });
    res.status(500).json({ error: `Could not read log: ${String(err)}` });
  }
});

export default router;
