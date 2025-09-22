/* eslint-env vitest */
import { getConfig, initConfig } from '../../src/lib/config';
import { SchedulerService } from '../../src/lib/scheduler/scheduler-service';
import type { SchedulerModule } from '../../src/lib/scheduler/types';
import dummyJob from '../jobs/dummy.job';
import { vi } from 'vitest';

describe('Scheduler', () => {
  beforeAll(async () => {
    await initConfig('./tests/config/scheduler.json');
  });

  it('should register and run dummy job', async () => {
    dummyJob.reset(); // reset flag

    const ctx: any = {
      config: getConfig(),
      logger: {
        app: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
      },
      services: new Map(),
    };

    const schedCfg = ctx.config.scheduler;
    const scheduler = new SchedulerService(schedCfg, ctx);
    ctx.services.set('scheduler', scheduler);

    const register = async (): Promise<SchedulerModule> => dummyJob;
    await scheduler.init(register);

    // Manually trigger the job execution
    for (const scheduled of (scheduler as any).tasks.values()) {
      await scheduled.module.run(ctx);
    }

    expect(ctx.services.get('scheduler')).toBeDefined();
    expect((scheduler as any).tasks.size).toBeGreaterThan(0);
    expect(dummyJob.wasExecuted()).toBe(true); // verify execution
  });

  it('should ignore disabled jobs', async () => {
    dummyJob.reset();

    const ctx: any = {
      config: {
        ...getConfig(),
        scheduler: {
          ...getConfig().scheduler,
          jobs: {
            disabledDummy: {
              enabled: false,
              cron: '*/1 * * * *',
              module: 'dummy',
            },
          },
        },
      },
      logger: {
        app: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
      },
      services: new Map(),
    };

    const schedCfg = ctx.config.scheduler;
    const scheduler = new SchedulerService(schedCfg, ctx);
    ctx.services.set('scheduler', scheduler);

    const register = async (): Promise<SchedulerModule> => dummyJob;
    await scheduler.init(register);

    // Wait briefly
    await new Promise(resolve => setTimeout(resolve, 200));

    expect((scheduler as any).tasks.size).toBe(0);
    expect(dummyJob.wasExecuted()).toBe(false);
  });
});

it('should run in standalone mode without HTTP server', async () => {
  dummyJob.reset();

  const ctx: any = {
    config: {
      ...getConfig(),
      cluster: { enabled: false },
      scheduler: {
        ...getConfig().scheduler,
        enabled: true,
        mode: 'standalone',
        jobs: {
          dummy: {
            enabled: true,
            cron: '*/1 * * * * *', // every second for test
            module: 'dummy',
          },
        },
      },
    },
    logger: {
      app: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
    },
    services: new Map(),
  };

  const schedCfg = ctx.config.scheduler;
  const scheduler = new SchedulerService(schedCfg, ctx);
  ctx.services.set('scheduler', scheduler);

  const register = async (): Promise<SchedulerModule> => dummyJob;
  await scheduler.init(register);

  // Manually trigger the job execution
  for (const scheduled of (scheduler as any).tasks.values()) {
    await scheduled.module.run(ctx);
  }

  expect((scheduler as any).tasks.size).toBeGreaterThan(0);
  expect(dummyJob.wasExecuted()).toBe(true);
});
