import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';

const optionValueSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  priceModifier: z.number().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

const createGroupSchema = z.object({
  name: z.string().min(1),
  displayType: z.enum(['SELECT', 'RADIO', 'CHECKBOX', 'QUANTITY']).default('SELECT'),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  values: z.array(optionValueSchema).min(1),
});

const updateGroupSchema = createGroupSchema.partial();

// ── CRUD ─────────────────────────────────────────────────────────────

export async function listOptionGroups(req: Request, res: Response): Promise<void> {
  const includeInactive = req.query.includeInactive === 'true';

  const where: Record<string, unknown> = {};
  if (!includeInactive) where.isActive = true;

  const groups = await prisma.optionGroup.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      values: { orderBy: { sortOrder: 'asc' } },
      _count: { select: { menuItems: true } },
    },
  });

  res.json({ success: true, data: groups });
}

export async function getOptionGroup(req: Request<{ id: string }>, res: Response): Promise<void> {
  const group = await prisma.optionGroup.findUnique({
    where: { id: req.params.id },
    include: {
      values: { orderBy: { sortOrder: 'asc' } },
      menuItems: { include: { menuItem: { select: { id: true, name: true, slug: true } } } },
    },
  });

  if (!group) {
    res.status(404).json({ success: false, error: 'Option group not found' });
    return;
  }

  res.json({ success: true, data: group });
}

export async function createOptionGroup(req: Request, res: Response): Promise<void> {
  const parsed = createGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { values, ...data } = parsed.data;

  const group = await prisma.optionGroup.create({
    data: {
      ...data,
      values: { create: values },
    },
    include: { values: true },
  });

  auditLog(req, { action: 'create', entity: 'OptionGroup', entityId: group.id, details: { name: group.name } });
  res.status(201).json({ success: true, data: group });
}

export async function updateOptionGroup(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.optionGroup.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Option group not found' });
    return;
  }

  const { values, ...data } = parsed.data;

  // Se values veio, reconstruir a lista (delete + create)
  const group = await prisma.optionGroup.update({
    where: { id },
    data: {
      ...data,
      ...(values !== undefined ? {
        values: {
          deleteMany: {},
          create: values.map(v => ({
            name: v.name,
            priceModifier: v.priceModifier,
            isDefault: v.isDefault,
            sortOrder: v.sortOrder,
          })),
        },
      } : undefined),
    },
    include: { values: { orderBy: { sortOrder: 'asc' } } },
  });

  auditLog(req, { action: 'update', entity: 'OptionGroup', entityId: id, details: { name: group.name } });
  res.json({ success: true, data: group });
}

export async function deleteOptionGroup(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const existing = await prisma.optionGroup.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Option group not found' });
    return;
  }

  await prisma.optionGroup.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'OptionGroup', entityId: id, details: { name: existing.name } });
  res.json({ success: true, message: 'Option group deleted' });
}

// ── Atribuição a produtos ────────────────────────────────────────────

const assignSchema = z.object({
  menuItemIds: z.array(z.string()).min(1),
});

/** POST /api/option-groups/:id/assign — atribui grupo a múltiplos produtos */
export async function assignToProducts(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const group = await prisma.optionGroup.findUnique({ where: { id } });
  if (!group) {
    res.status(404).json({ success: false, error: 'Option group not found' });
    return;
  }

  // Upsert: cria a relação se não existe, não duplica
  const results = await Promise.all(
    parsed.data.menuItemIds.map(menuItemId =>
      prisma.menuItemOptionGroup.upsert({
        where: {
          menuItemId_optionGroupId: { menuItemId, optionGroupId: id },
        },
        update: {},
        create: { menuItemId, optionGroupId: id },
      })
    )
  );

  auditLog(req, { action: 'update', entity: 'OptionGroup', entityId: id, details: { products: parsed.data.menuItemIds.length } });
  res.json({ success: true, data: { assigned: results.length } });
}

/** POST /api/option-groups/:id/unassign — remove grupo de múltiplos produtos */
export async function unassignFromProducts(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const result = await prisma.menuItemOptionGroup.deleteMany({
    where: {
      optionGroupId: id,
      menuItemId: { in: parsed.data.menuItemIds },
    },
  });

  auditLog(req, { action: 'update', entity: 'OptionGroup', entityId: id, details: { removed: result.count } });
  res.json({ success: true, data: { removed: result.count } });
}

/** GET /api/option-groups/:id/products — lista produtos que usam este grupo */
export async function listGroupProducts(req: Request<{ id: string }>, res: Response): Promise<void> {
  const links = await prisma.menuItemOptionGroup.findMany({
    where: { optionGroupId: req.params.id },
    include: {
      menuItem: { select: { id: true, name: true, slug: true, isActive: true } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({
    success: true,
    data: links.map(l => ({
      linkId: l.id,
      sortOrder: l.sortOrder,
      menuItem: l.menuItem,
    })),
  });
}
