import { describe, it, expect } from 'vitest';
import {
  verifyMetaSignature,
  extractMetaMessages,
  metaConfigured,
} from '../../lib/whatsapp-bot/meta.js';
import { classifyIntent, requiresConfirmation } from '../../lib/whatsapp-bot/intents.js';
import { emptyCart, addItem, cartSubtotal, clearCart, updateQuantity, removeItem } from '../../lib/whatsapp-bot/cart.js';
import type { CartItem } from '../../lib/whatsapp-bot/types.js';

describe('verifyMetaSignature (HMAC x-hub-signature-256)', () => {
  const SECRET = 'app_secret_teste';
  const body = '{"entry":[]}';

  it('aceita assinatura válida', () => {
    const hmac = require('crypto').createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyMetaSignature(body, `sha256=${hmac}`, SECRET)).toBe(true);
  });

  it('rejeita assinatura inválida', () => {
    expect(verifyMetaSignature(body, 'sha256=deadbeef', SECRET)).toBe(false);
  });

  it('rejeita header sem prefixo sha256=', () => {
    const hmac = require('crypto').createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyMetaSignature(body, hmac, SECRET)).toBe(false);
  });

  it('rejeita header vazio/null', () => {
    expect(verifyMetaSignature(body, null, SECRET)).toBe(false);
    expect(verifyMetaSignature(body, '', SECRET)).toBe(false);
  });

  it('rejeita quando appSecret vazio', () => {
    const hmac = require('crypto').createHmac('sha256', SECRET).update(body).digest('hex');
    expect(verifyMetaSignature(body, `sha256=${hmac}`, '')).toBe(false);
  });

  it('rejeita assinatura com tamanho diferente (timing-safe)', () => {
    expect(verifyMetaSignature(body, 'sha256=abc', SECRET)).toBe(false);
  });
});

describe('extractMetaMessages (payload do webhook)', () => {
  it('extrai mensagem de texto válida', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: '123456' },
            contacts: [{ wa_id: '5511999999999', profile: { name: 'João' } }],
            messages: [{ id: 'wamid_1', from: '5511999999999', type: 'text', timestamp: '1700000000', text: { body: 'Oi' } }],
          },
        }],
      }],
    };
    const msgs = extractMetaMessages(payload as any);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({
      phone: '5511999999999',
      name: 'João',
      text: 'Oi',
      messageId: 'wamid_1',
      phoneNumberId: '123456',
      type: 'text',
    });
  });

  it('ignora mensagens não-texto (imagens, áudio)', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: '123456' },
            contacts: [{ wa_id: '5511999999999' }],
            messages: [{ id: 'wamid_img', from: '5511999999999', type: 'image', image: { id: 'x' } }],
          },
        }],
      }],
    };
    expect(extractMetaMessages(payload as any)).toHaveLength(0);
  });

  it('retorna [] para payload inválido', () => {
    expect(extractMetaMessages({} as any)).toHaveLength(0);
    expect(extractMetaMessages({ entry: 'nao-e-array' } as any)).toHaveLength(0);
    expect(extractMetaMessages(null as any)).toHaveLength(0);
  });

  it('retorna [] para evento de status (sem messages)', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: '123456' },
            statuses: [{ id: 'wamid_1', status: 'delivered' }],
          },
        }],
      }],
    };
    expect(extractMetaMessages(payload as any)).toHaveLength(0);
  });

  it('lida com mensagem sem texto (text vazio)', () => {
    const payload = {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: '123456' },
            contacts: [{ wa_id: '5511999999999' }],
            messages: [{ id: 'wamid_2', from: '5511999999999', type: 'text', text: { body: '' } }],
          },
        }],
      }],
    };
    const msgs = extractMetaMessages(payload as any);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].text).toBe('');
  });
});

describe('metaConfigured', () => {
  const OLD = { ...process.env };

  afterEach(() => {
    process.env = { ...OLD };
  });

  it('false sem credenciais', () => {
    delete process.env.META_ACCESS_TOKEN;
    delete process.env.META_PHONE_NUMBER_ID;
    expect(metaConfigured()).toBe(false);
  });

  it('true com token e phone number id', () => {
    process.env.META_ACCESS_TOKEN = 'token';
    process.env.META_PHONE_NUMBER_ID = '123';
    expect(metaConfigured()).toBe(true);
  });
});

describe('classifyIntent (classificador determinístico)', () => {
  it('START para saudação', () => {
    expect(classifyIntent('Oi')).toBe('START');
    expect(classifyIntent('Bom dia')).toBe('START');
  });

  it('MENU para cardápio', () => {
    expect(classifyIntent('quero ver o cardápio')).toBe('BROWSE_MENU');
    expect(classifyIntent('menu')).toBe('MENU');
  });

  it('ADD_ITEM para pedido', () => {
    expect(classifyIntent('quero um açaí')).toBe('SEARCH_PRODUCT');
    expect(classifyIntent('adiciona uma pizza')).toBe('ADD_ITEM');
  });

  it('VIEW_CART para carrinho', () => {
    expect(classifyIntent('meu carrinho')).toBe('VIEW_CART');
  });

  it('HUMAN_SUPPORT para atendente', () => {
    expect(classifyIntent('quero falar com um humano')).toBe('HUMAN_SUPPORT');
    expect(classifyIntent('atendente')).toBe('HUMAN_SUPPORT');
  });

  it('UNKNOWN para texto aleatório', () => {
    expect(classifyIntent('xyzzy plugh')).toBe('UNKNOWN');
    expect(classifyIntent('')).toBe('UNKNOWN');
  });

  it('CONFIRM_ORDER para confirmação', () => {
    expect(classifyIntent('sim')).toBe('CONFIRM_ORDER');
    expect(classifyIntent('pode confirmar')).toBe('CONFIRM_ORDER');
  });
});

describe('requiresConfirmation', () => {
  it('exige confirmação para CHECKOUT e CONFIRM_ORDER', () => {
    expect(requiresConfirmation('CHECKOUT')).toBe(true);
    expect(requiresConfirmation('CONFIRM_ORDER')).toBe(true);
  });

  it('não exige para outras intenções', () => {
    expect(requiresConfirmation('MENU')).toBe(false);
    expect(requiresConfirmation('ADD_ITEM')).toBe(false);
  });
});

describe('cart (carrinho determinístico)', () => {
  const item = (id: string, price: number, qty = 1, opts: Record<string, string> = {}): CartItem => ({
    menuItemId: id,
    name: `Item ${id}`,
    price,
    quantity: qty,
    options: opts,
    optionLabels: [],
    lineTotal: price * qty,
  });

  it('emptyCart retorna estado vazio', () => {
    const c = emptyCart();
    expect(c.items).toHaveLength(0);
    expect(c.orderType).toBeNull();
    expect(c.currentStep).toBe('IDLE');
  });

  it('addItem adiciona e soma quantidades iguais', () => {
    const c = emptyCart();
    addItem(c, item('a', 10));
    addItem(c, item('a', 10));
    expect(c.items).toHaveLength(1);
    expect(c.items[0].quantity).toBe(2);
    expect(cartSubtotal(c.items)).toBe(20);
  });

  it('addItem separa itens com opções diferentes', () => {
    const c = emptyCart();
    addItem(c, item('a', 10, 1, { g1: 'v1' }));
    addItem(c, item('a', 10, 1, { g1: 'v2' }));
    expect(c.items).toHaveLength(2);
  });

  it('updateQuantity recalcula lineTotal', () => {
    const c = emptyCart();
    addItem(c, item('a', 10));
    updateQuantity(c, 0, 3);
    expect(c.items[0].quantity).toBe(3);
    expect(c.items[0].lineTotal).toBe(30);
  });

  it('removeItem remove pelo índice', () => {
    const c = emptyCart();
    addItem(c, item('a', 10));
    addItem(c, item('b', 5));
    removeItem(c, 0);
    expect(c.items).toHaveLength(1);
    expect(c.items[0].menuItemId).toBe('b');
  });

  it('clearCart zera tudo', () => {
    const c = emptyCart();
    addItem(c, item('a', 10));
    c.couponCode = 'KF10';
    c.couponDiscount = 5;
    clearCart(c);
    expect(c.items).toHaveLength(0);
    expect(c.couponCode).toBeNull();
    expect(c.couponDiscount).toBe(0);
  });
});
