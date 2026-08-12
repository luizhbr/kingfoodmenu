#!/usr/bin/env node
// ── King Print Agent — CLI ───────────────────────────────────────────────────
// Commands:
//   king-print start            run the polling agent (foreground)
//   king-print status           show health report
//   king-print pair <printerId> <code>   pair this device with a printer
//   king-print test             physical self-test print (KING FOOD + TEST)
//   king-print config           show effective config (no secrets)

import 'dotenv/config';
import { loadConfig, validateConfig, AgentConfig } from './config.js';
import { ApiClient } from './api-client.js';
import { createDriver } from './driver-adapter.js';
import { PrintAgent } from './polling.js';
import { buildHealth } from './health.js';
import { pairDevice } from './pairing.js';
import { loadCredentials, saveCredentials, clearCredentials, generateDeviceId } from './auth.js';
import { buildTestTicket, renderTestTicket } from './formatter.js';
import { buildEscposBuffer } from './escpos.js';
import { logger } from './logger.js';

function fail(msg: string): never {
  console.error(`king-print: ${msg}`);
  process.exit(1);
}

async function cmdStart(cfg: AgentConfig): Promise<void> {
  const errors = validateConfig(cfg);
  if (errors.length) fail(errors.join('; '));
  const api = new ApiClient({ baseUrl: cfg.apiBaseUrl, deviceToken: cfg.deviceToken });
  const driver = createDriver(cfg);
  const agent = new PrintAgent(cfg, api, driver);
  await agent.start();
  logger.info('cli', 'agent running', { api: cfg.apiBaseUrl, printer: cfg.printerName });
  // keep alive
  const shutdown = async () => {
    await agent.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
  setInterval(() => {}, 1 << 30); // hold event loop
}

async function cmdStatus(cfg: AgentConfig): Promise<void> {
  const creds = loadCredentials();
  const api = new ApiClient({ baseUrl: cfg.apiBaseUrl, deviceToken: creds?.deviceToken || cfg.deviceToken });
  let apiOk = false;
  try {
    await api.heartbeat();
    apiOk = true;
  } catch { /* down */ }
  const driver = createDriver(cfg);
  let connected = false;
  try { await driver.connect(); connected = true; await driver.disconnect(); } catch { /* offline */ }
  const queue = new (await import('./queue.js')).PrintQueue();
  const report = buildHealth({
    apiOk,
    deviceId: creds?.deviceId || cfg.deviceId,
    printerType: cfg.printerType,
    printerName: cfg.printerName,
    driverConnected: connected,
    queue,
    startedAt: Date.now(),
  });
  console.log(JSON.stringify(report, null, 2));
}

async function cmdPair(printerId: string, code: string, cfg: AgentConfig): Promise<void> {
  const creds = await pairDevice({ apiBaseUrl: cfg.apiBaseUrl, printerId, code });
  console.log('Paired OK. deviceId=' + creds.deviceId);
  console.log('Credentials saved to ' + (await import('./auth.js')).credentialsPath());
}

async function cmdTest(cfg: AgentConfig): Promise<void> {
  const driver = createDriver(cfg);
  try {
    await driver.connect();
  } catch (e: any) {
    fail(`cannot connect printer: ${String(e?.message || e)}`);
  }
  const result = await driver.testPrint();
  await driver.disconnect();
  if (result.ok) {
    console.log(`TEST PRINT OK bytes=${result.bytes}`);
  } else {
    console.error(`TEST PRINT FAIL: ${result.error}`);
    process.exit(1);
  }
}

async function cmdConfig(cfg: AgentConfig): Promise<void> {
  const { deviceToken: _t, ...safe } = cfg;
  console.log(JSON.stringify(safe, null, 2));
}

async function main(): Promise<void> {
  const [cmd, a, b] = process.argv.slice(2);
  const cfg = loadConfig();
  switch (cmd) {
    case 'start': return cmdStart(cfg);
    case 'status': return cmdStatus(cfg);
    case 'pair': {
      if (!a || !b) fail('usage: king-print pair <printerId> <code>');
      return cmdPair(a, b, cfg);
    }
    case 'test': return cmdTest(cfg);
    case 'config': return cmdConfig(cfg);
    case 'unpair': clearCredentials(); console.log('Credentials cleared'); return;
    default:
      console.log('king-print — King Food thermal print agent');
      console.log('usage: king-print <start|status|pair|test|config|unpair>');
      process.exit(cmd ? 1 : 0);
  }
}

void main();
