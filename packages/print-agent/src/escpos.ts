// ── King Print Agent — ESC/POS byte builder ──────────────────────────────────
// Pure functions that turn ticket text into ESC/POS bytes.
// No hardware access here — unit-testable without a printer.

import iconv from 'iconv-lite';

// ESC/POS control bytes
const ESC = 0x1b;
const GS = 0x1d;

export interface EscposOptions {
  paperWidth: 58 | 80;
  /** bytes per line for the configured paper (80mm=48 chars, 58mm=32 chars) */
  columns?: number;
  encoding?: string;
  /** print density 0-255 (ESC/POS GS ( E fn=4). 0=default, >0 escurece. */
  density?: number;
}

export function columnsFor(paperWidth: 58 | 80): number {
  return paperWidth === 58 ? 32 : 48;
}

/** Initialize printer + center + bold on/off helpers. */
export function initPrinter(): Buffer {
  return Buffer.from([ESC, 0x40]); // ESC @
}

/**
 * Print density via GS ( E <pL> <pH> <fn> <n> (fn=4).
 * n=0 → default; valores maiores escurecem (típico 0-255).
 * Suportado pela RONGTA 80mm e maioria das térmicas ESC/POS.
 */
export function setDensity(n: number): Buffer {
  const v = Math.max(0, Math.min(255, Math.round(n)));
  return Buffer.from([GS, 0x28, 0x45, 0x03, 0x00, 0x04, v]);
}

export function alignCenter(): Buffer {
  return Buffer.from([ESC, 0x61, 0x01]);
}

export function alignLeft(): Buffer {
  return Buffer.from([ESC, 0x61, 0x00]);
}

export function boldOn(): Buffer {
  return Buffer.from([ESC, 0x45, 0x01]);
}

export function boldOff(): Buffer {
  return Buffer.from([ESC, 0x45, 0x00]);
}

export function feed(n: number): Buffer {
  return Buffer.from([ESC, 0x64, n]);
}

export function cut(): Buffer {
  return Buffer.from([GS, 0x56, 0x00]); // full cut
}

export function line(text: string, opts: { bold?: boolean; center?: boolean; encoding?: string } = {}): Buffer {
  const enc = opts.encoding || 'cp850';
  const parts: Buffer[] = [];
  if (opts.center) parts.push(alignCenter());
  if (opts.bold) parts.push(boldOn());
  parts.push(iconv.encode(text + '\n', enc));
  if (opts.bold) parts.push(boldOff());
  if (opts.center) parts.push(alignLeft());
  return Buffer.concat(parts);
}

/**
 * Build a full ESC/POS document from plain text.
 * Each line is encoded with the printer charset (cp850 covers PT-BR accents).
 */
export function buildEscposBuffer(text: string, opts: EscposOptions): Buffer {
  const enc = opts.encoding || 'cp850';
  const parts: Buffer[] = [initPrinter()];
  // Densidade de impressão (escurecer): aplicada logo após o init.
  if (opts.density && opts.density > 0) parts.push(setDensity(opts.density));
  const lines = text.split('\n');
  for (const ln of lines) {
    parts.push(iconv.encode(ln + '\n', enc));
  }
  parts.push(feed(3));
  parts.push(cut());
  return Buffer.concat(parts);
}

/** Escape hatch for tests: raw bytes for a single line. */
export function encodeLine(text: string, encoding = 'cp850'): Buffer {
  return iconv.encode(text + '\n', encoding);
}
