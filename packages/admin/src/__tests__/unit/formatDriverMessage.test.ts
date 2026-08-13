import { describe, it, expect } from 'vitest';
import { formatDriverWhatsAppMessage, buildWhatsAppUrl, DRIVER_WHATSAPP_NUMBER, type DriverOrder } from '../../lib/formatDriverMessage.js';

const baseOrder: DriverOrder = {
  orderNumber: 'KF-TEST123',
  orderType: 'DELIVERY',
  status: 'CONFIRMED',
  total: 42.80,
  comment: null,
  guestName: 'João Silva',
  guestPhone: '(614) 555-1234',
  customer: null,
  deliveryLine1: '727 Summerwind Lane',
  deliveryLine2: null,
  deliveryCity: 'Columbus',
  deliveryState: 'OH',
  deliveryPostalCode: '43229',
  items: [
    { name: 'Smash Burger Duplo', quantity: 1, comment: null, options: [
      { name: 'Adicional', value: 'Bacon' },
      { name: 'Adicional', value: 'Cebola caramelizada' },
    ]},
    { name: 'Açaí 500ml', quantity: 2, comment: null, options: [
      { name: 'Adicional', value: 'Nutella' },
      { name: 'Adicional', value: 'Morango' },
    ]},
  ],
};

describe('formatDriverWhatsAppMessage', () => {
  it('1. Delivery completo', () => {
    const msg = formatDriverWhatsAppMessage(baseOrder);
    expect(msg).toContain('🍔 KING FOOD');
    expect(msg).toContain('🚗 NOVO PEDIDO PARA ENTREGA');
    expect(msg).toContain('#KF-TEST123');
    expect(msg).toContain('João Silva');
    expect(msg).toContain('(614) 555-1234');
    expect(msg).toContain('727 Summerwind Lane');
    expect(msg).toContain('Columbus, OH 43229');
    expect(msg).toContain('1x Smash Burger Duplo');
    expect(msg).toContain('   - Adicional: Bacon');
    expect(msg).toContain('2x Açaí 500ml');
    expect(msg).toContain('💰 TOTAL: $42.80');
  });

  it('2. Delivery sem apartamento (line2 null)', () => {
    const msg = formatDriverWhatsAppMessage(baseOrder);
    // line2 is null — should NOT appear
    const lines = msg.split('\n');
    // No empty line between line1 and city
    expect(msg).toContain('727 Summerwind Lane');
    expect(msg).not.toContain('Apt');
    expect(msg).not.toContain('null');
  });

  it('3. Delivery com apartamento', () => {
    const order = { ...baseOrder, deliveryLine2: 'Apt 2B' };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('Apt 2B');
    const lines = msg.split('\n');
    const aptLine = lines.indexOf('Apt 2B');
    const addrLine = lines.indexOf('727 Summerwind Lane');
    expect(aptLine).toBe(addrLine + 1);
  });

  it('4. Pickup — sem endereço', () => {
    const order: DriverOrder = {
      ...baseOrder,
      orderType: 'PICKUP',
      deliveryLine1: null,
      deliveryLine2: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryPostalCode: null,
    };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('🏪 NOVO PEDIDO PARA RETIRADA');
    expect(msg).not.toContain('📍 ENDEREÇO');
    expect(msg).not.toContain('727 Summerwind');
  });

  it('5. Múltiplos itens', () => {
    const order = { ...baseOrder, items: [
      ...baseOrder.items,
      { name: 'Coxinha', quantity: 3, comment: null, options: [] },
    ]};
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('3x Coxinha');
    expect(msg).toContain('1x Smash Burger Duplo');
    expect(msg).toContain('2x Açaí 500ml');
  });

  it('6. Adicionais (options)', () => {
    const msg = formatDriverWhatsAppMessage(baseOrder);
    expect(msg).toContain('- Adicional: Bacon');
    expect(msg).toContain('- Adicional: Nutella');
  });

  it('7. Com observação', () => {
    const order = { ...baseOrder, comment: 'Tocar a campainha.' };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('📝 OBSERVAÇÃO');
    expect(msg).toContain('Tocar a campainha.');
  });

  it('8. Sem observação', () => {
    const msg = formatDriverWhatsAppMessage(baseOrder);
    expect(msg).not.toContain('📝 OBSERVAÇÃO');
  });

  it('9. Cliente sem telefone', () => {
    const order = { ...baseOrder, guestPhone: null, customer: null };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('João Silva');
    expect(msg).not.toContain('📞');
  });

  it('10. Acentos', () => {
    const order: DriverOrder = {
      ...baseOrder,
      guestName: 'José Açaí',
      items: [{ name: 'Açaí com granola', quantity: 1, comment: 'Sem açúcar', options: [] }],
    };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('José Açaí');
    expect(msg).toContain('Açaí com granola');
  });

  it('11. Emoji na mensagem', () => {
    const msg = formatDriverWhatsAppMessage(baseOrder);
    expect(msg).toContain('🍔');
    expect(msg).toContain('🚗');
    expect(msg).toContain('📦');
    expect(msg).toContain('👤');
    expect(msg).toContain('🛒');
    expect(msg).toContain('💰');
  });

  it('12. Valores monetários', () => {
    const order = { ...baseOrder, total: 0.5 };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('$0.50');
    const order2 = { ...baseOrder, total: 1234.56 };
    const msg2 = formatDriverWhatsAppMessage(order2);
    expect(msg2).toContain('$1234.56');
  });

  it('13. Caracteres especiais no nome', () => {
    const order = { ...baseOrder, guestName: "O'Brien & Sons #1" };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain("O'Brien & Sons #1");
  });

  it('14. Pedido inválido (null)', () => {
    expect(formatDriverWhatsAppMessage(null as any)).toBe('');
  });

  it('15. Pedido sem orderNumber', () => {
    const order = { ...baseOrder, orderNumber: '' } as any;
    expect(formatDriverWhatsAppMessage(order)).toBe('');
  });
});

describe('buildWhatsAppUrl', () => {
  it('gera URL com número correto', () => {
    const url = buildWhatsAppUrl(baseOrder);
    expect(url).toContain(`wa.me/${DRIVER_WHATSAPP_NUMBER}`);
    expect(url).toContain('text=');
  });

  it('URL-encoded corretamente', () => {
    const url = buildWhatsAppUrl(baseOrder);
    // Should not contain raw spaces or newlines
    expect(url).not.toContain(' ');
    expect(url).not.toContain('\n');
    // Should contain encoded content
    expect(url).toContain('%F0%9F%8D%94'); // 🍔 encoded
  });

  it('item comment marcado com ⚠️', () => {
    const order: DriverOrder = {
      ...baseOrder,
      items: [{ name: 'Burger', quantity: 1, comment: 'Sem cebola', options: [] }],
    };
    const msg = formatDriverWhatsAppMessage(order);
    expect(msg).toContain('⚠️ Sem cebola');
  });
});
