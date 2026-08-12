/**
 * King Food — static menu data for offline/fallback mode.
 * Used when the backend API is not available.
 * Prices and items match the live site as of 2026-08-12.
 */

export interface MenuCategory {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId: string | null;
  _count: { menuItems: number };
  children: MenuCategory[];
}

export interface MenuItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  image: string | null;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number;
  category: { id: string; name: string };
  _count: { options: number; allergens: number; mealtimes: number };
}

export const FALLBACK_CATEGORIES: MenuCategory[] = [
  { id: 'cat-1', name: 'Açaí do King', slug: 'acai-do-king', isActive: true, parentId: null, _count: { menuItems: 3 }, children: [] },
  { id: 'cat-2', name: 'Açaí Premium', slug: 'acai-premium', isActive: true, parentId: null, _count: { menuItems: 4 }, children: [] },
  { id: 'cat-3', name: 'Açaí Tropical', slug: 'acai-tropical', isActive: true, parentId: null, _count: { menuItems: 3 }, children: [] },
  { id: 'cat-4', name: 'Açaí Combos', slug: 'acai-combos', isActive: true, parentId: null, _count: { menuItems: 3 }, children: [] },
  { id: 'cat-5', name: 'Hambúrgueres', slug: 'hamburgueres', isActive: true, parentId: null, _count: { menuItems: 3 }, children: [] },
  { id: 'cat-6', name: 'Bebidas', slug: 'bebidas', isActive: true, parentId: null, _count: { menuItems: 3 }, children: [] },
];

export const FALLBACK_ITEMS: MenuItem[] = [
  // Açaí do King
  { id: 'item-1', name: 'Açaí King Tradicional Bowl', slug: 'acai-king-tradicional-bowl', description: 'Bowl 12oz. Açaí premium cremoso, leite condensado, leite em pó, morango e banana.', price: 13.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-1', name: 'Açaí do King' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-2', name: 'Açaí King Tradicional', slug: 'acai-king-tradicional', description: 'Copo 16oz. Açaí cremoso com leite condensado, leite em pó, morango e banana.', price: 18.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-1', name: 'Açaí do King' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-3', name: 'Açaí King Ninho', slug: 'acai-king-ninho', description: 'Açaí cremoso com leite em pó Ninho.', price: 16.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-1', name: 'Açaí do King' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Açaí Premium
  { id: 'item-4', name: 'Açaí Trufado de Nutella', slug: 'acai-trufado-nutella', description: 'Açaí com Nutella generosa, leite condensado, leite em pó, morango e banana.', price: 16.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-2', name: 'Açaí Premium' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-5', name: 'Açaí Paçoca', slug: 'acai-pacoca', description: 'Açaí com paçoca esfarelada, banana, leite condensado e leite em pó.', price: 16.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-2', name: 'Açaí Premium' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-6', name: 'Açaí Sensação de Morango', slug: 'acai-sensacao-morango', description: 'Açaí com mousse artesanal de morango.', price: 17.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-2', name: 'Açaí Premium' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-7', name: 'Açaí Ferrero Rocher', slug: 'acai-ferrero-rocher', description: 'Açaí premium com toque Ferrero Rocher.', price: 17.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-2', name: 'Açaí Premium' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Açaí Tropical
  { id: 'item-8', name: 'Açaí King Passion Fruit', slug: 'acai-king-passion-fruit', description: 'Açaí com maracujá.', price: 16.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-3', name: 'Açaí Tropical' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-9', name: 'Açaí Nature', slug: 'acai-nature', description: 'Açaí mais natural, com frutas.', price: 14.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-3', name: 'Açaí Tropical' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-10', name: 'Açaí Tropical', slug: 'acai-tropical', description: 'Açaí puro com abacaxi, manga e kiwi.', price: 14.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-3', name: 'Açaí Tropical' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Açaí Tropical no Abacaxi (featured)
  { id: 'item-11', name: 'Açaí Tropical (no Abacaxi)', slug: 'acai-tropical-no-abacaxi', description: 'Montado dentro do abacaxi. Açaí, abacaxi, manga e kiwi.', price: 27.00, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-3', name: 'Açaí Tropical' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Açaí Piña Colada
  { id: 'item-12', name: 'Açaí Piña Colada King', slug: 'acai-pina-colada-king', description: 'Açaí com mousse de coco, abacaxi e coco ralado.', price: 16.50, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-3', name: 'Açaí Tropical' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-13', name: 'Açaí Piña Colada (no abacaxi)', slug: 'acai-pina-colada-no-abacaxi', description: 'Piña Colada montada no abacaxi.', price: 27.00, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-3', name: 'Açaí Tropical' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Combos
  { id: 'item-14', name: 'Combo Casal', slug: 'combo-casal', description: 'Dois bowls 12oz tradicionais.', price: 24.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-4', name: 'Açaí Combos' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-15', name: 'Combo Família', slug: 'combo-familia', description: '2 copos 16oz tradicionais.', price: 33.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-4', name: 'Açaí Combos' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-16', name: '2× Açaí Tropical (no Abacaxi)', slug: '2x-acai-tropical-no-abacaxi', description: 'Dois açaís montados no abacaxi.', price: 46.00, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-4', name: 'Açaí Combos' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-17', name: 'Combo Brazuca', slug: 'combo-brazuca', description: '4 copos 16oz tradicionais.', price: 67.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-4', name: 'Açaí Combos' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Hambúrgueres
  { id: 'item-18', name: 'X-Burger', slug: 'x-burger', description: 'Hambúrguer clássico King Food.', price: 14.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-5', name: 'Hambúrgueres' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-19', name: 'X-Bacon', slug: 'x-bacon', description: 'Hambúrguer com bacon.', price: 15.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-5', name: 'Hambúrgueres' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-20', name: 'X-Tudo', slug: 'x-tudo', description: 'O completo da casa.', price: 22.90, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-5', name: 'Hambúrgueres' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },

  // Bebidas
  { id: 'item-21', name: 'Guaraná 350 ml', slug: 'guarana-350ml', description: 'Lata 350ml.', price: 4.00, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-6', name: 'Bebidas' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-22', name: 'Coca-Cola 350 ml', slug: 'coca-cola-350ml', description: 'Lata 350ml.', price: 3.00, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-6', name: 'Bebidas' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
  { id: 'item-23', name: 'Água', slug: 'agua', description: 'Água mineral.', price: 1.00, image: null, isActive: true, trackStock: false, stockQty: 0, category: { id: 'cat-6', name: 'Bebidas' }, _count: { options: 0, allergens: 0, mealtimes: 0 } },
];
