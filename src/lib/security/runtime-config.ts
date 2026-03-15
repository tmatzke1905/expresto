import type { AppConfig } from '../config';

export type OpsSecurityMode = 'none' | 'basic' | 'jwt';

const INSECURE_JWT_SECRETS = new Set(['default_secret', 'change-me']);

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasConfiguredBasicUsers(
  users: AppConfig['auth'] extends infer T
    ? T extends { basic?: { users?: infer U } }
      ? U
      : never
    : never
): boolean {
  if (Array.isArray(users)) {
    return users.some(user => hasNonEmptyString(user.username) && hasNonEmptyString(user.password));
  }

  if (!users || typeof users !== 'object') {
    return false;
  }

  return Object.entries(users).some(([username, password]) => {
    return hasNonEmptyString(username) && hasNonEmptyString(password);
  });
}

export function isJwtEnabled(config: AppConfig): boolean {
  return config.auth?.jwt?.enabled === true;
}

export function isBasicEnabled(config: AppConfig): boolean {
  return config.auth?.basic?.enabled === true;
}

export function areOpsEnabled(config: AppConfig): boolean {
  return config.ops?.enabled !== false;
}

export function getOpsSecurityMode(config: AppConfig): OpsSecurityMode {
  const mode = config.ops?.secure;
  if (mode === 'basic' || mode === 'jwt') {
    return mode;
  }
  return 'none';
}

export function assertJwtAuthConfigured(config: AppConfig, context: string): void {
  if (!isJwtEnabled(config)) {
    throw new Error(`${context} requires auth.jwt.enabled=true.`);
  }

  const secret = config.auth?.jwt?.secret?.trim();
  if (!secret) {
    throw new Error(`${context} requires auth.jwt.secret to be set.`);
  }

  if (INSECURE_JWT_SECRETS.has(secret)) {
    throw new Error(`${context} requires auth.jwt.secret to not use a default placeholder value.`);
  }
}

export function assertBasicAuthConfigured(config: AppConfig, context: string): void {
  if (!isBasicEnabled(config)) {
    throw new Error(`${context} requires auth.basic.enabled=true.`);
  }

  if (!hasConfiguredBasicUsers(config.auth?.basic?.users)) {
    throw new Error(`${context} requires at least one configured Basic Auth user.`);
  }
}

export function validateRuntimeSecurityConfig(config: AppConfig): void {
  if (isJwtEnabled(config)) {
    assertJwtAuthConfigured(config, 'JWT authentication');
  }

  if (isBasicEnabled(config)) {
    assertBasicAuthConfigured(config, 'Basic authentication');
  }

  if (config.websocket?.enabled) {
    assertJwtAuthConfigured(config, 'WebSocket authentication');
  }

  if (areOpsEnabled(config)) {
    const opsSecurityMode = getOpsSecurityMode(config);

    if (opsSecurityMode === 'jwt') {
      assertJwtAuthConfigured(config, 'Ops endpoint protection');
    } else if (opsSecurityMode === 'basic') {
      assertBasicAuthConfigured(config, 'Ops endpoint protection');
    }

    if (process.env.NODE_ENV === 'production' && opsSecurityMode === 'none') {
      throw new Error(
        'Ops endpoints must be disabled or protected in production (set ops.enabled=false or ops.secure to "basic" or "jwt").'
      );
    }
  }
}
