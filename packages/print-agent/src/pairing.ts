// ── King Print Agent — pairing flow ──────────────────────────────────────────
// Admin generates a pairing code (8 hex, 10min TTL, single-use) in the Admin UI.
// The agent exchanges it for a device token bound to the printer.

import { ApiClient } from './api-client.js';
import { saveCredentials, generateDeviceId, DeviceCredentials } from './auth.js';
import { logger } from './logger.js';

export interface PairOptions {
  apiBaseUrl: string;
  printerId: string;
  code: string;
}

export async function pairDevice(opts: PairOptions): Promise<DeviceCredentials> {
  const deviceId = generateDeviceId();
  const client = new ApiClient({ baseUrl: opts.apiBaseUrl, deviceToken: '' });
  logger.info('pairing', 'exchanging pairing code', { printerId: opts.printerId });
  const result = await client.pair(opts.printerId, opts.code, deviceId);
  if (!result.paired) {
    throw new Error('Pairing rejected by server');
  }
  // The server stores the deviceId as the token (MVP design from P15).
  // The agent uses deviceId as its credential.
  const creds: DeviceCredentials = { deviceId, deviceToken: deviceId, printerId: opts.printerId };
  saveCredentials(creds);
  logger.info('pairing', 'device paired successfully');
  return creds;
}
