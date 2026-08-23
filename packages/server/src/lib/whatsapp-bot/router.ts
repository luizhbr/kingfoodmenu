// ============================================================
// WHATSAPP BOT — orquestrador híbrido
// ============================================================
// Fluxos determinísticos (menu, carrinho, delivery, cupom, status)
// SEM IA. IA apenas para interpretar linguagem natural e fallback.
// A IA nunca altera dados críticos diretamente.

import prisma from '../db.js';
import type { BotContext, BotReply, CartItem, InboundMessage, WhatsAppIntent } from './types.js';
import { classifyIntent } from './intents.js';
import { cartSubtotal, emptyCart, formatCart } from './cart.js';
import { chatWithAi } from './ai.js';
import {
  addToCart, checkDelivery, getMenuByCategory, getOrderStatus, getPreviousOrders,
  getProduct, getProductOptions, getStoreHours, getStoreInfo, requestHuman,
  searchMenu, validateCoupon,
} from './tools.js';

const STORE_URL = process.env.KINGFOOD_SITE || 'https://king-food-foundation-ui.vercel.app';

// ── Helpers de formatação ────────────────────────────────────────

function formatMenu(data: any): string {
  if (!data || data.length === 0) return 'Cardápio indisponível no momento. 😕';
  const lines = data.map((cat: any) => {
    const items = cat.items.map((it: any) => `• ${it.name} — $${it.price.toFixed(2)}`).join('\n');
    return `*${cat.name}*\n${items}`;
  });
  return `🍔 *Cardápio King Food*\n\n${lines.join('\n\n')}`;
}

function formatProduct(p: any): string {
  return `*${p.name}* — $${p.price.toFixed(2)}\n${p.description || ''}`.trim();
}

function formatOptions(groups: any[]): string {
  if (!groups || groups.length === 0) return '';
  return groups
    .map((g) => {
      const vals = g.values.map((v: any) => `${v.name}${v.priceModifier > 0 ? ` (+$${v.priceModifier.toFixed(2)})` : ''}`).join(', ');
      return `${g.name}${g.isRequired ? ' (obrigatório)' : ''}: ${vals}`;
    })
    .join('\n');
}

function formatCartSummary(ctx: BotContext): string {
  const subtotal = cartSubtotal(ctx.state.items);
  const lines = ctx.state.items.map((it, i) => {
    const opts = it.optionLabels.length > 0 ? ` (${it.optionLabels.join(', ')})` : '';
    return `${i + 1}. ${it.quantity}x ${it.name}${opts} — $${it.lineTotal.toFixed(2)}`;
  });
  let out = `🛒 *Seu pedido:*\n${lines.join('\n')}\n\nSubtotal: $${subtotal.toFixed(2)}`;
  if (ctx.state.couponDiscount) out += `\nDesconto (${ctx.state.couponCode}): -$${ctx.state.couponDiscount.toFixed(2)}`;
  if (ctx.state.deliveryZone) out += `\nTaxa de entrega (${ctx.state.deliveryZone.zoneName}): $${ctx.state.deliveryZone.fee.toFixed(2)}`;
  return out;
}

// ── Fluxos determinísticos ───────────────────────────────────────

async function handleIntent(intent: WhatsAppIntent, ctx: BotContext, text: string): Promise<BotReply> {
  const state = ctx.state;

  switch (intent) {
    case 'START': {
      ctx.currentIntent = 'START';
      ctx.currentStep = 'MAIN_MENU';
      return {
        text: `Olá! 👋 Bem-vindo ao King Food.\nComo posso ajudar?\n\n🍔 Fazer pedido\n📦 Acompanhar pedido\n🔄 Pedir novamente\n📍 Localização\n🕐 Horário\n👤 Falar com alguém`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'MENU':
    case 'BROWSE_MENU': {
      const menu = await getMenuByCategory();
      if (!menu.ok) return { text: 'Cardápio indisponível no momento. 😕', deterministic: true, intent, context: ctx };
      ctx.currentIntent = 'BROWSE_MENU';
      ctx.currentStep = 'BROWSING';
      return { text: formatMenu(menu.data), deterministic: true, intent, context: ctx };
    }

    case 'SEARCH_PRODUCT': {
      // Extrai termo de busca: remove palavras de intenção
      const cleaned = text
        .replace(/quero|vou querer|me vê|me da|me dá|queria|gostaria de|tem|um|uma|o|a|por favor|pfv|pf|\?/gi, '')
        .trim();
      const result = await searchMenu(cleaned || text);
      if (!result.ok) {
        return {
          text: `Não encontrei "${cleaned || text}" no nosso cardápio atual. 😕\nQuer ver o cardápio completo?`,
          deterministic: true,
          intent,
          context: ctx,
        };
      }
      const items = result.data as any[];
      if (items.length === 1) {
        const p = items[0];
        const opts = await getProductOptions(p.id);
        const optText = opts.ok ? formatOptions(opts.data as any[]) : '';
        ctx.currentStep = 'PRODUCT_SELECTED';
        ctx.currentIntent = 'PRODUCT_INFO';
        return {
          text: `Encontrei:\n${formatProduct(p)}${optText ? `\n\n*Adicionais:*\n${optText}` : ''}\n\nQuer adicionar ao pedido?`,
          deterministic: true,
          intent: 'PRODUCT_INFO',
          context: ctx,
        };
      }
      const list = (items as any[]).map((it) => `• ${it.name} — $${it.price.toFixed(2)}`).join('\n');
      return {
        text: `Encontrei ${items.length} opções:\n${list}\n\nQual você quer?`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'PRODUCT_INFO': {
      const result = await searchMenu(text);
      if (!result.ok) return { text: 'Não encontrei esse produto. 😕', deterministic: true, intent, context: ctx };
      const items = result.data as any[];
      if (items.length === 1) {
        const p = items[0];
        const opts = await getProductOptions(p.id);
        const optText = opts.ok ? formatOptions(opts.data as any[]) : '';
        return {
          text: `${formatProduct(p)}${optText ? `\n\n*Adicionais:*\n${optText}` : ''}`,
          deterministic: true,
          intent,
          context: ctx,
        };
      }
      return { text: formatMenu((await getMenuByCategory()).data), deterministic: true, intent, context: ctx };
    }

    case 'ADD_ITEM': {
      // Tenta casar com produto real
      const cleaned = text
        .replace(/quero|vou querer|me vê|me da|me dá|queria|gostaria de|adiciona|adicionar|coloca|bota|um|uma|o|a|mais|por favor|pfv|pf|\?/gi, '')
        .trim();
      const result = await searchMenu(cleaned || text);
      if (!result.ok) {
        return {
          text: `Não encontrei "${cleaned || text}" no cardápio. 😕\nQuer ver o cardápio completo?`,
          deterministic: true,
          intent,
          context: ctx,
        };
      }
      const items = result.data as any[];
      if (items.length > 1) {
        const list = items.map((it) => `• ${it.name} — $${it.price.toFixed(2)}`).join('\n');
        return { text: `Qual deles?\n${list}`, deterministic: true, intent, context: ctx };
      }
      const p = items[0];
      const opts = await getProductOptions(p.id);
      const optGroups = (opts.ok ? opts.data : []) as any[];
      const required = optGroups.filter((g) => g.isRequired);
      if (required.length > 0) {
        ctx.currentStep = 'AWAITING_OPTIONS';
        ctx.currentIntent = 'CHANGE_OPTIONS';
        return {
          text: `*${p.name}* — $${p.price.toFixed(2)}\n\nEscolha os adicionais obrigatórios:\n${formatOptions(optGroups)}\n\nEx: "com Nutella" ou "sem cebola"`,
          deterministic: true,
          intent: 'CHANGE_OPTIONS',
          context: ctx,
        };
      }
      const item: CartItem = {
        menuItemId: p.id,
        name: p.name,
        price: p.price,
        quantity: 1,
        options: {},
        optionLabels: [],
        lineTotal: p.price,
      };
      addToCart(state, item);
      ctx.currentStep = 'CART';
      return {
        text: `✅ Adicionei *${p.name}* ao seu pedido.\n\n${formatCartSummary(ctx)}\n\nQuer mais alguma coisa?`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'CHANGE_OPTIONS': {
      // Aplica adicionais ao último item do carrinho
      const last = state.items[state.items.length - 1];
      if (!last) return { text: 'Seu carrinho está vazio. 🛒', deterministic: true, intent, context: ctx };
      const opts = await getProductOptions(last.menuItemId);
      const groups = (opts.ok ? opts.data : []) as any[];
      const labels: string[] = [];
      for (const g of groups) {
        for (const v of g.values) {
          const vn = v.name.toLowerCase();
          if (text.toLowerCase().includes(vn)) {
            last.options[g.groupId] = v.id;
            labels.push(v.name);
          }
        }
      }
      if (labels.length === 0) {
        return { text: 'Não entendi o adicional. 😕\nOpções disponíveis:\n' + formatOptions(groups), deterministic: true, intent, context: ctx };
      }
      last.optionLabels = labels;
      last.lineTotal = last.price * last.quantity + groups
        .flatMap((g: any) => g.values)
        .filter((v: any) => Object.values(last.options).includes(v.id))
        .reduce((s: number, v: any) => s + v.priceModifier, 0) * last.quantity;
      ctx.currentStep = 'CART';
      return {
        text: `✅ Adicionais aplicados: ${labels.join(', ')}\n\n${formatCartSummary(ctx)}\n\nQuer mais alguma coisa?`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'VIEW_CART': {
      if (state.items.length === 0) return { text: 'Seu carrinho está vazio. 🛒', deterministic: true, intent, context: ctx };
      return {
        text: `${formatCartSummary(ctx)}\n\nComo deseja receber?\n\n🛵 Delivery\n🏪 Pickup (retirar na loja)`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'CLEAR_CART': {
      state.items = [];
      state.couponCode = null;
      state.couponDiscount = 0;
      return { text: 'Carrinho esvaziado. 🗑️\nQuer começar de novo?', deterministic: true, intent, context: ctx };
    }

    case 'DELIVERY': {
      if (state.items.length === 0) {
        return { text: 'Primeiro monte seu pedido! 🍔\nQuer ver o cardápio?', deterministic: true, intent, context: ctx };
      }
      state.orderType = 'DELIVERY';
      ctx.currentStep = 'AWAITING_ADDRESS';
      return {
        text: '🛵 Delivery!\n\nMe informe seu endereço (rua, número, cidade, CEP):',
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'PICKUP': {
      if (state.items.length === 0) {
        return { text: 'Primeiro monte seu pedido! 🍔\nQuer ver o cardápio?', deterministic: true, intent, context: ctx };
      }
      state.orderType = 'PICKUP';
      ctx.currentStep = 'CHECKOUT_REVIEW';
      return {
        text: `🏪 Pickup!\n\n${formatCartSummary(ctx)}\n\nPosso confirmar o pedido?`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'ADDRESS': {
      // Extrai endereço da mensagem (heurística simples)
      const parts = text.split(',').map((s) => s.trim());
      if (parts.length >= 2) {
        const [line1, city, stateZip = ''] = parts;
        const [stateCode, zip] = stateZip.split(' ').filter(Boolean);
        const result = await checkDelivery({ line1, city, state: stateCode || '', zip: zip || '' });
        if (!result.ok) {
          return {
            text: 'Esse endereço está fora da nossa área de entrega. 😕\n\nOferecemos *pickup* na loja: 727 Summerwind Ln, Lewis Center, OH 43035. Quer retirar?',
            deterministic: true,
            intent: 'DELIVERY_ZONE',
            context: ctx,
          };
        }
        const zone = result.data as any;
        state.address = { line1, city, state: stateCode || '', zip: zip || '' };
        state.deliveryZone = { zoneId: zone.zoneId, zoneName: zone.zoneName, fee: zone.fee, minOrder: zone.minOrder };
        const subtotal = cartSubtotal(state.items);
        if (subtotal < zone.minOrder) {
          return {
            text: `⚠️ Pedido mínimo para ${zone.zoneName}: $${zone.minOrder.toFixed(2)}.\nSeu subtotal: $${subtotal.toFixed(2)}.\n\nAdicione mais $${(zone.minOrder - subtotal).toFixed(2)} em itens.`,
            deterministic: true,
            intent: 'DELIVERY_ZONE',
            context: ctx,
          };
        }
        ctx.currentStep = 'CHECKOUT_REVIEW';
        return {
          text: `📍 Zona: *${zone.zoneName}*\nTaxa de entrega: $${zone.fee.toFixed(2)}\n\n${formatCartSummary(ctx)}\n\nPosso confirmar o pedido?`,
          deterministic: true,
          intent: 'DELIVERY_ZONE',
          context: ctx,
        };
      }
      return { text: 'Me informe o endereço completo (rua, número, cidade, CEP):', deterministic: true, intent, context: ctx };
    }

    case 'COUPON': {
      const match = text.match(/[A-Z0-9]{4,}/i);
      if (!match) return { text: 'Me informe o código do cupom:', deterministic: true, intent, context: ctx };
      const code = match[0].toUpperCase();
      const subtotal = cartSubtotal(state.items);
      const result = await validateCoupon(code, subtotal);
      if (!result.ok) return { text: `Cupom inválido: ${result.error}`, deterministic: true, intent, context: ctx };
      const data = result.data as any;
      state.couponCode = code;
      state.couponDiscount = data.discount;
      return {
        text: `✅ Cupom *${code}* aplicado! Desconto: $${data.discount.toFixed(2)}\n\n${formatCartSummary(ctx)}`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'ORDER_STATUS': {
      // Busca pedido mais recente do telefone
      const orders = await getPreviousOrders(ctx.whatsappNumber, 1);
      if (!orders.ok) return { text: 'Não encontrei pedidos para este número. 😕', deterministic: true, intent, context: ctx };
      const order = (orders.data as any[])[0];
      const status = await getOrderStatus(order.id);
      if (!status.ok) return { text: 'Não consegui buscar o status. 😕', deterministic: true, intent, context: ctx };
      const s = status.data as any;
      const labels: Record<string, string> = {
        PENDING: '⏳ Pedido recebido',
        CONFIRMED: '✅ Pedido aceito',
        PREPARING: '👨‍🍳 Em preparo',
        READY: '🛎️ Pronto!',
        OUT_FOR_DELIVERY: '🛵 Saiu para entrega',
        DELIVERED: '📦 Entregue!',
        PICKED_UP: '🏪 Retirado!',
        CANCELLED: '❌ Cancelado',
      };
      return {
        text: `📦 Pedido *${s.orderNumber}*\nStatus: ${labels[s.status] || s.status}`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'REORDER': {
      const orders = await getPreviousOrders(ctx.whatsappNumber, 1);
      if (!orders.ok) return { text: 'Não encontrei pedidos anteriores. 😕', deterministic: true, intent, context: ctx };
      const order = (orders.data as any[])[0];
      const items = order.items.map((it: any) => `${it.quantity}x ${it.name} — $${(it.price * it.quantity).toFixed(2)}`).join('\n');
      return {
        text: `Seu último pedido (*${order.orderNumber}*):\n${items}\n\nQuer repetir? Os preços e a disponibilidade serão verificados na confirmação.`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'STORE_HOURS': {
      const hours = await getStoreHours();
      if (!hours.ok) return { text: 'Horários indisponíveis. 😕', deterministic: true, intent, context: ctx };
      const rows = (hours.data as any[]).map((h) => `• ${h.dayOfWeek}: ${h.openTime} – ${h.closeTime}`).join('\n');
      return { text: `🕐 *Horários:*\n${rows}`, deterministic: true, intent, context: ctx };
    }

    case 'STORE_LOCATION': {
      const info = await getStoreInfo();
      if (!info.ok) return { text: 'Localização indisponível. 😕', deterministic: true, intent, context: ctx };
      const s = info.data as any;
      return {
        text: `📍 *${s.name}*\n${s.address}, ${s.city}${s.state ? ', ' + s.state : ''} ${s.postalCode}\n📞 ${s.phone || '—'}`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'HUMAN_SUPPORT': {
      const result = requestHuman();
      ctx.mode = 'HUMAN';
      return {
        text: '👤 Vou transferir você para um atendente. Um momento, por favor!',
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'PAYMENT': {
      return {
        text: `💳 Pagamento online é feito com segurança pelo nosso link de checkout: ${STORE_URL}\n\nNunca envie dados de cartão pelo chat.`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'CONFIRM_ORDER': {
      if (state.items.length === 0) return { text: 'Seu carrinho está vazio. 🛒', deterministic: true, intent, context: ctx };
      if (!state.orderType) {
        return { text: 'Como deseja receber?\n\n🛵 Delivery\n🏪 Pickup', deterministic: true, intent, context: ctx };
      }
      if (state.orderType === 'DELIVERY' && !state.deliveryZone) {
        ctx.currentStep = 'AWAITING_ADDRESS';
        return { text: 'Me informe seu endereço para verificar a entrega:', deterministic: true, intent, context: ctx };
      }
      // Confirmação explícita → cria pedido via API oficial
      ctx.currentStep = 'CONFIRMING';
      return {
        text: `✅ Confirmando seu pedido...\n\n${formatCartSummary(ctx)}\n\nTotal: $${(cartSubtotal(state.items) - (state.couponDiscount || 0) + (state.deliveryZone?.fee || 0)).toFixed(2)}\n\nSeu pedido será criado agora.`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'CANCEL_ORDER': {
      return {
        text: 'Para cancelar um pedido, me informe o número do pedido ou fale com um atendente. 👤',
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'LOYALTY': {
      return {
        text: '⭐ Fidelidade: você acumula pontos a cada pedido!\n\nConsulte seu saldo no site ou peça ajuda a um atendente.',
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    case 'CHECKOUT': {
      if (state.items.length === 0) return { text: 'Seu carrinho está vazio. 🛒', deterministic: true, intent, context: ctx };
      if (!state.orderType) {
        return { text: 'Como deseja receber?\n\n🛵 Delivery\n🏪 Pickup', deterministic: true, intent, context: ctx };
      }
      if (state.orderType === 'DELIVERY' && !state.deliveryZone) {
        ctx.currentStep = 'AWAITING_ADDRESS';
        return { text: 'Me informe seu endereço para verificar a entrega:', deterministic: true, intent, context: ctx };
      }
      return {
        text: `${formatCartSummary(ctx)}\n\nPosso confirmar o pedido?`,
        deterministic: true,
        intent,
        context: ctx,
      };
    }

    default:
      return { text: '', deterministic: false, intent: 'UNKNOWN', context: ctx };
  }
}

// ── Orquestrador principal ───────────────────────────────────────

export async function processMessage(
  ctx: BotContext,
  msg: InboundMessage
): Promise<BotReply> {
  const text = msg.text || '';

  // Modo humano: não responde automaticamente
  if (ctx.mode === 'HUMAN') {
    return {
      text: '',
      deterministic: true,
      intent: 'HUMAN_SUPPORT',
      context: ctx,
    };
  }

  const intent = classifyIntent(text);

  // Fluxos determinísticos primeiro
  const reply = await handleIntent(intent, ctx, text);
  if (reply.deterministic) {
    ctx.currentIntent = intent;
    return reply;
  }

  // IA apenas para interpretar linguagem natural (fallback)
  try {
    const ai = await chatWithAi(ctx, text);
    ctx.currentIntent = 'UNKNOWN';
    return {
      text: ai.reply,
      deterministic: false,
      intent: 'UNKNOWN',
      context: ctx,
    };
  } catch (err) {
    console.error('[whatsapp-bot] AI fallback failed:', String(err));
    return {
      text: 'Desculpe, tive um problema. 😕\n\nVocê pode:\n🍔 Ver o cardápio\n📦 Acompanhar pedido\n👤 Falar com alguém',
      deterministic: true,
      intent: 'UNKNOWN',
      context: ctx,
    };
  }
}
