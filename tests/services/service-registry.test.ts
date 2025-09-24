import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ServiceRegistry } from '../../src/lib/services/service-registry';

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;
  let logMock: ReturnType<typeof vi.fn>;
  let warnMock: ReturnType<typeof vi.fn>;
  let errorMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    registry = new ServiceRegistry();
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    logMock = vi.fn();
    warnMock = vi.fn();
    errorMock = vi.fn();
    console.log = logMock;
    console.warn = warnMock;
    console.error = errorMock;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  });

  it('should call shutdown method of a service on shutdownAll', async () => {
    const shutdownMock = vi.fn().mockResolvedValueOnce(undefined);
    const service = { shutdown: shutdownMock };
    registry.register('service1', service);
    await registry.shutdownAll();
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  it('should call close method of a service on shutdownAll', async () => {
    const closeMock = vi.fn().mockResolvedValueOnce(undefined);
    const service = { close: closeMock };
    registry.register('service2', service);
    await registry.shutdownAll();
    expect(closeMock).toHaveBeenCalledTimes(1);
  });

  it('should log warning if service has no shutdown or close method on register and shutdownAll', async () => {
    const service = {};
    registry.register('service3', service);
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("Service 'service3' does not have shutdown or close method.")
    );
    await registry.shutdownAll();
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining("Service 'service3' does not have shutdown or close method.")
    );
  });

  it('should log error if shutdown fails but continue shutting down other services', async () => {
    const failingShutdown = vi.fn().mockRejectedValue(new Error('Shutdown failed'));
    const successfulShutdown = vi.fn().mockResolvedValue(undefined);
    const failingService = { shutdown: failingShutdown };
    const successfulService = { shutdown: successfulShutdown };
    registry.register('failingService', failingService);
    registry.register('successfulService', successfulService);
    await registry.shutdownAll();
    expect(failingShutdown).toHaveBeenCalledTimes(1);
    expect(successfulShutdown).toHaveBeenCalledTimes(1);
    expect(errorMock).toHaveBeenCalledWith(expect.stringContaining("Error shutting down service 'failingService':"), expect.any(Error));
  });
});
