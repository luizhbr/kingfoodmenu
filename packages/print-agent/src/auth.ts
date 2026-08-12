// ── King Print Agent — device authentication ─────────────────────────────────
// The agent authenticates with the device token obtained during pairing.
// The token is stored in the local config file (0600 perms) and NEVER logged.

import fs from 'fs';
import path from 'path';
import os from 'os';

export interface DeviceCredentials {
  deviceId: string;
  deviceToken: string;
  printerId: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.king-print');
const CRED_FILE = path.join(CONFIG_DIR, 'credentials.json');

export function credentialsPath(): string {
  return CRED_FILE;
}

export function saveCredentials(creds: DeviceCredentials): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CRED_FILE, JSON.stringify(creds, null, 2), { mode: 0o600 });
  // Best-effort chmod on POSIX; Windows ignores it.
  try { fs.chmodSync(CRED_FILE, 0o600); } catch { /* Windows */ }
}

export function loadCredentials(): DeviceCredentials | null {
  try {
    if (!fs.existsSync(CRED_FILE)) return null;
    const raw = fs.readFileSync(CRED_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.deviceId || !parsed.deviceToken || !parsed.printerId) return null;
    return parsed as DeviceCredentials;
  } catch {
    return null;
  }
}

export function clearCredentials(): void {
  try { fs.unlinkSync(CRED_FILE); } catch { /* not present */ }
}

export function generateDeviceId(): string {
  // Stable per-machine id: hostname + machine guid hash (no PII in logs)
  const host = os.hostname();
  const crypto = require('crypto') as typeof import('crypto');
  return crypto.createHash('sha256').update(`king-print:${host}`).digest('hex').slice(0, 16);
}
