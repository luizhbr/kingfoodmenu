// ── King Print Agent — logger ────────────────────────────────────────────────
// Plain-text logger with levels. NEVER logs device tokens or pairing codes.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

let currentLevel: LogLevel = (process.env.KING_PRINT_LOG_LEVEL as LogLevel) || 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function ts(): string {
  return new Date().toISOString();
}

function sanitize(msg: string): string {
  // Never leak tokens/codes in logs
  return msg
    .replace(/(Device\s+)[a-f0-9]{8,}/gi, '$1***')
    .replace(/(pairingCode\s*[=:]\s*)[A-F0-9]{6,}/gi, '$1***')
    .replace(/(code\s*[=:]\s*)[A-F0-9]{6,}/gi, '$1***');
}

export function log(level: LogLevel, component: string, msg: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const line = `[${ts()}] [${level.toUpperCase()}] [${component}] ${sanitize(msg)}`;
  if (meta) {
    const safe = JSON.stringify(meta, (k, v) => (typeof v === 'string' && /token|code|secret|key/i.test(k) ? '***' : v));
    console.log(`${line} ${safe}`);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (c: string, m: string, meta?: Record<string, unknown>) => log('debug', c, m, meta),
  info: (c: string, m: string, meta?: Record<string, unknown>) => log('info', c, m, meta),
  warn: (c: string, m: string, meta?: Record<string, unknown>) => log('warn', c, m, meta),
  error: (c: string, m: string, meta?: Record<string, unknown>) => log('error', c, m, meta),
};
