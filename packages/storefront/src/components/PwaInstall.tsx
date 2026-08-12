import { useEffect, useState, useCallback } from 'react';

const DISMISS_KEY = 'kf_install_dismissed';

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

export default function PwaInstall() {
  const [visible, setVisible] = useState(false);
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY) === '1') return;

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

    const t = window.setTimeout(() => {
      if (!isStandalone() && sessionStorage.getItem(DISMISS_KEY) !== '1') {
        setVisible(true);
      }
    }, 12000);

    return () => {
      window.removeEventListener('kf-beforeinstallprompt', onKf);
      window.removeEventListener('beforeinstallprompt', onBip);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, '1');
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

  if (!visible || isStandalone()) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[90] px-4 pointer-events-none md:bottom-4"
      style={{
        bottom: 'calc(4.5rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="pointer-events-auto mx-auto max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl p-3 flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-[#FFD100] flex items-center justify-center text-xs font-black text-black">
          KF
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900">Instale o King Food</p>
          <p className="text-xs text-gray-500">Peça mais rápido da tela inicial</p>
        </div>
        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-xl bg-[#FFD100] px-3 py-2 text-xs font-bold text-black"
        >
          Instalar
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 w-8 h-8 rounded-full text-gray-400 hover:text-gray-600"
          aria-label="Fechar"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
