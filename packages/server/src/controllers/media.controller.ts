import { Request, Response } from 'express';
import prisma from '../lib/db.js';

/**
 * Upload media — stores image as base64 data URL in the database.
 * Required for Vercel serverless (filesystem is read-only).
 */
export async function uploadMedia(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file provided' });
    return;
  }

  const userId = (req as any).user?.id ?? null;
  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

  const asset = await prisma.mediaAsset.create({
    data: {
      filename: req.file.originalname,
      originalName: req.file.originalname,
      url: dataUrl,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedById: userId,
    },
  });

  res.status(201).json({ success: true, data: asset });
}

export async function listMedia(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.mediaAsset.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { uploadedBy: { select: { id: true, name: true } } },
    }),
    prisma.mediaAsset.count(),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function deleteMedia(req: Request<{ id: string }>, res: Response): Promise<void> {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
  if (!asset) {
    res.status(404).json({ success: false, error: 'Media not found' });
    return;
  }

  await prisma.mediaAsset.delete({ where: { id: req.params.id } });
  res.json({ success: true, message: 'Media deleted' });
}
