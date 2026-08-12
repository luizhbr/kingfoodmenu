import { PrismaClient, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * King Food seed — catalog aligned to live OlaClick menu
 * Source snapshot: docs/king-food/CATALOG_FROM_OLACLICK.md
 * Company: bbd99239-41c5-4a62-9bf0-151d7224b7f3
 */

const prisma = new PrismaClient();

const ACAI_ADDONS = [
  { name: 'Nutella', priceModifier: 4, sortOrder: 1 },
  { name: 'Paçoca', priceModifier: 2, sortOrder: 2 },
  { name: 'Banana', priceModifier: 1, sortOrder: 3 },
  { name: 'Kiwi', priceModifier: 2, sortOrder: 4 },
  { name: 'Morango', priceModifier: 2, sortOrder: 5 },
  { name: 'Leite em pó', priceModifier: 2, sortOrder: 6 },
  { name: 'Leite condensado', priceModifier: 2, sortOrder: 7 },
  { name: 'Granola', priceModifier: 1, sortOrder: 8 },
];

async function ensureSizeOption(
  menuItemId: string,
  sizes: { name: string; priceModifier: number; isDefault?: boolean; sortOrder: number }[]
) {
  const existing = await prisma.menuOption.findFirst({ where: { menuItemId, name: 'Tamanho' } });
  if (existing) return;
  await prisma.menuOption.create({
    data: {
      menuItemId,
      name: 'Tamanho',
      displayType: 'RADIO',
      isRequired: true,
      values: { create: sizes.map((s) => ({ ...s, isDefault: s.isDefault ?? false })) },
    },
  });
}

async function ensureAcaiAddons(menuItemId: string) {
  const existing = await prisma.menuOption.findFirst({
    where: { menuItemId, name: 'Adicionais' },
  });
  if (existing) return;
  await prisma.menuOption.create({
    data: {
      menuItemId,
      name: 'Adicionais',
      displayType: 'CHECKBOX',
      isRequired: false,
      maxSelect: 10,
      values: { create: ACAI_ADDONS },
    },
  });
}

async function upsertItem(params: {
  slug: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  locationId: string;
  sortOrder: number;
  image?: string;
}) {
  return prisma.menuItem.upsert({
    where: { slug: params.slug },
    update: {
      name: params.name,
      description: params.description,
      price: params.price,
      categoryId: params.categoryId,
      locationId: params.locationId,
      sortOrder: params.sortOrder,
      image: params.image,
    },
    create: {
      slug: params.slug,
      name: params.name,
      description: params.description,
      price: params.price,
      categoryId: params.categoryId,
      locationId: params.locationId,
      sortOrder: params.sortOrder,
      image: params.image,
    },
  });
}

async function main() {
  console.log('Seeding King Food from OlaClick catalog snapshot...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@kitchenasty.com' },
    update: {},
    create: {
      email: 'admin@kitchenasty.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.customer.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      name: 'John Doe',
      phone: '(555) 987-6543',
    },
  });

  await Promise.all(
    ['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy'].map((name) =>
      prisma.allergen.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  await prisma.customerGroup.upsert({
    where: { name: 'Regular' },
    update: {},
    create: { name: 'Regular' },
  });

  const location = await prisma.location.upsert({
    where: { slug: 'columbus' },
    update: {
      name: 'King Food Columbus',
      description: 'Açaí brasileiro de verdade — delivery em Columbus, OH',
      phone: '(380) 269-5741',
      email: 'orders@kingfood.local',
      city: 'Columbus',
      state: 'OH',
      postalCode: '43035',
      deliveryLeadTime: 55,
    },
    create: {
      name: 'King Food Columbus',
      slug: 'columbus',
      description: 'Açaí brasileiro de verdade — delivery em Columbus, OH',
      phone: '(380) 269-5741',
      email: 'orders@kingfood.local',
      address: 'Columbus Metro',
      city: 'Columbus',
      state: 'OH',
      postalCode: '43035',
      country: 'US',
      lat: 40.1755,
      lng: -82.9993,
      deliveryEnabled: true,
      pickupEnabled: true,
      minOrderDelivery: 15,
      minOrderPickup: 0,
      deliveryLeadTime: 55,
      pickupLeadTime: 20,
    },
  });

  // Hours aligned to OlaClick info (evening service)
  const hours: { day: number; open: string; close: string; closed: boolean }[] = [
    { day: 0, open: '18:30', close: '22:30', closed: false }, // Sun
    { day: 1, open: '19:00', close: '22:00', closed: false }, // Mon
    { day: 2, open: '00:00', close: '00:00', closed: true }, // Tue
    { day: 3, open: '19:00', close: '22:00', closed: false }, // Wed
    { day: 4, open: '19:00', close: '22:00', closed: false }, // Thu
    { day: 5, open: '00:00', close: '00:00', closed: true }, // Fri
    { day: 6, open: '21:00', close: '23:59', closed: false }, // Sat
  ];
  for (const h of hours) {
    await prisma.operatingHour.upsert({
      where: { locationId_dayOfWeek: { locationId: location.id, dayOfWeek: h.day } },
      update: { openTime: h.open, closeTime: h.close, isClosed: h.closed },
      create: {
        locationId: location.id,
        dayOfWeek: h.day,
        openTime: h.open,
        closeTime: h.close,
        isClosed: h.closed,
      },
    });
  }

  if ((await prisma.deliveryZone.count({ where: { locationId: location.id } })) === 0) {
    await prisma.deliveryZone.createMany({
      data: [
        { locationId: location.id, name: 'Zone 1 - Nearby', charge: 3.99, minOrder: 15, isActive: true },
        { locationId: location.id, name: 'Zone 2 - Extended', charge: 6.99, minOrder: 25, isActive: true },
      ],
    });
  }

  let dinner = await prisma.mealtime.findFirst({ where: { locationId: location.id, name: 'Dinner' } });
  if (!dinner) {
    dinner = await prisma.mealtime.create({
      data: {
        name: 'Dinner',
        startTime: '18:00',
        endTime: '23:00',
        days: [0, 1, 3, 4, 6],
        locationId: location.id,
      },
    });
  }

  // Categories matching live menu
  const catKing = await prisma.category.upsert({
    where: { slug: 'acai-do-king' },
    update: { name: 'Açaí do King', sortOrder: 1, locationId: location.id },
    create: { name: 'Açaí do King', slug: 'acai-do-king', sortOrder: 1, locationId: location.id },
  });
  const catPremium = await prisma.category.upsert({
    where: { slug: 'acai-premium' },
    update: { name: 'Açaí Premium', sortOrder: 2, locationId: location.id },
    create: { name: 'Açaí Premium', slug: 'acai-premium', sortOrder: 2, locationId: location.id },
  });
  const catTropical = await prisma.category.upsert({
    where: { slug: 'acai-tropical' },
    update: { name: 'Açaí Tropical', sortOrder: 3, locationId: location.id },
    create: { name: 'Açaí Tropical', slug: 'acai-tropical', sortOrder: 3, locationId: location.id },
  });
  const catCombos = await prisma.category.upsert({
    where: { slug: 'acai-combos' },
    update: { name: 'Açaí Combos', sortOrder: 4, locationId: location.id },
    create: { name: 'Açaí Combos', slug: 'acai-combos', sortOrder: 4, locationId: location.id },
  });
  const catBurgers = await prisma.category.upsert({
    where: { slug: 'hamburgueres' },
    update: { name: 'Hambúrgueres', sortOrder: 5, locationId: location.id },
    create: { name: 'Hambúrgueres', slug: 'hamburgueres', sortOrder: 5, locationId: location.id },
  });
  const catDrinks = await prisma.category.upsert({
    where: { slug: 'bebidas' },
    update: { name: 'Bebidas', sortOrder: 6, locationId: location.id },
    create: { name: 'Bebidas', slug: 'bebidas', sortOrder: 6, locationId: location.id },
  });

  const imgAcai = 'https://assets.olaclick.app/companies/products/images/800/2ec71a1b-7d95-4290-a8ec-c2e5435d5508.png';
  const imgNutella =
    'https://assets.olaclick.app/companies/products/images/800/f01e009d-12c6-4b2c-b4af-3830886258aa.jpeg';

  // --- AÇAÍ DO KING ---
  const kingBowl = await upsertItem({
    slug: 'acai-king-tradicional-bowl',
    name: 'Açaí King Tradicional Bowl',
    description:
      'Bowl 12oz. O clássico que todo brasileiro conhece: açaí premium cremoso, leite condensado, leite em pó, morango e banana.',
    price: 13.9,
    categoryId: catKing.id,
    locationId: location.id,
    sortOrder: 1,
    image: imgAcai,
  });
  await ensureAcaiAddons(kingBowl.id);

  const kingCopo = await upsertItem({
    slug: 'acai-king-tradicional',
    name: 'Açaí King Tradicional',
    description:
      'Copo 16oz do nosso carro-chefe. Açaí cremoso com leite condensado, leite em pó, morango e banana fresquinha.',
    price: 18.9,
    categoryId: catKing.id,
    locationId: location.id,
    sortOrder: 2,
    image: imgAcai,
  });
  await ensureAcaiAddons(kingCopo.id);

  const trufado = await upsertItem({
    slug: 'acai-trufado-nutella',
    name: 'Açaí Trufado de Nutella',
    description:
      'Açaí com muita Nutella generosa, leite condensado, leite em pó e finalizado com morango e banana.',
    price: 16.9,
    categoryId: catKing.id,
    locationId: location.id,
    sortOrder: 3,
    image: imgNutella,
  });
  await ensureSizeOption(trufado.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 6.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(trufado.id);

  const pacoca = await upsertItem({
    slug: 'acai-pacoca',
    name: 'Açaí Paçoca',
    description:
      'Açaí cremoso com paçoca esfarelada em dupla camada, banana, leite condensado e leite em pó.',
    price: 16.9,
    categoryId: catKing.id,
    locationId: location.id,
    sortOrder: 4,
    image: imgAcai,
  });
  await ensureSizeOption(pacoca.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 6.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(pacoca.id);

  // --- PREMIUM ---
  const sensacao = await upsertItem({
    slug: 'acai-sensacao-morango',
    name: 'Açaí Sensação de Morango',
    description: 'Açaí inspirado no clássico bombom brasileiro com mousse artesanal de morango.',
    price: 17.9,
    categoryId: catPremium.id,
    locationId: location.id,
    sortOrder: 1,
    image: imgAcai,
  });
  await ensureSizeOption(sensacao.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 6.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(sensacao.id);

  const ferrero = await upsertItem({
    slug: 'acai-ferrero-rocher',
    name: 'Açaí Ferrero Rocher',
    description: 'Açaí premium com toque Ferrero Rocher.',
    price: 17.9,
    categoryId: catPremium.id,
    locationId: location.id,
    sortOrder: 2,
    image: imgAcai,
  });
  await ensureSizeOption(ferrero.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 7.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(ferrero.id);

  const ninho = await upsertItem({
    slug: 'acai-king-ninho',
    name: 'Açaí King Ninho',
    description: 'Açaí cremoso com leite em pó Ninho em generosa camada.',
    price: 16.9,
    categoryId: catPremium.id,
    locationId: location.id,
    sortOrder: 3,
    image: imgAcai,
  });
  await ensureSizeOption(ninho.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 6.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(ninho.id);

  const passion = await upsertItem({
    slug: 'acai-king-passion',
    name: 'Açaí King Passion Fruit',
    description: 'Açaí com maracujá (passion fruit).',
    price: 16.9,
    categoryId: catPremium.id,
    locationId: location.id,
    sortOrder: 4,
    image: imgAcai,
  });
  await ensureSizeOption(passion.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 6.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(passion.id);

  // --- TROPICAL ---
  const nature = await upsertItem({
    slug: 'acai-nature',
    name: 'Açaí Nature',
    description: 'Açaí mais natural, com frutas.',
    price: 14.9,
    categoryId: catTropical.id,
    locationId: location.id,
    sortOrder: 1,
    image: imgAcai,
  });
  await ensureSizeOption(nature.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 5.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(nature.id);

  const tropical = await upsertItem({
    slug: 'acai-tropical',
    name: 'Açaí Tropical',
    description: 'Açaí puro coberto com abacaxi, manga e kiwi frescos cortados na hora.',
    price: 14.9,
    categoryId: catTropical.id,
    locationId: location.id,
    sortOrder: 2,
    image: imgAcai,
  });
  await ensureSizeOption(tropical.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 5.0, sortOrder: 2 },
  ]);
  await ensureAcaiAddons(tropical.id);

  const tropicalAbacaxi = await upsertItem({
    slug: 'acai-tropical-no-abacaxi',
    name: 'Açaí Tropical (no Abacaxi)',
    description:
      'Só fruta, só frescor. Açaí puro coberto com abacaxi, manga e kiwi — montado dentro do abacaxi.',
    price: 27.0,
    categoryId: catTropical.id,
    locationId: location.id,
    sortOrder: 3,
    image: imgAcai,
  });

  const pina = await upsertItem({
    slug: 'acai-pina-colada-king',
    name: 'Açaí Piña Colada King',
    description: 'Açaí cremoso com mousse de coco, abacaxi fresco e coco ralado.',
    price: 16.5,
    categoryId: catTropical.id,
    locationId: location.id,
    sortOrder: 4,
    image: imgAcai,
  });
  await ensureSizeOption(pina.id, [
    { name: 'BOWL | 12 oz', priceModifier: 0, isDefault: true, sortOrder: 1 },
    { name: 'COPO | 16 oz', priceModifier: 6.4, sortOrder: 2 },
    { name: 'Montado no abacaxi', priceModifier: 9.5, sortOrder: 3 },
  ]);
  await ensureAcaiAddons(pina.id);

  const pinaAbacaxi = await upsertItem({
    slug: 'acai-pina-colada-no-abacaxi',
    name: 'Açaí Piña Colada (no abacaxi)',
    description: 'Piña Colada montada no abacaxi.',
    price: 27.0,
    categoryId: catTropical.id,
    locationId: location.id,
    sortOrder: 5,
    image: imgAcai,
  });

  // --- COMBOS ---
  const comboCasal = await upsertItem({
    slug: 'combo-casal',
    name: 'Combo Casal',
    description: 'Dois açaís cremosos no Bowl 12oz, com leite condensado, leite em pó, banana e morango.',
    price: 24.9,
    categoryId: catCombos.id,
    locationId: location.id,
    sortOrder: 1,
    image: imgAcai,
  });
  await ensureAcaiAddons(comboCasal.id);

  const comboFamilia = await upsertItem({
    slug: 'combo-familia',
    name: 'Combo Família',
    description: '2 copos de açaí tradicional 16oz com leite condensado, leite em pó, banana, morango e granola.',
    price: 33.9,
    categoryId: catCombos.id,
    locationId: location.id,
    sortOrder: 2,
    image: imgAcai,
  });
  await ensureAcaiAddons(comboFamilia.id);

  const combo2Tropical = await upsertItem({
    slug: 'combo-2-tropical-abacaxi',
    name: '2× Açaí Tropical (no Abacaxi)',
    description: 'Dois açaís montados no abacaxi.',
    price: 46.0,
    categoryId: catCombos.id,
    locationId: location.id,
    sortOrder: 3,
    image: imgAcai,
  });

  const comboBrazuca = await upsertItem({
    slug: 'combo-brazuca',
    name: 'Combo Brazuca',
    description: '4 copos de 16oz tradicionais — açaí cremoso estilo brasileiro para a família.',
    price: 67.9,
    categoryId: catCombos.id,
    locationId: location.id,
    sortOrder: 4,
    image: imgAcai,
  });
  await ensureAcaiAddons(comboBrazuca.id);

  // --- Burgers (from OlaClick inventory; may be hidden online but real) ---
  const xBurger = await upsertItem({
    slug: 'x-burger',
    name: 'X-Burger',
    description: 'Hambúrguer clássico King Food.',
    price: 14.9,
    categoryId: catBurgers.id,
    locationId: location.id,
    sortOrder: 1,
  });
  const xBacon = await upsertItem({
    slug: 'x-bacon',
    name: 'X-Bacon',
    description: 'Hambúrguer com bacon.',
    price: 15.9,
    categoryId: catBurgers.id,
    locationId: location.id,
    sortOrder: 2,
  });
  const xTudo = await upsertItem({
    slug: 'x-tudo',
    name: 'X-Tudo',
    description: 'O completo da casa.',
    price: 22.9,
    categoryId: catBurgers.id,
    locationId: location.id,
    sortOrder: 3,
  });

  // --- Drinks ---
  await upsertItem({
    slug: 'guarana-350',
    name: 'Guaraná 350 ml',
    description: 'Lata 350ml.',
    price: 4.0,
    categoryId: catDrinks.id,
    locationId: location.id,
    sortOrder: 1,
  });
  await upsertItem({
    slug: 'coca-350',
    name: 'Coca-Cola 350 ml',
    description: 'Lata 350ml.',
    price: 3.0,
    categoryId: catDrinks.id,
    locationId: location.id,
    sortOrder: 2,
  });
  await upsertItem({
    slug: 'agua',
    name: 'Água',
    description: 'Água mineral.',
    price: 1.0,
    categoryId: catDrinks.id,
    locationId: location.id,
    sortOrder: 3,
  });

  const allAcai = [
    kingBowl,
    kingCopo,
    trufado,
    pacoca,
    sensacao,
    ferrero,
    ninho,
    passion,
    nature,
    tropical,
    tropicalAbacaxi,
    pina,
    pinaAbacaxi,
    comboCasal,
    comboFamilia,
    combo2Tropical,
    comboBrazuca,
  ];

  await prisma.menuItemMealtime.createMany({
    data: [...allAcai, xBurger, xBacon, xTudo].map((item) => ({
      menuItemId: item.id,
      mealtimeId: dinner!.id,
    })),
    skipDuplicates: true,
  });

  for (let i = 1; i <= 8; i++) {
    await prisma.table.upsert({
      where: { locationId_name: { locationId: location.id, name: `Table ${i}` } },
      update: {},
      create: { locationId: location.id, name: `Table ${i}`, capacity: 4 },
    });
  }

  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10,
      minOrder: 20,
      maxDiscount: 15,
      usageLimit: 1000,
      perCustomer: 1,
      isActive: true,
    },
  });

  if ((await prisma.order.count({ where: { locationId: location.id } })) < 3) {
    await prisma.order.create({
      data: {
        orderNumber: 'KF-SEED-001',
        customerId: customer.id,
        locationId: location.id,
        orderType: 'DELIVERY',
        status: 'DELIVERED' as OrderStatus,
        subtotal: 18.9,
        tax: 1.51,
        deliveryFee: 3.99,
        total: 24.4,
        items: {
          create: [
            {
              menuItemId: kingCopo.id,
              name: 'Açaí King Tradicional',
              quantity: 1,
              unitPrice: 18.9,
              subtotal: 18.9,
            },
          ],
        },
      },
    });
  }

  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      siteName: 'King Food',
      siteTitle: 'King Food — Açaí brasileiro de verdade · Columbus, OH',
      storefrontTemplate: 'modern',
      colorPrimary: '#FFD100',
      colorSecondary: '#E31818',
      heroSection: {
        title: 'Açaí brasileiro de verdade',
        subtitle: 'Sabor do Brasil pra sua casa. Peça agora.',
        backgroundImage: imgAcai,
        ctaPrimaryText: 'Ver Cardápio',
        ctaPrimaryLink: '/menu',
        ctaSecondaryText: 'Pedir agora',
        ctaSecondaryLink: '/menu',
      },
    },
    create: {
      id: 'default',
      siteName: 'King Food',
      siteTitle: 'King Food — Açaí brasileiro de verdade · Columbus, OH',
      storefrontTemplate: 'modern',
      colorPrimary: '#FFD100',
      colorSecondary: '#E31818',
      darkMode: 'light',
      heroSection: {
        title: 'Açaí brasileiro de verdade',
        subtitle: 'Sabor do Brasil pra sua casa. Peça agora.',
        backgroundImage: imgAcai,
        ctaPrimaryText: 'Ver Cardápio',
        ctaPrimaryLink: '/menu',
        ctaSecondaryText: 'Pedir agora',
        ctaSecondaryLink: '/menu',
      },
      featuresSection: [],
      ctaSection: {
        title: 'Peça King Food',
        description: 'Delivery em Columbus, OH',
        buttonText: 'Ver Cardápio',
        buttonLink: '/menu',
      },
    },
  });

  console.log('Seed OK — catalog from OlaClick snapshot');
  console.log('Admin: admin@kitchenasty.com / admin123');
  console.log('See docs/king-food/CATALOG_FROM_OLACLICK.md');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
