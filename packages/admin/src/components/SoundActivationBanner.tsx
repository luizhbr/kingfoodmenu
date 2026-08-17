interface Props {
  onActivate: () => void;
  activating?: boolean;
}

/**
 * Banner de ativação do som — aparece quando o navegador exige interação
 * do usuário antes de permitir reprodução de áudio (política de autoplay).
 * Não tenta burlar a política: apenas oferece o clique que desbloqueia.
 */
export default function SoundActivationBanner({ onActivate, activating = false }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-kf-lg border border-kf-primary/30 bg-kf-primary/10 px-4 py-3"
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl" aria-hidden="true">🔔</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-kf-foreground">Alertas de pedidos</p>
          <p className="text-xs text-kf-muted mt-0.5">
            Ative o som para receber avisos de novos pedidos.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onActivate}
        disabled={activating}
        className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-kf-lg bg-kf-primary text-kf-primary-fg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
      >
        <span aria-hidden="true">🔊</span>
        {activating ? 'Ativando...' : 'Ativar som'}
      </button>
    </div>
  );
}
