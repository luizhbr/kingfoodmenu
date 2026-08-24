import { useCallback, useEffect, useRef, useState } from 'react';
import { vibrate } from './haptics.js';

/**
 * useOrderAlerts — alerta sonoro + detecção de novos pedidos (ALERT-V2).
 *
 * - Áudio via WebAudio (chime de cozinha sintetizado, ~1.2s), SEM arquivo externo.
 * - V2: REPETE o alerta a cada poll enquanto houver pedidos PENDING não aceitos.
 *   O chime toca no primeiro detect, e depois a cada 15s (poll) se o pedido
 *   ainda estiver PENDING — para até quando o pedido é aceito (CONFIRMED+).
 * - V2: vibração suave (estilo Telegram/iOS) acompanha cada alerta sonoro.
 * - Ativação explícita pelo usuário (política de autoplay do navegador):
 *   [🔊 Ativar som] — um clique desbloqueia o AudioContext.
 * - Falha de áudio NUNCA quebra o painel (try/catch em tudo).
 */
export interface OrderAlert {
  id: string;
  orderNumber: string;
  status: string;
}

/** Intervalo de repetição do alerta (ms) — som contínuo enquanto houver pendente. */
const ALERT_REPEAT_MS = 3_000;

export function useOrderAlerts() {
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const [showActivateBanner, setShowActivateBanner] = useState<boolean>(false);
  /** Volume do alerta (0–1). Persistido em localStorage. */
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('kf_alert_volume') || '1');
      return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1;
    } catch { return 1; }
  });
  const volumeRef = useRef(volume);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const seenOrdersRef = useRef<Set<string>>(new Set());
  const lastAlertRef = useRef<string>('');
  /** Pedidos PENDING que ainda não foram aceitos — disparam alerta repetido. */
  const pendingAlertsRef = useRef<Set<string>>(new Set());

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
   * Também atualiza o conjunto de pendentes para repetição do alerta.
   */
  const detectNewOrders = useCallback((orders: OrderAlert[]): OrderAlert[] => {
    const fresh: OrderAlert[] = [];
    const stillPending = new Set<string>();

    for (const order of orders) {
      if (order.status === 'PENDING') {
        stillPending.add(order.id);
        if (!seenOrdersRef.current.has(order.id)) {
          seenOrdersRef.current.add(order.id);
          fresh.push(order);
        }
      }
    }

    // Atualiza o conjunto de pendentes: remove os que saíram de PENDING
    // (foram aceitos/cancelados) e adiciona os novos
    pendingAlertsRef.current = stillPending;

    if (fresh.length > 0) persistSeen();
    return fresh;
  }, [persistSeen]);

  /** Chime de cozinha curto e profissional ("ding-ding"), ~1.2s. */
  const playChime = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state !== 'running') {
      // Tenta retomar; se for gesto do usuário o resume resolve e toca.
      void ctx.resume().then(() => {
        if (audioCtxRef.current === ctx) playChime();
      }).catch(() => {});
      return;
    }
    const now = ctx.currentTime;
    const notes = [880, 1174.66]; // A5 → D6 (ding-ding clássico)
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.18);
      const vol = volumeRef.current;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.28 * vol, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.55);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.6);
    });
    // Vibração suave junto com o chime
    vibrate([25, 40, 25]);
  }, []);

  /**
   * Dispara alerta sonoro + tátil.
   * V2: toca para pedidos NOVOS (primeira vez) E REPETE enquanto houver
   * pedidos PENDING ainda não aceitos (a cada poll de 15s).
   */
  const alertNewOrders = useCallback(
    (orders: OrderAlert[]) => {
      const fresh = detectNewOrders(orders);
      const hasPending = pendingAlertsRef.current.size > 0;

      // Sempre toca se há pedidos novos OU se há pendentes não atendidos (repetição)
      if (fresh.length === 0 && !hasPending) return;

      // Evita rajada se o mesmo conjunto aparecer em dois fetches quase simultâneos
      const key = [...pendingAlertsRef.current].sort().join('|');
      if (fresh.length === 0 && key === lastAlertRef.current) return;
      lastAlertRef.current = key;

      if (soundEnabled) playChime();
    },
    [detectNewOrders, playChime, soundEnabled]
  );

  /** Ativa o áudio (chamado pelo clique no botão). Retorna true se o áudio ficou PRONTO (running). */
  const enableSound = useCallback((): boolean => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return false;
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      // Só considera ativo se o contexto está REALMENTE rodando — sem gesto do
      // usuário o navegador mantém suspenso (autoplay policy) e nada tocaria.
      if (ctx.state !== 'running') {
        setShowActivateBanner(true);
        return false;
      }
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
      // Também popula o conjunto de pendentes na primeira carga — mas NÃO toca
      // (o primeiro alerta só dispara quando detecta um pedido NOVO em poll seguinte)
      const pending = new Set<string>();
      for (const order of orders) {
        if (order.status === 'PENDING') pending.add(order.id);
      }
      pendingAlertsRef.current = pending;
    },
    [persistSeen]
  );

  /** Pede ativação do som (chamado ao entrar no painel de pedidos). */
  const requestSoundActivation = useCallback(() => {
    const activated = sessionStorage.getItem('kf_sound_activated') === '1';
    // Storage NÃO é prova de áudio ativo: o AudioContext morre ao reload da aba,
    // então "ativado" salvo não garante áudio. Só confia se houver contexto REAL rodando.
    const ctx = audioCtxRef.current;
    const hasLiveCtx = !!ctx && ctx.state === 'running';
    if (soundEnabled || (activated && hasLiveCtx)) {
      setShowActivateBanner(false);
      return;
    }
    // Estado antigo preso (storage '1' sem contexto): limpa para o banner voltar.
    if (activated && !hasLiveCtx) {
      try { sessionStorage.removeItem('kf_sound_activated'); } catch { /* ignore */ }
    }
    // Tenta (re)criar; se o navegador permitir autoplay, ativa direto.
    const ok = enableSound();
    if (ok) {
      try { sessionStorage.setItem('kf_sound_activated', '1'); } catch { /* ignore */ }
    } else {
      setShowActivateBanner(true);
    }
  }, [enableSound, soundEnabled]);

  /** Ajusta o volume do alerta (0–1) e persiste. */
  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    volumeRef.current = clamped;
    setVolumeState(clamped);
    try { localStorage.setItem('kf_alert_volume', String(clamped)); } catch { /* ignore */ }
  }, []);

  return {
    soundEnabled,
    showActivateBanner,
    volume,
    setVolume,
    detectNewOrders,
    alertNewOrders,
    enableSound,
    markAllAsSeen,
    requestSoundActivation,
  };
}
