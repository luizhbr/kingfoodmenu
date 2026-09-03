/**
 * Upsell dinâmico e contextual — King Food storefront.
 *
 * Camada ISOLADA de recomendação. Não toca Stripe, Orders, Loyalty,
 * autenticação, banco ou checkout. Usa apenas dados reais do cardápio
 * (categorias e itens existentes) + estado do carrinho.
 *
 * Categorias reais (2026-09-03, via /api/menu/categories):
 *   Açaí do King | Açaí Premium | Açaí Tropical | Açaí Combos
 *   (Hambúrgueres e Bebidas foram REMOVIDAS do cardápio em 03/09)
 *
 * Classificação em grupos (camada de conceito, SEM alterar schema):
 *   AÇAI   → Açaí do King, Açaí Premium, Açaí Tropical
 *   COMBO  → Açaí Combos
 */

export interface UpsellMenuItem {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  isActive?: boolean;
  categoryId?: string | null;
  categoryName?: string | null;
}

export interface UpsellCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

// ── Grupos de categoria (conceito, não schema) ────────────────────────
export type CategoryGroup = 'AÇAI' | 'COMBO' | 'LANCHE' | 'BEBIDA' | 'OUTRO';

const CATEGORY_GROUP_MAP: Record<string, CategoryGroup> = {
  'Açaí do King': 'AÇAI',
  'Açaí Premium': 'AÇAI',
  'Açaí Tropical': 'AÇAI',
  'Açaí Combos': 'COMBO',
};

export function groupOfCategory(categoryName: string | null | undefined): CategoryGroup {
  if (!categoryName) return 'OUTRO';
  return CATEGORY_GROUP_MAP[categoryName] || 'OUTRO';
}

// ── Thresholds centralizados (configuráveis aqui, não espalhados) ──────
export const UPSELL_CONFIG = {
  maxRecommendations: 4,        // máximo visual (2–4)
  maxRecommendationsFullCart: 2, // carrinho "completo" → só 2 altamente relevantes
  fullCartThreshold: 60,        // subtotal >= $60 = carrinho grande
  smallCartThreshold: 20,        // subtotal < $20 = pedido pequeno
  maxItemsInCartForFull: 4,      // >= 4 linhas = carrinho cheio
  complementScore: 40,          // complementa a categoria do carrinho
  diversityScore: 15,           // grupo diferente do que já está no carrinho
  popularScore: 8,              // preço "popular" (faixa média) — sem dados de vendas
  priceFitScore: 10,            // preço proporcional ao subtotal
  sameGroupPenalty: 12,         // mesmo grupo do carrinho (evita 4 açaís iguais)
  noRelationPenalty: 8,         // sem relação clara com o pedido
  upgradeBonus: 6,              // versão premium/maior do que está no carrinho
};

// ── Copy dinâmica contextual ───────────────────────────────────────────
export function getUpsellTitle(groups: CategoryGroup[]): string {
  return '🔥 APROVEITE E COMPLETE SEU PEDIDO';
}

export function getUpsellSubtitle(groups: CategoryGroup[]): string {
  const has = (g: CategoryGroup) => groups.includes(g);
  // Carrinho misto (2+ grupos distintos) → copy genérica contextual
  if (groups.length >= 2) {
    return 'Escolhemos opções que combinam com seu pedido';
  }
  if (has('AÇAI')) {
    return 'Algumas opções que combinam com seu pedido';
  }
  if (has('COMBO')) {
    return 'Que tal deixar seu pedido ainda melhor?';
  }
  return 'Escolhemos opções que combinam com seu pedido';
}

// ── Compatibilidade entre grupos (PRIORIDADE 1 — complementaridade) ────
// [grupo no carrinho] → grupos que complementam (em ordem de relevância)
// Cardápio atual (03/09): só AÇAI e COMBO — açaí complementa com combo
// (compartilhável) e outro açaí diverso; combo complementa com açaí.
const COMPLEMENT_MAP: Record<CategoryGroup, CategoryGroup[]> = {
  AÇAI: ['COMBO', 'AÇAI'],   // combo compartilhável; outro açaí só se diverso
  COMBO: ['AÇAI'],           // açaí individual para completar
  LANCHE: ['AÇAI', 'COMBO'], // legado (categoria removida — mantido p/ segurança)
  BEBIDA: ['AÇAI', 'COMBO'], // legado (categoria removida — mantido p/ segurança)
  OUTRO: ['AÇAI', 'COMBO'],
};

// ── Função central de recomendação ─────────────────────────────────────
export function getUpsellRecommendations(
  cartItems: UpsellCartItem[],
  allItems: UpsellMenuItem[],
  options?: { max?: number }
): UpsellMenuItem[] {
  // Carrinho vazio → comportamento seguro: nada a recomendar
  if (cartItems.length === 0) return [];

  const cartIds = new Set(cartItems.map((i) => i.menuItemId));
  const cartGroups = new Set<CategoryGroup>(
    cartItems.map((i) => groupOfCategory(i.categoryName))
  );
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalLines = cartItems.reduce((s, i) => s + i.quantity, 0);

  // FALLBACK (regra 11): se não der para classificar, filtra carrinho,
  // prefere ativos, prioriza diversidade, até 4.
  const candidates = allItems.filter(
    (p) => p.isActive !== false && !cartIds.has(p.id)
  );
  if (candidates.length === 0) return [];

  const scored = candidates.map((product) => {
    const group = groupOfCategory(product.categoryName);
    let score = 0;
    const reasons: string[] = [];

    // PRIORIDADE 1 — complementaridade
    let bestComplement = 0;
    for (const cartGroup of cartGroups) {
      const comps = COMPLEMENT_MAP[cartGroup] || [];
      const idx = comps.indexOf(group);
      if (idx === 0) bestComplement = Math.max(bestComplement, UPSELL_CONFIG.complementScore);
      else if (idx === 1) bestComplement = Math.max(bestComplement, UPSELL_CONFIG.complementScore - 10);
      else if (idx === 2) bestComplement = Math.max(bestComplement, UPSELL_CONFIG.complementScore - 20);
    }
    if (bestComplement > 0) {
      score += bestComplement;
      reasons.push(`complementa (${group})`);
    }

    // PRIORIDADE 2 — diversidade: grupo diferente do carrinho pontua
    if (!cartGroups.has(group)) {
      score += UPSELL_CONFIG.diversityScore;
      reasons.push('diversidade');
    } else {
      score -= UPSELL_CONFIG.sameGroupPenalty;
      reasons.push('mesmo grupo');
    }

    // PRIORIDADE 3 — upgrade natural: versão premium/maior do que está no carrinho
    // (mesmo grupo + preço maior + nome contém palavra-chave de upgrade)
    const sameGroupCart = cartItems.filter(
      (i) => groupOfCategory(i.categoryName) === group
    );
    const isUpgrade = sameGroupCart.some(
      (i) => product.price > i.price && /premium|trufado|ferrero|combo|família|brazuca|abacaxi/i.test(product.name)
    );
    if (isUpgrade) {
      score += UPSELL_CONFIG.upgradeBonus;
      reasons.push('upgrade natural');
    }

    // PRIORIDADE 4 — valor do pedido (proporção de preço)
    if (subtotal > 0) {
      const ratio = product.price / subtotal;
      if (ratio <= 0.5) {
        score += UPSELL_CONFIG.priceFitScore;
        reasons.push('preço proporcional');
      } else if (ratio > 1.2) {
        score -= 6;
        reasons.push('preço alto p/ pedido');
      }
    }

    // Popularidade honesta: sem dados de vendas, usamos faixa de preço
    // "popular" (itens de ticket médio) — NÃO inventamos "mais vendido".
    if (product.price >= 3 && product.price <= 20) {
      score += UPSELL_CONFIG.popularScore;
      reasons.push('faixa popular');
    }

    // Sem relação clara (grupo OUTRO sem complemento) → penalidade
    if (group === 'OUTRO' && bestComplement === 0) {
      score -= UPSELL_CONFIG.noRelationPenalty;
      reasons.push('sem relação');
    }

    return { product, score, reasons };
  });

  // Ordena por score desc, depois preço asc (desempate: mais barato primeiro)
  scored.sort((a, b) => b.score - a.score || a.product.price - b.product.price);

  // Diversidade final: evita 2+ do mesmo grupo no topo quando há alternativas
  const picked: UpsellMenuItem[] = [];
  const pickedGroups = new Set<CategoryGroup>();
  for (const { product } of scored) {
    if (picked.length >= UPSELL_CONFIG.maxRecommendations) break;
    const g = groupOfCategory(product.categoryName);
    // Se já temos 2 do mesmo grupo, só aceita outro grupo (diversidade)
    const sameGroupCount = picked.filter((p) => groupOfCategory(p.categoryName) === g).length;
    if (sameGroupCount >= 2 && pickedGroups.size > 1) continue;
    picked.push(product);
    pickedGroups.add(g);
  }

  // Carrinho grande/completo → reduz para 2 altamente relevantes (regra 10)
  const max = options?.max
    ?? (subtotal >= UPSELL_CONFIG.fullCartThreshold || totalLines >= UPSELL_CONFIG.maxItemsInCartForFull
      ? UPSELL_CONFIG.maxRecommendationsFullCart
      : UPSELL_CONFIG.maxRecommendations);

  return picked.slice(0, max);
}
