import { useEffect, useRef } from 'react';

/**
 * useScrollReveal — observa elementos com [data-reveal] e adiciona
 * .kf-reveal-visible quando entram na viewport (fade-up suave).
 * Respeita prefers-reduced-motion. Sem dependências externas.
 */
export function useScrollReveal(deps: unknown[] = []) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
    if (els.length === 0) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('kf-reveal-visible'));
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('kf-reveal-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );

    els.forEach((el) => {
      if (!el.classList.contains('kf-reveal-visible')) obs.observe(el);
    });

    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
