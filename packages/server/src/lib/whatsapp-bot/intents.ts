// ============================================================
// WHATSAPP BOT — classificador de intenção (determinístico)
// ============================================================
// A IA interpreta linguagem natural; este classificador resolve
// intenções claras SEM custo de IA e serve de fallback seguro.

import type { WhatsAppIntent } from './types.js';

const RULES: { intent: WhatsAppIntent; patterns: RegExp[] }[] = [
  {
    intent: 'START',
    patterns: [/^(oi|ola|olá|hello|hi|hey|bom dia|boa tarde|boa noite|e aí|eai|opa)\b/i, /^começar|^iniciar|^menu inicial/i],
  },
  {
    intent: 'BROWSE_MENU',
    patterns: [/ver (o )?menu|mostrar menu|quero ver (o )?cardapio|quero ver (o )?cardápio|abrir menu/i],
  },
  {
    intent: 'MENU',
    patterns: [/menu|cardapio|cardápio|o que vocês tem|o que tem|opções|opcoes/i],
  },
  {
    intent: 'SEARCH_PRODUCT',
    patterns: [/quero (um|uma|o|a|dois|duas|tres|três|2|3)\s+[a-záàâãéêíóôõúç ]{2,}/i, /tem (açaí|acai|hamburguer|hambúrguer|burger|pizza|batata|milkshake|shake|sorvete|pudim|torta|bolo|sanduiche|sanduíche|wrap|salada|combo|lanche|refri|suco|agua|água)/i],
  },
  {
    intent: 'PRODUCT_INFO',
    patterns: [/quanto custa|preço|preco|valor|informações|info|ingredientes|o que tem no|como é (o|a)/i],
  },
  {
    intent: 'ADD_ITEM',
    patterns: [/adiciona|adicionar|quero (um|uma|o|a|mais|outro|outra)|vou querer|me vê|me da|me dá|queria|gostaria de|coloca|bota|quero pedir|pedir (um|uma|o|a)/i],
  },
  {
    intent: 'REMOVE_ITEM',
    patterns: [/remove|remover|tira|tirar|exclui|excluir|sem (o|a|os|as)/i],
  },
  {
    intent: 'CHANGE_QUANTITY',
    patterns: [/muda (a )?quantidade|mudar quantidade|mais um|menos um|dobra|duplica|só (um|uma|dois|duas|tres|três)/i],
  },
  {
    intent: 'CHANGE_OPTIONS',
    patterns: [/adicionais|adicionar (no|na|em)|com (nutella|borda|extra|mais|adicional)|sem (cebola|alface|tomate|queijo|molho|gelo)/i],
  },
  {
    intent: 'VIEW_CART',
    patterns: [/carrinho|meu pedido|sacola|o que eu pedi|ver pedido|resumo do pedido/i],
  },
  {
    intent: 'CLEAR_CART',
    patterns: [/limpa (o )?carrinho|limpar carrinho|esvazia|esvaziar|apaga tudo|zera (o )?carrinho/i],
  },
  {
    intent: 'CHECKOUT',
    patterns: [/finalizar|fechar pedido|checkout|quero pagar|como pago|vou fechar|concluir pedido/i],
  },
  {
    intent: 'DELIVERY',
    patterns: [/delivery|entrega|entregar|entregam|taxa de entrega|frete|quanto tempo (pra|para) entregar/i],
  },
  {
    intent: 'PICKUP',
    patterns: [/pickup|retirada|retirar|buscar (na loja|no local)|pegar (na loja|no local)|vou buscar/i],
  },
  {
    intent: 'ADDRESS',
    patterns: [/endereço|endereco|rua |avenida|av\.|bairro|cep|zip|street|address/i],
  },
  {
    intent: 'DELIVERY_ZONE',
    patterns: [/entrega (na|no|em) |zona de entrega|área de entrega|area de entrega|vocês entregam em/i],
  },
  {
    intent: 'PAYMENT',
    patterns: [/pagamento|pagar|cartão|cartao|pix|dinheiro|cash|debito|débito|credito|crédito|forma de pagamento/i],
  },
  {
    intent: 'CONFIRM_ORDER',
    patterns: [/^sim$|^pode$|^ok$|^pode confirmar$|^confirmo$|^confirmar$|^tudo certo$|^fechado$|^pode fechar$|^confirmado$/i],
  },
  {
    intent: 'ORDER_STATUS',
    patterns: [/cadê meu pedido|cade meu pedido|status (do|da|do meu) pedido|onde (está|esta|ta|tá) meu pedido|meu pedido|acompanhar|rastrear|tracking|quanto falta/i],
  },
  {
    intent: 'CANCEL_ORDER',
    patterns: [/cancelar (o )?pedido|cancela (o )?pedido|quero cancelar|desistir/i],
  },
  {
    intent: 'REORDER',
    patterns: [/pedir (de novo|novamente|denovo|o mesmo)|mesmo pedido|repetir pedido|quero (o )?mesmo de (ontem|antes|semana)/i],
  },
  {
    intent: 'COUPON',
    patterns: [/cupom|coupon|desconto|promo|promoção|promocao|vale/i],
  },
  {
    intent: 'LOYALTY',
    patterns: [/fidelidade|pontos|saldo de pontos|recompensa|rewards|cashback/i],
  },
  {
    intent: 'STORE_HOURS',
    patterns: [/horário|horario|aberto|abre|fecha|funcionam|que horas|até que horas/i],
  },
  {
    intent: 'STORE_LOCATION',
    patterns: [/localização|localizacao|onde fica|endereço da loja|endereco da loja|como chegar|mapa/i],
  },
  {
    intent: 'HUMAN_SUPPORT',
    patterns: [/humano|atendente|pessoa|falar com alguém|falar com (um|uma) (humano|atendente|pessoa)|atendimento humano|quero falar com (alguém|alguem|vocês|um atendente)/i],
  },
];

/** Classifica a mensagem em uma intenção (fallback: UNKNOWN). */
export function classifyIntent(text: string): WhatsAppIntent {
  const t = (text || '').trim();
  if (!t) return 'UNKNOWN';
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(t)) return rule.intent;
    }
  }
  return 'UNKNOWN';
}

/** Intenções que exigem confirmação explícita antes de criar pedido. */
export function requiresConfirmation(intent: WhatsAppIntent): boolean {
  return intent === 'CONFIRM_ORDER' || intent === 'CHECKOUT';
}
