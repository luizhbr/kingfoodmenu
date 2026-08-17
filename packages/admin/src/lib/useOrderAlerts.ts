import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useOrderAlerts — alerta sonoro + detecção de novos pedidos (ALERT-V1).
 *
 * - Áudio via WebAudio (chime de cozinha sintetizado, ~1.2s), SEM arquivo externo.
 * - Deduplicação por orderId: pedidos já vistos (nesta sessão via sessionStorage)
 *   NUNCA tocam de novo — nem após reload, nem em polling repetido.
 * - Ativação explícita pelo usuário (política de autoplay do navegador):
 *   [🔊 Ativar som] — um clique desbloqueia o AudioContext.
 * - Falha de áudio NUNCA quebra o painel (try/catch em tudo).
 */
export interface OrderAlert {
  id: string;
  orderNumber: string;
  status: string;
}

export function useOrderAlerts() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showActivateBanner, setShowActivateBanner] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenOrdersRef = useRef<Set<string>>(new Set());
  const lastAlertRef = useRef<string>('');

  // Carrega pedidos já vistos nesta sessão (sobrevive a reload, não vaza entre abas/sessões)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('kf_seen_orders');
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) seenOrdersRef.current = new Set(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  const persistSeen = useCallback(() => {
    try {
      sessionStorage.setItem('kf_seen_orders', JSON.stringify([...seenOrdersRef.current].slice(-200)));
    } catch { /* ignore */ }
  }, []);

  /**
   * Detecta pedidos NOVOS em uma lista recém-buscada.
   * Um pedido é "novo" se: status PENDING (recém-chegado) e nunca visto.
   */
  const detectNewOrders = useCallback((orders: OrderAlert[]): OrderAlert[] => {
    const fresh: OrderAlert[] = [];
    for (const order of orders) {
      if (order.status !== 'PENDING') continue;
      if (seenOrdersRef.current.has(order.id)) continue;
      seenOrdersRef.current.add(order.id);
      fresh.push(order);
    }
    if (fresh.length > 0) persistSeen();
    return fresh;
  }, [persistSeen]);

  /** Chime de cozinha curto e profissional ("ding-ding"), ~1.2s. */
  const playChime = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== 'running') {
      ctx.resume().catch(() => {});
      return;
    }
    const now = ctx.currentTime;
    const notes = [880, 1174.66]; // A5 → D6 (ding-ding clássico)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.28, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.6);
    });
  }, []);

  /** Dispara alerta sonoro UMA vez por pedido novo (deduplicado). */
  const alertNewOrders = useCallback(
    (orders: OrderAlert[]) => {
      const fresh = detectNewOrders(orders);
      if (fresh.length === 0) return;
      // Evita rajada se o mesmo novo pedido aparecer em dois fetches quase simultâneos
      const key = fresh.map((o) => o.id).join('|');
      if (key === lastAlertRef.current) return;
      lastAlertRef.current = key;
      if (soundEnabled) playChime();
    },
    [detectNewOrders, playChime, soundEnabled]
  );

  /** Ativa o som (chamado pelo clique no botão). Retorna true se o áudio ficou pronto. */
  const enableSound = useCallback((): boolean => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return false;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      setSoundEnabled(true);
      setShowActivateBanner(false);
      // chime de confirmação extremamente curto
      setTimeout(playChime, 150);
      return true;
    } catch {
      setShowActivateBanner(true);
      return false;
    }
  }, [playChime]);

  /** Registra pedidos atuais como vistos (evita alerta de pedidos antigos na primeira carga). */
  const markAllAsSeen = useCallback(
    (orders: OrderAlert[]) => {
      let changed = false;
      for (const order of orders) {
        if (!seenOrdersRef.current.has(order.id)) {
          seenOrdersRef.current.add(order.id);
          changed = true;
        }
      }
      if (changed) persistSeen();
    },
    [persistSeen]
  );

  /** Pede ativação do som (chamado ao entrar no painel de pedidos). */
  const requestSoundActivation = useCallback(() => {
    const activated = sessionStorage.getItem('kf_sound_activated') === '1';
    if (soundEnabled || activated) {
      setShowActivateBanner(false);
      return;
    }
    // Tenta inicializar; se o navegador permitir autoplay, ativa direto.
    const ok = enableSound();
    if (ok) {
      try { sessionStorage.setItem('kf_sound_activated', '1'); } catch { /* ignore */ }
    } else {
      setShowActivateBanner(true);
    }
  }, [enableSound, soundEnabled]);

  return {
    soundEnabled,
    showActivateBanner,
    detectNewOrders,
    alertNewOrders,
    enableSound,
    markAllAsSeen,
    requestSoundActivation,
  };
}
