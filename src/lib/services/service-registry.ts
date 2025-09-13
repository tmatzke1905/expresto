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
    this.services.set(name, instance);
  }

  /**
   * Sets a service instance, overwriting existing value if present.
   * This behaves like Map.set and does not throw on duplicates.
   */
  set<T>(name: string, instance: T): void {
    this.services.set(name, instance);
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
}
