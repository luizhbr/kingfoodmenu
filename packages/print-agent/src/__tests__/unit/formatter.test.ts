import { describe, it, expect } from 'vitest';
import { renderTicketText, renderTestTicket, buildTestTicket } from '../../formatter.js';

const ticket = {
  orderNumber: 'KF-1001',
  createdAt: '2026-08-12T20:00:00.000Z',
  orderType: 'DELIVERY',
  status: 'CONFIRMED',
  lines: [
    { name: 'X-Burger', qty: 2, options: ['Extra cheese'], comment: 'Sem cebola' },
    { name: 'Coca-Cola', qty: 1 },
  ],
  customerName: 'Luiz',
  deliveryAddress: 'Rua Teste, 123',
  comment: 'Portão azul',
};

describe('formatter', () => {
  it('renders 80mm ticket with all required fields', () => {
    const text = renderTicketText(ticket, 80);
    expect(text).toContain('KING FOOD');
    expect(text).toContain('Order #KF-1001');
    expect(text).toContain('2x X-Burger');
    expect(text).toContain('+ Extra cheese');
    expect(text).toContain('(Sem cebola)');
    expect(text).toContain('1x Coca-Cola');
    expect(text).toContain('Type: DELIVERY');
    expect(text).toContain('Customer: Luiz');
    expect(text).toContain('Address: Rua Teste, 123');
    expect(text).toContain('Note: Portão azul');
  });

  it('renders 58mm ticket with narrower width', () => {
    const text = renderTicketText(ticket, 58);
    const lineLen = text.split('\n')[0].length;
    expect(lineLen).toBeLessThanOrEqual(32);
    expect(text).toContain('KING FOOD');
  });

  it('handles empty lines/options', () => {
    const t = { ...ticket, lines: [], customerName: undefined, deliveryAddress: undefined, comment: undefined };
    const text = renderTicketText(t, 80);
    expect(text).toContain('KING FOOD');
    expect(text).toContain('Type: DELIVERY');
  });

  it('test ticket contains KING FOOD + KING PRINT TEST + STATUS: PASS', () => {
    const tt = buildTestTicket();
    const text = renderTestTicket(tt, 80);
    expect(text).toContain('KING FOOD');
    expect(text).toContain('KING PRINT TEST');
    expect(text).toContain('STATUS: PASS');
  });
});
