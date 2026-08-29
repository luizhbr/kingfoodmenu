import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

interface CustomerOption {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

interface MenuItemOption {
  id: string;
  name: string;
  price: number;
  category: string;
}

interface ManualOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options: { name: string; value: string; priceModifier: number }[];
  comment: string;
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
  
  const [step, setStep] = useState<'customer' | 'items' | 'delivery' | 'payment' | 'review'>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Items
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [orderItems, setOrderItems] = useState<ManualOrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Delivery
  const [orderType, setOrderType] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY');
  const [address, setAddress] = useState<DeliveryAddress>({
    line1: '', line2: '', city: '', state: '', zip: '', country: 'US', lat: null, lng: null, placeId: null
  });
  const [zoneError, setZoneError] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'stripe'>('cash');

  // Fetch customers on open
  useEffect(() => {
    if (isOpen) {
      api.get<{ success: boolean; data: CustomerOption[] }>('/customers?limit=200')
        .then((res) => setCustomers(res.data))
        .catch(() => setCustomers([]));
      // Fetch menu items for selection
      api.get<{ success: boolean; data: { categories: { name: string; menuItems: MenuItemOption[] }[] } }>('/menu')
        .then((res) => {
          const allItems: MenuItemOption[] = [];
          res.data.categories?.forEach((cat) => {
            cat.menuItems?.forEach((item) => allItems.push({ ...item, category: cat.name }));
          });
          setMenuItems(allItems);
        })
        .catch(() => setMenuItems([]));
    }
  }, [isOpen]);

  // Zone check when address changes (delivery)
  useEffect(() => {
    if (orderType === 'DELIVERY' && address.line1 && address.city && address.zip) {
      const timeout = setTimeout(() => {
        api.post<{ success: boolean; data: { fee: number; minOrder: number } }>('/delivery/zones/check', {
          line1: address.line1, city: address.city, state: address.state, zip: address.zip,
          lat: address.lat ?? undefined, lng: address.lng ?? undefined,
        })
          .then((res) => {
            setDeliveryFee(res.data.fee);
            setZoneError('');
          })
          .catch((err) => {
            setDeliveryFee(0);
            setZoneError(err.message || 'Endereço fora da área de entrega.');
          });
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setDeliveryFee(0);
      setZoneError('');
    }
  }, [address.line1, address.city, address.zip, orderType]);

  const subtotal = orderItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal + deliveryFee;

  const canProceedCustomer = selectedCustomerId || (guestName && guestEmail && guestPhone);
  const canProceedItems = orderItems.length > 0;
  const canProceedDelivery = orderType === 'PICKUP' || (address.line1 && address.city && address.zip && !zoneError);

  const handleNext = () => {
    if (step === 'customer' && !canProceedCustomer) return;
    if (step === 'items' && !canProceedItems) return;
    if (step === 'delivery' && !canProceedDelivery) return;
    const steps = ['customer', 'items', 'delivery', 'payment', 'review'] as const;
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const handleBack = () => {
    const steps = ['customer', 'items', 'delivery', 'payment', 'review'] as const;
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const addItem = (item: MenuItemOption) => {
    setOrderItems((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id && i.options.length === 0 && !i.comment);
      if (existing) {
        return prev.map((i) => i === existing ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        menuItemId: item.id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        options: [],
        comment: '',
      }];
    });
    setSearchQuery('');
  };

  const updateItemQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setOrderItems((prev) => prev.filter((i) => i.menuItemId !== id));
    } else {
      setOrderItems((prev) => prev.map((i) => i.menuItemId === id ? { ...i, quantity: qty } : i));
    }
  };

  const submitOrder = async () => {
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        orderType,
        paymentMethod,
        items: orderItems.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          comment: i.comment || undefined,
          options: i.options,
        })),
      };

      if (selectedCustomerId) {
        // customerId will be resolved server-side from token? createOrder expects customerId from auth
        // We don't send customerId; the server uses req.user.id if staff creates for authenticated customer
        // For guest, we send guest fields
      } else {
        body.guestName = guestName;
        body.guestEmail = guestEmail;
        body.guestPhone = guestPhone;
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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="dialog" aria-modal="true" aria-label={'Novo Pedido Manual'}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-kf-border sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-kf-primary/10 flex items-center justify-center">
              <span className="text-xl">📝</span>
            </div>
            <h2 className="text-lg font-bold text-kf-foreground">{'Novo Pedido Manual'}</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-kf-muted">
            {['customer', 'items', 'delivery', 'payment', 'review'].map((s, i) => (
              <span key={s} className={`px-2 py-1 rounded ${step === s ? 'bg-kf-primary text-white' : 'bg-kf-muted/20'}`}>
                {i + 1}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">{error}</div>
          )}

          {/* Step 1: Customer */}
          {step === 'customer' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-kf-foreground">{'Cliente'}</h3>
              <p className="text-sm text-kf-muted">{'Selecione um cliente existente ou preencha os dados do cliente avulso.'}</p>

              {customers.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-kf-border hover:bg-kf-muted/30 cursor-pointer">
                    <input type="radio" name="customer" checked={!selectedCustomerId} onChange={() => setSelectedCustomerId(null)} className="accent-kf-primary" />
                    <div>
                      <p className="font-medium text-kf-foreground">{'Cliente avulso'}</p>
                      <p className="text-xs text-kf-muted">{'Preencha os dados abaixo'}</p>
                    </div>
                  </label>
                  {customers.map((c) => (
                    <label key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-kf-border hover:bg-kf-muted/30 cursor-pointer">
                      <input type="radio" name="customer" checked={selectedCustomerId === c.id} onChange={() => setSelectedCustomerId(c.id)} className="accent-kf-primary" />
                      <div>
                        <p className="font-medium text-kf-foreground">{c.name}</p>
                        <p className="text-xs text-kf-muted">{c.email} · {c.phone || 'sem telefone'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {!selectedCustomerId && (
                <div className="space-y-3 p-3 rounded-lg bg-kf-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder={'Nome'} value={guestName} onChange={(e) => setGuestName(e.target.value)} className="px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                    <input type="tel" placeholder={'Telefone'} value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} className="px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                  </div>
                  <input type="email" placeholder={'E-mail'} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Items */}
          {step === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-kf-foreground">{'Itens do Pedido'}</h3>
                <span className="text-sm text-kf-muted">{orderItems.length} {'item(s)'}</span>
              </div>

              <input type="text" placeholder={'Buscar item no cardápio...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />

              {orderItems.length === 0 ? (
                <div className="py-8 text-center text-kf-muted">
                  <p className="text-lg mb-2">🛒</p>
                  <p>{'Nenhum item adicionado. Busque e clique para adicionar.'}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orderItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border border-kf-border bg-white">
                      <div className="flex-1">
                        <p className="font-medium text-kf-foreground">{item.name}</p>
                        <p className="text-sm text-kf-muted">{'Preço'}: ${item.unitPrice.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateItemQty(item.menuItemId, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-kf-border text-kf-foreground flex items-center justify-center">−</button>
                        <span className="w-10 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateItemQty(item.menuItemId, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-kf-border text-kf-foreground flex items-center justify-center">+</button>
                        <span className="font-bold text-kf-foreground w-16 text-right">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {menuItems.filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8).map((item) => (
                <button key={item.id} onClick={() => addItem(item)} className="w-full text-left p-3 rounded-lg border border-kf-border hover:bg-kf-muted/30 transition-colors flex items-center justify-between">
                  <div>
                    <p className="font-medium text-kf-foreground">{item.name}</p>
                    <p className="text-xs text-kf-muted">{item.category} · ${item.price.toFixed(2)}</p>
                  </div>
                  <span className="text-kf-primary">+</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Delivery */}
          {step === 'delivery' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-kf-foreground">{'Entrega / Retirada'}</h3>

              <div className="flex gap-3">
                <button onClick={() => setOrderType('PICKUP')} className={`flex-1 py-3 rounded-xl border-2 text-center font-bold transition ${orderType === 'PICKUP' ? 'border-kf-primary bg-kf-primary/10 text-kf-primary' : 'border-kf-border text-kf-muted hover:border-kf-primary'}`}>
                  🏪 {'Retirada'}
                </button>
                <button onClick={() => setOrderType('DELIVERY')} className={`flex-1 py-3 rounded-xl border-2 text-center font-bold transition ${orderType === 'DELIVERY' ? 'border-kf-primary bg-kf-primary/10 text-kf-primary' : 'border-kf-border text-kf-muted hover:border-kf-primary'}`}>
                  🚗 {'Entrega'}
                </button>
              </div>

              {orderType === 'DELIVERY' && (
                <div className="space-y-3">
                  <input type="text" placeholder={'Endereço'} value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                  <input type="text" placeholder={'Complemento (opcional)'} value={address.line2} onChange={(e) => setAddress({ ...address, line2: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" placeholder={'Cidade'} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className="px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                    <input type="text" placeholder={'Estado'} value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className="px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                    <input type="text" placeholder={'CEP'} value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} className="px-3 py-2 rounded-lg border border-kf-border text-kf-foreground bg-white" />
                  </div>
                  {zoneError && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">{zoneError}</div>
                  )}
                  {deliveryFee > 0 && (
                    <div className="p-3 rounded-lg bg-kf-success/10 text-kf-success text-sm font-medium">
                      {'Taxa de entrega'}: ${deliveryFee.toFixed(2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 'payment' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-kf-foreground">{'Pagamento'}</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-kf-border cursor-pointer hover:bg-kf-muted/30">
                  <input type="radio" name="payment" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="accent-kf-primary" />
                  <span className="font-medium text-kf-foreground">💵 {'Dinheiro'}</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-kf-border cursor-pointer hover:bg-kf-muted/30">
                  <input type="radio" name="payment" checked={paymentMethod === 'stripe'} onChange={() => setPaymentMethod('stripe')} className="accent-kf-primary" />
                  <span className="font-medium text-kf-foreground">💳 {'Cartão (link Stripe)'}</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-kf-foreground">{'Revisar Pedido'}</h3>

              <div className="p-3 rounded-lg bg-kf-muted/30">
                <p className="font-medium">{'Cliente'}: {selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || 'Cliente' : `${guestName} (${guestEmail}, ${guestPhone})`}</p>
                <p className="font-medium">{'Tipo'}: {orderType === 'DELIVERY' ? 'Entrega' : 'Retirada'}</p>
                {orderType === 'DELIVERY' && address.line1 && <p className="font-medium">{'Endereço'}: {address.line1}, {address.city} - {address.state} {address.zip}</p>}
                <p className="font-medium">{'Pagamento'}: {paymentMethod === 'cash' ? 'Dinheiro' : 'Cartão'}</p>
              </div>

              <div className="space-y-2 border-t border-kf-border pt-3">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>${(item.unitPrice * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm">
                  <span>{'Subtotal'}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-sm text-kf-muted">
                    <span>{'Taxa de entrega'}</span>
                    <span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-kf-foreground border-t border-kf-border pt-2">
                  <span>{'Total'}</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-4 border-t border-kf-border bg-white sticky bottom-0">
          {step !== 'customer' && (
            <button onClick={handleBack} disabled={loading} className="flex-1 py-2.5 rounded-lg border border-kf-border text-kf-foreground font-semibold hover:bg-kf-muted/30 disabled:opacity-50">
              {'Voltar'}
            </button>
          )}
          {step === 'review' ? (
            <button onClick={submitOrder} disabled={loading || !canProceedItems} className="flex-1 py-2.5 rounded-lg bg-kf-primary text-white font-bold hover:bg-kf-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {'Criando...'}
                </>
              ) : (
                'Criar Pedido'
              )}
            </button>
          ) : (
            <button onClick={handleNext} disabled={loading || (step === 'customer' && !canProceedCustomer) || (step === 'items' && !canProceedItems) || (step === 'delivery' && !canProceedDelivery)} className="flex-1 py-2.5 rounded-lg bg-kf-primary text-white font-bold hover:bg-kf-primary/90 disabled:opacity-50">
              {'Próximo'}
            </button>
          )}
          <button onClick={onClose} disabled={loading} className="flex-1 py-2.5 rounded-lg border border-kf-border text-kf-foreground font-semibold hover:bg-kf-muted/30 disabled:opacity-50">
            {'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  );
}
