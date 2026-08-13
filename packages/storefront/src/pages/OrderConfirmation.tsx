import { useEffect, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { Badge, Button, Card, Price } from '@kitchenasty/shared-ui';

const API_BASE = import.meta.env.VITE_API_URL || '';

type OrderOption = {
  name: string;
  value: string;
  priceModifier: number;
};

type OrderItem = {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  options: OrderOption[];
  comment?: string | null;
};

type Order = {
  id: string;
  orderNumber?: string;
  orderType?: string;
  status?: string;
  subtotal?: number;
  total?: number;
  deliveryFee?: number;
  deliveryLine1?: string | null;
  deliveryLine2?: string | null;
  deliveryCity?: string | null;
  deliveryState?: string | null;
  deliveryPostalCode?: string | null;
  items?: OrderItem[];
  guestName?: string | null;
  guestPhone?: string | null;
  comment?: string | null;
  createdAt?: string;
};

function formatCurrency(v: number | undefined) {
  if (v === undefined || v === null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

export default function OrderConfirmation() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const [search] = useSearchParams();
  const { clear } = useCart();
  const { user } = useAuth();

  const paid = search.get('paid') === 'true';
  const initial = (location.state?.order as Order | undefined) ?? null;
  const [order, setOrder] = useState<Order | null>(initial);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (paid) clear();
  }, [paid, clear]);

  useEffect(() => {
    if (!id) return;
    if (order && order.status === 'CONFIRMED') return;
    if (polls > 12) return;

    let cancelled = false;
    const t = setTimeout(
      async () => {
        try {
          const res = await fetch(`${API_BASE}/api/orders/${id}`);
          if (!res.ok) return;
          const data = await res.json();
          if (!cancelled && data?.data) setOrder(data.data as Order);
          setPolls((n) => n + 1);
        } catch {
          /* noop */
        }
      },
      polls === 0 ? 0 : 1500,
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [id, order, polls]);

  const confirmed = order?.status === 'CONFIRMED';
  const isDelivery = (order?.orderType ?? '').toUpperCase() === 'DELIVERY';
  const orderNumber = order?.orderNumber || id;

  return (
    <div className="min-h-screen bg-kf-bg px-4 py-8 pb-[calc(var(--kf-nav-h)+2rem)]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-kf-success/20 text-3xl">
            🎉
          </div>
          <h1 className="text-2xl font-extrabold text-kf-foreground">
            {t('orderConfirmation.title', 'Pedido Realizado!')}
          </h1>
          <p className="mt-1 text-kf-muted">{t('orderConfirmation.thankYou', 'Obrigado pelo seu pedido.')}</p>
        </div>

        {paid && !confirmed && (
          <Card className="mb-4 p-4 text-center text-sm text-kf-muted">
            {t('orderConfirmation.finalizingPayment', 'Finalizando pagamento...')}
          </Card>
        )}

        <Card className="mb-4 p-5">
          <div className="mb-4 flex items-center justify-between border-b border-kf-border pb-3">
            <div>
              <p className="text-xs text-kf-muted uppercase tracking-wide">{t('orderConfirmation.orderNumber', 'Número do Pedido')}</p>
              <p className="text-lg font-bold text-kf-foreground">#{orderNumber}</p>
            </div>
            <Badge variant={confirmed ? 'success' : 'warning'}>
              {confirmed ? t('orderStatus.confirmed', 'Confirmado') : t('orderStatus.pending', 'Pendente')}
            </Badge>
          </div>

          {order?.items && order.items.length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-bold text-kf-foreground">{t('orderConfirmation.items', 'Itens')}</h2>
              <ul className="space-y-3">
                {order.items.map((item) => {
                  const optsTotal = item.options.reduce((s, o) => s + (o.priceModifier || 0), 0);
                  return (
                    <li key={item.id || item.name} className="flex justify-between text-sm">
                      <div className="flex-1 pr-2">
                        <span className="text-kf-muted mr-1">{item.quantity}x</span>
                        <span className="text-kf-foreground">{item.name}</span>
                        {item.options.length > 0 && (
                          <p className="ml-5 text-xs text-kf-muted">{item.options.map((o) => o.value).join(', ')}</p>
                        )}
                        {item.comment && <p className="ml-5 text-xs text-kf-muted italic">“{item.comment}”</p>}
                      </div>
                      <Price value={(item.price + optsTotal) * item.quantity} size="sm" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="space-y-2 border-t border-kf-border pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-kf-muted">{t('checkout.subtotal', 'Subtotal')}</span>
              <Price value={order?.subtotal ?? 0} size="sm" />
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span className="text-kf-muted">{t('checkout.deliveryFee', 'Taxa de entrega')}</span>
                <Price value={order?.deliveryFee ?? 0} size="sm" />
              </div>
            )}
            <div className="flex justify-between border-t border-kf-border pt-2 text-base font-bold">
              <span className="text-kf-foreground">{t('checkout.total', 'Total')}</span>
              <Price value={order?.total ?? 0} size="lg" />
            </div>
          </div>
        </Card>

        {isDelivery && order?.deliveryLine1 && (
          <Card className="mb-4 p-5">
            <h2 className="mb-2 text-sm font-bold text-kf-foreground">{t('orderConfirmation.address', 'Endereço')}</h2>
            <p className="text-sm text-kf-foreground">{order.deliveryLine1}</p>
            {order.deliveryLine2 && <p className="text-sm text-kf-muted">{order.deliveryLine2}</p>}
            <p className="text-sm text-kf-muted">
              {order.deliveryCity}, {order.deliveryState} {order.deliveryPostalCode}
            </p>
          </Card>
        )}

        {!isDelivery && (
          <Card className="mb-4 p-5">
            <h2 className="mb-1 text-sm font-bold text-kf-foreground">{t('orderConfirmation.pickup', 'Retirada')}</h2>
            <p className="text-sm text-kf-muted">{t('orderConfirmation.pickupMessage', 'Pegue seu pedido no King Food quando estiver pronto.')}</p>
          </Card>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/menu" className="flex-1 inline-flex items-center justify-center rounded-kf-md border border-kf-border bg-kf-surface px-4 py-2.5 text-sm font-semibold text-kf-foreground hover:bg-kf-surface-muted transition-colors min-h-[44px]">
            {t('orderConfirmation.orderMore', 'Pedir Mais')}
          </Link>
          <Link to={user ? '/orders' : '/menu'} className="flex-1 inline-flex items-center justify-center rounded-kf-md bg-kf-primary px-4 py-2.5 text-sm font-semibold text-kf-ink hover:bg-kf-primary/90 transition-colors min-h-[44px]">
            {t('orderConfirmation.trackOrder', 'Acompanhar Pedido')}
          </Link>
        </div>
      </div>
    </div>
  );
}
