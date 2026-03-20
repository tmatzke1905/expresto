import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const tmpRoot = path.join(repoRoot, 'tests', 'tmp');

fs.mkdirSync(tmpRoot, { recursive: true });

type PackedConsumerProject = {
  packageWorkDir: string;
  consumerDir: string;
  controllersDir: string;
  jobsDir: string;
  logsDir: string;
};

function run(
  command: string,
  args: string[],
  cwd: string,
  extraEnv: NodeJS.ProcessEnv = {}
): string {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      CI: '1',
      ...extraEnv,
    },
  }).trim();
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(tmpRoot, prefix));
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function preparePackedConsumerProject(prefix: string): PackedConsumerProject {
  const packageWorkDir = makeTempDir(prefix);
  const npmCacheDir = path.join(packageWorkDir, 'npm-cache');
  const packDir = path.join(packageWorkDir, 'pack');
  const extractDir = path.join(packageWorkDir, 'extract');
  const consumerDir = path.join(packageWorkDir, 'consumer');
  const consumerPackageDir = path.join(consumerDir, 'node_modules', 'expresto-server');
  const controllersDir = path.join(consumerDir, 'controllers');
  const jobsDir = path.join(consumerDir, 'jobs');
  const logsDir = path.join(consumerDir, 'logs');

  fs.mkdirSync(npmCacheDir, { recursive: true });
  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(extractDir, { recursive: true });
  fs.mkdirSync(path.join(consumerDir, 'node_modules'), { recursive: true });
  fs.mkdirSync(controllersDir, { recursive: true });
  fs.mkdirSync(jobsDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });

  run('npm', ['run', 'build'], repoRoot, { npm_config_cache: npmCacheDir });

  const dryRunOutput = run(
    'npm',
    ['pack', '--dry-run', '--json'],
    repoRoot,
    { npm_config_cache: npmCacheDir }
  );
  const dryRun = JSON.parse(dryRunOutput) as Array<{
    files: Array<{ path: string }>;
  }>;
  const packedFiles = dryRun[0]?.files.map(file => file.path) ?? [];

  expect(packedFiles).toContain('dist/index.js');
  expect(packedFiles).toContain('dist/index.mjs');
  expect(packedFiles).toContain('dist/index.d.ts');
  expect(packedFiles).toContain('middleware.config.schema.json');
  expect(packedFiles).toContain('README.md');
  expect(packedFiles).toContain('LICENSE');

  const packOutput = run(
    'npm',
    ['pack', '--json', '--pack-destination', packDir],
    repoRoot,
    { npm_config_cache: npmCacheDir }
  );
  const packed = JSON.parse(packOutput) as Array<{ filename: string }>;
  const tarballName = packed[0]?.filename;

  expect(tarballName).toBeTruthy();

  run('tar', ['-xzf', path.join(packDir, tarballName!), '-C', extractDir], repoRoot);
  fs.cpSync(path.join(extractDir, 'package'), consumerPackageDir, { recursive: true });

  return {
    packageWorkDir,
    consumerDir,
    controllersDir,
    jobsDir,
    logsDir,
  };
}

describe('published package smoke test', () => {
  it(
    'packs a consumable npm artifact for CommonJS and ESM consumers',
    async () => {
      const project = preparePackedConsumerProject('package-smoke-');

      try {
        fs.writeFileSync(
          path.join(project.controllersDir, 'ping-controller.js'),
          `module.exports = {
  route: '/ping',
  handlers: [
    {
      method: 'get',
      path: '/',
      secure: false,
      handler: (_req, res) => {
        res.json({ pong: true });
      }
    }
  ]
};
`,
          'utf8'
        );

        writeJson(path.join(project.consumerDir, 'middleware.config.prod.json'), {
          port: 3001,
          host: '127.0.0.1',
          contextRoot: '/api',
          controllersPath: project.controllersDir,
          log: {
            access: path.join(project.logsDir, 'access.log'),
            application: path.join(project.logsDir, 'application.log'),
            level: 'fatal',
          },
          cors: { enabled: false, options: {} },
          helmet: { enabled: false, options: {} },
          rateLimit: { enabled: false, options: {} },
          metrics: { endpoint: '/__metrics' },
          telemetry: { enabled: false },
          auth: { jwt: { enabled: false }, basic: { enabled: false } },
        });

        const requireOutput = run(
          'node',
          [
            '-e',
            `console.warn = () => {};
const pkg = require('expresto-server');
const schemaPath = require.resolve('expresto-server/middleware.config.schema.json');
(async () => {
  pkg.hookManager.on(pkg.LifecycleHook.INITIALIZE, (ctx) => {
    ctx.services.set('fromPublicHook', { shutdown: async () => {} });
  });
  const token = await pkg.signToken({ sub: 'demo-user' }, 'super-secret', 'HS256');
  const decoded = await pkg.verifyToken(token, 'super-secret', 'HS256');
  const runtime = await pkg.createServer('./middleware.config.prod.json');
  console.log(JSON.stringify({
    exports: Object.keys(pkg),
    hasCreateServer: typeof pkg.createServer === 'function',
    hasHookManager: typeof pkg.hookManager?.on === 'function',
    hasLifecycleHook: typeof pkg.LifecycleHook?.INITIALIZE === 'string',
    hasEventBus: typeof pkg.EventBus === 'function',
    hasServiceRegistry: typeof pkg.ServiceRegistry === 'function',
    hasHttpError: typeof pkg.HttpError === 'function',
    hasApp: typeof runtime.app?.use === 'function',
    schemaReadable: require('node:fs').existsSync(schemaPath),
    hookServiceRegistered: runtime.services.has('fromPublicHook'),
    decodedSub: decoded.sub
  }));
})().catch(err => {
  console.error(err);
  process.exit(1);
});`,
          ],
          project.consumerDir
        );
        const requireResult = JSON.parse(requireOutput) as {
          exports: string[];
          hasCreateServer: boolean;
          hasHookManager: boolean;
          hasLifecycleHook: boolean;
          hasEventBus: boolean;
          hasServiceRegistry: boolean;
          hasHttpError: boolean;
          hasApp: boolean;
          schemaReadable: boolean;
          hookServiceRegistered: boolean;
          decodedSub: string;
        };

        expect(requireResult.exports).toContain('createServer');
        expect(requireResult.exports).toContain('hookManager');
        expect(requireResult.exports).toContain('LifecycleHook');
        expect(requireResult.exports).toContain('EventBus');
        expect(requireResult.exports).toContain('ServiceRegistry');
        expect(requireResult.exports).toContain('HttpError');
        expect(requireResult.exports).toContain('signToken');
        expect(requireResult.exports).toContain('verifyToken');
        expect(requireResult.hasCreateServer).toBe(true);
        expect(requireResult.hasHookManager).toBe(true);
        expect(requireResult.hasLifecycleHook).toBe(true);
        expect(requireResult.hasEventBus).toBe(true);
        expect(requireResult.hasServiceRegistry).toBe(true);
        expect(requireResult.hasHttpError).toBe(true);
        expect(requireResult.hasApp).toBe(true);
        expect(requireResult.schemaReadable).toBe(true);
        expect(requireResult.hookServiceRegistered).toBe(true);
        expect(requireResult.decodedSub).toBe('demo-user');

        const importOutput = run(
          'node',
          [
            '--input-type=module',
            '-e',
            `const pkg = await import('expresto-server');
console.log(JSON.stringify({
  exports: Object.keys(pkg),
  hasCreateServer: typeof pkg.createServer === 'function',
  hasHookManager: typeof pkg.hookManager?.on === 'function',
  hasLifecycleHook: typeof pkg.LifecycleHook?.INITIALIZE === 'string',
  hasEventBus: typeof pkg.EventBus === 'function',
  hasServiceRegistry: typeof pkg.ServiceRegistry === 'function',
  hasHttpError: typeof pkg.HttpError === 'function',
  hasSignToken: typeof pkg.signToken === 'function',
  hasVerifyToken: typeof pkg.verifyToken === 'function'
}));`,
          ],
          project.consumerDir
        );
        const importResult = JSON.parse(importOutput) as {
          exports: string[];
          hasCreateServer: boolean;
          hasHookManager: boolean;
          hasLifecycleHook: boolean;
          hasEventBus: boolean;
          hasServiceRegistry: boolean;
          hasHttpError: boolean;
          hasSignToken: boolean;
          hasVerifyToken: boolean;
        };

        expect(importResult.exports).toContain('createServer');
        expect(importResult.exports).toContain('hookManager');
        expect(importResult.exports).toContain('LifecycleHook');
        expect(importResult.exports).toContain('EventBus');
        expect(importResult.exports).toContain('ServiceRegistry');
        expect(importResult.exports).toContain('HttpError');
        expect(importResult.exports).toContain('signToken');
        expect(importResult.exports).toContain('verifyToken');
        expect(importResult.hasCreateServer).toBe(true);
        expect(importResult.hasHookManager).toBe(true);
        expect(importResult.hasLifecycleHook).toBe(true);
        expect(importResult.hasEventBus).toBe(true);
        expect(importResult.hasServiceRegistry).toBe(true);
        expect(importResult.hasHttpError).toBe(true);
        expect(importResult.hasSignToken).toBe(true);
        expect(importResult.hasVerifyToken).toBe(true);
      } finally {
        fs.rmSync(project.packageWorkDir, { recursive: true, force: true });
      }
    },
    60_000
  );

  it(
    'verifies release-critical runtime behavior from the packed npm artifact',
    async () => {
      const project = preparePackedConsumerProject('package-release-gate-');
      const jobOutputPath = path.join(project.consumerDir, 'scheduler-output.json');

      try {
        fs.writeFileSync(
          path.join(project.controllersDir, 'ping-controller.js'),
          `module.exports = {
  route: '/ping',
  handlers: [
    {
      method: 'get',
      path: '/',
      secure: false,
      handler: (_req, res) => {
        res.json({ pong: true });
      }
    }
  ]
};
`,
          'utf8'
        );

        fs.writeFileSync(
          path.join(project.controllersDir, 'secure-controller.js'),
          `module.exports = {
  route: '/secure',
  handlers: [
    {
      method: 'get',
      path: '/basic',
      secure: 'basic',
      handler: (req, res) => {
        res.json({ ok: true, type: 'basic', username: req.auth?.username ?? null });
      }
    },
    {
      method: 'get',
      path: '/jwt',
      secure: 'jwt',
      handler: (req, res) => {
        res.json({ ok: true, type: 'jwt', sub: req.auth?.sub ?? null });
      }
    }
  ]
};
`,
          'utf8'
        );

        fs.writeFileSync(
          path.join(project.jobsDir, 'release-smoke.job.js'),
          `const fs = require('node:fs');

module.exports = {
  id: 'release-smoke-job',
  async run(_ctx, options) {
    fs.writeFileSync(
      options.outputPath,
      JSON.stringify({ ran: true, marker: options.marker }),
      'utf8'
    );
  }
};
`,
          'utf8'
        );

        writeJson(path.join(project.consumerDir, 'middleware.config.prod.json'), {
          port: 3001,
          host: '127.0.0.1',
          contextRoot: '/api',
          controllersPath: project.controllersDir,
          log: {
            access: path.join(project.logsDir, 'access.log'),
            application: path.join(project.logsDir, 'application.log'),
            level: 'fatal',
          },
          cors: { enabled: false, options: {} },
          helmet: { enabled: false, options: {} },
          rateLimit: { enabled: false, options: {} },
          metrics: { enabled: true, endpoint: '/__metrics' },
          telemetry: { enabled: false },
          ops: { enabled: true, secure: 'basic' },
          auth: {
            jwt: {
              enabled: true,
              secret: 'release-super-secret',
              algorithm: 'HS256',
              expiresIn: '1h',
            },
            basic: {
              enabled: true,
              users: {
                admin: 'swordfish',
              },
            },
          },
          scheduler: {
            enabled: true,
            mode: 'attached',
            timezone: 'Europe/Berlin',
            jobs: {
              releaseSmoke: {
                enabled: true,
                cron: '*/1 * * * * *',
                module: path.join(project.jobsDir, 'release-smoke.job.js'),
                options: {
                  outputPath: jobOutputPath,
                  marker: 'release-smoke',
                },
              },
            },
          },
        });

        writeJson(path.join(project.consumerDir, 'middleware.config.insecure.json'), {
          port: 3001,
          host: '127.0.0.1',
          contextRoot: '/api',
          controllersPath: project.controllersDir,
          log: {
            access: path.join(project.logsDir, 'access.log'),
            application: path.join(project.logsDir, 'application.log'),
            level: 'fatal',
          },
          cors: { enabled: false, options: {} },
          helmet: { enabled: false, options: {} },
          rateLimit: { enabled: false, options: {} },
          metrics: { enabled: false, endpoint: '/__metrics' },
          telemetry: { enabled: false },
          auth: { jwt: { enabled: false }, basic: { enabled: false } },
        });

        const releaseGateOutput = run(
          'node',
          [
            '-e',
            `console.warn = () => {};
const fs = require('node:fs');
const pkg = require('expresto-server');

async function requestJson(baseUrl, targetPath, init) {
  const response = await fetch(baseUrl + targetPath, init);
  const bodyText = await response.text();
  return {
    status: response.status,
    body: bodyText ? JSON.parse(bodyText) : null,
    authenticate: response.headers.get('www-authenticate'),
  };
}

async function waitForSchedulerOutput(outputPath) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (fs.existsSync(outputPath)) {
      return JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return null;
}

(async () => {
  let insecureOpsError = null;
  try {
    await pkg.createServer('./middleware.config.insecure.json');
  } catch (err) {
    insecureOpsError = err instanceof Error ? err.message : String(err);
  }

  const runtime = await pkg.createServer('./middleware.config.prod.json');
  const server = await new Promise((resolve, reject) => {
    const instance = runtime.app.listen(0, '127.0.0.1', () => resolve(instance));
    instance.on('error', reject);
  });

  try {
    const address = server.address();
    const baseUrl = 'http://127.0.0.1:' + address.port;
    const basicHeader = 'Basic ' + Buffer.from('admin:swordfish').toString('base64');
    const jwt = await pkg.signToken({ sub: 'release-user' }, 'release-super-secret', 'HS256');

    const publicRoute = await requestJson(baseUrl, '/api/ping/', {});
    const basicDenied = await requestJson(baseUrl, '/api/secure/basic', {});
    const basicAllowed = await requestJson(baseUrl, '/api/secure/basic', {
      headers: { authorization: basicHeader },
    });
    const jwtDenied = await requestJson(baseUrl, '/api/secure/jwt', {});
    const jwtAllowed = await requestJson(baseUrl, '/api/secure/jwt', {
      headers: { authorization: 'Bearer ' + jwt },
    });
    const healthDenied = await requestJson(baseUrl, '/api/__health', {});
    const healthAllowed = await requestJson(baseUrl, '/api/__health', {
      headers: { authorization: basicHeader },
    });
    const schedulerOutput = await waitForSchedulerOutput(${JSON.stringify(jobOutputPath)});

    console.log(JSON.stringify({
      insecureOpsError,
      schedulerRegistered: runtime.services.has('scheduler'),
      publicRoute,
      basicDenied,
      basicAllowed,
      jwtDenied,
      jwtAllowed,
      healthDenied,
      healthAllowed,
      schedulerOutput,
    }));
  } finally {
    const scheduler = runtime.services.get('scheduler');
    await scheduler?.shutdown?.();
    runtime.services.delete('scheduler');
    await new Promise((resolve, reject) => {
      server.close(err => (err ? reject(err) : resolve()));
    });
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});`,
          ],
          project.consumerDir,
          { NODE_ENV: 'production' }
        );

        const result = JSON.parse(releaseGateOutput) as {
          insecureOpsError: string | null;
          schedulerRegistered: boolean;
          publicRoute: { status: number; body: { pong: boolean } };
          basicDenied: { status: number; authenticate: string | null };
          basicAllowed: { status: number; body: { ok: boolean; type: string; username: string } };
          jwtDenied: { status: number };
          jwtAllowed: { status: number; body: { ok: boolean; type: string; sub: string } };
          healthDenied: { status: number; authenticate: string | null };
          healthAllowed: { status: number; body: { status?: string; services?: string[] } };
          schedulerOutput: { ran: boolean; marker: string } | null;
        };

        expect(result.insecureOpsError).toContain(
          'Ops endpoints must be disabled or protected in production'
        );
        expect(result.schedulerRegistered).toBe(true);
        expect(result.publicRoute.status).toBe(200);
        expect(result.publicRoute.body).toEqual({ pong: true });
        expect(result.basicDenied.status).toBe(401);
        expect(result.basicDenied.authenticate).toContain('Basic realm="expresto-server"');
        expect(result.basicAllowed.status).toBe(200);
        expect(result.basicAllowed.body).toEqual({
          ok: true,
          type: 'basic',
          username: 'admin',
        });
        expect(result.jwtDenied.status).toBe(401);
        expect(result.jwtAllowed.status).toBe(200);
        expect(result.jwtAllowed.body).toEqual({
          ok: true,
          type: 'jwt',
          sub: 'release-user',
        });
        expect(result.healthDenied.status).toBe(401);
        expect(result.healthDenied.authenticate).toContain('Basic realm="expresto-server"');
        expect(result.healthAllowed.status).toBe(200);
        expect(result.healthAllowed.body).toMatchObject({ status: 'ok' });
        expect(result.healthAllowed.body.services).toEqual(
          expect.arrayContaining(['scheduler', 'routes'])
        );
        expect(result.schedulerOutput).toEqual({
          ran: true,
          marker: 'release-smoke',
        });
      } finally {
        fs.rmSync(project.packageWorkDir, { recursive: true, force: true });
      }
    },
    60_000
  );
});
