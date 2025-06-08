import fs from 'fs';
import path from 'path';

// Define the base structure of the configuration file
export interface AppConfig {
  port: number;
  host?: string;
  contextRoot: string;
  controllersPath: string;
  log: {
    access: string;
    application: string;
    level?: 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    traceRequests?: boolean;
  };
  auth?: {
    basic?: {
      enabled: boolean;
      users: Record<string, string>; // username → password
    };
    jwt?: {
      enabled: boolean;
      secret: string;
      algorithm?: string;
      expiresIn?: string;
    };
  };
  cors?: {
    enabled?: boolean;
    options?: Record<string, any>;
  };
  helmet?: {
    enabled?: boolean;
    options?: Record<string, any>;
  };
  rateLimit?: {
    enabled: boolean;
    options: Record<string, any>;
  };
  cluster?: {
    enabled: boolean;
  };
  metrics?: {
    endpoint?: string;
  };
}

/**
 * Loads the application config JSON asynchronously and merges it with defaults.
 * @param configPath Path to the configuration JSON file.
 */
export async function loadConfig(configPath: string): Promise<AppConfig> {
  const resolvedPath = path.resolve(configPath);

  try {
    await fs.promises.access(resolvedPath, fs.constants.F_OK);
  } catch {
    throw new Error(`Config file not found: ${resolvedPath}`);
  }

  const raw = await fs.promises.readFile(resolvedPath, 'utf-8');
  const parsed = JSON.parse(raw);

  // Apply minimal default values
  return {
    host: '0.0.0.0',
    log: {
      level: 'INFO',
      traceRequests: false,
      ...parsed.log,
    },
    cors: {
      enabled: true,
      options: { origin: '*', credentials: true },
      ...parsed.cors,
    },
    helmet: {
      enabled: true,
      options: {},
      ...parsed.helmet,
    },
    ...parsed,
  } satisfies AppConfig;
}
