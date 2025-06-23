import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const require = createRequire(import.meta.url);
const schema = require('../../middleware.config.schema.json');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

export interface AuthConfig {
  jwt?: {
    enabled?: boolean;
    secret: string;
    algorithm?: string;
    expiresIn?: string;
  };
  basic?: {
    enabled?: boolean;
    users?: Record<string, string>;
  };
}

export interface AppConfig {
  port: number;
  host?: string;
  contextRoot: string;
  controllersPath: string;
  log: {
    access: string;
    application: string;
    level: string;
    traceRequests?: boolean;
  };
  cors?: { options?: Record<string, any> };
  helmet?: { options?: Record<string, any> };
  rateLimit?: {
    enabled?: boolean;
    options: Record<string, any>;
  };
  auth?: AuthConfig;
  cluster?: { enabled?: boolean };
  metrics?: { endpoint?: string };
}

/**
 * Loads and validates middleware configuration from JSON file.
 */
export async function loadConfig(configPath: string): Promise<AppConfig> {
  const file = await fs.readFile(path.resolve(configPath), 'utf-8');
  const config = JSON.parse(file);

  if (!validate(config)) {
    const errors = validate.errors?.map(err => `${err.instancePath} ${err.message}`).join('; ');
    throw new Error(`Configuration validation failed: ${errors}`);
  }

  // ✅ safe cast after schema validation
  return config as AppConfig;
}
