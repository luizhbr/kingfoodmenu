import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Só mostra UMA vez por navegador (primeira visita ao site)
const SEEN_KEY = 'kf_install_modal_seen';
// Cupom real existente no banco (coupons: WELCOME10, 10% off, min $20, max $15)
const INSTALL_COUPON = 'WELCOME10';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    __kfDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}

const BLACKLIST_PATHS = ['/checkout', '/order'];

export default function PwaInstall() {
  const location = useLocation();
  const isCheckoutFlow = BLACKLIST_PATHS.some((p) => location.pathname.startsWith(p));
  const [visible, setVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isCheckoutFlow) return;
    if (isStandalone()) return;
    // Já viu o modal nesta visita permanente (localStorage) → não mostra de novo
    if (localStorage.getItem(SEEN_KEY) === '1') return;

    const adopt = (evt: BeforeInstallPromptEvent | null | undefined) => {
      if (!evt) return;
      setPromptEvent(evt);
      setVisible(true);
    };

    adopt(window.__kfDeferredPrompt ?? null);

    const onKf = () => adopt(window.__kfDeferredPrompt ?? null);
    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BeforeInstallPromptEvent;
      window.__kfDeferredPrompt = ev;
      adopt(ev);
    };

    window.addEventListener('kf-beforeinstallprompt', onKf);
    window.addEventListener('beforeinstallprompt', onBip);

    // Aparece logo no primeiro acesso (3s) — decisão rápida de instalar ou não
    const t = window.setTimeout(() => {
      if (!isStandalone() && localStorage.getItem(SEEN_KEY) !== '1') {
        setVisible(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener('kf-beforeinstallprompt', onKf);
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(SEEN_KEY, '1');
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    const evt = promptEvent || window.__kfDeferredPrompt;
    if (!evt) {
      alert(
        'No iPhone: toque em Compartilhar → Adicionar à Tela de Início.\nNo Android: menu ⋮ → Instalar app.'
      );
      return;
    }
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') {
        window.__kfDeferredPrompt = null;
        setPromptEvent(null);
        setVisible(false);
      }
    } catch {
      /* ignore */
    }
  }, [promptEvent]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (isCheckoutFlow || !visible || isStandalone()) return null;

  return (
    <div className="fixed inset-0 z-kf-drawer flex items-center justify-center px-6">
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/50" onClick={dismiss} />
      {/* Modal central — não cobre o botão do carrinho */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 w-8 h-8 rounded-full text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          ✕
        </button>
        <img src="/logo-kingfood.png.png" alt="King Food" className="mx-auto w-16 h-16 object-contain rounded-xl mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Instale o King Food</h2>
        <p className="text-sm text-gray-600 mt-1">
          Peça mais rápido direto da tela inicial do seu celular.
        </p>
        <div className="mt-4 rounded-xl bg-[#FFF8DC] border border-[#FFD100] p-3">
          <p className="text-xs font-semibold text-gray-700">🎁 Bônus de instalação</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">
            Use o cupom <span className="text-[#B8860B]">{INSTALL_COUPON}</span> e ganhe <span className="text-[#B8860B]">10% OFF</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">em pedidos acima de $20</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="mt-5 w-full rounded-xl bg-[#FFD100] py-3 text-sm font-bold text-black active:scale-[0.98]"
        >
          Instalar agora
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-gray-500 hover:text-gray-700"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
