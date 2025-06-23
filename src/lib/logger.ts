import log4js from 'log4js';
import type { AppConfig } from './config';

export interface AppLogger {
  app: log4js.Logger;
  access: log4js.Logger;
}

/**
 * Configures and returns application and access loggers.
 * @param config Application configuration
 */
export function setupLogger(config: AppConfig): AppLogger {
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
        layout: { type: 'json' },
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

  const app = log4js.getLogger();
  const access = log4js.getLogger('access');

  if (config.log.traceRequests && config.log.level === 'TRACE') {
    app.trace('TRACE-level request logging enabled.');
  }

  app.info('Logger initialized with level:', config.log.level);

  return { app, access };
}

/**
 * Returns a shared logger instance.
 */
export function getLogger(): AppLogger {
  return {
    app: log4js.getLogger(),
    access: log4js.getLogger('access'),
  };
}
