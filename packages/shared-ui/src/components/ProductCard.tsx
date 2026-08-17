import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn.js';
import { Price } from './Price.js';
import { Button } from './Button.js';

export interface ProductCardProps {
  'data-testid'?: string;
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  badge?: string;
  onAdd: () => void;
  onClick?: () => void;
  /**
   * Parallax sutil na imagem durante o scroll (UX polish).
   * Move APENAS a camada visual da imagem (translate3d), o card fica estável.
   * Desativado com prefers-reduced-motion e em telas < 480px (performance).
   */
  parallax?: boolean;
}

const PARALLAX_MAX = 10; // px máximos de deslocamento (sutil)

function useParallax(enabled: boolean | undefined, ref: React.RefObject<HTMLImageElement | null>) {
  useEffect(() => {
    const img = ref.current;
    if (!enabled || !img) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 480) return; // mobile: ainda mais discreto = desligado

    let raf = 0;
    let current = 0;
    let target = 0;

    const apply = () => {
      // Interpolação leve evita "escorregar" (jitter)
      current += (target - current) * 0.12;
      if (Math.abs(target - current) < 0.05) current = target;
      img.style.transform = `translate3d(0, ${current.toFixed(2)}px, 0) scale(1.12)`;
      if (Math.abs(target - current) > 0.05) {
        raf = requestAnimationFrame(apply);
      }
    };

    const update = () => {
      const rect = img.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // -1 (imagem acima da viewport) .. 1 (imagem abaixo)
      const progress = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      target = Math.max(-PARALLAX_MAX, Math.min(PARALLAX_MAX, progress * PARALLAX_MAX * -1));
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            update();
            window.addEventListener('scroll', update, { passive: true });
            window.addEventListener('resize', update, { passive: true });
          } else {
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
          }
        }
      },
      { rootMargin: '120px 0px' }
    );
    io.observe(img);

    return () => {
      io.disconnect();
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      if (raf) cancelAnimationFrame(raf);
      img.style.transform = '';
    };
  }, [enabled, ref]);
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id, name, description, price, image, badge, onAdd, onClick, parallax, 'data-testid': dataTestId
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  useParallax(parallax, imgRef);

  return (
    <div
      data-testid={dataTestId || 'product-card'}
      onClick={onClick}
      className={cn(
        'group flex flex-col rounded-kf-lg bg-kf-surface border border-kf-border shadow-kf-subtle overflow-hidden',
        onClick && 'cursor-pointer active:scale-[0.99] transition-transform'
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-kf-surface-muted">
        {image ? (
          <img
            ref={imgRef}
            src={image}
            alt={name}
            loading="lazy"
            className={cn(
              'h-full w-full object-cover transition-transform duration-kf-normal',
              !parallax && 'group-hover:scale-105'
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl">🍔</div>
        )}
        {badge && (
          <span className="absolute left-2 top-2 rounded-kf-pill bg-kf-primary px-2 py-0.5 text-[10px] font-bold text-kf-primary-fg">
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold text-kf-foreground line-clamp-1">{name}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-kf-muted line-clamp-2">{description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <Price value={price} size="md" />
          <Button size="md" data-testid="quick-add" onClick={(e) => { e.stopPropagation(); onAdd(); }} aria-label={`Adicionar ${name}`}>
            +
          </Button>
        </div>
      </div>
    </div>
  );
};
