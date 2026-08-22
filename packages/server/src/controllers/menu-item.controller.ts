import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { Prisma } from '@prisma/client';
import { auditLog } from '../lib/audit.js';

const menuOptionValueSchema = z.object({
  name: z.string().min(1),
  priceModifier: z.number().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

const menuOptionSchema = z.object({
  name: z.string().min(1),
  displayType: z.enum(['SELECT', 'RADIO', 'CHECKBOX', 'QUANTITY']).default('SELECT'),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
  values: z.array(menuOptionValueSchema).min(1),
});

const createMenuItemSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  price: z.number().min(0),
  sku: z.string().optional(),
  cost: z.number().min(0).optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  trackStock: z.boolean().default(false),
  stockQty: z.number().int().min(0).default(0),
  orderType: z.enum(['DELIVERY', 'PICKUP']).nullable().optional(),
  categoryId: z.string().min(1),
  locationId: z.string().optional(),
  options: z.array(menuOptionSchema).optional(),
  allergenIds: z.array(z.string()).optional(),
  mealtimeIds: z.array(z.string()).optional(),
});

const updateMenuItemSchema = createMenuItemSchema.partial().omit({ slug: true });

export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const categoryId = req.query.categoryId as string | undefined;
  const search = req.query.search as string | undefined;
  // Public storefront sees only active items. The admin passes
  // includeInactive=true to manage disabled products.
  const includeInactive = req.query.includeInactive === 'true';

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (!includeInactive) where.isActive = true;

  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { options: true, allergens: true, mealtimes: true } },
      },
    }),
    prisma.menuItem.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      options: {
        orderBy: { sortOrder: 'asc' },
        include: {
          values: { orderBy: { sortOrder: 'asc' } },
        },
      },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
    },
  });

  if (!item) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  res.json({ success: true, data: item });
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const parsed = createMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { options, allergenIds, mealtimeIds, ...data } = parsed.data;

  const existing = await prisma.menuItem.findUnique({ where: { slug: data.slug } });
  if (existing) {
    res.status(409).json({ success: false, error: 'A menu item with this slug already exists' });
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    res.status(400).json({ success: false, error: 'Category not found' });
    return;
  }

  const item = await prisma.menuItem.create({
    data: {
      ...data,
      options: options ? {
        create: options.map((opt) => ({
          name: opt.name,
          displayType: opt.displayType,
          isRequired: opt.isRequired,
          minSelect: opt.minSelect,
          maxSelect: opt.maxSelect,
          sortOrder: opt.sortOrder,
          values: {
            create: opt.values,
          },
        })),
      } : undefined,
      allergens: allergenIds?.length ? {
        create: allergenIds.map((allergenId) => ({ allergenId })),
      } : undefined,
      mealtimes: mealtimeIds?.length ? {
        create: mealtimeIds.map((mealtimeId) => ({ mealtimeId })),
      } : undefined,
    },
    include: {
      category: { select: { id: true, name: true } },
      options: { include: { values: true } },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
    },
  });

  auditLog(req, { action: 'create', entity: 'MenuItem', entityId: item.id, details: { name: item.name } });

  res.status(201).json({ success: true, data: item });
}

export async function updateMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const { options, allergenIds, mealtimeIds, ...data } = parsed.data;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...data,
      options: options ? {
        deleteMany: {},
        create: options.map((opt) => ({
          name: opt.name,
          displayType: opt.displayType,
          isRequired: opt.isRequired,
          minSelect: opt.minSelect,
          maxSelect: opt.maxSelect,
          sortOrder: opt.sortOrder,
          values: {
            create: opt.values,
          },
        })),
      } : undefined,
      allergens: allergenIds !== undefined ? {
        deleteMany: {},
        create: allergenIds.map((allergenId) => ({ allergenId })),
      } : undefined,
      mealtimes: mealtimeIds !== undefined ? {
        deleteMany: {},
        create: mealtimeIds.map((mealtimeId) => ({ mealtimeId })),
      } : undefined,
    },
    include: {
      category: { select: { id: true, name: true } },
      options: { include: { values: true } },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
    },
  });

  auditLog(req, { action: 'update', entity: 'MenuItem', entityId: id, details: data });

  res.json({ success: true, data: item });
}

export async function deleteMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const force = req.query.force === 'true';
  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });
  if (orderItemCount > 0 && !force) {
    // Soft-delete: keep historical order data intact, remove from public menu.
    await prisma.menuItem.update({ where: { id }, data: { isActive: false } });
    auditLog(req, { action: 'update', entity: 'MenuItem', entityId: id, details: { name: existing.name, reason: 'has_orders' } });
    res.json({ success: true, message: 'Item removed from menu (preserved in historical orders)' });
    return;
  }

  if (orderItemCount > 0) {
    // Exclusão FORÇADA: remove o item de vez, incluindo o histórico de pedidos
    // (relações em cascata manual: order_item_options -> order_items -> options -> item).
    await prisma.$transaction([
      prisma.orderItemOption.deleteMany({ where: { orderItem: { menuItemId: id } } }),
      prisma.orderItem.deleteMany({ where: { menuItemId: id } }),
      prisma.menuOptionValue.deleteMany({ where: { menuOption: { menuItemId: id } } }),
      prisma.menuOption.deleteMany({ where: { menuItemId: id } }),
      prisma.menuItemMealtime.deleteMany({ where: { menuItemId: id } }),
      prisma.menuItemAllergen.deleteMany({ where: { menuItemId: id } }),
      prisma.menuItem.delete({ where: { id } }),
    ]);
    auditLog(req, { action: 'delete', entity: 'MenuItem', entityId: id, details: { name: existing.name, reason: 'force_with_orders', orderItemsRemoved: orderItemCount } });
    res.json({ success: true, message: 'Menu item permanently deleted (including historical orders)' });
    return;
  }

  await prisma.menuItem.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'MenuItem', entityId: id, details: { name: existing.name } });
  res.json({ success: true, message: 'Menu item deleted' });
}

interface GalleryImage {
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

function parseGallery(raw: unknown): GalleryImage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (g): g is GalleryImage =>
        !!g && typeof g === 'object' && typeof (g as GalleryImage).url === 'string'
    )
    .map((g) => ({
      url: g.url,
      sortOrder: typeof g.sortOrder === 'number' ? g.sortOrder : 0,
      isPrimary: !!g.isPrimary,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Upload de imagem do produto — faz APPEND à galeria (retrocompatível).
 * Produtos antigos (images=null) viram galeria de 1 foto com image preservado.
 */
export async function uploadMenuItemImage(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file provided' });
    return;
  }

  // Store as base64 data URL — Vercel serverless has read-only filesystem
  const imagePath = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const gallery = parseGallery(existing.images);

  // Primeira foto do produto: vira a principal e atualiza image (compatibilidade)
  if (gallery.length === 0) {
    gallery.push({ url: imagePath, sortOrder: 0, isPrimary: true });
  } else {
    gallery.push({
      url: imagePath,
      sortOrder: gallery.length,
      isPrimary: false,
    });
  }

  const primary = gallery.find((g) => g.isPrimary) ?? gallery[0];

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      images: gallery as unknown as Prisma.InputJsonValue,
      image: primary.url,
    },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: item });
}

/**
 * Salva a lista completa de imagens: ordem, principal e remoções.
 * Body: { images: [{ url, sortOrder, isPrimary }] }
 */
export async function updateMenuItemImages(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const raw = (req.body?.images ?? null) as unknown;
  if (raw === null) {
    // Limpar galeria inteira (mantém image para compatibilidade)
    const item = await prisma.menuItem.update({
      where: { id },
      data: { images: Prisma.DbNull },
      include: { category: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: item });
    return;
  }

  const gallery = parseGallery(raw);
  if (gallery.length === 0) {
    const item = await prisma.menuItem.update({
      where: { id },
      data: { images: Prisma.DbNull, image: null },
      include: { category: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: item });
    return;
  }

  // Reindexar sortOrder e garantir exatamente uma principal (a primeira)
  const normalized = gallery.map((g, i) => ({
    url: g.url,
    sortOrder: i,
    isPrimary: i === 0,
  }));

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      images: normalized as unknown as Prisma.InputJsonValue,
      image: normalized[0].url,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  res.json({ success: true, data: item });
}

export async function deleteMenuItemImage(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: { image: null, images: Prisma.DbNull },
    include: {
      category: { select: { id: true, name: true } },
    },
  });

  res.json({ success: true, data: item });
}
