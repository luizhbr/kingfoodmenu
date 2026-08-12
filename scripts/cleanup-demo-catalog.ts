/**
 * Deactivate leftover KitchenAsty demo menu (Mediterranean) if present.
 * Does NOT delete rows (safe for FK / order history).
 *
 * Usage (from repo root, with DATABASE_URL set):
 *   npx tsx scripts/cleanup-demo-catalog.ts
 *
 * King Food category slugs are preserved.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KING_FOOD_CATEGORY_SLUGS = new Set([
  'acai-do-king',
  'acai-premium',
  'acai-tropical',
  'acai-combos',
  'hamburgueres',
  'bebidas',
  // legacy M2 slugs if still used
  'acai',
  'burgers',
  'combos',
  'sides',
  'sweets',
  'drinks',
]);

const DEMO_CATEGORY_SLUGS = new Set([
  'appetizers',
  'main-courses',
  'pizzas',
  'desserts',
  // 'drinks' may conflict — only deactivate if name looks Mediterranean
]);

const DEMO_ITEM_SLUGS = new Set([
  'bruschetta',
  'caesar-salad',
  'hummus-trio',
  'grilled-salmon',
  'lamb-kofta',
  'chicken-shawarma-bowl',
  'margherita-pizza',
  'zaatar-flatbread',
  'tiramisu',
  'baklava',
  'fresh-lemonade',
  'turkish-coffee',
]);

async function main() {
  console.log('Cleanup demo catalog (deactivate only)...');

  const categories = await prisma.category.findMany();
  let catCount = 0;
  for (const c of categories) {
    if (KING_FOOD_CATEGORY_SLUGS.has(c.slug)) continue;
    if (DEMO_CATEGORY_SLUGS.has(c.slug) || !KING_FOOD_CATEGORY_SLUGS.has(c.slug)) {
      // Deactivate non–King Food categories (conservative: only known demo OR unknown non-KF)
      if (DEMO_CATEGORY_SLUGS.has(c.slug) || c.slug.match(/appetizer|pizza|mezze|main-course|dessert/)) {
        if (c.isActive) {
          await prisma.category.update({ where: { id: c.id }, data: { isActive: false } });
          catCount++;
          console.log(`  category OFF: ${c.slug}`);
        }
      }
    }
  }

  const items = await prisma.menuItem.findMany();
  let itemCount = 0;
  for (const item of items) {
    if (DEMO_ITEM_SLUGS.has(item.slug) && item.isActive) {
      await prisma.menuItem.update({ where: { id: item.id }, data: { isActive: false } });
      itemCount++;
      console.log(`  item OFF: ${item.slug}`);
    }
  }

  console.log(`Done. Categories deactivated: ${catCount}, items deactivated: ${itemCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
