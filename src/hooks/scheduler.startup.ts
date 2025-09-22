import { hookManager, LifecycleHook, HookContext } from '../lib/hooks';
import { SchedulerService } from '../lib/scheduler/scheduler-service';
import type { SchedulerConfig, SchedulerJobConfig, SchedulerModule } from '../lib/scheduler/types';

hookManager.on(LifecycleHook.STARTUP, async (ctx: HookContext) => {
  const schedCfg = (ctx.config as any).scheduler as SchedulerConfig | undefined;
  if (!schedCfg?.enabled) {
    ctx.logger.app.info('[Scheduler] disabled');
    return;
  }

  // Cluster-Check
  if (ctx.config.cluster?.enabled) {
    if (schedCfg.mode === 'standalone') {
      throw new Error('[Scheduler] standalone mode is not allowed with cluster enabled');
    }
    ctx.logger.app.warn('[Scheduler] disabled (cluster mode active)');
    return;
  }

  const scheduler = new SchedulerService(schedCfg, ctx);
  ctx.services.set('scheduler', scheduler);

  const register = async (name: string, cfg: SchedulerJobConfig): Promise<SchedulerModule> => {
    const svc = ctx.services.get(cfg.module) as SchedulerModule | undefined;
    if (svc?.run && svc.id) return svc;

    const mod = await import(/* @vite-ignore */ cfg.module);
    const job: SchedulerModule = mod.default ?? mod;
    if (!job?.run) {
      throw new Error(`[Scheduler] module "${cfg.module}" does not export a SchedulerModule`);
    }
    return job;
  };

  await scheduler.init(register);
});

hookManager.on(LifecycleHook.SHUTDOWN, async (ctx: HookContext) => {
  const scheduler = ctx.services.get('scheduler') as SchedulerService | undefined;
  if (scheduler) {
    ctx.logger.app.info('[Scheduler] shutting down...');
    scheduler.cancelAll();
  }
});
