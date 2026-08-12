// ── King Print Agent — OS_PRINTER driver (winspool.drv P/Invoke) ────────────
// Sends RAW ESC/POS bytes to a Windows spooler printer via PowerShell Add-Type.
// Technique validated physically on RONGTA 80mm Series Printer (USB001):
//   RAW_PRINT_OK bytes=21 (see scripts/raw-print-test.ps1 — source of truth).
// Zero npm dependency — uses only the Windows spooler API.
//
// CRITICAL (validated): DOCINFOA has EXACTLY 3 fields (pDocName, pOutputFile,
// pDataType) with [MarshalAs(UnmanagedType.LPStr)] — NO cbSize. OpenPrinter
// uses CharSet.Unicode. StartDocPrinter takes `ref DOCINFOA`. Any deviation
// (cbSize, IntPtr marshaling, CharSet.Ansi on OpenPrinter) causes
// AccessViolationException on StartDocPrinter.

import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execFileAsync = promisify(execFile);

const PS_TEMPLATE = `
$ErrorActionPreference = "Stop"
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class KingWinSpool {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Ansi)]
  public struct DOCINFOA {
    [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
  }
  [DllImport("winspool.drv", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA pDocInfo);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError=true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
}
"@
$printerName = "__PRINTER__"
$bytes = [Convert]::FromBase64String("__B64__")
$h = [IntPtr]::Zero
if (-not [KingWinSpool]::OpenPrinter($printerName, [ref]$h, [IntPtr]::Zero)) {
  Write-Output ("RAW_PRINT_FAIL open err=" + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
  exit 1
}
$di = New-Object KingWinSpool+DOCINFOA
$di.pDocName = "KingFood"
$di.pDataType = "RAW"
try {
  if (-not [KingWinSpool]::StartDocPrinter($h, 1, [ref]$di)) {
    Write-Output ("RAW_PRINT_FAIL startdoc err=" + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
    exit 1
  }
  [KingWinSpool]::StartPagePrinter($h) | Out-Null
  $written = 0
  if (-not [KingWinSpool]::WritePrinter($h, $bytes, $bytes.Length, [ref]$written)) {
    Write-Output ("RAW_PRINT_FAIL write err=" + [Runtime.InteropServices.Marshal]::GetLastWin32Error())
    exit 1
  }
  [KingWinSpool]::EndPagePrinter($h) | Out-Null
  [KingWinSpool]::EndDocPrinter($h) | Out-Null
  Write-Output ("RAW_PRINT_OK bytes=" + $written)
} finally {
  [KingWinSpool]::ClosePrinter($h)
}
`;

export interface RawPrintResult {
  ok: boolean;
  bytes: number;
  error?: string;
}

/** Send raw bytes to a Windows spooler printer by name. */
export async function rawPrint(printerName: string, data: Buffer): Promise<RawPrintResult> {
  const b64 = data.toString('base64');
  const script = PS_TEMPLATE.replace('__B64__', b64).replace('__PRINTER__', printerName);
  try {
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 30000, maxBuffer: 4 * 1024 * 1024, windowsHide: true },
    );
    const m = stdout.match(/RAW_PRINT_OK bytes=(\d+)/);
    if (m) {
      const bytes = parseInt(m[1], 10);
      logger.info('os-printer', 'raw print ok', { printer: printerName, bytes });
      return { ok: true, bytes };
    }
    const err = stdout.trim() || 'unknown spooler error';
    logger.error('os-printer', 'raw print failed', { printer: printerName, error: err });
    return { ok: false, bytes: 0, error: err };
  } catch (e: any) {
    const msg = String(e?.message || e);
    logger.error('os-printer', 'raw print exception', { printer: printerName, error: msg });
    return { ok: false, bytes: 0, error: msg };
  }
}

/** List installed printers (used by `king-print status`). */
export async function listPrinters(): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-Command', 'Get-Printer | Select-Object -ExpandProperty Name'],
      { timeout: 20000, maxBuffer: 1024 * 1024, windowsHide: true },
    );
    return stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}
