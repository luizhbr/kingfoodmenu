// ── King Print Agent — ticket formatter ──────────────────────────────────────
// Renders kitchen tickets and test tickets as plain text (ESC/POS friendly).
// The SERVER is the source of financial truth — this module only formats
// what the server sent. It never computes prices.

export interface TicketLine {
  name: string;
  qty: number;
  options?: string[];
  comment?: string;
}

export interface KitchenTicket {
  orderNumber: string;
  createdAt: string;
  orderType: string;
  status: string;
  lines: TicketLine[];
  customerName?: string;
  deliveryAddress?: string;
  comment?: string;
}

export interface TestTicket {
  title: string;
  lines: string[];
}

export function buildTestTicket(): TestTicket {
  return {
    title: 'KING FOOD',
    lines: [
      'KING PRINT TEST',
      'STATUS: PASS',
      new Date().toISOString(),
    ],
  };
}

/** Render a kitchen ticket as plain text (mirrors server renderTicketText). */
export function renderTicketText(ticket: KitchenTicket, paperWidth: 58 | 80 = 80): string {
  const W = paperWidth === 58 ? 32 : 42;
  const line = '='.repeat(W);
  const thin = '-'.repeat(W);
  const pad = (s: string) => s.padEnd(W);

  const out: string[] = [];
  out.push(pad('KING FOOD'));
  out.push(pad(`Order #${ticket.orderNumber}`));
  out.push(pad(new Date(ticket.createdAt).toLocaleString('en-US', { hour12: false })));
  out.push(line);
  for (const l of ticket.lines) {
    out.push(pad(`${l.qty}x ${l.name}`));
    for (const o of l.options ?? []) out.push(pad(`   + ${o}`));
    if (l.comment) out.push(pad(`   (${l.comment})`));
  }
  out.push(line);
  out.push(pad(`Type: ${ticket.orderType}`));
  if (ticket.customerName) out.push(pad(`Customer: ${ticket.customerName}`));
  if (ticket.deliveryAddress) out.push(pad(`Address: ${ticket.deliveryAddress}`));
  if (ticket.comment) out.push(pad(`Note: ${ticket.comment}`));
  out.push(thin);
  out.push('');
  out.push('');
  return out.join('\n');
}

/** Render the test ticket. */
export function renderTestTicket(ticket: TestTicket, paperWidth: 58 | 80 = 80): string {
  const W = paperWidth === 58 ? 32 : 42;
  const line = '='.repeat(W);
  const pad = (s: string) => s.padEnd(W);
  const out: string[] = [];
  out.push(pad(ticket.title));
  out.push(line);
  for (const l of ticket.lines) out.push(pad(l));
  out.push(line);
  out.push('');
  out.push('');
  return out.join('\n');
}
