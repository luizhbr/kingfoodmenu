import { useEffect } from 'react';
import { uiFeedback, getAudioCtx } from './uiSounds.js';

/**
 * useHapticFeedback — adiciona resposta tátil (vibração) + sonora (pop)
 * a TODOS os botões e links clicáveis do painel, automaticamente.
 *
 * Estilo Telegram/iOS: toque sutil e confortável, volume baixo.
 * O AudioContext é desbloqueado no primeiro clique do usuário (autoplay policy).
 *
 * Uso: chamar uma vez no AdminLayout.
 */
export function useHapticFeedback(): void {
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target) return;

      // Encontra o elemento clicável mais próximo (button, a, [role=button])
      const clickable = target.closest<HTMLElement>(
        'button, a, [role="button"], [data-haptic]'
      );
      if (!clickable) return;

      // Ignora botões disabled
      if (clickable.hasAttribute('disabled') || clickable.getAttribute('aria-disabled') === 'true') {
        return;
      }

      // Garante que o AudioContext está desbloqueado no primeiro gesto
      getAudioCtx();

      // Som + vibração padrão (tap)
      uiFeedback('tap');
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);
}
