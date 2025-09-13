import type { AppConfig } from './config';
import type { AppLogger } from './logger';
import type { EventBus } from './events';
import type { ServiceRegistry } from './services/service-registry';

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
  eventBus?: EventBus;
  services: ServiceRegistry;
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
   * Alias for register() to match common event emitter style.
   */
  on(hook: LifecycleHook, callback: HookCallback): void {
    this.register(hook, callback);
  }

  /**
   * Emit a hook with consistent arguments and await all handlers.
   */
  async emit(hook: LifecycleHook, context: HookContext): Promise<void> {
    const listeners = this.listeners.get(hook) || [];
    for (const fn of listeners) {
      try {
        await fn(context);
      } catch (err) {
        context.logger.app.error(`Error in hook [${hook}]:`, err);
        if (hook !== LifecycleHook.CUSTOM_MIDDLEWARE) throw err;
      }
    }
  }
}
