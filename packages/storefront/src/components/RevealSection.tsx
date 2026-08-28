import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * RevealSection — fade-up suave quando entra na viewport (scroll reveal).
 * Estética Goomer: transição suave, sem libs, respeita prefers-reduced-motion.
 */
export default function RevealSection({ children, className = '', id, ariaLabel, refCb }: {
  children: ReactNode;
  id?: string;
  ariaLabel?: string;
  refCb?: (el: HTMLElement | null) => void;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={(el) => {
        ref.current = el;
        refCb?.(el);
      }}
      id={id}
      aria-label={ariaLabel}
      data-category-id={undefined}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.55s cubic-bezier(0.22,1,0.36,1), transform 0.55s cubic-bezier(0.22,1,0.36,1)',
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </section>
  );
}
