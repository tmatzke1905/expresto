import fs from 'fs';
import path from 'path';
import log4js from 'log4js';
import type { AppConfig } from './config';
import type { AppLogger } from './logger';

log4js.addLayout('json', function (config) {
  return function (logEvent) {
    return JSON.stringify(logEvent) + (config?.separator ?? '\n');
  };
});

function ensureDirFor(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function setupLogger(config: AppConfig): AppLogger {
  ensureDirFor(config.log.access);
  ensureDirFor(config.log.application);

  log4js.configure({
    appenders: {
      access: {
        type: 'file',
        filename: config.log.access,
        layout: { type: 'pattern', pattern: '%d{ISO8601} [%p] [%c] %m' },
      },
      application: {
        type: 'file',
        filename: config.log.application,
        layout: { type: 'json', separator: '\n' },
      },
      console: {
        type: 'console',
        layout: { type: 'pattern', pattern: '%d{ISO8601} [%p] [%c] %m' },
      },
    },
    categories: {
      default: {
        appenders: ['application', 'console'],
        level: config.log.level || 'INFO',
      },
      access: {
        appenders: ['access'],
        level: 'INFO',
      },
    },
  });

  const app = log4js.getLogger('application');
  const access = log4js.getLogger('access');

  if (config.log.traceRequests && config.log.level === 'TRACE') {
    app.trace('TRACE-level request logging enabled.');
  }

  app.info('Logger initialized with level:', config.log.level);

  return { app, access };
}
