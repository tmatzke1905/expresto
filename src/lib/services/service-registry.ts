/**
 * A central service registry used to manage runtime dependencies like database clients, queues, etc.
 */
export class ServiceRegistry {
  private readonly services = new Map<string, unknown>();

  /**
   * Registers a new service instance.
   * Throws if the service name is already registered.
   */
  register<T>(name: string, instance: T): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered.`);
    }
    this.set(name, instance);
  }

  /**
   * Sets a service instance, overwriting existing value if present.
   * This behaves like Map.set and does not throw on duplicates.
   */
  set<T>(name: string, instance: T): void {
    this.services.set(name, instance);
    if (
      !(
        instance &&
        (typeof (instance as any).shutdown === 'function' ||
          typeof (instance as any).close === 'function')
      )
    ) {
      console.warn(`Service '${name}' does not have shutdown or close method.`);
    }
  }

  /**
   * Retrieves a service instance by name.
   * Throws if the service is not registered.
   */
  get<T>(name: string): T {
    if (!this.services.has(name)) {
      throw new Error(`Service '${name}' not found.`);
    }
    return this.services.get(name) as T;
  }

  /**
   * Checks if a service is registered.
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Optionally allow removing a service (e.g. for shutdown/cleanup).
   */
  remove(name: string): void {
    this.services.delete(name);
  }

  /**
   * Deletes a service and returns whether it was present.
   */
  delete(name: string): boolean {
    return this.services.delete(name);
  }

  /**
   * Lists all registered service names (useful for debug).
   */
  list(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Returns all registered services as a key-value object.
   */
  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.services.entries());
  }
  /**
   * Attempts to gracefully shut down all registered services.
   * Calls `shutdown` or `close` if available.
   *
   * Note: Services are expected to implement `shutdown` or `close` methods for graceful cleanup,
   * but this is not enforced. If neither method is found, a warning is logged.
   */
  async shutdownAll(): Promise<void> {
    for (const [name, service] of this.services.entries()) {
      try {
        if (service && typeof (service as any).shutdown === 'function') {
          await (service as any).shutdown();
        } else if (service && typeof (service as any).close === 'function') {
          await (service as any).close();
        } else {
          console.warn(`Service '${name}' does not have shutdown or close method.`);
        }
      } catch (err) {
        console.error(`Error shutting down service '${name}':`, err);
      }
    }
    this.services.clear();
  }
}
