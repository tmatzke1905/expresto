import type { AppConfig } from './config';
import type { AppLogger } from './logger';
import type express from 'express';
import type { EventBus } from './events';

/**
 * Enum of supported lifecycle hook types.
 */
export enum LifecycleHook {
  STARTUP = 'startup',
  PRE_INIT = 'preInit',
  CUSTOM_MIDDLEWARE = 'customMiddleware',
  POST_INIT = 'postInit',
  SHUTDOWN = 'shutdown',
}

/**
 * Standard context passed to all hook handlers.
 */
export interface HookContext {
  config: AppConfig;
  logger: AppLogger;
  app?: express.Application;
  eventBus?: EventBus;
}

type HookCallback = (ctx: HookContext) => void | Promise<void>;

/**
 * HookManager handles lifecycle hook registration and emission.
 */
export class HookManager {
  private readonly listeners: Map<LifecycleHook, HookCallback[]> = new Map();

  /**
   * Register a callback for a specific hook.
   */
  register(hook: LifecycleHook, callback: HookCallback): void {
    const list = this.listeners.get(hook) || [];
    list.push(callback);
    this.listeners.set(hook, list);
  }

  /**
   * Emit a hook with consistent arguments and await all handlers.
   */
  async emit(hook: LifecycleHook, context: HookContext, failFast = true): Promise<void> {
    const listeners = this.listeners.get(hook) || [];
    for (const fn of listeners) {
      try {
        await fn(context);
      } catch (err) {
        context.logger.app.error(`Error in hook [${hook}]:`, err);
        if (failFast) throw err;
      }
    }
  }
}
