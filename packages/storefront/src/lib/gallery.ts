export interface GalleryImage {
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

/**
 * Resolve a lista de fotos de um produto (UX-V5).
 * Produtos antigos (images=null) retornam [image] — comportamento preservado.
 */
export function resolveGallery(image: string | null, images: unknown): string[] {
  if (Array.isArray(images) && images.length > 0) {
    const list = images
      .filter((g): g is GalleryImage => !!g && typeof g === 'object' && typeof (g as GalleryImage).url === 'string')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((g) => g.url);
    if (list.length > 0) return list;
  }
  if (image) return [image];
  return [];
}
