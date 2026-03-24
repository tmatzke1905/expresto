// src/jobs/cleanup.job.ts
import type { SchedulerModule } from '../lib/scheduler/types';

const cleanupJob: SchedulerModule = {
  id: 'cleanup',
  async run(ctx, options) {
    const configuredMaxAge = options?.maxAgeMinutes;
    const maxAge =
      typeof configuredMaxAge === 'number' && Number.isFinite(configuredMaxAge)
        ? configuredMaxAge
        : 60;
    ctx.logger.app.info(`[CleanupJob] Running cleanup for files older than ${maxAge} minutes...`);
    // hier könnte man z.B. logs/files prüfen und löschen
  }
};

export default cleanupJob;
