import { vibrate, vibrateConfirm, vibrateError } from './haptics.js';

/**
 * uiSounds — sons de UI estilo Telegram/iOS, sintetizados via WebAudio.
 *
 * Nenhum arquivo de áudio: tudo é gerado na hora com osciladores curtos.
 * Volume baixo (gain ~0.05-0.09) — "confortável, não muito alto".
 *
 * Um único AudioContext compartilhado, criado/resumido por gesto do usuário.
 */
let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch {
    return null;
  }
}

/** Toca um "pop" curto e suave (estilo iOS/Telegram). */
function blip(freq: number, dur: number, gainPeak: number, delay = 0): void {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(freq * 0.55, 40), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Toque de clique: "pop" único, curto e baixo (estilo Telegram/iOS). */
export function playTap(): void {
  blip(620, 0.055, 0.05);
}

/** Toque de navegação/mudança de aba (um pouco mais suave). */
export function playNav(): void {
  blip(480, 0.05, 0.04);
}

/** Sucesso: dois pops ascendentes curtos (ex.: pedido aceito). */
export function playSuccess(): void {
  blip(660, 0.06, 0.06, 0);
  blip(990, 0.08, 0.06, 0.09);
}

/** Aviso: pop médio único (ex.: abrir modal de cancelar). */
export function playWarning(): void {
  blip(340, 0.09, 0.055);
}

/** Erro: dois pops descendentes. */
export function playError(): void {
  blip(300, 0.08, 0.06, 0);
  blip(220, 0.1, 0.05, 0.09);
}

/** Tipo de ação de UI → som + vibração combinados (um toque só). */
export type UiAction =
  | 'tap'
  | 'nav'
  | 'success'
  | 'warning'
  | 'error';

export function uiFeedback(action: UiAction = 'tap'): void {
  switch (action) {
    case 'nav':
      playNav();
      vibrate(12);
      break;
    case 'success':
      playSuccess();
      vibrateConfirm();
      break;
    case 'warning':
      playWarning();
      vibrate(20);
      break;
    case 'error':
      playError();
      vibrateError();
      break;
    default:
      playTap();
      vibrate(14);
  }
}
