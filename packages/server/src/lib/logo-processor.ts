// ── KING PRINT P15.3 — Logo processor ────────────────────────────────────────
// Converts an uploaded logo (PNG/JPEG/WebP) into a 1-bit ESC/POS raster.
// Pipeline: decode → resize (fit paper width) → grayscale → threshold dither
// → ESC/POS GS v 0 bitmap bytes. Never sends color images to the printer.

import { createRequire } from 'module';

const nodeRequire = createRequire(__filename);

export interface ProcessedLogo {
  width: number;      // columns (bytes)
  height: number;     // rows
  data: Buffer;       // 1-bit raster, row-major, LSB-first per byte
  bytes: number;
}

const MAX_FILE_BYTES = 512 * 1024; // 512 KB
const MAX_WIDTH_PX = 384;          // ~48 columns at 8px/col
const MAX_HEIGHT_PX = 128;         // keep logos short

export class LogoError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Validate MIME by magic bytes, not extension. */
export function sniffImageType(buf: Buffer): 'png' | 'jpeg' | 'webp' | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

/** Decode PNG/JPEG/WebP into RGBA pixels. */
function decodeImage(buf: Buffer, type: 'png' | 'jpeg' | 'webp'): { width: number; height: number; rgba: Buffer } {
  if (type === 'png') {
    const { PNG } = nodeRequire('pngjs') as any;
    const png = PNG.sync.read(buf);
    return { width: png.width, height: png.height, rgba: png.data };
  }
  if (type === 'jpeg') {
    const jpeg = nodeRequire('jpeg-js') as any;
    const decoded = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
    return { width: decoded.width, height: decoded.height, rgba: Buffer.from(decoded.data) };
  }
  // WebP: no pure-JS decoder available — reject with clear message
  throw new LogoError('WebP not supported for thermal logos — use PNG or JPEG', 400);
}

/** Nearest-neighbor resize to fit max width/height. */
function resizeNearest(src: Buffer, sw: number, sh: number, dw: number, dh: number): Buffer {
  const out = Buffer.alloc(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / dw));
      const si = (sy * sw + sx) * 4;
      const di = (y * dw + x) * 4;
      out[di] = src[si];
      out[di + 1] = src[si + 1];
      out[di + 2] = src[si + 2];
      out[di + 3] = src[si + 3];
    }
  }
  return out;
}

/** Grayscale (luma) + alpha-aware threshold → 1-bit raster. */
function to1Bit(rgba: Buffer, w: number, h: number): Buffer {
  const rowBytes = Math.ceil(w / 8);
  const out = Buffer.alloc(rowBytes * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = rgba[i], g = rgba[i + 1], b = rgba[i + 2], a = rgba[i + 3];
      // alpha < 128 → treat as white (paper)
      const lum = a < 128 ? 255 : Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      const bit = lum < 128 ? 1 : 0; // dark → ink
      if (bit) {
        const byteIdx = y * rowBytes + Math.floor(x / 8);
        out[byteIdx] |= 0x80 >> (x % 8);
      }
    }
  }
  return out;
}

/**
 * Process a logo upload into ESC/POS raster data.
 * Throws LogoError on invalid input (never crashes the request).
 */
export function processLogo(buf: Buffer): ProcessedLogo {
  if (!buf || buf.length === 0) throw new LogoError('Empty file', 400);
  if (buf.length > MAX_FILE_BYTES) throw new LogoError('Logo too large (max 512 KB)', 400);

  const type = sniffImageType(buf);
  if (!type) throw new LogoError('Invalid image type — PNG or JPEG required', 400);

  const { width, height, rgba } = decodeImage(buf, type);
  if (width <= 0 || height <= 0) throw new LogoError('Invalid image dimensions', 400);

  // Fit within max size, preserving aspect ratio
  const scale = Math.min(1, MAX_WIDTH_PX / width, MAX_HEIGHT_PX / height);
  const dw = Math.max(1, Math.round(width * scale));
  const dh = Math.max(1, Math.round(height * scale));

  const resized = dw === width && dh === height ? rgba : resizeNearest(rgba, width, height, dw, dh);
  const raster = to1Bit(resized, dw, dh);

  return { width: dw, height: dh, data: raster, bytes: raster.length };
}

/** Build ESC/POS GS v 0 bitmap command bytes for a processed logo. */
export function buildLogoEscpos(logo: ProcessedLogo): Buffer {
  const ESC = 0x1b, GS = 0x1d;
  const rowBytes = Math.ceil(logo.width / 8);
  const header = Buffer.from([GS, 0x76, 0x30, 0x00, rowBytes & 0xff, (rowBytes >> 8) & 0xff, logo.height & 0xff, (logo.height >> 8) & 0xff]);
  return Buffer.concat([header, logo.data]);
}
