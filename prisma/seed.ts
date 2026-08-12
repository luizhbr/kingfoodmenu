import { PrismaClient, OrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (King Food catalog — Milestone 2)...');

  // Admin
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

  // Customer
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

  // Allergens
  const allergens = await Promise.all(
    ['Gluten', 'Dairy', 'Nuts', 'Eggs', 'Soy', 'Shellfish', 'Fish', 'Sesame'].map((name) =>
      prisma.allergen.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const allergenMap = Object.fromEntries(allergens.map((a) => [a.name, a.id]));

  await prisma.customerGroup.upsert({
    where: { name: 'Regular' },
    update: {},
    create: { name: 'Regular' },
  });

  // Location — King Food Columbus
  const location = await prisma.location.upsert({
    where: { slug: 'columbus' },
    update: {
      name: 'King Food Columbus',
      description: 'Açaí BR da saudade — Brazilian bowls, burgers and combos delivered in Columbus, OH',
      phone: '(380) 269-5741',
      email: 'orders@kingfood.local',
      city: 'Columbus',
      state: 'OH',
      postalCode: '43035',
    },
    create: {
      name: 'King Food Columbus',
      slug: 'columbus',
      description: 'Açaí BR da saudade — Brazilian bowls, burgers and combos delivered in Columbus, OH',
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
      deliveryLeadTime: 35,
      pickupLeadTime: 15,
    },
  });

  for (let day = 0; day <= 6; day++) {
    await prisma.operatingHour.upsert({
      where: { locationId_dayOfWeek: { locationId: location.id, dayOfWeek: day } },
      update: {},
      create: {
        locationId: location.id,
        dayOfWeek: day,
        openTime: '10:00',
        closeTime: '22:00',
        isClosed: false,
      },
    });
  }

  // Delivery zones (skip if re-seed creates duplicates — use createMany skipDuplicates pattern via try)
  const existingZones = await prisma.deliveryZone.count({ where: { locationId: location.id } });
  if (existingZones === 0) {
    await prisma.deliveryZone.createMany({
      data: [
        { locationId: location.id, name: 'Zone 1 - Nearby', charge: 3.99, minOrder: 15, isActive: true },
        { locationId: location.id, name: 'Zone 2 - Extended', charge: 6.99, minOrder: 25, isActive: true },
      ],
    });
  }

  // Mealtimes
  let lunch = await prisma.mealtime.findFirst({ where: { locationId: location.id, name: 'Lunch' } });
  if (!lunch) {
    lunch = await prisma.mealtime.create({
      data: {
        name: 'Lunch',
        startTime: '11:00',
        endTime: '15:00',
        days: [1, 2, 3, 4, 5],
        locationId: location.id,
      },
    });
  }

  let dinner = await prisma.mealtime.findFirst({ where: { locationId: location.id, name: 'Dinner' } });
  if (!dinner) {
    dinner = await prisma.mealtime.create({
      data: {
        name: 'Dinner',
        startTime: '17:00',
        endTime: '22:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        locationId: location.id,
      },
    });
  }

  // ========== KING FOOD CATEGORIES ==========
  const catAcai = await prisma.category.upsert({
    where: { slug: 'acai' },
    update: { name: 'Açaí', sortOrder: 1, locationId: location.id },
    create: { name: 'Açaí', slug: 'acai', sortOrder: 1, locationId: location.id },
  });

  const catBurgers = await prisma.category.upsert({
    where: { slug: 'burgers' },
    update: { name: 'Burgers', sortOrder: 2, locationId: location.id },
    create: { name: 'Burgers', slug: 'burgers', sortOrder: 2, locationId: location.id },
  });

  const catCombos = await prisma.category.upsert({
    where: { slug: 'combos' },
    update: { name: 'Combos', sortOrder: 3, locationId: location.id },
    create: { name: 'Combos', slug: 'combos', sortOrder: 3, locationId: location.id },
  });

  const catSides = await prisma.category.upsert({
    where: { slug: 'sides' },
    update: { name: 'Sides', sortOrder: 4, locationId: location.id },
    create: { name: 'Sides', slug: 'sides', sortOrder: 4, locationId: location.id },
  });

  const catSweets = await prisma.category.upsert({
    where: { slug: 'sweets' },
    update: { name: 'Sweets', sortOrder: 5, locationId: location.id },
    create: { name: 'Sweets', slug: 'sweets', sortOrder: 5, locationId: location.id },
  });

  const catDrinks = await prisma.category.upsert({
    where: { slug: 'drinks' },
    update: { name: 'Drinks', sortOrder: 6, locationId: location.id },
    create: { name: 'Drinks', slug: 'drinks', sortOrder: 6, locationId: location.id },
  });

  // ========== PRODUCTS ==========

  // --- Açaí ---
  const acaiClassico = await prisma.menuItem.upsert({
    where: { slug: 'acai-classico' },
    update: {
      name: 'Açaí Clássico',
      description: 'Açaí cremoso batido na hora. Escolha o tamanho e os complementos.',
      price: 9.99,
      categoryId: catAcai.id,
      locationId: location.id,
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Açaí Clássico',
      slug: 'acai-classico',
      description: 'Açaí cremoso batido na hora. Escolha o tamanho e os complementos.',
      price: 9.99,
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop',
      categoryId: catAcai.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const acaiBowl = await prisma.menuItem.upsert({
    where: { slug: 'acai-bowl-especial' },
    update: {
      name: 'Açaí Bowl Especial',
      description: 'Açaí com granola, banana e mel — base pronta para personalizar.',
      price: 12.99,
      categoryId: catAcai.id,
      locationId: location.id,
      sortOrder: 2,
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Açaí Bowl Especial',
      slug: 'acai-bowl-especial',
      description: 'Açaí com granola, banana e mel — base pronta para personalizar.',
      price: 12.99,
      image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600&h=400&fit=crop',
      categoryId: catAcai.id,
      locationId: location.id,
      sortOrder: 2,
    },
  });

  // Açaí size (required RADIO)
  const existingAcaiSize = await prisma.menuOption.findFirst({
    where: { menuItemId: acaiClassico.id, name: 'Tamanho' },
  });
  if (!existingAcaiSize) {
    await prisma.menuOption.create({
      data: {
        menuItemId: acaiClassico.id,
        name: 'Tamanho',
        displayType: 'RADIO',
        isRequired: true,
        values: {
          create: [
            { name: '300ml', priceModifier: 0, isDefault: true, sortOrder: 1 },
            { name: '500ml', priceModifier: 3.0, sortOrder: 2 },
            { name: '700ml', priceModifier: 5.0, sortOrder: 3 },
          ],
        },
      },
    });
  }

  const existingAcaiToppings = await prisma.menuOption.findFirst({
    where: { menuItemId: acaiClassico.id, name: 'Complementos' },
  });
  if (!existingAcaiToppings) {
    await prisma.menuOption.create({
      data: {
        menuItemId: acaiClassico.id,
        name: 'Complementos',
        displayType: 'CHECKBOX',
        isRequired: false,
        maxSelect: 8,
        values: {
          create: [
            { name: 'Granola', priceModifier: 1.0, sortOrder: 1 },
            { name: 'Banana', priceModifier: 1.0, sortOrder: 2 },
            { name: 'Morango', priceModifier: 1.5, sortOrder: 3 },
            { name: 'Leite condensado', priceModifier: 1.5, sortOrder: 4 },
            { name: 'Paçoca', priceModifier: 1.5, sortOrder: 5 },
            { name: 'Amendoim', priceModifier: 1.0, sortOrder: 6 },
            { name: 'Mel', priceModifier: 0.75, sortOrder: 7 },
            { name: 'Leite em pó', priceModifier: 1.0, sortOrder: 8 },
          ],
        },
      },
    });
  }

  // Size + toppings for bowl especial
  const existingBowlSize = await prisma.menuOption.findFirst({
    where: { menuItemId: acaiBowl.id, name: 'Tamanho' },
  });
  if (!existingBowlSize) {
    await prisma.menuOption.create({
      data: {
        menuItemId: acaiBowl.id,
        name: 'Tamanho',
        displayType: 'RADIO',
        isRequired: true,
        values: {
          create: [
            { name: '500ml', priceModifier: 0, isDefault: true, sortOrder: 1 },
            { name: '700ml', priceModifier: 2.5, sortOrder: 2 },
          ],
        },
      },
    });
  }

  // --- Burgers ---
  const xBurger = await prisma.menuItem.upsert({
    where: { slug: 'x-burger' },
    update: {
      name: 'X-Burger',
      description: 'Pão, hambúrguer, queijo, alface, tomate e molho da casa.',
      price: 11.99,
      categoryId: catBurgers.id,
      locationId: location.id,
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
    },
    create: {
      name: 'X-Burger',
      slug: 'x-burger',
      description: 'Pão, hambúrguer, queijo, alface, tomate e molho da casa.',
      price: 11.99,
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop',
      categoryId: catBurgers.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const xBacon = await prisma.menuItem.upsert({
    where: { slug: 'x-bacon' },
    update: {
      name: 'X-Bacon',
      description: 'Hambúrguer, queijo, bacon crocante e molho especial.',
      price: 13.99,
      categoryId: catBurgers.id,
      locationId: location.id,
      sortOrder: 2,
      image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=400&fit=crop',
    },
    create: {
      name: 'X-Bacon',
      slug: 'x-bacon',
      description: 'Hambúrguer, queijo, bacon crocante e molho especial.',
      price: 13.99,
      image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&h=400&fit=crop',
      categoryId: catBurgers.id,
      locationId: location.id,
      sortOrder: 2,
    },
  });

  const xTudo = await prisma.menuItem.upsert({
    where: { slug: 'x-tudo' },
    update: {
      name: 'X-Tudo',
      description: 'O completo: hambúrguer, queijo, bacon, ovo, alface, tomate e molhos.',
      price: 15.99,
      categoryId: catBurgers.id,
      locationId: location.id,
      sortOrder: 3,
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop',
    },
    create: {
      name: 'X-Tudo',
      slug: 'x-tudo',
      description: 'O completo: hambúrguer, queijo, bacon, ovo, alface, tomate e molhos.',
      price: 15.99,
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop',
      categoryId: catBurgers.id,
      locationId: location.id,
      sortOrder: 3,
    },
  });

  for (const burger of [xBurger, xBacon, xTudo]) {
    const existingExtras = await prisma.menuOption.findFirst({
      where: { menuItemId: burger.id, name: 'Adicionais' },
    });
    if (!existingExtras) {
      await prisma.menuOption.create({
        data: {
          menuItemId: burger.id,
          name: 'Adicionais',
          displayType: 'CHECKBOX',
          isRequired: false,
          maxSelect: 5,
          values: {
            create: [
              { name: 'Bacon extra', priceModifier: 2.0, sortOrder: 1 },
              { name: 'Cheddar extra', priceModifier: 1.5, sortOrder: 2 },
              { name: 'Ovo', priceModifier: 1.5, sortOrder: 3 },
              { name: 'Hambúrguer extra', priceModifier: 3.5, sortOrder: 4 },
            ],
          },
        },
      });
    }
  }

  // --- Combos ---
  const comboBurgerFries = await prisma.menuItem.upsert({
    where: { slug: 'combo-burger-fries-drink' },
    update: {
      name: 'Combo Burger + Fries + Drink',
      description: 'X-Burger + batata média + refrigerante lata.',
      price: 16.99,
      categoryId: catCombos.id,
      locationId: location.id,
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Combo Burger + Fries + Drink',
      slug: 'combo-burger-fries-drink',
      description: 'X-Burger + batata média + refrigerante lata.',
      price: 16.99,
      image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=400&fit=crop',
      categoryId: catCombos.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const comboXtudo = await prisma.menuItem.upsert({
    where: { slug: 'combo-x-tudo' },
    update: {
      name: 'Combo X-Tudo',
      description: 'X-Tudo + batata média + refrigerante lata.',
      price: 19.99,
      categoryId: catCombos.id,
      locationId: location.id,
      sortOrder: 2,
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Combo X-Tudo',
      slug: 'combo-x-tudo',
      description: 'X-Tudo + batata média + refrigerante lata.',
      price: 19.99,
      image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop',
      categoryId: catCombos.id,
      locationId: location.id,
      sortOrder: 2,
    },
  });

  // --- Sides ---
  const fries = await prisma.menuItem.upsert({
    where: { slug: 'batata-frita' },
    update: {
      name: 'Batata Frita',
      description: 'Porção de batata crocante.',
      price: 4.99,
      categoryId: catSides.id,
      locationId: location.id,
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Batata Frita',
      slug: 'batata-frita',
      description: 'Porção de batata crocante.',
      price: 4.99,
      image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&h=400&fit=crop',
      categoryId: catSides.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const existingFriesSize = await prisma.menuOption.findFirst({
    where: { menuItemId: fries.id, name: 'Tamanho' },
  });
  if (!existingFriesSize) {
    await prisma.menuOption.create({
      data: {
        menuItemId: fries.id,
        name: 'Tamanho',
        displayType: 'RADIO',
        isRequired: true,
        values: {
          create: [
            { name: 'Média', priceModifier: 0, isDefault: true, sortOrder: 1 },
            { name: 'Grande', priceModifier: 2.0, sortOrder: 2 },
          ],
        },
      },
    });
  }

  // --- Sweets ---
  const churros = await prisma.menuItem.upsert({
    where: { slug: 'mini-churros' },
    update: {
      name: 'Mini Churros (16oz)',
      description: 'Mini churros com doce de leite. Porção generosa.',
      price: 7.99,
      categoryId: catSweets.id,
      locationId: location.id,
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Mini Churros (16oz)',
      slug: 'mini-churros',
      description: 'Mini churros com doce de leite. Porção generosa.',
      price: 7.99,
      image: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&h=400&fit=crop',
      categoryId: catSweets.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  // --- Drinks ---
  const refriLata = await prisma.menuItem.upsert({
    where: { slug: 'refrigerante-lata' },
    update: {
      name: 'Refrigerante Lata',
      description: 'Lata 350ml — Coca, Guaraná ou Sprite.',
      price: 2.99,
      categoryId: catDrinks.id,
      locationId: location.id,
      sortOrder: 1,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Refrigerante Lata',
      slug: 'refrigerante-lata',
      description: 'Lata 350ml — Coca, Guaraná ou Sprite.',
      price: 2.99,
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=400&fit=crop',
      categoryId: catDrinks.id,
      locationId: location.id,
      sortOrder: 1,
    },
  });

  const existingDrinkFlavor = await prisma.menuOption.findFirst({
    where: { menuItemId: refriLata.id, name: 'Sabor' },
  });
  if (!existingDrinkFlavor) {
    await prisma.menuOption.create({
      data: {
        menuItemId: refriLata.id,
        name: 'Sabor',
        displayType: 'RADIO',
        isRequired: true,
        values: {
          create: [
            { name: 'Coca-Cola', priceModifier: 0, isDefault: true, sortOrder: 1 },
            { name: 'Guaraná', priceModifier: 0, sortOrder: 2 },
            { name: 'Sprite', priceModifier: 0, sortOrder: 3 },
          ],
        },
      },
    });
  }

  const agua = await prisma.menuItem.upsert({
    where: { slug: 'agua' },
    update: {
      name: 'Água',
      description: 'Água mineral 500ml.',
      price: 1.99,
      categoryId: catDrinks.id,
      locationId: location.id,
      sortOrder: 2,
      image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop',
    },
    create: {
      name: 'Água',
      slug: 'agua',
      description: 'Água mineral 500ml.',
      price: 1.99,
      image: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=600&h=400&fit=crop',
      categoryId: catDrinks.id,
      locationId: location.id,
      sortOrder: 2,
    },
  });

  // Allergens (minimal)
  await prisma.menuItemAllergen.createMany({
    data: [
      { menuItemId: xBurger.id, allergenId: allergenMap['Gluten'] },
      { menuItemId: xBurger.id, allergenId: allergenMap['Dairy'] },
      { menuItemId: xBacon.id, allergenId: allergenMap['Gluten'] },
      { menuItemId: xBacon.id, allergenId: allergenMap['Dairy'] },
      { menuItemId: xTudo.id, allergenId: allergenMap['Gluten'] },
      { menuItemId: xTudo.id, allergenId: allergenMap['Dairy'] },
      { menuItemId: xTudo.id, allergenId: allergenMap['Eggs'] },
      { menuItemId: churros.id, allergenId: allergenMap['Gluten'] },
      { menuItemId: churros.id, allergenId: allergenMap['Dairy'] },
      { menuItemId: acaiClassico.id, allergenId: allergenMap['Dairy'] },
    ],
    skipDuplicates: true,
  });

  // Mealtimes for all items
  const allItems = [
    acaiClassico,
    acaiBowl,
    xBurger,
    xBacon,
    xTudo,
    comboBurgerFries,
    comboXtudo,
    fries,
    churros,
    refriLata,
    agua,
  ];

  await prisma.menuItemMealtime.createMany({
    data: allItems.flatMap((item) => [
      { menuItemId: item.id, mealtimeId: lunch!.id },
      { menuItemId: item.id, mealtimeId: dinner!.id },
    ]),
    skipDuplicates: true,
  });

  // Tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { locationId_name: { locationId: location.id, name: `Table ${i}` } },
      update: {},
      create: {
        locationId: location.id,
        name: `Table ${i}`,
        capacity: i <= 4 ? 2 : i <= 8 ? 4 : 6,
      },
    });
  }

  // Coupons
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

  await prisma.coupon.upsert({
    where: { code: 'FREEDELIVERY' },
    update: {},
    create: {
      code: 'FREEDELIVERY',
      type: 'FREE_DELIVERY',
      value: 0,
      minOrder: 30,
      usageLimit: 500,
      perCustomer: 3,
      isActive: true,
    },
  });

  // Sample orders using King Food items
  const orderStatuses: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'PICKED_UP'];
  const orderTypes = ['DELIVERY', 'PICKUP'] as const;
  const orderCount = await prisma.order.count({ where: { locationId: location.id } });
  if (orderCount < 5) {
    for (let i = 0; i < 6; i++) {
      const status = orderStatuses[i % orderStatuses.length];
      const orderType = orderTypes[i % 2];
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(i / 2));

      await prisma.order.create({
        data: {
          orderNumber: `KF-SEED-${String(i + 1).padStart(3, '0')}`,
          customerId: customer.id,
          locationId: location.id,
          orderType,
          status,
          subtotal: 18 + i * 3,
          tax: (18 + i * 3) * 0.08,
          deliveryFee: orderType === 'DELIVERY' ? 3.99 : 0,
          total: (18 + i * 3) * 1.08 + (orderType === 'DELIVERY' ? 3.99 : 0),
          createdAt,
          items: {
            create: [
              {
                menuItemId: i % 2 === 0 ? acaiClassico.id : xBurger.id,
                name: i % 2 === 0 ? 'Açaí Clássico' : 'X-Burger',
                quantity: 1,
                unitPrice: i % 2 === 0 ? 9.99 : 11.99,
                subtotal: i % 2 === 0 ? 9.99 : 11.99,
              },
            ],
          },
        },
      });
    }
  }

  // Reviews
  await prisma.review.createMany({
    data: [
      {
        customerId: customer.id,
        locationId: location.id,
        rating: 5,
        comment: 'Melhor açaí de Columbus!',
        isApproved: true,
      },
      {
        customerId: customer.id,
        locationId: location.id,
        rating: 5,
        comment: 'X-Tudo top demais.',
        isApproved: true,
      },
    ],
    skipDuplicates: true,
  });

  // Site settings — King Food
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      siteName: 'King Food',
      siteTitle: 'King Food — Açaí BR da saudade · Columbus, OH',
      storefrontTemplate: 'modern',
      colorPrimary: '#FFD100',
      colorSecondary: '#E31818',
      darkMode: 'light',
      heroSection: {
        title: 'Açaí BR da saudade',
        subtitle: 'Bowls, burgers e combos brasileiros — delivery em Columbus, OH.',
        backgroundImage: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1600&h=900&fit=crop',
        ctaPrimaryText: 'Ver Cardápio',
        ctaPrimaryLink: '/menu',
        ctaSecondaryText: 'Pedir agora',
        ctaSecondaryLink: '/menu',
      },
      featuresSection: [
        { icon: '🥤', title: 'Açaí autêntico', description: 'Sabor brasileiro de verdade, montado do seu jeito' },
        { icon: '🍔', title: 'Combos e burgers', description: 'Opções completas para matar a fome' },
        { icon: '🚗', title: 'Delivery Columbus', description: 'Rápido e direto na sua porta' },
      ],
      ctaSection: {
        title: 'Com fome de BR?',
        description: 'Peça King Food e receba em casa — açaí, burgers e combos.',
        buttonText: 'Fazer pedido',
        buttonLink: '/menu',
      },
    },
    create: {
      id: 'default',
      siteName: 'King Food',
      siteTitle: 'King Food — Açaí BR da saudade · Columbus, OH',
      storefrontTemplate: 'modern',
      colorPrimary: '#FFD100',
      colorSecondary: '#E31818',
      darkMode: 'light',
      heroSection: {
        title: 'Açaí BR da saudade',
        subtitle: 'Bowls, burgers e combos brasileiros — delivery em Columbus, OH.',
        backgroundImage: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=1600&h=900&fit=crop',
        ctaPrimaryText: 'Ver Cardápio',
        ctaPrimaryLink: '/menu',
        ctaSecondaryText: 'Pedir agora',
        ctaSecondaryLink: '/menu',
      },
      featuresSection: [
        { icon: '🥤', title: 'Açaí autêntico', description: 'Sabor brasileiro de verdade, montado do seu jeito' },
        { icon: '🍔', title: 'Combos e burgers', description: 'Opções completas para matar a fome' },
        { icon: '🚗', title: 'Delivery Columbus', description: 'Rápido e direto na sua porta' },
      ],
      ctaSection: {
        title: 'Com fome de BR?',
        description: 'Peça King Food e receba em casa — açaí, burgers e combos.',
        buttonText: 'Fazer pedido',
        buttonLink: '/menu',
      },
    },
  });

  await prisma.legalPage.upsert({
    where: { slug: 'privacy-policy' },
    update: {},
    create: {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      content:
        '# Privacy Policy\n\nKing Food respects your privacy. Contact privacy@kingfood.local for questions.',
    },
  });

  const cookieCategories = [
    {
      name: 'essential',
      label: 'Essential Cookies',
      description: 'Required for the website to function properly.',
      isRequired: true,
      sortOrder: 0,
    },
    {
      name: 'analytics',
      label: 'Analytics Cookies',
      description: 'Help us understand how visitors interact with our website.',
      isRequired: false,
      sortOrder: 1,
    },
    {
      name: 'marketing',
      label: 'Marketing Cookies',
      description: 'Used for personalized ads and campaigns.',
      isRequired: false,
      sortOrder: 2,
    },
  ];

  for (const cat of cookieCategories) {
    await prisma.cookieCategory.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('Seed completed — King Food catalog (Milestone 2)!');
  console.log('');
  console.log('Categories: Açaí, Burgers, Combos, Sides, Sweets, Drinks');
  console.log('Admin: admin@kitchenasty.com / admin123');
  console.log('Location: King Food Columbus');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
