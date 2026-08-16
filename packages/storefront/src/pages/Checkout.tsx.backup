import { useState, useEffect, useMemo, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { withCsrf } from '../lib/csrf.js';
import { useTracking } from '../hooks/useTracking.js';
import {
  Badge,
  Button,
  Card,
  Input,
  Price,
  Skeleton,
} from '@kitchenasty/shared-ui';

const API_BASE = import.meta.env.VITE_API_URL || '';

type OrderType = 'delivery' | 'pickup';
type PaymentMethod = 'cash' | 'stripe';

const TAX_RATE = 0.08;

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  category?: { name: string } | null;
  isActive?: boolean;
}

export default function Checkout() {
  const { t } = useTranslation();
  const { items, subtotal, clear } = useCart();
  const { user, token } = useAuth();
  const { getAttributionData, sessionId } = useTracking();
  const navigate = useNavigate();

  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', zip: '' });
  const [addressErrors, setAddressErrors] = useState({ line1: '', city: '', state: '', zip: '' });
  function updateAddress(field: keyof typeof address, value: string) {
    setAddress((p) => ({ ...p, [field]: value }));
    setAddressErrors((p) => ({ ...p, [field]: '' }));
  }
  const [scheduledAt, setScheduledAt] = useState('');
  const [comment, setComment] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number; freeDelivery: boolean } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guest checkout fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestErrors, setGuestErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  // Persist guest checkout form state across reloads
  useEffect(() => {
    try {
      const saved = localStorage.getItem('king-food-checkout-draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.guestName !== undefined) setGuestName(draft.guestName);
        if (draft.guestEmail !== undefined) setGuestEmail(draft.guestEmail);
        if (draft.guestPhone !== undefined) setGuestPhone(draft.guestPhone);
        if (draft.orderType) setOrderType(draft.orderType);
        if (draft.address) setAddress(draft.address);
        if (draft.comment !== undefined) setComment(draft.comment);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const draft = {
        guestName,
        guestEmail,
        guestPhone,
        orderType,
        address,
        comment,
      };
      localStorage.setItem('king-food-checkout-draft', JSON.stringify(draft));
    } catch {}
  }, [guestName, guestEmail, guestPhone, orderType, address, comment]);


  // Dynamic delivery fee from zone check
  const [deliveryFee, setDeliveryFee] = useState(4.99);
  const [zoneError, setZoneError] = useState('');
  const [locationId, setLocationId] = useState('');

  // Busy mode
  const [isBusy, setIsBusy] = useState(false);
  const [busyMessage, setBusyMessage] = useState('');

  // Idempotency
  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `kf-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  // Loyalty
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const loyaltyDiscount = loyaltyRedeem / 100;

  // Upsell
  const [upsellItems, setUpsellItems] = useState<MenuItem[]>([]);
  const [upsellLoading, setUpsellLoading] = useState(false);

  const tax = subtotal * TAX_RATE;
  const currentDeliveryFee = orderType === 'delivery' ? (couponApplied?.freeDelivery ? 0 : deliveryFee) : 0;
  const total = Math.max(0, subtotal + tax + currentDeliveryFee - loyaltyDiscount);

  useEffect(() => {
    fetch(`${API_BASE}/api/locations`)
      .then((res) => res.json())
      .then((data) => {
        const loc = data.data?.[0];
        if (loc?.id) setLocationId(loc.id);
        if (loc?.isBusy) {
          setIsBusy(true);
          setBusyMessage(loc.busyMessage || t('checkout.busyMessage', 'Este local não está aceitando pedidos no momento.'));
        }
      })
      .catch(() => {});
  }, [t]);

  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/loyalty/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setLoyaltyBalance(data.data.points);
        })
        .catch(() => {});
    }
  }, [token]);

  // Fetch upsell products from menu (beverages / desserts / complements)
  useEffect(() => {
    setUpsellLoading(true);
    fetch(`${API_BASE}/api/menu/items?limit=5`)
      .then((res) => res.json())
      .then((data) => {
        const list = (data.data || []).filter((p: MenuItem) => p.isActive !== false).slice(0, 5);
        setUpsellItems(list);
      })
      .catch(() => setUpsellItems([]))
      .finally(() => setUpsellLoading(false));
  }, []);

  // Zone check: only if delivery and address fields filled
  useEffect(() => {
    if (orderType !== 'delivery' || !address.line1 || !address.city || !address.zip) {
      setZoneError('');
      return;
    }
    const timeout = setTimeout(() => {
      void (async () => {
        try {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          await withCsrf(headers);
          const res = await fetch(`${API_BASE}/api/delivery/zones/check`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
              locationId: locationId || undefined,
              line1: address.line1,
              city: address.city,
              state: address.state,
              zip: address.zip,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setDeliveryFee(data.data.fee);
            setZoneError('');
          } else {
            setZoneError(data.error || t('checkout.zoneError', 'Endereço fora da área de entrega.'));
          }
        } catch {
          setZoneError(t('checkout.zoneCheckUnavailable', 'Não foi possível validar a entrega agora.'));
        }
      })();
    }, 600);
    return () => clearTimeout(timeout);
  }, [orderType, address.line1, address.city, address.state, address.zip, locationId, t]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError('');
    setCouponApplied(null);
    try {
      const couponHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      await withCsrf(couponHeaders);
      const res = await fetch(`${API_BASE}/api/coupons/validate`, {
        method: 'POST',
        headers: couponHeaders,
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(t('checkout.couponInvalid', 'Cupom inválido ou expirado'));
        return;
      }
      setCouponApplied({
        code: data.data.code,
        discount: data.data.discount,
        freeDelivery: data.data.freeDelivery,
      });
    } catch {
      setCouponError(t('checkout.couponError', 'Não foi possível validar o cupom'));
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponCode('');
    setCouponError('');
  };

  function validateGuest(): boolean {
    if (user) return true;
    const errs: typeof guestErrors = {};
    if (!guestName.trim()) errs.name = t('checkout.nameRequired', 'Nome é obrigatório');
    if (!guestEmail.trim()) {
      errs.email = t('checkout.emailRequired', 'Email é obrigatório');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      errs.email = t('checkout.emailInvalid', 'Digite um email válido');
    }
    if (!guestPhone.trim()) errs.phone = t('checkout.phoneRequired', 'Telefone é obrigatório');
    setGuestErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateAddress(): boolean {
    if (orderType !== 'delivery') return true;
    const { line1, city, state, zip } = address;
    const errs = {
      line1: line1.trim() ? '' : t('checkout.addressLine1Required', 'Informe seu endereço'),
      city: city.trim() ? '' : t('checkout.cityRequired', 'Informe sua cidade'),
      state: state.trim() ? '' : t('checkout.stateRequired', 'Informe seu estado'),
      zip: zip.trim() ? '' : t('checkout.zipCodeRequired', 'Informe seu CEP'),
    };
    setAddressErrors(errs);
    return Object.values(errs).every((v) => !v);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validateGuest()) {
      document.querySelector('[data-section="contact"]')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!validateAddress()) {
      document.querySelector('[data-section="address"]')?.scrollIntoView({ behavior: 'smooth' });
      setError(t('checkout.addressRequired', 'Preencha o endereço de entrega.'));
      return;
    }
    setLoading(true);

    try {
      const orderItems = items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        comment: item.comment,
        options: item.options.map((o) => ({
          menuOptionValueId: o.valueId,
          name: o.optionName,
          value: o.valueName,
          priceModifier: o.priceModifier,
        })),
      }));

      const body: Record<string, unknown> = {
        orderType: orderType.toUpperCase(),
        paymentMethod,
        items: orderItems,
        comment: comment || undefined,
        scheduledAt: scheduledAt || undefined,
        couponCode: couponCode || undefined,
        idempotencyKey,
      };

      const attribution = getAttributionData();
      if (attribution) {
        body.attribution = {
          source: attribution.firstSource,
          medium: attribution.firstMedium,
          campaign: attribution.firstCampaign,
          content: attribution.firstContent,
          term: attribution.firstTerm,
          landingPage: attribution.firstLandingPage,
          referrer: attribution.firstReferrer,
          lastSource: attribution.lastSource,
          lastMedium: attribution.lastMedium,
          lastCampaign: attribution.lastCampaign,
        };
        body.sessionId = sessionId;
      }

      if (orderType === 'delivery') {
        body.address = { ...address, country: 'US' };
      }

      if (!user) {
        body.guestName = guestName;
        body.guestEmail = guestEmail;
        body.guestPhone = guestPhone;
      }

      if (loyaltyRedeem > 0) {
        body.loyaltyPointsRedeem = loyaltyRedeem;
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      await withCsrf(headers);

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error || t('common.error', 'Algo deu errado');
        throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }

      const orderId = data.data.id as string;

      if (paymentMethod === 'stripe') {
        const sessRes = await fetch(`${API_BASE}/api/payments/create-checkout-session`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ orderId }),
        });
        const sessData = await sessRes.json();
        if (!sessRes.ok || !sessData.data?.url) {
          throw new Error(sessData.error || t('checkout.stripeError', 'Falha ao iniciar pagamento'));
        }
        window.location.href = sessData.data.url as string;
        return;
      }

      clear();
      navigate(`/order/${orderId}`, { state: { order: data.data } });
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  function getDefaultScheduleTime(): string {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-kf-bg px-4 py-16 text-center">
        <div className="mx-auto max-w-md">
          <div className="mb-4 text-6xl">🛒</div>
          <h1 className="text-xl font-bold text-kf-foreground mb-2">{t('checkout.emptyCart', 'Seu carrinho está vazio')}</h1>
          <p className="text-kf-muted mb-6">{t('checkout.emptyCartDesc', 'Adicione algo delicioso para começar.')}</p>
          <Link to="/menu" className="inline-flex items-center justify-center rounded-kf-md bg-kf-primary px-4 py-2.5 text-sm font-semibold text-kf-ink hover:bg-kf-primary/90 transition-colors min-h-[44px]">
            {t('checkout.browseMenu', 'Ver cardápio')}
          </Link>
        </div>
      </div>
    );
  }

  const ctaText = isBusy
    ? t('checkout.currentlyUnavailable', 'Indisponível no momento')
    : loading
    ? t('checkout.processing', 'Processando...')
    : t('checkout.placeOrderTotal', 'Finalizar pedido — {{total}}').replace('{{total}}', `$${total.toFixed(2)}`);

  return (
    <div className="min-h-screen bg-kf-bg pb-[calc(var(--kf-nav-h)+8rem)]">
      <main className="mx-auto max-w-3xl px-4 pt-[72px] pb-6 pb-[calc(var(--kf-nav-h)+5rem)] lg:max-w-6xl lg:px-8 lg:pt-8 lg:pb-10">
        <h1 className="text-2xl font-extrabold text-kf-foreground mb-6">{t('checkout.title', 'Finalizar Pedido')}</h1>

        {isBusy && (
          <div className="mb-6 rounded-kf-lg border border-kf-warning/30 bg-kf-warning/10 p-4 text-kf-warning">
            <p className="font-semibold">{t('checkout.currentlyUnavailable')}</p>
            <p className="text-sm mt-1">{busyMessage}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-kf-lg border border-kf-danger/20 bg-kf-danger/10 p-4 text-sm text-kf-danger" data-testid="checkout-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: progressive form */}
          <div className="flex-1 space-y-5">
            {/* 1. Seus dados */}
            {!user && (
              <Card data-section="contact" className="p-5">
                <h2 className="text-lg font-bold text-kf-foreground mb-3">{t('checkout.yourData', 'Seus dados')}</h2>
                <p className="text-sm text-kf-muted mb-4">
                  <Link to="/login" className="text-kf-primary font-medium underline">{t('checkout.loginForFaster', 'Entre')}</Link>{' '}
                  {t('checkout.continueAsGuest', 'para checkout mais rápido, ou continue como convidado:')}
                </p>
                <div className="space-y-3">
                  <Input
                    label={`${t('checkout.name', 'Nome')} *`}
                    placeholder={t('checkout.name', 'Nome')}
                    value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); setGuestErrors((p) => ({ ...p, name: undefined })); }}
                    autoComplete="name"
                    error={guestErrors.name}
                    aria-invalid={!!guestErrors.name}
                    errorTestId="guest-name-error"
                    data-testid="guest-name"
                  />
                  <Input
                    label={`${t('checkout.email', 'Email')} *`}
                    type="email"
                    placeholder="seu@email.com"
                    value={guestEmail}
                    onChange={(e) => { setGuestEmail(e.target.value); setGuestErrors((p) => ({ ...p, email: undefined })); }}
                    autoComplete="email"
                    error={guestErrors.email}
                    aria-invalid={!!guestErrors.email}
                    errorTestId="guest-email-error"
                    data-testid="guest-email"
                  />
                  <Input
                    label={`${t('checkout.phone', 'Telefone')} *`}
                    type="tel"
                    placeholder="(614) 555-0123"
                    value={guestPhone}
                    onChange={(e) => { setGuestPhone(e.target.value); setGuestErrors((p) => ({ ...p, phone: undefined })); }}
                    autoComplete="tel"
                    error={guestErrors.phone}
                    aria-invalid={!!guestErrors.phone}
                    errorTestId="guest-phone-error"
                    data-testid="guest-phone"
                  />
                </div>
              </Card>
            )}

            {/* 2. Como receber */}
            <Card className="p-5">
              <h2 className="text-lg font-bold text-kf-foreground mb-4">{t('checkout.howToReceive', 'Como receber?')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOrderType('delivery')}
                  data-testid="order-type-delivery"
                  className={`flex flex-col items-center justify-center gap-2 rounded-kf-lg border-2 p-4 text-sm font-semibold transition-colors min-h-[80px] ${
                    orderType === 'delivery'
                      ? 'border-kf-primary bg-kf-primary/10 text-kf-foreground'
                      : 'border-kf-border text-kf-muted hover:border-kf-primary/40'
                  }`}
                >
                  <span className="text-2xl">🚗</span>
                  <span>{t('checkout.delivery', 'Entrega')}</span>
                  <span className="text-xs font-normal opacity-80">{t('checkout.deliveryDesc', 'Receba no seu endereço')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('pickup')}
                  data-testid="order-type-pickup"
                  className={`flex flex-col items-center justify-center gap-2 rounded-kf-lg border-2 p-4 text-sm font-semibold transition-colors min-h-[80px] ${
                    orderType === 'pickup'
                      ? 'border-kf-primary bg-kf-primary/10 text-kf-foreground'
                      : 'border-kf-border text-kf-muted hover:border-kf-primary/40'
                  }`}
                >
                  <span className="text-2xl">🏪</span>
                  <span>{t('checkout.pickup', 'Retirada')}</span>
                  <span className="text-xs font-normal opacity-80">{t('checkout.pickupDesc', 'Pegue seu pedido no King Food')}</span>
                </button>
              </div>
            </Card>

            {/* 3. Endereço */}
            {orderType === 'delivery' && (
              <Card data-section="address" className="p-5">
                <h2 className="text-lg font-bold text-kf-foreground mb-4">{t('checkout.deliveryAddress', 'Endereço de Entrega')}</h2>
                {zoneError && (
                  <div className="mb-3 rounded-kf-md bg-kf-danger/10 p-3 text-sm text-kf-danger">{zoneError}</div>
                )}
                <div className="space-y-3">
                  <Input
                    label={`${t('checkout.addressLine1', 'Endereço')} *`}
                    placeholder={t('checkout.addressLine1', 'Rua e número')}
                    value={address.line1}
                    onChange={(e) => updateAddress('line1', e.target.value)}
                    data-testid="address-line1"
                    autoComplete="street-address"
                    error={addressErrors.line1}
                    errorTestId="address-line1-error"
                  />
                  <Input
                    label={t('checkout.addressLine2', 'Apartamento / Unidade')}
                    placeholder={t('checkout.addressLine2', 'Apto, sala, etc. (opcional)')}
                    value={address.line2}
                    onChange={(e) => updateAddress('line2', e.target.value)}
                    data-testid="address-line2"
                    autoComplete="address-line2"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label={`${t('checkout.city', 'Cidade')} *`}
                      placeholder={t('checkout.city', 'Cidade')}
                      value={address.city}
                      onChange={(e) => updateAddress('city', e.target.value)}
                      autoComplete="address-level2"
                    data-testid="address-city"
                    error={addressErrors.city}
                    errorTestId="address-city-error"
                    />
                    <Input
                      label={`${t('checkout.state', 'Estado')} *`}
                      placeholder={t('checkout.state', 'Estado')}
                      value={address.state}
                      onChange={(e) => updateAddress('state', e.target.value)}
                      autoComplete="address-level1"
                    data-testid="address-state"
                    error={addressErrors.state}
                    errorTestId="address-state-error"
                    />
                  </div>
                  <Input
                    label={`${t('checkout.zipCode', 'CEP')} *`}
                    placeholder={t('checkout.zipCode', 'CEP')}
                    value={address.zip}
                    onChange={(e) => updateAddress('zip', e.target.value)}
                    data-testid="address-zip"
                    autoComplete="postal-code"
                    error={addressErrors.zip}
                    errorTestId="address-zip-error"
                  />
                </div>
              </Card>
            )}

            {/* 4. Quando receber */}
            <Card className="p-5">
              <h2 className="text-lg font-bold text-kf-foreground mb-4">{t('checkout.whenToReceive', 'Quando receber?')}</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 rounded-kf-md border border-kf-border p-3 cursor-pointer has-[:checked]:border-kf-primary has-[:checked]:bg-kf-primary/10">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!scheduledAt}
                    onChange={() => setScheduledAt('')}
                    className="h-4 w-4 accent-kf-primary"
                  />
                  <span className="text-sm text-kf-foreground">⚡ {t('checkout.asap', 'O mais rápido possível')}</span>
                </label>
                <label className="flex items-center gap-3 rounded-kf-md border border-kf-border p-3 cursor-pointer has-[:checked]:border-kf-primary has-[:checked]:bg-kf-primary/10">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!!scheduledAt}
                    onChange={() => setScheduledAt(getDefaultScheduleTime())}
                    className="h-4 w-4 accent-kf-primary"
                  />
                  <span className="text-sm text-kf-foreground">📅 {t('checkout.scheduled', 'Agendar')}</span>
                </label>
                {scheduledAt && (
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                )}
              </div>
            </Card>

            {/* 5. Observação */}
            <Card className="p-5">
              <h2 className="text-lg font-bold text-kf-foreground mb-3">{t('checkout.note', 'Alguma observação?')}</h2>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder={t('checkout.notePlaceholder', 'Ex.: sem cebola, tocar campainha...')}
                className="w-full rounded-kf-md border border-kf-border bg-kf-surface px-3 py-2 text-sm text-kf-foreground placeholder:text-kf-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kf-primary/50 resize-none"
              />
            </Card>

            {/* 6. Cupom */}
            <Card className="p-5">
              <h2 className="text-lg font-bold text-kf-foreground mb-3">{t('checkout.couponCode', 'Cupom')}</h2>
              {couponApplied ? (
                <div className="flex items-center justify-between rounded-kf-lg bg-kf-success/10 border border-kf-success/20 px-4 py-3" data-testid="coupon-success">
                  <div>
                    <p className="text-sm font-semibold text-kf-foreground">
                      {couponApplied.code} — <Price data-testid="discount-amount" value={couponApplied.discount} size="sm" />
                    </p>
                    {couponApplied.freeDelivery && <Badge variant="success" className="mt-1">{t('checkout.freeDelivery', 'Entrega grátis')}</Badge>}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={removeCoupon}>{t('checkout.remove', 'Remover')}</Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder={t('checkout.couponPlaceholder', 'Digite o código')}
                    value={couponCode}
                    data-testid="coupon-code"
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" onClick={applyCoupon}
                  data-testid="apply-coupon" disabled={couponLoading}>
                    {couponLoading ? t('common.loading', 'Carregando...') : t('checkout.apply', 'Aplicar')}
                  </Button>
                </div>
              )}
              {couponError && <p className="mt-2 text-xs text-kf-danger" data-testid="coupon-error">{couponError}</p>}
            </Card>

            {/* 7. Fidelidade */}
            {user && loyaltyBalance > 0 && (
              <Card data-testid="loyalty-section" className="p-5">
                <h2 className="text-lg font-bold text-kf-foreground mb-3">{t('checkout.loyalty', 'Fidelidade')}</h2>
                <p className="text-sm text-kf-muted mb-3">
                  {t('checkout.pointsAvailable', 'Você tem {{points}} pontos').replace('{{points}}', String(loyaltyBalance))}
                </p>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={Math.min(loyaltyBalance, Math.floor(subtotal * 100))}
                    step={100}
                    value={loyaltyRedeem}
                    onChange={(e) => setLoyaltyRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32"
                  />
                  <span className="text-sm text-kf-muted">{t('checkout.pointsToRedeem', 'pontos para usar')}</span>
                  {loyaltyRedeem > 0 && <Price value={loyaltyDiscount} size="sm" className="text-kf-success" />}
                </div>
              </Card>
            )}

            {/* 8. Pagamento */}
            <Card className="p-5">
              <h2 className="text-lg font-bold text-kf-foreground mb-4">{t('checkout.paymentMethod', 'Forma de Pagamento')}</h2>
              <div className="space-y-2">
                <PaymentOption
                  selected={paymentMethod === 'cash'}
                  onSelect={() => setPaymentMethod('cash')}
                  icon="💵"
                  label={t('checkout.cash', 'Dinheiro')}
                  data-testid="payment-cash"
                  sublabel={t('checkout.cashOnDelivery', 'Pagamento na entrega / retirada')}
                />
                <PaymentOption
                  selected={paymentMethod === 'stripe'}
                  onSelect={() => setPaymentMethod('stripe')}
                  icon="💳"
                  label={t('checkout.card', 'Cartão')}
                  sublabel={t('checkout.creditCard', 'Cartão de crédito via Stripe')}
                />
              </div>
            </Card>

            {/* 9. Upsell */}
            <Card className="p-5">
              <h2 className="text-lg font-bold text-kf-foreground mb-4">{t('checkout.upsellTitle', 'Quer adicionar mais alguma coisa?')}</h2>
              {upsellLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 rounded-kf-lg" />
                  <Skeleton className="h-16 rounded-kf-lg" />
                </div>
              ) : upsellItems.length === 0 ? null : (
                <div className="space-y-3">
                  {upsellItems.map((item) => (
                    <UpsellRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* RIGHT / BOTTOM: Order summary + sticky CTA */}
          <div className="lg:w-80 shrink-0">
            <div className="lg:sticky lg:top-6">
              <Card className="p-5">
                <h2 className="text-lg font-bold text-kf-foreground mb-4">{t('checkout.orderSummary', 'Resumo do Pedido')}</h2>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto pr-1">
                  {items.map((item) => {
                    const optionsTotal = item.options.reduce((s, o) => s + o.priceModifier, 0);
                    return (
                      <div key={item.id} className="flex justify-between text-sm">
                        <div className="flex-1 pr-2">
                          <span className="text-kf-muted mr-1">{item.quantity}x</span>
                          <span className="text-kf-foreground">{item.name}</span>
                          {item.options.length > 0 && (
                            <p className="text-xs text-kf-muted ml-5">{item.options.map((o) => o.valueName).join(', ')}</p>
                          )}
                        </div>
                        <Price value={(item.price + optionsTotal) * item.quantity} size="sm" />
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 border-t border-kf-border pt-3 text-sm">
                  <SummaryRow label={t('checkout.subtotal', 'Subtotal')} value={subtotal} />
                  <SummaryRow label={t('checkout.tax', 'Impostos')} value={tax} />
                  {orderType === 'delivery' && <SummaryRow label={t('checkout.deliveryFee', 'Taxa de entrega')} value={currentDeliveryFee} />}
                  {couponApplied && couponApplied.discount > 0 && (
                    <SummaryRow label={t('checkout.discount', 'Desconto')} value={-couponApplied.discount} className="text-kf-success" />
                  )}
                  {loyaltyDiscount > 0 && (
                    <SummaryRow label={t('checkout.loyalty', 'Fidelidade')} value={-loyaltyDiscount} className="text-kf-success" />
                  )}
                  <div className="flex items-center justify-between border-t border-kf-border pt-2 text-base font-bold">
                    <span className="text-kf-foreground">{t('checkout.total', 'Total')}</span>
                    <Price value={total} size="lg" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || isBusy}
                  className="mt-5 w-full min-h-[52px] hidden lg:flex"
                  data-testid="submit-order-desktop"
                >
                  {ctaText}
                </Button>

                <p className="mt-3 text-center text-xs text-kf-muted">
                  {t('checkout.totalDisclaimer', 'O total final será confirmado no pedido.')}
                </p>
              </Card>
            </div>
          </div>
        </form>
      </main>

      {/* Sticky CTA mobile */}
      <div className="fixed inset-x-0 bottom-[var(--kf-nav-h)] z-kf-cart-bar border-t border-kf-border bg-kf-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] lg:hidden">
        <div className="mx-auto max-w-3xl flex items-center justify-between gap-4">
          <div className="text-left">
            <p className="text-xs text-kf-muted">{t('checkout.total', 'Total')}</p>
            <Price value={total} size="lg" />
          </div>
          <Button
            type="button"
            disabled={loading || isBusy}
            onClick={handleSubmit}
            className="flex-1 min-h-[52px]"
            data-testid="submit-order-mobile"
          >
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({
  selected,
  onSelect,
  icon,
  label,
  sublabel,
  'data-testid': testId,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: string;
  label: string;
  sublabel: string;
  'data-testid'?: string;
}) {
  return (
    <label
      data-testid={testId}
      onClick={onSelect}
      className={`flex cursor-pointer items-center gap-3 rounded-kf-lg border-2 p-3 transition-colors ${
        selected ? 'border-kf-primary bg-kf-primary/10' : 'border-kf-border hover:border-kf-primary/40'
      }`}
    >
      <input type="radio" checked={selected} onChange={onSelect} className="h-4 w-4 accent-kf-primary" />
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-kf-foreground">{label}</p>
        <p className="text-xs text-kf-muted">{sublabel}</p>
      </div>
    </label>
  );
}

function SummaryRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-kf-muted">{label}</span>
      <Price value={Math.abs(value)} size="sm" className={value < 0 ? 'text-kf-success' : ''} />
    </div>
  );
}

function UpsellRow({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const { t } = useTranslation();
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      options: [],
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="flex items-center gap-3 rounded-kf-lg border border-kf-border bg-kf-surface p-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-kf-md bg-kf-surface-muted text-xl">
        {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-kf-md" /> : '🍔'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-kf-foreground truncate">{item.name}</p>
        <Price value={item.price} size="sm" />
      </div>
      <Button type="button" size="sm" onClick={handleAdd} disabled={added}>
        {added ? '✓' : t('common.add', 'Adicionar')}
      </Button>
    </div>
  );
}