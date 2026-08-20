/**
 * haptics — resposta tátil (vibração) para botões do painel.
 *
 * Usa navigator.vibrate (Android/Chrome). No iOS/desktop sem suporte,
 * falha silenciosamente — a UI nunca quebra por causa de vibração.
 *
 * Intensidade: padrão curto e sutil (20ms), como toque iOS/Telegram.
 */
export function vibrate(pattern: number | number[] = 18): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* vibração é opcional — ignora falha */
  }
}

/** Toque de confirmação um pouco mais perceptível (ex.: pedido aceito). */
export function vibrateConfirm(): void {
  vibrate([20, 30, 20]);
}

/** Toque de erro/aviso. */
export function vibrateError(): void {
  vibrate([35, 25, 35]);
}
