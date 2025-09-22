// src/jobs/heartbeat.job.ts
import type { SchedulerModule } from '../lib/scheduler/types';

const heartbeatJob: SchedulerModule = {
  id: 'heartbeat',
  async run(ctx) {
    ctx.logger.app.info('[HeartbeatJob] still alive at ' + new Date().toISOString());
  },
};

export default heartbeatJob;
