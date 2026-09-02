import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  StorefrontIcon, GridIcon, ClipboardIcon, FlameIcon,
  ChartBarIcon, BookOpenIcon, TicketIcon, GiftIcon, BoltIcon,
  CogIcon, PaintBrushIcon, ScaleIcon, CodeBracketIcon, UsersIcon,
  MapPinIcon, CalendarIcon, StarIcon, PrinterIcon, ShieldCheckIcon,
  CreditCardIcon, EnvelopeIcon, FlaskIcon, ChevronRightIcon,
} from './AdminIcons.js';

interface SearchEntry {
  path: string;
  label: string;
  keywords: string[];
  icon: React.ReactNode;
  roles: string[];
}

/**
 * Busca global de funcionalidades — apenas navegação para rotas existentes.
 * Nenhuma regra de negócio nova.
 */
const ENTRIES: SearchEntry[] = [
  { path: '/', label: 'Painel', keywords: ['dashboard', 'início', 'home'], icon: <StorefrontIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/loja', label: 'Loja', keywords: ['hub loja'], icon: <StorefrontIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/manage', label: 'Gestão', keywords: ['hub gestão'], icon: <GridIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/vender', label: 'Vendas', keywords: ['vendas', 'caixa'], icon: <ClipboardIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/pedidos', label: 'Pedidos', keywords: ['hub pedidos'], icon: <ClipboardIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/orders', label: 'Lista de pedidos', keywords: ['pedidos', 'orders', 'venda'], icon: <ClipboardIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/kitchen', label: 'Cozinha', keywords: ['cozinha', 'monitor', 'preparo', 'kitchen'], icon: <FlameIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/locations', label: 'Locais', keywords: ['local', 'endereço', 'loja'], icon: <MapPinIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/menu', label: 'Cardápio', keywords: ['cardápio', 'menu', 'itens', 'produto', 'preço'], icon: <BookOpenIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/menu/categories', label: 'Categorias', keywords: ['categoria', 'grupo'], icon: <BookOpenIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/builder', label: 'Construtor Visual', keywords: ['builder', 'tema', 'cores', 'visual', 'personalização'], icon: <PaintBrushIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/landing', label: 'Página inicial', keywords: ['landing', 'hero', 'página inicial', 'personalização'], icon: <PaintBrushIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/branding', label: 'Marca', keywords: ['marca', 'logo', 'favicon', 'personalização'], icon: <PaintBrushIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/theme', label: 'Tema', keywords: ['tema', 'dark', 'claro', 'personalização'], icon: <PaintBrushIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/templates', label: 'Modelos', keywords: ['modelo', 'template', 'personalização'], icon: <PaintBrushIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/gallery', label: 'Galeria', keywords: ['galeria', 'imagem', 'foto'], icon: <StarIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/design/media', label: 'Biblioteca de mídia', keywords: ['mídia', 'media', 'upload', 'arquivo'], icon: <StarIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/reports', label: 'Relatórios', keywords: ['relatório', 'vendas', 'desempenho', 'receita', 'report'], icon: <ChartBarIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/reviews', label: 'Avaliações', keywords: ['avaliação', 'review', 'feedback', 'estrela'], icon: <StarIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER', 'STAFF'] },
  { path: '/coupons', label: 'Cupons', keywords: ['cupom', 'desconto', 'promoção', 'coupon'], icon: <TicketIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/loyalty', label: 'Fidelidade', keywords: ['fidelidade', 'pontos', 'recompensa', 'clube', 'loyalty'], icon: <GiftIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/automation', label: 'Automação', keywords: ['automação', 'regra', 'fluxo', 'automation'], icon: <BoltIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/settings/printers', label: 'Impressoras', keywords: ['impressora', 'impressão', 'térmica', 'printer'], icon: <PrinterIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/settings/print', label: 'Modelos de impressão', keywords: ['modelo de impressão', 'impressora', 'impressão', 'comanda', 'recibo', 'print'], icon: <ScaleIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/settings/payment', label: 'Pagamentos online', keywords: ['pagamento', 'stripe', 'gateway', 'payment'], icon: <CreditCardIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'] },
  { path: '/settings/mail', label: 'E-mail (SMTP)', keywords: ['email', 'smtp', 'notificação', 'mail'], icon: <EnvelopeIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'] },
  { path: '/settings/general', label: 'Perfil da loja', keywords: ['perfil', 'loja', 'fuso', 'nome', 'contato'], icon: <StorefrontIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/settings/order', label: 'Configurações de pedidos', keywords: ['pedido', 'entrega', 'retirada', 'imposto', 'taxa'], icon: <CogIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/settings/review', label: 'Configurações de avaliações', keywords: ['avaliação', 'review', 'config'], icon: <CogIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/settings/advanced', label: 'Avançado', keywords: ['avançado', 'manutenção', 'manutenance', 'segurança'], icon: <FlaskIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'] },
  { path: '/staff', label: 'Funcionários', keywords: ['funcionário', 'staff', 'usuário', 'permissão', 'equipe'], icon: <UsersIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'] },
  { path: '/developer/metrics', label: 'Métricas da API', keywords: ['métrica', 'api', 'desenvolvedor', 'performance'], icon: <CodeBracketIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/developer/audit-log', label: 'Registro de auditoria', keywords: ['auditoria', 'log', 'audit', 'segurança'], icon: <FlaskIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN'] },
  { path: '/legal/pages', label: 'Páginas legais', keywords: ['legal', 'jurídico', 'termos', 'privacy', 'política'], icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/legal/cookies', label: 'Categorias de cookies', keywords: ['cookie', 'consentimento'], icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
  { path: '/legal/consent', label: 'Registro de consentimento', keywords: ['consentimento', 'consent', 'gdpr'], icon: <ShieldCheckIcon className="w-5 h-5" />, roles: ['SUPER_ADMIN', 'MANAGER'] },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const role = user?.role || '';

  // fechar com Escape / clique fora
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = q
    ? ENTRIES.filter((e) => {
        if (!e.roles.includes(role) && role !== 'SUPER_ADMIN') return false;
        return (
          e.label.toLowerCase().includes(q) ||
          e.keywords.some((k) => k.includes(q))
        );
      }).slice(0, 8)
    : [];

  return (
    <div className="relative" ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 min-h-[44px] px-3 rounded-xl border border-kf-border bg-kf-surface text-kf-muted hover:border-kf-primary/40 hover:text-kf-foreground transition-colors text-sm"
        aria-label="Buscar funcionalidades"
        aria-expanded={open}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden md:inline text-xs font-medium">Buscar…</span>
        <kbd className="hidden lg:inline text-[10px] text-kf-muted/60 border border-kf-border rounded px-1 py-0.5">Ctrl K</kbd>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[320px] sm:w-[400px] rounded-kf-lg border border-kf-border bg-kf-surface shadow-kf-modal overflow-hidden z-50 kf-anim-scale-in">
          <div className="flex items-center gap-2 px-3 border-b border-kf-border">
            <svg className="w-4 h-4 text-kf-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="O que você precisa? (ex.: impressora, cupom)"
              className="flex-1 py-3 text-sm bg-transparent focus:outline-none placeholder:text-kf-muted/60"
              aria-label="Buscar funcionalidades"
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-kf-muted hover:bg-kf-surface-muted transition-colors"
              aria-label="Fechar busca"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto py-1">
            {q === '' ? (
              <p className="px-4 py-6 text-center text-xs text-kf-muted">
                Digite para buscar uma funcionalidade
              </p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-kf-muted">
                Nenhuma funcionalidade encontrada para "{query}"
              </p>
            ) : (
              results.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setQuery('');
                    navigate(r.path);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-kf-foreground/80 hover:bg-kf-surface-muted active:bg-kf-surface-muted transition-colors"
                >
                  <span className="text-kf-ink/60" aria-hidden>{r.icon}</span>
                  {r.label}
                  <ChevronRightIcon className="ml-auto w-4 h-4 text-kf-muted/40" aria-hidden />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
