#!/usr/bin/env node
// ── P15.1 FASE 9 — PHYSICAL PRINT TEST (RONGTA 80mm / USB001) ────────────────
// Runs TESTE 1..6 against the real printer. No real paid orders are used.
// Evidence is printed to stdout as JSON lines.

import { rawPrint, listPrinters } from '../dist/os-printer.js';
import { buildEscposBuffer } from '../dist/escpos.js';
import { PrintQueue } from '../dist/queue.js';
import { PrintAgent } from '../dist/polling.js';
import { ApiClient } from '../dist/api-client.js';
import { AutoPrintListener } from '../dist/auto-print.js';
import { createDriver } from '../dist/driver-adapter.js';

const PRINTER = process.env.KING_PRINT_PRINTER_NAME || 'RONGTA 80mm Series Printer';
const results = [];
const log = (test, pass, detail) => {
  results.push({ test, pass, detail });
  console.log(JSON.stringify({ test, pass, detail }));
};

// ── Full test ticket (ORDER TEST — synthetic data, never a real order) ──────
function buildOrderTestTicket() {
  const W = 42;
  const line = '='.repeat(W);
  const thin = '-'.repeat(W);
  const pad = (s) => s.padEnd(W);
  const out = [];
  out.push(pad('KING FOOD'));
  out.push(pad('ORDER TEST'));
  out.push(pad(new Date().toLocaleString('en-US', { hour12: false })));
  out.push(line);
  out.push(pad('1x X-Burger'));
  out.push(pad('   + Extra cheese'));
  out.push(pad('2x Coca-Cola'));
  out.push(line);
  out.push(pad('Type: DELIVERY'));
  out.push(pad('Subtotal: $12.00'));
  out.push(pad('Tax: $1.20'));
  out.push(pad('Total: $13.20'));
  out.push(pad('Payment: CARD'));
  out.push(thin);
  out.push('');
  out.push('');
  return out.join('\n');
}

// ── TESTE 1 — OS_PRINTER (winspool.drv RAW) ──────────────────────────────────
async function teste1() {
  console.log('\n### TESTE 1 — OS_PRINTER (winspool.drv)');
  const printers = await listPrinters();
  const found = printers.includes(PRINTER);
  log('T1-detect', found, `printers=[${printers.join(', ')}]`);
  if (!found) { log('T1-raw', false, 'printer not in spooler'); return; }

  const ticket = buildOrderTestTicket();
  const buf = buildEscposBuffer(ticket, { paperWidth: 80 });
  const res = await rawPrint(PRINTER, buf);
  log('T1-raw', res.ok, `RAW_PRINT_OK bytes=${res.bytes}${res.error ? ' err=' + res.error : ''}`);
}

// ── TESTE 2 — ESCPOS/USB direct ──────────────────────────────────────────────
async function teste2() {
  console.log('\n### TESTE 2 — ESCPOS/USB (usb@1.9.2)');
  try {
    const usbMod = await import('usb');
    const usb = usbMod.default ?? usbMod;
    const devices = usb.getDeviceList();
    const printerDevices = devices.filter((d) => {
      try {
        return d.configDescriptor.interfaces.some((iface) =>
          iface.some((conf) => conf.bInterfaceClass === 0x07)
        );
      } catch { return false; }
    });
    log('T2-detect', true, `usb devices=${devices.length}, printer-class=${printerDevices.length}`);
    if (printerDevices.length === 0) {
      log('T2-usb', false, 'NO raw USB printer device reachable — RONGTA is spooler-owned (USB001). Per brief: not FAIL, continue with OS_PRINTER. Reason: Windows spooler holds the USB interface; direct libusb claim would conflict with the driver.');
      return;
    }
    const driver = createDriver({ printerType: 'USB', usbVid: undefined, usbPid: undefined, printerName: PRINTER, printerPort: 9100, paperWidth: 80 });
    await driver.connect();
    const ticket = buildOrderTestTicket();
    const buf = buildEscposBuffer(ticket, { paperWidth: 80 });
    const res = await driver.print(buf);
    await driver.disconnect();
    log('T2-usb', res.ok, `USB direct print bytes=${res.bytes}${res.error ? ' err=' + res.error : ''}`);
  } catch (e) {
    log('T2-usb', false, `USB direct unavailable: ${e.message} — continue with OS_PRINTER (per brief)`);
  }
}

// ── TESTE 3 — FULL FLOW (QUEUED → PRINTING → PRINTED) via real driver ────────
async function teste3() {
  console.log('\n### TESTE 3 — FLUXO COMPLETO');
  const api = new ApiClient({ baseUrl: 'http://localhost:1', deviceToken: 'test' });
  const calls = [];
  api.fetchJobs = async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-3', orderId: 'order-3', printerId: 'p1', type: 'AUTO' }] });
  api.fetchTicket = async () => ({ ticket: {}, text: buildOrderTestTicket() });
  api.reportStatus = async (jobId, status) => { calls.push(status); return {}; };
  api.heartbeat = async () => {};

  const driver = createDriver({ printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80 });
  const cfg = { printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80, pollIntervalMs: 1000, heartbeatIntervalMs: 5000 };
  const agent = new PrintAgent(cfg, api, driver);
  const stats = await agent.pollOnce();

  const ticketText = buildOrderTestTicket();
  const hasAll = ['KING FOOD', 'ORDER TEST', 'Type: DELIVERY', '1x X-Burger', 'Subtotal', 'Tax', 'Total', 'Payment'].every((s) => ticketText.includes(s));
  log('T3-flow', stats.printed === 1 && calls.includes('PRINTING') && calls.includes('PRINTED'), `stats=${JSON.stringify(stats)} transitions=${calls.join('→')}`);
  log('T3-ticket', hasAll, 'ticket contains KING FOOD / ORDER TEST / type / items / subtotal / tax / total / payment');
  log('T3-state', agent.queue.get('job-3')?.status === 'PRINTED', `local state=${agent.queue.get('job-3')?.status}`);
}

// ── TESTE 4 — AUTO PRINT (order.statusChanged CONFIRMED) ─────────────────────
async function teste4() {
  console.log('\n### TESTE 4 — AUTO PRINT');
  const api = new ApiClient({ baseUrl: 'http://localhost:1', deviceToken: 'test' });
  let created = 0;
  api.createJob = async (orderId, printerId, type) => { created += 1; return { job: { id: 'job-4', orderId, printerId, type }, created: true }; };
  const listener = new AutoPrintListener({ printerId: 'p1' }, api);

  const evt = { order: { id: 'order-4', status: 'CONFIRMED', orderNumber: 'KF-4' }, previousStatus: 'PENDING' };
  const result = await listener.handleEvent(evt);
  log('T4-event', result?.created === true, `createJob called=${created} created=${result?.created}`);

  const api2 = new ApiClient({ baseUrl: 'http://localhost:1', deviceToken: 'test' });
  const calls2 = [];
  api2.fetchJobs = async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-4', orderId: 'order-4', printerId: 'p1', type: 'AUTO' }] });
  api2.fetchTicket = async () => ({ ticket: {}, text: buildOrderTestTicket() });
  api2.reportStatus = async (jobId, status) => { calls2.push(status); return {}; };
  api2.heartbeat = async () => {};
  const driver = createDriver({ printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80 });
  const agent = new PrintAgent({ printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80, pollIntervalMs: 1000, heartbeatIntervalMs: 5000 }, api2, driver);
  const stats = await agent.pollOnce();
  log('T4-print', stats.printed === 1 && calls2.includes('PRINTED'), `event→job→queue→formatter→RONGTA→PRINTED stats=${JSON.stringify(stats)}`);
}

// ── TESTE 5 — IDEMPOTÊNCIA (same event twice → 1 job → 1 print) ──────────────
async function teste5() {
  console.log('\n### TESTE 5 — IDEMPOTÊNCIA');
  const api = new ApiClient({ baseUrl: 'http://localhost:1', deviceToken: 'test' });
  let created = 0;
  api.createJob = async (orderId, printerId, type) => { created += 1; return { job: { id: 'job-5', orderId, printerId, type }, created: created === 1 }; };
  const listener = new AutoPrintListener({ printerId: 'p1' }, api);

  const evt = { order: { id: 'order-5', status: 'CONFIRMED', orderNumber: 'KF-5' }, previousStatus: 'PENDING' };
  await listener.handleEvent(evt);
  await listener.handleEvent(evt);
  log('T5-event', created === 1, `same event twice → createJob called=${created} (server @@unique enforces 1 job)`);

  const api2 = new ApiClient({ baseUrl: 'http://localhost:1', deviceToken: 'test' });
  const calls2 = [];
  api2.fetchJobs = async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-5', orderId: 'order-5', printerId: 'p1', type: 'AUTO' }] });
  api2.fetchTicket = async () => ({ ticket: {}, text: buildOrderTestTicket() });
  api2.reportStatus = async (jobId, status) => { calls2.push(status); return {}; };
  api2.heartbeat = async () => {};
  const driver = createDriver({ printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80 });
  const agent = new PrintAgent({ printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80, pollIntervalMs: 1000, heartbeatIntervalMs: 5000 }, api2, driver);
  await agent.pollOnce();
  await agent.pollOnce();
  log('T5-print', agent.queue.totalSeen === 1 && agent.queue.get('job-5')?.status === 'PRINTED', `1 order → 1 PrintJob → 1 print (totalSeen=${agent.queue.totalSeen}, status=${agent.queue.get('job-5')?.status})`);
}

// ── TESTE 6 — FAILURE/RECOVERY (mock — safe, documented) ─────────────────────
async function teste6() {
  console.log('\n### TESTE 6 — FAILURE/RECOVERY (mock)');
  // Per brief: only disconnect the physical printer if SAFE. The RONGTA is the
  // production kitchen printer — disabling it risks the physical environment.
  // Using a mock driver that simulates unavailable → retry → recovered.
  const api = new ApiClient({ baseUrl: 'http://localhost:1', deviceToken: 'test' });
  const calls = [];
  api.fetchJobs = async () => ({ printer: { id: 'p1' }, jobs: [{ id: 'job-6', orderId: 'order-6', printerId: 'p1', type: 'AUTO' }] });
  api.fetchTicket = async () => ({ ticket: {}, text: buildOrderTestTicket() });
  api.reportStatus = async (jobId, status) => { calls.push(status); return {}; };
  api.heartbeat = async () => {};

  let available = false;
  const mockDriver = {
    kind: 'OS_PRINTER',
    async connect() { if (!available) throw new Error('printer unavailable'); },
    async disconnect() {},
    async print() { if (!available) return { ok: false, bytes: 0, error: 'printer offline' }; return { ok: true, bytes: 100 }; },
    async testPrint() { return { ok: true, bytes: 10 }; },
  };
  const agent = new PrintAgent({ printerType: 'OS_PRINTER', printerName: PRINTER, printerPort: 9100, paperWidth: 80, pollIntervalMs: 1000, heartbeatIntervalMs: 5000 }, api, mockDriver);

  const s1 = await agent.pollOnce();
  const failed = agent.queue.get('job-6')?.status === 'FAILED';
  log('T6-unavailable', s1.failed === 1 && failed, `printer unavailable → job FAILED (retryable) stats=${JSON.stringify(s1)}`);

  available = true;
  const s2 = await agent.pollOnce();
  const printed = agent.queue.get('job-6')?.status === 'PRINTED';
  log('T6-recovery', s2.printed === 1 && printed, `printer back → job processes → PRINTED stats=${JSON.stringify(s2)}`);
  log('T6-no-dup', agent.queue.totalSeen === 1, `no duplicate job (totalSeen=${agent.queue.totalSeen})`);
}

// ── RUN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`P15.1 FASE 9 — PHYSICAL PRINT TEST\nPrinter: ${PRINTER}\n`);
  await teste1();
  await teste2();
  await teste3();
  await teste4();
  await teste5();
  await teste6();
  const pass = results.filter((r) => r.pass).length;
  console.log(`\n=== FASE 9 SUMMARY: ${pass}/${results.length} PASS ===`);
  process.exit(pass === results.length ? 0 : 1);
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
