import { describe, it, expect } from 'vitest';
import { loadConfig } from '../src/lib/config';
import path from 'path';

const validConfigPath = path.resolve(__dirname, './fixtures/valid-config.json');
const invalidConfigPath = path.resolve(__dirname, './fixtures/invalid-config.json');

describe('Configuration Validation', () => {
  it('loads a valid config without error', async () => {
    const config = await loadConfig(validConfigPath);
    expect(config).toBeDefined();
    expect(config.port).toBe(3000);
    expect(config.auth?.jwt?.algorithm).toBe('HS512');
  });

  it('throws on invalid config', async () => {
    await expect(loadConfig(invalidConfigPath)).rejects.toThrow('Configuration validation failed');
  });
});
