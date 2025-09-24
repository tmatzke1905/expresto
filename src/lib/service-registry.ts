export interface Service {
  stop?: () => Promise<void> | void;
}

export class ServiceRegistry {
  private services = new Map<string, Service>();

  /**
   * Register a new service by name
   */
  register(name: string, service: Service): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} already registered`);
    }
    this.services.set(name, service);
  }

  /**
   * Retrieve a service by name
   */
  get<T extends Service = Service>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  /**
   * Stop and remove all services
   */
  async shutdownAll(): Promise<void> {
    for (const [name, service] of this.services.entries()) {
      if (typeof service.stop === 'function') {
        try {
          await service.stop();
        } catch (err) {
          // log error but continue stopping others
          console.error(`Failed to stop service ${name}`, err);
        }
      }
    }
    this.services.clear();
  }

  /**
   * Get all registered services
   */
  entries(): IterableIterator<[string, Service]> {
    return this.services.entries();
  }

  /**
   * Check if a service is registered under the given name
   * @param name - The name of the service
   * @returns True if the service is registered, false otherwise
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Remove a registered service by name
   * @param name - The name of the service to remove
   */
  remove(name: string): void {
    this.services.delete(name);
  }
}
