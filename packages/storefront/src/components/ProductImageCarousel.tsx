import { useCallback, useEffect, useRef, useState } from 'react';

interface GalleryImage {
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

interface Props {
  images: string[];
  alt: string;
  autoPlayMs?: number;
  className?: string;
  imgClassName?: string;
}

/**
 * Carrossel horizontal de fotos do produto (UX-V5).
 * - Aparece apenas quando há MAIS DE UMA imagem.
 * - Swipe no mobile, setas discretas no hover desktop, indicadores.
 * - Autoplay 4–5s pausado ao interagir.
 * - Altura fixa (aspect-[4/3]) — nunca muda com a imagem.
 */
export default function ProductImageCarousel({ images, alt, autoPlayMs = 4500, className = '', imgClassName = '' }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  const count = images.length;
  const multi = count > 1;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  // Autoplay discreto
  useEffect(() => {
    if (!multi || paused) return;
    const t = window.setInterval(next, autoPlayMs);
    return () => window.clearInterval(t);
  }, [multi, paused, next, autoPlayMs]);

  // Touch: swipe horizontal sem bloquear scroll vertical
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next();
      else prev();
    }
    touchX.current = null;
    // Retomar autoplay após interação
    window.setTimeout(() => setPaused(false), 6000);
  };

  if (count === 0) return null;

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide com fade+slide suave */}
      <div className="w-full aspect-[4/3] overflow-hidden">
        <img
          key={images[index]}
          src={images[index]}
          alt={`${alt}${multi ? ` — foto ${index + 1} de ${count}` : ''}`}
          loading={index === 0 ? 'eager' : 'lazy'}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imgClassName}`}
        />
      </div>

      {/* Setas discretas (desktop hover) */}
      {multi && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur text-gray-800 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            aria-label="Foto anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur text-gray-800 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            aria-label="Próxima foto"
          >
            ›
          </button>

          {/* Indicadores discretos */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setIndex(i); setPaused(true); window.setTimeout(() => setPaused(false), 6000); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'bg-white w-3' : 'bg-white/50'}`}
                aria-label={`Ir para foto ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
