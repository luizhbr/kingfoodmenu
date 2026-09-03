/**
 * Testes do sistema de upsell dinâmico (lib/upsell.ts).
 * Roda com tsx: npx tsx scripts/test-upsell.ts
 * Usa os PRODUTOS REAIS do cardápio King Food (2026-09-03, após remoção
 * de Hambúrgueres e Bebidas — 17 itens: açaís + combos).
 */
import {
  getUpsellRecommendations,
  getUpsellSubtitle,
  groupOfCategory,
  type UpsellMenuItem,
} from '../src/lib/upsell.js';

// ── Dados reais do cardápio (via /api/menu/items, 03/09) ──────────────
const ITEMS: UpsellMenuItem[] = [
  { id: 'a1', name: 'Açaí King Tradicional Bowl', price: 13.9, categoryName: 'Açaí do King' },
  { id: 'a2', name: 'Açaí King Tradicional', price: 18.9, categoryName: 'Açaí do King' },
  { id: 'a3', name: 'Açaí Trufado de Nutella', price: 16.9, categoryName: 'Açaí do King' },
  { id: 'a4', name: 'Açaí Paçoca', price: 16.9, categoryName: 'Açaí do King' },
  { id: 'p1', name: 'Açaí Sensação de Morango', price: 17.9, categoryName: 'Açaí Premium' },
  { id: 'p2', name: 'Açaí Ferrero Rocher', price: 17.9, categoryName: 'Açaí Premium' },
  { id: 'p3', name: 'Açaí King Ninho', price: 16.9, categoryName: 'Açaí Premium' },
  { id: 'p4', name: 'Açaí King Passion Fruit', price: 16.9, categoryName: 'Açaí Premium' },
  { id: 't1', name: 'Açaí Nature', price: 14.9, categoryName: 'Açaí Tropical' },
  { id: 't2', name: 'Açaí Tropical', price: 14.9, categoryName: 'Açaí Tropical' },
  { id: 't3', name: 'Açaí Tropical (no Abacaxi)', price: 27, categoryName: 'Açaí Tropical' },
  { id: 't4', name: 'Açaí Piña Colada King', price: 16.5, categoryName: 'Açaí Tropical' },
  { id: 'c1', name: 'Combo Casal', price: 24.9, categoryName: 'Açaí Combos' },
  { id: 'c2', name: 'Combo Família', price: 33.9, categoryName: 'Açaí Combos' },
  { id: 'c3', name: '2× Açaí Tropical (no Abacaxi)', price: 46, categoryName: 'Açaí Combos' },
  { id: 'c4', name: 'Combo Brazuca', price: 67.9, categoryName: 'Açaí Combos' },
  { id: 'x1', name: 'Produto Sem Categoria', price: 10, categoryName: null },
];

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${detail}`); }
}

console.log('=== TESTE 1: Carrinho vazio → comportamento seguro ===');
const r1 = getUpsellRecommendations([], ITEMS);
check('retorna []', r1.length === 0, `got ${r1.length}`);

console.log('=== TESTE 2: Carrinho com Açaí → contextual + não repete ===');
const cart2 = [{ menuItemId: 'a1', name: 'Açaí King Tradicional Bowl', price: 13.9, quantity: 1, categoryName: 'Açaí do King' }];
const r2 = getUpsellRecommendations(cart2, ITEMS);
check('retorna 2-4 itens', r2.length >= 2 && r2.length <= 4, `got ${r2.length}`);
check('não repete item do carrinho', !r2.some((i) => i.id === 'a1'));
check('combo aparece (complemento)', r2.some((i) => i.categoryName === 'Açaí Combos'), r2.map((i) => i.name).join(', '));
check('não mostra 4 açaís iguais', r2.filter((i) => groupOfCategory(i.categoryName) === 'AÇAI').length <= 2, r2.map((i) => i.name).join(', '));
console.log(`  → recomendações: ${r2.map((i) => i.name).join(' | ')}`);

console.log('=== TESTE 3: Carrinho com Combo → complemento relevante ===');
const cart3 = [{ menuItemId: 'c1', name: 'Combo Casal', price: 24.9, quantity: 1, categoryName: 'Açaí Combos' }];
const r3 = getUpsellRecommendations(cart3, ITEMS);
check('retorna 2-4 itens', r3.length >= 2 && r3.length <= 4, `got ${r3.length}`);
check('não repete Combo Casal', !r3.some((i) => i.id === 'c1'));
check('açaí individual aparece (complemento)', r3.some((i) => groupOfCategory(i.categoryName) === 'AÇAI'), r3.map((i) => i.name).join(', '));
console.log(`  → recomendações: ${r3.map((i) => i.name).join(' | ')}`);

console.log('=== TESTE 4: Carrinho com múltiplas categorias → diversidade ===');
const cart4 = [
  { menuItemId: 'a1', name: 'Açaí King Tradicional Bowl', price: 13.9, quantity: 1, categoryName: 'Açaí do King' },
  { menuItemId: 'c1', name: 'Combo Casal', price: 24.9, quantity: 1, categoryName: 'Açaí Combos' },
];
const r4 = getUpsellRecommendations(cart4, ITEMS);
check('retorna 2-4 itens', r4.length >= 2 && r4.length <= 4, `got ${r4.length}`);
check('não repete itens do carrinho', !r4.some((i) => i.id === 'a1' || i.id === 'c1'));
console.log(`  → recomendações: ${r4.map((i) => i.name).join(' | ')}`);

console.log('=== TESTE 5: Adicionar recomendação → some das sugestões ===');
const cart5 = [...cart2, { menuItemId: 'c1', name: 'Combo Casal', price: 24.9, quantity: 1, categoryName: 'Açaí Combos' }];
const r5 = getUpsellRecommendations(cart5, ITEMS);
check('Combo Casal some das sugestões', !r5.some((i) => i.id === 'c1'));
check('subtotal atualiza (lógica do carrinho, não do upsell)', cart5.reduce((s, i) => s + i.price, 0) === 38.8);

console.log('=== TESTE 6: Remover item → recomendações recalculam ===');
const r6 = getUpsellRecommendations(cart2, ITEMS);
check('Combo Casal volta a ser recomendado após remover', r6.some((i) => i.id === 'c1'), r6.map((i) => i.name).join(', '));

console.log('=== TESTE 7: Produto sem categoria → fallback seguro ===');
const cart7 = [{ menuItemId: 'x1', name: 'Produto Sem Categoria', price: 10, quantity: 1, categoryName: null }];
const r7 = getUpsellRecommendations(cart7, ITEMS);
check('não quebra', Array.isArray(r7));
check('não repete o sem-categoria', !r7.some((i) => i.id === 'x1'));
check('retorna até 4', r7.length <= 4, `got ${r7.length}`);
console.log(`  → recomendações: ${r7.map((i) => i.name).join(' | ')}`);

console.log('=== TESTE 8: Carrinho grande → reduz para 2 ===');
const cart8 = [
  { menuItemId: 'c4', name: 'Combo Brazuca', price: 67.9, quantity: 1, categoryName: 'Açaí Combos' },
];
const r8 = getUpsellRecommendations(cart8, ITEMS);
check('carrinho >= $60 → máx 2', r8.length <= 2, `got ${r8.length}`);
console.log(`  → recomendações: ${r8.map((i) => i.name).join(' | ')}`);

console.log('=== COPY DINÂMICA ===');
check('açaí → "Algumas opções que combinam"', getUpsellSubtitle(['AÇAI']) === 'Algumas opções que combinam com seu pedido');
check('combo → "Que tal deixar seu pedido ainda melhor?"', getUpsellSubtitle(['COMBO']) === 'Que tal deixar seu pedido ainda melhor?');
check('misto → "Escolhemos opções que combinam"', getUpsellSubtitle(['AÇAI', 'COMBO']) === 'Escolhemos opções que combinam com seu pedido');

console.log(`\nRESULTADO: ${pass} passaram, ${fail} falharam`);
process.exit(fail > 0 ? 1 : 0);
