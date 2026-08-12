// ── King Print Agent — printer driver adapter ───────────────────────────────
// Unified interface over three transports:
//   USB        → escpos.USB (usb@1.9.2 pinned) — direct USB ESC/POS
//   NETWORK    → escpos.Network (TCP 9100) — network ESC/POS
//   OS_PRINTER → winspool.drv P/Invoke (rawPrint) — Windows spooler
// The agent NEVER decides prices — it only prints bytes the server authorized.

import { logger } from './logger.js';
import { rawPrint } from './os-printer.js';
import type { AgentConfig } from './config.js';

export interface PrintResult {
  ok: boolean;
  bytes: number;
  error?: string;
}

export interface PrinterDriver {
  readonly kind: 'USB' | 'NETWORK' | 'OS_PRINTER';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Send raw ESC/POS bytes. */
  print(data: Buffer): Promise<PrintResult>;
  /** Physical self-test (KING FOOD + KING PRINT TEST + STATUS: PASS). */
  testPrint(): Promise<PrintResult>;
}

// ── OS_PRINTER driver ────────────────────────────────────────────────────────

class OsPrinterDriver implements PrinterDriver {
  readonly kind = 'OS_PRINTER' as const;
  constructor(private name: string) {}

  async connect(): Promise<void> {
    const printers = await rawPrintList();
    if (!printers.includes(this.name)) {
      throw new Error(`OS printer not found: ${this.name}`);
    }
    logger.info('driver', 'os_printer connected', { printer: this.name });
  }

  async disconnect(): Promise<void> {
    // spooler printers need no persistent handle
  }

  async print(data: Buffer): Promise<PrintResult> {
    return rawPrint(this.name, data);
  }

  async testPrint(): Promise<PrintResult> {
    const { buildTestTicket, renderTestTicket } = await import('./formatter.js');
    const { buildEscposBuffer } = await import('./escpos.js');
    const text = renderTestTicket(buildTestTicket(), 80);
    return rawPrint(this.name, buildEscposBuffer(text, { paperWidth: 80 }));
  }
}

async function rawPrintList(): Promise<string[]> {
  const { listPrinters } = await import('./os-printer.js');
  return listPrinters();
}

// ── USB driver (escpos + usb@1.9.2) ──────────────────────────────────────────

// USB driver: uses escpos/adapter/usb directly (NOT escpos index → printer.js,
// which eagerly loads get-pixels → request → qs/tough-cookie/uuid vulnerable
// chain that this agent never executes). We send our own ESC/POS buffer via
// the adapter's write() — no image/raster/barcode code is ever loaded.
class UsbDriver implements PrinterDriver {
  readonly kind = 'USB' as const;
  private device: any = null;

  constructor(private vid?: string, private pid?: string) {}

  async connect(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const escposUsb = (await import('escpos/adapter/usb.js')).default ?? (await import('escpos/adapter/usb.js'));
    const USB = escposUsb.default ?? escposUsb;
    const vid = this.vid ? parseInt(this.vid.replace(/^0x/i, ''), 16) : undefined;
    const pid = this.pid ? parseInt(this.pid.replace(/^0x/i, ''), 16) : undefined;
    const device = vid && pid ? new USB(vid, pid) : new USB();
    await new Promise<void>((resolve, reject) => {
      device.open((err: Error | null) => (err ? reject(err) : resolve()));
    });
    this.device = device;
    logger.info('driver', 'usb connected', { vid: this.vid, pid: this.pid });
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try { this.device.close(); } catch { /* already closed */ }
      this.device = null;
    }
  }

  async print(data: Buffer): Promise<PrintResult> {
    if (!this.device) throw new Error('USB driver not connected');
    return new Promise<PrintResult>((resolve) => {
      try {
        this.device.write(data, (err: Error | null) => {
          if (err) resolve({ ok: false, bytes: 0, error: String(err.message || err) });
          else resolve({ ok: true, bytes: data.length });
        });
      } catch (e: any) {
        resolve({ ok: false, bytes: 0, error: String(e?.message || e) });
      }
    });
  }

  async testPrint(): Promise<PrintResult> {
    const { buildTestTicket, renderTestTicket } = await import('./formatter.js');
    const { buildEscposBuffer } = await import('./escpos.js');
    const text = renderTestTicket(buildTestTicket(), 80);
    return this.print(buildEscposBuffer(text, { paperWidth: 80 }));
  }
}

// ── NETWORK driver (escpos.Network TCP 9100) ─────────────────────────────────

class NetworkDriver implements PrinterDriver {
  readonly kind = 'NETWORK' as const;
  private device: any = null;

  constructor(private host: string, private port: number) {}

  async connect(): Promise<void> {
    const escposNet = (await import('escpos/adapter/network.js')).default ?? (await import('escpos/adapter/network.js'));
    const Network = escposNet.default ?? escposNet;
    const device = new Network(this.host, this.port);
    await new Promise<void>((resolve, reject) => {
      device.open((err: Error | null) => (err ? reject(err) : resolve()));
    });
    this.device = device;
    logger.info('driver', 'network connected', { host: this.host, port: this.port });
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try { this.device.close(); } catch { /* ignore */ }
      this.device = null;
    }
  }

  async print(data: Buffer): Promise<PrintResult> {
    if (!this.device) throw new Error('NETWORK driver not connected');
    return new Promise<PrintResult>((resolve) => {
      try {
        this.device.write(data, (err: Error | null) => {
          if (err) resolve({ ok: false, bytes: 0, error: String(err.message || err) });
          else resolve({ ok: true, bytes: data.length });
        });
      } catch (e: any) {
        resolve({ ok: false, bytes: 0, error: String(e?.message || e) });
      }
    });
  }

  async testPrint(): Promise<PrintResult> {
    const { buildTestTicket, renderTestTicket } = await import('./formatter.js');
    const { buildEscposBuffer } = await import('./escpos.js');
    const text = renderTestTicket(buildTestTicket(), 80);
    return this.print(buildEscposBuffer(text, { paperWidth: 80 }));
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createDriver(cfg: AgentConfig): PrinterDriver {
  switch (cfg.printerType) {
    case 'OS_PRINTER':
      return new OsPrinterDriver(cfg.printerName);
    case 'NETWORK':
      return new NetworkDriver(cfg.printerName, cfg.printerPort);
    case 'USB':
    default:
      return new UsbDriver(cfg.usbVid, cfg.usbPid);
  }
}
