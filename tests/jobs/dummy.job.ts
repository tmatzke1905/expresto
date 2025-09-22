import type { SchedulerModule } from '../../src/lib/scheduler/types';

let executed = false;

const dummyJob: SchedulerModule & { wasExecuted: () => boolean; reset: () => void } = {
  id: 'dummy',
  async run(ctx, options) {
    executed = false;
    ctx.logger.app.info('[DummyJob] starting with options:', options);

    // simulate async work
    await new Promise((resolve) => setTimeout(resolve, 50));

    executed = true;
    ctx.logger.app.info('[DummyJob] finished');
  },
  wasExecuted: () => executed,
  reset: () => { executed = false; }
};

export default dummyJob;
