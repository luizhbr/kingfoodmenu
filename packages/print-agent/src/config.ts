// ── King Print Agent — configuration ─────────────────────────────────────────
// Loaded from env / .env / CLI flags. Never contains secrets in output.

export interface AgentConfig {
  apiBaseUrl: string;
  deviceId: string;
  deviceToken: string;
  printerId: string;
  printerName: string;      // OS printer name (OS_PRINTER) or network host
  printerPort: number;      // network port (default 9100)
  printerType: 'USB' | 'NETWORK' | 'OS_PRINTER';
  paperWidth: 58 | 80;
  usbVid?: string;          // hex, e.g. "0x0416"
  usbPid?: string;          // hex, e.g. "0x5011"
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  retryBaseMs: number;
  retryMaxMs: number;
  maxAttempts: number;
  logLevel: string;
  /** print density 0-255 (0=default). Maior = mais escuro. */
  printDensity: number;
}

export function loadConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  const cfg: AgentConfig = {
    apiBaseUrl: process.env.KING_PRINT_API_URL || 'https://king-food-foundation-ui.vercel.app',
    deviceId: process.env.KING_PRINT_DEVICE_ID || '',
    deviceToken: process.env.KING_PRINT_DEVICE_TOKEN || '',
    printerId: process.env.KING_PRINT_PRINTER_ID || '',
    printerName: process.env.KING_PRINT_PRINTER_NAME || '',
    printerPort: parseInt(process.env.KING_PRINT_PRINTER_PORT || '9100', 10),
    printerType: (process.env.KING_PRINT_PRINTER_TYPE as AgentConfig['printerType']) || 'USB',
    paperWidth: (parseInt(process.env.KING_PRINT_PAPER_WIDTH || '80', 10) === 58 ? 58 : 80),
    usbVid: process.env.KING_PRINT_USB_VID || undefined,
    usbPid: process.env.KING_PRINT_USB_PID || undefined,
    pollIntervalMs: parseInt(process.env.KING_PRINT_POLL_INTERVAL_MS || '3000', 10),
    heartbeatIntervalMs: parseInt(process.env.KING_PRINT_HEARTBEAT_MS || '15000', 10),
    retryBaseMs: parseInt(process.env.KING_PRINT_RETRY_BASE_MS || '2000', 10),
    retryMaxMs: parseInt(process.env.KING_PRINT_RETRY_MAX_MS || '60000', 10),
    maxAttempts: parseInt(process.env.KING_PRINT_MAX_ATTEMPTS || '5', 10),
    logLevel: process.env.KING_PRINT_LOG_LEVEL || 'info',
    printDensity: parseInt(process.env.KING_PRINT_DENSITY || '0', 10),
  };
  return { ...cfg, ...overrides };
}

export function validateConfig(cfg: AgentConfig): string[] {
  const errors: string[] = [];
  if (!cfg.apiBaseUrl) errors.push('KING_PRINT_API_URL is required');
  if (!cfg.deviceId) errors.push('KING_PRINT_DEVICE_ID is required (run: king-print pair)');
  if (!cfg.deviceToken) errors.push('KING_PRINT_DEVICE_TOKEN is required (run: king-print pair)');
  if (!cfg.printerId) errors.push('KING_PRINT_PRINTER_ID is required (run: king-print pair)');
  if (cfg.printerType === 'NETWORK' && !cfg.printerName) errors.push('KING_PRINT_PRINTER_NAME (host) is required for NETWORK');
  if (cfg.printerType === 'OS_PRINTER' && !cfg.printerName) errors.push('KING_PRINT_PRINTER_NAME is required for OS_PRINTER');
  if (cfg.paperWidth !== 58 && cfg.paperWidth !== 80) errors.push('KING_PRINT_PAPER_WIDTH must be 58 or 80');
  return errors;
}
