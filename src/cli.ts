#!/usr/bin/env node
import { loadConfig } from './lib/config';

async function validateConfig(pathArg?: string) {
  const configPath = pathArg || './middleware.config.json';
  try {
    const config = await loadConfig(configPath);
    console.log(`✅ Configuration at '${configPath}' is valid.`);
    process.exit(0);
  } catch (err: any) {
    console.error(`❌ Configuration validation failed:\n${err.message}`);
    process.exit(1);
  }
}

validateConfig(process.argv[2]);
