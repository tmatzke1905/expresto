import log4js from 'log4js';

export interface AppLogger {
  app: log4js.Logger;
  access: log4js.Logger;
}

export function getLogger(): AppLogger {
  return {
    app: log4js.getLogger('application'),
    access: log4js.getLogger('access'),
  };
}
