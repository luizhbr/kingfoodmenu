export type TemplateId =
  | 'classic'
  | 'elegant'
  | 'bold'
  | 'minimal'
  | 'cozy'
  | 'modern'
  | 'rustic'
  | 'vibrant'
  | 'sleek'
  | 'retro'
  | 'tropical'
  | 'artdeco'
  | 'streetfood'
  | 'japandi';

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  description: string;
}

export const templates: TemplateMeta[] = [
  { id: 'classic', name: 'Classic', description: 'Clean gradient hero, 3-column features, simple CTA' },
  { id: 'elegant', name: 'Elegant', description: 'Centered header, full-image hero with overlay, icon-card features' },
  { id: 'bold', name: 'Bold', description: 'Large bold typography, split hero, horizontal feature strip' },
  { id: 'minimal', name: 'Minimal', description: 'Ultra-clean, text-only hero, simple list features' },
  { id: 'cozy', name: 'Cozy', description: 'Rounded warm feel, card-based hero, rounded feature cards' },
  { id: 'modern', name: 'Modern', description: 'Glass header, asymmetric hero, grid features, geometric CTA' },
  { id: 'rustic', name: 'Rustic', description: 'Earthy warm header, textured hero, earthy feature cards' },
  { id: 'vibrant', name: 'Vibrant', description: 'Gradient header, animated gradient hero, colorful feature cards' },
  { id: 'sleek', name: 'Sleek', description: 'Dark header, dark hero with glow effects, dark feature cards' },
  { id: 'retro', name: 'Retro', description: 'Vintage-style header, retro hero with badges, nostalgic CTA' },
  { id: 'tropical', name: 'Tropical', description: 'Palm green + coral, sunburst hero, rounded sunny CTA' },
  { id: 'artdeco', name: 'Art Deco', description: 'Gold-on-black geometric luxury, sunburst hero, classic serif' },
  { id: 'streetfood', name: 'Street Food', description: 'Neon red + graphite, skewed sticker CTAs, urban energy' },
  { id: 'japandi', name: 'Japandi', description: 'Wabi-sabi minimalism, enso circle, calm natural palette' },
];

export function getTemplate(id: string): TemplateMeta {
  return templates.find((t) => t.id === id) || templates[0];
}
