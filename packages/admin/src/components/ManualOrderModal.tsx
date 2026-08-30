import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.js';

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isGuest: boolean;
  loyaltyPoints: number;
  _count: { orders: number };
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  image: string | null;
  description: string | null;
  category: { id: string; name: string };
}

interface OrderLine {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  image: string | null;
}

interface DeliveryAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  lat?: number | null;
  lng?: number | null;
  placeId?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualOrderModal({ isOpen, onClose, onSuccess }: Props) {
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('PICKUP');

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const customerTimer = useRef<number | null>(null);

  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [productQuery, setProductQuery] = useState('');
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);

  const [address, setAddress] = useState<DeliveryAddress>({
    line1: '', line2: '', city: '', state: '', zip: '', country: 'US', lat: null, lng: null, placeId: null,
  });
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [zoneError, setZoneError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe'>('cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    api.get<{ success: boolean; data: MenuItemOption[] }>('/menu/items?limit=100')
      .then((res) => setMenuItems(res.data))
      .catch(() => setMenuItems([]));
  }, [isOpen]);

  useEffect(() => {
    if (customerTimer.current) window.clearTimeout(customerTimer.current);
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      setCustomerOpen(false);
      return;
    }
    customerTimer.current = window.setTimeout(() => {
      setSearchingCustomer(true);
      api.get<{ success: boolean; data: CustomerOption[] }>(`/customer?q=${encodeURIComponent(customerQuery.trim())}&limit=20`)
        .then((res) => {
          setCustomerResults(res.data);
          setCustomerOpen(true);
        })
        .catch(() => setCustomerResults([]))
        .finally(() => setSearchingCustomer(false));
    }, 300);
    return () => {
      if (customerTimer.current) window.clearTimeout(customerTimer.current);
    };
  }, [customerQuery]);

  useEffect(() => {
    if (orderType !== 'DELIVERY' || !address.line1 || !address.city || !address.zip) {
      setDeliveryFee(0);
      setZoneError('');
      return;
    }
    const timeout = window.setTimeout(() => {
      api.post<{ success: boolean; data: { fee: number; minOrder: number } }>('/delivery/zones/check', {
        line1: address.line1, city: address.city, state: address.state, zip: address.zip,
        lat: address.lat ?? undefined, lng: address.lng ?? undefined,
      })
        .then((res) => { setDeliveryFee(res.data.fee); setZoneError(''); })
        .catch((err: any) => { setDeliveryFee(0); setZoneError(err.message || 'Endereço fora da área de entrega.'); });
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [address.line1, address.city, address.zip, orderType]);

  const subtotal = orderLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const total = subtotal + deliveryFee;

  const addProduct = (item: MenuItemOption) => {
    setOrderLines((prev) => {
      const existing = prev.find((l) => l.menuItemId === item.id);
      if (existing) {
        return prev.map((l) => (l.menuItemId === item.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...prev, { menuItemId: item.id, name: item.name, quantity: 1, unitPrice: item.price, image: item.image }];
    });
  };

  const changeQty = (menuItemId: string, delta: number) => {
    setOrderLines((prev) =>
      prev
        .map((l) => (l.menuItemId === menuItemId ? { ...l, quantity: l.quantity + delta } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const selectCustomer = (c: CustomerOption) => {
    setSelectedCustomer(c);
    setCustomerQuery(c.name);
    setCustomerOpen(false);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerQuery('');
    setCustomerResults([]);
  };

  const canSubmit = orderLines.length > 0 && (orderType === 'PICKUP' || (address.line1 && address.city && address.zip && !zoneError));

  const submitOrder = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        orderType,
        paymentMethod,
        // PDV: o pagamento é coletado na loja (dinheiro ou maquininha de cartão).
        // O pedido nasce PENDING (visível no admin) — sem gate de Stripe online.
        paymentCollected: true,
        items: orderLines.map((l) => ({ menuItemId: l.menuItemId, quantity: l.quantity })),
      };

      if (selectedCustomer) {
        body.customerId = selectedCustomer.id;
      } else {
        const name = customerQuery.trim();
        if (!name) {
          setError('Informe o nome do cliente.');
          setLoading(false);
          return;
        }
        body.guestName = name;
        body.guestEmail = `manual-${Date.now()}@kingfood.local`;
        body.guestPhone = '';
      }

      if (orderType === 'DELIVERY') {
        body.address = { ...address, country: 'US' };
      }

      await api.post('/orders', body);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar o pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredProducts = menuItems.filter((m) =>
    m.name.toLowerCase().includes(productQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[80] bg-kf-bg flex flex-col" role="dialog" aria-modal="true" aria-label="Novo pedido">
      <div className="flex items-center justify-between px-4 py-3 border-b border-kf-border bg-kf-surface sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 -ml-2 text-kf-muted hover:text-kf-foreground" aria-label="Fechar">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-lg font-bold text-kf-foreground">Novo pedido</h2>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => setOrderType('PICKUP')}
            className={`px-3 py-1.5 rounded-kf-full text-sm font-bold transition ${orderType === 'PICKUP' ? 'bg-kf-foreground text-kf-bg' : 'bg-kf-surface text-kf-muted border border-kf-border'}`}
          >
            Retirada
          </button>
          <button
            onClick={() => setOrderType('DELIVERY')}
            className={`px-3 py-1.5 rounded-kf-full text-sm font-bold transition ${orderType === 'DELIVERY' ? 'bg-kf-foreground text-kf-bg' : 'bg-kf-surface text-kf-muted border border-kf-border'}`}
          >
            Delivery
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-kf-muted mb-1">Cliente</label>
            {selectedCustomer ? (
              <div className="flex items-center gap-3 p-3 rounded-kf-lg border border-kf-primary bg-kf-primary/10">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-kf-foreground truncate">{selectedCustomer.name}</p>
                  <p className="text-xs text-kf-muted truncate">
                    {selectedCustomer.phone || 'sem telefone'} · {selectedCustomer.email} · {selectedCustomer._count.orders} pedido(s)
                  </p>
                </div>
                <button onClick={clearCustomer} className="text-xs font-bold text-kf-danger px-2 py-1">Trocar</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  onFocus={() => customerResults.length > 0 && setCustomerOpen(true)}
                  placeholder="Buscar cliente por nome ou telefone..."
                  className="w-full px-3 py-2.5 rounded-kf-lg border border-kf-border bg-kf-surface text-kf-foreground placeholder:text-kf-muted"
                />
                {searchingCustomer && <span className="absolute right-3 top-9 text-xs text-kf-muted">buscando...</span>}
                {customerOpen && customerResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 rounded-kf-lg border border-kf-border bg-kf-surface shadow-kf-modal overflow-hidden z-20 max-h-64 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => selectCustomer(c)}
                        className="w-full text-left px-3 py-2.5 hover:bg-kf-muted/20 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-kf-foreground truncate">{c.name}</p>
                          <p className="text-xs text-kf-muted truncate">{c.phone || 'sem telefone'} · {c.email}</p>
                        </div>
                        <span className="text-xs text-kf-muted shrink-0">{c._count.orders} ped.</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {orderType === 'DELIVERY' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-kf-muted">Endereço de entrega</label>
              <input
                type="text"
                value={address.line1}
                onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                placeholder="Endereço"
                className="w-full px-3 py-2.5 rounded-kf-lg border border-kf-border bg-kf-surface text-kf-foreground placeholder:text-kf-muted"
              />
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="Cidade" className="px-3 py-2.5 rounded-kf-lg border border-kf-border bg-kf-surface text-kf-foreground placeholder:text-kf-muted" />
                <input type="text" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} placeholder="Estado" className="px-3 py-2.5 rounded-kf-lg border border-kf-border bg-kf-surface text-kf-foreground placeholder:text-kf-muted" />
                <input type="text" value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} placeholder="CEP" className="px-3 py-2.5 rounded-kf-lg border border-kf-border bg-kf-surface text-kf-foreground placeholder:text-kf-muted" />
              </div>
              {zoneError && <p className="text-xs text-kf-danger">{zoneError}</p>}
              {deliveryFee > 0 && <p className="text-xs font-bold text-kf-success">Taxa de entrega: ${deliveryFee.toFixed(2)}</p>}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-kf-muted mb-1">Produtos</label>
            <input
              type="text"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Procurar produto"
              className="w-full px-3 py-2.5 rounded-kf-lg border border-kf-border bg-kf-surface text-kf-foreground placeholder:text-kf-muted"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((item) => (
              <button
                key={item.id}
                onClick={() => addProduct(item)}
                className="text-left rounded-kf-lg border border-kf-border bg-kf-surface overflow-hidden hover:border-kf-primary transition"
              >
                <div className="aspect-square bg-kf-surface-muted overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-kf-muted text-3xl">🍧</div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-sm font-semibold text-kf-foreground leading-tight line-clamp-2">{item.name}</p>
                  <p className="text-sm font-bold text-kf-foreground mt-1">${item.price.toFixed(2)}</p>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <p className="col-span-2 text-center text-kf-muted py-8">Nenhum produto encontrado.</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-kf-border bg-kf-surface px-4 py-3 sticky bottom-0 z-10">
        {error && <p className="text-xs text-kf-danger mb-2">{error}</p>}

        {orderLines.length > 0 && (
          <div className="space-y-1.5 mb-3 max-h-40 overflow-y-auto">
            {orderLines.map((l) => (
              <div key={l.menuItemId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 text-kf-foreground truncate">{l.name}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => changeQty(l.menuItemId, -1)} className="w-7 h-7 rounded-kf-md border border-kf-border text-kf-foreground flex items-center justify-center">−</button>
                  <span className="w-6 text-center font-bold text-kf-foreground">{l.quantity}</span>
                  <button onClick={() => changeQty(l.menuItemId, 1)} className="w-7 h-7 rounded-kf-md border border-kf-border text-kf-foreground flex items-center justify-center">+</button>
                </div>
                <span className="w-16 text-right font-bold text-kf-foreground">${(l.unitPrice * l.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-1 text-sm mb-3">
          <div className="flex justify-between text-kf-muted">
            <span>Subtotal Produtos ({orderLines.reduce((s, l) => s + l.quantity, 0)})</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between text-kf-muted">
              <span>Entrega</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-kf-foreground text-base pt-1 border-t border-kf-border">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`px-3 py-2 rounded-kf-md text-xs font-bold transition ${paymentMethod === 'cash' ? 'bg-kf-foreground text-kf-bg' : 'bg-kf-surface text-kf-muted border border-kf-border'}`}
            >
              Dinheiro
            </button>
            <button
              onClick={() => setPaymentMethod('stripe')}
              className={`px-3 py-2 rounded-kf-md text-xs font-bold transition ${paymentMethod === 'stripe' ? 'bg-kf-foreground text-kf-bg' : 'bg-kf-surface text-kf-muted border border-kf-border'}`}
            >
              Cartão
            </button>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 rounded-kf-md border border-kf-border text-kf-foreground font-bold text-sm disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submitOrder}
            disabled={loading || !canSubmit}
            className="flex-1 px-4 py-2.5 rounded-kf-md bg-kf-foreground text-kf-bg font-bold text-sm disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Aceitar pedido'}
          </button>
        </div>
      </div>
    </div>
  );
}
