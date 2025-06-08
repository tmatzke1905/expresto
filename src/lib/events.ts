import { EventEmitter } from 'node:events';

/**
 * EventBus is a typed wrapper around Node.js EventEmitter.
 * Used to decouple modules and provide internal communication.
 */
export class EventBus extends EventEmitter {
  constructor() {
    super();
    // Ensure maximum listeners is high enough for internal hooks
    this.setMaxListeners(50);
  }

  /**
   * Emit an event asynchronously.
   */
  async emitAsync<T = any>(event: string, payload?: T): Promise<void> {
    const listeners = this.listeners(event);
    for (const listener of listeners) {
      try {
        await Promise.resolve((listener as (payload?: T) => void)(payload));
      } catch (err) {
        // Optionally log or handle errors inside listeners
        console.error(`Error in event listener for '${event}':`, err);
      }
    }
  }
}
